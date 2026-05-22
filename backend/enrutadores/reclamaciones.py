# backend/enrutadores/reclamaciones.py
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from backend.base_datos import obtener_sesion
from backend.dependencias import obtener_usuario_actual, requerir_personal
from backend.modelos.usuario import Usuario
from backend.esquemas.reclamacion import EsquemaCrearReclamacion, EsquemaRevisarReclamacion, EsquemaRegistrarEntrega, EsquemaReclamacion
from backend.servicios.servicio_reclamacion import ServicioReclamacion

enrutador = APIRouter(prefix="/reclamaciones", tags=["Reclamaciones"])


@enrutador.get("/mias", response_model=List[EsquemaReclamacion])
def mis_reclamaciones(
    usuario: Usuario = Depends(obtener_usuario_actual),
    sesion: Session = Depends(obtener_sesion),
):
    return ServicioReclamacion(sesion).mis_reclamaciones(usuario)


@enrutador.get("/pendientes", response_model=List[EsquemaReclamacion])
def reclamaciones_pendientes(
    personal: Usuario = Depends(requerir_personal),
    sesion: Session = Depends(obtener_sesion),
):
    return ServicioReclamacion(sesion).reclamaciones_pendientes(personal)


@enrutador.get("/aprobadas", response_model=List[EsquemaReclamacion])
def reclamaciones_aprobadas(
    personal: Usuario = Depends(requerir_personal),
    sesion: Session = Depends(obtener_sesion),
):
    return ServicioReclamacion(sesion).reclamaciones_aprobadas(personal)


@enrutador.post("/reporte/{id_reporte}", response_model=EsquemaReclamacion, status_code=201)
async def enviar_reclamacion(
    id_reporte: int,
    cedula_reclamante: str = Form(None),
    respuesta_1: str = Form(None),
    respuesta_2: str = Form(None),
    respuesta_3: str = Form(None),
    notas: str = Form(None),
    evidencia: UploadFile = File(None),
    usuario: Usuario = Depends(obtener_usuario_actual),
    sesion: Session = Depends(obtener_sesion),
):
    datos = EsquemaCrearReclamacion(
        cedula_reclamante=cedula_reclamante,
        respuesta_1=respuesta_1, respuesta_2=respuesta_2,
        respuesta_3=respuesta_3, notas=notas,
    )
    return ServicioReclamacion(sesion).enviar_reclamacion(id_reporte, datos, usuario, evidencia)


@enrutador.get("/reporte/{id_reporte}", response_model=List[EsquemaReclamacion])
def reclamaciones_de_reporte(
    id_reporte: int,
    usuario: Usuario = Depends(obtener_usuario_actual),
    sesion: Session = Depends(obtener_sesion),
):
    return ServicioReclamacion(sesion).reclamaciones_de_reporte(id_reporte, usuario)


@enrutador.post("/{id_reclamacion}/revisar", response_model=EsquemaReclamacion)
def revisar_reclamacion(
    id_reclamacion: int,
    datos: EsquemaRevisarReclamacion,
    personal: Usuario = Depends(requerir_personal),
    sesion: Session = Depends(obtener_sesion),
):
    return ServicioReclamacion(sesion).revisar_reclamacion(id_reclamacion, datos, personal)


@enrutador.post("/{id_reclamacion}/entregar", response_model=EsquemaReclamacion)
def registrar_entrega(
    id_reclamacion: int,
    datos: EsquemaRegistrarEntrega,
    personal: Usuario = Depends(requerir_personal),
    sesion: Session = Depends(obtener_sesion),
):
    return ServicioReclamacion(sesion).registrar_entrega(id_reclamacion, datos, personal)
