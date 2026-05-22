/**
 * aplicacion.js — SPA principal ITM Objetos Perdidos y Encontrados
 * Patrón Module + Observer (hash routing)
 */
import { TokenSesion, AlmacenUsuario, Autenticacion, Reportes, Reclamaciones, Notificaciones, Administracion } from './api.js';
import { mostrarToast, crearModal, mostrarConfirmacion, insigniaEstado, nombreCategoria, iconoCategoria, tiempoRelativo, formatearFecha, iniciales, botonCargando } from './interfaz.js';

/* ── Estado global ─────────────────────────────────── */
const estado = {
  usuario: AlmacenUsuario.obtener(),
  filtros: { tipo_reporte: '', categoria: '', sede: '', busqueda: '' },
  vista: 'inicio',
  intervaloNotif: null,
};

/* ── Navegación ────────────────────────────────────── */
function navegar(vista, params = {}) {
  document.querySelectorAll('.fondo-modal').forEach(m => m.remove());
  document.getElementById('sbOverlay')?.remove();
  document.getElementById('sidebar')?.classList.remove('abierta');
  estado.vista = vista;
  Object.assign(estado.filtros, params);
  renderApp();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ═══════════════════════════════════════════════════
   RENDER PRINCIPAL
═══════════════════════════════════════════════════ */
function renderApp() {
  const vista = estado.vista || 'inicio';
  const protegidas = ['mis-reportes','notificaciones','preferencias-notificacion',
    'admin-reportes','admin-reclamaciones','admin-reclamos','admin-usuarios'];

  if (protegidas.includes(vista) && !estado.usuario) {
    window.location.hash = '#iniciar-sesion'; return;
  }
  if (vista === 'iniciar-sesion' || vista === 'registrarse') {
    renderAuth(vista); return;
  }

  /* Layout principal con sidebar fijo */
  document.getElementById('aplicacion').innerHTML = `
    <div class="layout-app">
      <aside class="sidebar" id="sidebar"></aside>
      <div class="area-main">
        <header class="header" id="header"></header>
        <div class="barra-filtros" id="barraFiltros"></div>
        <main class="pagina" id="pagina" style="flex:1"></main>
        <footer class="footer" id="pie"></footer>
      </div>
    </div>
  `;

  renderSidebar();
  renderHeader();
  if (estado.usuario) actualizarBadgeNotif();
  renderFiltros();
  renderBusqueda();
  renderFooter();

  /* FAB reportar */
  document.querySelectorAll('.btn-fab,.fab-menu').forEach(b => { b._removeHandler?.(); b.remove(); });
  document.querySelectorAll('.fondo-modal').forEach(m => m.remove());
  document.getElementById('sbOverlay')?.remove();
  document.getElementById('sidebar')?.classList.remove('abierta');
  if (estado.usuario) {
    const fab = document.createElement('div');
    fab.className = 'btn-fab';
    fab.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14m-7-7h14"/></svg>`;
    const menu = document.createElement('div');
    menu.className = 'fab-menu oculto';
    menu.innerHTML = `
      <button class="fab-opcion fab-encontrado" id="fabEnc">✅ Registrar encontrado</button>
      <button class="fab-opcion fab-perdido"    id="fabPer">❌ Reportar perdido</button>`;
    fab.addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('oculto'); });
    document.addEventListener('click', () => menu.classList.add('oculto'));
    document.body.append(menu, fab);
    setTimeout(() => {
      document.getElementById('fabEnc')?.addEventListener('click', e => { e.stopPropagation(); menu.classList.add('oculto'); abrirModalReporte('encontrado'); });
      document.getElementById('fabPer')?.addEventListener('click', e => { e.stopPropagation(); menu.classList.add('oculto'); abrirModalReporte('perdido'); });
    }, 50);
  }

  const pagina = document.getElementById('pagina');
  switch (vista) {
    case 'inicio':
    case 'encontrados':
    case 'perdidos':
      if (vista === 'encontrados') estado.filtros.tipo_reporte = 'encontrado';
      if (vista === 'perdidos')    estado.filtros.tipo_reporte = 'perdido';
      renderInicio(pagina); break;
    case 'mis-reportes':               renderMisReportes(pagina);               break;
    case 'notificaciones':             renderNotificaciones(pagina);            break;
    case 'preferencias-notificacion':  renderPreferencias(pagina);              break;
    case 'admin-reportes':             renderAdminReportes(pagina);             break;
    case 'admin-reclamaciones':        renderAdminReclamaciones(pagina);        break;
    case 'admin-reclamos':             renderAdminReclamos(pagina);             break;
    case 'admin-usuarios':             renderAdminUsuarios(pagina);             break;
    default: navegar('inicio');
  }
  if (estado.usuario) iniciarPolling();
}

/* ═══════════════════════════════════════════════════
   SIDEBAR
═══════════════════════════════════════════════════ */
function renderSidebar() {
  const el = document.getElementById('sidebar');
  if (!el) return;
  const u = estado.usuario;
  const v = estado.vista;

  const icono = n => ({
    home:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    search:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`,
    package:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></svg>`,
    file:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    bell:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
    settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    check:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    lock:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    users:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    logout:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>`,
    person:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`,
  })[n] || '';

  const nav = [
    { id:'inicio',                    ic:'home',     label:'Inicio' },
    { id:'perdidos',                  ic:'search',   label:'Objetos perdidos' },
    { id:'encontrados',               ic:'package',  label:'Objetos encontrados' },
    ...(u ? [
      { id:'mis-reportes',              ic:'file',     label:'Mis reportes' },
      { id:'notificaciones',            ic:'bell',     label:'Notificaciones' },
      { id:'preferencias-notificacion', ic:'settings', label:'Preferencias de notificación' },
    ] : []),
    ...(u?.rol === 'admin' ? [
      { id:'admin-reportes',       ic:'check',  label:'Gestión de reportes' },
      { id:'admin-reclamaciones',  ic:'lock',   label:'Reclamaciones' },
      { id:'admin-reclamos',       ic:'package', label:'Reclamos' },
      { id:'admin-usuarios',       ic:'users',  label:'Usuarios' },
    ] : []),
  ];

  el.innerHTML = `
    ${u ? `
    <div class="sidebar-perfil">
      <div class="sidebar-avatar">${icono('person')}</div>
      <div class="sidebar-nombre">${u.nombre_completo}</div>
      <div class="sidebar-correo">${u.correo}</div>
    </div>` : `
    <div class="sidebar-perfil">
      <div style="font-size:1.5rem;font-weight:800;color:#fff;font-style:italic;letter-spacing:-.04em;line-height:1">ITM</div>
      <div style="font-size:.66rem;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.04em;margin-top:.15rem">Institución Universitaria</div>
    </div>`}
    <nav class="sidebar-nav">
      ${nav.map(item => `
        <div class="sidebar-item ${item.id === v ? 'activo' : ''}" data-vista="${item.id}">
          ${icono(item.ic)} ${item.label}
        </div>`).join('')}
    </nav>
    ${u ? `
    <div class="sidebar-pie">
      <button class="sidebar-cerrar" id="btnCerrarSidebar">
        ${icono('logout')} Cerrar sesión
      </button>
    </div>` : ''}
  `;

  el.querySelectorAll('.sidebar-item[data-vista]').forEach(i => {
    i.addEventListener('click', () => {
      document.getElementById('sbOverlay')?.remove();
      document.getElementById('sidebar')?.classList.remove('abierta');
      estado.filtros = { tipo_reporte:'', categoria:'', sede:'', busqueda:'' };
      navegar(i.dataset.vista);
    });
  });
  document.getElementById('btnCerrarSidebar')?.addEventListener('click', cerrarSesion);
}

/* ═══════════════════════════════════════════════════
   HEADER
═══════════════════════════════════════════════════ */
function renderHeader() {
  const el = document.getElementById('header');
  if (!el) return;
  const u = estado.usuario;

  el.innerHTML = `
    <div class="header-izq">
      <button class="btn-menu-movil" id="btnMenuMovil">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/>
        </svg>
      </button>
      <div class="header-logo">
        <div class="header-logo-itm">
          <span class="itm-texto">ITM</span>
          <span class="itm-sub">Institución Universitaria</span>
        </div>
      </div>
      <div class="header-sep"></div>
      <span class="header-titulo">Objetos Perdidos y Encontrados</span>
    </div>
    <div class="header-der">
      <button class="header-btn-icon" id="btnBuscarHeader">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
      </button>
      ${u ? `
      <div style="position:relative">
        <button class="header-btn-icon" id="btnNotifHeader">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
          </svg>
          <span class="notif-badge oculto" id="globoNotif">0</span>
        </button>
      </div>
      <div style="position:relative">
        <button class="header-avatar" id="btnMenuUsuario">${u.nombre_completo.split(' ')[0]}</button>
        <div class="dropdown oculto" id="menuUsuario">
          <div style="padding:.7rem 1rem .5rem;border-bottom:1px solid var(--border)">
            <div style="font-weight:600;font-size:.855rem">${u.nombre_completo}</div>
            <div style="font-size:.74rem;color:var(--text3)">${u.correo}</div>
          </div>
          <div class="dropdown-item" id="ddMisReportes"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Mis reportes</div>
          <div class="dropdown-item" id="ddNotif"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>Notificaciones</div>
          ${u.rol === 'admin' ? `
          <div class="dropdown-sep"></div>
          <div class="dropdown-item" id="ddAdminRep"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>Todos los reportes</div>
          <div class="dropdown-item" id="ddAdminRec"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Reclamaciones</div>
          <div class="dropdown-item" id="ddAdminReclamos"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></svg>Reclamos</div>
          <div class="dropdown-item" id="ddAdminUsr"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>Usuarios</div>` : ''}
          <div class="dropdown-sep"></div>
          <div class="dropdown-item danger" id="ddCerrar"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>Cerrar sesión</div>
        </div>
      </div>` : `
      <a href="#iniciar-sesion" class="btn btn-purple btn-sm">Iniciar sesión</a>`}
    </div>
  `;

  document.getElementById('btnMenuMovil')?.addEventListener('click', toggleSidebar);
  document.getElementById('btnBuscarHeader')?.addEventListener('click', () => document.getElementById('campoBusqueda')?.focus());
  document.getElementById('btnNotifHeader')?.addEventListener('click', e => { e.stopPropagation(); abrirPanelNotif(e); });

  const dd = document.getElementById('menuUsuario');
  document.getElementById('btnMenuUsuario')?.addEventListener('click', e => { e.stopPropagation(); dd?.classList.toggle('oculto'); });
  document.addEventListener('click', () => dd?.classList.add('oculto'));

  document.getElementById('ddCerrar')?.addEventListener('click', cerrarSesion);
  document.getElementById('ddMisReportes')?.addEventListener('click', () => { dd?.classList.add('oculto'); navegar('mis-reportes'); });
  document.getElementById('ddNotif')?.addEventListener('click', () => { dd?.classList.add('oculto'); navegar('notificaciones'); });
  document.getElementById('ddAdminRep')?.addEventListener('click', () => navegar('admin-reportes'));
  document.getElementById('ddAdminRec')?.addEventListener('click', () => navegar('admin-reclamaciones'));
  document.getElementById('ddAdminReclamos')?.addEventListener('click', () => navegar('admin-reclamos'));
  document.getElementById('ddAdminUsr')?.addEventListener('click', () => navegar('admin-usuarios'));
}

/* ═══════════════════════════════════════════════════
   FILTROS
═══════════════════════════════════════════════════ */
function renderFiltros() {
  const el = document.getElementById('barraFiltros');
  if (!el) return;
  const f = estado.filtros;
  el.innerHTML = `
    <div class="filtros-row">
      <button class="tab-filtro ${!f.tipo_reporte ? 'activo':''}" data-tipo="">Todos</button>
      <button class="tab-filtro ${f.tipo_reporte==='encontrado'?'activo':''}" data-tipo="encontrado">Encontrados</button>
      <button class="tab-filtro ${f.tipo_reporte==='perdido'?'activo':''}" data-tipo="perdido">Perdidos</button>
      <div class="sep-filtro"></div>
      <select class="select-filtro" id="filtroCategoria">
        <option value="">Todas las categorías</option>
        <option value="electronico">Electrónico</option>
        <option value="documento">Documento</option>
        <option value="accesorio">Accesorio</option>
        <option value="ropa">Ropa</option>
        <option value="maleta">Maleta/Mochila</option>
        <option value="llaves">Llaves</option>
        <option value="gafas">Gafas</option>
        <option value="libro">Libros</option>
        <option value="otro">Otro</option>
      </select>
      <select class="select-filtro" id="filtroSede">
        <option value="">Todas las sedes</option>
        <option value="Sede Robledo">Sede Robledo</option>
        <option value="Sede Fraternidad">Sede Fraternidad</option>
        <option value="Sede Floresta">Sede Floresta</option>
        <option value="Sede Prado">Sede Prado</option>
        <option value="Sede Castilla">Sede Castilla</option>
      </select>
      <input type="search" id="campoBusqueda" placeholder="Buscar objeto..."
        style="padding:.3rem .75rem;border:1px solid var(--border);border-radius:var(--radius-full);font-size:.79rem;outline:none;transition:border-color .15s"
        value="${f.busqueda || ''}"
        onfocus="this.style.borderColor='var(--purple)'" onblur="this.style.borderColor='var(--border)'">
    </div>`;

  const selCat  = document.getElementById('filtroCategoria');
  const selSede = document.getElementById('filtroSede');
  if (selCat  && f.categoria) selCat.value  = f.categoria;
  if (selSede && f.sede)      selSede.value = f.sede;

  el.querySelectorAll('.tab-filtro').forEach(t => {
    t.addEventListener('click', () => { estado.filtros.tipo_reporte = t.dataset.tipo || ''; estado.vista = 'inicio'; renderApp(); });
  });
  selCat?.addEventListener('change',  e => { estado.filtros.categoria = e.target.value; estado.vista = 'inicio'; renderApp(); });
  selSede?.addEventListener('change', e => { estado.filtros.sede      = e.target.value; estado.vista = 'inicio'; renderApp(); });
}

function renderBusqueda() {
  let t;
  document.getElementById('campoBusqueda')?.addEventListener('input', e => {
    clearTimeout(t);
    t = setTimeout(() => { estado.filtros.busqueda = e.target.value; estado.vista = 'inicio'; renderApp(); }, 400);
  });
}

function renderFooter() {
  const el = document.getElementById('pie');
  if (!el) return;
  el.innerHTML = `
    <div class="footer-inner">
      <div>
        <div class="footer-nombre">Instituto Tecnológico Metropolitano</div>
        <div style="margin-top:.2rem">Institución Universitaria ITM · Medellín, Colombia</div>
        <div class="footer-warning">⚠️ Usa esta plataforma de manera responsable y honesta.</div>
      </div>
      <div style="font-size:.78rem;color:rgba(255,255,255,.5)">Diseño de Sistemas de Información</div>
      <div class="footer-contacto">
        <div class="footer-contacto-titulo">Contacto</div>
        <div class="footer-contacto-item">📞 (+57) 604 440 51 00</div>
        <div class="footer-contacto-item">✉️ contacto@itm.edu.co</div>
        <div class="footer-contacto-item">📍 Calle 73 No. 76A - 354, Medellín</div>
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════════
   VISTA INICIO — DASHBOARD
═══════════════════════════════════════════════════ */
async function renderInicio(pagina) {
  const u = estado.usuario;
  const esAdmin = u?.rol === 'admin';
  const hayFiltro = Object.values(estado.filtros).some(v => v);
  const textoSeccion = estado.filtros.tipo_reporte === 'encontrado' ? 'Objetos encontrados'
    : estado.filtros.tipo_reporte === 'perdido' ? 'Objetos perdidos' : 'Objetos recientes';

  pagina.innerHTML = `
    ${!hayFiltro ? (esAdmin ? `
    <div class="banner-admin">
      <div><h2>Panel de administración</h2><p>Gestiona todos los reportes, reclamaciones y usuarios desde aquí</p></div>
      <div class="fila">
        <button class="btn btn-sm" style="background:rgba(255,255,255,.18);color:#fff;border-color:rgba(255,255,255,.25)" id="btnAdmRep">📋 Reportes</button>
        <button class="btn btn-sm" style="background:rgba(255,255,255,.18);color:#fff;border-color:rgba(255,255,255,.25)" id="btnAdmRec">🔒 Reclamaciones</button>
        <button class="btn btn-sm" style="background:rgba(255,255,255,.18);color:#fff;border-color:rgba(255,255,255,.25)" id="btnAdmUsr">👥 Usuarios</button>
      </div>
    </div>` : `
    <div class="banner-bienvenida">
      <h2>Bienvenido al Sistema de Objetos Perdidos</h2>
      <p>Reporta objetos perdidos o encontrados en el campus ITM</p>
    </div>`) : ''}

    ${!hayFiltro && u ? `
    <div class="accion-grid">
      <div class="accion-card perdida" id="cardPerdido">
        <div class="accion-icono rojo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
        <div>
          <div class="accion-titulo">Se me perdió un objeto</div>
          <div class="accion-sub">Reporta un objeto que hayas perdido</div>
        </div>
      </div>
      <div class="accion-card encontrada" id="cardEncontrado">
        <div class="accion-icono verde">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 5v14m-7-7h14"/>
          </svg>
        </div>
        <div>
          <div class="accion-titulo">Encontré un objeto</div>
          <div class="accion-sub">Registra un objeto que hayas encontrado</div>
        </div>
      </div>
    </div>` : ''}

    <div class="sec-header">
      <h2 class="sec-titulo">${textoSeccion}</h2>
      <span class="sec-badge" id="contObjetos">Cargando...</span>
    </div>
    <div class="objetos-grid" id="gridObjetos"><div class="girador"></div></div>
  `;

  if (esAdmin) {
    document.getElementById('btnAdmRep')?.addEventListener('click', () => navegar('admin-reportes'));
    document.getElementById('btnAdmRec')?.addEventListener('click', () => navegar('admin-reclamaciones'));
    document.getElementById('btnAdmUsr')?.addEventListener('click', () => navegar('admin-usuarios'));
  }
  document.getElementById('cardPerdido')?.addEventListener('click', () => abrirModalReporte('perdido'));
  document.getElementById('cardEncontrado')?.addEventListener('click', () => abrirModalReporte('encontrado'));

  try {
    const p = {};
    if (estado.filtros.tipo_reporte) p.tipo = estado.filtros.tipo_reporte;
    if (estado.filtros.categoria)    p.categoria = estado.filtros.categoria;
    if (estado.filtros.sede)         p.sede = estado.filtros.sede;
    if (estado.filtros.busqueda)     p.busqueda = estado.filtros.busqueda;

    const lista = await Reportes.listar(p);
    const grid = document.getElementById('gridObjetos');
    const cont = document.getElementById('contObjetos');
    if (cont) cont.textContent = `${lista.length} objeto${lista.length !== 1 ? 's' : ''} registrado${lista.length !== 1 ? 's' : ''}`;
    if (!lista.length) {
      grid.innerHTML = `<div class="estado-vacio" style="grid-column:1/-1">
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <h3>No se encontraron objetos</h3><p>Prueba con otros filtros o publica el tuyo.</p>
      </div>`;
      return;
    }
    grid.innerHTML = '';
    lista.forEach(obj => grid.appendChild(construirCard(obj)));
  } catch (err) {
    document.getElementById('gridObjetos').innerHTML =
      `<div class="estado-vacio" style="grid-column:1/-1"><h3>Error al cargar</h3><p>${err.message}</p></div>`;
  }
}

/* ── Card de objeto (igual a las capturas) ─────────── */
function construirCard(obj) {
  const card = document.createElement('div');
  card.className = 'objeto-card';
  const esMio = estado.usuario?.id === obj.reportante?.id;
  const puedeReclamar = estado.usuario && !esMio && (obj.estado === 'encontrado' || obj.estado === 'perdido');
  const tipoLabel = obj.tipo_reporte === 'perdido' ? 'Perdido en:' : 'Encontrado en:';

  card.innerHTML = `
    ${obj.ruta_imagen
      ? `<img class="objeto-img" src="${obj.ruta_imagen}" alt="${obj.titulo}" loading="lazy">`
      : `<div class="objeto-img-vacia">${iconoCategoria(obj.categoria)}</div>`}
    <div class="objeto-body">
      <div class="objeto-autor">
        <div class="objeto-autor-avatar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
        </div>
        <span class="objeto-autor-nombre">${obj.reportante?.nombre_completo || 'Nombre Completo'}</span>
      </div>
      <div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;margin-bottom:.3rem">
        <div class="objeto-titulo" style="margin-bottom:0">${obj.titulo}</div>
        ${insigniaEstado(obj.estado)}
      </div>
      <div class="objeto-ubicacion-label">${tipoLabel}</div>
      <div class="objeto-ubicacion-fila">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 13-8 13s-8-7-8-13a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        ${obj.sede || ''}
      </div>
    </div>
    <div class="objeto-pie">
      ${puedeReclamar
        ? `<button class="btn-estuyo">¿Es tuyo?</button>`
        : esMio
          ? `<span style="font-size:.75rem;color:var(--text3)">Tu publicación</span>`
          : `<span style="font-size:.75rem;color:var(--text3)">${nombreCategoria(obj.categoria)}</span>`}
    </div>`;

  card.addEventListener('click', e => {
    if (e.target.closest('.btn-estuyo')) { e.stopPropagation(); abrirModalReclamar(obj); }
    else abrirModalDetalle(obj);
  });
  return card;
}

/* ═══════════════════════════════════════════════════
   MIS REPORTES
═══════════════════════════════════════════════════ */
async function renderMisReportes(pagina) {
  pagina.innerHTML = `
    <div class="sec-header">
      <h2 class="sec-titulo">Mis reportes</h2>
      <div class="fila">
        <button class="btn btn-borde btn-sm" id="btnNuevoPerd">+ Reportar perdido</button>
        <button class="btn btn-purple btn-sm" id="btnNuevoEnc">+ Registrar encontrado</button>
      </div>
    </div>
    <div class="reportes-lista" id="listaReportes"><div class="girador"></div></div>`;

  document.getElementById('btnNuevoPerd')?.addEventListener('click', () => abrirModalReporte('perdido',   () => renderMisReportes(pagina)));
  document.getElementById('btnNuevoEnc')?.addEventListener('click', () => abrirModalReporte('encontrado', () => renderMisReportes(pagina)));

  try {
    const lista = await Reportes.misReportes();
    const cont  = document.getElementById('listaReportes');
    if (!lista.length) {
      cont.innerHTML = `<div class="estado-vacio">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <h3>No tienes reportes publicados</h3><p>Publica un objeto perdido o encontrado.</p>
      </div>`;
      return;
    }
    cont.innerHTML = '';
    lista.forEach(obj => {
      const canCancel = !['entregado','cancelado'].includes(obj.estado);
      const item = document.createElement('div');
      item.className = 'reporte-item';
      item.innerHTML = `
        ${obj.ruta_imagen
          ? `<img class="reporte-img" src="${obj.ruta_imagen}" alt="${obj.titulo}">`
          : `<div class="reporte-img-vacia">${iconoCategoria(obj.categoria)}</div>`}
        <div class="reporte-cuerpo">
          <div class="reporte-titulo-fila">
            <span class="reporte-titulo">${obj.titulo}</span>
            ${insigniaEstado(obj.estado)}
          </div>
          <div class="reporte-desc">${obj.descripcion}</div>
          <div class="reporte-meta">
            <div class="meta-item"><div class="met-label">Categoría</div><div class="met-val">${nombreCategoria(obj.categoria)}</div></div>
            <div class="meta-item"><div class="met-label">Sede</div><div class="met-val">${obj.sede || '—'}</div></div>
            <div class="meta-item"><div class="met-label">Zona</div><div class="met-val">${obj.lugar_especifico || obj.ubicacion || '—'}</div></div>
            <div class="meta-item"><div class="met-label">Fecha</div><div class="met-val">${formatearFecha(obj.creado_en)}</div></div>
            <div class="meta-item"><div class="met-label">Hora</div><div class="met-val">${obj.hora_ocurrencia || tiempoRelativo(obj.creado_en)}</div></div>
          </div>
          <div class="reporte-acciones">
            <button class="btn btn-azul btn-sm" data-ver>Ver detalles</button>
            ${canCancel ? `<button class="btn btn-borde btn-sm" data-editar>✏️ Editar</button>` : ''}
            ${canCancel ? `<button class="btn btn-rojo btn-sm" data-cancelar>Cancelar</button>` : ''}
          </div>
        </div>`;
      item.querySelector('[data-ver]')?.addEventListener('click', e => { e.stopPropagation(); abrirModalDetalle(obj); });
      item.querySelector('[data-editar]')?.addEventListener('click', e => { e.stopPropagation(); abrirModalEditarReporte(obj, () => renderMisReportes(pagina)); });
      item.querySelector('[data-cancelar]')?.addEventListener('click', e => {
        e.stopPropagation();
        mostrarConfirmacion('¿Deseas cancelar este reporte?', async () => {
          try { await Reportes.cancelar(obj.id); mostrarToast('Reporte cancelado','success'); renderMisReportes(pagina); }
          catch (err) { mostrarToast(err.message,'error'); }
        });
      });
      item.addEventListener('click', () => abrirModalDetalle(obj));
      cont.appendChild(item);
    });
  } catch (err) { mostrarToast(err.message,'error'); }
}

/* ═══════════════════════════════════════════════════
   NOTIFICACIONES
═══════════════════════════════════════════════════ */
async function renderNotificaciones(pagina) {
  pagina.innerHTML = `
    <div class="sec-header">
      <h2 class="sec-titulo">Notificaciones</h2>
      <button class="btn btn-borde btn-sm" id="btnMarcarTodas">Marcar todas como leídas</button>
    </div>
    <div id="listaNot"><div class="girador"></div></div>`;

  document.getElementById('btnMarcarTodas')?.addEventListener('click', async () => {
    await Notificaciones.marcarTodasLeidas();
    renderNotificaciones(pagina);
  });

  const iconos = { coincidencia:'🔍', reclamo_nuevo:'📩', reclamo_aprobado:'✅', reclamo_rechazado:'❌', estado_cambiado:'🔄', reporte_aprobado:'✅', reporte_rechazado:'❌', entrega_lista:'📦' };
  const destinos = {
    reclamo_nuevo: estado.usuario?.rol === 'admin' ? 'admin-reclamaciones' : 'mis-reportes',
    reclamo_aprobado: 'mis-reportes', reclamo_rechazado: 'mis-reportes',
    coincidencia: 'mis-reportes', estado_cambiado: 'mis-reportes',
    reporte_aprobado: 'mis-reportes', reporte_rechazado: 'mis-reportes', entrega_lista: 'mis-reportes',
  };

  let lista;
  try {
    lista = await Notificaciones.listar();
  } catch(err) {
    if (!pagina.isConnected) return;
    document.getElementById('listaNot').innerHTML = `<div class="estado-vacio"><h3>Error al cargar</h3><p>${err.message}</p></div>`;
    return;
  }

  if (!pagina.isConnected) return;
  const cont = document.getElementById('listaNot');
  if (!cont) return;

  if (!lista || !lista.length) {
    cont.innerHTML = `<div class="estado-vacio"><h3>Sin notificaciones</h3><p>Todo tranquilo por ahora.</p></div>`;
    return;
  }

  cont.innerHTML = `
    <div style="background:#fff;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">
      ${lista.map(n => `
        <div class="notif-item ${n.leida ? '' : 'no-leida'}" data-id="${n.id}" data-tipo="${n.tipo}" style="cursor:pointer">
          <div class="notif-icono">${iconos[n.tipo] || '🔔'}</div>
          <div style="flex:1;min-width:0">
            <div class="notif-titulo">${n.titulo}</div>
            <div class="notif-msg">${n.mensaje}</div>
            <div class="notif-hora">${tiempoRelativo(n.creado_en)}</div>
          </div>
          ${!n.leida ? '<div style="width:8px;height:8px;border-radius:50%;background:#3b82f6;flex-shrink:0;align-self:center"></div>' : ''}
        </div>`).join('')}
    </div>`;

  cont.querySelectorAll('.notif-item').forEach(it => {
    it.addEventListener('click', async () => {
      try { await Notificaciones.marcarLeida(parseInt(it.dataset.id)); } catch(_) {}
      navegar(destinos[it.dataset.tipo] || 'mis-reportes');
    });
  });
}

function renderPreferencias(pagina) {
  pagina.innerHTML = `
    <div style="max-width:680px">
      <h2 class="pref-titulo">Preferencias de notificación</h2>
      <p class="pref-sub">Configura cómo y cuándo deseas recibir notificaciones</p>

      <div class="pref-card">
        <div class="pref-card-titulo">Canales de notificación</div>
        ${[
          { id:'ch-email', emoji:'✉️', nombre:'Correo electrónico',  desc:'Recibe notificaciones por email',        on:true  },
          { id:'ch-push',  emoji:'🔔', nombre:'Notificaciones push', desc:'Recibe alertas en tiempo real',          on:true  },
        ].map(p => `
          <div class="pref-item">
            <div class="pref-item-icono">${p.emoji}</div>
            <div class="pref-item-info">
              <div class="pref-item-nombre">${p.nombre}</div>
              <div class="pref-item-desc">${p.desc}</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="${p.id}" ${p.on ? 'checked' : ''}>
              <span class="toggle-track"></span>
            </label>
          </div>`).join('')}
      </div>

      <div class="pref-card">
        <div class="pref-card-titulo">Tipos de notificaciones</div>
        ${[
          { id:'tp-coinc',  nombre:'Coincidencias de objetos',   desc:'Cuando se encuentra un objeto similar a tu reporte',  on:true  },
          { id:'tp-verif',  nombre:'Verificaciones de objetos',  desc:'Cuando alguien intenta verificar tu objeto',           on:true  },
          { id:'tp-sist',   nombre:'Actualizaciones del sistema',desc:'Nuevas funciones y mejoras',                          on:false },
          { id:'tp-news',   nombre:'Noticias y promociones',     desc:'Información sobre eventos del ITM',                   on:false },
        ].map(p => `
          <div class="pref-item">
            <div class="pref-item-info">
              <div class="pref-item-nombre">${p.nombre}</div>
              <div class="pref-item-desc">${p.desc}</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="${p.id}" ${p.on ? 'checked' : ''}>
              <span class="toggle-track"></span>
            </label>
          </div>`).join('')}
      </div>

      <button class="btn btn-purple" id="btnGuardarPref">Guardar preferencias</button>
    </div>`;

  document.getElementById('btnGuardarPref')?.addEventListener('click', () => mostrarToast('Preferencias guardadas','success'));
}

/* ═══════════════════════════════════════════════════
   MODALES
═══════════════════════════════════════════════════ */
function abrirModalDetalle(obj) {
  const esMio = estado.usuario?.id === obj.reportante?.id;
  const puedeReclamar = estado.usuario && !esMio && (obj.estado === 'encontrado' || obj.estado === 'perdido');
  const tipoLabel = obj.tipo_reporte === 'perdido' ? 'Perdido en' : 'Encontrado en';

  const { cerrar } = crearModal({
    titulo: 'Detalle del objeto',
    contenido: `
      ${obj.ruta_imagen
        ? `<img class="img-detalle" src="${obj.ruta_imagen}" alt="${obj.titulo}">`
        : `<div class="img-detalle-vacia">${iconoCategoria(obj.categoria)}</div>`}
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:.75rem;margin-bottom:.75rem">
        <h2 class="titulo-detalle">${obj.titulo}</h2>
        ${insigniaEstado(obj.estado)}
      </div>
      <p style="color:var(--text3);margin-bottom:1rem;line-height:1.7;font-size:.875rem">${obj.descripcion}</p>
      <div class="meta-detalle-grid">
        <div><div class="meta-d-label">Categoría</div><div class="meta-d-val">${nombreCategoria(obj.categoria)}</div></div>
        <div><div class="meta-d-label">Tipo</div><div class="meta-d-val">${obj.tipo_reporte === 'encontrado' ? '✅ Encontrado' : '❌ Perdido'}</div></div>
        <div><div class="meta-d-label">${tipoLabel}</div><div class="meta-d-val">${obj.sede || ''} ${obj.lugar_especifico ? '— ' + obj.lugar_especifico : obj.ubicacion || ''}</div></div>
        <div><div class="meta-d-label">Fecha</div><div class="meta-d-val">${formatearFecha(obj.creado_en)}</div></div>
      </div>
      ${obj.punto_custodia ? `
        <div style="background:var(--badge-deliver-bg);border:1px solid #bfdbfe;border-radius:var(--radius-sm);padding:.7rem .9rem;margin-bottom:1rem">
          <div style="font-size:.77rem;font-weight:700;color:#1d4ed8;margin-bottom:.15rem">📍 Punto de custodia</div>
          <div style="font-size:.855rem;color:#1e40af">${obj.punto_custodia}</div>
        </div>` : ''}
      <div style="display:flex;align-items:center;gap:.6rem;padding-top:.75rem;border-top:1px solid var(--border)">
        <div style="width:28px;height:28px;border-radius:50%;background:var(--bg2);display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
        </div>
        <div>
          <div style="font-size:.8rem;font-weight:600">${obj.reportante?.nombre_completo}</div>
          <div style="font-size:.73rem;color:var(--text3)">Publicado ${tiempoRelativo(obj.creado_en)}</div>
        </div>
      </div>`,
    pie: puedeReclamar ? `<button class="btn btn-purple" id="btnReclamarDetalle">¿Es tuyo? — Reclamar</button>` : '',
    tamano: 'ventana-modal-grande',
  });

  setTimeout(() => {
    document.getElementById('btnReclamarDetalle')?.addEventListener('click', () => { cerrar(); abrirModalReclamar(obj); });
  }, 50);
}

function abrirModalReporte(tipo, alTerminar) {
  if (!estado.usuario) { mostrarToast('Inicia sesión para publicar','info'); return; }
  const texto = tipo === 'encontrado' ? 'Registrar objeto encontrado' : 'Reportar objeto perdido';

  const { cerrar } = crearModal({
    titulo: texto,
    contenido: `
      <form id="formReporte">
        <div class="campo-grupo">
          <label class="campo-label req">Título del objeto</label>
          <input name="titulo" class="campo-input" placeholder="Ej: Billetera negra de cuero" required>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div class="campo-grupo">
            <label class="campo-label req">Categoría</label>
            <select name="categoria" class="campo-select" required>
              <option value="">Seleccionar...</option>
              <option value="electronico">📱 Electrónico</option>
              <option value="documento">📄 Documento</option>
              <option value="accesorio">👜 Accesorio</option>
              <option value="ropa">👕 Ropa</option>
              <option value="maleta">🎒 Maleta/Mochila</option>
              <option value="llaves">🔑 Llaves</option>
              <option value="gafas">👓 Gafas</option>
              <option value="libro">📚 Libros</option>
              <option value="otro">📦 Otro</option>
            </select>
          </div>
          <div class="campo-grupo">
            <label class="campo-label req">Sede</label>
            <select name="sede" class="campo-select" required>
              <option value="">Seleccionar...</option>
              <option value="Sede Robledo">Sede Robledo</option>
              <option value="Sede Fraternidad">Sede Fraternidad</option>
              <option value="Sede Floresta">Sede Floresta</option>
              <option value="Sede Prado">Sede Prado</option>
              <option value="Sede Castilla">Sede Castilla</option>
            </select>
          </div>
        </div>
        <div class="campo-grupo">
          <label class="campo-label req">Lugar específico</label>
          <input name="lugar_especifico" class="campo-input" placeholder="Ej: Biblioteca, segundo piso" required>
        </div>
        ${tipo === 'encontrado' ? `
        <div class="campo-grupo">
          <label class="campo-label req">Punto de custodia</label>
          <select name="opcion_custodia" id="selCustodia" class="campo-select" required>
            <option value="">Seleccionar...</option>
            <option value="oficina">En objetos perdidos (según sede)</option>
            <option value="otro">En otro lugar</option>
          </select>
        </div>
        <div class="campo-grupo oculto" id="campoCustodiaOtro">
          <label class="campo-label req">¿En qué lugar lo dejaste?</label>
          <input id="inputCustodiaOtro" class="campo-input" placeholder="Ej: Portería Bloque A...">
        </div>` : ''}
        <div class="campo-grupo">
          <label class="campo-label">Hora en que fue ${tipo === 'encontrado' ? 'encontrado' : 'perdido'}</label>
          <input type="time" name="hora_ocurrencia" class="campo-input">
          <div class="campo-ayuda">Solo para validación — no visible públicamente.</div>
        </div>
        <div class="campo-grupo">
          <label class="campo-label req">Descripción detallada</label>
          <textarea name="descripcion" class="campo-textarea" placeholder="Describe el objeto con detalles..." required></textarea>
        </div>
        <div class="campo-grupo">
          <label class="campo-label">Fotografía del objeto</label>
          <label class="zona-carga" for="campoImg">
            <div style="color:var(--text3);font-size:.875rem">Haz clic para subir imagen</div>
            <div style="color:var(--text4);font-size:.75rem;margin-top:.25rem">JPG, PNG o WebP</div>
            <input type="file" name="imagen" accept="image/*" id="campoImg" style="display:none">
          </label>
          <img id="prevImg" class="imagen-previa oculto">
        </div>
        <button type="submit" class="btn btn-purple btn-full btn-lg" id="btnPublicar">${texto}</button>
      </form>`,
  });

  setTimeout(() => {
    const imgInput = document.getElementById('campoImg');
    const prev     = document.getElementById('prevImg');
    imgInput?.addEventListener('change', () => {
      if (imgInput.files[0]) { prev.src = URL.createObjectURL(imgInput.files[0]); prev.classList.remove('oculto'); }
    });
    document.getElementById('selCustodia')?.addEventListener('change', e => {
      const otro = document.getElementById('campoCustodiaOtro');
      const inp  = document.getElementById('inputCustodiaOtro');
      if (e.target.value === 'otro') { otro.classList.remove('oculto'); inp.required = true; }
      else { otro.classList.add('oculto'); inp.required = false; }
    });

    let sending = false;
    document.getElementById('formReporte')?.addEventListener('submit', async e => {
      e.preventDefault();
      if (sending) return;
      sending = true;
      const btn = document.getElementById('btnPublicar');
      botonCargando(btn, true);
      const fd = new FormData(e.target);
      const datos = new FormData();
      datos.set('tipo_reporte', tipo);
      datos.set('titulo',       fd.get('titulo'));
      datos.set('categoria',    fd.get('categoria'));
      datos.set('descripcion',  fd.get('descripcion'));
      datos.set('ubicacion',    fd.get('lugar_especifico'));
      datos.set('sede',         fd.get('sede'));
      datos.set('lugar_especifico', fd.get('lugar_especifico'));
      if (fd.get('hora_ocurrencia')) datos.set('hora_ocurrencia', fd.get('hora_ocurrencia'));
      const opCust = fd.get('opcion_custodia');
      if (opCust === 'oficina') datos.set('punto_custodia', `Oficina de objetos perdidos — ${fd.get('sede')}`);
      else if (opCust === 'otro') datos.set('punto_custodia', document.getElementById('inputCustodiaOtro')?.value || '');
      if (imgInput?.files[0]) datos.set('imagen', imgInput.files[0]);
      try {
        await Reportes.crear(datos);
        cerrar(); mostrarToast('¡Reporte publicado exitosamente!','success');
        estado.filtros = {}; navegar('inicio'); alTerminar?.();
      } catch (err) { mostrarToast(err.message,'error'); botonCargando(btn, false); sending = false; }
    });
  }, 50);
}

function abrirModalReclamar(obj) {
  if (!estado.usuario) { mostrarToast('Inicia sesión para reclamar','info'); return; }
  const { cerrar } = crearModal({
    titulo: '¿Es tuyo?',
    contenido: `
      <div style="background:var(--badge-claim-bg);border-radius:var(--radius-sm);padding:.7rem;margin-bottom:1.2rem;font-size:.82rem;color:#92400e">
        Responde las preguntas para demostrar que el objeto te pertenece. Un administrador verificará tu solicitud.
      </div>
      <p style="font-weight:600;margin-bottom:1rem">Objeto: <span style="color:var(--purple)">${obj.titulo}</span></p>
      <form id="formReclamar">
        <div class="campo-grupo">
          <label class="campo-label req">Cédula o carné <span style="font-weight:400;color:var(--text3)">(en caso de ser aprobado para reclamar)</span></label>
          <input name="cedula_reclamante" class="campo-input" placeholder="Solo números" inputmode="numeric" pattern="[0-9]+" required>
        </div>
        <div class="campo-grupo">
          <label class="campo-label req">¿Algún detalle especial del objeto?</label>
          <input name="respuesta_1" class="campo-input" placeholder="Color, marca, modelo, contenido..." required>
        </div>
        <div class="campo-grupo">
          <label class="campo-label req">Lugar donde lo perdiste</label>
          <input name="respuesta_2" class="campo-input" placeholder="Ej: Cafetería bloque A, segundo piso..." required>
        </div>
        <div class="campo-grupo">
          <label class="campo-label req">Fecha y hora en que lo perdiste</label>
          <input name="respuesta_3" type="datetime-local" class="campo-input" required>
        </div>
        <div class="campo-grupo">
          <label class="campo-label">Adjunta evidencia de propiedad</label>
          <div class="zona-carga" id="zonaEvid">
            <div style="color:var(--text3);font-size:.875rem">Haz clic para subir foto (opcional)</div>
            <input type="file" name="evidencia" accept="image/*" style="display:none" id="campoEvid">
          </div>
          <img id="prevEvid" class="imagen-previa oculto">
        </div>
        <div class="campo-grupo">
          <label class="campo-label">Notas adicionales</label>
          <textarea name="notas" class="campo-textarea" placeholder="Información adicional..."></textarea>
        </div>
        <button type="submit" class="btn btn-purple btn-full btn-lg" id="btnEnviarReclamo">Enviar solicitud de reclamación</button>
      </form>`,
  });

  setTimeout(() => {
    const zona = document.getElementById('zonaEvid');
    const inp  = document.getElementById('campoEvid');
    const prev = document.getElementById('prevEvid');
    zona?.addEventListener('click', () => inp?.click());
    inp?.addEventListener('change', () => { if (inp.files[0]) { prev.src = URL.createObjectURL(inp.files[0]); prev.classList.remove('oculto'); } });
    document.getElementById('formReclamar')?.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = document.getElementById('btnEnviarReclamo');
      botonCargando(btn, true);
      const fd = new FormData(e.target);
      try { await Reclamaciones.enviar(obj.id, fd); cerrar(); mostrarToast('¡Solicitud enviada! El administrador la revisará pronto.','success'); }
      catch (err) { mostrarToast(err.message,'error'); botonCargando(btn, false); }
    });
  }, 50);
}

/* ═══════════════════════════════════════════════════
   ADMIN VISTAS
═══════════════════════════════════════════════════ */
async function renderAdminReportes(pagina) {
  pagina.innerHTML = `
    <div class="banner-admin">
      <div><h2>Gestión de reportes</h2><p>Aprueba, rechaza o elimina reportes de la comunidad</p></div>
      <span class="sec-badge" id="cntAdmin" style="background:rgba(255,255,255,.15);color:#fff;border-color:rgba(255,255,255,.2)"></span>
    </div>
    <div style="display:flex;gap:.45rem;flex-wrap:wrap;margin-bottom:1.2rem">
      <button class="tab-filtro activo" data-f="todos">Todos</button>
      <button class="tab-filtro" data-f="encontrado">✅ Encontrados</button>
      <button class="tab-filtro" data-f="perdido">❌ Perdidos</button>
      <button class="tab-filtro" data-f="cancelado">Cancelados</button>
    </div>
    <div id="listaAdm"><div class="girador"></div></div>`;

  let filtro = 'todos';
  async function cargar() {
    const el = document.getElementById('listaAdm');
    el.innerHTML = '<div class="girador"></div>';
    try {
      const [pub, pend] = await Promise.all([Reportes.listar({}).catch(()=>[]), Reportes.pendientes().catch(()=>[])]);
      const p1 = Array.isArray(pub)  ? pub  : [];
      const p2 = Array.isArray(pend) ? pend : [];
      const ids = new Set(p1.map(r => r.id));
      let todos = [...p2.filter(r => !ids.has(r.id)), ...p1];
      if (filtro !== 'todos') todos = todos.filter(r => r.tipo_reporte === filtro || r.estado === filtro);
      const cnt = document.getElementById('cntAdmin');
      if (cnt) cnt.textContent = `${todos.length} reporte${todos.length!==1?'s':''}`;
      if (!todos.length) { el.innerHTML=`<div class="estado-vacio"><h3>No hay reportes</h3></div>`; return; }
      el.innerHTML = `<div style="display:flex;flex-direction:column;gap:.75rem">
        ${todos.map(r => {
          const pend = !r.aprobado;
          return `<div style="background:#fff;border:2px solid ${pend?'var(--orange)':'var(--border)'};border-radius:var(--radius-md);padding:1.1rem" id="tr-${r.id}">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap">
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:.45rem;margin-bottom:.3rem;flex-wrap:wrap">
                  ${pend?`<span class="insignia" style="background:var(--badge-claim-bg);color:var(--badge-claim-fg)">Pendiente</span>`:''}
                  ${insigniaEstado(r.estado)}
                </div>
                ${r.ruta_imagen?`<img src="${r.ruta_imagen}" alt="${r.titulo}" style="height:90px;width:auto;object-fit:cover;border-radius:6px;margin-bottom:.4rem;display:block">`:''}
                <div style="font-weight:700;font-size:.95rem;margin-bottom:.2rem">${r.titulo}</div>
                <div style="font-size:.79rem;color:var(--text3);margin-bottom:.3rem">${r.descripcion.slice(0,100)}${r.descripcion.length>100?'...':''}</div>
                <div style="font-size:.74rem;color:var(--text3)">
                  📍 ${r.sede||r.ubicacion}${r.lugar_especifico?' · '+r.lugar_especifico:''}
                  &nbsp;·&nbsp; 👤 ${r.reportante?.nombre_completo}
                  &nbsp;·&nbsp; 🕐 ${tiempoRelativo(r.creado_en)}
                  ${r.hora_ocurrencia?`&nbsp;·&nbsp; ⏰ ${r.hora_ocurrencia}`:''}
                  ${r.punto_custodia?`<br>📦 Custodia: ${r.punto_custodia}`:''}
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:.4rem;flex-shrink:0">
                ${pend
                  ? `<button class="btn btn-verde btn-sm" data-accion="aprobar" data-id="${r.id}">✓ Aprobar</button>
                     <button class="btn btn-borde btn-sm"  data-accion="rechazar" data-id="${r.id}">✗ Rechazar</button>`
                  : `<button class="btn btn-borde btn-sm"  data-accion="editar"   data-id="${r.id}">✏️ Editar</button>
                     <button class="btn btn-rojo btn-sm"   data-accion="eliminar" data-id="${r.id}">🗑 Eliminar</button>`}
              </div>
            </div>
          </div>`;
        }).join('')}</div>`;

      el.querySelectorAll('[data-accion="aprobar"]').forEach(b => b.addEventListener('click', async () => {
        try { await Reportes.revisar(b.dataset.id,{accion:'aprobar'}); mostrarToast('Reporte aprobado','success'); cargar(); }
        catch(e){ mostrarToast(e.message,'error'); }
      }));
      el.querySelectorAll('[data-accion="rechazar"]').forEach(b => b.addEventListener('click', () => {
        const {cerrar} = crearModal({titulo:'Rechazar reporte',contenido:`<div class="campo-grupo"><label class="campo-label req">Motivo</label><textarea id="motivo" class="campo-textarea" required></textarea></div>`,pie:`<button class="btn btn-borde btn-sm" id="cxRec">Cancelar</button><button class="btn btn-rojo btn-sm" id="okRec">Rechazar</button>`});
        setTimeout(()=>{
          document.getElementById('cxRec')?.addEventListener('click',cerrar);
          document.getElementById('okRec')?.addEventListener('click', async ()=>{
            const m = document.getElementById('motivo')?.value;
            if(!m){mostrarToast('Ingresa el motivo','error');return;}
            try{ await Reportes.revisar(b.dataset.id,{accion:'rechazar',motivo:m}); cerrar(); mostrarToast('Reporte rechazado','info'); cargar(); }
            catch(e){ mostrarToast(e.message,'error'); }
          });
        },50);
      }));
      el.querySelectorAll('[data-accion="editar"]').forEach(b => b.addEventListener('click', async () => {
        try {
          const obj = await Reportes.obtener(parseInt(b.dataset.id));
          abrirModalEditarReporte(obj, cargar);
        } catch(e){ mostrarToast(e.message,'error'); }
      }));
      el.querySelectorAll('[data-accion="eliminar"]').forEach(b => b.addEventListener('click', () => {
        mostrarConfirmacion('¿Eliminar este reporte?', async ()=>{
          try{ await Administracion.eliminarReporte(b.dataset.id); mostrarToast('Eliminado','success'); cargar(); }
          catch(e){ mostrarToast(e.message,'error'); }
        });
      }));
    } catch(e){ mostrarToast(e.message,'error'); }
  }

  pagina.querySelectorAll('[data-f]').forEach(t => t.addEventListener('click', ()=>{
    pagina.querySelectorAll('[data-f]').forEach(x=>x.classList.remove('activo'));
    t.classList.add('activo'); filtro = t.dataset.f; cargar();
  }));
  cargar();
}

async function renderAdminReclamaciones(pagina) {
  pagina.innerHTML = `
    <div class="banner-admin">
      <div><h2>Gestión de reclamaciones</h2><p>Aprueba o rechaza solicitudes de propiedad</p></div>
    </div>
    <div id="listaRecl"><div class="girador"></div></div>`;

  try {
    const lista = await Reclamaciones.pendientes();
    const el = document.getElementById('listaRecl');
    if (!lista?.length) { el.innerHTML=`<div class="estado-vacio"><h3>No hay reclamaciones en revisión</h3></div>`; return; }
    el.innerHTML = `<div style="display:flex;flex-direction:column;gap:1rem">
      ${lista.map(r=>`
        <div style="background:#fff;border:2px solid var(--orange);border-radius:var(--radius-md);padding:1.2rem" id="rc-${r.id}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem">
            <div style="flex:1;min-width:0">

              <div style="font-size:.72rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.3rem">Objeto reclamado</div>
              <div style="font-weight:700;font-size:1rem;margin-bottom:.15rem">${r.reporte?.titulo||'Objeto'}</div>
              <div style="font-size:.78rem;color:var(--text3);margin-bottom:.6rem">${r.reporte?.descripcion?.slice(0,120)||''} · 📍 ${r.reporte?.sede||''} ${r.reporte?.lugar_especifico?'— '+r.reporte.lugar_especifico:''}</div>
              ${r.reporte?.ruta_imagen?`<img src="${r.reporte.ruta_imagen}" style="height:80px;object-fit:cover;border-radius:6px;margin-bottom:.6rem">` : ''}

              <div style="background:var(--bg1);border-radius:8px;padding:.7rem .9rem;margin-bottom:.6rem">
                <div style="font-size:.72rem;font-weight:700;color:var(--blue);text-transform:uppercase;margin-bottom:.4rem">👤 Quien lo reportó (reportante)</div>
                <div style="font-size:.82rem;margin-bottom:.25rem"><strong>${r.reporte?.reportante?.nombre_completo||'—'}</strong> · ${r.reporte?.reportante?.correo||''}</div>
                <div style="font-size:.79rem;color:var(--text2)">
                  <div><strong>Usuario:</strong> @${r.reporte?.reportante?.nombre_usuario||'—'}</div>
                  <div><strong>Tipo de reporte:</strong> ${r.reporte?.tipo_reporte === 'encontrado' ? '✅ Encontrado' : '❌ Perdido'}</div>
                  ${r.reporte?.descripcion?`<div><strong>Descripción que publicó:</strong> ${r.reporte.descripcion}</div>`:''}
                  ${r.reporte?.sede?`<div><strong>Sede:</strong> ${r.reporte.sede}${r.reporte.lugar_especifico?' — '+r.reporte.lugar_especifico:''}</div>`:''}
                  ${r.reporte?.hora_ocurrencia?`<div><strong>Hora de ocurrencia:</strong> ${r.reporte.hora_ocurrencia}</div>`:''}
                  ${r.reporte?.punto_custodia?`<div><strong>Punto de custodia:</strong> ${r.reporte.punto_custodia}</div>`:''}
                </div>
              </div>

              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:.7rem .9rem;margin-bottom:.6rem">
                <div style="font-size:.72rem;font-weight:700;color:#c2410c;text-transform:uppercase;margin-bottom:.4rem">🙋 Quien dice que es suyo (reclamante)</div>
                <div style="font-size:.82rem;margin-bottom:.25rem"><strong>${r.reclamante?.nombre_completo||'—'}</strong> · ${r.reclamante?.correo||''}</div>
                <div style="font-size:.79rem;margin-bottom:.35rem;color:var(--text3)">@${r.reclamante?.nombre_usuario||'—'}</div>
                <div style="font-size:.8rem;color:var(--text2);display:flex;flex-direction:column;gap:.35rem">
                  <div><strong>Cédula o carné:</strong> ${r.cedula_reclamante||'<em style="color:var(--text3)">No suministrado</em>'}</div>
                  <div><strong>¿Algún detalle especial del objeto?</strong><br>${r.respuesta_1||'<em style="color:var(--text3)">No respondido</em>'}</div>
                  <div><strong>Lugar donde lo perdió:</strong><br>${r.respuesta_2||'<em style="color:var(--text3)">No respondido</em>'}</div>
                  <div><strong>Fecha y hora en que lo perdió:</strong><br>${r.respuesta_3||'<em style="color:var(--text3)">No respondido</em>'}</div>
                  <div><strong>Notas adicionales:</strong><br>${r.notas||'<em style="color:var(--text3)">Sin notas</em>'}</div>
                </div>
                ${r.ruta_evidencia?`<div style="margin-top:.5rem"><strong style="font-size:.8rem">Evidencia adjunta:</strong><br><img src="${r.ruta_evidencia}" style="height:120px;object-fit:cover;border-radius:6px;margin-top:.3rem"></div>` : '<div style="margin-top:.4rem;font-size:.79rem;color:var(--text3)"><em>Sin evidencia adjunta</em></div>'}
              </div>

              <div style="font-size:.74rem;color:var(--text3)">Recibido: ${new Date(r.creado_en).toLocaleString('es-CO')}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:.4rem;flex-shrink:0">
              <button class="btn btn-verde btn-sm" data-apr="${r.id}">✓ Aprobar</button>
              <button class="btn btn-rojo btn-sm" data-rec="${r.id}">✗ Rechazar</button>
            </div>
          </div>
        </div>`).join('')}
    </div>`;

    el.querySelectorAll('[data-apr]').forEach(b => b.addEventListener('click', async ()=>{
      try{ await Reclamaciones.aprobar(b.dataset.apr); mostrarToast('Reclamación aprobada','success'); renderAdminReclamaciones(pagina); }
      catch(e){ mostrarToast(e.message,'error'); }
    }));
    el.querySelectorAll('[data-rec]').forEach(b => b.addEventListener('click', ()=>{
      const {cerrar} = crearModal({titulo:'Rechazar reclamación',contenido:`<div class="campo-grupo"><label class="campo-label req">Motivo</label><textarea id="motivoR" class="campo-textarea" required></textarea></div>`,pie:`<button class="btn btn-borde btn-sm" id="cxR">Cancelar</button><button class="btn btn-rojo btn-sm" id="okR">Rechazar</button>`});
      setTimeout(()=>{
        document.getElementById('cxR')?.addEventListener('click',cerrar);
        document.getElementById('okR')?.addEventListener('click', async ()=>{
          const m = document.getElementById('motivoR')?.value;
          if(!m){mostrarToast('Ingresa el motivo','error');return;}
          try{ await Reclamaciones.rechazar(b.dataset.rec,m); cerrar(); mostrarToast('Reclamación rechazada','info'); renderAdminReclamaciones(pagina); }
          catch(e){ mostrarToast(e.message,'error'); }
        });
      },50);
    }));
  } catch(e){ mostrarToast(e.message,'error'); }
}

async function renderAdminReclamos(pagina) {
  pagina.innerHTML = `
    <div class="banner-admin">
      <div><h2>Reclamos aprobados</h2><p>Registra la entrega física del objeto al propietario aprobado</p></div>
    </div>
    <div id="listaReclamos"><div class="girador"></div></div>`;

  try {
    const lista = await Reclamaciones.aprobadas();
    const el = document.getElementById('listaReclamos');
    if (!lista?.length) { el.innerHTML=`<div class="estado-vacio"><h3>No hay reclamos aprobados pendientes de entrega</h3><p>Los reclamos aprobados aparecerán aquí para registrar su entrega.</p></div>`; return; }
    el.innerHTML = `<div style="display:flex;flex-direction:column;gap:1rem">
      ${lista.map(r=>`
        <div style="background:#fff;border:2px solid #22c55e;border-radius:var(--radius-md);padding:1.2rem" id="rl-${r.id}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem">
                <span class="insignia insignia-encontrado">✓ Aprobado</span>
                <span style="font-size:.74rem;color:var(--text3)">Aprobado: ${r.revisado_en ? new Date(r.revisado_en).toLocaleString('es-CO') : '—'}</span>
              </div>
              <div style="font-weight:700;font-size:1.05rem;margin-bottom:.15rem">${r.reporte?.titulo||'Objeto'}</div>
              <div style="font-size:.78rem;color:var(--text3);margin-bottom:.7rem">📍 ${r.reporte?.sede||''} ${r.reporte?.lugar_especifico?'— '+r.reporte.lugar_especifico:''}</div>
              ${r.reporte?.ruta_imagen?`<img src="${r.reporte.ruta_imagen}" style="height:70px;object-fit:cover;border-radius:6px;margin-bottom:.6rem">` : ''}

              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:.7rem .9rem;margin-bottom:.5rem">
                <div style="font-size:.72rem;font-weight:700;color:#166534;text-transform:uppercase;margin-bottom:.4rem">👤 Propietario aprobado</div>
                <div style="font-size:.85rem;font-weight:600">${r.reclamante?.nombre_completo||'—'}</div>
                <div style="font-size:.79rem;color:var(--text3)">${r.reclamante?.correo||''} · @${r.reclamante?.nombre_usuario||'—'}</div>
                <div style="font-size:.8rem;margin-top:.35rem;color:var(--text2)">
                  <strong>Cédula/Carné registrado:</strong>
                  <span style="font-size:.9rem;font-weight:700;color:#166534;margin-left:.3rem">${r.cedula_reclamante||'No suministrado'}</span>
                </div>
              </div>

              <div style="font-size:.75rem;color:var(--text3);margin-bottom:.5rem">
                <strong>Datos suministrados:</strong>
                ${r.respuesta_1?`<div>• Detalle: ${r.respuesta_1}</div>`:''}
                ${r.respuesta_2?`<div>• Lugar: ${r.respuesta_2}</div>`:''}
                ${r.respuesta_3?`<div>• Fecha/hora: ${r.respuesta_3}</div>`:''}
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:.4rem;flex-shrink:0;min-width:160px">
              <button class="btn btn-purple btn-sm" data-entregar="${r.id}" data-cedula="${r.cedula_reclamante||''}" data-nombre="${r.reclamante?.nombre_completo||''}">📋 Registrar entrega</button>
            </div>
          </div>
        </div>`).join('')}
    </div>`;

    el.querySelectorAll('[data-entregar]').forEach(b => b.addEventListener('click', ()=>{
      const cedula = b.dataset.cedula;
      const nombre = b.dataset.nombre;
      const id = b.dataset.entregar;
      const {cerrar} = crearModal({
        titulo:'Registrar entrega del objeto',
        contenido:`
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:.7rem;margin-bottom:1rem;font-size:.82rem;color:#166534">
            Introduce el número de cédula o carné del propietario para confirmar la entrega. Debe coincidir con el registrado en la solicitud.
          </div>
          <div class="campo-grupo">
            <label class="campo-label req">Nombre del receptor</label>
            <input id="nomRec" class="campo-input" value="${nombre}" placeholder="Nombre completo">
          </div>
          <div class="campo-grupo">
            <label class="campo-label req">Cédula o carné</label>
            <input id="docRec" class="campo-input" placeholder="Solo números" inputmode="numeric" value="${cedula}">
            ${cedula?`<div style="font-size:.75rem;color:var(--text3);margin-top:.3rem">Cédula registrada en solicitud: <strong>${cedula}</strong></div>`:''}
          </div>`,
        pie:`<button class="btn btn-borde btn-sm" id="cxE">Cancelar</button><button class="btn btn-purple btn-sm" id="okE">Confirmar entrega</button>`
      });
      setTimeout(()=>{
        document.getElementById('cxE')?.addEventListener('click',cerrar);
        document.getElementById('okE')?.addEventListener('click', async ()=>{
          const nom = document.getElementById('nomRec')?.value?.trim();
          const doc = document.getElementById('docRec')?.value?.trim();
          if(!nom||!doc){mostrarToast('Completa todos los campos','error');return;}
          try{
            await Reclamaciones.registrarEntrega(id, {nombre_receptor: nom, documento_receptor: doc});
            cerrar();
            mostrarToast('¡Entrega registrada! El objeto quedó como Reclamado.','success');
            renderAdminReclamos(pagina);
          } catch(e){ mostrarToast(e.message,'error'); }
        });
      },50);
    }));
  } catch(e){ mostrarToast(e.message,'error'); }
}

async function renderAdminUsuarios(pagina) {
  pagina.innerHTML = `
    <div class="banner-admin">
      <div><h2>Gestión de usuarios</h2><p>Bloquea o desbloquea miembros de la comunidad</p></div>
    </div>
    <div style="display:flex;gap:.5rem;margin-bottom:1.2rem">
      <input id="campoBuscUsr" class="campo-input" style="max-width:320px" placeholder="Buscar por nombre...">
      <button class="btn btn-purple btn-sm" id="btnBuscUsr">Buscar</button>
      <button class="btn btn-borde btn-sm" id="btnTodos">Ver todos</button>
    </div>
    <div id="tablaUsuarios"><div class="girador"></div></div>`;

  function render(lista) {
    const el = document.getElementById('tablaUsuarios');
    if (!lista?.length) { el.innerHTML=`<div class="estado-vacio"><h3>No se encontraron usuarios</h3></div>`; return; }
    el.innerHTML = `<div style="background:#fff;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">
      <div style="display:grid;grid-template-columns:1fr 1fr auto auto;padding:.7rem 1rem;background:var(--bg1);border-bottom:1px solid var(--border);font-size:.77rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.03em">
        <div>Nombre</div><div>Correo</div><div>Estado</div><div>Acción</div>
      </div>
      ${lista.map(u=>`
        <div style="display:grid;grid-template-columns:1fr 1fr auto auto;padding:.75rem 1rem;border-bottom:1px solid var(--border);align-items:center;gap:.5rem">
          <div style="font-weight:500;font-size:.855rem">${u.nombre_completo}</div>
          <div style="font-size:.79rem;color:var(--text3)">${u.correo}</div>
          <div id="est-${u.id}">${u.estado==="bloqueado"?`<span class="insignia insignia-cancelado">Bloqueado</span>`:`<span class="insignia insignia-encontrado">Activo</span>`}</div>
          <div id="acc-${u.id}">
            ${u.estado==="bloqueado"
              ? `<button class="btn btn-verde btn-sm" data-accion="desbloquear" data-id="${u.id}" data-nombre="${u.nombre_completo}">Desbloquear</button>`
              : `<button class="btn btn-rojo btn-sm" data-accion="bloquear" data-id="${u.id}" data-nombre="${u.nombre_completo}">🚫 Bloquear</button>`}
          </div>
        </div>`).join('')}
    </div>`;

    el.querySelectorAll('[data-accion="bloquear"]').forEach(b => b.addEventListener('click', async ()=>{
      try{
        await Administracion.bloquearUsuario(b.dataset.id);
        mostrarToast(`${b.dataset.nombre} bloqueado`,'info');
        render(await Administracion.listarUsuarios());
      } catch(e){ mostrarToast(e.message,'error'); }
    }));
    el.querySelectorAll('[data-accion="desbloquear"]').forEach(b => b.addEventListener('click', async ()=>{
      try{
        await Administracion.desbloquearUsuario(b.dataset.id);
        mostrarToast(`${b.dataset.nombre} desbloqueado`,'success');
        render(await Administracion.listarUsuarios());
      } catch(e){ mostrarToast(e.message,'error'); }
    }));
  }

  try { render(await Administracion.listarUsuarios()); } catch(e){ mostrarToast(e.message,'error'); }
  let t;
  document.getElementById('campoBuscUsr')?.addEventListener('input', e => {
    clearTimeout(t);
    t = setTimeout(async ()=>{
      const txt = e.target.value.trim();
      if(!txt){ render(await Administracion.listarUsuarios()); return; }
      try{ render(await Administracion.buscarUsuarios(txt)); } catch(e){ mostrarToast(e.message,'error'); }
    },350);
  });
  document.getElementById('btnBuscUsr')?.addEventListener('click', async ()=>{
    const txt = document.getElementById('campoBuscUsr')?.value.trim();
    if(!txt) return;
    try{ render(await Administracion.buscarUsuarios(txt)); } catch(e){ mostrarToast(e.message,'error'); }
  });
  document.getElementById('btnTodos')?.addEventListener('click', async ()=>{
    document.getElementById('campoBuscUsr').value='';
    try{ render(await Administracion.listarUsuarios()); } catch(e){ mostrarToast(e.message,'error'); }
  });
}

/* ═══════════════════════════════════════════════════
   PANEL NOTIFICACIONES (popup)
═══════════════════════════════════════════════════ */
async function abrirPanelNotif(e) {
  e.stopPropagation();
  const existe = document.getElementById('panelNotif');
  if (existe) { existe.remove(); return; }
  const btn = document.getElementById('btnNotifHeader');
  const panel = document.createElement('div');
  panel.id = 'panelNotif';
  panel.className = 'panel-notif';
  panel.innerHTML = `
    <div class="panel-notif-header">
      <span class="panel-notif-titulo">Notificaciones</span>
      <button class="btn btn-sm btn-borde" id="btnVerTodas">Ver todas</button>
    </div>
    <div class="panel-notif-lista" id="panelNotifLista">
      <div style="padding:1.5rem;text-align:center">
        <div class="girador" style="margin:0 auto;width:24px;height:24px;border-width:2px"></div>
      </div>
    </div>`;
  btn?.parentElement?.appendChild(panel);

  document.getElementById('btnVerTodas')?.addEventListener('click', () => { panel.remove(); navegar('notificaciones'); });
  const cerrar = ev => { if (!panel.contains(ev.target) && ev.target !== btn) { panel.remove(); document.removeEventListener('click', cerrar); } };
  setTimeout(() => document.addEventListener('click', cerrar), 50);

  const iconos = { coincidencia:'🔍', reclamo_nuevo:'📩', reclamo_aprobado:'✅', reclamo_rechazado:'❌', estado_cambiado:'🔄', reporte_aprobado:'✅', reporte_rechazado:'❌', entrega_lista:'📦' };
  const destinos = {
    reclamo_nuevo: estado.usuario?.rol === 'admin' ? 'admin-reclamaciones' : 'mis-reportes',
    reclamo_aprobado: 'mis-reportes', reclamo_rechazado: 'mis-reportes',
    coincidencia: 'mis-reportes', estado_cambiado: 'mis-reportes',
    reporte_aprobado: 'mis-reportes', reporte_rechazado: 'mis-reportes', entrega_lista: 'mis-reportes',
  };

  try {
    const lista = await Notificaciones.listar({ limite: 10 });
    const el = document.getElementById('panelNotifLista');
    if (!el) return;
    if (!lista || !lista.length) {
      el.innerHTML = `<div style="padding:1.5rem;text-align:center;color:var(--text3);font-size:.875rem">Sin notificaciones nuevas</div>`;
      return;
    }
    el.innerHTML = lista.map(n => `
      <div class="notif-item ${n.leida ? '' : 'no-leida'}" data-id="${n.id}" data-tipo="${n.tipo}" style="cursor:pointer">
        <div class="notif-icono">${iconos[n.tipo] || '🔔'}</div>
        <div style="flex:1;min-width:0">
          <div class="notif-titulo">${n.titulo}</div>
          <div class="notif-msg">${n.mensaje}</div>
          <div class="notif-hora">${tiempoRelativo(n.creado_en)}</div>
        </div>
        ${!n.leida ? '<div style="width:8px;height:8px;border-radius:50%;background:#3b82f6;flex-shrink:0;align-self:center"></div>' : ''}
      </div>`).join('');
    el.querySelectorAll('.notif-item[data-id]').forEach(item => {
      item.addEventListener('click', async () => {
        panel.remove();
        document.removeEventListener('click', cerrar);
        try { await Notificaciones.marcarLeida(parseInt(item.dataset.id)); } catch(_) {}
        navegar(destinos[item.dataset.tipo] || 'notificaciones');
      });
    });
  } catch(err) {
    const el = document.getElementById('panelNotifLista');
    if (el) el.innerHTML = `<div style="padding:1rem;text-align:center;color:#ef4444;font-size:.8rem">Error al cargar notificaciones</div>`;
  }
}


/* ═══════════════════════════════════════════════════
   AUTH — LOGIN PASO A PASO
═══════════════════════════════════════════════════ */
function renderAuth(tipo) {
  if (tipo === 'registrarse') { renderRegistro(); return; }

  let paso = 1;
  let usuario = '';

  const mount = () => {
    document.getElementById('aplicacion').innerHTML = `
      <div class="auth-bg">
        <div class="auth-card">
          <div class="auth-panel-logo">
            <div class="auth-logo-wrap">
              <div class="auth-logo-nombre">ITM</div>
              <div class="auth-logo-sub">Institución<br>Universitaria</div>
            </div>
          </div>
          <div class="auth-panel-form" id="authForm">
            ${paso === 1 ? paso1() : paso2()}
          </div>
        </div>
      </div>`;
    bindAuth();
  };

  const paso1 = () => `
    <h2 class="auth-titulo">Ingrese su usuario</h2>
    <div class="auth-campo-wrap">
      <span class="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg></span>
      <input id="inputUsr" type="text" placeholder="Nombre de usuario" autocomplete="username" value="${usuario}">
    </div>
    <div class="auth-recuerda">Recuerda</div>
    <p class="auth-ayuda">Tu usuario es tu correo institucional sin @correo.itm.edu.co<br><em>ej: juanperez323298</em></p>
    <div id="err1"></div>
    <div style="overflow:hidden">
      <button class="auth-btn-accion" id="btnSig">Siguiente</button>
    </div>
    <div class="auth-footer-link">
      ¿No tienes cuenta? <a href="#registrarse">Regístrate aquí</a>
    </div>`;

  const paso2 = () => `
    <span class="auth-volver" id="btnVolver">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
      Volver
    </span>
    <h2 class="auth-titulo">Ingrese su contraseña</h2>
    <div class="auth-usuario-chip">Usuario: ${usuario}</div>
    <div class="auth-campo-wrap">
      <span class="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg></span>
      <input id="inputPwd" type="password" placeholder="Contraseña" autocomplete="current-password">
    </div>
    <div class="auth-recuerda">Recuerda</div>
    <p class="auth-ayuda">Ingresa tu contraseña. Puede contener letras y números.</p>
    <div style="font-size:.78rem;color:var(--text3);margin-bottom:1rem">
      ¿Olvidaste tu contraseña? <a id="linkRecuperar" style="color:var(--purple);font-weight:500;cursor:pointer">Recupérala aquí</a>
    </div>
    <div id="err2"></div>
    <div style="overflow:hidden">
      <button class="auth-btn-accion" id="btnLogin">Iniciar sesión</button>
    </div>`;

  const bindAuth = () => {
    if (paso === 1) {
      document.getElementById('inputUsr')?.addEventListener('keydown', e => { if(e.key==='Enter') document.getElementById('btnSig')?.click(); });
      document.getElementById('btnSig')?.addEventListener('click', async () => {
        const val = document.getElementById('inputUsr')?.value.trim();
        const err = document.getElementById('err1');
        const btn = document.getElementById('btnSig');
        if (!val) { if(err){err.className='auth-error';err.textContent='Ingresa tu nombre de usuario.';} return; }
        botonCargando(btn, true);
        try {
          await Autenticacion.verificarUsuario(val);
          usuario = val; paso = 2; mount();
          setTimeout(() => document.getElementById('inputPwd')?.focus(), 50);
        } catch(_) {
          if(err){err.className='auth-error';err.textContent='Este usuario no existe. ¿Deseas registrarte?';}
          botonCargando(btn, false);
        }
      });
    } else {
      document.getElementById('btnVolver')?.addEventListener('click', () => { paso = 1; mount(); });
      document.getElementById('inputPwd')?.addEventListener('keydown', e => { if(e.key==='Enter') document.getElementById('btnLogin')?.click(); });
      document.getElementById('linkRecuperar')?.addEventListener('click', () => abrirModalRecuperacion());
      document.getElementById('btnLogin')?.addEventListener('click', async () => {
        const btn = document.getElementById('btnLogin');
        const pwd = document.getElementById('inputPwd')?.value;
        const err = document.getElementById('err2');
        if (!pwd) { if(err){err.className='auth-error';err.textContent='Ingresa tu contraseña.';} return; }
        botonCargando(btn, true);
        if(err) err.textContent='';
        try {
          const datos = await Autenticacion.iniciarSesion({ nombre_usuario: usuario, contrasena: pwd });
          TokenSesion.guardar(datos.token_acceso);
          AlmacenUsuario.guardar(datos.usuario);
          estado.usuario = datos.usuario;
          mostrarToast(`¡Bienvenido, ${datos.usuario.nombre_completo}!`, 'success');
          window.location.hash = '#inicio';
          navegar('inicio');
        } catch (e) {
          if(err){err.className='auth-error';err.textContent=e.message;}
          botonCargando(btn, false);
        }
      });
    }
  };

  mount();
}

function abrirModalEditarReporte(obj, alTerminar) {
  const { cerrar } = crearModal({
    titulo: 'Editar reporte',
    contenido: `
      <form id="formEditar">
        <div style="background:var(--bg1);border-radius:8px;padding:.6rem .8rem;margin-bottom:1rem;font-size:.8rem;color:var(--text3)">
          <strong>Tipo:</strong> ${obj.tipo_reporte === 'encontrado' ? '✅ Encontrado' : '❌ Perdido'}
          &nbsp;·&nbsp; <strong>Estado:</strong> ${obj.estado}
          &nbsp;·&nbsp; <strong>Reportante:</strong> ${obj.reportante?.nombre_completo||'—'}
        </div>
        ${obj.ruta_imagen?`<div style="margin-bottom:.8rem"><img src="${obj.ruta_imagen}" style="height:100px;object-fit:cover;border-radius:6px" alt="Imagen actual"><div style="font-size:.74rem;color:var(--text3);margin-top:.2rem">Imagen actual</div></div>`:''}
        <div class="campo-grupo">
          <label class="campo-label req">Título</label>
          <input name="titulo" class="campo-input" value="${obj.titulo}" required>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div class="campo-grupo">
            <label class="campo-label req">Categoría</label>
            <select name="categoria" class="campo-select" required>
              <option value="electronico" ${obj.categoria==='electronico'?'selected':''}>📱 Electrónico</option>
              <option value="documento"  ${obj.categoria==='documento'?'selected':''}>📄 Documento</option>
              <option value="accesorio"  ${obj.categoria==='accesorio'?'selected':''}>👜 Accesorio</option>
              <option value="ropa"       ${obj.categoria==='ropa'?'selected':''}>👕 Ropa</option>
              <option value="maleta"     ${obj.categoria==='maleta'?'selected':''}>🎒 Maleta/Mochila</option>
              <option value="llaves"     ${obj.categoria==='llaves'?'selected':''}>🔑 Llaves</option>
              <option value="gafas"      ${obj.categoria==='gafas'?'selected':''}>👓 Gafas</option>
              <option value="libro"      ${obj.categoria==='libro'?'selected':''}>📚 Libros</option>
              <option value="otro"       ${obj.categoria==='otro'?'selected':''}>📦 Otro</option>
            </select>
          </div>
          <div class="campo-grupo">
            <label class="campo-label req">Sede</label>
            <select name="sede" class="campo-select" required>
              <option value="Sede Robledo"     ${obj.sede==='Sede Robledo'?'selected':''}>Sede Robledo</option>
              <option value="Sede Fraternidad" ${obj.sede==='Sede Fraternidad'?'selected':''}>Sede Fraternidad</option>
              <option value="Sede Floresta"    ${obj.sede==='Sede Floresta'?'selected':''}>Sede Floresta</option>
              <option value="Sede Prado"       ${obj.sede==='Sede Prado'?'selected':''}>Sede Prado</option>
              <option value="Sede Castilla"    ${obj.sede==='Sede Castilla'?'selected':''}>Sede Castilla</option>
            </select>
          </div>
        </div>
        <div class="campo-grupo">
          <label class="campo-label req">Lugar específico</label>
          <input name="lugar_especifico" class="campo-input" value="${obj.lugar_especifico||obj.ubicacion||''}" required>
        </div>
        <div class="campo-grupo">
          <label class="campo-label">Hora ${obj.tipo_reporte === 'encontrado' ? 'encontrado' : 'perdido'}</label>
          <input name="hora_ocurrencia" type="time" class="campo-input" value="${obj.hora_ocurrencia||''}">
        </div>
        <div class="campo-grupo">
          <label class="campo-label">Punto de custodia</label>
          <select name="opcion_custodia" id="selCustodiaEdit" class="campo-select">
            <option value="">Sin cambio (mantener actual)</option>
            <option value="oficina" ${obj.punto_custodia?.startsWith('Oficina')?'selected':''}>En objetos perdidos (según sede)</option>
            <option value="otro" ${obj.punto_custodia && !obj.punto_custodia.startsWith('Oficina')?'selected':''}>En otro lugar</option>
          </select>
        </div>
        <div class="campo-grupo ${obj.punto_custodia && !obj.punto_custodia.startsWith('Oficina') ? '' : 'oculto'}" id="campoCustodiaOtroEdit">
          <label class="campo-label">¿En qué lugar lo dejaste?</label>
          <input id="inputCustodiaOtroEdit" class="campo-input" value="${obj.punto_custodia && !obj.punto_custodia.startsWith('Oficina') ? obj.punto_custodia : ''}" placeholder="Ej: Portería Bloque A...">
        </div>
        <div class="campo-grupo">
          <label class="campo-label req">Descripción</label>
          <textarea name="descripcion" class="campo-textarea" required>${obj.descripcion}</textarea>
        </div>
        <div class="campo-grupo">
          <label class="campo-label">Fotografía (opcional — reemplaza la actual)</label>
          <label class="zona-carga" for="campoImgEdit">
            <div style="color:var(--text3);font-size:.875rem">Haz clic para subir imagen</div>
            <input type="file" name="imagen" accept="image/*" id="campoImgEdit" style="display:none">
          </label>
          <img id="prevImgEdit" class="imagen-previa oculto">
        </div>
        <button type="submit" class="btn btn-purple btn-full btn-lg" id="btnGuardarEdit">Guardar cambios</button>
      </form>`,
  });
  setTimeout(() => {
    const imgInput = document.getElementById('campoImgEdit');
    const prev = document.getElementById('prevImgEdit');
    imgInput?.addEventListener('change', () => {
      if (imgInput.files[0]) { prev.src = URL.createObjectURL(imgInput.files[0]); prev.classList.remove('oculto'); }
    });
    const selCust = document.getElementById('selCustodiaEdit');
    const campoCustOtro = document.getElementById('campoCustodiaOtroEdit');
    selCust?.addEventListener('change', () => {
      campoCustOtro?.classList.toggle('oculto', selCust.value !== 'otro');
    });
    let saving = false;
    document.getElementById('formEditar')?.addEventListener('submit', async e => {
      e.preventDefault();
      if (saving) return; saving = true;
      const btn = document.getElementById('btnGuardarEdit');
      botonCargando(btn, true);
      const fd = new FormData(e.target);
      const datos = new FormData();
      datos.set('titulo',           fd.get('titulo'));
      datos.set('categoria',        fd.get('categoria'));
      datos.set('sede',             fd.get('sede'));
      datos.set('lugar_especifico', fd.get('lugar_especifico'));
      datos.set('ubicacion',        fd.get('lugar_especifico'));
      datos.set('descripcion',      fd.get('descripcion'));
      if (fd.get('hora_ocurrencia')) datos.set('hora_ocurrencia', fd.get('hora_ocurrencia'));
      const opCust = fd.get('opcion_custodia');
      if (opCust === 'oficina') datos.set('punto_custodia', `Oficina de objetos perdidos — ${fd.get('sede')}`);
      else if (opCust === 'otro') datos.set('punto_custodia', document.getElementById('inputCustodiaOtroEdit')?.value || '');
      if (imgInput?.files[0]) datos.set('imagen', imgInput.files[0]);
      try {
        const esAdmin = estado.usuario?.rol === 'admin' || estado.usuario?.rol === 'custodia';
        if (esAdmin) {
          await Reportes.adminEditar(obj.id, datos);
        } else {
          await Reportes.actualizar(obj.id, datos);
        }
        cerrar(); mostrarToast('Reporte actualizado','success'); alTerminar?.();
      } catch (err) {
        mostrarToast(err.message,'error'); botonCargando(btn,false); saving=false;
      }
    });
  }, 50);
}

function abrirModalRecuperacion() {
  const { cerrar } = crearModal({
    titulo: 'Recuperar contraseña',
    contenido: `
      <p style="font-size:.85rem;color:var(--text3);margin-bottom:1.2rem">Ingresa tu correo institucional, número de documento y tu nueva contraseña.</p>
      <div class="campo-grupo">
        <label class="campo-label req">Correo institucional</label>
        <input id="recCorreo" type="email" class="campo-input" placeholder="juan.perez@correo.itm.edu.co" required>
      </div>
      <div class="campo-grupo">
        <label class="campo-label req">Número de documento</label>
        <input id="recDoc" type="text" class="campo-input" placeholder="Número de documento" required>
      </div>
      <div class="campo-grupo">
        <label class="campo-label req">Nueva contraseña</label>
        <input id="recNuevaPwd" type="password" class="campo-input" placeholder="Mínimo 8 caracteres" required>
      </div>
      <div id="errRec" style="margin-bottom:.5rem"></div>`,
    pie: `<button class="btn btn-contorno btn-sm" id="btnCancelarRec">Cancelar</button>
          <button class="btn btn-purple btn-sm" id="btnEnviarRec">Cambiar contraseña</button>`,
  });
  setTimeout(() => {
    document.getElementById('btnCancelarRec')?.addEventListener('click', cerrar);
    document.getElementById('btnEnviarRec')?.addEventListener('click', async () => {
      const correo = document.getElementById('recCorreo')?.value.trim();
      const doc = document.getElementById('recDoc')?.value.trim();
      const nuevaPwd = document.getElementById('recNuevaPwd')?.value;
      const err = document.getElementById('errRec');
      if (!correo || !doc || !nuevaPwd) { if(err){err.className='auth-error';err.textContent='Completa todos los campos.';} return; }
      if (!correo.endsWith('@correo.itm.edu.co')) { if(err){err.className='auth-error';err.textContent='Ingresa un correo institucional válido.';} return; }
      if (nuevaPwd.length < 8) { if(err){err.className='auth-error';err.textContent='La contraseña debe tener mínimo 8 caracteres.';} return; }
      const btn = document.getElementById('btnEnviarRec');
      botonCargando(btn, true);
      try {
        await fetch('/api/auth/recuperar-contrasena', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ correo, numero_documento: doc, nueva_contrasena: nuevaPwd }),
        }).then(r => { if(!r.ok) return r.json().then(d=>{ throw new Error(d.detail||'Correo o documento incorrecto.'); }); return r.json(); });
        cerrar();
        mostrarToast('Contraseña actualizada. Inicia sesión.', 'success');
        navegar('iniciar-sesion');
      } catch(e) {
        if(err){err.className='auth-error';err.textContent=e.message;}
        botonCargando(btn, false);
      }
    });
  }, 50);
}

function renderRegistro() {
  document.getElementById('aplicacion').innerHTML = `
    <div class="auth-registro-bg">
      <div class="registro-card">
        <div style="font-size:.73rem;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:.1em;margin-bottom:.75rem">ITM — Institución Universitaria</div>
        <h1 class="registro-titulo">Crear cuenta</h1>
        <p class="registro-sub">Usa tu correo institucional @correo.itm.edu.co</p>
        <form id="formRegistro">
          <div class="campo-grupo">
            <label class="campo-label req">Nombre completo</label>
            <input name="nombre_completo" class="campo-input" placeholder="Juan Pérez García" required>
          </div>
          <div class="campo-grupo">
            <label class="campo-label req">Correo institucional</label>
            <input name="correo" type="email" class="campo-input" placeholder="juan.perez@correo.itm.edu.co" required>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
            <div class="campo-grupo">
              <label class="campo-label req">Documento</label>
              <input name="numero_documento" type="text" class="campo-input" placeholder="Número de documento" required>
            </div>
            <div class="campo-grupo">
              <label class="campo-label req">Rol</label>
              <select name="rol" class="campo-select">
                <option value="estudiante">Estudiante</option>
                <option value="profesor">Profesor</option>
              </select>
            </div>
          </div>
          <div class="campo-grupo">
            <label class="campo-label req">Contraseña</label>
            <input name="contrasena" type="password" class="campo-input" placeholder="Mínimo 8 caracteres" autocomplete="new-password" required>
          </div>
          <div id="errReg" style="margin-bottom:.75rem"></div>
          <button type="submit" class="registro-btn" id="btnCrearCuenta">Crear cuenta</button>
        </form>
        <div style="text-align:center;margin-top:1.25rem;font-size:.82rem;color:var(--text3)">
          ¿Ya tienes cuenta? <a href="#iniciar-sesion" style="color:var(--purple);font-weight:600">Iniciar sesión</a>
        </div>
      </div>
    </div>`;

  document.getElementById('formRegistro')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('btnCrearCuenta');
    const err = document.getElementById('errReg');
    const fd = new FormData(e.target);
    const correo = (fd.get('correo') || '').trim();
    if (!correo.endsWith('@correo.itm.edu.co')) {
      if(err){err.className='auth-error';err.textContent='No eres parte de esta institución. Solo se aceptan correos @correo.itm.edu.co';}
      return;
    }
    const datos = Object.fromEntries(fd.entries());
    datos.nombre_usuario = correo.replace('@correo.itm.edu.co', '');
    botonCargando(btn, true);
    if(err) err.textContent='';
    try {
      await Autenticacion.registrar(datos);
      mostrarToast('Cuenta creada. Inicia sesión.','success');
      window.location.hash = '#iniciar-sesion';
      navegar('iniciar-sesion');
    } catch (e) {
      if(err){err.className='auth-error';err.textContent=e.message;}
      botonCargando(btn, false);
    }
  });
}

/* ═══════════════════════════════════════════════════
   UTILIDADES
═══════════════════════════════════════════════════ */
function cerrarSesion() {
  mostrarConfirmacion('¿Deseas cerrar sesión?', () => {
    TokenSesion.limpiar(); AlmacenUsuario.limpiar();
    estado.usuario = null;
    detenerPolling();
    window.location.hash = '#inicio';
    navegar('inicio');
    mostrarToast('Sesión cerrada correctamente','info');
  });
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  if (!sb) return;
  const existingOverlay = document.getElementById('sbOverlay');
  if (existingOverlay) { sb.classList.remove('abierta'); existingOverlay.remove(); return; }
  sb.classList.add('abierta');
  const overlay = document.createElement('div');
  overlay.id = 'sbOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.42);z-index:99;';
  overlay.addEventListener('click', () => { sb.classList.remove('abierta'); overlay.remove(); });
  document.body.appendChild(overlay);
}

async function actualizarBadgeNotif() {
  try {
    const { cantidad } = await Notificaciones.cantidadNoLeidas();
    const g = document.getElementById('globoNotif');
    if (g) { g.textContent = cantidad > 9 ? '9+' : cantidad; g.classList.toggle('oculto', cantidad === 0); }
  } catch(_){}
}

async function iniciarPolling() {
  actualizarBadgeNotif();
  if (estado.intervaloNotif) return;
  estado.intervaloNotif = setInterval(actualizarBadgeNotif, 15000);
}

function detenerPolling() {
  clearInterval(estado.intervaloNotif);
  estado.intervaloNotif = null;
}

/* ── Routing ─────────────────────────────────────── */
window.addEventListener('hashchange', () => {
  document.querySelectorAll('.btn-fab,.fab-menu').forEach(b => { b._removeHandler?.(); b.remove(); });
  document.querySelectorAll('.fondo-modal').forEach(m => m.remove());
  document.getElementById('sbOverlay')?.remove();
  document.getElementById('sidebar')?.classList.remove('abierta');
  const h = window.location.hash.slice(1);
  estado.vista = h || 'inicio';
  estado.filtros = { tipo_reporte:'', categoria:'', sede:'', busqueda:'' };
  renderApp();
});

document.addEventListener('DOMContentLoaded', () => {
  const h = window.location.hash.slice(1) || 'inicio';
  estado.vista = h;
  renderApp();
});
