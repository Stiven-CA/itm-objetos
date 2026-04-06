# backend/base_datos.py
"""
Gestión de la conexión a la base de datos.
Principio SOLID — Responsabilidad Única: solo maneja sesiones de BD.
Patrón Inyección de Dependencias: obtener_sesion() es usado por FastAPI.
"""
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from backend.configuracion import obtener_configuracion

configuracion = obtener_configuracion()

motor = create_engine(
    configuracion.URL_BASE_DATOS,
    connect_args={"check_same_thread": False},
    echo=configuracion.MODO_DEBUG,
)

@event.listens_for(motor, "connect")
def activar_claves_foraneas(conexion, registro):
    """Activa integridad referencial en SQLite."""
    cursor = conexion.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

FabricaSesion = sessionmaker(autocommit=False, autoflush=False, bind=motor)
Base = declarative_base()


def obtener_sesion():
    """
    Generador de sesiones para inyección de dependencias.
    Garantiza cierre de sesión aunque ocurra un error.
    """
    sesion = FabricaSesion()
    try:
        yield sesion
    finally:
        sesion.close()
