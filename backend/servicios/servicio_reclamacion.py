# backend/servicios/servicio_reclamacion.py
"""
Servicio de Reclamaciones.
Principio SOLID:
  S — Solo lógica de reclamaciones y entregas.
  D — Depende de repositorios (abstracciones), no implementaciones.
Implementa: HU15, HU16, HU17, HU26, HU27, HU28, HU31, HU35, HU36

Flujo con custodia  → admin revisa → PENDIENTE_RECLAMACION → aprueba/rechaza → RECLAMADO → entrega → ENTREGADO
Flujo sin custodia  → chat directo entre partes → reportante acepta/rechaza → sin admin
"""
import os, shutil
from datetime import datetime
from typing import List
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from backend.configuracion import obtener_configuracion
from backend.modelos.usuario import Usuario, RolUsuario
from backend.modelos.reclamacion import Reclamacion, EstadoReclamacion
from backend.modelos.reporte import Reporte, EstadoObjeto, TipoReporte
from backend.modelos.notificacion import TipoNotificacion
from backend.repositorios.repositorio_reclamacion import RepositorioReclamacion
from backend.repositorios.repositorio_reporte import RepositorioReporte
from backend.repositorios.repositorio_notificacion import RepositorioNotificacion
from backend.repositorios.repositorio_usuario import RepositorioUsuario
from backend.esquemas.reclamacion import EsquemaCrearReclamacion, EsquemaRevisarReclamacion, EsquemaRegistrarEntrega

cfg = obtener_configuracion()


class ServicioReclamacion:
    """Gestiona el ciclo completo de reclamaciones y entregas."""

    def __init__(self, sesion: Session):
        self.repo       = RepositorioReclamacion(sesion)
        self.repo_rep   = RepositorioReporte(sesion)
        self.repo_notif = RepositorioNotificacion(sesion)
        self.repo_usu   = RepositorioUsuario(sesion)

    # ── Helpers privados ───────────────────────────────────────────

    def _reporte_o_error(self, id_reporte: int) -> Reporte:
        r = self.repo_rep.obtener_por_id(id_reporte)
        if not r:
            raise HTTPException(404, "Reporte no encontrado")
        return r

    def _reclamacion_o_error(self, id_reclamacion: int) -> Reclamacion:
        r = self.repo.obtener_por_id(id_reclamacion)
        if not r:
            raise HTTPException(404, "Reclamación no encontrada")
        return r

    def _guardar_evidencia(self, archivo: UploadFile, id_reclamacion: int) -> str:
        carpeta = os.path.join(cfg.CARPETA_UPLOADS, "evidencias")
        os.makedirs(carpeta, exist_ok=True)
        ext    = archivo.filename.split(".")[-1].lower()
        nombre = f"evidencia_{id_reclamacion}_{int(datetime.utcnow().timestamp())}.{ext}"
        ruta   = os.path.join(carpeta, nombre)
        with open(ruta, "wb") as f:
            shutil.copyfileobj(archivo.file, f)
        return f"/uploads/evidencias/{nombre}"

    def _notificar_admins(self, tipo: TipoNotificacion, titulo: str, mensaje: str,
                          id_reporte=None, id_reclamo=None):
        for admin in self.repo_usu.obtener_admins():
            self.repo_notif.crear_notificacion(
                id_usuario=admin.id, tipo=tipo, titulo=titulo,
                mensaje=mensaje, id_reporte=id_reporte, id_reclamo=id_reclamo,
            )

    def _estado_original(self, reporte: Reporte) -> EstadoObjeto:
        """Estado al que volver si se rechaza la reclamación."""
        return EstadoObjeto.ENCONTRADO if reporte.tipo_reporte == TipoReporte.ENCONTRADO else EstadoObjeto.PERDIDO

    # ── Enviar reclamación ─────────────────────────────────────────

    def enviar_reclamacion(self, id_reporte: int, datos: EsquemaCrearReclamacion,
                           reclamante: Usuario, evidencia: UploadFile = None) -> Reclamacion:
        """HU31/HU35 — Enviar reclamación."""
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
            reclamacion.ruta_evidencia = self._guardar_evidencia(evidencia, reclamacion.id)
            self.repo.actualizar(reclamacion)

        # Estado intermedio mientras se resuelve
        reporte.estado = EstadoObjeto.PENDIENTE_RECLAMACION
        self.repo_rep.actualizar(reporte)

        tiene_custodia = bool(reporte.punto_custodia and reporte.punto_custodia.strip())

        # Resumen de info para comparar
        info_rep = (
            f"OBJETO: {reporte.titulo}\n"
            f"Reportante: {reporte.reportante.nombre_completo} ({reporte.reportante.correo})\n"
            f"Descripción: {reporte.descripcion}\n"
            f"Punto de custodia: {reporte.punto_custodia or 'Sin custodia (lo tiene la persona)'}"
        )
        info_rec = (
            f"Reclamante: {reclamante.nombre_completo} ({reclamante.correo})\n"
            f"Respuesta 1: {datos.respuesta_1 or '—'}\n"
            f"Respuesta 2: {datos.respuesta_2 or '—'}\n"
            f"Respuesta 3: {datos.respuesta_3 or '—'}\n"
            f"Notas: {datos.notas or '—'}"
        )

        if tiene_custodia:
            # Flujo admin: notifica administradores con ambas infos
            self._notificar_admins(
                tipo=TipoNotificacion.RECLAMO_NUEVO,
                titulo=f"Nueva reclamación — {reporte.titulo}",
                mensaje=f"{info_rep}\n\n{info_rec}",
                id_reporte=id_reporte, id_reclamo=reclamacion.id,
            )
            # Notifica al reportante
            self.repo_notif.crear_notificacion(
                id_usuario=reporte.id_reportante,
                tipo=TipoNotificacion.RECLAMO_NUEVO,
                titulo="Alguien reclama tu objeto",
                mensaje=f"{reclamante.nombre_completo} dice que '{reporte.titulo}' le pertenece. El administrador revisará la solicitud.",
                id_reporte=id_reporte, id_reclamo=reclamacion.id,
            )
        else:
            # Flujo directo: notifica solo al reportante con toda la info para comparar
            es_perdido = reporte.tipo_reporte == TipoReporte.PERDIDO
            titulo_notif = "¡Alguien dice que encontró tu objeto!" if es_perdido else "Alguien reclama tu objeto encontrado"
            tipo_notif   = TipoNotificacion.LO_ENCONTRE if es_perdido else TipoNotificacion.RECLAMO_NUEVO
            self.repo_notif.crear_notificacion(
                id_usuario=reporte.id_reportante,
                tipo=tipo_notif,
                titulo=titulo_notif,
                mensaje=(
                    f"{info_rec}\n\n"
                    "Puedes aceptar o rechazar desde tus reportes, o chatear directamente con esta persona."
                ),
                id_reporte=id_reporte, id_reclamo=reclamacion.id,
            )

        return reclamacion

    # ── Revisar (admin con custodia) ───────────────────────────────

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
            reclamacion.estado         = EstadoReclamacion.APROBADA
            reclamacion.id_revisado_por = admin.id
            reclamacion.revisado_en    = datetime.utcnow()
            reporte.estado             = EstadoObjeto.RECLAMADO
            self.repo_rep.actualizar(reporte)
            tipo_notif = TipoNotificacion.RECLAMO_APROBADO
            mensaje    = (
                f"Tu reclamación de '{reporte.titulo}' fue aprobada. "
                f"Preséntate con tu documento en: {reporte.punto_custodia or 'el punto de custodia'}."
            )
        else:
            if not datos.motivo_rechazo:
                raise HTTPException(400, "Debes indicar el motivo del rechazo")
            reclamacion.estado          = EstadoReclamacion.RECHAZADA
            reclamacion.motivo_rechazo  = datos.motivo_rechazo
            reclamacion.id_revisado_por = admin.id
            reclamacion.revisado_en     = datetime.utcnow()
            reporte.estado              = self._estado_original(reporte)
            self.repo_rep.actualizar(reporte)
            tipo_notif = TipoNotificacion.RECLAMO_RECHAZADO
            mensaje    = f"Tu reclamación de '{reporte.titulo}' fue rechazada. Motivo: {datos.motivo_rechazo}"

        self.repo.actualizar(reclamacion)
        self.repo_notif.crear_notificacion(
            id_usuario=reclamacion.id_reclamante, tipo=tipo_notif,
            titulo="Resultado de tu reclamación", mensaje=mensaje,
            id_reporte=reporte.id, id_reclamo=reclamacion.id,
        )
        return reclamacion

    # ── Respuesta directa (reportante sin custodia) ────────────────

    def responder_reclamacion_directa(self, id_reclamacion: int, datos: EsquemaRevisarReclamacion,
                                      reportante: Usuario) -> Reclamacion:
        """El reportante (que tiene el objeto) acepta o rechaza directamente."""
        reclamacion = self._reclamacion_o_error(id_reclamacion)
        reporte     = self._reporte_o_error(reclamacion.id_reporte)

        if reporte.id_reportante != reportante.id:
            raise HTTPException(403, "Solo el reportante puede responder esta reclamación")
        if reclamacion.estado != EstadoReclamacion.PENDIENTE:
            raise HTTPException(400, "Esta reclamación ya fue procesada")

        if datos.accion == "aprobar":
            reclamacion.estado      = EstadoReclamacion.APROBADA
            reclamacion.revisado_en = datetime.utcnow()
            reporte.estado          = EstadoObjeto.RECLAMADO
            self.repo_rep.actualizar(reporte)
            self.repo_notif.crear_notificacion(
                id_usuario=reclamacion.id_reclamante,
                tipo=TipoNotificacion.RECLAMO_APROBADO,
                titulo="¡Reclamación aceptada!",
                mensaje=f"El reportante aceptó tu reclamación de '{reporte.titulo}'. Coordina la entrega por el chat.",
                id_reporte=reporte.id, id_reclamo=reclamacion.id,
            )
        else:
            if not datos.motivo_rechazo:
                raise HTTPException(400, "Indica el motivo del rechazo")
            reclamacion.estado         = EstadoReclamacion.RECHAZADA
            reclamacion.motivo_rechazo = datos.motivo_rechazo
            reclamacion.revisado_en    = datetime.utcnow()
            reporte.estado             = self._estado_original(reporte)
            self.repo_rep.actualizar(reporte)
            self.repo_notif.crear_notificacion(
                id_usuario=reclamacion.id_reclamante,
                tipo=TipoNotificacion.RECLAMO_RECHAZADO,
                titulo="Reclamación rechazada",
                mensaje=f"El reportante rechazó tu reclamación de '{reporte.titulo}'. Motivo: {datos.motivo_rechazo}",
                id_reporte=reporte.id, id_reclamo=reclamacion.id,
            )

        self.repo.actualizar(reclamacion)
        return reclamacion

    # ── Registrar entrega ─────────────────────────────────────────

    def registrar_entrega(self, id_reclamacion: int, datos: EsquemaRegistrarEntrega,
                          admin: Usuario) -> Reclamacion:
        """HU28/HU36 — Registrar entrega y cambiar estado automáticamente."""
        if admin.rol not in (RolUsuario.ADMIN, RolUsuario.CUSTODIA):
            raise HTTPException(403, "Sin permiso")
        reclamacion = self._reclamacion_o_error(id_reclamacion)
        if reclamacion.estado != EstadoReclamacion.APROBADA:
            raise HTTPException(400, "La reclamación debe estar aprobada para registrar entrega")

        reclamacion.estado             = EstadoReclamacion.ENTREGADA
        reclamacion.nombre_receptor    = datos.nombre_receptor
        reclamacion.documento_receptor = datos.documento_receptor
        reclamacion.fecha_entrega      = datetime.utcnow()
        self.repo.actualizar(reclamacion)

        reporte        = self._reporte_o_error(reclamacion.id_reporte)
        reporte.estado = EstadoObjeto.ENTREGADO
        self.repo_rep.actualizar(reporte)

        self.repo_notif.crear_notificacion(
            id_usuario=reclamacion.id_reclamante,
            tipo=TipoNotificacion.ENTREGA_LISTA,
            titulo="¡Objeto entregado!",
            mensaje=f"La entrega de '{reporte.titulo}' fue registrada exitosamente.",
            id_reporte=reporte.id, id_reclamo=reclamacion.id,
        )
        return reclamacion

    # ── Consultas ─────────────────────────────────────────────────

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
