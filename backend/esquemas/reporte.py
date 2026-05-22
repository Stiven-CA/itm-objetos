# backend/esquemas/reporte.py
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from backend.modelos.reporte import CategoriaObjeto, EstadoObjeto, TipoReporte, SedeUniversitaria


class EsquemaCrearReporte(BaseModel):
    hora_ocurrencia: str | None = None  # 'HH:MM' — solo para validacion interna
    tipo_reporte: TipoReporte
    titulo: str
    categoria: CategoriaObjeto
    descripcion: str
    ubicacion: str
    sede: Optional[SedeUniversitaria] = None
    lugar_especifico: Optional[str] = None
    punto_custodia: Optional[str] = None


class EsquemaActualizarReporte(BaseModel):
    titulo: Optional[str] = None
    categoria: Optional[CategoriaObjeto] = None
    descripcion: Optional[str] = None
    ubicacion: Optional[str] = None
    sede: Optional[SedeUniversitaria] = None
    lugar_especifico: Optional[str] = None
    punto_custodia: Optional[str] = None
    hora_ocurrencia: Optional[str] = None


class InfoReportante(BaseModel):
    id: int
    nombre_completo: str
    nombre_usuario: str
    model_config = {"from_attributes": True}


class EsquemaReporte(BaseModel):
    id: int
    tipo_reporte: TipoReporte
    titulo: str
    categoria: CategoriaObjeto
    descripcion: str
    ubicacion: str
    sede: Optional[SedeUniversitaria]
    lugar_especifico: Optional[str]
    ruta_imagen: Optional[str]
    estado: str
    punto_custodia: Optional[str]
    aprobado: bool
    hora_ocurrencia: str | None
    creado_en: datetime
    actualizado_en: datetime
    reportante: InfoReportante
    model_config = {"from_attributes": True}


class EsquemaAccionAdmin(BaseModel):
    accion: str  # "aprobar" | "rechazar"
    motivo: Optional[str] = None


class EsquemaCambioEstado(BaseModel):
    nuevo_estado: str
    notas: Optional[str] = None


class EsquemaHistorial(BaseModel):
    id: int
    estado_anterior: Optional[str]
    estado_nuevo: str
    accion: str
    notas: Optional[str]
    cambiado_en: datetime
    modificado_por: InfoReportante
    model_config = {"from_attributes": True}
