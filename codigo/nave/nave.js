import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { scene, renderer } from './escena.js';
import { crearEstadoVuelo, crearSimulador, VUELO, suavizado } from './simulacion.js';
import { mouseLook, touchLook, setRaycastBlockers, setSensibilidadMouseLook,
  actualizarCamara, setCamaraSuspendida, reiniciarCamara } from './camara.js';
export { mouseLook, touchLook, setRaycastBlockers, setSensibilidadMouseLook };

export const shipGroup = new THREE.Group();
scene.add(shipGroup);
export let shipModel = null;
const engineLight = new THREE.PointLight(0x44aaff, 0, 10);
shipGroup.add(engineLight);
// Relleno discreto para que la silueta siga legible en zonas oscuras.
const luzCabina = new THREE.PointLight(0xb2d8ff, 1.3, 16);
luzCabina.position.set(0, 4, 5); shipGroup.add(luzCabina);
const materialesCalientes = [];
const estelaPosiciones = new Float32Array(48 * 3);
const estelaGeometria = new THREE.BufferGeometry();
estelaGeometria.setAttribute('position', new THREE.BufferAttribute(estelaPosiciones, 3));
estelaGeometria.setDrawRange(0, 0);
const estela = new THREE.Points(estelaGeometria, new THREE.PointsMaterial({ color: 0x66caff, size: 0.22, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
estela.frustumCulled = false; scene.add(estela);
let puntosEstela = 0, tiempoEstela = 0;
export const estadoVuelo = crearEstadoVuelo();
const simulador = crearSimulador(estadoVuelo);
export const velocity = estadoVuelo.velocidad;
export const MAX_SPEED = VUELO.velocidadMaxima;
export function resetAngularVelocity() { simulador.reiniciar(); }
export function reposicionarNave(posicion) {
  shipGroup.position.copy(posicion); shipGroup.quaternion.identity();
  estadoVuelo.posicion.copy(posicion); estadoVuelo.orientacion.identity();
  velocity.set(0, 0, 0); simulador.reiniciar(); limpiarEntrada(); reiniciarCamara();
  puntosEstela = 0; estelaGeometria.setDrawRange(0, 0);
}
export function configurarModeloNave(model, group, makeBlue = false) {
  model.traverse(child => {
    if (!child.isMesh) return;
    child.castShadow = child.receiveShadow = true;
    const materiales = (Array.isArray(child.material) ? child.material : [child.material]).map(original => {
      const mat = original.clone(), c = mat.color;
      const naranja = c && c.r > 0.25 && c.g > 0.05 && c.g < 0.55 && c.b < 0.12;
      if (makeBlue && naranja) { mat.color.setHex(0x4488ff); mat.emissive?.setHex(0x002244); }
      mat.envMapIntensity = 1.5;
      return mat;
    });
    child.material = Array.isArray(child.material) ? materiales : materiales[0];
  });
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const centro = box.getCenter(new THREE.Vector3()), tamano = box.getSize(new THREE.Vector3());
  const escala = 6 / (Math.max(tamano.x, tamano.y, tamano.z) || 1);
  model.scale.multiplyScalar(escala); model.position.addScaledVector(centro, -escala);
  group.add(model);
}
export function cargarNave({ onProgress, onModeloListo, onError }) {
  new GLTFLoader().load('/nave/Nave.glb', gltf => {
    shipModel = gltf.scene.clone(); configurarModeloNave(shipModel, shipGroup);
    shipModel.traverse(child => {
      for (const mat of (Array.isArray(child.material) ? child.material : [child.material])) {
        const c = mat?.color;
        if (c && mat.emissive && c.r > 0.25 && c.g > 0.05 && c.g < 0.55 && c.b < 0.12) materialesCalientes.push(mat);
      }
    });
    onModeloListo(gltf.scene);
  }, onProgress, onError);
}
const forward = new THREE.Vector3(), up = new THREE.Vector3(), right = new THREE.Vector3();
const upReferencia = new THREE.Vector3(), worldUp = new THREE.Vector3(0, 1, 0);
export function getPitchRoll(ship) {
  forward.set(0, 0, -1).applyQuaternion(ship.quaternion);
  up.set(0, 1, 0).applyQuaternion(ship.quaternion);
  right.crossVectors(forward, worldUp);
  if (right.lengthSq() < 1e-6) right.set(1, 0, 0).applyQuaternion(ship.quaternion);
  else right.normalize();
  upReferencia.crossVectors(right, forward).normalize();
  return { pitch: THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(forward.y, -1, 1))),
    roll: THREE.MathUtils.radToDeg(Math.atan2(up.dot(right), up.dot(upReferencia))) };
}
export const keys = {}, joyVec = { x: 0, y: 0 }, medioApuntado = { x: 0, y: 0 };
const suspensiones = new Set();
export function entradaEstaSuspendida() { return suspensiones.size > 0; }
export function setEntradaSuspendida(v, motivo = 'panel') {
  if (v) suspensiones.add(motivo); else suspensiones.delete(motivo);
  setCamaraSuspendida(entradaEstaSuspendida());
  if (v) { limpiarEntrada(); velocity.set(0, 0, 0); simulador.reiniciar(); }
}
let modoControl = 'estandar', teclaAcelerar = 'ShiftLeft', teclaFrenar = 'ControlLeft';
let sensRotacion = 0.3, sensDireccion = 0.3, sensJoystick = 0.3, sensAvanzado = 0.3;
export const setTeclaAcelerar = v => { teclaAcelerar = v; };
export const setTeclaFrenar = v => { teclaFrenar = v; };
export const setSensibilidadRotacion = v => { sensRotacion = v; };
export const setSensibilidadDireccionMedio = v => { sensDireccion = v; };
export const setSensibilidadJoystick = v => { sensJoystick = v; };
export const setSensibilidadInclinacionAvanzado = v => { sensAvanzado = v; };
export function setModoControl(modo) {
  modoControl = ['estandar', 'medio', 'avanzado'].includes(modo) ? modo : 'estandar';
  limpiarEntrada(); simulador.reiniciar();
  document.getElementById('vuelo-modo').textContent = { estandar: 'EXPLORACIÓN', medio: 'ARCADE', avanzado: 'AVANZADO' }[modoControl];
  document.getElementById('vuelo-ayuda').textContent = modoControl === 'avanzado'
    ? 'W/S inclinar · A/D girar · Q/Z alabeo · impulso/freno configurables'
    : modoControl === 'medio' ? 'Mouse dirige · W impulso · S/Espacio freno · Shift turbo'
      : 'W impulso · S/Espacio freno · A/D girar · Q/Z subir/bajar';
}
export function esEntradaTexto(target) { return Boolean(target?.closest?.('input, textarea, select, [contenteditable="true"]')); }
function limpiarEntrada() {
  Object.keys(keys).forEach(k => { keys[k] = false; });
  medioApuntado.x = medioApuntado.y = joyVec.x = joyVec.y = 0;
  const knob = document.getElementById('joystick-knob');
  if (knob) knob.style.transform = 'translate(-50%, -50%)';
}
window.addEventListener('keydown', e => {
  if (e.code === 'Space' && e.target?.closest?.('button')) return;
  if (entradaEstaSuspendida() || esEntradaTexto(e.target) || (e.ctrlKey && e.code !== teclaFrenar) || e.metaKey || e.altKey) return;
  keys[e.code] = true;
  if (/^(Arrow|Space)/.test(e.code) || ['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyZ',teclaAcelerar,teclaFrenar].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', limpiarEntrada);
document.addEventListener('visibilitychange', limpiarEntrada);
const curva = v => Math.abs(v) < 0.12 ? 0 : Math.sign(v) * ((Math.abs(v) - 0.12) / 0.88) ** 1.5;
renderer.domElement.addEventListener('pointermove', e => {
  if (entradaEstaSuspendida() || e.pointerType === 'touch') return;
  medioApuntado.x = curva(e.clientX / innerWidth * 2 - 1);
  medioApuntado.y = curva(e.clientY / innerHeight * 2 - 1);
});
renderer.domElement.addEventListener('pointerleave', () => { medioApuntado.x = medioApuntado.y = 0; });
const joyEl = document.getElementById('joystick'), joyKnob = document.getElementById('joystick-knob');
let joyId = null;
function moverJoystick(e) {
  if (joyId !== e.pointerId) return;
  const rect = joyEl.getBoundingClientRect();
  const x = e.clientX - rect.left - rect.width / 2, y = e.clientY - rect.top - rect.height / 2;
  const divisor = Math.max(45, Math.hypot(x, y));
  joyVec.x = x / divisor; joyVec.y = y / divisor;
  joyKnob.style.transform = `translate(calc(-50% + ${joyVec.x * 35}px), calc(-50% + ${joyVec.y * 35}px))`;
}
joyEl.addEventListener('pointerdown', e => {
  if (entradaEstaSuspendida()) return;
  joyId = e.pointerId; joyEl.setPointerCapture(joyId); moverJoystick(e); e.preventDefault();
});
joyEl.addEventListener('pointermove', moverJoystick);
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(evento => joyEl.addEventListener(evento, () => { joyId = null; limpiarEntrada(); }));
const entrada = {};
const eje = (positivo, negativo) => Number(Boolean(keys[positivo])) - Number(Boolean(keys[negativo]));
let ultimoTiempo = null;
export function actualizarNave(t) {
  const dt = ultimoTiempo === null ? 0 : Math.min(0.1, t - ultimoTiempo); ultimoTiempo = t;
  if (!entradaEstaSuspendida()) {
    const avanzado = modoControl === 'avanzado';
    entrada.impulso = avanzado ? Number(Boolean(keys[teclaAcelerar])) : Math.max(Number(Boolean(keys.KeyW || keys.ArrowUp)), -joyVec.y);
    entrada.freno = keys.Space || (avanzado ? keys[teclaFrenar] : keys.KeyS || keys.ArrowDown || joyVec.y > 0.2);
    entrada.boost = !avanzado && (keys.ShiftLeft || keys.ShiftRight);
    entrada.yaw = eje('KeyA', 'KeyD') + eje('ArrowLeft', 'ArrowRight') - joyVec.x * sensJoystick / 0.3;
    entrada.pitch = avanzado ? eje('KeyW', 'KeyS') + eje('ArrowUp', 'ArrowDown') : eje('KeyQ', 'KeyZ');
    entrada.roll = avanzado ? eje('KeyQ', 'KeyZ') : 0;
    entrada.sensibilidad = (avanzado ? sensAvanzado : sensRotacion) / 0.3;
    if (modoControl === 'medio') {
      entrada.yaw += -medioApuntado.x * sensDireccion / 0.3;
      entrada.pitch += -medioApuntado.y * sensDireccion / 0.3 + (touchLook.active ? mouseLook.pitch : 0);
      if (mouseLook.active && !touchLook.active) entrada.yaw = entrada.pitch = 0;
    }
    simulador.avanzar(dt, entrada);
    shipGroup.position.copy(estadoVuelo.posicion); shipGroup.quaternion.copy(estadoVuelo.orientacion);
    if (shipModel) shipModel.rotation.z += ((-entrada.yaw * 0.25) - shipModel.rotation.z) * suavizado(6, dt);
    engineLight.intensity = entrada.impulso > 0 && !entrada.freno ? 2.5 : 0;
    const calor = Math.min(1, velocity.length() / 40);
    materialesCalientes.forEach(mat => { mat.emissive.setRGB(calor * 0.8, calor * 0.12, 0); mat.emissiveIntensity = 2; });
    tiempoEstela += dt;
    if (tiempoEstela >= 0.035) {
      tiempoEstela %= 0.035;
      if (entrada.impulso > 0 && !entrada.freno) {
        estelaPosiciones.copyWithin(3, 0, 47 * 3);
        forward.set(0, 0, 2.5).applyQuaternion(shipGroup.quaternion).add(shipGroup.position).toArray(estelaPosiciones);
        puntosEstela = Math.min(48, puntosEstela + 1);
      } else puntosEstela = Math.max(0, puntosEstela - 1);
      estelaGeometria.setDrawRange(0, puntosEstela); estelaGeometria.attributes.position.needsUpdate = true;
    }
    actualizarCamara(shipGroup, modoControl, dt);
  }
  return { spd: velocity.length(), maxSpeed: MAX_SPEED * 1.5, energia: estadoVuelo.energia, energiaMax: 100 };
}
