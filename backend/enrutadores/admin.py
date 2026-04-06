# backend/enrutadores/admin.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.base_datos import obtener_sesion
from backend.dependencias import requerir_admin
from backend.modelos.usuario import Usuario
from backend.esquemas.usuario import EsquemaUsuario
from backend.repositorios.repositorio_usuario import RepositorioUsuario

enrutador = APIRouter(prefix="/admin", tags=["Administración"])


@enrutador.get("/usuarios", response_model=List[EsquemaUsuario])
def listar_usuarios(
    admin: Usuario = Depends(requerir_admin),
    sesion: Session = Depends(obtener_sesion),
):
    """HU33 — Solo admins pueden ver todos los usuarios."""
    return RepositorioUsuario(sesion).obtener_todos()


@enrutador.post("/usuarios/{id_usuario}/bloquear")
def bloquear_usuario(
    id_usuario: int,
    admin: Usuario = Depends(requerir_admin),
    sesion: Session = Depends(obtener_sesion),
):
    """HU37 — Bloquear usuario."""
    repo = RepositorioUsuario(sesion)
    usuario = repo.obtener_por_id(id_usuario)
    if not usuario:
        raise HTTPException(404, "Usuario no encontrado")
    if usuario.id == admin.id:
        raise HTTPException(400, "No puedes bloquearte a ti mismo")
    repo.bloquear_usuario(usuario)
    return {"mensaje": f"Usuario '{usuario.nombre_usuario}' bloqueado correctamente"}


@enrutador.post("/usuarios/{id_usuario}/desbloquear")
def desbloquear_usuario(
    id_usuario: int,
    admin: Usuario = Depends(requerir_admin),
    sesion: Session = Depends(obtener_sesion),
):
    repo = RepositorioUsuario(sesion)
    usuario = repo.obtener_por_id(id_usuario)
    if not usuario:
        raise HTTPException(404, "Usuario no encontrado")
    repo.desbloquear_usuario(usuario)
    return {"mensaje": f"Usuario '{usuario.nombre_usuario}' desbloqueado correctamente"}


@enrutador.get("/usuarios/buscar", response_model=List[EsquemaUsuario])
def buscar_usuarios(
    nombre: str,
    admin: Usuario = Depends(requerir_admin),
    sesion: Session = Depends(obtener_sesion),
):
    """Buscar usuario por nombre o nombre de usuario."""
    from sqlalchemy import or_
    repo = RepositorioUsuario(sesion)
    resultados = sesion.query(repo.modelo).filter(
        or_(
            repo.modelo.nombre_completo.ilike(f"%{nombre}%"),
            repo.modelo.nombre_usuario.ilike(f"%{nombre}%"),
            repo.modelo.correo.ilike(f"%{nombre}%"),
        )
    ).all()
    return resultados
