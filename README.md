#  Objetos Perdidos y Encontrados — ITM

Sistema web para reportar y reclamar objetos perdidos y encontrados en la Institución Universitaria ITM.

---

## Requisitos previos

Antes de ejecutar el proyecto asegúrate de tener instalado:

- **Python 3.10 o superior** → [https://www.python.org/downloads/](https://www.python.org/downloads/)
  -  Durante la instalación marca la opción **"Add Python to PATH"**
- **pip** (viene incluido con Python)

---

##  Estructura del proyecto

```
itm-objetos/
├── backend/          ← Lógica del servidor (FastAPI)
├── frontend/         ← Interfaz web (HTML, CSS, JS)
├── uploads/          ← Imágenes subidas por usuarios
├── principal.py      ← Punto de entrada del servidor
├── datos_prueba.py   ← Script para cargar datos iniciales
└── requirements.txt  ← Dependencias del proyecto
```

---

##  Pasos para ejecutar

### 1. Abre una terminal en la carpeta del proyecto

Navega hasta la carpeta `itm-objetos` donde está el proyecto:

```bash
cd ruta/a/itm-objetos
```

---

### 2. Crea y activa el entorno virtual

**Windows:**
```bash
python -m venv .venv
.venv\Scripts\activate
```

**Mac / Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

> Cuando el entorno esté activo verás `(.venv)` al inicio de la línea en la terminal.

---

### 3. Instala las dependencias

```bash
pip install -r requirements.txt
```

---

### 4. Carga los datos de prueba

> ⚠️ **Ejecuta esto solo una vez.** Si lo corres de nuevo no pasa nada, pero no es necesario.

**Windows:**
```bash
py datos_prueba.py
```

**Mac / Linux:**
```bash
python3 datos_prueba.py
```

Deberías ver algo así en la terminal:

```
=======================================================
  Datos de prueba — Objetos Perdidos ITM
=======================================================
✓ Admin creado  →  usuario: admin  |  contraseña: admin1234
✓ Estudiante creado  →  usuario: juan.perez  |  contraseña: password123
✓ 5 objetos de ejemplo creados
...
=======================================================
  ¡Listo! Ahora ejecuta el servidor
=======================================================
```

---

### 5. Inicia el servidor

**Windows:**
```bash
 uvicorn principal:app --reload --port 8000
```

**Mac / Linux:**
```bash
python3 -m uvicorn principal:app --reload --port 8000
```

---

### 6. Abre la aplicación en el navegador

```
http://localhost:8000
```

---

## 👤 Usuarios de prueba

| Rol | Usuario | Contraseña |
|---|---|---|
| 🔴 Administrador | `admin` | `admin1234` |
| 🟢 Estudiante | `juan.perez` | `password123` |
| 🟡 Estudiante | `maria.palacio` | `password123` |
| 🟡 Profesor | `stiven.cuesta` | `password123` |

> 💡 El usuario administrador puede aprobar reportes, gestionar reclamaciones, revisar usuarios y más.

---

##  ¿Cómo se escribe el usuario?

El usuario es el correo institucional **sin** `@correo.itm.edu.co`.

**Ejemplo:**
- Correo: `juan.perez@correo.itm.edu.co`
- Usuario: `juan.perez`

---

##  Solución de problemas comunes

**❌ Error: `'py' is not recognized`**
→ Usa `python` o `python3` en lugar de `py`.

**❌ Error: `ModuleNotFoundError`**
→ Asegúrate de haber activado el entorno virtual (paso 2) y de haber instalado las dependencias (paso 3).

**❌ Puerto 8000 ocupado**
→ Cambia el puerto en el comando:
```bash
py -m uvicorn principal:app --reload --port 8080
```
Y abre `http://localhost:8080` en el navegador.

** La página no carga**
→ Verifica que la terminal muestre `Application startup complete` antes de abrir el navegador.

---

## 📌 Notas adicionales

- La base de datos se crea automáticamente como `objetos_perdidos.db` en la carpeta del proyecto.
- Las imágenes subidas se guardan en la carpeta `uploads/`.
- El servidor se reinicia automáticamente con `--reload` cuando detecta cambios en el código.
- Para detener el servidor presiona `Ctrl + C` en la terminal.
