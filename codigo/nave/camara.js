import * as THREE from 'three';
import { camera, renderer } from './escena.js';
import { suavizado } from './simulacion.js';

export const mouseLook = { active: false, yaw: 0, pitch: 0 };
export const touchLook = { active: false };
let sensibilidad = 0.3, bloqueada = false, pointer = null, arrastrado = false;
let distancia = 15, reiniciar = true;
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
  distancia = THREE.MathUtils.clamp(distancia + e.deltaY * 0.01, 9, 32);
}, { passive: false });
export function actualizarCamara(ship, modo, dt = 1 / 60) {
  if (bloqueada) return;
  if (reiniciar) { orientacion.copy(ship.quaternion); reiniciar = false; }
  else orientacion.slerp(ship.quaternion, suavizado(5.5, dt));
  if (!mouseLook.active) {
    mouseLook.yaw *= Math.exp(-5 * dt); mouseLook.pitch *= Math.exp(-5 * dt);
  }
  orbita.setFromEuler(euler.set(mouseLook.pitch, mouseLook.yaw, 0));
  offset.set(0, 3, distancia).applyQuaternion(orbita).applyQuaternion(orientacion);
  // Amortigua orientación, no posición: a alta velocidad la nave no alcanza la cámara.
  camera.position.copy(ship.position).add(offset);
  arriba.set(0, 1, 0).applyQuaternion(orientacion); camera.up.copy(arriba);
  objetivo.set(0, 1.3, -12).applyQuaternion(orientacion).add(ship.position);
  camera.lookAt(objetivo); camera.updateMatrixWorld();
}
