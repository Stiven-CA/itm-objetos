# backend/dependencias.py
"""
Dependencias de FastAPI — Patrón Inyección de Dependencias.
Principio SOLID — Inversión de dependencias:
los enrutadores nunca instancian servicios directamente.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from backend.base_datos import obtener_sesion
from backend.modelos.usuario import Usuario, RolUsuario
from backend.servicios.servicio_auth import ServicioAuth

esquema_portador = HTTPBearer()


def obtener_usuario_actual(
    credenciales: HTTPAuthorizationCredentials = Depends(esquema_portador),
    sesion: Session = Depends(obtener_sesion),
) -> Usuario:
    """Valida el token y retorna el usuario autenticado."""
    servicio = ServicioAuth(sesion)
    return servicio.obtener_usuario_actual(credenciales.credentials)


def requerir_admin(usuario: Usuario = Depends(obtener_usuario_actual)) -> Usuario:
    """Solo permite acceso a administradores."""
    if usuario.rol != RolUsuario.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren permisos de administrador"
        )
    return usuario


def requerir_personal(usuario: Usuario = Depends(obtener_usuario_actual)) -> Usuario:
    """Permite acceso a administradores y personal de custodia."""
    if usuario.rol not in (RolUsuario.ADMIN, RolUsuario.CUSTODIA):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido al personal autorizado"
        )
    return usuario
