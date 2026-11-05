import * as THREE from 'three';
import { scene, camera } from '../escena.js';

// ─── ESCALERA DE CABECEO 3D (PITCH LADDER) ───────────────────────────────────
// Cada marca es geometría real en el mundo: un segmento horizontal situado a
// DISTANCIA unidades de la nave, en la dirección "rumbo + N grados". La
// referencia es el horizonte del mundo (no la nave), así que el alabeo y la
// perspectiva salen de la propia cámara, igual que el resto de la escena.
// Los tamaños se definen en px de pantalla y se convierten a unidades del mundo
// cada frame para que el HUD conserve su tamaño aparente.
const PASO_GRADOS = 10;
const RANGO_MARCAS = 90;
const RANGO_VISIBLE_GRADOS = 20;     // marcas dibujadas alrededor del cabeceo actual
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
  if (conDistancia) geo.setAttribute('lineDistance', new THREE.BufferAttribute(new Float32Array(segmentos * 2), 1));
  geo.setDrawRange(0, 0);
  const lineas = new THREE.LineSegments(geo, material);
  lineas.frustumCulled = false;
  return lineas;
}

const opcionesHud = { transparent: true, opacity: 0.9, depthTest: false, depthWrite: false, fog: false, toneMapped: false };
const materialSolido = new THREE.LineBasicMaterial(opcionesHud);
const materialPunteado = new THREE.LineDashedMaterial({ ...opcionesHud, dashSize: 1, gapSize: 1 });
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
const materialesTexto = new Map();
const etiquetas = [];
for (const angulo of ANGULOS) {
  if (angulo === 0) continue;
  const valor = Math.abs(angulo);
  if (!materialesTexto.has(valor)) materialesTexto.set(valor, crearMaterialTexto(String(valor)));
  for (const lado of [-1, 1]) {
    const sprite = new THREE.Sprite(materialesTexto.get(valor));
    sprite.visible = false;
    etiquetas.push({ angulo, lado, sprite });
  }
}

const hud = new THREE.Group();
hud.renderOrder = 999;
hud.add(solidas, punteadas, ...etiquetas.map(e => e.sprite));
hud.traverse(obj => { obj.renderOrder = 999; obj.raycast = () => {}; });
scene.add(hud);

let escala = 1;
export function configurarEscaleraCabeceo({ color, tamano }) {
  if (color) {
    materialSolido.color.set(color); materialPunteado.color.set(color);
    materialesTexto.forEach(m => m.color.set(color));
  }
  if (tamano) escala = tamano;
}

const ARRIBA = new THREE.Vector3(0, 1, 0);
const adelante = new THREE.Vector3(), rumbo = new THREE.Vector3(0, 0, -1), derecha = new THREE.Vector3();
const visibles = new Set();
const direccion = new THREE.Vector3(), arribaLocal = new THREE.Vector3(), centro = new THREE.Vector3();
const a = new THREE.Vector3(), b = new THREE.Vector3(), tmp = new THREE.Vector3();
const p1 = new THREE.Vector3(), p2 = new THREE.Vector3();

let nSolidas = 0, nPunteadas = 0;
function segmento(punteada, desde, hasta) {
  const lineas = punteada ? punteadas : solidas;
  const i = punteada ? nPunteadas++ : nSolidas++;
  const pos = lineas.geometry.attributes.position;
  pos.setXYZ(i * 2, desde.x, desde.y, desde.z);
  pos.setXYZ(i * 2 + 1, hasta.x, hasta.y, hasta.z);
  if (punteada) {
    const dist = lineas.geometry.attributes.lineDistance;
    dist.setX(i * 2, 0); dist.setX(i * 2 + 1, desde.distanceTo(hasta));
  }
}
function cerrarLineas(lineas, n) {
  lineas.geometry.setDrawRange(0, n * 2);
  lineas.geometry.attributes.position.needsUpdate = true;
  if (lineas.geometry.attributes.lineDistance) lineas.geometry.attributes.lineDistance.needsUpdate = true;
}

// Ángulo en pantalla del horizonte proyectado, para que los números giren
// junto a las marcas.
function alabeoEnPantalla(origen, eje) {
  p1.copy(origen).project(camera);
  p2.copy(origen).add(eje).project(camera);
  return Math.atan2((p2.y - p1.y) * innerHeight, (p2.x - p1.x) * innerWidth);
}

export function actualizarEscaleraCabeceo({ shipGroup }) {
  hud.visible = !document.body.classList.contains('editando');
  if (!hud.visible) return;

  adelante.set(0, 0, -1).applyQuaternion(shipGroup.quaternion);
  const pitch = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(adelante.y, -1, 1)));
  tmp.set(adelante.x, 0, adelante.z);
  // Con la nariz vertical el rumbo no está definido: se conserva el anterior.
  if (tmp.lengthSq() > 1e-6) rumbo.copy(tmp).normalize();
  derecha.crossVectors(rumbo, ARRIBA).normalize();

  centro.copy(rumbo).multiplyScalar(DISTANCIA).add(shipGroup.position);
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
    centro.copy(direccion).multiplyScalar(DISTANCIA).add(shipGroup.position);

    if (angulo === 0) {
      segmento(false, a.copy(centro).addScaledVector(derecha, -(gap + medio)), b.copy(centro).addScaledVector(derecha, gap + medio));
      continue;
    }
    const punteada = angulo < 0;
    const haciaHorizonte = -Math.sign(angulo) * tick;
    for (const lado of [-1, 1]) {
      a.copy(centro).addScaledVector(derecha, lado * gap);
      b.copy(centro).addScaledVector(derecha, lado * (gap + medio));
      segmento(punteada, a, b);
      a.copy(b).addScaledVector(arribaLocal, haciaHorizonte);
      segmento(punteada, b, a);
    }
  }

  // Marcador de la nariz: círculo orientado hacia la cámara en la dirección real.
  centro.copy(adelante).multiplyScalar(DISTANCIA).add(shipGroup.position);
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

  centro.copy(rumbo).multiplyScalar(DISTANCIA).add(shipGroup.position);
  const giro = alabeoEnPantalla(centro, derecha);
  materialesTexto.forEach(m => { m.rotation = giro; });
  const separacion = gap + medio + SEPARACION_TEXTO_PX * mundoPorPx;
  for (const { angulo, lado, sprite } of etiquetas) {
    sprite.visible = visibles.has(angulo);
    if (!sprite.visible) continue;
    const rad = THREE.MathUtils.degToRad(angulo);
    direccion.copy(rumbo).multiplyScalar(Math.cos(rad)).addScaledVector(ARRIBA, Math.sin(rad));
    sprite.position.copy(direccion).multiplyScalar(DISTANCIA).add(shipGroup.position).addScaledVector(derecha, lado * separacion);
    sprite.scale.set(TEXTO_PX * 2 * mundoPorPx, TEXTO_PX * mundoPorPx, 1);
  }
}
