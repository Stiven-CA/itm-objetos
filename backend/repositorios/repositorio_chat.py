# backend/repositorios/repositorio_chat.py
"""
Repositorio Chat — Patrón Repository.
Principio SOLID — S: solo acceso a datos de mensajes de chat.
"""
from typing import List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from backend.modelos.chat import MensajeChat
from backend.repositorios.base import RepositorioBase


class RepositorioChat(RepositorioBase[MensajeChat]):

    def __init__(self, sesion: Session):
        super().__init__(MensajeChat, sesion)

    def obtener_conversacion(self, id_reporte: int, id_usuario_a: int, id_usuario_b: int) -> List[MensajeChat]:
        """Obtiene todos los mensajes entre dos usuarios para un reporte específico."""
        return (
            self.sesion.query(MensajeChat)
            .options(joinedload(MensajeChat.emisor), joinedload(MensajeChat.receptor))
            .filter(
                MensajeChat.id_reporte == id_reporte,
                or_(
                    and_(MensajeChat.id_emisor == id_usuario_a, MensajeChat.id_receptor == id_usuario_b),
                    and_(MensajeChat.id_emisor == id_usuario_b, MensajeChat.id_receptor == id_usuario_a),
                ),
            )
            .order_by(MensajeChat.creado_en.asc())
            .all()
        )

    def marcar_leidos(self, id_reporte: int, id_receptor: int) -> int:
        """Marca como leídos todos los mensajes recibidos en una conversación."""
        cantidad = (
            self.sesion.query(MensajeChat)
            .filter(MensajeChat.id_reporte == id_reporte, MensajeChat.id_receptor == id_receptor, MensajeChat.leido == False)
            .update({"leido": True})
        )
        self.sesion.commit()
        return cantidad

    def contar_no_leidos(self, id_receptor: int) -> int:
        return (
            self.sesion.query(MensajeChat)
            .filter(MensajeChat.id_receptor == id_receptor, MensajeChat.leido == False)
            .count()
        )
