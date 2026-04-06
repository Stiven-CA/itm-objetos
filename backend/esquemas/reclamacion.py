# backend/esquemas/reclamacion.py
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from backend.modelos.reclamacion import EstadoReclamacion


class EsquemaCrearReclamacion(BaseModel):
    respuesta_1: Optional[str] = None
    respuesta_2: Optional[str] = None
    respuesta_3: Optional[str] = None
    notas: Optional[str] = None


class EsquemaRevisarReclamacion(BaseModel):
    accion: str  # "aprobar" | "rechazar"
    motivo_rechazo: Optional[str] = None


class EsquemaRegistrarEntrega(BaseModel):
    nombre_receptor: str
    documento_receptor: str
    notas_entrega: Optional[str] = None


class InfoReclamante(BaseModel):
    id: int
    nombre_completo: str
    correo: str
    nombre_usuario: str
    model_config = {"from_attributes": True}


class EsquemaReclamacion(BaseModel):
    id: int
    id_reporte: int
    estado: EstadoReclamacion
    notas: Optional[str]
    respuesta_1: Optional[str]
    respuesta_2: Optional[str]
    respuesta_3: Optional[str]
    motivo_rechazo: Optional[str]
    nombre_receptor: Optional[str]
    fecha_entrega: Optional[datetime]
    creado_en: datetime
    actualizado_en: datetime
    reclamante: InfoReclamante
    model_config = {"from_attributes": True}
