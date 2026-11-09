import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { scene, renderer } from './escena.js';
import { crearEstadoVuelo, crearSimulador, VUELO, suavizado, nivelarAlabeo } from './simulacion.js';
import { tactil, reiniciarTactil, cancelarCrucero } from './controles-tactiles/funciones.js';
import { mouseLook, touchLook, setRaycastBlockers, setSensibilidadMouseLook,
  actualizarCamara, setCamaraSuspendida, reiniciarCamara, setDesvioCamara } from './camara.js';
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
export const estadoVuelo = crearEstadoVuelo();
const simulador = crearSimulador(estadoVuelo);
export const velocity = estadoVuelo.velocidad;
export const MAX_SPEED = VUELO.velocidadMaxima;
export function resetAngularVelocity() { simulador.reiniciar(); }
export function reposicionarNave(posicion) {
  shipGroup.position.copy(posicion); shipGroup.quaternion.identity();
  estadoVuelo.posicion.copy(posicion); estadoVuelo.orientacion.identity();
  velocity.set(0, 0, 0); simulador.reiniciar(); limpiarEntrada(); reiniciarCamara();
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
        // Marca la silueta de la nave en el stencil (valor STENCIL_NAVE de la
        // escalera de cabeceo): el HUD no se dibuja encima de ella.
        if (mat) Object.assign(mat, { stencilWrite: true, stencilRef: 1, stencilZPass: THREE.ReplaceStencilOp });
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
export const keys = {}, medioApuntado = { x: 0, y: 0 };
const suspensiones = new Set();
export function entradaEstaSuspendida() { return suspensiones.size > 0; }
export function setEntradaSuspendida(v, motivo = 'panel') {
  if (v) suspensiones.add(motivo); else suspensiones.delete(motivo);
  setCamaraSuspendida(entradaEstaSuspendida());
  if (v) { limpiarEntrada(); velocity.set(0, 0, 0); simulador.reiniciar(); }
}
let modoControl = 'estandar', teclaAcelerar = 'ShiftLeft', teclaFrenar = 'ControlLeft';
let sensRotacion = 0.3, sensDireccion = 0.3, sensJoystick = 0.3, sensAvanzado = 0.3;
// Modo "personalizado" (PC): una tecla por acción, configurable desde el panel.
export const TECLAS_POR_DEFECTO = Object.freeze({ acelerar: 'KeyW', frenar: 'Space', retroceder: 'KeyS',
  girarIzquierda: 'KeyA', girarDerecha: 'KeyD', inclinarArriba: 'KeyQ', inclinarAbajo: 'KeyZ' });
let teclas = { ...TECLAS_POR_DEFECTO };
export const setTeclasPersonalizadas = mapa => { teclas = { ...mapa }; };
export const setTeclaAcelerar = v => { teclaAcelerar = v; };
export const setTeclaFrenar = v => { teclaFrenar = v; };
export const setSensibilidadRotacion = v => { sensRotacion = v; };
export const setSensibilidadDireccionMedio = v => { sensDireccion = v; };
export const setSensibilidadJoystick = v => { sensJoystick = v; };
export const setSensibilidadInclinacionAvanzado = v => { sensAvanzado = v; };
export const MODOS_CONTROL = ['estandar', 'medio', 'avanzado', 'personalizado'];
export function setModoControl(modo) {
  modoControl = MODOS_CONTROL.includes(modo) ? modo : 'estandar';
  limpiarEntrada(); simulador.reiniciar();
  document.getElementById('vuelo-modo').textContent = { estandar: 'EXPLORACIÓN', medio: 'ARCADE', avanzado: 'AVANZADO', personalizado: 'PERSONALIZADO' }[modoControl];
  document.getElementById('vuelo-ayuda').textContent = {
    avanzado: 'W/S inclinar · A/D girar · Q/Z alabeo · impulso/freno configurables',
    medio: 'Mouse dirige · W impulso · S/Espacio freno · Shift turbo',
    personalizado: 'Teclas personalizadas · cámbialas en ⚙🎮',
    estandar: 'W impulso · S/Espacio freno · A/D girar · Q/Z subir/bajar'
  }[modoControl];
}

// Punto fijo: con un planeta elegido, "arriba" es la dirección planeta → nave y
// el horizonte es el de ese planeta. Sin punto fijo, el "arriba" del universo (+Y).
let puntoFijo = null;
export function setPuntoFijo(posicion) { puntoFijo = posicion || null; }
export function arribaReferencia(posicion, destino) {
  if (puntoFijo) {
    destino.subVectors(posicion, puntoFijo);
    if (destino.lengthSq() > 1e-6) return destino.normalize();
  }
  return destino.set(0, 1, 0);
}

export function esEntradaTexto(target) { return Boolean(target?.closest?.('input, textarea, select, [contenteditable="true"]')); }
function limpiarEntrada() {
  Object.keys(keys).forEach(k => { keys[k] = false; });
  medioApuntado.x = medioApuntado.y = 0;
  reiniciarTactil();
}
window.addEventListener('keydown', e => {
  if (e.code === 'Space' && e.target?.closest?.('button')) return;
  if (entradaEstaSuspendida() || esEntradaTexto(e.target) || (e.ctrlKey && e.code !== teclaFrenar) || e.metaKey || e.altKey) return;
  keys[e.code] = true;
  const propias = modoControl === 'personalizado' ? Object.values(teclas) : [];
  if (/^(Arrow|Space)/.test(e.code) || ['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyZ',teclaAcelerar,teclaFrenar,...propias].includes(e.code)) e.preventDefault();
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
const entrada = {};
const eje = (positivo, negativo) => Number(Boolean(keys[positivo])) - Number(Boolean(keys[negativo]));
const tecla = accion => Number(Boolean(keys[teclas[accion]]));
const arribaNivel = new THREE.Vector3();
let ultimoTiempo = null;
export function actualizarNave(t) {
  const dt = ultimoTiempo === null ? 0 : Math.min(0.1, t - ultimoTiempo); ultimoTiempo = t;
  if (!entradaEstaSuspendida()) {
    const avanzado = modoControl === 'avanzado';
    if (modoControl === 'personalizado') {
      entrada.impulso = tecla('acelerar'); entrada.freno = Boolean(tecla('frenar'));
      entrada.reversa = tecla('retroceder'); entrada.boost = false;
      entrada.yaw = tecla('girarIzquierda') - tecla('girarDerecha');
      entrada.pitch = tecla('inclinarArriba') - tecla('inclinarAbajo');
      entrada.roll = 0; entrada.sensibilidad = sensRotacion / 0.3;
    } else {
      entrada.impulso = avanzado ? Number(Boolean(keys[teclaAcelerar])) : Number(Boolean(keys.KeyW || keys.ArrowUp));
      entrada.freno = keys.Space || (avanzado ? keys[teclaFrenar] : keys.KeyS || keys.ArrowDown);
      entrada.reversa = 0;
      entrada.boost = !avanzado && (keys.ShiftLeft || keys.ShiftRight);
      entrada.yaw = eje('KeyA', 'KeyD') + eje('ArrowLeft', 'ArrowRight');
      entrada.pitch = avanzado ? eje('KeyW', 'KeyS') + eje('ArrowUp', 'ArrowDown') : eje('KeyQ', 'KeyZ');
      entrada.roll = avanzado ? eje('KeyQ', 'KeyZ') : 0;
      entrada.sensibilidad = (avanzado ? sensAvanzado : sensRotacion) / 0.3;
    }
    // Controles táctiles: se suman a los del teclado en cualquier modo.
    entrada.impulso = Math.max(entrada.impulso, tactil.impulso);
    entrada.reversa = Math.max(entrada.reversa, tactil.reversa);
    entrada.freno = Boolean(entrada.freno || tactil.freno);
    entrada.yaw += tactil.yaw * sensJoystick / 0.3;
    entrada.pitch += tactil.pitch * sensJoystick / 0.3;
    setDesvioCamara(tactil.desvioCamara);
    if (modoControl === 'medio') {
      entrada.yaw += -medioApuntado.x * sensDireccion / 0.3;
      entrada.pitch += -medioApuntado.y * sensDireccion / 0.3 + (touchLook.active ? mouseLook.pitch : 0);
      if (mouseLook.active && !touchLook.active) entrada.yaw = entrada.pitch = 0;
    }
    // Velocidad constante (botones 1-4, R1-R2): empuja hasta la velocidad elegida.
    if (entrada.freno) cancelarCrucero();
    else if (tactil.crucero !== 0) {
      forward.set(0, 0, -1).applyQuaternion(estadoVuelo.orientacion);
      const avance = velocity.dot(forward);
      if (tactil.crucero > 0) {
        entrada.impulso = Math.max(entrada.impulso, THREE.MathUtils.clamp((tactil.crucero * VUELO.velocidadMaxima - avance) / 4, 0, 1));
      } else {
        const objetivo = tactil.crucero * VUELO.velocidadReversa;
        entrada.reversa = Math.max(entrada.reversa, THREE.MathUtils.clamp((avance - objetivo) / 4, 0, 1));
      }
    }
    simulador.avanzar(dt, entrada);
    // Sin alabeo ni cabeceo manual, las alas vuelven solas al horizonte de
    // referencia. Durante un cabeceo sostenido (un rizo) no se nivela: al pasar
    // la vertical la nave queda invertida y el nivelado la haría rodar de lado.
    if (!entrada.roll && Math.abs(entrada.pitch) < 0.3) nivelarAlabeo(estadoVuelo, arribaReferencia(estadoVuelo.posicion, arribaNivel), dt);
    shipGroup.position.copy(estadoVuelo.posicion); shipGroup.quaternion.copy(estadoVuelo.orientacion);
    // Alabeo visual hacia el lado del giro: girar a la derecha levanta el ala izquierda.
    if (shipModel) shipModel.rotation.z += ((entrada.yaw * 0.25) - shipModel.rotation.z) * suavizado(6, dt);
    engineLight.intensity = entrada.impulso > 0 && !entrada.freno ? 2.5 : 0;
    const calor = Math.min(1, velocity.length() / 40);
    materialesCalientes.forEach(mat => { mat.emissive.setRGB(calor * 0.8, calor * 0.12, 0); mat.emissiveIntensity = 2; });
    actualizarCamara(shipGroup, modoControl, dt);
  }
  return { spd: velocity.length(), maxSpeed: MAX_SPEED * 1.5, energia: estadoVuelo.energia, energiaMax: 100 };
}
