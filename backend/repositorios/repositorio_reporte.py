# backend/repositorios/repositorio_reporte.py
from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from backend.modelos.reporte import Reporte, HistorialReporte, EstadoObjeto, TipoReporte, CategoriaObjeto, SedeUniversitaria
from backend.repositorios.base import RepositorioBase


class RepositorioReporte(RepositorioBase[Reporte]):

    def __init__(self, sesion: Session):
        super().__init__(Reporte, sesion)

    def buscar(self, texto=None, tipo=None, categoria=None, estado=None, sede=None, saltar=0, limite=50):
        consulta = (
            self.sesion.query(Reporte)
            .options(joinedload(Reporte.reportante))
            .filter(Reporte.aprobado == True)
        )
        if texto:
            consulta = consulta.filter(or_(
                Reporte.titulo.ilike(f"%{texto}%"),
                Reporte.descripcion.ilike(f"%{texto}%"),
                Reporte.ubicacion.ilike(f"%{texto}%"),
            ))
        if tipo:      consulta = consulta.filter(Reporte.tipo_reporte == tipo)
        if categoria: consulta = consulta.filter(Reporte.categoria == categoria)
        if estado:    consulta = consulta.filter(Reporte.estado == estado)
        if sede:      consulta = consulta.filter(Reporte.sede == sede)
        return consulta.order_by(Reporte.creado_en.desc()).offset(saltar).limit(limite).all()

    def obtener_mis_reportes(self, id_reportante: int) -> List[Reporte]:
        return (self.sesion.query(Reporte)
                .filter(Reporte.id_reportante == id_reportante)
                .order_by(Reporte.creado_en.desc()).all())

    def obtener_pendientes(self) -> List[Reporte]:
        return (self.sesion.query(Reporte)
                .options(joinedload(Reporte.reportante))
                .filter(Reporte.aprobado == False)
                .filter(Reporte.estado != EstadoObjeto.CANCELADO)
                .order_by(Reporte.creado_en.asc()).all())

    def buscar_coincidencias(self, reporte: Reporte) -> List[Reporte]:
        """Busca objetos encontrados similares al reportado como perdido (HU14)."""
        return (self.sesion.query(Reporte)
                .filter(and_(
                    Reporte.tipo_reporte == TipoReporte.ENCONTRADO,
                    Reporte.categoria == reporte.categoria,
                    Reporte.estado == EstadoObjeto.ENCONTRADO,
                    Reporte.aprobado == True,
                    Reporte.id != reporte.id,
                )).all())


class RepositorioHistorial(RepositorioBase[HistorialReporte]):

    def __init__(self, sesion: Session):
        super().__init__(HistorialReporte, sesion)

    def obtener_historial_reporte(self, id_reporte: int) -> List[HistorialReporte]:
        return (self.sesion.query(HistorialReporte)
                .options(joinedload(HistorialReporte.modificado_por))
                .filter(HistorialReporte.id_reporte == id_reporte)
                .order_by(HistorialReporte.cambiado_en.desc()).all())
