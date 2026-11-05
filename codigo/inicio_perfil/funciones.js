import { montarFondo, FONDOS } from '../interfaz/fondos/fondos-war-dreams.js';
import { inicioPerfil, capaFondo, videoFondo, mitadPerfil, mitadBotones, panalPerfil, hexPerfil,
  nombrePerfil, botonPlay, botonesSatelite, botonAjustes, panelAjustes, opcionesFondo } from './elementos.js';

// ─── PARÁMETROS DE DISEÑO ────────────────────────────────────────────────────
const AREA_PERFIL = 0.19;            // fracción del área de su mitad
const AREA_PLAY = 0.10;              // fracción del área de su mitad
const MARGEN = 0.96;                 // fracción de la mitad que puede ocupar cada grupo
const SEPARACION = 0.14;             // hueco entre hexágonos, en lados del hexágono PLAY
const SEPARACION_NOMBRE = 14;        // px entre la foto y el nombre
// Apotema de un satélite respecto a la del PLAY. Por debajo del mínimo se
// reduce el panal entero en vez de encoger solo los satélites.
const PROPORCION_SATELITE_MIN = 0.5;
const PROPORCION_SATELITE_MAX = 0.62;
// Un satélite por lado, en sentido horario desde arriba a la izquierda
// (ángulos de pantalla: y crece hacia abajo).
const ANGULOS_SATELITES = [-120, -60, 0, 60, 120, 180];

const FONDO_VIDEO = 'video';
const OPCIONES_FONDO = { [FONDO_VIDEO]: 'Video: Playa Diego', ...FONDOS };
const CLAVE_FONDO = 'inicio-perfil-fondo-seleccion';
const ESTILO_FONDO = { color: '#ff7a1a', colorFondo: '#070402', colorPuntos: '#3d1f0a', opacidad: 0.6 };

const SQRT3 = Math.sqrt(3);
const SEN60 = SQRT3 / 2;
const AREA_POR_LADO2 = 3 * SQRT3 / 2;   // área de un hexágono = esto × lado²
const ladoPorArea = area => Math.sqrt(area / AREA_POR_LADO2);
const px = n => `${n.toFixed(2)}px`;

function ajustarPerfil(ancho, alto) {
  const altoNombre = nombrePerfil.offsetHeight + SEPARACION_NOMBRE;
  const lado = Math.max(0, Math.min(ladoPorArea(AREA_PERFIL * ancho * alto),
    (MARGEN * alto - altoNombre) / 2, MARGEN * ancho / SQRT3));
  // Foto y nombre se centran como un solo bloque.
  const y = -altoNombre / 2;
  panalPerfil.style.setProperty('--s', px(lado));
  hexPerfil.style.setProperty('--y', px(y));
  panalPerfil.style.setProperty('--nombre-y', px(y + lado + SEPARACION_NOMBRE));
}

function ajustarPanal(ancho, alto) {
  const limiteX = MARGEN * ancho / 2, limiteY = MARGEN * alto / 2;
  const k = SEPARACION * 2 / SQRT3;   // hueco expresado en apotemas del PLAY
  let apotema = ladoPorArea(AREA_PLAY * ancho * alto) * SEN60;
  let r = Math.min(
    PROPORCION_SATELITE_MAX,
    (limiteX - apotema * (1 + k)) / (2 * apotema),
    (limiteY - apotema * (1 + k) * SEN60) / (apotema * (SEN60 + 2 / SQRT3))
  );
  if (r < PROPORCION_SATELITE_MIN) {
    r = PROPORCION_SATELITE_MIN;
    apotema = Math.min(apotema,
      limiteX / (1 + k + 2 * r),
      limiteY / ((1 + k + r) * SEN60 + r * 2 / SQRT3));
  }
  apotema = Math.max(0, apotema);
  const distancia = apotema * (1 + k + r);
  botonPlay.style.setProperty('--s', px(apotema * 2 / SQRT3));
  botonesSatelite.forEach((boton, i) => {
    const angulo = ANGULOS_SATELITES[i] * Math.PI / 180;
    boton.style.setProperty('--s', px(r * apotema * 2 / SQRT3));
    boton.style.setProperty('--x', px(Math.cos(angulo) * distancia));
    boton.style.setProperty('--y', px(Math.sin(angulo) * distancia));
  });
}

function leerFondoGuardado() {
  try {
    const guardado = localStorage.getItem(CLAVE_FONDO);
    return guardado in OPCIONES_FONDO ? guardado : FONDO_VIDEO;
  } catch { return FONDO_VIDEO; }
}

function inicializarFondo() {
  const inicial = leerFondoGuardado();
  // Radios nativos: dan navegación con flechas y lectura accesible sin código extra.
  for (const [valor, nombre] of Object.entries(OPCIONES_FONDO)) {
    const opcion = document.createElement('label');
    opcion.className = 'inicio-fondo-opcion';
    const radio = Object.assign(document.createElement('input'),
      { type: 'radio', name: 'inicio-fondo', value: valor, checked: valor === inicial });
    const texto = document.createElement('span');
    texto.textContent = nombre;
    opcion.append(radio, texto);
    opcionesFondo.append(opcion);
  }
  const fondo = montarFondo(capaFondo, { ...ESTILO_FONDO, tipo: 'ninguno' });
  const aplicar = tipo => {
    const conVideo = tipo === FONDO_VIDEO;
    videoFondo.hidden = !conVideo;
    if (conVideo) videoFondo.play().catch(() => {});
    else videoFondo.pause();
    fondo.actualizar({ tipo: conVideo ? 'ninguno' : tipo, cuadricula: !conVideo });
  };
  aplicar(inicial);
  opcionesFondo.addEventListener('change', ({ target }) => {
    aplicar(target.value);
    try { localStorage.setItem(CLAVE_FONDO, target.value); } catch { /* sin almacenamiento: solo dura la sesión */ }
  });
}

function abrirAjustes(abrir) {
  panelAjustes.hidden = !abrir;
  botonAjustes.setAttribute('aria-expanded', String(abrir));
}

export function inicializarInicioPerfil() {
  const observador = new ResizeObserver(entradas => {
    for (const { target, contentRect: { width, height } } of entradas) {
      if (target === mitadPerfil) ajustarPerfil(width, height);
      else ajustarPanal(width, height);
    }
  });
  observador.observe(mitadPerfil);
  observador.observe(mitadBotones);

  inicializarFondo();

  botonAjustes.addEventListener('click', () => abrirAjustes(panelAjustes.hidden));
  inicioPerfil.addEventListener('pointerdown', e => {
    if (!panelAjustes.hidden && !panelAjustes.contains(e.target) && !botonAjustes.contains(e.target)) abrirAjustes(false);
  });
  inicioPerfil.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !panelAjustes.hidden) { abrirAjustes(false); botonAjustes.focus(); }
  });
}
