# backend/esquemas/notificacion.py
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from backend.modelos.notificacion import TipoNotificacion


class EsquemaNotificacion(BaseModel):
    id: int
    tipo: TipoNotificacion
    titulo: str
    mensaje: str
    leida: bool
    id_reporte_rel: Optional[int]
    id_reclamo_rel: Optional[int]
    creado_en: datetime
    model_config = {"from_attributes": True}
