# backend/enrutadores/reportes.py
from typing import Optional, List
from fastapi import APIRouter, Depends, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from backend.base_datos import obtener_sesion
from backend.dependencias import obtener_usuario_actual, requerir_admin
from backend.modelos.usuario import Usuario
from backend.modelos.reporte import CategoriaObjeto, TipoReporte, SedeUniversitaria, EstadoObjeto
from backend.esquemas.reporte import EsquemaReporte, EsquemaAccionAdmin, EsquemaCambioEstado, EsquemaHistorial, EsquemaCrearReporte, EsquemaActualizarReporte
from backend.servicios.servicio_reporte import ServicioReporte

enrutador = APIRouter(prefix="/reportes", tags=["Reportes"])


@enrutador.get("", response_model=List[EsquemaReporte])
def listar_reportes(
    busqueda: Optional[str] = Query(None),
    tipo: Optional[TipoReporte] = Query(None),
    categoria: Optional[CategoriaObjeto] = Query(None),
    estado: Optional[EstadoObjeto] = Query(None),
    sede: Optional[SedeUniversitaria] = Query(None),
    saltar: int = Query(0, ge=0),
    limite: int = Query(50, le=100),
    sesion: Session = Depends(obtener_sesion),
):
    """HU08 — Buscar objetos con filtros (público)."""
    return ServicioReporte(sesion).listar_publicos(busqueda, tipo, categoria, estado, sede, saltar, limite)


@enrutador.get("/mis-reportes", response_model=List[EsquemaReporte])
def mis_reportes(
    usuario: Usuario = Depends(obtener_usuario_actual),
    sesion: Session = Depends(obtener_sesion),
):
    """HU12 — Mis publicaciones."""
    return ServicioReporte(sesion).mis_reportes(usuario.id)


@enrutador.get("/pendientes", response_model=List[EsquemaReporte])
def reportes_pendientes(
    admin: Usuario = Depends(requerir_admin),
    sesion: Session = Depends(obtener_sesion),
):
    """HU25 — Reportes pendientes de aprobación (admin)."""
    return ServicioReporte(sesion).obtener_pendientes(admin)


@enrutador.get("/{id_reporte}", response_model=EsquemaReporte)
def obtener_reporte(id_reporte: int, sesion: Session = Depends(obtener_sesion)):
    """HU09 — Ver detalle del objeto."""
    return ServicioReporte(sesion).obtener_reporte(id_reporte)


@enrutador.get("/{id_reporte}/historial", response_model=List[EsquemaHistorial])
def ver_historial(
    id_reporte: int,
    usuario: Usuario = Depends(obtener_usuario_actual),
    sesion: Session = Depends(obtener_sesion),
):
    """HU23/HU24 — Historial de cambios."""
    return ServicioReporte(sesion).obtener_historial(id_reporte)


@enrutador.post("", response_model=EsquemaReporte, status_code=201)
async def crear_reporte(
    tipo_reporte: TipoReporte = Form(...),
    titulo: str = Form(...),
    categoria: CategoriaObjeto = Form(...),
    descripcion: str = Form(...),
    ubicacion: str = Form(...),
    sede: Optional[SedeUniversitaria] = Form(None),
    lugar_especifico: Optional[str] = Form(None),
    punto_custodia: Optional[str] = Form(None),
    hora_ocurrencia: Optional[str] = Form(None),
    imagen: Optional[UploadFile] = File(None),
    usuario: Usuario = Depends(obtener_usuario_actual),
    sesion: Session = Depends(obtener_sesion),
):
    """HU05/HU06 — Crear reporte de objeto."""
    datos = EsquemaCrearReporte(
        tipo_reporte=tipo_reporte, titulo=titulo, categoria=categoria,
        descripcion=descripcion, ubicacion=ubicacion, sede=sede,
        lugar_especifico=lugar_especifico, punto_custodia=punto_custodia,
        hora_ocurrencia=hora_ocurrencia,
    )
    return ServicioReporte(sesion).crear_reporte(datos, usuario, imagen)


@enrutador.put("/{id_reporte}", response_model=EsquemaReporte)
async def actualizar_reporte(
    id_reporte: int,
    titulo: Optional[str] = Form(None),
    categoria: Optional[CategoriaObjeto] = Form(None),
    descripcion: Optional[str] = Form(None),
    ubicacion: Optional[str] = Form(None),
    sede: Optional[SedeUniversitaria] = Form(None),
    lugar_especifico: Optional[str] = Form(None),
    punto_custodia: Optional[str] = Form(None),
    imagen: Optional[UploadFile] = File(None),
    usuario: Usuario = Depends(obtener_usuario_actual),
    sesion: Session = Depends(obtener_sesion),
):
    """HU07 — Editar reporte."""
    datos = EsquemaActualizarReporte(
        titulo=titulo, categoria=categoria, descripcion=descripcion,
        ubicacion=ubicacion, sede=sede, lugar_especifico=lugar_especifico,
        punto_custodia=punto_custodia,
    )
    return ServicioReporte(sesion).actualizar_reporte(id_reporte, datos, usuario, imagen)


@enrutador.delete("/{id_reporte}")
def cancelar_reporte(
    id_reporte: int,
    usuario: Usuario = Depends(obtener_usuario_actual),
    sesion: Session = Depends(obtener_sesion),
):
    """HU13 — Cancelar publicación."""
    ServicioReporte(sesion).cancelar_reporte(id_reporte, usuario)
    return {"mensaje": "Reporte cancelado correctamente"}


@enrutador.post("/{id_reporte}/revisar", response_model=EsquemaReporte)
def revisar_reporte(
    id_reporte: int,
    datos: EsquemaAccionAdmin,
    admin: Usuario = Depends(requerir_admin),
    sesion: Session = Depends(obtener_sesion),
):
    """HU25 — Aprobar o rechazar reporte."""
    return ServicioReporte(sesion).revisar_reporte(id_reporte, datos, admin)


@enrutador.put("/{id_reporte}/estado", response_model=EsquemaReporte)
def cambiar_estado(
    id_reporte: int,
    datos: EsquemaCambioEstado,
    usuario: Usuario = Depends(obtener_usuario_actual),
    sesion: Session = Depends(obtener_sesion),
):
    """HU29 — Cambiar estado del objeto."""
    return ServicioReporte(sesion).cambiar_estado(id_reporte, datos, usuario)


@enrutador.delete("/{id_reporte}/forzar")
def eliminar_reporte_falso(
    id_reporte: int,
    admin: Usuario = Depends(requerir_admin),
    sesion: Session = Depends(obtener_sesion),
):
    """HU32 — Eliminar reporte falso."""
    ServicioReporte(sesion).eliminar_reporte_falso(id_reporte, admin)
    return {"mensaje": "Reporte eliminado"}


@enrutador.put("/admin/{id_reporte}", response_model=EsquemaReporte)
async def editar_reporte_admin(
    id_reporte: int,
    titulo: Optional[str] = Form(None),
    categoria: Optional[CategoriaObjeto] = Form(None),
    descripcion: Optional[str] = Form(None),
    ubicacion: Optional[str] = Form(None),
    sede: Optional[SedeUniversitaria] = Form(None),
    lugar_especifico: Optional[str] = Form(None),
    punto_custodia: Optional[str] = Form(None),
    admin: Usuario = Depends(requerir_admin),
    sesion: Session = Depends(obtener_sesion),
):
    """Admin puede editar cualquier reporte."""
    datos = EsquemaActualizarReporte(
        titulo=titulo, categoria=categoria, descripcion=descripcion,
        ubicacion=ubicacion, sede=sede, lugar_especifico=lugar_especifico,
        punto_custodia=punto_custodia,
    )
    return ServicioReporte(sesion).actualizar_reporte(id_reporte, datos, admin)
