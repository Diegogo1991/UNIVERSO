import * as THREE from 'three';

// Unidades por segundo; no depende del DOM, cámara ni escena.
// velocidadReversa y aceleracionReversa: la reversa es lenta a propósito, para
// maniobrar, no para huir. nivelado: rapidez con que el alabeo vuelve al horizonte.
export const VUELO = Object.freeze({ paso: 1 / 120, velocidadMaxima: 65, aceleracion: 24, giro: 1.15,
  velocidadReversa: 20, aceleracionReversa: 14, nivelado: 1.2 });
const ejeX = new THREE.Vector3(1, 0, 0), ejeY = new THREE.Vector3(0, 1, 0), ejeZ = new THREE.Vector3(0, 0, 1);
const giro = new THREE.Quaternion(), delante = new THREE.Vector3(), deseada = new THREE.Vector3();
const refDerecha = new THREE.Vector3(), refArriba = new THREE.Vector3(), arribaNave = new THREE.Vector3();
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
  const reversa = freno ? 0 : THREE.MathUtils.clamp(entrada.reversa || 0, 0, 1);
  const boost = impulso > 0 && entrada.boost && !estado.turboAgotado;
  estado.energia = THREE.MathUtils.clamp(estado.energia + (boost ? -22 : 14) * dt, 0, 100);
  velocidad.addScaledVector(delante, (VUELO.aceleracion * impulso * (boost ? 2 : 1) - VUELO.aceleracionReversa * reversa) * dt);
  // Asistencia de trayectoria. Sin reversa nunca empuja hacia atrás (el freno
  // tampoco); con reversa, el retroceso se limita a velocidadReversa.
  deseada.copy(delante).multiplyScalar(Math.max(reversa > 0 ? -VUELO.velocidadReversa : 0, velocidad.dot(delante)));
  velocidad.lerp(deseada, suavizado(2.4, dt));
  velocidad.multiplyScalar(Math.exp(-(freno ? 5 : 0.32) * dt));
  const avance = velocidad.dot(delante);
  if (avance < -VUELO.velocidadReversa) velocidad.addScaledVector(delante, -VUELO.velocidadReversa - avance);
  velocidad.clampLength(0, VUELO.velocidadMaxima * (boost ? 1.5 : 1));
  if (velocidad.lengthSq() < 0.0001) velocidad.set(0, 0, 0);
  posicion.addScaledVector(velocidad, dt);
}
// Alabeo (rad) de la nave respecto a un "arriba" de referencia: 0 = alas
// niveladas con ese horizonte. null si la nariz apunta casi en esa dirección.
export function alabeoRespectoA(orientacion, arriba) {
  delante.set(0, 0, -1).applyQuaternion(orientacion);
  refDerecha.crossVectors(delante, arriba);
  if (refDerecha.lengthSq() < 0.05) return null;
  refDerecha.normalize(); refArriba.crossVectors(refDerecha, delante);
  arribaNave.set(0, 1, 0).applyQuaternion(orientacion);
  return Math.atan2(arribaNave.dot(refDerecha), arribaNave.dot(refArriba));
}
// Devuelve las alas al horizonte de forma gradual, sin tocar rumbo ni cabeceo.
// Se atenúa con la nariz cerca de la vertical, donde el horizonte deja de estar
// bien definido y el alabeo medido salta bruscamente.
export function nivelarAlabeo(estado, arriba, dt) {
  const alabeo = alabeoRespectoA(estado.orientacion, arriba);
  if (alabeo === null) return;
  const horizontalidad = 1 - delante.dot(arriba) ** 2 / arriba.lengthSq();
  estado.orientacion.multiply(giro.setFromAxisAngle(ejeZ, alabeo * suavizado(VUELO.nivelado * horizontalidad, dt))).normalize();
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
