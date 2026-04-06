# backend/modelos/notificacion.py
import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from backend.base_datos import Base


class TipoNotificacion(str, enum.Enum):
    COINCIDENCIA          = "coincidencia"
    RECLAMO_NUEVO         = "reclamo_nuevo"
    RECLAMO_APROBADO      = "reclamo_aprobado"
    RECLAMO_RECHAZADO     = "reclamo_rechazado"
    ESTADO_CAMBIADO       = "estado_cambiado"
    REPORTE_APROBADO      = "reporte_aprobado"
    REPORTE_RECHAZADO     = "reporte_rechazado"
    ENTREGA_LISTA         = "entrega_lista"
    REPORTE_PENDIENTE     = "reporte_pendiente"     # Admin: nuevo reporte esperando revisión
    MENSAJE_DIRECTO       = "mensaje_directo"        # Chat directo entre partes
    LO_ENCONTRE           = "lo_encontre"            # Alguien dice que encontró mi objeto perdido


class Notificacion(Base):
    __tablename__ = "notificaciones"

    id             = Column(Integer, primary_key=True, index=True)
    id_usuario     = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    tipo           = Column(Enum(TipoNotificacion), nullable=False)
    titulo         = Column(String(200), nullable=False)
    mensaje        = Column(Text, nullable=False)
    leida          = Column(Boolean, default=False)
    id_reporte_rel = Column(Integer, ForeignKey("reportes.id"), nullable=True)
    id_reclamo_rel = Column(Integer, ForeignKey("reclamaciones.id"), nullable=True)
    creado_en      = Column(DateTime, default=datetime.utcnow)

    usuario    = relationship("Usuario", back_populates="notificaciones")
    reporte_rel = relationship("Reporte", foreign_keys=[id_reporte_rel])
    reclamo_rel = relationship("Reclamacion", foreign_keys=[id_reclamo_rel])
