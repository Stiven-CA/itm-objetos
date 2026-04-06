/**
 * interfaz.js — Utilidades de interfaz de usuario.
 * Principio SOLID — Responsabilidad Única: solo construye elementos visuales.
 */

// ── Toasts ────────────────────────────────────────────────
let contenedorToasts = null;

function obtenerContenedorToasts() {
  if (!contenedorToasts) {
    contenedorToasts = document.createElement('div');
    contenedorToasts.className = 'contenedor-toasts';
    document.body.appendChild(contenedorToasts);
  }
  return contenedorToasts;
}

export function mostrarToast(mensaje, tipo = 'info', duracion = 3500) {
  const contenedor = obtenerContenedorToasts();
  const toast = document.createElement('div');
  toast.className = `toast ${tipo === 'success' ? 'exito' : tipo === 'error' ? 'error' : 'info'}`;
  const iconos = { success: '✓', error: '✗', info: 'ℹ' };
  toast.innerHTML = `<span>${iconos[tipo] || iconos.info}</span><span>${mensaje}</span>`;
  contenedor.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = '300ms ease';
    setTimeout(() => toast.remove(), 300);
  }, duracion);
}

// ── Modal genérico ────────────────────────────────────────
export function crearModal({ titulo, contenido, pie = '', tamano = '' }) {
  const fondo = document.createElement('div');
  fondo.className = 'fondo-modal';
  fondo.innerHTML = `
    <div class="ventana-modal ${tamano}">
      <div class="encabezado-modal">
        <h3 class="titulo-modal">${titulo}</h3>
        <button class="btn-cerrar-modal" aria-label="Cerrar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="cuerpo-modal">
        ${contenido}
        ${pie ? `<div class="pie-modal">${pie}</div>` : ''}
      </div>
    </div>
  `;
  const cerrar = () => { fondo.style.opacity = '0'; setTimeout(() => fondo.remove(), 200); };
  fondo.querySelector('.btn-cerrar-modal').addEventListener('click', cerrar);
  fondo.addEventListener('click', (e) => { if (e.target === fondo) cerrar(); });
  document.body.appendChild(fondo);
  return { fondo, cerrar };
}

// ── Confirmación ──────────────────────────────────────────
export function mostrarConfirmacion(mensaje, alAceptar, alCancelar = null) {
  const { cerrar } = crearModal({
    titulo: '¿Estás seguro?',
    contenido: `<p style="color:var(--gris-texto)">${mensaje}</p>`,
    pie: `<button class="btn btn-contorno" id="btnCancelarConf">Cancelar</button>
          <button class="btn btn-peligro" id="btnAceptarConf">Confirmar</button>`,
  });
  setTimeout(() => {
    document.getElementById('btnCancelarConf')?.addEventListener('click', () => { cerrar(); alCancelar?.(); });
    document.getElementById('btnAceptarConf')?.addEventListener('click', () => { cerrar(); alAceptar(); });
  }, 50);
}

// ── Insignias de estado ───────────────────────────────────
const ETIQUETAS_ESTADO = {
  perdido:               { texto: '❌ Perdido',               clase: 'insignia-perdido' },
  encontrado:            { texto: '✅ Encontrado',            clase: 'insignia-encontrado' },
  pendiente_reclamacion: { texto: '⏳ Pend. reclamación',     clase: 'insignia-reclamado' },
  reclamado:             { texto: '📋 Reclamado',             clase: 'insignia-reclamado' },
  entregado:             { texto: '📦 Entregado',             clase: 'insignia-entregado' },
  cancelado:             { texto: '🚫 Cancelado',             clase: 'insignia-cancelado' },
};

export function insigniaEstado(estado) {
  const s = ETIQUETAS_ESTADO[estado] || { texto: estado, clase: '' };
  return `<span class="insignia ${s.clase}">${s.texto}</span>`;
}

// ── Etiquetas de categoría ────────────────────────────────
const NOMBRES_CATEGORIA = {
  electronico: 'Electrónico', documento: 'Documento', accesorio: 'Accesorio',
  ropa: 'Ropa', maleta: 'Maleta/Mochila', llaves: 'Llaves',
  gafas: 'Gafas', joyeria: 'Joyería', libro: 'Libro/Cuaderno', otro: 'Otro',
};

export function nombreCategoria(categoria) {
  return NOMBRES_CATEGORIA[categoria] || categoria;
}

// ── Icono por categoría ───────────────────────────────────
export function iconoCategoria(categoria) {
  const iconos = {
    electronico: '📱', documento: '📄', accesorio: '👜', ropa: '👕',
    maleta: '🎒', llaves: '🔑', gafas: '👓', joyeria: '💍', libro: '📚', otro: '📦',
  };
  return iconos[categoria] || '📦';
}

// ── Tiempo relativo ───────────────────────────────────────
export function tiempoRelativo(fechaStr) {
  const diff = (Date.now() - new Date(fechaStr).getTime()) / 1000;
  if (diff < 60)    return 'Hace un momento';
  if (diff < 3600)  return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `Hace ${Math.floor(diff / 86400)} días`;
  return new Date(fechaStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatearFecha(fechaStr) {
  if (!fechaStr) return '—';
  return new Date(fechaStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ── Iniciales del nombre ──────────────────────────────────
export function iniciales(nombre = '') {
  return nombre.split(' ').slice(0, 2).map(p => p[0] || '').join('').toUpperCase();
}

// ── Botón con estado de carga ─────────────────────────────
export function botonCargando(boton, cargando) {
  if (cargando) {
    boton.dataset.textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.innerHTML = `<span class="girador" style="width:16px;height:16px;border-width:2px;margin:0"></span>`;
  } else {
    boton.disabled = false;
    boton.textContent = boton.dataset.textoOriginal || boton.textContent;
  }
}
