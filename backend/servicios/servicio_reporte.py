# backend/servicios/servicio_reporte.py
"""
Servicio de Reportes.
Principio SOLID:
  S — Solo lógica de reportes
  D — Depende de repositorios (abstracciones)
Implementa: HU05, HU06, HU07, HU08, HU09, HU12, HU13, HU23, HU25, HU29, HU32
"""
import os, shutil
from datetime import datetime
from typing import List, Optional
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from backend.configuracion import obtener_configuracion
from backend.modelos.usuario import Usuario, RolUsuario
from backend.modelos.reporte import Reporte, HistorialReporte, EstadoObjeto, TipoReporte
from backend.modelos.notificacion import TipoNotificacion
from backend.repositorios.repositorio_reporte import RepositorioReporte, RepositorioHistorial
from backend.repositorios.repositorio_notificacion import RepositorioNotificacion
from backend.repositorios.repositorio_usuario import RepositorioUsuario
from backend.servicios.moderacion_ia import decidir_aprobacion
from backend.esquemas.reporte import EsquemaCrearReporte, EsquemaActualizarReporte, EsquemaAccionAdmin, EsquemaCambioEstado

cfg = obtener_configuracion()


class ServicioReporte:
    """Encapsula toda la lógica de negocio relacionada con reportes de objetos."""

    def __init__(self, sesion: Session):
        self.repo          = RepositorioReporte(sesion)
        self.repo_historial = RepositorioHistorial(sesion)
        self.repo_notif    = RepositorioNotificacion(sesion)
        self.repo_usu      = RepositorioUsuario(sesion)

    # ── Helpers privados ──────────────────────────────────────────

    def _notificar_admins(self, tipo: TipoNotificacion, titulo: str, mensaje: str,
                          id_reporte=None):
        """Envía notificación a todos los administradores."""
        for admin in self.repo_usu.obtener_admins():
            self.repo_notif.crear_notificacion(
                id_usuario=admin.id, tipo=tipo, titulo=titulo,
                mensaje=mensaje, id_reporte=id_reporte,
            )

    def _guardar_imagen(self, archivo: UploadFile, id_reporte: int) -> str:
        carpeta = os.path.join(cfg.CARPETA_UPLOADS, "reportes")
        os.makedirs(carpeta, exist_ok=True)
        ext = archivo.filename.split(".")[-1].lower()
        nombre = f"reporte_{id_reporte}_{int(datetime.utcnow().timestamp())}.{ext}"
        ruta = os.path.join(carpeta, nombre)
        with open(ruta, "wb") as f:
            shutil.copyfileobj(archivo.file, f)
        return f"/uploads/reportes/{nombre}"

    def _registrar_historial(self, reporte: Reporte, actor: Usuario, accion: str,
                              estado_anterior: str = None, notas: str = None):
        entrada = HistorialReporte(
            id_reporte=reporte.id, id_modificado_por=actor.id,
            estado_anterior=estado_anterior, estado_nuevo=reporte.estado,
            accion=accion, notas=notas,
        )
        self.repo_historial.crear(entrada)

    def _validar_propietario_o_admin(self, reporte: Reporte, usuario: Usuario):
        if reporte.id_reportante != usuario.id and usuario.rol not in (RolUsuario.ADMIN, RolUsuario.CUSTODIA):
            raise HTTPException(403, "No tienes permiso para esta acción")

    def _obtener_o_error(self, id_reporte: int) -> Reporte:
        reporte = self.repo.obtener_por_id(id_reporte)
        if not reporte:
            raise HTTPException(404, "Reporte no encontrado")
        return reporte

    # ── CRUD ──────────────────────────────────────────────────────

    def crear_reporte(self, datos: EsquemaCrearReporte, reportante: Usuario,
                      imagen: Optional[UploadFile] = None) -> Reporte:
        """HU05/HU06 — Crear reporte. Siempre pendiente si admin disponible, IA fuera de horario."""
        estado_inicial = EstadoObjeto.PERDIDO if datos.tipo_reporte == TipoReporte.PERDIDO else EstadoObjeto.ENCONTRADO

        if reportante.rol == RolUsuario.ADMIN:
            aprobado_inicial = True
        else:
            aprobado_inicial, _ = decidir_aprobacion(datos.titulo, datos.descripcion)

        reporte = Reporte(
            tipo_reporte=datos.tipo_reporte, titulo=datos.titulo,
            categoria=datos.categoria, descripcion=datos.descripcion,
            ubicacion=datos.ubicacion, sede=datos.sede,
            lugar_especifico=datos.lugar_especifico, punto_custodia=datos.punto_custodia,
            estado=estado_inicial, id_reportante=reportante.id,
            aprobado=aprobado_inicial,
            hora_ocurrencia=datos.hora_ocurrencia,
        )
        reporte = self.repo.crear(reporte)
        if imagen:
            reporte.ruta_imagen = self._guardar_imagen(imagen, reporte.id)
            self.repo.actualizar(reporte)
        self._registrar_historial(reporte, reportante, "Reporte creado")

        # Notificar a todos los admins cada vez que se crea un reporte
        tipo_aviso = "encontrado" if datos.tipo_reporte == TipoReporte.ENCONTRADO else "perdido"
        estado_aviso = "aprobado automáticamente (IA/fuera de horario)" if aprobado_inicial else "pendiente de tu revisión"
        self._notificar_admins(
            tipo=TipoNotificacion.REPORTE_PENDIENTE,
            titulo=f"Nuevo reporte {tipo_aviso} — {datos.titulo}",
            mensaje=(
                f"{reportante.nombre_completo} publicó un objeto {tipo_aviso}: '{datos.titulo}'.\n"
                f"Categoría: {datos.categoria} | Sede: {datos.sede or 'No especificada'}\n"
                f"Estado: {estado_aviso}."
            ),
            id_reporte=reporte.id,
        )

        if datos.tipo_reporte == TipoReporte.PERDIDO:
            self._detectar_coincidencias(reporte)
        return reporte

    def actualizar_reporte(self, id_reporte: int, datos: EsquemaActualizarReporte,
                           usuario: Usuario, imagen: Optional[UploadFile] = None) -> Reporte:
        """HU07 — Editar reporte propio."""
        reporte = self._obtener_o_error(id_reporte)
        self._validar_propietario_o_admin(reporte, usuario)
        if reporte.estado in (EstadoObjeto.RECLAMADO, EstadoObjeto.ENTREGADO):
            raise HTTPException(400, "No se puede editar un reporte con reclamación activa")
        for campo, valor in datos.model_dump(exclude_none=True).items():
            setattr(reporte, campo, valor)
        if imagen:
            reporte.ruta_imagen = self._guardar_imagen(imagen, reporte.id)
        self.repo.actualizar(reporte)
        self._registrar_historial(reporte, usuario, "Reporte editado")
        return reporte

    def cancelar_reporte(self, id_reporte: int, usuario: Usuario) -> bool:
        """HU13 — Cancelar publicación propia."""
        reporte = self._obtener_o_error(id_reporte)
        self._validar_propietario_o_admin(reporte, usuario)
        if reporte.estado in (EstadoObjeto.RECLAMADO, EstadoObjeto.ENTREGADO):
            raise HTTPException(400, "No se puede cancelar con reclamación activa")
        estado_anterior = reporte.estado
        reporte.estado = EstadoObjeto.CANCELADO
        self.repo.actualizar(reporte)
        self._registrar_historial(reporte, usuario, "Reporte cancelado", str(estado_anterior))
        return True

    # ── Consultas ─────────────────────────────────────────────────

    def obtener_reporte(self, id_reporte: int) -> Reporte:
        return self._obtener_o_error(id_reporte)

    def listar_publicos(self, texto=None, tipo=None, categoria=None, estado=None, sede=None, saltar=0, limite=50):
        """HU08 — Búsqueda con filtros."""
        return self.repo.buscar(texto, tipo, categoria, estado, sede, saltar, limite)

    def mis_reportes(self, id_usuario: int) -> List[Reporte]:
        """HU12 — Mis publicaciones."""
        return self.repo.obtener_mis_reportes(id_usuario)

    def obtener_historial(self, id_reporte: int) -> list:
        """HU23/HU24 — Historial de cambios."""
        self._obtener_o_error(id_reporte)
        return self.repo_historial.obtener_historial_reporte(id_reporte)

    # ── Acciones de administrador ──────────────────────────────────

    def revisar_reporte(self, id_reporte: int, datos: EsquemaAccionAdmin, admin: Usuario) -> Reporte:
        """HU25 — Aprobar o rechazar reporte."""
        if admin.rol != RolUsuario.ADMIN:
            raise HTTPException(403, "Solo administradores")
        reporte = self._obtener_o_error(id_reporte)
        estado_anterior = str(reporte.estado)
        if datos.accion == "aprobar":
            reporte.aprobado = True
            reporte.id_aprobado_por = admin.id
            accion_texto = "Reporte aprobado por administrador"
            tipo_notif = TipoNotificacion.REPORTE_APROBADO
            mensaje_notif = f"Tu reporte '{reporte.titulo}' fue aprobado y ya es visible para la comunidad."
        else:
            reporte.aprobado = False
            reporte.motivo_rechazo = datos.motivo
            reporte.estado = EstadoObjeto.CANCELADO
            accion_texto = "Reporte rechazado"
            tipo_notif = TipoNotificacion.REPORTE_RECHAZADO
            mensaje_notif = f"Tu reporte '{reporte.titulo}' fue rechazado. Motivo: {datos.motivo}"
        self.repo.actualizar(reporte)
        self._registrar_historial(reporte, admin, accion_texto, estado_anterior, datos.motivo)
        self.repo_notif.crear_notificacion(
            id_usuario=reporte.id_reportante, tipo=tipo_notif,
            titulo="Tu reporte fue revisado", mensaje=mensaje_notif,
            id_reporte=reporte.id,
        )
        return reporte

    def cambiar_estado(self, id_reporte: int, datos: EsquemaCambioEstado, usuario: Usuario) -> Reporte:
        """HU29 — Cambiar estado del objeto."""
        if usuario.rol not in (RolUsuario.ADMIN, RolUsuario.CUSTODIA):
            raise HTTPException(403, "Sin permiso para cambiar estado")
        reporte = self._obtener_o_error(id_reporte)
        estado_anterior = str(reporte.estado)
        reporte.estado = datos.nuevo_estado
        self.repo.actualizar(reporte)
        self._registrar_historial(reporte, usuario, f"Estado cambiado a {datos.nuevo_estado}", estado_anterior, datos.notas)
        self.repo_notif.crear_notificacion(
            id_usuario=reporte.id_reportante, tipo=TipoNotificacion.ESTADO_CAMBIADO,
            titulo="Estado de tu reporte actualizado",
            mensaje=f"Tu reporte '{reporte.titulo}' cambió a estado: {datos.nuevo_estado}.",
            id_reporte=reporte.id,
        )
        return reporte

    def eliminar_reporte_falso(self, id_reporte: int, admin: Usuario) -> bool:
        """HU32 — Eliminar reporte falso."""
        if admin.rol != RolUsuario.ADMIN:
            raise HTTPException(403, "Solo administradores")
        reporte = self._obtener_o_error(id_reporte)
        return self.repo.eliminar(reporte)

    def obtener_pendientes(self, admin: Usuario) -> List[Reporte]:
        if admin.rol != RolUsuario.ADMIN:
            raise HTTPException(403, "Solo administradores")
        return self.repo.obtener_pendientes()

    def _detectar_coincidencias(self, reporte_perdido: Reporte):
        """HU14 — Detectar coincidencias y notificar al usuario."""
        coincidencias = self.repo.buscar_coincidencias(reporte_perdido)
        for encontrado in coincidencias:
            self.repo_notif.crear_notificacion(
                id_usuario=reporte_perdido.id_reportante,
                tipo=TipoNotificacion.COINCIDENCIA,
                titulo="¡Posible coincidencia encontrada!",
                mensaje=f"Encontramos un objeto similar a '{reporte_perdido.titulo}': '{encontrado.titulo}'.",
                id_reporte=encontrado.id,
            )
