# backend/esquemas/chat.py
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class EsquemaEnviarMensaje(BaseModel):
    mensaje: str


class InfoUsuarioChat(BaseModel):
    id: int
    nombre_completo: str
    nombre_usuario: str
    model_config = {"from_attributes": True}


class EsquemaMensajeChat(BaseModel):
    id: int
    id_reporte: int
    id_reclamacion: Optional[int]
    mensaje: str
    leido: bool
    creado_en: datetime
    emisor: InfoUsuarioChat
    receptor: InfoUsuarioChat
    model_config = {"from_attributes": True}
