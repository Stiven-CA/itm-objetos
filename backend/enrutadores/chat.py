# backend/enrutadores/chat.py
"""
Enrutador de Chat — mensajes directos entre partes.
Principio SOLID — S: solo maneja rutas de mensajería.
Patrón Fachada: delega lógica al repositorio y servicio.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.base_datos import obtener_sesion
from backend.dependencias import obtener_usuario_actual
from backend.modelos.usuario import Usuario
from backend.modelos.reporte import Reporte, EstadoObjeto
from backend.modelos.chat import MensajeChat
from backend.modelos.notificacion import TipoNotificacion
from backend.repositorios.repositorio_chat import RepositorioChat
from backend.repositorios.repositorio_reporte import RepositorioReporte
from backend.repositorios.repositorio_reclamacion import RepositorioReclamacion
from backend.repositorios.repositorio_notificacion import RepositorioNotificacion
from backend.esquemas.chat import EsquemaEnviarMensaje, EsquemaMensajeChat

enrutador = APIRouter(prefix="/chat", tags=["Chat"])


def _validar_participante(reporte: Reporte, reclamacion, usuario: Usuario):
    """Verifica que el usuario sea parte legítima de la conversación."""
    ids_validos = {reporte.id_reportante}
    if reclamacion:
        ids_validos.add(reclamacion.id_reclamante)
    if usuario.id not in ids_validos:
        raise HTTPException(403, "No eres parte de esta conversación")


@enrutador.get("/reporte/{id_reporte}", response_model=List[EsquemaMensajeChat])
def obtener_conversacion(
    id_reporte: int,
    usuario: Usuario = Depends(obtener_usuario_actual),
    sesion: Session = Depends(obtener_sesion),
):
    """Obtiene los mensajes de chat para un reporte."""
    repo_rep  = RepositorioReporte(sesion)
    repo_rec  = RepositorioReclamacion(sesion)
    repo_chat = RepositorioChat(sesion)

    reporte = repo_rep.obtener_por_id(id_reporte)
    if not reporte:
        raise HTTPException(404, "Reporte no encontrado")

    # Buscar la reclamación activa del reporte (la más reciente pendiente o aprobada)
    reclamacion = (
        sesion.query(__import__('backend.modelos.reclamacion', fromlist=['Reclamacion']).Reclamacion)
        .filter_by(id_reporte=id_reporte)
        .order_by(__import__('backend.modelos.reclamacion', fromlist=['Reclamacion']).Reclamacion.creado_en.desc())
        .first()
    )

    _validar_participante(reporte, reclamacion, usuario)

    # Determinar el otro participante
    otro_id = (
        reclamacion.id_reclamante
        if reclamacion and usuario.id == reporte.id_reportante
        else reporte.id_reportante
    )

    # Marcar como leídos los mensajes recibidos
    repo_chat.marcar_leidos(id_reporte, usuario.id)

    return repo_chat.obtener_conversacion(id_reporte, usuario.id, otro_id)


@enrutador.post("/reporte/{id_reporte}", response_model=EsquemaMensajeChat, status_code=201)
def enviar_mensaje(
    id_reporte: int,
    datos: EsquemaEnviarMensaje,
    usuario: Usuario = Depends(obtener_usuario_actual),
    sesion: Session = Depends(obtener_sesion),
):
    """Envía un mensaje en el chat de un reporte."""
    repo_rep   = RepositorioReporte(sesion)
    repo_chat  = RepositorioChat(sesion)
    repo_notif = RepositorioNotificacion(sesion)

    reporte = repo_rep.obtener_por_id(id_reporte)
    if not reporte:
        raise HTTPException(404, "Reporte no encontrado")

    from backend.modelos.reclamacion import Reclamacion
    reclamacion = (
        sesion.query(Reclamacion)
        .filter_by(id_reporte=id_reporte)
        .order_by(Reclamacion.creado_en.desc())
        .first()
    )

    _validar_participante(reporte, reclamacion, usuario)

    # Determinar receptor
    if usuario.id == reporte.id_reportante:
        id_receptor = reclamacion.id_reclamante if reclamacion else None
    else:
        id_receptor = reporte.id_reportante

    if not id_receptor:
        raise HTTPException(400, "No hay receptor válido para este chat")

    mensaje = MensajeChat(
        id_reporte=id_reporte,
        id_reclamacion=reclamacion.id if reclamacion else None,
        id_emisor=usuario.id,
        id_receptor=id_receptor,
        mensaje=datos.mensaje.strip(),
    )
    mensaje = repo_chat.crear(mensaje)

    # Notificar al receptor
    repo_notif.crear_notificacion(
        id_usuario=id_receptor,
        tipo=TipoNotificacion.MENSAJE_DIRECTO,
        titulo=f"Mensaje de {usuario.nombre_completo}",
        mensaje=f"Sobre el objeto '{reporte.titulo}': {datos.mensaje[:80]}{'...' if len(datos.mensaje) > 80 else ''}",
        id_reporte=id_reporte,
    )

    return mensaje
