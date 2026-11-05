import {
  planetHint, interactPrompt, speedFill,
  cvOverlay, closeBtn,
  audioToggle, audioPanel, audioClose, trackSelect, audioEl,
  playBtn, pauseBtn, stopBtn, statusLbl
} from './elementos.js';
import { setEntradaSuspendida } from '../nave/nave.js';

// ─── HUD DE VUELO ────────────────────────────────────────────────────────────
export function actualizarIndicadoresVuelo({ distPlanet, distSistema, inSistemaUniverse, spd, maxSpeed }) {
  if (inSistemaUniverse) {
    planetHint.textContent = '🌌 UNIVERSO ESTELAR: Presiona R para regresar';
    planetHint.style.opacity = 1;
  } else if (distSistema < 130) {
    planetHint.textContent = '◈ SISTEMA detectado — presiona E o haz click';
    planetHint.style.opacity = Math.min(1, (130 - distSistema) / 70);
  } else if (distPlanet < 130) {
    planetHint.textContent = '◈ PLANETA DETECTADO — HAZ CLICK o E';
    planetHint.style.opacity = Math.min(1, (130 - distPlanet) / 70);
  } else {
    planetHint.textContent = '◈ PLANETA DETECTADO — HAZ CLICK ◈';
    planetHint.style.opacity = 0;
  }

  if (!inSistemaUniverse && distPlanet < 55) {
    interactPrompt.style.opacity = '1';
    interactPrompt.style.pointerEvents = 'auto';
  } else {
    interactPrompt.style.opacity = '0';
    interactPrompt.style.pointerEvents = 'none';
  }

  speedFill.style.width = (spd / maxSpeed * 100).toFixed(1) + '%';
}

let avisoTimer;
export function mostrarMensajeTemporal(mensaje, duracionMs = 4000) {
  const aviso = document.getElementById('aviso-global');
  aviso.textContent = mensaje;
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => { aviso.textContent = ''; }, duracionMs);
}

// ─── CV OVERLAY ──────────────────────────────────────────────────────────────
// También suspende el apuntado por mouse del modo Medio mientras está abierto,
// mismo motivo que el panel de controles-nave.
export function mostrarCV() { cvOverlay.classList.add('active'); setEntradaSuspendida(true, 'cv'); }
export function ocultarCV() { cvOverlay.classList.remove('active'); setEntradaSuspendida(false, 'cv'); }

closeBtn.addEventListener('click', ocultarCV);
cvOverlay.addEventListener('click', e => { if (e.target === cvOverlay) ocultarCV(); });

// ─── REPRODUCTOR DE AUDIO FLOTANTE ───────────────────────────────────────────
function updateStatus(text) {
  statusLbl.textContent = 'Estado: ' + text;
}

function setTrack(src) {
  if (!src) return;
  const wasPlaying = !audioEl.paused && !audioEl.ended;
  audioEl.src = src;
  audioEl.load();
  if (wasPlaying) audioEl.play().catch(() => {});
}

audioToggle.addEventListener('click', () => {
  const isOpen = audioPanel.classList.toggle('open');
  audioPanel.setAttribute('aria-hidden', !isOpen);
  setEntradaSuspendida(isOpen, 'audio');
});

audioClose.addEventListener('click', () => {
  audioPanel.classList.remove('open');
  audioPanel.setAttribute('aria-hidden', 'true');
  setEntradaSuspendida(false, 'audio');
});

trackSelect.addEventListener('change', (e) => {
  setTrack(e.target.value);
  updateStatus('cargando ' + e.target.selectedOptions[0].text);
  audioEl.play().then(() => updateStatus('reproduciendo ' + e.target.selectedOptions[0].text))
    .catch(() => updateStatus('Play bloqueado, haz click manualmente'));
});

playBtn.addEventListener('click', () => {
  if (!audioEl.src) setTrack(trackSelect.value);
  audioEl.play().then(() => updateStatus('reproduciendo ' + trackSelect.selectedOptions[0].text))
    .catch(() => updateStatus('No se puede reproducir (permiso navegador).'));
});

pauseBtn.addEventListener('click', () => {
  audioEl.pause();
  updateStatus('pausado');
});

stopBtn.addEventListener('click', () => {
  audioEl.pause();
  audioEl.currentTime = 0;
  updateStatus('detenido');
});

audioEl.addEventListener('ended', () => updateStatus('detenido'));
audioEl.addEventListener('play', () => updateStatus('reproduciendo'));
audioEl.addEventListener('pause', () => updateStatus('pausado'));

// ── CONTINUOUS CURVE FLOATING MOVEMENT ──
let floatTime = 0;
let floatVelX = (Math.random() - 0.5) * 2;
let floatVelY = (Math.random() - 0.5) * 2;
let floatPosX = 0;
let floatPosY = 0;

const maxXLeft = 280;   // Distancia máxima hacia la izquierda
const maxXRight = 20;   // Distancia máxima hacia la derecha (limitada para no salir)
const maxYTop = 280;    // Distancia máxima hacia arriba
const minYBottom = -30; // Distancia mínima hacia abajo

function updateAudioFloatPosition() {
  floatTime += 0.02; // Incremento de tiempo (controla velocidad general)

  // Cambio suave de velocidad usando seno y coseno con múltiples frecuencias
  floatVelX += (Math.sin(floatTime * 0.5) * 0.1 - floatVelX * 0.05);
  floatVelY += (Math.cos(floatTime * 0.7) * 0.1 - floatVelY * 0.05);

  // Limitar velocidades
  floatVelX = Math.max(-0.8, Math.min(0.8, floatVelX));
  floatVelY = Math.max(-0.8, Math.min(0.8, floatVelY));

  // Actualizar posición
  floatPosX += floatVelX;
  floatPosY += floatVelY;

  // Rebote suave en los límites (mantiene dentro del rango asimétrico)
  if (floatPosX > maxXRight || floatPosX < -maxXLeft) {
    floatVelX *= -0.8;
    floatPosX = Math.max(-maxXLeft, Math.min(maxXRight, floatPosX));
  }
  if (floatPosY > minYBottom || floatPosY < -maxYTop) {
    floatVelY *= -0.8;
    floatPosY = Math.max(-maxYTop, Math.min(minYBottom, floatPosY));
  }

  // Aplicar transformación
  audioToggle.style.transform = `translate(${floatPosX}px, ${floatPosY}px)`;
}

// Animar continuamente
function animateFloatLoop() {
  updateAudioFloatPosition();
  requestAnimationFrame(animateFloatLoop);
}
animateFloatLoop();
