# backend/modelos/chat.py
"""
Modelo Chat — mensajes directos entre usuario que reclama y reportante.
Patrón: Entity. Principio SOLID — S: solo representa el mensaje.
Se activa cuando el objeto no tiene punto de custodia (quien lo encontró
aún lo tiene) → el admin no interviene, las partes se comunican directamente.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from backend.base_datos import Base


class MensajeChat(Base):
    __tablename__ = "mensajes_chat"

    id             = Column(Integer, primary_key=True, index=True)
    id_reporte     = Column(Integer, ForeignKey("reportes.id"), nullable=False)
    id_reclamacion = Column(Integer, ForeignKey("reclamaciones.id"), nullable=True)
    id_emisor      = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    id_receptor    = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    mensaje        = Column(Text, nullable=False)
    leido          = Column(Boolean, default=False)
    creado_en      = Column(DateTime, default=datetime.utcnow)

    reporte     = relationship("Reporte",     foreign_keys=[id_reporte])
    reclamacion = relationship("Reclamacion", foreign_keys=[id_reclamacion])
    emisor      = relationship("Usuario",     foreign_keys=[id_emisor])
    receptor    = relationship("Usuario",     foreign_keys=[id_receptor])
