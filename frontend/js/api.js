/**
 * api.js — Capa de comunicación con el servidor.
 * Principio SOLID — Responsabilidad Única: solo gestiona peticiones HTTP.
 * Patrón Module: exporta objetos con métodos agrupados por entidad.
 */

const URL_API = '/api';

// ── Token de sesión ───────────────────────────────────────
const TokenSesion = {
  obtener: () => localStorage.getItem('itm_token'),
  guardar:  (t) => localStorage.setItem('itm_token', t),
  limpiar:  () => localStorage.removeItem('itm_token'),
};

// ── Datos del usuario en sesión ───────────────────────────
const AlmacenUsuario = {
  obtener: () => JSON.parse(localStorage.getItem('itm_usuario') || 'null'),
  guardar:  (u) => localStorage.setItem('itm_usuario', JSON.stringify(u)),
  limpiar:  () => localStorage.removeItem('itm_usuario'),
};

// ── Petición HTTP base ────────────────────────────────────
async function peticion(metodo, ruta, cuerpo = null, esFormulario = false) {
  const encabezados = {};
  const token = TokenSesion.obtener();
  if (token) encabezados['Authorization'] = `Bearer ${token}`;
  if (cuerpo && !esFormulario) encabezados['Content-Type'] = 'application/json';

  const respuesta = await fetch(`${URL_API}${ruta}`, {
    method: metodo,
    headers: encabezados,
    body: cuerpo ? (esFormulario ? cuerpo : JSON.stringify(cuerpo)) : undefined,
  });

  if (respuesta.status === 401) {
    TokenSesion.limpiar();
    AlmacenUsuario.limpiar();
    window.location.hash = '#iniciar-sesion';
    throw new Error('Sesión expirada. Inicia sesión de nuevo.');
  }

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    const mensaje = typeof datos.detail === 'string'
      ? datos.detail
      : Array.isArray(datos.detail)
        ? datos.detail.map(e => e.msg).join(', ')
        : `Error ${respuesta.status}`;
    throw new Error(mensaje);
  }

  return datos;
}

// ── Autenticación ─────────────────────────────────────────
export const Autenticacion = {
  registrar:         (datos) => peticion('POST', '/auth/registrar', datos),
  iniciarSesion:     (datos) => peticion('POST', '/auth/iniciar-sesion', datos),
  obtenerPerfil:     ()      => peticion('GET',  '/auth/yo'),
  actualizarPerfil:  (datos) => peticion('PUT',  '/auth/yo', datos),
  cambiarContrasena: (datos) => peticion('POST', '/auth/cambiar-contrasena', datos),
};

// ── Reportes ──────────────────────────────────────────────
export const Reportes = {
  async listar(parametros = {}) {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(parametros).filter(([, v]) => v != null && v !== ''))
    ).toString();
    const resultado = await peticion('GET', `/reportes${qs ? '?' + qs : ''}`);
    return Array.isArray(resultado) ? resultado : [];
  },
  obtener:         (id)      => peticion('GET',    `/reportes/${id}`),
  misReportes:     ()        => peticion('GET',    '/reportes/mis-reportes'),
  pendientes:      ()        => peticion('GET',    '/reportes/pendientes'),
  historial:       (id)      => peticion('GET',    `/reportes/${id}/historial`),
  crear:     (fd)             => peticion('POST',   '/reportes', fd, true),
  actualizar:(id, fd)         => peticion('PUT',    `/reportes/${id}`, fd, true),
  cancelar:        (id)      => peticion('DELETE',  `/reportes/${id}`),
  revisar:         (id, d)   => peticion('POST',   `/reportes/${id}/revisar`, d),
  cambiarEstado:   (id, d)   => peticion('PUT',    `/reportes/${id}/estado`, d),
  eliminarForzado: (id)      => peticion('DELETE',  `/reportes/${id}/forzar`),
  adminEditar:     (id, fd)   => peticion('PUT',    `/reportes/admin/${id}`, fd, true),
};

// ── Reclamaciones ─────────────────────────────────────────
export const Reclamaciones = {
  enviar:      (idRep, fd)   => peticion('POST',  `/reclamaciones/reporte/${idRep}`, fd, true),
  mias:        ()            => peticion('GET',   '/reclamaciones/mias'),
  pendientes:  ()            => peticion('GET',   '/reclamaciones/pendientes'),
  delReporte:  (id)          => peticion('GET',   `/reclamaciones/reporte/${id}`),
  revisar:     (id, d)       => peticion('POST',  `/reclamaciones/${id}/revisar`, d),
  registrarEntrega: (id, d)  => peticion('POST',  `/reclamaciones/${id}/entregar`, d),
};

// ── Notificaciones ────────────────────────────────────────
export const Notificaciones = {
  listar:          (p = {}) => peticion('GET',  '/notificaciones?' + new URLSearchParams(p)),
  cantidadNoLeidas:()       => peticion('GET',  '/notificaciones/no-leidas'),
  marcarTodasLeidas:()      => peticion('POST', '/notificaciones/marcar-todas-leidas'),
  marcarLeida:     (id)     => peticion('POST', `/notificaciones/${id}/marcar-leida`),
};

// ── Administración ────────────────────────────────────────
export const Administracion = {
  listarUsuarios:    ()   => peticion('GET',  '/admin/usuarios'),
  buscarUsuarios:    (nombre) => peticion('GET',  `/admin/usuarios/buscar?nombre=${encodeURIComponent(nombre)}`),
  bloquearUsuario:   (id) => peticion('POST', `/admin/usuarios/${id}/bloquear`),
  desbloquearUsuario:(id) => peticion('POST', `/admin/usuarios/${id}/desbloquear`),
};

export { TokenSesion, AlmacenUsuario };
