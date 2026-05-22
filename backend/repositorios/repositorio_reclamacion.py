# backend/repositorios/repositorio_reclamacion.py
from typing import List
from sqlalchemy.orm import Session, joinedload, contains_eager
from backend.modelos.reclamacion import Reclamacion, EstadoReclamacion
from backend.repositorios.base import RepositorioBase


class RepositorioReclamacion(RepositorioBase[Reclamacion]):

    def __init__(self, sesion: Session):
        super().__init__(Reclamacion, sesion)

    def obtener_por_reporte(self, id_reporte: int) -> List[Reclamacion]:
        return (self.sesion.query(Reclamacion)
                .options(joinedload(Reclamacion.reclamante))
                .filter(Reclamacion.id_reporte == id_reporte)
                .order_by(Reclamacion.creado_en.desc()).all())

    def obtener_mis_reclamaciones(self, id_reclamante: int) -> List[Reclamacion]:
        return (self.sesion.query(Reclamacion)
                .filter(Reclamacion.id_reclamante == id_reclamante)
                .order_by(Reclamacion.creado_en.desc()).all())

    def obtener_pendientes(self) -> List[Reclamacion]:
        from backend.modelos.reporte import Reporte
        from backend.modelos.usuario import Usuario
        return (self.sesion.query(Reclamacion)
                .options(
                    joinedload(Reclamacion.reclamante),
                    joinedload(Reclamacion.reporte).joinedload(Reporte.reportante),
                )
                .filter(Reclamacion.estado == EstadoReclamacion.PENDIENTE)
                .order_by(Reclamacion.creado_en.asc()).all())

    def obtener_aprobadas(self) -> List[Reclamacion]:
        from backend.modelos.reporte import Reporte
        from backend.modelos.usuario import Usuario
        return (self.sesion.query(Reclamacion)
                .options(
                    joinedload(Reclamacion.reclamante),
                    joinedload(Reclamacion.reporte).joinedload(Reporte.reportante),
                )
                .filter(Reclamacion.estado == EstadoReclamacion.APROBADA)
                .order_by(Reclamacion.revisado_en.desc()).all())

    def ya_reclamo(self, id_reporte: int, id_usuario: int) -> bool:
        return (self.sesion.query(Reclamacion)
                .filter(Reclamacion.id_reporte == id_reporte,
                        Reclamacion.id_reclamante == id_usuario)
                .first()) is not None
