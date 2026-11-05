import {
  botonAbrir, panel, botonCerrar, botonesTabs, contenidosTabs,
  sliderSensRotacion, sliderSensCamara, sliderSensJoystick, sliderSensDireccionMedio,
  sliderSensInclinacionAvanzado, botonRebindAcelerar, botonRebindFrenar,
  miraColorInput, miraTamanoInput
} from './elementos.js';
import {
  setSensibilidadRotacion, setSensibilidadMouseLook, setSensibilidadJoystick,
  setSensibilidadDireccionMedio, setSensibilidadInclinacionAvanzado,
  setTeclaAcelerar, setTeclaFrenar, setModoControl, setEntradaSuspendida
} from '../nave.js';
import { configurarMira } from '../mira/funciones.js';

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
  miraTamano: 1
};

function cargarConfig() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_LOCALSTORAGE) || '{}');
    const config = { ...configPorDefecto, ...guardado };
    if (!['estandar', 'medio', 'avanzado'].includes(config.modo)) config.modo = 'estandar';
    for (const clave of ['sensRotacion', 'sensCamara', 'sensJoystick', 'sensDireccionMedio', 'sensInclinacionAvanzado']) {
      config[clave] = Number.isFinite(config[clave]) ? Math.max(0.1, Math.min(0.5, config[clave])) : 0.3;
    }
    config.miraTamano = Number.isFinite(config.miraTamano) ? Math.max(0.6, Math.min(1.6, config.miraTamano)) : 1;
    if (!/^#[\da-f]{6}$/i.test(config.miraColor)) config.miraColor = configPorDefecto.miraColor;
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
  if (modo === 'avanzado' && esMobile()) {
    // No cambiamos de modo real, solo mostramos el aviso de bloqueo
    botonesTabs.forEach(b => b.classList.toggle('active', b.dataset.modo === 'avanzado'));
    contenidosTabs.forEach(c => {
      c.hidden = c.dataset.modo !== 'avanzado';
      if (c.dataset.modo === 'avanzado') c.classList.add('bloqueado-mobile');
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
  const tabAvanzado = botonesTabs.find(b => b.dataset.modo === 'avanzado');
  if (!tabAvanzado) return;
  tabAvanzado.classList.toggle('bloqueada', esMobile());
  if (esMobile() && config.modo === 'avanzado') seleccionarTab('estandar');
}

// ─── SLIDERS DE SENSIBILIDAD (modo Estándar) ──────────────────────────────────
function wireSliderSensibilidad(slider, aplicar, claveConfig) {
  slider.value = config[claveConfig];
  aplicar(Number(slider.value));
  slider.addEventListener('input', () => {
    const valor = Number(slider.value);
    aplicar(valor);
    config[claveConfig] = valor;
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

// ─── REASIGNACIÓN DE TECLAS (modo Avanzado: acelerar / frenar) ───────────────
// Convierte un KeyboardEvent.code ("ShiftLeft", "KeyW", "Digit1"...) en una
// etiqueta corta para mostrar en el botón ("SHIFT", "W", "1"...).
function formatearTecla(code) {
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

// ─── INICIALIZACIÓN (llamado una vez desde main.js) ──────────────────────────
export function inicializarControlesNave() {
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
  wireRebindTecla(botonRebindAcelerar, setTeclaAcelerar, 'teclaAcelerar');
  wireRebindTecla(botonRebindFrenar, setTeclaFrenar, 'teclaFrenar');
  wireMiraConfig();

  aplicarBloqueoMobile();
  seleccionarTab(config.modo);

  // Si la ventana cambia de tamaño (ej. rotar el celular), re-evaluar el bloqueo
  window.addEventListener('resize', aplicarBloqueoMobile);
}
