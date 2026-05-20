# backend/enrutadores/auth.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.base_datos import obtener_sesion
from backend.dependencias import obtener_usuario_actual
from backend.modelos.usuario import Usuario
from backend.esquemas.usuario import EsquemaRegistro, EsquemaInicioSesion, EsquemaToken, EsquemaUsuario, EsquemaCambioContrasena, EsquemaActualizarUsuario, EsquemaRecuperarContrasena, EsquemaConfirmarRecuperacion
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


@enrutador.get("/verificar-usuario/{nombre_usuario}")
def verificar_usuario(nombre_usuario: str, sesion: Session = Depends(obtener_sesion)):
    """Verifica si un nombre de usuario existe."""
    repo = RepositorioUsuario(sesion)
    if not repo.nombre_usuario_existe(nombre_usuario):
        raise HTTPException(404, "Usuario no encontrado")
    return {"existe": True}


@enrutador.post("/recuperar-contrasena")
def recuperar_contrasena(datos: EsquemaRecuperarContrasena, sesion: Session = Depends(obtener_sesion)):
    """Cambia contraseña validando correo y documento."""
    ServicioAuth(sesion).recuperar_contrasena(datos.correo, datos.numero_documento, datos.nueva_contrasena)
    return {"mensaje": "Contraseña actualizada correctamente"}


@enrutador.post("/confirmar-recuperacion")
def confirmar_recuperacion(datos: EsquemaConfirmarRecuperacion, sesion: Session = Depends(obtener_sesion)):
    """Endpoint legado — redirige a recuperar-contrasena."""
    ServicioAuth(sesion).recuperar_contrasena(datos.correo, datos.numero_documento, datos.nueva_contrasena)
    return {"mensaje": "Contraseña actualizada correctamente"}


@enrutador.post("/cambiar-contrasena")
def cambiar_contrasena(
    datos: EsquemaCambioContrasena,
    usuario: Usuario = Depends(obtener_usuario_actual),
    sesion: Session = Depends(obtener_sesion),
):
    """HU34 — Cambiar contraseña."""
    ServicioAuth(sesion).cambiar_contrasena(usuario, datos.contrasena_actual, datos.contrasena_nueva)
    return {"mensaje": "Contraseña actualizada correctamente"}
