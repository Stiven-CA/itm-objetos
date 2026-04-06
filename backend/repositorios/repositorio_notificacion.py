# backend/repositorios/repositorio_notificacion.py
from typing import List
from sqlalchemy.orm import Session
from backend.modelos.notificacion import Notificacion, TipoNotificacion
from backend.repositorios.base import RepositorioBase


class RepositorioNotificacion(RepositorioBase[Notificacion]):

    def __init__(self, sesion: Session):
        super().__init__(Notificacion, sesion)

    def obtener_del_usuario(self, id_usuario: int, saltar=0, limite=50) -> List[Notificacion]:
        return (self.sesion.query(Notificacion)
                .filter(Notificacion.id_usuario == id_usuario)
                .order_by(Notificacion.creado_en.desc())
                .offset(saltar).limit(limite).all())

    def contar_no_leidas(self, id_usuario: int) -> int:
        return (self.sesion.query(Notificacion)
                .filter(Notificacion.id_usuario == id_usuario,
                        Notificacion.leida == False).count())

    def marcar_todas_leidas(self, id_usuario: int) -> int:
        cantidad = (self.sesion.query(Notificacion)
                    .filter(Notificacion.id_usuario == id_usuario,
                            Notificacion.leida == False)
                    .update({"leida": True}))
        self.sesion.commit()
        return cantidad

    def marcar_leida(self, id_notificacion: int, id_usuario: int) -> bool:
        notif = (self.sesion.query(Notificacion)
                 .filter(Notificacion.id == id_notificacion,
                         Notificacion.id_usuario == id_usuario).first())
        if notif:
            notif.leida = True
            self.sesion.commit()
            return True
        return False

    def crear_notificacion(self, id_usuario: int, tipo: TipoNotificacion,
                           titulo: str, mensaje: str,
                           id_reporte=None, id_reclamo=None) -> Notificacion:
        nueva = Notificacion(
            id_usuario=id_usuario, tipo=tipo,
            titulo=titulo, mensaje=mensaje,
            id_reporte_rel=id_reporte, id_reclamo_rel=id_reclamo,
        )
        return self.crear(nueva)
