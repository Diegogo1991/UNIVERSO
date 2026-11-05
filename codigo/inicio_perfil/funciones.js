import { montarFondo, FONDOS } from '../interfaz/fondos/fondos-war-dreams.js';
import { crearAudioAmbiente } from './audio-ambiente.js';
import { inicioPerfil, capaFondo, videoFondo, mitadPerfil, mitadBotones, panalPerfil, hexPerfil,
  nombrePerfil, fotoPerfil, cargaInicio, botonPlay, botonesSatelite, botonAjustes, botonEspiral, botonMenu, aviso, botonSonido, panelAjustes, opcionesFondo } from './elementos.js';

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

const TEXTO_PROXIMAMENTE = 'COMING SOON';
const DURACION_AVISO_MS = 4000;
const AUDIO_AMBIENTE = '/inicio_perfil/olas-de-mar-reverberacion.m4a';
const FONDO_VIDEO = 'video';
const OPCIONES_FONDO = { [FONDO_VIDEO]: 'Video: Playa Diego', ...FONDOS };
const CLAVE_FONDO = 'inicio-perfil-fondo-seleccion';
const ESTILO_FONDO = { color: '#ff7a1a', colorFondo: '#070402', colorPuntos: '#3d1f0a', opacidad: 0.6 };
const ESTILO_CARGA = { tipo: 'red', color: '#ff7a1a', colorFondo: '#000000', cuadricula: false, opacidad: 0.75, densidad: 0.5 };
// Si la red es muy lenta, el inicio se muestra igual pasado este tiempo.
const ESPERA_MAXIMA_MS = 15000;
const SALIDA_CARGA_MS = 600;   // igual a la transición de #inicio-carga en estilos.css

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
  return inicial;
}

function esperar(elemento, listo, eventos) {
  return new Promise(resolver => {
    if (listo()) { resolver(); return; }
    eventos.forEach(evento => elemento.addEventListener(evento, resolver, { once: true }));
  });
}

// Un recurso que falla también libera la carga: mejor un hueco que una espera eterna.
function mostrarCuandoCargue(conVideo) {
  const fondoCarga = montarFondo(cargaInicio, ESTILO_CARGA);
  const recursos = [esperar(fotoPerfil, () => fotoPerfil.complete, ['load', 'error'])];
  if (conVideo) recursos.push(esperar(videoFondo, () => videoFondo.readyState >= 4, ['canplaythrough', 'error']));
  const limite = new Promise(resolver => setTimeout(resolver, ESPERA_MAXIMA_MS));
  Promise.race([Promise.all(recursos), limite]).then(() => {
    cargaInicio.classList.add('saliendo');
    setTimeout(() => { cargaInicio.hidden = true; fondoCarga.destruir(); }, SALIDA_CARGA_MS);
  });
}

// El video siempre va en silencio; el sonido es un audio ambiente aparte que
// solo puede empezar con un toque del usuario.
function inicializarSonido() {
  const ambiente = crearAudioAmbiente(AUDIO_AMBIENTE);
  let activo = false;
  const reflejar = () => botonSonido.setAttribute('aria-pressed', String(activo));
  botonSonido.addEventListener('click', () => {
    activo = !activo;
    reflejar();
    if (!activo) { ambiente.desactivar(); return; }
    ambiente.activar().catch(error => {
      console.error('No se pudo reproducir el audio ambiente:', error);
      activo = false; reflejar();
    });
  });
  reflejar();
}

// Botones sin función todavía: muestran un aviso que se oculta solo.
function inicializarProximamente() {
  let temporizador = 0;
  const mostrar = () => {
    aviso.textContent = TEXTO_PROXIMAMENTE;
    aviso.classList.add('visible');
    clearTimeout(temporizador);
    temporizador = setTimeout(() => aviso.classList.remove('visible'), DURACION_AVISO_MS);
  };
  [botonMenu, botonPlay, ...botonesSatelite, botonEspiral].forEach(boton => boton.addEventListener('click', mostrar));
}

// Cada letra es un span con su índice; la animación CSS (inicio-energia) se
// desfasa por letra para que el brillo avance de izquierda a derecha.
function prepararEnergiaNombre() {
  const texto = nombrePerfil.textContent;
  nombrePerfil.setAttribute('aria-label', texto);
  nombrePerfil.replaceChildren(...[...texto].map((letra, i) => {
    const span = document.createElement('span');
    span.textContent = letra;
    span.style.setProperty('--i', i);
    span.setAttribute('aria-hidden', 'true');
    return span;
  }));
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

  inicializarSonido();
  inicializarProximamente();
  prepararEnergiaNombre();
  const fondoInicial = inicializarFondo();
  mostrarCuandoCargue(fondoInicial === FONDO_VIDEO);

  botonAjustes.addEventListener('click', () => abrirAjustes(panelAjustes.hidden));
  inicioPerfil.addEventListener('pointerdown', e => {
    if (!panelAjustes.hidden && !panelAjustes.contains(e.target) && !botonAjustes.contains(e.target)) abrirAjustes(false);
  });
  inicioPerfil.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !panelAjustes.hidden) { abrirAjustes(false); botonAjustes.focus(); }
  });
}
