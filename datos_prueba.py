#!/usr/bin/env python3
"""
datos_prueba.py — Poblar la BD con datos iniciales para desarrollo.
Ejecutar una sola vez al configurar el proyecto.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from backend.base_datos import FabricaSesion, motor, Base
import backend.modelos

from backend.modelos.usuario import Usuario, RolUsuario
from backend.modelos.reporte import Reporte, EstadoObjeto, TipoReporte, CategoriaObjeto, SedeUniversitaria
from passlib.context import CryptContext

cifrado = CryptContext(schemes=["bcrypt"], deprecated="auto")
Base.metadata.create_all(bind=motor)
sesion = FabricaSesion()

print("=" * 55)
print("  Datos de prueba — Objetos Perdidos ITM")
print("=" * 55)

# ── Administrador ──────────────────────────────────────────
admin = sesion.query(Usuario).filter(Usuario.nombre_usuario == "admin").first()
if not admin:
    admin = Usuario(
        nombre_completo="Administrador ITM",
        correo="admin@correo.itm.edu.co",
        nombre_usuario="admin",
        contrasena_cifrada=cifrado.hash("admin1234"),
        rol=RolUsuario.ADMIN,
        verificado=True,
    )
    sesion.add(admin)
    sesion.commit()
    sesion.refresh(admin)
    print("✓ Admin creado  →  usuario: admin  |  contraseña: admin1234")
else:
    print("  Admin ya existe")

# ── Estudiante de prueba ───────────────────────────────────
estudiante = sesion.query(Usuario).filter(Usuario.nombre_usuario == "juan.perez").first()
if not estudiante:
    estudiante = Usuario(
        nombre_completo="Juan Pérez García",
        correo="juan.perez@correo.itm.edu.co",
        nombre_usuario="juan.perez",
        contrasena_cifrada=cifrado.hash("password123"),
        rol=RolUsuario.ESTUDIANTE,
        verificado=True,
    )
    sesion.add(estudiante)
    sesion.commit()
    sesion.refresh(estudiante)
    print("✓ Estudiante creado  →  usuario: juan.perez  |  contraseña: password123")
else:
    print("  Estudiante ya existe")

# ── Objetos de ejemplo ─────────────────────────────────────
if sesion.query(Reporte).count() == 0:
    objetos = [
        dict(tipo_reporte=TipoReporte.ENCONTRADO, titulo="Billetera negra de cuero",
             categoria=CategoriaObjeto.ACCESORIO, estado=EstadoObjeto.ENCONTRADO,
             descripcion="Billetera de cuero negro con cierre y documentos en el interior.",
             ubicacion="Cafetería principal", sede=SedeUniversitaria.ROBLEDO,
             lugar_especifico="Biblioteca, segundo piso",
             punto_custodia="Portería Bloque A", aprobado=True,
             id_reportante=admin.id, id_aprobado_por=admin.id),
        dict(tipo_reporte=TipoReporte.ENCONTRADO, titulo="Celular Samsung negro",
             categoria=CategoriaObjeto.ELECTRONICO, estado=EstadoObjeto.ENCONTRADO,
             descripcion="Celular negro con funda transparente. Grieta pequeña en esquina inferior.",
             ubicacion="Sede Robledo", sede=SedeUniversitaria.ROBLEDO,
             lugar_especifico="Cafetería", punto_custodia="Portería Bloque B",
             aprobado=True, id_reportante=admin.id, id_aprobado_por=admin.id),
        dict(tipo_reporte=TipoReporte.ENCONTRADO, titulo="Llaves con llavero rojo",
             categoria=CategoriaObjeto.LLAVES, estado=EstadoObjeto.ENCONTRADO,
             descripcion="Juego de 2 llaves con llavero rojo alargado.",
             ubicacion="Sede Fraternidad", sede=SedeUniversitaria.FRATERNIDAD,
             lugar_especifico="Cerca al laboratorio 305",
             punto_custodia="Portería Fraternidad", aprobado=True,
             id_reportante=estudiante.id, id_aprobado_por=admin.id),
        dict(tipo_reporte=TipoReporte.ENCONTRADO, titulo="Morral gris marca Totto",
             categoria=CategoriaObjeto.MALETA, estado=EstadoObjeto.ENCONTRADO,
             descripcion="Morral gris con detalles negros. Contiene un cuaderno y lapicero.",
             ubicacion="Sede Robledo", sede=SedeUniversitaria.ROBLEDO,
             lugar_especifico="Salón 204, bloque C",
             punto_custodia="Portería Bloque C", aprobado=True,
             id_reportante=admin.id, id_aprobado_por=admin.id),
        dict(tipo_reporte=TipoReporte.PERDIDO, titulo="Gafas de lectura café",
             categoria=CategoriaObjeto.GAFAS, estado=EstadoObjeto.PERDIDO,
             descripcion="Gafas con marco café oscuro. Las perdí el lunes en la biblioteca.",
             ubicacion="Biblioteca", sede=SedeUniversitaria.ROBLEDO,
             lugar_especifico="Sala de lectura silenciosa",
             aprobado=True, id_reportante=estudiante.id, id_aprobado_por=admin.id),
    ]
    for datos in objetos:
        sesion.add(Reporte(**datos))
    sesion.commit()
    print(f"✓ {len(objetos)} objetos de ejemplo creados")
else:
    print("  Los objetos de ejemplo ya existen")

# ── Usuarios adicionales ──────────────────────────────────
usuarios_extra = [
    ("María Fernanda Palacio", "maria.palacio@correo.itm.edu.co", "maria.palacio", "password123", RolUsuario.ESTUDIANTE),
    ("Stiven Cuesta Alzate",   "stiven.cuesta@correo.itm.edu.co",  "stiven.cuesta",  "password123", RolUsuario.PROFESOR),
]
for nombre, correo, usuario, pwd, rol in usuarios_extra:
    if not sesion.query(Usuario).filter(Usuario.nombre_usuario == usuario).first():
        sesion.add(Usuario(
            nombre_completo=nombre, correo=correo, nombre_usuario=usuario,
            contrasena_cifrada=cifrado.hash(pwd), rol=rol, verificado=True,
        ))
        print(f"✓ {nombre} creado  →  usuario: {usuario}  |  contraseña: {pwd}")
    else:
        print(f"  {usuario} ya existe")
sesion.commit()

sesion.close()
print("\n" + "=" * 55)
print("  ¡Listo! Ahora ejecuta:")
print("  py -m uvicorn principal:app --reload --port 8000")
print("  Abre: http://localhost:8000")
print("=" * 55)
