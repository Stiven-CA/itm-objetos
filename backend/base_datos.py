# backend/base_datos.py
from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from backend.configuracion import obtener_configuracion

configuracion = obtener_configuracion()

motor = create_engine(
    configuracion.URL_BASE_DATOS,
    connect_args={"check_same_thread": False},
    echo=configuracion.MODO_DEBUG,
)

@event.listens_for(motor, "connect")
def activar_claves_foraneas(conexion, registro):
    cursor = conexion.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

FabricaSesion = sessionmaker(autocommit=False, autoflush=False, bind=motor)
Base = declarative_base()


def _migrar():
    """
    Migración segura al arrancar:
    - Recrea la tabla 'reportes' solo si tiene CHECK viejo o le falta PRIMARY KEY
    - Agrega columna cedula_reclamante a reclamaciones si no existe
    """
    COLS = (
        "id, tipo_reporte, titulo, categoria, descripcion, ubicacion, sede, "
        "lugar_especifico, ruta_imagen, estado, punto_custodia, aprobado, "
        "motivo_rechazo, fecha_ocurrencia, hora_ocurrencia, creado_en, "
        "actualizado_en, id_reportante, id_aprobado_por"
    )
    DDL_REPORTES = """
        CREATE TABLE _rep_nuevo (
            id INTEGER NOT NULL,
            tipo_reporte VARCHAR(10) NOT NULL,
            titulo VARCHAR(200) NOT NULL,
            categoria VARCHAR(10) NOT NULL,
            descripcion TEXT NOT NULL,
            ubicacion VARCHAR(300) NOT NULL,
            sede VARCHAR(30),
            lugar_especifico VARCHAR(200),
            ruta_imagen VARCHAR(500),
            estado VARCHAR(50) NOT NULL,
            punto_custodia VARCHAR(300),
            aprobado BOOLEAN,
            motivo_rechazo TEXT,
            fecha_ocurrencia DATETIME,
            hora_ocurrencia VARCHAR(10),
            creado_en DATETIME,
            actualizado_en DATETIME,
            id_reportante INTEGER NOT NULL,
            id_aprobado_por INTEGER,
            PRIMARY KEY (id),
            FOREIGN KEY(id_reportante) REFERENCES usuarios (id),
            FOREIGN KEY(id_aprobado_por) REFERENCES usuarios (id)
        )
    """
    with motor.connect() as con:
        # Ver si existe la tabla reportes
        fila = con.execute(
            text("SELECT sql FROM sqlite_master WHERE type='table' AND name='reportes'")
        ).fetchone()

        if fila:
            sql_actual = fila[0] or ""
            necesita_recrear = (
                "PRIMARY KEY" not in sql_actual
                or ("CHECK" in sql_actual and "en_revision" not in sql_actual and "estado" in sql_actual)
            )
            if necesita_recrear:
                try:
                    con.execute(text("PRAGMA foreign_keys = OFF"))
                    con.execute(text(f"DROP TABLE IF EXISTS _rep_nuevo"))
                    con.execute(text(DDL_REPORTES))
                    con.execute(text(f"INSERT INTO _rep_nuevo ({COLS}) SELECT {COLS} FROM reportes"))
                    con.execute(text("DROP TABLE reportes"))
                    con.execute(text("ALTER TABLE _rep_nuevo RENAME TO reportes"))
                    con.execute(text("PRAGMA foreign_keys = ON"))
                    con.commit()
                except Exception as e:
                    print(f"[migración reportes] {e}")
                    try:
                        con.execute(text("PRAGMA foreign_keys = ON"))
                        con.rollback()
                    except Exception:
                        pass

        # Agregar cedula_reclamante si no existe
        try:
            con.execute(text(
                "ALTER TABLE reclamaciones ADD COLUMN cedula_reclamante VARCHAR(50)"
            ))
            con.commit()
        except Exception:
            pass  # ya existe


_migrar()


def obtener_sesion():
    sesion = FabricaSesion()
    try:
        yield sesion
    finally:
        sesion.close()
