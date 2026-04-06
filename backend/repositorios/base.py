# backend/repositorios/base.py
"""
Repositorio Base Genérico — Patrón Repository.
Principio SOLID aplicado:
  S — Responsabilidad Única: solo acceso a datos
  O — Abierto/Cerrado: extensible sin modificar esta clase
  L — Sustitución de Liskov: todos los repositorios son intercambiables
  D — Inversión de dependencias: servicios dependen de esta abstracción
"""
from typing import Generic, TypeVar, Type, Optional, List
from sqlalchemy.orm import Session
from backend.base_datos import Base

TipoModelo = TypeVar("TipoModelo", bound=Base)


class RepositorioBase(Generic[TipoModelo]):
    """CRUD genérico. Todos los repositorios heredan de aquí."""

    def __init__(self, modelo: Type[TipoModelo], sesion: Session):
        self.modelo = modelo
        self.sesion = sesion

    def obtener_por_id(self, id: int) -> Optional[TipoModelo]:
        return self.sesion.query(self.modelo).filter(self.modelo.id == id).first()

    def obtener_todos(self, saltar: int = 0, limite: int = 100) -> List[TipoModelo]:
        return self.sesion.query(self.modelo).offset(saltar).limit(limite).all()

    def crear(self, objeto: TipoModelo) -> TipoModelo:
        self.sesion.add(objeto)
        self.sesion.commit()
        self.sesion.refresh(objeto)
        return objeto

    def actualizar(self, objeto: TipoModelo) -> TipoModelo:
        self.sesion.commit()
        self.sesion.refresh(objeto)
        return objeto

    def eliminar(self, objeto: TipoModelo) -> bool:
        self.sesion.delete(objeto)
        self.sesion.commit()
        return True

    def contar(self) -> int:
        return self.sesion.query(self.modelo).count()
