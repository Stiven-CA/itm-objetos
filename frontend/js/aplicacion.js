/**
 * aplicacion.js — Punto de entrada y router de la SPA.
 * Principio SOLID — Responsabilidad Única: orquesta vistas y navegación.
 * Patrón Observer: escucha cambios de hash para enrutar.
 * Patrón Module: importa módulos con responsabilidades separadas.
 */

import { TokenSesion, AlmacenUsuario, Autenticacion, Reportes, Reclamaciones, Chat, Notificaciones, Administracion } from './api.js';
import { mostrarToast, crearModal, mostrarConfirmacion, insigniaEstado, nombreCategoria, iconoCategoria, tiempoRelativo, formatearFecha, iniciales, botonCargando } from './interfaz.js';

// ── Estado global de la aplicación ───────────────────────
const estado = {
  usuario: AlmacenUsuario.obtener(),
  filtros: { tipo_reporte: '', categoria: '', sede: '', busqueda: '' },
  vista: 'inicio',
  intervaloNotif: null,
};

// ── Router ────────────────────────────────────────────────
function navegar(vista, parametros = {}) {
  estado.vista = vista;
  if (parametros) Object.assign(estado.filtros, parametros);
  renderizarAplicacion();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Renderizado principal ─────────────────────────────────
function renderizarAplicacion() {
  const hash = window.location.hash.slice(1) || 'inicio';
  const vista = estado.vista || hash;

  const vistasProtegidas = ['mis-reportes', 'notificaciones',
    'admin-reportes', 'admin-reclamaciones', 'admin-usuarios'];
  if (vistasProtegidas.includes(vista) && !estado.usuario) {
    window.location.hash = '#iniciar-sesion';
    return;
  }

  if (vista === 'iniciar-sesion' || vista === 'registrarse') {
    renderizarPaginaAuth(vista);
    return;
  }

  // Estructura principal con navbar, filtros, contenido y pie
  document.getElementById('aplicacion').innerHTML = `
    <nav class="barra-nav" id="barraNav"></nav>
    <div class="barra-filtros" id="barraFiltros"></div>
    <main id="contenidoPrincipal"></main>
    <footer class="pie-pagina">
      <div class="contenedor">
        <div class="interior-pie">
          <div>
            <div class="marca-pie">ITM — Objetos Perdidos y Encontrados</div>
            <div style="margin-top:.25rem">Institución Universitaria ITM · Medellín, Colombia</div>
          </div>
          <div style="font-size:.8rem;color:rgba(255,255,255,.5)">
            Diseño de Sistemas de Información
          </div>
          <div class="info-pie">
            <div>Medellín, Antioquia</div>
          </div>
        </div>
      </div>
    </footer>
  `;

  construirBarraNav();
  construirFiltros();
  construirBusqueda();

  // Botón flotante para reportar
  document.querySelectorAll('.btn-flotante, .menu-fab').forEach(b => b.remove());
  if (estado.usuario) {
    // Botón flotante con menú para reportar perdido o encontrado
    const fab = document.createElement('div');
    fab.className = 'btn-flotante';
    fab.title = 'Publicar reporte';
    fab.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14m-7-7h14"/></svg>`;

    const menuFab = document.createElement('div');
    menuFab.className = 'menu-fab oculto';
    menuFab.innerHTML = `
      <button class="opcion-fab opcion-fab-encontrado" id="fabEncontrado">
        <span>✅</span> Registrar objeto encontrado
      </button>
      <button class="opcion-fab opcion-fab-perdido" id="fabPerdido">
        <span>❌</span> Reportar objeto perdido
      </button>
    `;

    fab.addEventListener('click', (e) => {
      e.stopPropagation();
      menuFab.classList.toggle('oculto');
    });
    document.addEventListener('click', () => menuFab.classList.add('oculto'));

    document.body.appendChild(menuFab);
    document.body.appendChild(fab);

    setTimeout(() => {
      document.getElementById('fabEncontrado')?.addEventListener('click', (e) => {
        e.stopPropagation();
        menuFab.classList.add('oculto');
        abrirModalCrearReporte('encontrado');
      });
      document.getElementById('fabPerdido')?.addEventListener('click', (e) => {
        e.stopPropagation();
        menuFab.classList.add('oculto');
        abrirModalCrearReporte('perdido');
      });
    }, 50);
  }

  const contenido = document.getElementById('contenidoPrincipal');
  switch (vista) {
    case 'inicio':
    case 'encontrados':
    case 'perdidos':
      if (vista === 'encontrados') estado.filtros.tipo_reporte = 'encontrado';
      if (vista === 'perdidos')    estado.filtros.tipo_reporte = 'perdido';
      renderizarInicio(contenido);
      break;
    case 'mis-reportes':         renderizarMisReportes(contenido);          break;
    case 'notificaciones':       renderizarNotificaciones(contenido);        break;
    case 'admin-reportes':       renderizarAdminReportes(contenido);         break;
    case 'admin-reclamaciones':  renderizarAdminReclamaciones(contenido);    break;
    case 'admin-usuarios':       renderizarAdminUsuarios(contenido);         break;
    default: navegar('inicio');
  }

  if (estado.usuario) iniciarPolling();
}

// ── Barra de navegación ───────────────────────────────────
function construirBarraNav() {
  const nav = document.getElementById('barraNav');
  if (!nav) return;
  const u = estado.usuario;

  nav.innerHTML = `
    <div class="contenedor">
      <div class="barra-nav-interior">
        <button class="btn-nav" id="btnMenu" aria-label="Abrir menú">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/>
            <line x1="4" x2="20" y1="18" y2="18"/>
          </svg>
        </button>
        <div class="marca-nav">
          <div class="marca-nav-textos">
            <span>Institución Universitaria ITM</span>
            <span class="marca-nav-titulo">Objetos Perdidos y Encontrados</span>
          </div>
        </div>
        <div class="busqueda-nav">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input type="search" id="campoBusqueda" placeholder="Buscar objeto..." autocomplete="off">
        </div>
        <div class="acciones-nav">
          ${u ? `
            <div class="desplegable" id="contenedorNotif" style="position:relative">
              <button class="btn-nav btn-notif-nav" id="btnNotificaciones" aria-label="Notificaciones">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                </svg>
                <span class="globo-notif oculto" id="globoNotif">0</span>
              </button>
            </div>
            <div class="desplegable" style="position:relative">
              <button class="btn-avatar" id="btnMenuUsuario" title="${u.nombre_completo}">
                ${iniciales(u.nombre_completo)}
              </button>
              <div class="menu-desplegable oculto" id="menuUsuario">
                <div style="padding:.75rem 1rem .5rem;border-bottom:1px solid var(--gris-borde)">
                  <div style="font-weight:600;font-size:.875rem">${u.nombre_completo}</div>
                  <div style="font-size:.75rem;color:var(--gris-medio)">${u.correo}</div>
                </div>
                <div class="item-menu" id="irMisReportes">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Mis reportes
                </div>
                <div class="item-menu" id="irNotificaciones">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                  Notificaciones
                </div>
                ${u.rol === 'admin' ? `
                <div class="separador-menu"></div>
                <div class="item-menu" id="irAdminReportes">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                  Todos los reportes
                </div>
                <div class="item-menu" id="irAdminReclamaciones">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Reclamaciones
                </div>
                <div class="item-menu" id="irAdminUsuarios">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  Usuarios
                </div>` : ''}
                <div class="separador-menu"></div>
                <div class="item-menu peligro" id="btnCerrarSesion">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                  Cerrar sesión
                </div>
              </div>
            </div>
          ` : `
            <a href="#iniciar-sesion" class="btn-nav">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>
              Iniciar sesión
            </a>
          `}
        </div>
      </div>
    </div>
  `;

  document.getElementById('btnMenu')?.addEventListener('click', abrirBarraLateral);

  const menuUsuario = document.getElementById('menuUsuario');
  document.getElementById('btnMenuUsuario')?.addEventListener('click', (e) => {
    e.stopPropagation(); menuUsuario?.classList.toggle('oculto');
  });
  document.addEventListener('click', () => menuUsuario?.classList.add('oculto'));

  document.getElementById('btnCerrarSesion')?.addEventListener('click', cerrarSesion);
  document.getElementById('irMisReportes')?.addEventListener('click', () => navegar('mis-reportes'));
  document.getElementById('irNotificaciones')?.addEventListener('click', () => navegar('notificaciones'));
  document.getElementById('irAdminReportes')?.addEventListener('click', () => navegar('admin-reportes'));
  document.getElementById('irAdminReclamaciones')?.addEventListener('click', () => navegar('admin-reclamaciones'));
  document.getElementById('irAdminUsuarios')?.addEventListener('click', () => navegar('admin-usuarios'));
  document.getElementById('btnNotificaciones')?.addEventListener('click', (e) => {
    e.stopPropagation(); abrirPanelNotificaciones(e);
  });
}

// ── Filtros ───────────────────────────────────────────────
function construirFiltros() {
  const barra = document.getElementById('barraFiltros');
  if (!barra) return;
  barra.innerHTML = `
    <div class="contenedor">
      <div class="filtros-interior">
        <button class="tab-filtro ${!estado.filtros.tipo_reporte ? 'activo' : ''}" data-tipo="">Todos</button>
        <button class="tab-filtro ${estado.filtros.tipo_reporte === 'encontrado' ? 'activo' : ''}" data-tipo="encontrado">Encontrados</button>
        <button class="tab-filtro ${estado.filtros.tipo_reporte === 'perdido' ? 'activo' : ''}" data-tipo="perdido">Perdidos</button>
        <div style="width:1px;background:var(--gris-borde);height:24px;flex-shrink:0"></div>
        <select class="selector-filtro" id="filtroCategoria">
          <option value="">Todas las categorías</option>
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
        <select class="selector-filtro" id="filtroSede">
          <option value="">Todas las sedes</option>
          <option value="Sede Robledo">Sede Robledo</option>
          <option value="Sede Fraternidad">Sede Fraternidad</option>
          <option value="Sede Floresta">Sede Floresta</option>
          <option value="Sede Prado">Sede Prado</option>
          <option value="Sede Castilla">Sede Castilla</option>
        </select>
      </div>
    </div>
  `;

  // Restaurar valores seleccionados al estado actual (fix: selects siempre coinciden con estado.filtros)
  const selCat  = document.getElementById('filtroCategoria');
  const selSede = document.getElementById('filtroSede');
  if (selCat  && estado.filtros.categoria) selCat.value  = estado.filtros.categoria;
  if (selSede && estado.filtros.sede)      selSede.value = estado.filtros.sede;

  barra.querySelectorAll('.tab-filtro').forEach(tab => {
    tab.addEventListener('click', () => {
      estado.filtros.tipo_reporte = tab.dataset.tipo || '';
      navegar('inicio');
    });
  });
  document.getElementById('filtroCategoria')?.addEventListener('change', (e) => {
    estado.filtros.categoria = e.target.value;   // '' = todas las categorías
    navegar('inicio');
  });
  document.getElementById('filtroSede')?.addEventListener('change', (e) => {
    estado.filtros.sede = e.target.value;         // '' = todas las sedes
    navegar('inicio');
  });
}

function construirBusqueda() {
  let tiempo;
  document.getElementById('campoBusqueda')?.addEventListener('input', (e) => {
    clearTimeout(tiempo);
    tiempo = setTimeout(() => { estado.filtros.busqueda = e.target.value; navegar('inicio'); }, 400);
  });
}

// ── Vista de inicio ───────────────────────────────────────
async function renderizarInicio(contenedor) {
  const textoVista = estado.filtros.tipo_reporte === 'encontrado' ? 'Objetos Encontrados'
    : estado.filtros.tipo_reporte === 'perdido' ? 'Objetos Perdidos' : 'Todos los objetos';
  const esAdmin = estado.usuario?.rol === 'admin';
  contenedor.innerHTML = `
    <div class="contenedor contenido-pagina">
      ${esAdmin ? `
      <div style="background:linear-gradient(135deg,var(--azul-itm),var(--morado-itm));color:white;border-radius:var(--radio-l);padding:1.1rem 1.5rem;margin-bottom:1.5rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.75rem">
        <div>
          <div style="font-weight:700;font-size:.95rem;margin-bottom:.2rem">Panel de administración</div>
          <div style="font-size:.82rem;opacity:.85">Gestiona todos los reportes, reclamaciones y usuarios desde aquí</div>
        </div>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          <button class="btn btn-chico" style="background:rgba(255,255,255,.2);color:white;border:1px solid rgba(255,255,255,.3)" id="btnIrAdminReportes">📋 Todos los reportes</button>
          <button class="btn btn-chico" style="background:rgba(255,255,255,.2);color:white;border:1px solid rgba(255,255,255,.3)" id="btnIrAdminReclamos">🔒 Reclamaciones</button>
          <button class="btn btn-chico" style="background:rgba(255,255,255,.2);color:white;border:1px solid rgba(255,255,255,.3)" id="btnIrAdminUsuarios2">👥 Usuarios</button>
        </div>
      </div>` : ''}
      <div class="encabezado-seccion">
        <h2 class="titulo-seccion">${textoVista}</h2>
        <span class="contador-objetos" id="contadorObjetos">Cargando...</span>
      </div>
      <div class="cuadricula-objetos" id="cuadriculaObjetos">
        <div class="girador"></div>
      </div>
    </div>
  `;

  if (esAdmin) {
    document.getElementById('btnIrAdminReportes')?.addEventListener('click', () => navegar('admin-reportes'));
    document.getElementById('btnIrAdminReclamos')?.addEventListener('click', () => navegar('admin-reclamaciones'));
    document.getElementById('btnIrAdminUsuarios2')?.addEventListener('click', () => navegar('admin-usuarios'));
  }
  try {
    const parametros = {};
    if (estado.filtros.tipo_reporte) parametros.tipo = estado.filtros.tipo_reporte;
    if (estado.filtros.categoria)    parametros.categoria = estado.filtros.categoria;
    if (estado.filtros.sede)         parametros.sede = estado.filtros.sede;
    if (estado.filtros.busqueda)     parametros.busqueda = estado.filtros.busqueda;

    const objetos = await Reportes.listar(parametros);
    const cuadricula = document.getElementById('cuadriculaObjetos');
    const contador   = document.getElementById('contadorObjetos');
    if (!objetos.length) {
      cuadricula.innerHTML = `
        <div class="estado-vacio" style="grid-column:1/-1">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <h3>No se encontraron objetos</h3>
          <p>Prueba con otros filtros o publica el tuyo.</p>
        </div>`;
      return;
    }
    cuadricula.innerHTML = '';
    objetos.forEach(obj => cuadricula.appendChild(construirTarjetaObjeto(obj)));
  } catch (err) {
    document.getElementById('cuadriculaObjetos').innerHTML =
      `<div class="estado-vacio" style="grid-column:1/-1"><h3>Error al cargar</h3><p>${err.message}</p></div>`;
  }
}

// ── Tarjeta de objeto ─────────────────────────────────────
function construirTarjetaObjeto(obj) {
  const tarjeta = document.createElement('div');
  tarjeta.className = 'tarjeta-objeto';
  const esPropietario = estado.usuario?.id === obj.reportante?.id;
  const estadosReclamables = ['encontrado', 'perdido'];
  const puedeReclamar = estado.usuario && !esPropietario && estadosReclamables.includes(obj.estado);
  const btnLabel = obj.tipo_reporte === 'perdido' ? '¡Lo encontré! — Reportar' : '¿Es tuyo? — Reclamar';

  tarjeta.innerHTML = `
    ${obj.ruta_imagen
      ? `<img class="imagen-tarjeta" src="${obj.ruta_imagen}" alt="${obj.titulo}" loading="lazy">`
      : `<div class="imagen-tarjeta-vacia"><span style="font-size:3rem">${iconoCategoria(obj.categoria)}</span></div>`}
    <div class="cuerpo-tarjeta">
      <div class="fila-titulo-tarjeta">
        <h3 class="titulo-tarjeta">${obj.titulo}</h3>
        ${insigniaEstado(obj.estado)}
      </div>
      <div class="meta-tarjeta">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        ${obj.sede || 'Sede no especificada'}
      </div>
      <div class="meta-tarjeta">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        ${tiempoRelativo(obj.creado_en)}
      </div>
      ${puedeReclamar ? `<button class="btn-reclamar" data-id="${obj.id}">${btnLabel}</button>` : ''}
      ${esPropietario ? `<p class="texto-muy-chico texto-gris texto-centrado margen-arriba">Tu publicación</p>` : ''}
    </div>
    <div class="pie-tarjeta">
      <div class="reportante-tarjeta">
        <div class="avatar-reportante">${iniciales(obj.reportante?.nombre_completo || '')}</div>
        <span class="nombre-reportante">${obj.reportante?.nombre_completo || 'Anónimo'}</span>
      </div>
      <span class="etiqueta-categoria">${nombreCategoria(obj.categoria)}</span>
    </div>
  `;

  tarjeta.addEventListener('click', (e) => {
    if (e.target.closest('.btn-reclamar')) {
      e.stopPropagation(); abrirModalReclamar(obj);
    } else {
      abrirModalDetalle(obj);
    }
  });
  return tarjeta;
}

// ── Modal de detalle ──────────────────────────────────────
function abrirModalDetalle(obj) {
  const esPropietario = estado.usuario?.id === obj.reportante?.id;
  const estadosReclamables = ['encontrado', 'perdido'];
  const puedeReclamar = estado.usuario && !esPropietario && estadosReclamables.includes(obj.estado);
  const btnLabel = obj.tipo_reporte === 'perdido' ? '¡Lo encontré! — Reportar' : '¿Es tuyo? — Reclamar';

  // El reportante puede chatear si hay una reclamación pendiente sin custodia
  const puedeChatear = estado.usuario && obj.estado === 'pendiente_reclamacion';

  const pieBotones = [
    puedeReclamar ? `<button class="btn btn-morado" id="btnReclamarDetalle">${btnLabel}</button>` : '',
    puedeChatear  ? `<button class="btn btn-contorno" id="btnChatDetalle">💬 Chat directo</button>` : '',
  ].filter(Boolean).join('');

  const { cerrar } = crearModal({
    titulo: 'Detalle del objeto',
    contenido: `
      ${obj.ruta_imagen
        ? `<img class="imagen-detalle" src="${obj.ruta_imagen}" alt="${obj.titulo}">`
        : `<div class="imagen-detalle-vacia"><svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>`}
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:.75rem;margin-bottom:.5rem">
        <h2 class="titulo-detalle">${obj.titulo}</h2>
        ${insigniaEstado(obj.estado)}
      </div>
      <p style="color:var(--gris-medio);margin-bottom:1rem;line-height:1.7">${obj.descripcion}</p>
      <div class="cuadricula-meta-detalle">
        <div class="item-meta-detalle">
          <div class="etiqueta-meta-detalle">Categoría</div>
          <div class="valor-meta-detalle">${nombreCategoria(obj.categoria)}</div>
        </div>
        <div class="item-meta-detalle">
          <div class="etiqueta-meta-detalle">Tipo</div>
          <div class="valor-meta-detalle">${obj.tipo_reporte === 'encontrado' ? '✅ Encontrado' : '❌ Perdido'}</div>
        </div>
        <div class="item-meta-detalle">
          <div class="etiqueta-meta-detalle">Ubicación</div>
          <div class="valor-meta-detalle">${obj.sede || ''} ${obj.lugar_especifico ? '— ' + obj.lugar_especifico : obj.ubicacion}</div>
        </div>
        <div class="item-meta-detalle">
          <div class="etiqueta-meta-detalle">Fecha reporte</div>
          <div class="valor-meta-detalle">${formatearFecha(obj.creado_en)}</div>
        </div>
      </div>
      ${obj.punto_custodia && obj.punto_custodia !== 'Lo tiene el reportante' ? `
        <div style="background:var(--azul-palido);border:1px solid var(--azul-claro);border-radius:var(--radio-s);padding:.75rem 1rem;margin-bottom:1rem">
          <div style="font-size:.78rem;font-weight:700;color:var(--azul-itm);margin-bottom:.2rem">📍 Punto de custodia</div>
          <div style="font-size:.875rem;color:var(--azul-medio)">${obj.punto_custodia}</div>
        </div>` : (obj.punto_custodia === 'Lo tiene el reportante' ? `
        <div style="background:#fef9c3;border:1px solid #fde047;border-radius:var(--radio-s);padding:.75rem 1rem;margin-bottom:1rem">
          <div style="font-size:.78rem;font-weight:700;color:#854d0e;margin-bottom:.2rem">👤 Sin custodia</div>
          <div style="font-size:.875rem;color:#713f12">El reportante aún tiene el objeto. Puedes chatear directamente con él.</div>
        </div>` : '')}
      <div style="display:flex;align-items:center;gap:.6rem;padding-top:.75rem;border-top:1px solid var(--gris-fondo)">
        <div class="avatar-reportante">${iniciales(obj.reportante?.nombre_completo || '')}</div>
        <div>
          <div style="font-size:.8rem;font-weight:600">${obj.reportante?.nombre_completo}</div>
          <div style="font-size:.73rem;color:var(--gris-medio)">Publicado ${tiempoRelativo(obj.creado_en)}</div>
        </div>
      </div>
    `,
    pie: pieBotones,
    tamano: 'ventana-modal-grande',
  });

  setTimeout(() => {
    document.getElementById('btnReclamarDetalle')?.addEventListener('click', () => {
      cerrar(); abrirModalReclamar(obj);
    });
    document.getElementById('btnChatDetalle')?.addEventListener('click', () => {
      cerrar(); abrirModalChat(obj.id);
    });
  }, 50);
}

// ── Modal crear reporte ───────────────────────────────────
function abrirModalCrearReporte(tipoReporte = 'encontrado', alTerminar) {
  if (!estado.usuario) { mostrarToast('Inicia sesión para publicar', 'info'); return; }
  const textoTipo = tipoReporte === 'encontrado' ? 'Registrar objeto encontrado' : 'Reportar objeto perdido';

  const { cerrar } = crearModal({
    titulo: textoTipo,
    contenido: `
      <form id="formularioReporte">
        <div class="grupo-campo">
          <label class="etiqueta-campo requerido">Título del objeto</label>
          <input name="titulo" class="campo-entrada" placeholder="Ej: Billetera negra de cuero" required>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div class="grupo-campo">
            <label class="etiqueta-campo requerido">Categoría</label>
            <select name="categoria" class="campo-selector" required>
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
          <div class="grupo-campo">
            <label class="etiqueta-campo requerido">Sede</label>
            <select name="sede" class="campo-selector" required>
              <option value="">Seleccionar...</option>
              <option value="Sede Robledo">Sede Robledo</option>
              <option value="Sede Fraternidad">Sede Fraternidad</option>
              <option value="Sede Floresta">Sede Floresta</option>
              <option value="Sede Prado">Sede Prado</option>
              <option value="Sede Castilla">Sede Castilla</option>
            </select>
          </div>
        </div>
        <div class="grupo-campo">
          <label class="etiqueta-campo requerido">Lugar específico</label>
          <input name="lugar_especifico" class="campo-entrada" placeholder="Ej: Biblioteca, segundo piso" required>
        </div>
        ${tipoReporte === 'encontrado' ? `
        <div class="grupo-campo">
          <label class="etiqueta-campo requerido">Punto de custodia</label>
          <select name="opcion_custodia" id="selectCustodia" class="campo-selector" required>
            <option value="">Seleccionar...</option>
            <option value="yo">Aún lo tengo yo</option>
            <option value="oficina">En objetos perdidos (según sede)</option>
            <option value="otro">En otro lugar</option>
          </select>
        </div>
        <div class="grupo-campo oculto" id="campoCustodiaOtro">
          <label class="etiqueta-campo requerido">¿En qué lugar lo dejaste?</label>
          <input id="inputCustodiaOtro" class="campo-entrada" placeholder="Ej: Portería Bloque A, sala de profesores...">
        </div>` : ''}
        <div class="grupo-campo">
          <label class="etiqueta-campo">Hora en que fue ${tipoReporte === 'encontrado' ? 'encontrado' : 'perdido'} (uso interno)</label>
          <input type="time" name="hora_ocurrencia" class="campo-entrada">
          <span class="ayuda-campo">Esta información es solo para validación — no será visible públicamente.</span>
        </div>
        <div class="grupo-campo">
          <label class="etiqueta-campo requerido">Descripción detallada</label>
          <textarea name="descripcion" class="campo-area" placeholder="Describe el objeto con detalles que ayuden a identificarlo..." required></textarea>
        </div>
        <div class="grupo-campo">
          <label class="etiqueta-campo">Fotografía del objeto</label>
          <label class="zona-carga" for="campoImagen" style="cursor:pointer">
            <p style="color:var(--gris-medio);font-size:.875rem">Haz clic para subir imagen</p>
            <p style="color:var(--gris-medio);font-size:.75rem">JPG, PNG o WebP</p>
            <input type="file" name="imagen" accept="image/*" id="campoImagen" style="display:none">
          </label>
          <img id="vistaPrevia" class="imagen-previa oculto">
        </div>
        <button type="submit" class="btn btn-morado btn-completo btn-grande" id="btnPublicar">
          ${textoTipo}
        </button>
      </form>
    `,
  });

  setTimeout(() => {
    const campoImg  = document.getElementById('campoImagen');
    const vistaPrevia = document.getElementById('vistaPrevia');
    campoImg?.addEventListener('change', () => {
      const archivo = campoImg.files[0];
      if (archivo) { vistaPrevia.src = URL.createObjectURL(archivo); vistaPrevia.classList.remove('oculto'); }
    });

    // Lógica del selector de custodia
    document.getElementById('selectCustodia')?.addEventListener('change', (e) => {
      const campOtro = document.getElementById('campoCustodiaOtro');
      const inputOtro = document.getElementById('inputCustodiaOtro');
      if (e.target.value === 'otro') {
        campOtro.classList.remove('oculto');
        inputOtro.required = true;
      } else {
        campOtro.classList.add('oculto');
        inputOtro.required = false;
      }
    });

    let enviandoReporte = false;
    document.getElementById('formularioReporte')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (enviandoReporte) return;
      enviandoReporte = true;
      const btn = document.getElementById('btnPublicar');
      botonCargando(btn, true);
      const fd = new FormData(e.target);
      // Mapear nombres del formulario al API
      const datos = new FormData();
      datos.set('tipo_reporte', tipoReporte);
      datos.set('titulo', fd.get('titulo'));
      datos.set('categoria', fd.get('categoria'));
      datos.set('descripcion', fd.get('descripcion'));
      datos.set('ubicacion', fd.get('lugar_especifico'));
      datos.set('sede', fd.get('sede'));
      datos.set('lugar_especifico', fd.get('lugar_especifico'));

      // Resolver punto de custodia según la opción seleccionada
      const opcionCustodia = fd.get('opcion_custodia');
      const sedeSeleccionada = fd.get('sede') || '';
      let valorCustodia = '';
      if (opcionCustodia === 'yo') {
        valorCustodia = 'Lo tiene el reportante';
      } else if (opcionCustodia === 'oficina') {
        valorCustodia = `Oficina de objetos perdidos — ${sedeSeleccionada}`;
      } else if (opcionCustodia === 'otro') {
        valorCustodia = document.getElementById('inputCustodiaOtro')?.value || '';
      }
      if (valorCustodia) datos.set('punto_custodia', valorCustodia);

      const imagen = campoImg?.files[0];
      if (imagen) datos.set('imagen', imagen);
      try {
        await Reportes.crear(datos);
        cerrar();
        mostrarToast('¡Reporte publicado! Quedará visible una vez sea aprobado.', 'success');
        // Resetear filtros preservando el tipo de reporte actual
        estado.filtros = { tipo_reporte: '', categoria: '', sede: '', busqueda: '' };
        navegar('inicio');
        alTerminar?.();
      } catch (err) {
        mostrarToast(err.message, 'error');
        botonCargando(btn, false);
        enviandoReporte = false;
      }
    });
  }, 50);
}

// ── Modal de Chat ─────────────────────────────────────────
async function abrirModalChat(idReporte) {
  if (!estado.usuario) { mostrarToast('Inicia sesión para chatear', 'info'); return; }

  const { cerrar } = crearModal({
    titulo: '💬 Chat directo',
    contenido: `
      <div id="areaMensajesChat" style="height:320px;overflow-y:auto;display:flex;flex-direction:column;gap:.5rem;padding:.5rem;background:var(--gris-fondo);border-radius:var(--radio-s);margin-bottom:.75rem">
        <div class="girador"></div>
      </div>
      <div style="display:flex;gap:.5rem">
        <input id="inputMsgChat" class="campo-entrada" placeholder="Escribe un mensaje..." style="flex:1">
        <button class="btn btn-morado" id="btnEnviarChat">Enviar</button>
      </div>
    `,
    tamano: 'ventana-modal-grande',
  });

  let intervaloChat = null;

  async function cargarMensajes() {
    try {
      const msgs = await Chat.obtenerConversacion(idReporte);
      const area  = document.getElementById('areaMensajesChat');
      if (!area) return;
      const yoId  = estado.usuario.id;
      area.innerHTML = msgs.length === 0
        ? '<p style="color:var(--gris-medio);font-size:.85rem;text-align:center;margin-top:2rem">Aún no hay mensajes. ¡Escribe el primero!</p>'
        : msgs.map(m => {
            const esMio = m.emisor.id === yoId;
            return `
              <div style="display:flex;flex-direction:column;align-items:${esMio ? 'flex-end' : 'flex-start'}">
                <div style="max-width:75%;background:${esMio ? 'var(--morado-itm)' : 'var(--blanco)'};color:${esMio ? 'white' : 'inherit'};padding:.5rem .75rem;border-radius:${esMio ? 'var(--radio-m) var(--radio-m) 2px var(--radio-m)' : 'var(--radio-m) var(--radio-m) var(--radio-m) 2px'};font-size:.85rem;box-shadow:0 1px 2px rgba(0,0,0,.08)">
                  ${m.mensaje}
                </div>
                <span style="font-size:.7rem;color:var(--gris-medio);margin-top:.15rem">${m.emisor.nombre_completo} · ${tiempoRelativo(m.creado_en)}</span>
              </div>`;
          }).join('');
      area.scrollTop = area.scrollHeight;
    } catch (err) {
      const area = document.getElementById('areaMensajesChat');
      if (area) area.innerHTML = `<p style="color:var(--rojo-fuerte);font-size:.85rem;text-align:center">Error al cargar mensajes</p>`;
    }
  }

  await cargarMensajes();
  intervaloChat = setInterval(cargarMensajes, 5000);

  setTimeout(() => {
    const input = document.getElementById('inputMsgChat');
    const btnEnv = document.getElementById('btnEnviarChat');

    async function enviar() {
      const texto = input?.value.trim();
      if (!texto) return;
      input.value = '';
      try {
        await Chat.enviarMensaje(idReporte, { mensaje: texto });
        await cargarMensajes();
      } catch (err) { mostrarToast(err.message, 'error'); }
    }

    btnEnv?.addEventListener('click', enviar);
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } });
  }, 50);

  // Limpiar intervalo al cerrar
  const original = cerrar;
  window._cerrarChatActual = () => {
    clearInterval(intervaloChat);
    original();
  };
}

// ── Modal de reclamación ──────────────────────────────────
function abrirModalReclamar(obj) {
  if (!estado.usuario) { mostrarToast('Inicia sesión para reclamar', 'info'); return; }

  const esPerdido     = obj.tipo_reporte === 'perdido';
  const tieneCustodia = obj.punto_custodia && obj.punto_custodia !== 'Lo tiene el reportante';
  const titulo        = esPerdido ? '¡Encontré este objeto!' : '¿Es tuyo? — Reclamar objeto';
  const pregunta1     = esPerdido ? '¿Qué características tiene el objeto que encontraste?' : '¿Qué características especiales tiene el objeto?';
  const pregunta2     = esPerdido ? '¿Dónde y cuándo lo encontraste?' : '¿Cuándo y dónde lo perdiste?';

  const avisoHtml = tieneCustodia
    ? `<div style="background:var(--naranja-suave);border-radius:var(--radio-s);padding:.75rem;margin-bottom:1.25rem;font-size:.825rem;color:#92400e">
         El objeto está en custodia. Un <strong>administrador</strong> comparará tu información con la del reportante antes de aprobar.
       </div>`
    : `<div style="background:#dcfce7;border:1px solid #86efac;border-radius:var(--radio-s);padding:.75rem;margin-bottom:1.25rem;font-size:.825rem;color:#14532d">
         El reportante aún tiene el objeto. Tu solicitud le llegará <strong>directamente</strong> a él. Si acepta, coordinen la entrega por el chat.
       </div>`;

  const { cerrar } = crearModal({
    titulo,
    contenido: `
      ${avisoHtml}
      <p style="font-weight:600;margin-bottom:1rem">Objeto: <span style="color:var(--morado-itm)">${obj.titulo}</span>
        <span style="font-size:.75rem;color:var(--gris-medio);font-weight:400;margin-left:.5rem">${obj.sede || ''}</span>
      </p>
      <form id="formularioReclamacion">
        <div class="grupo-campo">
          <label class="etiqueta-campo requerido">${pregunta1}</label>
          <input name="respuesta_1" class="campo-entrada" placeholder="Color, marca, modelo, contenido..." required>
        </div>
        <div class="grupo-campo">
          <label class="etiqueta-campo requerido">${pregunta2}</label>
          <input name="respuesta_2" class="campo-entrada" placeholder="Ej: El martes en la cafetería..." required>
        </div>
        <div class="grupo-campo">
          <label class="etiqueta-campo">Detalle que solo el dueño sabría</label>
          <input name="respuesta_3" class="campo-entrada" placeholder="Ej: Tiene una pegatina, un rayón...">
        </div>
        <div class="grupo-campo">
          <label class="etiqueta-campo">Evidencia de propiedad (opcional)</label>
          <label class="zona-carga" for="campoEvidencia" style="cursor:pointer">
            <p style="color:var(--gris-medio);font-size:.875rem">Haz clic para subir imagen</p>
            <input type="file" name="evidencia" accept="image/*" id="campoEvidencia" style="display:none">
          </label>
          <img id="vistaPreviaEvidencia" class="imagen-previa oculto">
        </div>
        <div class="grupo-campo">
          <label class="etiqueta-campo">Notas adicionales</label>
          <textarea name="notas" class="campo-area" placeholder="Cualquier info que ayude a verificar..."></textarea>
        </div>
        <button type="submit" class="btn btn-morado btn-completo btn-grande" id="btnEnviarReclamo">
          ${esPerdido ? 'Enviar — Tengo este objeto' : 'Enviar solicitud de reclamación'}
        </button>
      </form>
    `,
  });

  setTimeout(() => {
    document.getElementById('campoEvidencia')?.addEventListener('change', (e) => {
      const prev = document.getElementById('vistaPreviaEvidencia');
      if (e.target.files[0]) { prev.src = URL.createObjectURL(e.target.files[0]); prev.classList.remove('oculto'); }
    });
    document.getElementById('formularioReclamacion')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnEnviarReclamo');
      botonCargando(btn, true);
      const fd = new FormData(e.target);
      try {
        await Reclamaciones.enviar(obj.id, fd);
        cerrar();
        mostrarToast(tieneCustodia
          ? '¡Solicitud enviada! El administrador la revisará pronto.'
          : '¡Solicitud enviada! El reportante la revisará y podrán chatear directamente.', 'success');
      } catch (err) { mostrarToast(err.message, 'error'); botonCargando(btn, false); }
    });
  }, 50);
}

// ── Mis reportes ──────────────────────────────────────────
async function renderizarMisReportes(contenedor) {
  contenedor.innerHTML = `
    <div class="contenedor contenido-pagina">
      <div class="encabezado-seccion">
        <h2 class="titulo-seccion">Mis reportes</h2>
        <div class="fila">
          <button class="btn btn-contorno" id="btnNuevoPerdido">+ Reportar perdido</button>
          <button class="btn btn-morado" id="btnNuevoEncontrado">+ Registrar encontrado</button>
        </div>
      </div>
      <div class="cuadricula-objetos" id="cuadriculaMis"><div class="girador"></div></div>
    </div>
  `;
  document.getElementById('btnNuevoPerdido')?.addEventListener('click', () =>
    abrirModalCrearReporte('perdido', () => renderizarMisReportes(contenedor)));
  document.getElementById('btnNuevoEncontrado')?.addEventListener('click', () =>
    abrirModalCrearReporte('encontrado', () => renderizarMisReportes(contenedor)));

  try {
    const mis = await Reportes.misReportes();
    const cuadricula = document.getElementById('cuadriculaMis');
    if (!mis.length) {
      cuadricula.innerHTML = `<div class="estado-vacio" style="grid-column:1/-1"><h3>No tienes reportes publicados</h3><p>Publica un objeto perdido o encontrado.</p></div>`;
      return;
    }
    cuadricula.innerHTML = '';
    mis.forEach(obj => {
      const tarjeta = construirTarjetaObjeto(obj);
      // Si hay reclamación pendiente sin custodia → mostrar botones aceptar/rechazar directo
      if (obj.estado === 'pendiente_reclamacion') {
        const pie = tarjeta.querySelector('.pie-tarjeta');
        const contenedorBotones = document.createElement('div');
        contenedorBotones.style.cssText = 'display:flex;gap:.4rem;flex-wrap:wrap;padding:.5rem;border-top:1px solid var(--gris-borde)';
        contenedorBotones.innerHTML = `
          <button class="btn btn-chico" style="background:var(--verde-fuerte);color:white" data-reclamar="aceptar">✓ Aceptar reclamación</button>
          <button class="btn btn-chico btn-contorno" data-reclamar="rechazar">✗ Rechazar</button>
          <button class="btn btn-chico" style="background:var(--azul-medio);color:white" data-reclamar="chat">💬 Chat</button>
        `;
        tarjeta.appendChild(contenedorBotones);
        contenedorBotones.querySelector('[data-reclamar="aceptar"]')?.addEventListener('click', async (e) => {
          e.stopPropagation();
          try {
            const reclamos = await Reclamaciones.delReporte(obj.id);
            const pendiente = reclamos.find(r => r.estado === 'pendiente');
            if (!pendiente) { mostrarToast('No hay reclamación pendiente', 'info'); return; }
            const tieneCustodia = obj.punto_custodia && obj.punto_custodia !== 'Lo tiene el reportante';
            if (tieneCustodia) {
              mostrarToast('Esta reclamación requiere aprobación del administrador', 'info');
            } else {
              await Reclamaciones.responderDirecta(pendiente.id, { accion: 'aprobar' });
              mostrarToast('Reclamación aceptada — el usuario fue notificado', 'success');
              renderizarMisReportes(contenedor);
            }
          } catch (err) { mostrarToast(err.message, 'error'); }
        });
        contenedorBotones.querySelector('[data-reclamar="rechazar"]')?.addEventListener('click', (e) => {
          e.stopPropagation();
          const { cerrar } = crearModal({
            titulo: 'Rechazar reclamación',
            contenido: `<div class="grupo-campo"><label class="etiqueta-campo requerido">Motivo del rechazo</label><textarea id="motivoRechazoDirecto" class="campo-area" placeholder="Explica por qué rechazas..." required></textarea></div>`,
            pie: `<button class="btn btn-contorno" id="btnCancelRD">Cancelar</button><button class="btn btn-peligro" id="btnConfRD">Rechazar</button>`,
          });
          setTimeout(async () => {
            document.getElementById('btnCancelRD')?.addEventListener('click', cerrar);
            document.getElementById('btnConfRD')?.addEventListener('click', async () => {
              const motivo = document.getElementById('motivoRechazoDirecto').value.trim();
              if (!motivo) { mostrarToast('Ingresa un motivo', 'error'); return; }
              try {
                const reclamos = await Reclamaciones.delReporte(obj.id);
                const pendiente = reclamos.find(r => r.estado === 'pendiente');
                if (pendiente) await Reclamaciones.responderDirecta(pendiente.id, { accion: 'rechazar', motivo_rechazo: motivo });
                cerrar(); mostrarToast('Reclamación rechazada', 'info');
                renderizarMisReportes(contenedor);
              } catch (err) { mostrarToast(err.message, 'error'); }
            });
          }, 50);
        });
        contenedorBotones.querySelector('[data-reclamar="chat"]')?.addEventListener('click', (e) => {
          e.stopPropagation(); abrirModalChat(obj.id);
        });
      }
      if (!['entregado','cancelado'].includes(obj.estado)) {
        const pie = tarjeta.querySelector('.pie-tarjeta');
        const btnEliminar = document.createElement('button');
        btnEliminar.className = 'btn btn-peligro btn-chico';
        btnEliminar.textContent = 'Cancelar publicación';
        btnEliminar.addEventListener('click', (e) => {
          e.stopPropagation();
          mostrarConfirmacion('¿Deseas cancelar este reporte? Se eliminará de la lista pública.', async () => {
            try {
              await Reportes.cancelar(obj.id);
              mostrarToast('Reporte cancelado', 'success');
              renderizarMisReportes(contenedor);
            } catch (err) { mostrarToast(err.message, 'error'); }
          });
        });
        pie?.appendChild(btnEliminar);
      }
      cuadricula.appendChild(tarjeta);
    });
  } catch (err) { mostrarToast(err.message, 'error'); }
}

// ── Notificaciones ────────────────────────────────────────
async function renderizarNotificaciones(contenedor) {
  contenedor.innerHTML = `
    <div class="contenedor contenido-pagina">
      <div class="encabezado-seccion">
        <h2 class="titulo-seccion">Notificaciones</h2>
        <button class="btn btn-contorno btn-chico" id="btnMarcarTodas">Marcar todas como leídas</button>
      </div>
      <div id="listaNotificaciones"><div class="girador"></div></div>
    </div>
  `;
  document.getElementById('btnMarcarTodas')?.addEventListener('click', async () => {
    await Notificaciones.marcarTodasLeidas();
    renderizarNotificaciones(contenedor);
  });

  try {
    const notifs = await Notificaciones.listar();
    const lista = document.getElementById('listaNotificaciones');
    if (!notifs.length) {
      lista.innerHTML = `<div class="estado-vacio"><h3>Sin notificaciones</h3><p>Todo tranquilo por ahora.</p></div>`;
      return;
    }
    const iconosNotif = {
      coincidencia: '🔍', reclamo_nuevo: '📩', reclamo_aprobado: '✅',
      reclamo_rechazado: '❌', estado_cambiado: '🔄', reporte_aprobado: '✅',
      reporte_rechazado: '❌', entrega_lista: '📦', reporte_pendiente: '⏳',
      mensaje_directo: '💬', lo_encontre: '🎉',
    };
    lista.innerHTML = `
      <div style="background:var(--blanco);border:1px solid var(--gris-borde);border-radius:var(--radio-l);overflow:hidden">
        ${notifs.map(n => `
          <div class="item-notificacion ${n.leida ? '' : 'no-leida'}" data-id="${n.id}">
            <div class="icono-notif">${iconosNotif[n.tipo] || '🔔'}</div>
            <div class="contenido-notif">
              <div class="titulo-notif">${n.titulo}</div>
              <div class="mensaje-notif">${n.mensaje}</div>
              <div class="hora-notif">${tiempoRelativo(n.creado_en)}</div>
            </div>
            ${!n.leida ? '<div style="width:8px;height:8px;border-radius:50%;background:var(--azul-medio);flex-shrink:0;margin-top:6px"></div>' : ''}
          </div>`).join('')}
      </div>`;
    lista.querySelectorAll('.item-notificacion').forEach(item => {
      item.addEventListener('click', async () => {
        await Notificaciones.marcarLeida(parseInt(item.dataset.id));
        item.classList.remove('no-leida');
        item.querySelector('[style*="8px"]')?.remove();
      });
    });
  } catch (err) { mostrarToast(err.message, 'error'); }
}

// ── Admin — Todos los reportes ────────────────────────────
async function renderizarAdminReportes(contenedor) {
  contenedor.innerHTML = `
    <div class="contenedor contenido-pagina">
      <div class="encabezado-seccion">
        <h2 class="titulo-seccion">Gestión de reportes</h2>
        <span class="contador-objetos" id="contadorAdmin"></span>
      </div>

      <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1.25rem">
        <button class="tab-filtro activo" data-filtro="todos">Todos</button>
        <button class="tab-filtro" data-filtro="encontrado">✅ Encontrados</button>
        <button class="tab-filtro" data-filtro="perdido">❌ Perdidos</button>
        <button class="tab-filtro" data-filtro="cancelado">Cancelados</button>
      </div>

      <div id="listaAdminReportes"><div class="girador"></div></div>
    </div>
  `;

  let filtroActual = 'todos';

  async function cargarReportes() {
    const lista = document.getElementById('listaAdminReportes');
    lista.innerHTML = '<div class="girador"></div>';
    try {
      // Admin sees all reports via public list (no filter = all approved)
      // We also need to fetch pending ones
      const [resPublicos, resPendientes] = await Promise.all([
        Reportes.listar({}).catch(() => []),
        Reportes.pendientes().catch(() => []),
      ]);

      // Garantizar que siempre sean arrays
      const publicos = Array.isArray(resPublicos) ? resPublicos : [];
      const pendientes = Array.isArray(resPendientes) ? resPendientes : [];

      // Merge: pending first, then public (avoid duplicates)
      const idsPublicos = new Set(publicos.map(r => r.id));
      const pendientesNuevos = pendientes.filter(r => !idsPublicos.has(r.id));
      let todos = [...pendientesNuevos, ...publicos];

      // Apply filter
      if (filtroActual !== 'todos') {
        todos = todos.filter(r => r.tipo_reporte === filtroActual || r.estado === filtroActual);
      }

      const contador = document.getElementById('contadorAdmin');
      if (contador) contador.textContent = `${todos.length} reporte${todos.length !== 1 ? 's' : ''}`;

      if (!todos.length) {
        lista.innerHTML = `<div class="estado-vacio"><h3>No hay reportes</h3><p>No se encontraron reportes con ese filtro.</p></div>`;
        return;
      }

      lista.innerHTML = `<div style="display:flex;flex-direction:column;gap:.75rem">
        ${todos.map(r => {
          const esPendiente = !r.aprobado;
          const colorBorde = esPendiente ? 'var(--naranja-fuerte)' : 'var(--gris-borde)';
          return `
          <div style="background:var(--blanco);border:2px solid ${colorBorde};border-radius:var(--radio-m);padding:1.1rem;display:flex;gap:1rem;align-items:flex-start" id="tarjeta-reporte-${r.id}">
            ${r.ruta_imagen
              ? `<img src="${r.ruta_imagen}" alt="${r.titulo}" style="width:80px;height:80px;object-fit:cover;border-radius:var(--radio-s);flex-shrink:0">`
              : `<div style="width:80px;height:80px;background:var(--gris-fondo);border-radius:var(--radio-s);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:2rem">${iconoCategoria(r.categoria)}</div>`}
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap">
                <div style="flex:1;min-width:0">
                  <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem;flex-wrap:wrap">
                    ${esPendiente ? `<span style="background:var(--naranja-suave);color:var(--naranja-fuerte);font-size:.7rem;font-weight:700;padding:.15rem .5rem;border-radius:var(--radio-total);text-transform:uppercase">⏳ Pendiente</span>` : ''}
                    ${insigniaEstado(r.estado)}
                    <span class="insignia" style="background:var(--azul-palido);color:var(--azul-itm)">${r.tipo_reporte === 'encontrado' ? '✅ Encontrado' : '❌ Perdido'}</span>
                  </div>
                  <div style="font-weight:700;font-size:.975rem;margin-bottom:.2rem">${r.titulo}</div>
                  <div style="font-size:.8rem;color:var(--gris-medio);margin-bottom:.35rem">${r.descripcion.slice(0, 120)}${r.descripcion.length > 120 ? '...' : ''}</div>
                  <div style="font-size:.75rem;color:var(--gris-medio)">
                    📍 ${r.sede || r.ubicacion}${r.lugar_especifico ? ' · ' + r.lugar_especifico : ''}
                    &nbsp;·&nbsp; 👤 ${r.reportante?.nombre_completo}
                    &nbsp;·&nbsp; 🕐 ${tiempoRelativo(r.creado_en)}
                  </div>
                  ${r.punto_custodia ? `<div style="font-size:.75rem;color:var(--azul-itm);margin-top:.25rem">📦 ${r.punto_custodia}</div>` : ''}
                  ${r.hora_ocurrencia ? `<div style="font-size:.75rem;color:var(--morado-itm);margin-top:.2rem">🕐 Hora: ${r.hora_ocurrencia}</div>` : ''}
                </div>
                <div style="display:flex;flex-direction:column;gap:.4rem;flex-shrink:0;align-items:flex-end">
                  ${esPendiente ? `
                    <button class="btn btn-chico" style="background:var(--verde-fuerte);color:white;white-space:nowrap" data-accion="aprobar" data-id="${r.id}">✓ Aprobar</button>
                    <button class="btn btn-contorno btn-chico" style="white-space:nowrap" data-accion="rechazar" data-id="${r.id}">✗ Rechazar</button>
                    <button class="btn btn-chico" style="background:var(--rojo-fuerte);color:white;white-space:nowrap" data-accion="eliminar" data-id="${r.id}">🗑 Eliminar</button>
                  ` : `
                    <button class="btn btn-contorno btn-chico" style="white-space:nowrap" data-accion="editar" data-id="${r.id}">✏️ Editar</button>
                    <button class="btn btn-chico" style="background:var(--rojo-fuerte);color:white;white-space:nowrap" data-accion="eliminar" data-id="${r.id}">🗑 Eliminar</button>
                  `}
                </div>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>`;

      // Aprobar
      lista.querySelectorAll('[data-accion="aprobar"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            await Reportes.revisar(btn.dataset.id, { accion: 'aprobar' });
            mostrarToast('Reporte aprobado — ya visible para todos', 'success');
            cargarReportes();
          } catch (err) { mostrarToast(err.message, 'error'); }
        });
      });

      // Rechazar
      lista.querySelectorAll('[data-accion="rechazar"]').forEach(btn => {
        btn.addEventListener('click', () => {
          const { cerrar } = crearModal({
            titulo: 'Rechazar reporte',
            contenido: `<div class="grupo-campo"><label class="etiqueta-campo requerido">Motivo del rechazo</label><textarea id="motivoRechazo" class="campo-area" placeholder="Explica por qué se rechaza este reporte..." required></textarea></div>`,
            pie: `<button class="btn btn-contorno" id="btnCancelRechazo">Cancelar</button>
                  <button class="btn btn-peligro" id="btnConfirmarRechazo">Rechazar</button>`,
          });
          setTimeout(() => {
            document.getElementById('btnCancelRechazo')?.addEventListener('click', cerrar);
            document.getElementById('btnConfirmarRechazo')?.addEventListener('click', async () => {
              const motivo = document.getElementById('motivoRechazo').value.trim();
              if (!motivo) { mostrarToast('Debes ingresar un motivo', 'error'); return; }
              try {
                await Reportes.revisar(btn.dataset.id, { accion: 'rechazar', motivo });
                cerrar(); mostrarToast('Reporte rechazado', 'info');
                cargarReportes();
              } catch (err) { mostrarToast(err.message, 'error'); }
            });
          }, 50);
        });
      });

      // Editar (admin)
      lista.querySelectorAll('[data-accion="editar"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          // Cargar el reporte completo para mostrar todos sus campos
          let reporte;
          try { reporte = await Reportes.obtener(btn.dataset.id); } catch { reporte = null; }
          const r = reporte || {};

          const { cerrar } = crearModal({
            titulo: 'Editar reporte',
            contenido: `
              <form id="formEditAdmin">
                <div class="grupo-campo">
                  <label class="etiqueta-campo requerido">Título</label>
                  <input name="titulo" class="campo-entrada" value="${(r.titulo||'').replace(/"/g,'&quot;')}" required>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
                  <div class="grupo-campo">
                    <label class="etiqueta-campo">Categoría</label>
                    <select name="categoria" class="campo-selector">
                      <option value="">Sin cambio</option>
                      ${['electronico','documento','accesorio','ropa','maleta','llaves','gafas','libro','otro']
                        .map(c => `<option value="${c}" ${r.categoria===c?'selected':''}>${nombreCategoria(c)}</option>`).join('')}
                    </select>
                  </div>
                  <div class="grupo-campo">
                    <label class="etiqueta-campo">Sede</label>
                    <select name="sede" class="campo-selector">
                      <option value="">Sin cambio</option>
                      ${['Sede Robledo','Sede Fraternidad','Sede Floresta','Sede Prado','Sede Castilla']
                        .map(s => `<option value="${s}" ${r.sede===s?'selected':''}>${s}</option>`).join('')}
                    </select>
                  </div>
                </div>
                <div class="grupo-campo">
                  <label class="etiqueta-campo">Lugar específico</label>
                  <input name="lugar_especifico" class="campo-entrada" value="${(r.lugar_especifico||'').replace(/"/g,'&quot;')}" placeholder="Ej: Biblioteca, segundo piso">
                </div>
                <div class="grupo-campo">
                  <label class="etiqueta-campo requerido">Descripción</label>
                  <textarea name="descripcion" class="campo-area" required>${r.descripcion||''}</textarea>
                </div>
                <div class="grupo-campo">
                  <label class="etiqueta-campo">Punto de custodia</label>
                  <input name="punto_custodia" class="campo-entrada" value="${(r.punto_custodia||'').replace(/"/g,'&quot;')}" placeholder="Deja vacío si aún lo tiene el reportante">
                </div>
                <div class="grupo-campo">
                  <label class="etiqueta-campo">Nueva imagen (opcional)</label>
                  <label class="zona-carga" for="imgEditAdmin" style="cursor:pointer">
                    <p style="color:var(--gris-medio);font-size:.875rem">Haz clic para cambiar la imagen</p>
                    <input type="file" id="imgEditAdmin" name="imagen" accept="image/*" style="display:none">
                  </label>
                  ${r.ruta_imagen ? `<img src="${r.ruta_imagen}" style="max-height:120px;border-radius:var(--radio-s);margin-top:.5rem" id="prevEditAdmin">` : '<img id="prevEditAdmin" class="oculto">'}
                </div>
                <button type="submit" class="btn btn-primario btn-completo">Guardar cambios</button>
              </form>`,
          });
          setTimeout(() => {
            document.getElementById('imgEditAdmin')?.addEventListener('change', (e) => {
              const prev = document.getElementById('prevEditAdmin');
              if (e.target.files[0]) { prev.src = URL.createObjectURL(e.target.files[0]); prev.classList.remove('oculto'); }
            });
            document.getElementById('formEditAdmin')?.addEventListener('submit', async (e) => {
              e.preventDefault();
              const fd = new FormData(e.target);
              try {
                await Reportes.adminEditar(btn.dataset.id, fd);
                cerrar(); mostrarToast('Reporte actualizado', 'success'); cargarReportes();
              } catch (err) { mostrarToast(err.message, 'error'); }
            });
          }, 50);
        });
      });

      // Eliminar
      lista.querySelectorAll('[data-accion="eliminar"]').forEach(btn => {
        btn.addEventListener('click', () => {
          mostrarConfirmacion('¿Eliminar este reporte definitivamente? Esta acción no se puede deshacer.', async () => {
            try {
              await Reportes.eliminarForzado(btn.dataset.id);
              mostrarToast('Reporte eliminado', 'info');
              cargarReportes();
            } catch (err) { mostrarToast(err.message, 'error'); }
          });
        });
      });

    } catch (err) {
      document.getElementById('listaAdminReportes').innerHTML =
        `<div class="estado-vacio"><h3>Error al cargar</h3><p>${err.message}</p></div>`;
    }
  }

  // Filtros de tipo
  contenedor.querySelectorAll('.tab-filtro[data-filtro]').forEach(tab => {
    tab.addEventListener('click', () => {
      contenedor.querySelectorAll('.tab-filtro[data-filtro]').forEach(t => t.classList.remove('activo'));
      tab.classList.add('activo');
      filtroActual = tab.dataset.filtro;
      cargarReportes();
    });
  });

  await cargarReportes();
}

// ── Admin — Reclamaciones ─────────────────────────────────
async function renderizarAdminReclamaciones(contenedor) {
  contenedor.innerHTML = `
    <div class="contenedor contenido-pagina">
      <div class="encabezado-seccion">
        <h2 class="titulo-seccion">Reclamaciones pendientes</h2>
        <span class="contador-objetos" id="contadorReclamos"></span>
      </div>
      <div id="listaAdminReclamos"><div class="girador"></div></div>
    </div>
  `;

  async function cargarReclamos() {
    const lista = document.getElementById('listaAdminReclamos');
    lista.innerHTML = '<div class="girador"></div>';
    try {
      const reclamos = await Reclamaciones.pendientes();
      const contador = document.getElementById('contadorReclamos');
      if (contador) contador.textContent = `${reclamos.length} pendiente${reclamos.length !== 1 ? 's' : ''}`;

      if (!reclamos.length) {
        lista.innerHTML = `<div class="estado-vacio"><h3>Sin reclamaciones pendientes</h3><p>Cuando alguien reclame un objeto aparecerá aquí.</p></div>`;
        return;
      }

      // Cargar los reportes relacionados para mostrar comparación
      const reportesMap = {};
      await Promise.all(reclamos.map(async r => {
        try { reportesMap[r.id_reporte] = await Reportes.obtener(r.id_reporte); } catch {}
      }));

      lista.innerHTML = `<div style="display:flex;flex-direction:column;gap:1rem">
        ${reclamos.map(r => {
          const rep = reportesMap[r.id_reporte];
          return `
          <div style="background:var(--blanco);border:2px solid var(--naranja-fuerte);border-radius:var(--radio-m);overflow:hidden" id="tarjeta-reclamo-${r.id}">
            <!-- Encabezado -->
            <div style="background:var(--naranja-suave);padding:.75rem 1.25rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap">
              <div>
                <span style="font-weight:700;font-size:.9rem">Reclamación #${r.id}</span>
                <span style="font-size:.75rem;color:var(--gris-medio);margin-left:.75rem">${tiempoRelativo(r.creado_en)}</span>
              </div>
              <div style="display:flex;gap:.4rem">
                <button class="btn btn-chico" style="background:var(--verde-fuerte);color:white" data-accion="aprobar" data-id="${r.id}">✓ Aprobar</button>
                <button class="btn btn-contorno btn-chico" data-accion="rechazar" data-id="${r.id}">✗ Rechazar</button>
              </div>
            </div>
            <!-- Cuerpo comparativo -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border-top:1px solid var(--gris-borde)">
              <!-- Columna: Reportante (quien reportó el objeto) -->
              <div style="padding:1rem;border-right:1px solid var(--gris-borde)">
                <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;color:var(--azul-itm);letter-spacing:.06em;margin-bottom:.6rem">
                  📋 ${rep?.tipo_reporte === 'encontrado' ? 'Quien lo encontró' : 'Quien lo perdió'}
                </div>
                <div style="font-weight:600;font-size:.875rem;margin-bottom:.25rem">${rep?.reportante?.nombre_completo || '—'}</div>
                <div style="font-size:.75rem;color:var(--gris-medio);margin-bottom:.5rem">${rep?.reportante?.correo || ''}</div>
                ${rep?.ruta_imagen ? `<img src="${rep.ruta_imagen}" style="width:100%;max-height:120px;object-fit:cover;border-radius:var(--radio-s);margin-bottom:.5rem">` : ''}
                <div style="font-size:.8rem"><strong>Objeto:</strong> ${rep?.titulo || '—'}</div>
                <div style="font-size:.8rem;color:var(--gris-medio);margin-top:.15rem">${rep?.descripcion?.slice(0,100) || ''}...</div>
                ${rep?.punto_custodia ? `<div style="font-size:.75rem;color:var(--azul-itm);margin-top:.35rem">📦 ${rep.punto_custodia}</div>` : ''}
                ${rep?.sede ? `<div style="font-size:.75rem;color:var(--gris-medio);margin-top:.2rem">📍 ${rep.sede}</div>` : ''}
              </div>
              <!-- Columna: Reclamante -->
              <div style="padding:1rem">
                <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;color:var(--morado-itm);letter-spacing:.06em;margin-bottom:.6rem">
                  🙋 Quien dice que es suyo
                </div>
                <div style="font-weight:600;font-size:.875rem;margin-bottom:.25rem">${r.reclamante?.nombre_completo || '—'}</div>
                <div style="font-size:.75rem;color:var(--gris-medio);margin-bottom:.5rem">${r.reclamante?.correo || ''}</div>
                <div style="background:var(--gris-palido);border-radius:var(--radio-s);padding:.6rem .75rem">
                  ${r.respuesta_1 ? `<div style="font-size:.8rem;margin-bottom:.3rem"><strong>R1:</strong> ${r.respuesta_1}</div>` : ''}
                  ${r.respuesta_2 ? `<div style="font-size:.8rem;margin-bottom:.3rem"><strong>R2:</strong> ${r.respuesta_2}</div>` : ''}
                  ${r.respuesta_3 ? `<div style="font-size:.8rem;margin-bottom:.3rem"><strong>R3:</strong> ${r.respuesta_3}</div>` : ''}
                  ${r.notas ? `<div style="font-size:.8rem;color:var(--gris-medio)"><strong>Notas:</strong> ${r.notas}</div>` : ''}
                </div>
                ${r.ruta_evidencia ? `<div style="margin-top:.5rem"><div style="font-size:.72rem;color:var(--gris-medio);margin-bottom:.25rem">Evidencia adjunta:</div><img src="${r.ruta_evidencia}" style="width:100%;max-height:120px;object-fit:cover;border-radius:var(--radio-s)"></div>` : ''}
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>`;

      lista.querySelectorAll('[data-accion="aprobar"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            await Reclamaciones.revisar(btn.dataset.id, { accion: 'aprobar' });
            mostrarToast('Reclamación aprobada — el usuario fue notificado', 'success');
            cargarReclamos();
          } catch (err) { mostrarToast(err.message, 'error'); }
        });
      });

      lista.querySelectorAll('[data-accion="rechazar"]').forEach(btn => {
        btn.addEventListener('click', () => {
          const { cerrar } = crearModal({
            titulo: 'Rechazar reclamación',
            contenido: `<div class="grupo-campo"><label class="etiqueta-campo requerido">Motivo del rechazo</label><textarea id="motivoRechazo" class="campo-area" placeholder="Explica por qué se rechaza..." required></textarea></div>`,
            pie: `<button class="btn btn-contorno" id="btnCancelR">Cancelar</button><button class="btn btn-peligro" id="btnConfR">Rechazar</button>`,
          });
          setTimeout(() => {
            document.getElementById('btnCancelR')?.addEventListener('click', cerrar);
            document.getElementById('btnConfR')?.addEventListener('click', async () => {
              const motivo = document.getElementById('motivoRechazo').value.trim();
              if (!motivo) { mostrarToast('Ingresa el motivo', 'error'); return; }
              try {
                await Reclamaciones.revisar(btn.dataset.id, { accion: 'rechazar', motivo_rechazo: motivo });
                cerrar(); mostrarToast('Reclamación rechazada', 'info');
                cargarReclamos();
              } catch (err) { mostrarToast(err.message, 'error'); }
            });
          }, 50);
        });
      });

    } catch (err) {
      document.getElementById('listaAdminReclamos').innerHTML =
        `<div class="estado-vacio"><h3>Error al cargar</h3><p>${err.message}</p></div>`;
    }
  }

  await cargarReclamos();
}
// ── Admin — Usuarios ──────────────────────────────────────
async function renderizarAdminUsuarios(contenedor) {
  contenedor.innerHTML = `
    <div class="contenedor contenido-pagina">
      <div class="encabezado-seccion">
        <h2 class="titulo-seccion">Gestión de usuarios</h2>
      </div>
      <div style="background:var(--blanco);border:1px solid var(--gris-borde);border-radius:var(--radio-m);padding:1rem;margin-bottom:1rem">
        <div style="display:flex;gap:.75rem;align-items:center">
          <input id="campoBuscarUsuario" class="campo-entrada" placeholder="Buscar por nombre, usuario o correo..."
            style="flex:1;margin-bottom:0">
          <button class="btn btn-primario" id="btnBuscarUsuario">Buscar</button>
          <button class="btn btn-contorno" id="btnMostrarTodos">Ver todos</button>
        </div>
      </div>
      <div id="listaUsuariosAdmin"><div class="girador"></div></div>
    </div>
  `;

  function renderTablaUsuarios(usuarios) {
    const lista = document.getElementById('listaUsuariosAdmin');
    if (!usuarios.length) {
      lista.innerHTML = `<div class="estado-vacio"><h3>No se encontraron usuarios</h3></div>`;
      return;
    }
    lista.innerHTML = `
      <div style="background:var(--blanco);border:1px solid var(--gris-borde);border-radius:var(--radio-l);overflow:hidden">
        <table style="width:100%;border-collapse:collapse">
          <thead style="background:var(--gris-palido)">
            <tr>
              <th style="padding:.75rem 1rem;text-align:left;font-size:.78rem;color:var(--gris-medio);font-weight:700;text-transform:uppercase">Usuario</th>
              <th style="padding:.75rem 1rem;text-align:left;font-size:.78rem;color:var(--gris-medio);font-weight:700;text-transform:uppercase">Rol</th>
              <th style="padding:.75rem 1rem;text-align:left;font-size:.78rem;color:var(--gris-medio);font-weight:700;text-transform:uppercase">Estado</th>
              <th style="padding:.75rem 1rem;text-align:right;font-size:.78rem;color:var(--gris-medio);font-weight:700;text-transform:uppercase">Acción</th>
            </tr>
          </thead>
          <tbody>
            ${usuarios.map(u => `
              <tr style="border-top:1px solid var(--gris-fondo)" id="fila-usuario-${u.id}">
                <td style="padding:.85rem 1rem">
                  <div style="font-weight:600;font-size:.875rem">${u.nombre_completo}</div>
                  <div style="font-size:.75rem;color:var(--gris-medio)">${u.correo}</div>
                  <div style="font-size:.72rem;color:var(--gris-medio)">@${u.nombre_usuario}</div>
                </td>
                <td style="padding:.85rem 1rem;font-size:.825rem;color:var(--gris-medio)">${u.rol}</td>
                <td style="padding:.85rem 1rem" id="estado-${u.id}">
                  <span class="insignia ${u.estado === 'activo' ? 'insignia-encontrado' : 'insignia-perdido'}">
                    ${u.estado === 'activo' ? 'Activo' : 'Bloqueado'}
                  </span>
                </td>
                <td style="padding:.85rem 1rem;text-align:right" id="accion-${u.id}">
                  ${u.estado === 'activo'
                    ? `<button class="btn btn-contorno btn-chico" data-accion="bloquear" data-id="${u.id}" data-nombre="${u.nombre_completo}">🚫 Bloquear</button>`
                    : `<button class="btn btn-chico" style="background:var(--verde-fuerte);color:white" data-accion="desbloquear" data-id="${u.id}" data-nombre="${u.nombre_completo}">✓ Desbloquear</button>`}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    lista.querySelectorAll('[data-accion="bloquear"]').forEach(btn => {
      btn.addEventListener('click', () =>
        mostrarConfirmacion(`¿Bloquear a ${btn.dataset.nombre}? No podrá iniciar sesión.`, async () => {
          try {
            await Administracion.bloquearUsuario(btn.dataset.id);
            mostrarToast(`Usuario ${btn.dataset.nombre} bloqueado`, 'info');
            // Actualizar fila sin recargar toda la tabla
            document.getElementById(`estado-${btn.dataset.id}`).innerHTML =
              `<span class="insignia insignia-perdido">Bloqueado</span>`;
            document.getElementById(`accion-${btn.dataset.id}`).innerHTML =
              `<button class="btn btn-chico" style="background:var(--verde-fuerte);color:white"
                data-accion="desbloquear" data-id="${btn.dataset.id}" data-nombre="${btn.dataset.nombre}">✓ Desbloquear</button>`;
            // Re-attach listener to new button
            document.querySelector(`[data-accion="desbloquear"][data-id="${btn.dataset.id}"]`)
              ?.addEventListener('click', async (ev) => {
                const b = ev.currentTarget;
                await Administracion.desbloquearUsuario(b.dataset.id);
                mostrarToast(`Usuario ${b.dataset.nombre} desbloqueado`, 'success');
                document.getElementById(`estado-${b.dataset.id}`).innerHTML =
                  `<span class="insignia insignia-encontrado">Activo</span>`;
                document.getElementById(`accion-${b.dataset.id}`).innerHTML =
                  `<button class="btn btn-contorno btn-chico" data-accion="bloquear"
                    data-id="${b.dataset.id}" data-nombre="${b.dataset.nombre}">🚫 Bloquear</button>`;
              });
          } catch (err) { mostrarToast(err.message, 'error'); }
        }));
    });

    lista.querySelectorAll('[data-accion="desbloquear"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await Administracion.desbloquearUsuario(btn.dataset.id);
          mostrarToast(`Usuario ${btn.dataset.nombre} desbloqueado`, 'success');
          document.getElementById(`estado-${btn.dataset.id}`).innerHTML =
            `<span class="insignia insignia-encontrado">Activo</span>`;
          document.getElementById(`accion-${btn.dataset.id}`).innerHTML =
            `<button class="btn btn-contorno btn-chico" data-accion="bloquear"
              data-id="${btn.dataset.id}" data-nombre="${btn.dataset.nombre}">🚫 Bloquear</button>`;
        } catch (err) { mostrarToast(err.message, 'error'); }
      });
    });
  }

  // Cargar todos al inicio
  try {
    const todos = await Administracion.listarUsuarios();
    renderTablaUsuarios(todos);
  } catch (err) { mostrarToast(err.message, 'error'); }

  // Buscar por nombre
  let tiempoEspera;
  document.getElementById('campoBuscarUsuario')?.addEventListener('input', (e) => {
    clearTimeout(tiempoEspera);
    tiempoEspera = setTimeout(async () => {
      const texto = e.target.value.trim();
      if (!texto) {
        const todos = await Administracion.listarUsuarios();
        renderTablaUsuarios(todos);
        return;
      }
      try {
        const resultados = await Administracion.buscarUsuarios(texto);
        renderTablaUsuarios(resultados);
      } catch (err) { mostrarToast(err.message, 'error'); }
    }, 350);
  });

  document.getElementById('btnBuscarUsuario')?.addEventListener('click', async () => {
    const texto = document.getElementById('campoBuscarUsuario')?.value.trim();
    if (!texto) return;
    try {
      const resultados = await Administracion.buscarUsuarios(texto);
      renderTablaUsuarios(resultados);
    } catch (err) { mostrarToast(err.message, 'error'); }
  });

  document.getElementById('btnMostrarTodos')?.addEventListener('click', async () => {
    document.getElementById('campoBuscarUsuario').value = '';
    try {
      const todos = await Administracion.listarUsuarios();
      renderTablaUsuarios(todos);
    } catch (err) { mostrarToast(err.message, 'error'); }
  });
}

// ── Panel de notificaciones emergente ─────────────────────
async function abrirPanelNotificaciones(e) {
  e.stopPropagation();
  const existente = document.getElementById('panelNotif');
  if (existente) { existente.remove(); return; }

  const btn = document.getElementById('btnNotificaciones');
  const panel = document.createElement('div');
  panel.id = 'panelNotif';
  panel.className = 'panel-notificaciones';
  panel.innerHTML = `
    <div class="encabezado-panel-notif">
      <span class="titulo-panel-notif">Notificaciones</span>
      <button class="btn btn-chico btn-contorno" id="btnVerTodasNotif">Ver todas</button>
    </div>
    <div class="lista-notificaciones"><div class="girador" style="margin:1rem auto;width:28px;height:28px;border-width:2px"></div></div>
  `;
  btn?.parentElement?.appendChild(panel);

  try {
    const notifs = await Notificaciones.listar({ limite: 10 });
    const iconos = {
      coincidencia: '🔍', reclamo_nuevo: '📩', reclamo_aprobado: '✅',
      reclamo_rechazado: '❌', estado_cambiado: '🔄', entrega_lista: '📦',
      reporte_pendiente: '⏳', mensaje_directo: '💬', lo_encontre: '🎉',
    };
    const listaEl = panel.querySelector('.lista-notificaciones');
    listaEl.innerHTML = notifs.length
      ? notifs.map(n => `
          <div class="item-notificacion ${n.leida ? '' : 'no-leida'}">
            <div class="icono-notif">${iconos[n.tipo] || '🔔'}</div>
            <div class="contenido-notif">
              <div class="titulo-notif">${n.titulo}</div>
              <div class="mensaje-notif">${n.mensaje}</div>
              <div class="hora-notif">${tiempoRelativo(n.creado_en)}</div>
            </div>
          </div>`).join('')
      : `<div style="padding:1.5rem;text-align:center;color:var(--gris-medio);font-size:.875rem">Sin notificaciones nuevas</div>`;
  } catch (_) {}

  document.getElementById('btnVerTodasNotif')?.addEventListener('click', () => {
    panel.remove(); navegar('notificaciones');
  });

  const cerrarPanel = (ev) => {
    if (!panel.contains(ev.target) && ev.target !== btn) {
      panel.remove();
      document.removeEventListener('click', cerrarPanel);
    }
  };
  setTimeout(() => document.addEventListener('click', cerrarPanel), 50);
}

// ── Barra lateral ─────────────────────────────────────────
function abrirBarraLateral() {
  const existente = document.getElementById('fondoBarraLateral');
  existente?.remove();

  const fondo = document.createElement('div');
  fondo.id = 'fondoBarraLateral';
  fondo.innerHTML = `
    <div class="fondo-barra-lateral"></div>
    <aside class="barra-lateral">
      <div class="encabezado-barra-lateral">
        <div style="font-size:.7rem;opacity:.7;text-transform:uppercase;letter-spacing:.08em">ITM</div>
        <div style="font-family:var(--fuente-titulo);font-weight:700;font-size:1rem;color:white;margin-top:.2rem">Objetos Perdidos</div>
        ${estado.usuario ? `
          <div class="usuario-barra-lateral">
            <div class="avatar-barra-lateral">${iniciales(estado.usuario.nombre_completo)}</div>
            <div>
              <div class="nombre-barra-lateral">${estado.usuario.nombre_completo}</div>
              <div class="rol-barra-lateral">${estado.usuario.rol}</div>
            </div>
          </div>` : ''}
      </div>
      <nav class="navegacion-barra-lateral">
        <div class="etiqueta-seccion-barra">Principal</div>
        <div class="item-nav-barra-lateral" data-vista="inicio">🏠 Inicio</div>
        <div class="item-nav-barra-lateral" data-vista="encontrados">✅ Objetos encontrados</div>
        <div class="item-nav-barra-lateral" data-vista="perdidos">❌ Objetos perdidos</div>
        ${estado.usuario ? `
          <div class="etiqueta-seccion-barra" style="margin-top:.75rem">Mi cuenta</div>
          <div class="item-nav-barra-lateral" data-vista="mis-reportes">📋 Mis reportes</div>
          <div class="item-nav-barra-lateral" data-vista="notificaciones">🔔 Notificaciones</div>
        ` : ''}
        ${estado.usuario?.rol === 'admin' ? `
          <div class="etiqueta-seccion-barra" style="margin-top:.75rem">Administración</div>
          <div class="item-nav-barra-lateral" data-vista="admin-reportes">📝 Reportes pendientes</div>
          <div class="item-nav-barra-lateral" data-vista="admin-reclamaciones">🔒 Reclamaciones</div>
          <div class="item-nav-barra-lateral" data-vista="admin-usuarios">👥 Usuarios</div>
        ` : ''}
      </nav>
      ${estado.usuario ? `
        <div style="padding:1rem 1.25rem;border-top:1px solid var(--gris-borde)">
          <div style="background:linear-gradient(135deg,var(--morado-itm),var(--azul-itm));color:white;border-radius:var(--radio-m);padding:1rem">
            <div style="font-weight:600;margin-bottom:.3rem">¿Encontraste algo?</div>
            <div style="opacity:.8;font-size:.8rem;margin-bottom:.75rem">Reporta el objeto para que su dueño lo recupere.</div>
            <button class="btn btn-completo" id="btnPublicarEncBarraLateral" style="background:white;color:var(--morado-itm);font-weight:700">
              + Objeto encontrado
            </button>
          </div>
        </div>` : ''}
    </aside>
  `;

  document.body.appendChild(fondo);
  fondo.querySelector('.fondo-barra-lateral').addEventListener('click', () => fondo.remove());
  fondo.querySelectorAll('.item-nav-barra-lateral[data-vista]').forEach(item => {
    item.addEventListener('click', () => { fondo.remove(); navegar(item.dataset.vista); });
  });
  document.getElementById('btnPublicarEncBarraLateral')?.addEventListener('click', () => {
    fondo.remove(); abrirModalCrearReporte('encontrado');
  });
}

// ── Páginas de autenticación ──────────────────────────────
function renderizarPaginaAuth(tipo) {
  document.getElementById('aplicacion').innerHTML = `
    <div class="pagina-auth">
      <div class="panel-visual-auth">
        <div class="capa-visual-auth"></div>
        <div class="contenido-visual-auth">
          <div style="font-family:var(--fuente-titulo);font-size:1.5rem;font-weight:800;color:white;margin-bottom:1rem;line-height:1.2">
            Plataforma de Objetos<br>Perdidos y Encontrados
          </div>
          <p style="color:rgba(255,255,255,.75);font-size:.95rem;max-width:340px;line-height:1.7">
            Registra, busca y recupera objetos extraviados en los campus del ITM.
          </p>
          <div style="margin-top:2rem;display:flex;flex-direction:column;gap:.75rem">
            ${['Solo correos @correo.itm.edu.co','Notificaciones automáticas de coincidencias',
               'Verificación segura de propiedad','Historial completo de trazabilidad']
              .map(t => `<div style="color:rgba(255,255,255,.85);font-size:.875rem">✓ ${t}</div>`).join('')}
          </div>
        </div>
      </div>
      <div class="panel-formulario-auth">
        ${tipo === 'iniciar-sesion' ? plantillaLogin() : plantillaRegistro()}
      </div>
    </div>
  `;

  if (tipo === 'iniciar-sesion') escucharLogin();
  else escucharRegistro();
}

function plantillaLogin() {
  return `
    <div style="margin-bottom:2rem">
      <div style="font-family:var(--fuente-titulo);font-size:.75rem;font-weight:700;color:var(--azul-itm);text-transform:uppercase;letter-spacing:.1em;margin-bottom:1rem">ITM</div>
      <h1 class="titulo-formulario-auth">Bienvenido</h1>
      <p class="subtitulo-formulario-auth">Ingresa con tu usuario institucional</p>
    </div>
    <div class="caja-ayuda-auth">
      <span>💡</span>
      <div>
        <strong>Recuerda:</strong> Tu usuario es la primera parte de tu correo.<br>
        <span style="opacity:.8">Ej: <code>juan.perez323298</code></span>
      </div>
    </div>
    <form id="formularioLogin">
      <div class="grupo-campo">
        <label class="etiqueta-campo requerido">Usuario institucional</label>
        <input id="campoUsuario" name="nombre_usuario" class="campo-entrada" placeholder="juan.perez323298" autocomplete="username" required>
      </div>
      <div class="grupo-campo">
        <label class="etiqueta-campo requerido">Contraseña</label>
        <input id="campoContrasena" name="contrasena" type="password" class="campo-entrada"
               placeholder="Tu número de identificación" autocomplete="current-password" required>
        <div class="ayuda-campo">Si olvidaste tu contraseña, contacta al administrador.</div>
      </div>
      <div id="errorLogin" class="mensaje-error-auth oculto"></div>
      <button type="submit" class="btn btn-morado btn-completo btn-grande" id="btnIniciarSesion">Ingresar</button>
    </form>
    <div style="text-align:center;margin-top:1.5rem;font-size:.875rem;color:var(--gris-medio)">
      ¿No tienes cuenta?
      <a href="#registrarse" style="color:var(--morado-itm);font-weight:600"> Regístrate aquí</a>
    </div>
  `;
}

function plantillaRegistro() {
  return `
    <div style="margin-bottom:2rem">
      <h1 class="titulo-formulario-auth">Crear cuenta</h1>
      <p class="subtitulo-formulario-auth">Usa tu correo institucional @correo.itm.edu.co</p>
    </div>
    <form id="formularioRegistro">
      <div class="grupo-campo">
        <label class="etiqueta-campo requerido">Nombre completo</label>
        <input name="nombre_completo" class="campo-entrada" placeholder="Juan Pérez García" required>
      </div>
      <div class="grupo-campo">
        <label class="etiqueta-campo requerido">Correo institucional</label>
        <input name="correo" type="email" class="campo-entrada" placeholder="juan.perez@correo.itm.edu.co" required>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
        <div class="grupo-campo">
          <label class="etiqueta-campo requerido">Usuario</label>
          <input name="nombre_usuario" class="campo-entrada" placeholder="juan.perez" required>
        </div>
        <div class="grupo-campo">
          <label class="etiqueta-campo requerido">Rol</label>
          <select name="rol" class="campo-selector">
            <option value="estudiante">Estudiante</option>
            <option value="profesor">Profesor</option>
          </select>
        </div>
      </div>
      <div class="grupo-campo">
        <label class="etiqueta-campo requerido">Contraseña</label>
        <input name="contrasena" type="password" class="campo-entrada" placeholder="Mínimo 8 caracteres" autocomplete="new-password" required>
      </div>
      <div id="errorRegistro" class="mensaje-error-auth oculto"></div>
      <button type="submit" class="btn btn-morado btn-completo btn-grande" id="btnRegistrarse">Crear cuenta</button>
    </form>
    <div style="text-align:center;margin-top:1.5rem;font-size:.875rem;color:var(--gris-medio)">
      ¿Ya tienes cuenta?
      <a href="#iniciar-sesion" style="color:var(--morado-itm);font-weight:600"> Iniciar sesión</a>
    </div>
  `;
}

function escucharLogin() {
  document.getElementById('formularioLogin')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn    = document.getElementById('btnIniciarSesion');
    const errEl  = document.getElementById('errorLogin');
    botonCargando(btn, true);
    errEl.classList.add('oculto');
    try {
      const datos = await Autenticacion.iniciarSesion({
        nombre_usuario: document.getElementById('campoUsuario').value,
        contrasena:     document.getElementById('campoContrasena').value,
      });
      TokenSesion.guardar(datos.token_acceso);
      AlmacenUsuario.guardar(datos.usuario);
      estado.usuario = datos.usuario;
      mostrarToast(`¡Bienvenido, ${datos.usuario.nombre_completo}!`, 'success');
      window.location.hash = '#inicio';
      navegar('inicio');
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('oculto');
      botonCargando(btn, false);
    }
  });
}

function escucharRegistro() {
  document.getElementById('formularioRegistro')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn   = document.getElementById('btnRegistrarse');
    const errEl = document.getElementById('errorRegistro');
    botonCargando(btn, true);
    errEl.classList.add('oculto');
    const fd = new FormData(e.target);
    try {
      await Autenticacion.registrar(Object.fromEntries(fd.entries()));
      mostrarToast('Cuenta creada. Inicia sesión.', 'success');
      window.location.hash = '#iniciar-sesion';
      navegar('iniciar-sesion');
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('oculto');
      botonCargando(btn, false);
    }
  });
}

// ── Cerrar sesión ─────────────────────────────────────────
function cerrarSesion() {
  mostrarConfirmacion('¿Deseas cerrar sesión?', () => {
    TokenSesion.limpiar();
    AlmacenUsuario.limpiar();
    estado.usuario = null;
    clearInterval(estado.intervaloNotif);
    window.location.hash = '#inicio';
    navegar('inicio');
    mostrarToast('Sesión cerrada correctamente', 'info');
  });
}

// ── Polling de notificaciones ─────────────────────────────
async function iniciarPolling() {
  clearInterval(estado.intervaloNotif);
  const actualizar = async () => {
    try {
      const { cantidad } = await Notificaciones.cantidadNoLeidas();
      const globo = document.getElementById('globoNotif');
      if (globo) {
        globo.textContent = cantidad > 9 ? '9+' : cantidad;
        globo.classList.toggle('oculto', cantidad === 0);
      }
    } catch (_) {}
  };
  await actualizar();
  estado.intervaloNotif = setInterval(actualizar, 30000);
}

// ── Enrutamiento por hash ─────────────────────────────────
window.addEventListener('hashchange', () => {
  document.querySelectorAll('.btn-flotante, .menu-fab').forEach(b => b.remove());
  const hash = window.location.hash.slice(1);
  estado.vista = hash || 'inicio';
  estado.filtros = { tipo_reporte: '', categoria: '', sede: '', busqueda: '' };
  renderizarAplicacion();
});

// ── Inicio de la aplicación ───────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const hash = window.location.hash.slice(1) || 'inicio';
  estado.vista = hash;
  renderizarAplicacion();
});
