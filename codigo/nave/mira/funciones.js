import { miraCentro, indicadores, energiaFill, energiaValor, velocidadFill, velocidadValor } from './elementos.js';
import { configurarEscaleraCabeceo } from './escalera-cabeceo.js';

// Se llama una vez por frame desde el loop de render (main.js) para reflejar el
// estado real de la nave (velocidad y energía, calculados en codigo/nave/nave.js)
// en las dos escalas laterales de la mira.
export function actualizarMira({ spd, maxSpeed, energia, energiaMax }) {
  const pctEnergia = Math.max(0, Math.min(100, (energia / energiaMax) * 100));
  energiaFill.style.height = pctEnergia + '%';
  energiaValor.textContent = Math.round(energia);

  const pctVelocidad = Math.max(0, Math.min(100, (spd / maxSpeed) * 100));
  velocidadFill.style.height = pctVelocidad + '%';
  velocidadValor.textContent = Math.round((spd / maxSpeed) * 100);
}

// Se llama desde el panel de controles-nave cuando el usuario cambia el color o el
// tamaño de la mira. Usa custom properties CSS (definidas en :root, en estilos.css)
// para que el cambio se vea al instante sin tocar el markup ni recalcular nada en JS.
// La escalera de cabeceo es geometría 3D, así que recibe los mismos valores aparte.
export function configurarMira({ color, tamano }) {
  if (color) document.documentElement.style.setProperty('--mira-color', color);
  if (tamano) document.documentElement.style.setProperty('--mira-escala', tamano);
  configurarEscaleraCabeceo({ color, tamano });
}

// Mostrar/ocultar cada parte del HUD. Se usa visibility (no display) para que
// ocultar una parte no desplace a las demás dentro de #mira.
export function configurarVisibilidadHud({ mira, indicadores: conIndicadores, overlay }) {
  if (typeof mira === 'boolean') miraCentro.style.visibility = mira ? '' : 'hidden';
  if (typeof conIndicadores === 'boolean') indicadores.forEach(el => { el.style.visibility = conIndicadores ? '' : 'hidden'; });
  if (typeof overlay === 'boolean') configurarEscaleraCabeceo({ visible: overlay });
}
