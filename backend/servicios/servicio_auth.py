# backend/servicios/servicio_auth.py
"""
Servicio de Autenticación.
Principio SOLID:
  S — Solo gestiona auth/tokens/contraseñas
  D — Depende de RepositorioUsuario (abstracción)
Implementa: HU01, HU04, HU11, HU34
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.configuracion import obtener_configuracion
from backend.modelos.usuario import Usuario, EstadoUsuario
from backend.repositorios.repositorio_usuario import RepositorioUsuario
from backend.esquemas.usuario import EsquemaRegistro, EsquemaInicioSesion, EsquemaToken, EsquemaUsuario

cfg = obtener_configuracion()
contexto_cifrado = CryptContext(schemes=["bcrypt"], deprecated="auto")


class ServicioAuth:
    """Gestiona registro, login y tokens JWT."""

    def __init__(self, sesion: Session):
        self.repo = RepositorioUsuario(sesion)

    def cifrar_contrasena(self, contrasena: str) -> str:
        return contexto_cifrado.hash(contrasena)

    def verificar_contrasena(self, plana: str, cifrada: str) -> bool:
        return contexto_cifrado.verify(plana, cifrada)

    def crear_token(self, datos: dict, expiracion: Optional[timedelta] = None) -> str:
        carga = datos.copy()
        vence = datetime.utcnow() + (expiracion or timedelta(minutes=cfg.MINUTOS_EXPIRACION_TOKEN))
        carga.update({"exp": vence})
        return jwt.encode(carga, cfg.CLAVE_SECRETA, algorithm=cfg.ALGORITMO)

    def decodificar_token(self, token: str) -> dict:
        try:
            return jwt.decode(token, cfg.CLAVE_SECRETA, algorithms=[cfg.ALGORITMO])
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido o expirado. Inicia sesión de nuevo.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    def registrar(self, datos: EsquemaRegistro) -> Usuario:
        """HU11 — Registro con correo institucional."""
        if self.repo.correo_existe(datos.correo):
            raise HTTPException(400, "Ya existe una cuenta con ese correo")
        if self.repo.nombre_usuario_existe(datos.nombre_usuario):
            raise HTTPException(400, "Ese nombre de usuario ya está en uso")
        nuevo = Usuario(
            nombre_completo=datos.nombre_completo,
            correo=datos.correo,
            nombre_usuario=datos.nombre_usuario,
            contrasena_cifrada=self.cifrar_contrasena(datos.contrasena),
            rol=datos.rol,
        )
        return self.repo.crear(nuevo)

    def iniciar_sesion(self, datos: EsquemaInicioSesion) -> EsquemaToken:
        """HU04 — Login con usuario y contraseña."""
        usuario = self.repo.buscar_por_nombre_usuario(datos.nombre_usuario)
        if not usuario or not self.verificar_contrasena(datos.contrasena, usuario.contrasena_cifrada):
            raise HTTPException(401, "Usuario o contraseña incorrectos")
        if usuario.estado == EstadoUsuario.BLOQUEADO:
            raise HTTPException(403, "Tu cuenta está bloqueada. Contacta al administrador.")
        usuario.ultimo_acceso = datetime.utcnow()
        self.repo.actualizar(usuario)
        token = self.crear_token({"sub": str(usuario.id), "rol": usuario.rol})
        return EsquemaToken(token_acceso=token, usuario=EsquemaUsuario.model_validate(usuario))

    def cambiar_contrasena(self, usuario: Usuario, actual: str, nueva: str) -> bool:
        """HU34 — Cambio de contraseña autenticado."""
        if not self.verificar_contrasena(actual, usuario.contrasena_cifrada):
            raise HTTPException(400, "La contraseña actual es incorrecta")
        usuario.contrasena_cifrada = self.cifrar_contrasena(nueva)
        self.repo.actualizar(usuario)
        return True

    def obtener_usuario_actual(self, token: str) -> Usuario:
        carga = self.decodificar_token(token)
        id_usuario = carga.get("sub")
        if not id_usuario:
            raise HTTPException(401, "Token con formato inválido")
        usuario = self.repo.obtener_por_id(int(id_usuario))
        if not usuario:
            raise HTTPException(404, "Usuario no encontrado")
        if usuario.estado == EstadoUsuario.BLOQUEADO:
            raise HTTPException(403, "Cuenta bloqueada")
        return usuario
