# backend/servicios/servicio_reclamacion.py
"""
Servicio de Reclamaciones.
Principio SOLID — S: solo lógica de reclamaciones y entregas.
Implementa: HU26, HU27, HU28, HU31, HU35, HU36
"""
import os, shutil
from datetime import datetime
from typing import List
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from backend.configuracion import obtener_configuracion
from backend.modelos.usuario import Usuario, RolUsuario
from backend.modelos.reclamacion import Reclamacion, EstadoReclamacion
from backend.modelos.reporte import Reporte, EstadoObjeto
from backend.modelos.notificacion import TipoNotificacion
from backend.repositorios.repositorio_reclamacion import RepositorioReclamacion
from backend.repositorios.repositorio_reporte import RepositorioReporte
from backend.repositorios.repositorio_notificacion import RepositorioNotificacion
from backend.esquemas.reclamacion import EsquemaCrearReclamacion, EsquemaRevisarReclamacion, EsquemaRegistrarEntrega

cfg = obtener_configuracion()


class ServicioReclamacion:
    """Gestiona el ciclo completo de reclamaciones y entregas."""

    def __init__(self, sesion: Session):
        self.repo       = RepositorioReclamacion(sesion)
        self.repo_rep   = RepositorioReporte(sesion)
        self.repo_notif = RepositorioNotificacion(sesion)

    def enviar_reclamacion(self, id_reporte: int, datos: EsquemaCrearReclamacion,
                           reclamante: Usuario, evidencia: UploadFile = None) -> Reclamacion:
        """HU31/HU35 — Enviar reclamación con respuestas de seguridad y evidencia."""
        reporte = self._reporte_o_error(id_reporte)
        if reporte.id_reportante == reclamante.id:
            raise HTTPException(400, "No puedes reclamar tu propio reporte")
        if reporte.estado not in (EstadoObjeto.ENCONTRADO, EstadoObjeto.PERDIDO):
            raise HTTPException(400, "Este objeto no está disponible para reclamar")
        if self.repo.ya_reclamo(id_reporte, reclamante.id):
            raise HTTPException(400, "Ya enviaste una solicitud para este objeto")

        reclamacion = Reclamacion(
            id_reporte=id_reporte, id_reclamante=reclamante.id,
            respuesta_1=datos.respuesta_1, respuesta_2=datos.respuesta_2,
            respuesta_3=datos.respuesta_3, notas=datos.notas,
        )
        reclamacion = self.repo.crear(reclamacion)

        if evidencia:
            carpeta = os.path.join(cfg.CARPETA_UPLOADS, "evidencias")
            os.makedirs(carpeta, exist_ok=True)
            ext = evidencia.filename.split(".")[-1].lower()
            nombre = f"evidencia_{reclamacion.id}_{int(datetime.utcnow().timestamp())}.{ext}"
            ruta = os.path.join(carpeta, nombre)
            with open(ruta, "wb") as f:
                shutil.copyfileobj(evidencia.file, f)
            reclamacion.ruta_evidencia = f"/uploads/evidencias/{nombre}"
            self.repo.actualizar(reclamacion)

        reporte.estado = EstadoObjeto.RECLAMADO
        self.repo_rep.actualizar(reporte)

        self.repo_notif.crear_notificacion(
            id_usuario=reporte.id_reportante, tipo=TipoNotificacion.RECLAMO_NUEVO,
            titulo="Nueva solicitud de reclamación",
            mensaje=f"{reclamante.nombre_completo} quiere reclamar tu objeto '{reporte.titulo}'.",
            id_reporte=id_reporte, id_reclamo=reclamacion.id,
        )
        return reclamacion

    def revisar_reclamacion(self, id_reclamacion: int, datos: EsquemaRevisarReclamacion,
                            admin: Usuario) -> Reclamacion:
        """HU26/HU27 — Aprobar o rechazar reclamación."""
        if admin.rol not in (RolUsuario.ADMIN, RolUsuario.CUSTODIA):
            raise HTTPException(403, "Sin permiso")
        reclamacion = self._reclamacion_o_error(id_reclamacion)
        if reclamacion.estado != EstadoReclamacion.PENDIENTE:
            raise HTTPException(400, "Esta reclamación ya fue procesada")
        reporte = self._reporte_o_error(reclamacion.id_reporte)

        if datos.accion == "aprobar":
            reclamacion.estado = EstadoReclamacion.APROBADA
            reclamacion.id_revisado_por = admin.id
            reclamacion.revisado_en = datetime.utcnow()
            tipo_notif = TipoNotificacion.RECLAMO_APROBADO
            mensaje = f"Tu reclamación para '{reporte.titulo}' fue aprobada. Preséntate con tu documento."
        else:
            if not datos.motivo_rechazo:
                raise HTTPException(400, "Debes indicar el motivo del rechazo")
            reclamacion.estado = EstadoReclamacion.RECHAZADA
            reclamacion.motivo_rechazo = datos.motivo_rechazo
            reclamacion.id_revisado_por = admin.id
            reclamacion.revisado_en = datetime.utcnow()
            reporte.estado = EstadoObjeto.ENCONTRADO
            self.repo_rep.actualizar(reporte)
            tipo_notif = TipoNotificacion.RECLAMO_RECHAZADO
            mensaje = f"Tu reclamación para '{reporte.titulo}' fue rechazada. Motivo: {datos.motivo_rechazo}"

        self.repo.actualizar(reclamacion)
        self.repo_notif.crear_notificacion(
            id_usuario=reclamacion.id_reclamante, tipo=tipo_notif,
            titulo="Resultado de tu reclamación", mensaje=mensaje,
            id_reporte=reporte.id, id_reclamo=reclamacion.id,
        )
        return reclamacion

    def registrar_entrega(self, id_reclamacion: int, datos: EsquemaRegistrarEntrega,
                          admin: Usuario) -> Reclamacion:
        """HU28/HU36 — Registrar entrega física y cambiar estado automáticamente."""
        if admin.rol not in (RolUsuario.ADMIN, RolUsuario.CUSTODIA):
            raise HTTPException(403, "Sin permiso")
        reclamacion = self._reclamacion_o_error(id_reclamacion)
        if reclamacion.estado != EstadoReclamacion.APROBADA:
            raise HTTPException(400, "La reclamación debe estar aprobada para registrar entrega")

        reclamacion.estado = EstadoReclamacion.ENTREGADA
        reclamacion.nombre_receptor = datos.nombre_receptor
        reclamacion.documento_receptor = datos.documento_receptor
        reclamacion.fecha_entrega = datetime.utcnow()
        self.repo.actualizar(reclamacion)

        # HU36 — Cambio automático de estado del reporte
        reporte = self._reporte_o_error(reclamacion.id_reporte)
        reporte.estado = EstadoObjeto.ENTREGADO
        self.repo_rep.actualizar(reporte)

        self.repo_notif.crear_notificacion(
            id_usuario=reclamacion.id_reclamante, tipo=TipoNotificacion.ENTREGA_LISTA,
            titulo="¡Objeto entregado!",
            mensaje=f"La entrega de '{reporte.titulo}' fue registrada exitosamente.",
            id_reporte=reporte.id, id_reclamo=reclamacion.id,
        )
        return reclamacion

    def mis_reclamaciones(self, usuario: Usuario) -> List[Reclamacion]:
        return self.repo.obtener_mis_reclamaciones(usuario.id)

    def reclamaciones_de_reporte(self, id_reporte: int, usuario: Usuario) -> List[Reclamacion]:
        reporte = self._reporte_o_error(id_reporte)
        if reporte.id_reportante != usuario.id and usuario.rol not in (RolUsuario.ADMIN, RolUsuario.CUSTODIA):
            raise HTTPException(403, "Sin acceso")
        return self.repo.obtener_por_reporte(id_reporte)

    def reclamaciones_pendientes(self, admin: Usuario) -> List[Reclamacion]:
        if admin.rol not in (RolUsuario.ADMIN, RolUsuario.CUSTODIA):
            raise HTTPException(403, "Sin permiso")
        return self.repo.obtener_pendientes()

    def _reclamacion_o_error(self, id_reclamacion: int) -> Reclamacion:
        r = self.repo.obtener_por_id(id_reclamacion)
        if not r:
            raise HTTPException(404, "Reclamación no encontrada")
        return r

    def _reporte_o_error(self, id_reporte: int) -> Reporte:
        r = self.repo_rep.obtener_por_id(id_reporte)
        if not r:
            raise HTTPException(404, "Reporte no encontrado")
        return r
