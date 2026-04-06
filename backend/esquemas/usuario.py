# backend/esquemas/usuario.py
"""
Esquemas Pydantic para validación de datos de Usuario.
Principio SOLID — Segregación de interfaces: un esquema por operación.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator
from backend.modelos.usuario import RolUsuario, EstadoUsuario
from backend.configuracion import obtener_configuracion

cfg = obtener_configuracion()


class EsquemaRegistro(BaseModel):
    nombre_completo: str
    correo: EmailStr
    nombre_usuario: str
    contrasena: str
    rol: RolUsuario = RolUsuario.ESTUDIANTE

    @field_validator("correo")
    @classmethod
    def validar_correo_institucional(cls, valor: str) -> str:
        if not valor.endswith(f"@{cfg.DOMINIO_INSTITUCIONAL}"):
            raise ValueError(f"Solo se permiten correos @{cfg.DOMINIO_INSTITUCIONAL}")
        return valor.lower()

    @field_validator("contrasena")
    @classmethod
    def validar_contrasena(cls, valor: str) -> str:
        if len(valor) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return valor

    @field_validator("nombre_usuario")
    @classmethod
    def validar_nombre_usuario(cls, valor: str) -> str:
        if len(valor) < 3:
            raise ValueError("El usuario debe tener al menos 3 caracteres")
        return valor.lower()


class EsquemaInicioSesion(BaseModel):
    nombre_usuario: str
    contrasena: str


class EsquemaUsuario(BaseModel):
    id: int
    nombre_completo: str
    correo: str
    nombre_usuario: str
    rol: RolUsuario
    estado: EstadoUsuario
    notif_correo: bool
    notif_sistema: bool
    creado_en: datetime
    model_config = {"from_attributes": True}


class EsquemaActualizarUsuario(BaseModel):
    nombre_completo: Optional[str] = None
    notif_correo: Optional[bool] = None
    notif_sistema: Optional[bool] = None


class EsquemaCambioContrasena(BaseModel):
    contrasena_actual: str
    contrasena_nueva: str

    @field_validator("contrasena_nueva")
    @classmethod
    def validar_nueva(cls, valor: str) -> str:
        if len(valor) < 8:
            raise ValueError("Mínimo 8 caracteres")
        return valor


class EsquemaToken(BaseModel):
    token_acceso: str
    tipo_token: str = "bearer"
    usuario: EsquemaUsuario
