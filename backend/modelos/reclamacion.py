# backend/modelos/reclamacion.py
import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from backend.base_datos import Base


class EstadoReclamacion(str, enum.Enum):
    PENDIENTE = "pendiente"
    APROBADA  = "aprobada"
    RECHAZADA = "rechazada"
    ENTREGADA = "entregada"


class Reclamacion(Base):
    __tablename__ = "reclamaciones"

    id                    = Column(Integer, primary_key=True, index=True)
    id_reporte            = Column(Integer, ForeignKey("reportes.id"), nullable=False)
    id_reclamante         = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    estado                = Column(Enum(EstadoReclamacion), default=EstadoReclamacion.PENDIENTE)
    respuesta_1           = Column(Text, nullable=True)
    respuesta_2           = Column(Text, nullable=True)
    respuesta_3           = Column(Text, nullable=True)
    ruta_evidencia        = Column(String(500), nullable=True)
    notas                 = Column(Text, nullable=True)
    id_revisado_por       = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    motivo_rechazo        = Column(Text, nullable=True)
    revisado_en           = Column(DateTime, nullable=True)
    nombre_receptor       = Column(String(200), nullable=True)
    documento_receptor    = Column(String(50), nullable=True)
    fecha_entrega         = Column(DateTime, nullable=True)
    creado_en             = Column(DateTime, default=datetime.utcnow)
    actualizado_en        = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    reporte       = relationship("Reporte", back_populates="reclamaciones")
    reclamante    = relationship("Usuario", back_populates="reclamaciones", foreign_keys=[id_reclamante])
    revisado_por  = relationship("Usuario", foreign_keys=[id_revisado_por])
