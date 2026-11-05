import test from 'node:test';
import assert from 'node:assert/strict';
import { nuevoObjeto, validarMundo, leerMundo, serializarMundo } from '../codigo/contenido/datos.js';
import { cargarMundoLocal, guardarMundoLocal } from '../codigo/contenido/almacenamiento.js';
const crear = () => ({ version: 1, objetos: [nuevoObjeto('plano', 'universo-inicial', [1, 2, 3], 'idea-1')] });
const memoria = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
test('guardar y cargar conserva transformaciones y comportamiento', () => {
  const mundo = crear(); mundo.objetos[0].accion.tipo = 'portal';
  assert.deepEqual(leerMundo(serializarMundo(mundo)), mundo);
});
test('borrador no modifica la versión publicada', () => {
  const storage = memoria(), mundo = crear(); guardarMundoLocal('publicado', mundo, storage);
  mundo.objetos[0].nombre = 'Borrador'; guardarMundoLocal('borrador', mundo, storage);
  assert.equal(cargarMundoLocal('publicado', crear(), storage).objetos[0].nombre, 'Nuevo dibujo');
  assert.equal(cargarMundoLocal('borrador', crear(), storage).objetos[0].nombre, 'Borrador');
});
test('rechaza identificadores repetidos, coordenadas no finitas y escalas inválidas', () => {
  const mundo = crear(); mundo.objetos.push({ ...mundo.objetos[0] }); assert.throws(() => validarMundo(mundo));
  for (const [campo, valor] of [['posicion', NaN], ['escala', 0], ['rotacion', Infinity]]) {
    const otro = crear(); otro.objetos[0][campo][0] = valor; assert.throws(() => validarMundo(otro));
  }
});
test('rechaza scripts, rutas remotas y formatos activos como recursos', () => {
  for (const recurso of ['javascript:alert(1)', '//externo.com/img', '/\\externo', 'data:text/html;base64,ABC', 'data:image/svg+xml;base64,ABC']) {
    const mundo = crear(); mundo.objetos[0].recurso = recurso; assert.throws(() => validarMundo(mundo));
  }
});
test('una importación inválida nunca se escribe sobre el mundo guardado', () => {
  const storage = memoria(); guardarMundoLocal('borrador', crear(), storage);
  assert.throws(() => guardarMundoLocal('borrador', { version: 999, objetos: [] }, storage));
  assert.equal(cargarMundoLocal('borrador', crear(), storage).objetos.length, 1);
});
test('fallos de cuota se reportan en lugar de afirmar que se guardó', () => {
  assert.throws(() => guardarMundoLocal('borrador', crear(), { setItem() { throw new Error('quota'); } }), /No se pudo guardar/);
});
