# backend/configuracion.py
"""
Configuración centralizada — Patrón Singleton con @lru_cache.
Principio SOLID — Responsabilidad Única: solo gestiona configuración.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Configuracion(BaseSettings):
    """Parámetros globales. Se sobreescriben desde el archivo .env"""
    NOMBRE_APP: str = "Objetos Perdidos y Encontrados - ITM"
    VERSION: str = "1.0.0"
    MODO_DEBUG: bool = True
    URL_BASE_DATOS: str = "sqlite:///./objetos_perdidos.db"
    CLAVE_SECRETA: str = "itm-clave-secreta-cambiar-en-produccion"
    ALGORITMO: str = "HS256"
    MINUTOS_EXPIRACION_TOKEN: int = 480
    DOMINIO_INSTITUCIONAL: str = "correo.itm.edu.co"
    CARPETA_UPLOADS: str = "uploads"

    class Config:
        env_file = ".env"


@lru_cache()
def obtener_configuracion() -> Configuracion:
    """Retorna la instancia única de Configuracion (Patrón Singleton)."""
    return Configuracion()
