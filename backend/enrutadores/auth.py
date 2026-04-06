# backend/enrutadores/auth.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.base_datos import obtener_sesion
from backend.dependencias import obtener_usuario_actual
from backend.modelos.usuario import Usuario
from backend.esquemas.usuario import EsquemaRegistro, EsquemaInicioSesion, EsquemaToken, EsquemaUsuario, EsquemaCambioContrasena, EsquemaActualizarUsuario
from backend.servicios.servicio_auth import ServicioAuth
from backend.repositorios.repositorio_usuario import RepositorioUsuario

enrutador = APIRouter(prefix="/auth", tags=["Autenticación"])


@enrutador.post("/registrar", response_model=EsquemaUsuario, status_code=201)
def registrar(datos: EsquemaRegistro, sesion: Session = Depends(obtener_sesion)):
    """HU11 — Registro con correo institucional."""
    return ServicioAuth(sesion).registrar(datos)


@enrutador.post("/iniciar-sesion", response_model=EsquemaToken)
def iniciar_sesion(datos: EsquemaInicioSesion, sesion: Session = Depends(obtener_sesion)):
    """HU04 — Inicio de sesión."""
    return ServicioAuth(sesion).iniciar_sesion(datos)


@enrutador.get("/yo", response_model=EsquemaUsuario)
def obtener_yo(usuario: Usuario = Depends(obtener_usuario_actual)):
    return usuario


@enrutador.put("/yo", response_model=EsquemaUsuario)
def actualizar_perfil(
    datos: EsquemaActualizarUsuario,
    usuario: Usuario = Depends(obtener_usuario_actual),
    sesion: Session = Depends(obtener_sesion),
):
    repo = RepositorioUsuario(sesion)
    for campo, valor in datos.model_dump(exclude_none=True).items():
        setattr(usuario, campo, valor)
    return repo.actualizar(usuario)


@enrutador.post("/cambiar-contrasena")
def cambiar_contrasena(
    datos: EsquemaCambioContrasena,
    usuario: Usuario = Depends(obtener_usuario_actual),
    sesion: Session = Depends(obtener_sesion),
):
    """HU34 — Cambiar contraseña."""
    ServicioAuth(sesion).cambiar_contrasena(usuario, datos.contrasena_actual, datos.contrasena_nueva)
    return {"mensaje": "Contraseña actualizada correctamente"}
