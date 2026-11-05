import { loadingEl, loadingBar, loadingText } from './elementos.js';

export function actualizarProgresoCarga(pct) {
  loadingBar.style.width = pct + '%';
  loadingText.textContent = 'CARGANDO NAVE... ' + pct + '%';
}

export function finalizarCarga() {
  loadingBar.style.width = '100%';
  loadingText.textContent = '¡LISTO! DESPEGANDO...';
  setTimeout(() => loadingEl.classList.add('hidden'), 800);
}

export function mostrarErrorCarga(mensaje) {
  loadingText.textContent = 'ERROR: ' + mensaje;
  setTimeout(() => loadingEl.classList.add('hidden'), 2000);
}
