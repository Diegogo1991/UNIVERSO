import test from 'node:test';
import assert from 'node:assert/strict';
import { crearEstadoVuelo, crearSimulador, VUELO } from '../codigo/nave/simulacion.js';

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
