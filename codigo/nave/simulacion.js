import * as THREE from 'three';

// Unidades por segundo; no depende del DOM, cámara ni escena.
export const VUELO = Object.freeze({ paso: 1 / 120, velocidadMaxima: 65, aceleracion: 24, giro: 1.15 });
const ejeX = new THREE.Vector3(1, 0, 0), ejeY = new THREE.Vector3(0, 1, 0), ejeZ = new THREE.Vector3(0, 0, 1);
const giro = new THREE.Quaternion(), delante = new THREE.Vector3(), deseada = new THREE.Vector3();
export const suavizado = (rapidez, dt) => 1 - Math.exp(-rapidez * dt);
export function crearEstadoVuelo() {
  return { posicion: new THREE.Vector3(), orientacion: new THREE.Quaternion(),
    velocidad: new THREE.Vector3(), angular: new THREE.Vector3(), energia: 100, turboAgotado: false };
}
export function simularVuelo(estado, entrada, dt) {
  const { posicion, orientacion, velocidad, angular } = estado;
  deseada.set(entrada.pitch || 0, entrada.yaw || 0, entrada.roll || 0).multiplyScalar(VUELO.giro * (entrada.sensibilidad ?? 1));
  angular.lerp(deseada, suavizado(8, dt));
  orientacion.multiply(giro.setFromAxisAngle(ejeY, angular.y * dt));
  orientacion.multiply(giro.setFromAxisAngle(ejeX, angular.x * dt));
  orientacion.multiply(giro.setFromAxisAngle(ejeZ, angular.z * dt)).normalize();
  delante.set(0, 0, -1).applyQuaternion(orientacion);
  const freno = Boolean(entrada.freno);
  const impulso = freno ? 0 : THREE.MathUtils.clamp(entrada.impulso || 0, 0, 1);
  if (estado.energia <= 0) estado.turboAgotado = true;
  if (estado.energia >= 20) estado.turboAgotado = false;
  const boost = impulso > 0 && entrada.boost && !estado.turboAgotado;
  estado.energia = THREE.MathUtils.clamp(estado.energia + (boost ? -22 : 14) * dt, 0, 100);
  velocidad.addScaledVector(delante, VUELO.aceleracion * impulso * (boost ? 2 : 1) * dt);
  // Asistencia de trayectoria y freno que nunca empuja hacia atrás.
  deseada.copy(delante).multiplyScalar(Math.max(0, velocidad.dot(delante)));
  velocidad.lerp(deseada, suavizado(2.4, dt));
  velocidad.multiplyScalar(Math.exp(-(freno ? 5 : 0.32) * dt));
  velocidad.clampLength(0, VUELO.velocidadMaxima * (boost ? 1.5 : 1));
  if (velocidad.lengthSq() < 0.0001) velocidad.set(0, 0, 0);
  posicion.addScaledVector(velocidad, dt);
}
export function crearSimulador(estado) {
  let acumulado = 0;
  return {
    avanzar(dt, entrada) {
      acumulado += Math.min(Math.max(dt, 0), 0.1);
      while (acumulado + 1e-10 >= VUELO.paso) {
        simularVuelo(estado, entrada, VUELO.paso);
        acumulado = Math.max(0, acumulado - VUELO.paso);
      }
    },
    reiniciar() { acumulado = 0; estado.angular.set(0, 0, 0); }
  };
}
