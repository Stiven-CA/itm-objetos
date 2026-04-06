# backend/servicios/moderacion_ia.py
"""
Servicio de moderación con IA (Anthropic API).
Principio SOLID — Responsabilidad Única: solo modera contenido.
Se activa fuera del horario de atención del administrador.
"""
import os
import json
import urllib.request
from datetime import datetime, timezone, timedelta


# Zona horaria Colombia (UTC-5)
ZONA_COLOMBIA = timezone(timedelta(hours=-5))

# Horario de atención del administrador
HORARIO_ADMIN = {
    0: [(7, 30, 12, 30), (13, 30, 17, 30)],  # Lunes
    1: [(7, 30, 12, 30), (13, 30, 17, 30)],  # Martes
    2: [(7, 30, 12, 30), (13, 30, 17, 30)],  # Miércoles
    3: [(7, 30, 12, 30), (13, 30, 17, 30)],  # Jueves
    4: [(7, 30, 12, 30), (13, 30, 16, 30)],  # Viernes
    # Sábado (5) y Domingo (6): sin atención
}


def admin_esta_disponible() -> bool:
    """Verifica si el administrador está en horario de atención."""
    ahora = datetime.now(ZONA_COLOMBIA)
    dia = ahora.weekday()  # 0=Lunes, 6=Domingo
    if dia not in HORARIO_ADMIN:
        return False
    minutos_actuales = ahora.hour * 60 + ahora.minute
    for inicio_h, inicio_m, fin_h, fin_m in HORARIO_ADMIN[dia]:
        if inicio_h * 60 + inicio_m <= minutos_actuales <= fin_h * 60 + fin_m:
            return True
    return False


def moderar_contenido_con_ia(titulo: str, descripcion: str) -> dict:
    """
    Usa la API de Anthropic para verificar que el contenido sea apropiado
    para publicarse sin revisión del administrador.
    Retorna: {"aprobado": bool, "razon": str}
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        # Sin clave API, aprobar por defecto
        return {"aprobado": True, "razon": "Moderación automática no configurada — aprobado por defecto"}

    prompt = f"""Eres un moderador de contenido para una plataforma universitaria de objetos perdidos y encontrados.

Evalúa si el siguiente reporte es apropiado para publicarse sin revisión humana.

Título: {titulo}
Descripción: {descripcion}

Criterios de RECHAZO:
- Contenido ofensivo, vulgar o inapropiado
- Información personal sensible (contraseñas, datos bancarios)
- Contenido que no sea un objeto perdido o encontrado
- Intento de estafa o spam
- Lenguaje discriminatorio

Responde ÚNICAMENTE con JSON válido:
{{"aprobado": true/false, "razon": "explicacion breve en español"}}"""

    cuerpo = json.dumps({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 150,
        "messages": [{"role": "user", "content": prompt}]
    }).encode("utf-8")

    solicitud = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=cuerpo,
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(solicitud, timeout=10) as resp:
            datos = json.loads(resp.read().decode("utf-8"))
            texto = datos["content"][0]["text"].strip()
            # Limpiar posibles markdown backticks
            texto = texto.replace("```json", "").replace("```", "").strip()
            return json.loads(texto)
    except Exception as e:
        # Si la IA falla, aprobar por defecto para no bloquear publicaciones
        return {"aprobado": True, "razon": f"Moderación IA no disponible — aprobado automáticamente"}


def decidir_aprobacion(titulo: str, descripcion: str) -> tuple[bool, str]:
    """
    Decide si un reporte se aprueba automáticamente o requiere revisión.
    Retorna: (aprobado: bool, razon: str)
    """
    if admin_esta_disponible():
        # Dentro del horario: queda pendiente para el admin
        return False, "Pendiente de revisión por el administrador"
    else:
        # Fuera del horario: la IA modera el contenido
        resultado = moderar_contenido_con_ia(titulo, descripcion)
        aprobado = resultado.get("aprobado", True)
        razon = resultado.get("razon", "Moderado automáticamente por IA")
        return aprobado, razon
