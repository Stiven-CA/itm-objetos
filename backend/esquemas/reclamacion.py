# backend/esquemas/reclamacion.py
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from backend.modelos.reclamacion import EstadoReclamacion


class EsquemaCrearReclamacion(BaseModel):
    cedula_reclamante: Optional[str] = None
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


class InfoPersona(BaseModel):
    id: int
    nombre_completo: str
    correo: str
    nombre_usuario: str
    model_config = {"from_attributes": True}


# Alias para compatibilidad
InfoReclamante = InfoPersona


class InfoReporteReclamacion(BaseModel):
    id: int
    titulo: str
    descripcion: str
    tipo_reporte: str
    sede: Optional[str]
    lugar_especifico: Optional[str]
    ruta_imagen: Optional[str]
    punto_custodia: Optional[str]
    hora_ocurrencia: Optional[str]
    reportante: Optional[InfoPersona]
    model_config = {"from_attributes": True}


class EsquemaReclamacion(BaseModel):
    id: int
    id_reporte: int
    estado: EstadoReclamacion
    cedula_reclamante: Optional[str]
    notas: Optional[str]
    respuesta_1: Optional[str]
    respuesta_2: Optional[str]
    respuesta_3: Optional[str]
    ruta_evidencia: Optional[str]
    motivo_rechazo: Optional[str]
    nombre_receptor: Optional[str]
    documento_receptor: Optional[str]
    fecha_entrega: Optional[datetime]
    creado_en: datetime
    actualizado_en: datetime
    reclamante: InfoPersona
    reporte: Optional[InfoReporteReclamacion]
    model_config = {"from_attributes": True}
