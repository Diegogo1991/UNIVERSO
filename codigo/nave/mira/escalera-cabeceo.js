import * as THREE from 'three';
import { scene, camera } from '../escena.js';
import { arribaReferencia } from '../nave.js';

// ─── ESCALERA DE CABECEO 3D (PITCH LADDER) ───────────────────────────────────
// Cada marca es geometría real en el mundo: un segmento horizontal situado a
// DISTANCIA unidades de la CÁMARA, en la dirección "rumbo de la nave + N grados".
// El origen es la cámara (el punto desde donde se ve) y no la nave: así la línea
// de 0° coincide con el horizonte visible y el HUD no flota cuando la cámara se
// atrasa respecto a la nave. El círculo marca hacia dónde apunta la nave. La
// referencia es el horizonte del mundo (no la nave), así que el alabeo y la
// perspectiva salen de la propia cámara, igual que el resto de la escena.
// Los tamaños se definen en px de pantalla y se convierten a unidades del mundo
// cada frame para que el HUD conserve su tamaño aparente.
// La nave tapa la escalera (máscara de stencil, ver nave.js): el HUD se ve
// proyectado lejos, delante de la nave, y no pintado encima de ella.
const PASO_GRADOS = 10;
const RANGO_MARCAS = 90;
const RANGO_VISIBLE_GRADOS = 26;     // marcas dibujadas alrededor del cabeceo actual
const DESVANECER_DESDE_GRADOS = 14;  // a partir de aquí la marca se desvanece hasta el rango visible
const GIRO_RUMBO = 10;               // rapidez (1/s) con que la escalera sigue el rumbo; se frena cerca de la vertical
export const STENCIL_NAVE = 1;
const DISTANCIA = 200;               // radio de la esfera imaginaria de marcas
const GAP_PX = 18;                   // hueco central de cada marca
const MEDIO_PX = 34;                 // largo de cada mitad de la marca
const TICK_PX = 7;                   // tick exterior, apunta hacia el horizonte
const TEXTO_PX = 13;                 // alto del número
const SEPARACION_TEXTO_PX = 14;
const NARIZ_PX = 5;                  // radio del marcador de la nariz
const DASH_PX = 6, HUECO_DASH_PX = 5;

const ANGULOS = [];
for (let a = -RANGO_MARCAS; a <= RANGO_MARCAS; a += PASO_GRADOS) ANGULOS.push(a);

function crearLineas(material, segmentos, conDistancia) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segmentos * 6), 3));
  // RGBA por vértice: el alfa desvanece las marcas en el borde del rango visible.
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(segmentos * 8).fill(1), 4));
  if (conDistancia) geo.setAttribute('lineDistance', new THREE.BufferAttribute(new Float32Array(segmentos * 2), 1));
  geo.setDrawRange(0, 0);
  const lineas = new THREE.LineSegments(geo, material);
  lineas.frustumCulled = false;
  return lineas;
}

const opcionesHud = { transparent: true, opacity: 0.9, depthTest: false, depthWrite: false, fog: false, toneMapped: false,
  stencilWrite: true, stencilWriteMask: 0, stencilRef: STENCIL_NAVE, stencilFunc: THREE.NotEqualStencilFunc };
const materialSolido = new THREE.LineBasicMaterial({ ...opcionesHud, vertexColors: true });
const materialPunteado = new THREE.LineDashedMaterial({ ...opcionesHud, vertexColors: true, dashSize: 1, gapSize: 1 });
const solidas = crearLineas(materialSolido, ANGULOS.length * 4 + 24, false);
const punteadas = crearLineas(materialPunteado, ANGULOS.length * 4, true);

function crearMaterialTexto(texto) {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 32;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
  ctx.fillText(texto, 32, 17);
  const textura = new THREE.CanvasTexture(canvas);
  return new THREE.SpriteMaterial({ ...opcionesHud, map: textura });
}
// Un material por ángulo (no por valor absoluto): +10 y -10 pueden verse a la
// vez con distinto desvanecimiento.
const materialesTexto = new Map();
const etiquetas = [];
for (const angulo of ANGULOS) {
  if (angulo === 0) continue;
  materialesTexto.set(angulo, crearMaterialTexto(String(Math.abs(angulo))));
  for (const lado of [-1, 1]) {
    const sprite = new THREE.Sprite(materialesTexto.get(angulo));
    sprite.visible = false;
    etiquetas.push({ angulo, lado, sprite });
  }
}

const hud = new THREE.Group();
hud.renderOrder = 999;
hud.add(solidas, punteadas, ...etiquetas.map(e => e.sprite));
hud.traverse(obj => { obj.renderOrder = 999; obj.raycast = () => {}; });
scene.add(hud);

let escala = 1, activa = true;
export function configurarEscaleraCabeceo({ color, tamano, visible }) {
  if (typeof visible === 'boolean') activa = visible;
  if (color) {
    materialSolido.color.set(color); materialPunteado.color.set(color);
    materialesTexto.forEach(m => m.color.set(color));
  }
  if (tamano) escala = tamano;
}

// "Arriba" de referencia del frame: +Y del universo o, con punto fijo, planeta → nave.
const ARRIBA = new THREE.Vector3(0, 1, 0);
const adelante = new THREE.Vector3(), rumbo = new THREE.Vector3(0, 0, -1), derecha = new THREE.Vector3();
const visibles = new Set();
const direccion = new THREE.Vector3(), arribaLocal = new THREE.Vector3(), centro = new THREE.Vector3();
const a = new THREE.Vector3(), b = new THREE.Vector3(), tmp = new THREE.Vector3();
const p1 = new THREE.Vector3(), p2 = new THREE.Vector3();

let nSolidas = 0, nPunteadas = 0;
function segmento(punteada, desde, hasta, alfa = 1) {
  const lineas = punteada ? punteadas : solidas;
  const i = punteada ? nPunteadas++ : nSolidas++;
  const pos = lineas.geometry.attributes.position;
  pos.setXYZ(i * 2, desde.x, desde.y, desde.z);
  pos.setXYZ(i * 2 + 1, hasta.x, hasta.y, hasta.z);
  const col = lineas.geometry.attributes.color;
  col.setW(i * 2, alfa); col.setW(i * 2 + 1, alfa);
  if (punteada) {
    const dist = lineas.geometry.attributes.lineDistance;
    dist.setX(i * 2, 0); dist.setX(i * 2 + 1, desde.distanceTo(hasta));
  }
}
function cerrarLineas(lineas, n) {
  lineas.geometry.setDrawRange(0, n * 2);
  lineas.geometry.attributes.position.needsUpdate = true;
  lineas.geometry.attributes.color.needsUpdate = true;
  if (lineas.geometry.attributes.lineDistance) lineas.geometry.attributes.lineDistance.needsUpdate = true;
}
const alfaMarca = angulo => 1 - THREE.MathUtils.smoothstep(Math.abs(angulo - pitch), DESVANECER_DESDE_GRADOS, RANGO_VISIBLE_GRADOS);

// Ángulo en pantalla del horizonte proyectado, para que los números giren
// junto a las marcas.
function alabeoEnPantalla(origen, eje) {
  p1.copy(origen).project(camera);
  p2.copy(origen).add(eje).project(camera);
  return Math.atan2((p2.y - p1.y) * innerHeight, (p2.x - p1.x) * innerWidth);
}

// Rumbo de la escalera: dirección horizontal hacia la que mira la escalera. No
// se copia del rumbo de la nave en cada frame: cerca de la vertical ese rumbo
// casi no existe (tiembla) y al pasar por encima se invierte 180° de golpe, lo
// que hacía "bailar" la escalera. Se gira hacia él alrededor del arriba de
// referencia, más despacio cuanto más vertical está la nariz.
let pitch = 0, ultimoTiempo = 0;
function seguirRumbo(dt) {
  const alturaNariz = adelante.dot(ARRIBA);
  // Reproyecta el rumbo anterior: el arriba cambia con el punto fijo.
  rumbo.addScaledVector(ARRIBA, -rumbo.dot(ARRIBA));
  if (rumbo.lengthSq() < 1e-6) rumbo.copy(derecha).cross(ARRIBA);
  rumbo.normalize();
  tmp.copy(adelante).addScaledVector(ARRIBA, -alturaNariz);
  const horizontal = tmp.length();
  if (horizontal > 1e-4) {
    tmp.divideScalar(horizontal);
    const angulo = Math.atan2(a.crossVectors(rumbo, tmp).dot(ARRIBA), rumbo.dot(tmp));
    rumbo.applyAxisAngle(ARRIBA, angulo * THREE.MathUtils.clamp(GIRO_RUMBO * horizontal * dt, 0, 1)).normalize();
  }
  // Cabeceo medido contra el rumbo de la escalera: continuo incluso más allá
  // de 90° mientras la escalera termina de girar.
  pitch = THREE.MathUtils.radToDeg(Math.atan2(alturaNariz, adelante.dot(rumbo)));
  derecha.crossVectors(rumbo, ARRIBA).normalize();
}

export function actualizarEscaleraCabeceo({ shipGroup }) {
  const ahora = performance.now() / 1000;
  const dt = ultimoTiempo ? Math.min(ahora - ultimoTiempo, 0.1) : 1;
  ultimoTiempo = ahora;
  hud.visible = activa && !document.body.classList.contains('editando');
  if (!hud.visible) return;

  adelante.set(0, 0, -1).applyQuaternion(shipGroup.quaternion);
  arribaReferencia(shipGroup.position, ARRIBA);
  seguirRumbo(dt);

  centro.copy(rumbo).multiplyScalar(DISTANCIA).add(camera.position);
  const tanFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const mundoPorPx = 2 * Math.max(1, camera.position.distanceTo(centro)) * tanFov / innerHeight * escala;
  const gap = GAP_PX * mundoPorPx, medio = MEDIO_PX * mundoPorPx, tick = TICK_PX * mundoPorPx;
  materialPunteado.dashSize = DASH_PX * mundoPorPx; materialPunteado.gapSize = HUECO_DASH_PX * mundoPorPx;

  nSolidas = nPunteadas = 0;
  visibles.clear();
  for (const angulo of ANGULOS) {
    if (Math.abs(angulo - pitch) > RANGO_VISIBLE_GRADOS) continue;
    visibles.add(angulo);
    const rad = THREE.MathUtils.degToRad(angulo);
    direccion.copy(rumbo).multiplyScalar(Math.cos(rad)).addScaledVector(ARRIBA, Math.sin(rad));
    arribaLocal.copy(rumbo).multiplyScalar(-Math.sin(rad)).addScaledVector(ARRIBA, Math.cos(rad));
    centro.copy(direccion).multiplyScalar(DISTANCIA).add(camera.position);
    const alfa = alfaMarca(angulo);

    if (angulo === 0) {
      segmento(false, a.copy(centro).addScaledVector(derecha, -(gap + medio)), b.copy(centro).addScaledVector(derecha, gap + medio), alfa);
      continue;
    }
    const punteada = angulo < 0;
    const haciaHorizonte = -Math.sign(angulo) * tick;
    for (const lado of [-1, 1]) {
      a.copy(centro).addScaledVector(derecha, lado * gap);
      b.copy(centro).addScaledVector(derecha, lado * (gap + medio));
      segmento(punteada, a, b, alfa);
      a.copy(b).addScaledVector(arribaLocal, haciaHorizonte);
      segmento(punteada, b, a, alfa);
    }
  }

  // Marcador de la nariz: círculo orientado hacia la cámara en la dirección real.
  centro.copy(adelante).multiplyScalar(DISTANCIA).add(camera.position);
  const radio = NARIZ_PX * mundoPorPx;
  tmp.set(1, 0, 0).applyQuaternion(camera.quaternion);
  arribaLocal.set(0, 1, 0).applyQuaternion(camera.quaternion);
  for (let i = 0; i < 12; i++) {
    const t0 = i / 12 * Math.PI * 2, t1 = (i + 1) / 12 * Math.PI * 2;
    a.copy(centro).addScaledVector(tmp, Math.cos(t0) * radio).addScaledVector(arribaLocal, Math.sin(t0) * radio);
    b.copy(centro).addScaledVector(tmp, Math.cos(t1) * radio).addScaledVector(arribaLocal, Math.sin(t1) * radio);
    segmento(false, a, b);
  }
  cerrarLineas(solidas, nSolidas); cerrarLineas(punteadas, nPunteadas);

  centro.copy(rumbo).multiplyScalar(DISTANCIA).add(camera.position);
  const giro = alabeoEnPantalla(centro, derecha);
  materialesTexto.forEach((m, angulo) => { m.rotation = giro; m.opacity = 0.9 * alfaMarca(angulo); });
  const separacion = gap + medio + SEPARACION_TEXTO_PX * mundoPorPx;
  for (const { angulo, lado, sprite } of etiquetas) {
    sprite.visible = visibles.has(angulo);
    if (!sprite.visible) continue;
    const rad = THREE.MathUtils.degToRad(angulo);
    direccion.copy(rumbo).multiplyScalar(Math.cos(rad)).addScaledVector(ARRIBA, Math.sin(rad));
    sprite.position.copy(direccion).multiplyScalar(DISTANCIA).add(camera.position).addScaledVector(derecha, lado * separacion);
    sprite.scale.set(TEXTO_PX * 2 * mundoPorPx, TEXTO_PX * mundoPorPx, 1);
  }
}
