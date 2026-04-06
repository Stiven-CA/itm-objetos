# backend/modelos/reporte.py
"""Modelos Reporte e HistorialReporte. Principio SOLID — Responsabilidad Única."""
import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from backend.base_datos import Base


class CategoriaObjeto(str, enum.Enum):
    ELECTRONICO = "electronico"
    DOCUMENTO   = "documento"
    ACCESORIO   = "accesorio"
    ROPA        = "ropa"
    MALETA      = "maleta"
    LLAVES      = "llaves"
    GAFAS       = "gafas"
    JOYERIA     = "joyeria"
    LIBRO       = "libro"
    OTRO        = "otro"


class EstadoObjeto(str, enum.Enum):
    PERDIDO               = "perdido"
    ENCONTRADO            = "encontrado"
    PENDIENTE_RECLAMACION = "pendiente_reclamacion"
    RECLAMADO             = "reclamado"
    ENTREGADO             = "entregado"
    CANCELADO             = "cancelado"


class TipoReporte(str, enum.Enum):
    PERDIDO    = "perdido"
    ENCONTRADO = "encontrado"


class SedeUniversitaria(str, enum.Enum):
    ROBLEDO     = "Sede Robledo"
    FRATERNIDAD = "Sede Fraternidad"
    FLORESTA   = "Sede Floresta"
    PRADO      = "Sede Prado"
    CASTILLA   = "Sede Castilla"


class Reporte(Base):
    __tablename__ = "reportes"

    id                       = Column(Integer, primary_key=True, index=True)
    tipo_reporte             = Column(Enum(TipoReporte), nullable=False)
    titulo                   = Column(String(200), nullable=False)
    categoria                = Column(Enum(CategoriaObjeto), nullable=False)
    descripcion              = Column(Text, nullable=False)
    ubicacion                = Column(String(300), nullable=False)
    sede                     = Column(Enum(SedeUniversitaria), nullable=True)
    lugar_especifico         = Column(String(200), nullable=True)
    ruta_imagen              = Column(String(500), nullable=True)
    estado                   = Column(Enum(EstadoObjeto), nullable=False)
    punto_custodia           = Column(String(300), nullable=True)
    aprobado                 = Column(Boolean, default=False)
    motivo_rechazo           = Column(Text, nullable=True)
    fecha_ocurrencia         = Column(DateTime, nullable=True)
    hora_ocurrencia          = Column(String(10), nullable=True)  # 'HH:MM' para validacion interna
    creado_en                = Column(DateTime, default=datetime.utcnow)
    actualizado_en           = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    id_reportante            = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    id_aprobado_por          = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    reportante    = relationship("Usuario", back_populates="reportes", foreign_keys=[id_reportante])
    aprobado_por  = relationship("Usuario", foreign_keys=[id_aprobado_por])
    reclamaciones = relationship("Reclamacion", back_populates="reporte")
    historial     = relationship("HistorialReporte", back_populates="reporte",
                                 order_by="HistorialReporte.cambiado_en.desc()")

    def __repr__(self):
        return f"<Reporte {self.titulo} [{self.estado}]>"


class HistorialReporte(Base):
    """Trazabilidad automática de cambios (HU23). Patrón Observer."""
    __tablename__ = "historial_reportes"

    id                 = Column(Integer, primary_key=True, index=True)
    id_reporte         = Column(Integer, ForeignKey("reportes.id"), nullable=False)
    id_modificado_por  = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    estado_anterior    = Column(String(50), nullable=True)
    estado_nuevo       = Column(String(50), nullable=False)
    accion             = Column(String(100), nullable=False)
    notas              = Column(Text, nullable=True)
    cambiado_en        = Column(DateTime, default=datetime.utcnow)

    reporte        = relationship("Reporte", back_populates="historial")
    modificado_por = relationship("Usuario")
