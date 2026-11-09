import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { crearEstadoVuelo, crearSimulador, VUELO, alabeoRespectoA, nivelarAlabeo } from '../codigo/nave/simulacion.js';

function volar(fps, entrada, segundos = 4) {
  const estado = crearEstadoVuelo(), simulador = crearSimulador(estado);
  for (let i = 0; i < fps * segundos; i++) simulador.avanzar(1 / fps, entrada);
  return { estado, simulador };
}
test('misma trayectoria, orientación y energía a 30, 60 y 144 FPS', () => {
  const entrada = { impulso: 1, yaw: 0.3, pitch: 0.2, roll: -0.1, boost: true };
  const base = volar(60, entrada).estado;
  for (const fps of [30, 144]) {
    const estado = volar(fps, entrada).estado;
    assert.ok(estado.posicion.distanceTo(base.posicion) < 1e-7);
    assert.ok(estado.velocidad.distanceTo(base.velocidad) < 1e-7);
    assert.ok(1 - Math.abs(estado.orientacion.dot(base.orientacion)) < 1e-10);
    assert.ok(Math.abs(estado.energia - base.energia) < 1e-8);
  }
});
test('frenar detiene la nave y no la hace retroceder', () => {
  const { estado, simulador } = volar(60, { impulso: 1 });
  for (let i = 0; i < 180; i++) {
    const previa = estado.velocidad.length(); simulador.avanzar(1 / 60, { freno: true, impulso: 1 });
    assert.ok(estado.velocidad.length() <= previa); assert.ok(estado.velocidad.z <= 0);
  }
  assert.equal(estado.velocidad.length(), 0);
});
test('el impulso normal conserva energía, turbo consume y reposo recupera', () => {
  assert.equal(volar(60, { impulso: 1 }).estado.energia, 100);
  const { estado, simulador } = volar(60, { impulso: 1, boost: true }, 2);
  assert.ok(estado.energia < 60 && estado.energia > 50);
  for (let i = 0; i < 240; i++) simulador.avanzar(1 / 60, {});
  assert.equal(estado.energia, 100);
});
test('giros prolongados mantienen quaternion válido y velocidad acotada', () => {
  const { estado } = volar(60, { impulso: 1, yaw: 1, pitch: 1, roll: 1 }, 30);
  assert.ok(Math.abs(estado.orientacion.length() - 1) < 1e-10);
  assert.ok(estado.velocidad.length() <= VUELO.velocidadMaxima);
});
test('pausa de pestaña no teletransporta la nave', () => {
  const estado = crearEstadoVuelo(), simulador = crearSimulador(estado);
  simulador.avanzar(20, { impulso: 1 });
  assert.ok(estado.posicion.length() < 1);
});

test('la reversa retrocede sin superar su velocidad máxima y el freno la anula', () => {
  const { estado } = volar(60, { reversa: 1 }, 6);
  const avance = estado.velocidad.dot(new THREE.Vector3(0, 0, -1));
  assert.ok(avance < -VUELO.velocidadReversa * 0.9);
  assert.ok(avance >= -VUELO.velocidadReversa - 1e-6);
  assert.equal(volar(60, { reversa: 1, freno: true }).estado.velocidad.length(), 0);
});

test('el nivelado devuelve las alas al horizonte sin cambiar el rumbo', () => {
  const estado = crearEstadoVuelo(), arriba = new THREE.Vector3(0, 1, 0);
  estado.orientacion.setFromEuler(new THREE.Euler(0.2, 0.7, 0.6, 'YXZ'));
  const rumbo = new THREE.Vector3(0, 0, -1).applyQuaternion(estado.orientacion);
  for (let i = 0; i < 60 * 5; i++) nivelarAlabeo(estado, arriba, 1 / 60);
  assert.ok(Math.abs(alabeoRespectoA(estado.orientacion, arriba)) < 0.01);
  assert.ok(new THREE.Vector3(0, 0, -1).applyQuaternion(estado.orientacion).distanceTo(rumbo) < 1e-6);
});

test('mantener el cabeceo (un rizo completo) no inclina la nave hacia un lado', () => {
  const estado = crearEstadoVuelo(), simulador = crearSimulador(estado);
  const derecha = new THREE.Vector3();
  for (let i = 0; i < 60 * 12; i++) {
    simulador.avanzar(1 / 60, { pitch: 1, impulso: 1 });
    derecha.set(1, 0, 0).applyQuaternion(estado.orientacion);
    assert.ok(Math.abs(derecha.y) < 1e-6, `ala inclinada: ${derecha.y}`);
  }
});

test('el nivelado se atenúa con la nariz casi vertical', () => {
  const arriba = new THREE.Vector3(0, 1, 0);
  const estado = crearEstadoVuelo();
  // Nariz a 70° hacia arriba (horizontalidad cos²70° ≈ 0.12) y alas alabeadas 40°.
  estado.orientacion.setFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(70), 0, THREE.MathUtils.degToRad(40), 'YXZ'));
  const antes = alabeoRespectoA(estado.orientacion, arriba);
  nivelarAlabeo(estado, arriba, 1 / 60);
  const cambio = Math.abs(antes - alabeoRespectoA(estado.orientacion, arriba));
  assert.ok(cambio < Math.abs(antes) * (1 - Math.exp(-VUELO.nivelado / 60)) * 0.2);
  assert.ok(cambio > 0);
});
