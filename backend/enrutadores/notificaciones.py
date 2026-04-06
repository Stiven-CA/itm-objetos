# backend/enrutadores/notificaciones.py
from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.base_datos import obtener_sesion
from backend.dependencias import obtener_usuario_actual
from backend.modelos.usuario import Usuario
from backend.esquemas.notificacion import EsquemaNotificacion
from backend.repositorios.repositorio_notificacion import RepositorioNotificacion

enrutador = APIRouter(prefix="/notificaciones", tags=["Notificaciones"])


@enrutador.get("/", response_model=List[EsquemaNotificacion])
def listar_notificaciones(
    saltar: int = Query(0, ge=0),
    limite: int = Query(50, le=100),
    usuario: Usuario = Depends(obtener_usuario_actual),
    sesion: Session = Depends(obtener_sesion),
):
    """HU20 — Historial de notificaciones."""
    return RepositorioNotificacion(sesion).obtener_del_usuario(usuario.id, saltar, limite)


@enrutador.get("/no-leidas")
def contar_no_leidas(
    usuario: Usuario = Depends(obtener_usuario_actual),
    sesion: Session = Depends(obtener_sesion),
):
    """HU21 — Contador de notificaciones no leídas."""
    cantidad = RepositorioNotificacion(sesion).contar_no_leidas(usuario.id)
    return {"cantidad": cantidad}


@enrutador.post("/marcar-todas-leidas")
def marcar_todas_leidas(
    usuario: Usuario = Depends(obtener_usuario_actual),
    sesion: Session = Depends(obtener_sesion),
):
    cantidad = RepositorioNotificacion(sesion).marcar_todas_leidas(usuario.id)
    return {"mensaje": f"{cantidad} notificaciones marcadas como leídas"}


@enrutador.post("/{id_notificacion}/marcar-leida")
def marcar_leida(
    id_notificacion: int,
    usuario: Usuario = Depends(obtener_usuario_actual),
    sesion: Session = Depends(obtener_sesion),
):
    RepositorioNotificacion(sesion).marcar_leida(id_notificacion, usuario.id)
    return {"mensaje": "Notificación marcada como leída"}
