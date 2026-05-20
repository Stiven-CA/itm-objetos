# backend/modelos/usuario.py
"""Modelo de Usuario. Principio SOLID — Responsabilidad Única."""
import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from backend.base_datos import Base


class RolUsuario(str, enum.Enum):
    ESTUDIANTE = "estudiante"
    PROFESOR   = "profesor"
    ADMIN      = "admin"
    CUSTODIA   = "custodia"


class EstadoUsuario(str, enum.Enum):
    ACTIVO    = "activo"
    BLOQUEADO = "bloqueado"


class Usuario(Base):
    __tablename__ = "usuarios"

    id                    = Column(Integer, primary_key=True, index=True)
    nombre_completo       = Column(String(150), nullable=False)
    correo                = Column(String(200), unique=True, index=True, nullable=False)
    nombre_usuario        = Column(String(100), unique=True, index=True, nullable=False)
    contrasena_cifrada    = Column(String(255), nullable=False)
    rol                   = Column(Enum(RolUsuario), default=RolUsuario.ESTUDIANTE, nullable=False)
    estado                = Column(Enum(EstadoUsuario), default=EstadoUsuario.ACTIVO, nullable=False)
    verificado            = Column(Boolean, default=False)
    notif_correo          = Column(Boolean, default=True)
    notif_sistema         = Column(Boolean, default=True)
    creado_en             = Column(DateTime, default=datetime.utcnow)
    actualizado_en        = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    ultimo_acceso         = Column(DateTime, nullable=True)
    numero_documento      = Column(String(30), nullable=True)
    codigo_recuperacion   = Column(String(10), nullable=True)
    codigo_recuperacion_exp = Column(DateTime, nullable=True)

    reportes       = relationship("Reporte", back_populates="reportante", foreign_keys="Reporte.id_reportante")
    reclamaciones  = relationship("Reclamacion", back_populates="reclamante", foreign_keys="Reclamacion.id_reclamante")
    notificaciones = relationship("Notificacion", back_populates="usuario")

    def __repr__(self):
        return f"<Usuario {self.nombre_usuario} [{self.rol}]>"
