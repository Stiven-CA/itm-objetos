# principal.py
"""
Punto de entrada de la aplicación FastAPI.
Principio SOLID — Abierto/Cerrado:
  nuevos enrutadores se agregan sin modificar este archivo.
Patrón Fachada: expone una interfaz unificada al sistema.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.configuracion import obtener_configuracion
from backend.base_datos import motor, Base
import backend.modelos  # Registrar modelos para crear tablas
from backend.enrutadores import auth, reportes, reclamaciones, notificaciones, admin, chat

cfg = obtener_configuracion()

# Crear todas las tablas en la base de datos
Base.metadata.create_all(bind=motor)

# Crear carpetas de archivos
os.makedirs(os.path.join(cfg.CARPETA_UPLOADS, "reportes"), exist_ok=True)
os.makedirs(os.path.join(cfg.CARPETA_UPLOADS, "evidencias"), exist_ok=True)

app = FastAPI(
    redirect_slashes=False,
    title=cfg.NOMBRE_APP,
    version=cfg.VERSION,
    description="Sistema de gestión de objetos perdidos y encontrados — ITM",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar enrutadores con prefijo /api
app.include_router(auth.enrutador,           prefix="/api")
app.include_router(reportes.enrutador,       prefix="/api")
app.include_router(reclamaciones.enrutador,  prefix="/api")
app.include_router(notificaciones.enrutador, prefix="/api")
app.include_router(admin.enrutador,          prefix="/api")
app.include_router(chat.enrutador,           prefix="/api")

# Archivos estáticos
app.mount("/uploads", StaticFiles(directory=cfg.CARPETA_UPLOADS), name="uploads")
app.mount("/static",  StaticFiles(directory="frontend"), name="static")


@app.get("/api/estado", tags=["Sistema"])
def verificar_estado():
    """Verifica que el servidor esté en línea."""
    return {"estado": "en línea", "aplicacion": cfg.NOMBRE_APP, "version": cfg.VERSION}


@app.get("/", include_in_schema=False)
@app.get("/{ruta:path}", include_in_schema=False)
async def servir_frontend(ruta: str = ""):
    """Sirve el frontend SPA para todas las rutas no-API."""
    archivo = os.path.join("frontend", "index.html")
    if os.path.exists(archivo):
        return FileResponse(archivo)
    return {"error": "Frontend no encontrado"}
