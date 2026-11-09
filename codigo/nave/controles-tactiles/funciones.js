import { joystickIzquierdo, joystickDerecho, botonesAccion, botonesCrucero, controlesMovibles } from './elementos.js';

// Estado que nave.js lee cada frame. impulso/reversa: 0..1; yaw/pitch/desvioCamara:
// -1..1; crucero: 0 apagado, >0 fracción de la velocidad máxima, <0 de la reversa.
export const tactil = { impulso: 0, reversa: 0, freno: false, yaw: 0, pitch: 0, desvioCamara: 0, crucero: 0 };

const ZONA_MUERTA = 0.12;
const NOMBRES = {
  'joystick-izquierdo': 'Joystick de avance', 'joystick-derecho': 'Joystick de dirección',
  flechas: 'Flechas', pedales: 'Acelerar / frenar / retroceder', crucero: 'Velocidad constante', 'boton-e': 'Botón E'
};
export const ESCALA_CONTROL = { min: 0.6, max: 1.8 };

let estaSuspendida = () => false;
const curva = v => Math.abs(v) < ZONA_MUERTA ? 0 : Math.sign(v) * (Math.abs(v) - ZONA_MUERTA) / (1 - ZONA_MUERTA);

// ─── JOYSTICKS ────────────────────────────────────────────────────────────────
// La perilla se desplaza con --px/--py (-1..1); el CSS lo convierte a píxeles de
// la base sin escalar, así funciona igual con cualquier tamaño configurado.
const joysticks = [];
function crearJoystick(raiz, aplicar) {
  const base = raiz.querySelector('.tactil-joystick-base');
  const perilla = raiz.querySelector('.tactil-joystick-perilla');
  let puntero = null;
  const fijar = (x, y) => {
    perilla.style.setProperty('--px', x.toFixed(3)); perilla.style.setProperty('--py', y.toFixed(3));
    aplicar(curva(x), curva(y));
  };
  const mover = e => {
    if (e.pointerId !== puntero) return;
    const r = base.getBoundingClientRect();
    let x = (e.clientX - r.left) / r.width * 2 - 1, y = (e.clientY - r.top) / r.height * 2 - 1;
    const largo = Math.hypot(x, y);
    if (largo > 1) { x /= largo; y /= largo; }
    fijar(x, y);
  };
  const soltar = () => { puntero = null; fijar(0, 0); };
  base.addEventListener('pointerdown', e => {
    if (estaSuspendida()) return;
    puntero = e.pointerId; base.setPointerCapture(puntero); mover(e); e.preventDefault();
  });
  base.addEventListener('pointermove', mover);
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => base.addEventListener(ev, soltar));
  joysticks.push(soltar);
}

// ─── BOTONES MANTENIDOS (flechas y pedales) ──────────────────────────────────
const pulsados = new Set();
function recalcularBotones() {
  const p = accion => Number(pulsados.has(accion));
  tactil.yaw = p('girar-izquierda') - p('girar-derecha');
  tactil.pitch = p('inclinar-arriba') - p('inclinar-abajo');
  tactil.impulso = p('acelerar');
  tactil.reversa = p('retroceder');
  tactil.freno = pulsados.has('frenar');
}
function wireBotonMantenido(boton) {
  const accion = boton.dataset.accion;
  const soltar = () => { pulsados.delete(accion); boton.classList.remove('activo'); recalcularBotones(); };
  boton.addEventListener('pointerdown', e => {
    if (estaSuspendida()) return;
    pulsados.add(accion); boton.classList.add('activo'); recalcularBotones();
    boton.setPointerCapture(e.pointerId); e.preventDefault();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => boton.addEventListener(ev, soltar));
}

// ─── VELOCIDAD CONSTANTE (1-4 adelante, R1-R2 reversa) ───────────────────────
function reflejarCrucero() {
  botonesCrucero.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.crucero) === tactil.crucero)));
}
export function cancelarCrucero() {
  if (tactil.crucero === 0) return;
  tactil.crucero = 0; reflejarCrucero();
}

export function reiniciarTactil() {
  joysticks.forEach(soltar => soltar());
  pulsados.clear(); botonesAccion.forEach(b => b.classList.remove('activo'));
  Object.assign(tactil, { impulso: 0, reversa: 0, freno: false, yaw: 0, pitch: 0, desvioCamara: 0 });
  cancelarCrucero();
}

export function setEsquemaTactil(esquema) {
  document.body.classList.toggle('controles-joysticks', esquema === 'joysticks');
  document.body.classList.toggle('controles-flechas', esquema === 'flechas');
  reiniciarTactil();
}

// ─── DISEÑO: posición (% de la pantalla) y escala de cada control ────────────
function leerDiseno(el) {
  const r = el.getBoundingClientRect();
  return {
    x: +((r.left + r.width / 2) / innerWidth * 100).toFixed(2),
    y: +((r.top + r.height / 2) / innerHeight * 100).toFixed(2),
    escala: Number(el.style.getPropertyValue('--escala')) || 1
  };
}
export function aplicarDisenoTactil(diseno = {}) {
  controlesMovibles.forEach(el => {
    ['--x', '--y', '--escala'].forEach(p => el.style.removeProperty(p));
    const d = diseno[el.dataset.control];
    if (!d) return;
    el.style.setProperty('--x', d.x + '%'); el.style.setProperty('--y', d.y + '%');
    el.style.setProperty('--escala', d.escala);
  });
}

// Modo edición: tocar selecciona, arrastrar mueve. alCambiar(id, diseño) guarda;
// alSeleccionar recibe { nombre, escala } o null. Sin opciones se desactiva.
let edicion = null, seleccionado = null;
function seleccionar(el) {
  seleccionado?.classList.remove('seleccionado');
  seleccionado = el;
  el?.classList.add('seleccionado');
  edicion?.alSeleccionar(el ? { nombre: NOMBRES[el.dataset.control], escala: leerDiseno(el).escala } : null);
}
export function editarDisenoTactil(opciones) {
  if (!opciones) seleccionar(null);
  edicion = opciones || null;
  document.body.classList.toggle('personalizando-hud', Boolean(edicion));
}
export function setEscalaSeleccionado(escala) {
  if (!seleccionado) return;
  seleccionado.style.setProperty('--escala', escala);
  edicion?.alCambiar(seleccionado.dataset.control, leerDiseno(seleccionado));
}
function wireArrastre(el) {
  el.addEventListener('pointerdown', e => {
    if (!edicion) return;
    e.preventDefault();
    seleccionar(el);
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    el.setPointerCapture(e.pointerId);
    const limitar = v => Math.min(100, Math.max(0, v)).toFixed(2) + '%';
    const mover = ev => {
      el.style.setProperty('--x', limitar((ev.clientX - dx) / innerWidth * 100));
      el.style.setProperty('--y', limitar((ev.clientY - dy) / innerHeight * 100));
    };
    const soltar = () => {
      el.removeEventListener('pointermove', mover);
      el.removeEventListener('pointerup', soltar); el.removeEventListener('pointercancel', soltar);
      edicion?.alCambiar(el.dataset.control, leerDiseno(el));
    };
    el.addEventListener('pointermove', mover);
    el.addEventListener('pointerup', soltar); el.addEventListener('pointercancel', soltar);
  });
}

// estaSuspendida la provee main.js (viene de nave.js) para no importar nave.js
// desde aquí: nave.js ya importa este módulo.
export function inicializarControlesTactiles({ estaSuspendida: suspendida }) {
  estaSuspendida = suspendida;
  crearJoystick(joystickIzquierdo, (x, y) => {
    tactil.impulso = Math.max(0, -y); tactil.reversa = Math.max(0, y); tactil.desvioCamara = x;
  });
  crearJoystick(joystickDerecho, (x, y) => { tactil.yaw = -x; tactil.pitch = -y; });
  botonesAccion.forEach(wireBotonMantenido);
  botonesCrucero.forEach(boton => boton.addEventListener('click', () => {
    if (estaSuspendida()) return;
    const valor = Number(boton.dataset.crucero);
    tactil.crucero = tactil.crucero === valor ? 0 : valor;
    reflejarCrucero();
  }));
  controlesMovibles.forEach(wireArrastre);
}
