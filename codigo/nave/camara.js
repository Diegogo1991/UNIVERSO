import * as THREE from 'three';
import { camera, renderer } from './escena.js';
import { suavizado } from './simulacion.js';

export const mouseLook = { active: false, yaw: 0, pitch: 0 };
export const touchLook = { active: false };
let sensibilidad = 0.3, bloqueada = false, pointer = null, arrastrado = false;
// Posición de la cámara respecto a la nave (unidades del mundo). La rueda del
// mouse también cambia la distancia dentro del mismo rango.
export const CAMARA = { distanciaMin: 9, distanciaMax: 32, alturaMin: 0, alturaMax: 10 };
let distancia = 15, altura = 3, reiniciar = true;
// Desvío lateral pedido por el joystick izquierdo (-1..1): orbita la cámara
// hasta DESVIO_MAXIMO radianes hacia ese lado, con suavizado.
const DESVIO_MAXIMO = 0.45;
let desvioObjetivo = 0, desvio = 0;
export function setDesvioCamara(valor) { desvioObjetivo = valor; }
let getRaycastBlockers = () => [];
const ultimo = new THREE.Vector2(), inicio = new THREE.Vector2(), actual = new THREE.Vector2();
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const orientacion = new THREE.Quaternion(), orbita = new THREE.Quaternion();
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
const offset = new THREE.Vector3(), objetivo = new THREE.Vector3(), arriba = new THREE.Vector3();
const canvas = renderer.domElement;
export function setRaycastBlockers(fn) { getRaycastBlockers = fn; }
export function setSensibilidadMouseLook(v) { sensibilidad = v; }
export function fueArrastreCamara() { return arrastrado; }
export function reiniciarCamara() { reiniciar = true; mouseLook.yaw = mouseLook.pitch = 0; }
export function setCamaraSuspendida(v) {
  bloqueada = v;
  if (v) { pointer = null; mouseLook.active = touchLook.active = false; }
}
canvas.addEventListener('pointerdown', e => {
  if (bloqueada || pointer !== null || (e.button !== 0 && e.button !== 2)) return;
  arrastrado = false;
  ndc.set(e.clientX / innerWidth * 2 - 1, 1 - e.clientY / innerHeight * 2);
  ray.setFromCamera(ndc, camera);
  if (e.button === 0 && ray.intersectObjects(getRaycastBlockers(), true).length) return;
  pointer = e.pointerId;
  ultimo.set(e.clientX, e.clientY); inicio.copy(ultimo);
  canvas.setPointerCapture(pointer);
  mouseLook.active = true; touchLook.active = e.pointerType === 'touch';
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer) return;
  if (inicio.distanceTo(actual.set(e.clientX, e.clientY)) > 5) arrastrado = true;
  const factor = 0.008 * sensibilidad;
  mouseLook.yaw -= (e.clientX - ultimo.x) * factor;
  mouseLook.pitch = THREE.MathUtils.clamp(mouseLook.pitch - (e.clientY - ultimo.y) * factor, -1.2, 1.2);
  ultimo.set(e.clientX, e.clientY);
});
function soltar() { pointer = null; mouseLook.active = touchLook.active = false; }
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(evento => canvas.addEventListener(evento, soltar));
window.addEventListener('blur', soltar);
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('wheel', e => {
  if (bloqueada) return;
  e.preventDefault();
  distancia = THREE.MathUtils.clamp(distancia + e.deltaY * 0.01, CAMARA.distanciaMin, CAMARA.distanciaMax);
}, { passive: false });
export function setPosicionCamara({ distancia: d, altura: a }) {
  if (Number.isFinite(d)) distancia = THREE.MathUtils.clamp(d, CAMARA.distanciaMin, CAMARA.distanciaMax);
  if (Number.isFinite(a)) altura = THREE.MathUtils.clamp(a, CAMARA.alturaMin, CAMARA.alturaMax);
}
// Con el juego en pausa: coloca la cámara al instante detrás de la nave, sin
// suavizado ni giro libre, para previsualizar la posición configurada.
export function vistaPreviaCamara(ship) {
  orientacion.copy(ship.quaternion);
  mouseLook.yaw = mouseLook.pitch = 0; desvio = 0;
  colocar(ship);
}
export function actualizarCamara(ship, modo, dt = 1 / 60) {
  if (bloqueada) return;
  if (reiniciar) { orientacion.copy(ship.quaternion); reiniciar = false; }
  else orientacion.slerp(ship.quaternion, suavizado(5.5, dt));
  if (!mouseLook.active) {
    mouseLook.yaw *= Math.exp(-5 * dt); mouseLook.pitch *= Math.exp(-5 * dt);
  }
  desvio += (desvioObjetivo - desvio) * suavizado(4, dt);
  colocar(ship);
}
function colocar(ship) {
  orbita.setFromEuler(euler.set(mouseLook.pitch, mouseLook.yaw + desvio * DESVIO_MAXIMO, 0));
  offset.set(0, altura, distancia).applyQuaternion(orbita).applyQuaternion(orientacion);
  // Amortigua orientación, no posición: a alta velocidad la nave no alcanza la cámara.
  camera.position.copy(ship.position).add(offset);
  arriba.set(0, 1, 0).applyQuaternion(orientacion); camera.up.copy(arriba);
  objetivo.set(0, 1.3, -12).applyQuaternion(orientacion).add(ship.position);
  camera.lookAt(objetivo); camera.updateMatrixWorld();
}
