# backend/repositorios/repositorio_usuario.py
"""Repositorio de Usuarios. Extiende RepositorioBase (Patrón Repository)."""
from typing import Optional, List
from sqlalchemy.orm import Session
from backend.modelos.usuario import Usuario, EstadoUsuario, RolUsuario
from backend.repositorios.base import RepositorioBase


class RepositorioUsuario(RepositorioBase[Usuario]):

    def __init__(self, sesion: Session):
        super().__init__(Usuario, sesion)

    def buscar_por_correo(self, correo: str) -> Optional[Usuario]:
        return self.sesion.query(Usuario).filter(Usuario.correo == correo).first()

    def buscar_por_nombre_usuario(self, nombre_usuario: str) -> Optional[Usuario]:
        return self.sesion.query(Usuario).filter(Usuario.nombre_usuario == nombre_usuario).first()

    def correo_existe(self, correo: str) -> bool:
        return self.buscar_por_correo(correo) is not None

    def nombre_usuario_existe(self, nombre_usuario: str) -> bool:
        return self.buscar_por_nombre_usuario(nombre_usuario) is not None

    def bloquear_usuario(self, usuario: Usuario) -> Usuario:
        usuario.estado = EstadoUsuario.BLOQUEADO
        return self.actualizar(usuario)

    def desbloquear_usuario(self, usuario: Usuario) -> Usuario:
        usuario.estado = EstadoUsuario.ACTIVO
        return self.actualizar(usuario)

    def obtener_admins(self) -> List[Usuario]:
        return self.sesion.query(Usuario).filter(Usuario.rol == RolUsuario.ADMIN).all()
