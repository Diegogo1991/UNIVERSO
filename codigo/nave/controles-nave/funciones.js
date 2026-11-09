import {
  botonAbrir, panel, botonCerrar, botonesTabs, contenidosTabs,
  sliderSensRotacion, sliderSensCamara, sliderSensJoystick, sliderSensDireccionMedio,
  sliderSensInclinacionAvanzado, botonRebindAcelerar, botonRebindFrenar,
  miraColorInput, miraTamanoInput, toggleMira, toggleOverlay, toggleIndicadores,
  botonPersonalizarHud, pantallaPersonalizar, camaraDistanciaInput, camaraAlturaInput,
  botonRestablecerHud, botonListoHud, botonesTeclaAccion, sliderSensPersonalizado,
  togglePuntoFijo, selectPuntoFijo, radiosEsquema, tactilEscalaInput, tactilEscalaNombre
} from './elementos.js';
import {
  setSensibilidadRotacion, setSensibilidadMouseLook, setSensibilidadJoystick,
  setSensibilidadDireccionMedio, setSensibilidadInclinacionAvanzado,
  setTeclaAcelerar, setTeclaFrenar, setModoControl, setEntradaSuspendida,
  setTeclasPersonalizadas, TECLAS_POR_DEFECTO, MODOS_CONTROL, setPuntoFijo
} from '../nave.js';
import {
  setEsquemaTactil, aplicarDisenoTactil, editarDisenoTactil, setEscalaSeleccionado, ESCALA_CONTROL
} from '../controles-tactiles/funciones.js';
import { configurarMira, configurarVisibilidadHud } from '../mira/funciones.js';
import { setPosicionCamara, CAMARA } from '../camara.js';

const CLAVE_LOCALSTORAGE = 'universo-config-controles';

// Mismo breakpoint que ya usa el proyecto para joystick/btn-e/touch-hint, para que
// "mobile" signifique lo mismo en toda la interfaz.
const MOBILE_MEDIA_QUERY = '(max-width: 900px)';
function esMobile() {
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

// Configuración por defecto. Se combina con lo que haya guardado en localStorage
// (si el usuario ya ajustó algo en una sesión anterior).
const configPorDefecto = {
  modo: 'estandar',
  // Antes el rango de los sliders era 0.5-2 (default 1); el usuario reportó que
  // incluso el mínimo (0.5) giraba demasiado rápido. Ahora el viejo mínimo pasó
  // a ser el nuevo máximo (0.5) y se puede bajar hasta 0.1 — el default queda en
  // el medio de ese rango nuevo, no en el extremo que ya sabíamos que era mucho.
  sensRotacion: 0.3,
  sensCamara: 0.3,
  sensJoystick: 0.3,
  sensDireccionMedio: 0.3,
  sensInclinacionAvanzado: 0.3,
  teclaAcelerar: 'ShiftLeft',
  teclaFrenar: 'ControlLeft',
  miraColor: '#78c8ff',
  miraTamano: 1,
  hudMira: true,
  hudOverlay: true,
  hudIndicadores: true,
  camaraDistancia: 15,
  camaraAltura: 3,
  teclas: { ...TECLAS_POR_DEFECTO },
  puntoFijoActivo: false,
  puntoFijo: 'planeta-naranja',
  esquemaTactil: 'joysticks',
  disenoTactil: {}
};

// Modos que solo tienen sentido con teclado: en móvil se muestran bloqueados.
const MODOS_SOLO_PC = ['avanzado', 'personalizado'];
// E interactúa, R vuelve al inicio; Escape y Tab se usan en la interfaz.
const TECLAS_RESERVADAS = ['KeyE', 'KeyR', 'Escape', 'Tab'];

function teclasValidas(mapa) {
  const valores = Object.keys(TECLAS_POR_DEFECTO).map(accion => mapa?.[accion]);
  return valores.every(v => typeof v === 'string' && !TECLAS_RESERVADAS.includes(v)) && new Set(valores).size === valores.length;
}
function disenoValido(diseno) {
  const limpio = {};
  for (const [id, d] of Object.entries(diseno && typeof diseno === 'object' ? diseno : {})) {
    if ([d?.x, d?.y, d?.escala].every(Number.isFinite)) {
      limpio[id] = { x: Math.min(100, Math.max(0, d.x)), y: Math.min(100, Math.max(0, d.y)),
        escala: Math.min(ESCALA_CONTROL.max, Math.max(ESCALA_CONTROL.min, d.escala)) };
    }
  }
  return limpio;
}

function cargarConfig() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_LOCALSTORAGE) || '{}');
    const config = { ...configPorDefecto, ...guardado };
    if (!MODOS_CONTROL.includes(config.modo)) config.modo = 'estandar';
    const teclas = { ...TECLAS_POR_DEFECTO, ...(guardado.teclas || {}) };
    config.teclas = teclasValidas(teclas) ? teclas : { ...TECLAS_POR_DEFECTO };
    if (typeof config.puntoFijoActivo !== 'boolean') config.puntoFijoActivo = false;
    if (!['planeta-naranja', 'planeta-morado'].includes(config.puntoFijo)) config.puntoFijo = configPorDefecto.puntoFijo;
    if (!['joysticks', 'flechas'].includes(config.esquemaTactil)) config.esquemaTactil = configPorDefecto.esquemaTactil;
    config.disenoTactil = disenoValido(config.disenoTactil);
    for (const clave of ['sensRotacion', 'sensCamara', 'sensJoystick', 'sensDireccionMedio', 'sensInclinacionAvanzado']) {
      config[clave] = Number.isFinite(config[clave]) ? Math.max(0.1, Math.min(0.5, config[clave])) : 0.3;
    }
    config.miraTamano = Number.isFinite(config.miraTamano) ? Math.max(0.6, Math.min(1.6, config.miraTamano)) : 1;
    if (!/^#[\da-f]{6}$/i.test(config.miraColor)) config.miraColor = configPorDefecto.miraColor;
    for (const clave of ['hudMira', 'hudOverlay', 'hudIndicadores']) {
      if (typeof config[clave] !== 'boolean') config[clave] = true;
    }
    config.camaraDistancia = Number.isFinite(config.camaraDistancia)
      ? Math.max(CAMARA.distanciaMin, Math.min(CAMARA.distanciaMax, config.camaraDistancia)) : configPorDefecto.camaraDistancia;
    config.camaraAltura = Number.isFinite(config.camaraAltura)
      ? Math.max(CAMARA.alturaMin, Math.min(CAMARA.alturaMax, config.camaraAltura)) : configPorDefecto.camaraAltura;
    for (const clave of ['teclaAcelerar', 'teclaFrenar']) {
      if (typeof config[clave] !== 'string' || ['KeyE', 'KeyR'].includes(config[clave])) config[clave] = configPorDefecto[clave];
    }
    return config;
  } catch {
    return { ...configPorDefecto };
  }
}

function guardarConfig(config) {
  try { localStorage.setItem(CLAVE_LOCALSTORAGE, JSON.stringify(config)); }
  catch { /* La configuración sigue funcionando durante esta sesión. */ }
}

let config = cargarConfig();
let cancelarRebind = null;

// ─── ABRIR / CERRAR PANEL (mismo patrón que el CV overlay) ───────────────────
// Suspende el apuntado por mouse del modo Medio mientras el panel está abierto:
// si no, mover el mouse para clickear una pestaña o un slider hace girar la nave.
function abrirPanel() {
  panel.classList.add('active');
  panel.setAttribute('aria-hidden', 'false');
  setEntradaSuspendida(true);
}
function cerrarPanel() {
  cancelarRebind?.();
  panel.classList.remove('active');
  panel.setAttribute('aria-hidden', 'true');
  setEntradaSuspendida(false);
}

// ─── PESTAÑAS ─────────────────────────────────────────────────────────────────
// Cambia la pestaña activa y su contenido visible. En mobile, "avanzado" está
// bloqueada (se muestra el contenido "Solo para PC" en vez de sus opciones reales).
function seleccionarTab(modo) {
  if (MODOS_SOLO_PC.includes(modo) && esMobile()) {
    // No cambiamos de modo real, solo mostramos el aviso de bloqueo
    botonesTabs.forEach(b => b.classList.toggle('active', b.dataset.modo === modo));
    contenidosTabs.forEach(c => {
      c.hidden = c.dataset.modo !== modo;
      if (c.dataset.modo === modo) c.classList.add('bloqueado-mobile');
    });
    return;
  }

  config.modo = modo;
  guardarConfig(config);
  setModoControl(modo); // aplica el cambio de verdad en nave.js

  botonesTabs.forEach(b => b.classList.toggle('active', b.dataset.modo === modo));
  contenidosTabs.forEach(c => {
    c.hidden = c.dataset.modo !== modo;
    c.classList.remove('bloqueado-mobile');
  });
}

function aplicarBloqueoMobile() {
  botonesTabs.forEach(b => b.classList.toggle('bloqueada', esMobile() && MODOS_SOLO_PC.includes(b.dataset.modo)));
  if (esMobile() && MODOS_SOLO_PC.includes(config.modo)) seleccionarTab('estandar');
}

// ─── SLIDERS DE SENSIBILIDAD (modo Estándar) ──────────────────────────────────
const slidersPorClave = {};
function wireSliderSensibilidad(slider, aplicar, claveConfig) {
  (slidersPorClave[claveConfig] ??= []).push(slider);
  slider.value = config[claveConfig];
  aplicar(Number(slider.value));
  slider.addEventListener('input', () => {
    const valor = Number(slider.value);
    aplicar(valor);
    config[claveConfig] = valor;
    slidersPorClave[claveConfig].forEach(otro => { if (otro !== slider) otro.value = valor; });
    guardarConfig(config);
  });
}

// ─── CONFIGURACIÓN DE LA MIRA (color y tamaño, siempre visible) ──────────────
function wireMiraConfig() {
  miraColorInput.value = config.miraColor;
  miraTamanoInput.value = config.miraTamano;
  configurarMira({ color: config.miraColor, tamano: config.miraTamano });

  miraColorInput.addEventListener('input', () => {
    config.miraColor = miraColorInput.value;
    configurarMira({ color: config.miraColor });
    guardarConfig(config);
  });
  miraTamanoInput.addEventListener('input', () => {
    config.miraTamano = Number(miraTamanoInput.value);
    configurarMira({ tamano: config.miraTamano });
    guardarConfig(config);
  });
}

// ─── VISIBILIDAD DEL HUD (interruptores) ─────────────────────────────────────
function wireInterruptor(input, claveConfig, parteHud) {
  input.checked = config[claveConfig];
  configurarVisibilidadHud({ [parteHud]: input.checked });
  input.addEventListener('change', () => {
    config[claveConfig] = input.checked;
    configurarVisibilidadHud({ [parteHud]: input.checked });
    guardarConfig(config);
  });
}

// ─── PUNTO FIJO DEL OVERLAY ───────────────────────────────────────────────────
// main.js entrega { id: posición } de los planetas; este módulo no conoce universos.
let puntosFijos = {};
function aplicarPuntoFijo() {
  setPuntoFijo(config.puntoFijoActivo ? puntosFijos[config.puntoFijo] : null);
  selectPuntoFijo.disabled = !config.puntoFijoActivo;
}
function wirePuntoFijo() {
  togglePuntoFijo.checked = config.puntoFijoActivo;
  selectPuntoFijo.value = config.puntoFijo;
  aplicarPuntoFijo();
  togglePuntoFijo.addEventListener('change', () => {
    config.puntoFijoActivo = togglePuntoFijo.checked; aplicarPuntoFijo(); guardarConfig(config);
  });
  selectPuntoFijo.addEventListener('change', () => {
    config.puntoFijo = selectPuntoFijo.value; aplicarPuntoFijo(); guardarConfig(config);
  });
}

// ─── CONTROLES MÓVILES: esquema (dos joysticks o flechas y botones) ──────────
function wireEsquemaTactil() {
  setEsquemaTactil(config.esquemaTactil);
  aplicarDisenoTactil(config.disenoTactil);
  radiosEsquema.forEach(radio => {
    radio.checked = radio.value === config.esquemaTactil;
    radio.addEventListener('change', () => {
      config.esquemaTactil = radio.value; setEsquemaTactil(radio.value); guardarConfig(config);
    });
  });
}

// ─── PERSONALIZAR HUD ─────────────────────────────────────────────────────────
// Pantalla aparte con el juego en pausa: el HUD y la nave se ven detrás en vivo
// mientras se ajusta el tamaño del HUD y la posición de la cámara.
let pausarJuego = () => {};

function aplicarCamara() {
  camaraDistanciaInput.value = config.camaraDistancia;
  camaraAlturaInput.value = config.camaraAltura;
  setPosicionCamara({ distancia: config.camaraDistancia, altura: config.camaraAltura });
}
function abrirPersonalizacion() {
  cerrarPanel();
  setEntradaSuspendida(true, 'personalizar-hud');
  pausarJuego(true);
  aplicarCamara();
  pantallaPersonalizar.hidden = false;
  editarDisenoTactil(opcionesEdicionTactil);
  miraTamanoInput.focus();
}
const opcionesEdicionTactil = {
  alCambiar(id, diseno) { config.disenoTactil[id] = diseno; guardarConfig(config); },
  alSeleccionar(info) {
    tactilEscalaNombre.textContent = info ? 'Tamaño: ' + info.nombre : 'Ningún control seleccionado';
    tactilEscalaInput.disabled = !info;
    if (info) tactilEscalaInput.value = info.escala;
  }
};
function cerrarPersonalizacion() {
  editarDisenoTactil(null);
  pantallaPersonalizar.hidden = true;
  pausarJuego(false);
  setEntradaSuspendida(false, 'personalizar-hud');
  abrirPanel();
  botonPersonalizarHud.focus();
}
function wirePersonalizacion() {
  aplicarCamara();
  for (const [input, clave] of [[camaraDistanciaInput, 'camaraDistancia'], [camaraAlturaInput, 'camaraAltura']]) {
    input.addEventListener('input', () => {
      config[clave] = Number(input.value);
      setPosicionCamara({ distancia: config.camaraDistancia, altura: config.camaraAltura });
      guardarConfig(config);
    });
  }
  tactilEscalaInput.addEventListener('input', () => setEscalaSeleccionado(Number(tactilEscalaInput.value)));
  botonRestablecerHud.addEventListener('click', () => {
    config.disenoTactil = {};
    aplicarDisenoTactil(config.disenoTactil);
    editarDisenoTactil(null); editarDisenoTactil(opcionesEdicionTactil);
    config.miraTamano = configPorDefecto.miraTamano;
    config.camaraDistancia = configPorDefecto.camaraDistancia;
    config.camaraAltura = configPorDefecto.camaraAltura;
    miraTamanoInput.value = config.miraTamano;
    configurarMira({ tamano: config.miraTamano });
    aplicarCamara();
    guardarConfig(config);
  });
  botonPersonalizarHud.addEventListener('click', abrirPersonalizacion);
  botonListoHud.addEventListener('click', cerrarPersonalizacion);
  pantallaPersonalizar.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarPersonalizacion(); });
}

// ─── REASIGNACIÓN DE TECLAS (modo Avanzado: acelerar / frenar) ───────────────
// Convierte un KeyboardEvent.code ("ShiftLeft", "KeyW", "Digit1"...) en una
// etiqueta corta para mostrar en el botón ("SHIFT", "W", "1"...).
function formatearTecla(code) {
  if (code === 'Space') return 'ESPACIO';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Arrow')) return code.slice(5).toUpperCase();
  return code.replace(/Left|Right/, '').toUpperCase();
}

// Al hacer click en un botón de reasignación, la próxima tecla que se presione
// queda guardada como esa acción (mismo patrón que cualquier UI de "rebind").
function wireRebindTecla(boton, aplicar, claveConfig) {
  boton.textContent = formatearTecla(config[claveConfig]);
  aplicar(config[claveConfig]);

  boton.addEventListener('click', () => {
    cancelarRebind?.();
    boton.textContent = '...';
    const terminar = () => {
      boton.textContent = formatearTecla(config[claveConfig]);
      window.removeEventListener('keydown', onKey, true);
      cancelarRebind = null;
    };
    const onKey = (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      const code = e.code;
      if (code === 'Escape') {
        terminar();
        return;
      }
      const otraTecla = claveConfig === 'teclaAcelerar' ? config.teclaFrenar : config.teclaAcelerar;
      if (['KeyW','KeyS','KeyA','KeyD','KeyQ','KeyZ','KeyE','KeyR','Space','Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(code) || code === otraTecla) return;
      boton.textContent = formatearTecla(code);
      aplicar(code);
      config[claveConfig] = code;
      guardarConfig(config);
      terminar();
    };
    cancelarRebind = terminar;
    window.addEventListener('keydown', onKey, true);
  });
}

// ─── TECLAS DEL MODO PERSONALIZADO ────────────────────────────────────────────
// Si la tecla elegida ya la usa otra acción, las dos se intercambian.
function wireTeclasPersonalizadas() {
  const pintar = () => botonesTeclaAccion.forEach(b => { b.textContent = formatearTecla(config.teclas[b.dataset.teclaAccion]); });
  pintar();
  setTeclasPersonalizadas(config.teclas);
  botonesTeclaAccion.forEach(boton => boton.addEventListener('click', () => {
    cancelarRebind?.();
    const accion = boton.dataset.teclaAccion;
    boton.textContent = '...';
    const terminar = () => { window.removeEventListener('keydown', onKey, true); cancelarRebind = null; pintar(); };
    const onKey = ev => {
      ev.preventDefault(); ev.stopImmediatePropagation();
      if (ev.code === 'Escape') { terminar(); return; }
      if (TECLAS_RESERVADAS.includes(ev.code)) return;
      const otra = Object.keys(config.teclas).find(k => k !== accion && config.teclas[k] === ev.code);
      if (otra) config.teclas[otra] = config.teclas[accion];
      config.teclas[accion] = ev.code;
      setTeclasPersonalizadas(config.teclas);
      guardarConfig(config);
      terminar();
    };
    cancelarRebind = terminar;
    window.addEventListener('keydown', onKey, true);
  }));
}

// ─── INICIALIZACIÓN (llamado una vez desde main.js) ──────────────────────────
// main.js provee pausar(bool), porque controla el loop, y las posiciones de los
// planetas que pueden servir de punto fijo.
export function inicializarControlesNave({ pausar, puntosFijos: puntos } = {}) {
  if (pausar) pausarJuego = pausar;
  if (puntos) puntosFijos = puntos;
  botonAbrir.addEventListener('click', abrirPanel);
  botonCerrar.addEventListener('click', cerrarPanel);
  panel.addEventListener('click', e => { if (e.target === panel) cerrarPanel(); });

  botonesTabs.forEach(b => {
    b.addEventListener('click', () => seleccionarTab(b.dataset.modo));
  });

  wireSliderSensibilidad(sliderSensRotacion, setSensibilidadRotacion, 'sensRotacion');
  wireSliderSensibilidad(sliderSensCamara, setSensibilidadMouseLook, 'sensCamara');
  wireSliderSensibilidad(sliderSensJoystick, setSensibilidadJoystick, 'sensJoystick');
  wireSliderSensibilidad(sliderSensDireccionMedio, setSensibilidadDireccionMedio, 'sensDireccionMedio');
  wireSliderSensibilidad(sliderSensInclinacionAvanzado, setSensibilidadInclinacionAvanzado, 'sensInclinacionAvanzado');
  wireSliderSensibilidad(sliderSensPersonalizado, setSensibilidadRotacion, 'sensRotacion');
  wireTeclasPersonalizadas();
  wirePuntoFijo();
  wireEsquemaTactil();
  wireRebindTecla(botonRebindAcelerar, setTeclaAcelerar, 'teclaAcelerar');
  wireRebindTecla(botonRebindFrenar, setTeclaFrenar, 'teclaFrenar');
  wireMiraConfig();
  wireInterruptor(toggleMira, 'hudMira', 'mira');
  wireInterruptor(toggleOverlay, 'hudOverlay', 'overlay');
  wireInterruptor(toggleIndicadores, 'hudIndicadores', 'indicadores');
  wirePersonalizacion();

  aplicarBloqueoMobile();
  seleccionarTab(config.modo);

  // Si la ventana cambia de tamaño (ej. rotar el celular), re-evaluar el bloqueo
  window.addEventListener('resize', aplicarBloqueoMobile);
}
