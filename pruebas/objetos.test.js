import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { crearContenido } from '../codigo/contenido/objetos.js';
import { nuevoObjeto } from '../codigo/contenido/datos.js';

test('editar posición/nombre/acción conserva el objeto y sus recursos', () => {
  const contenido = crearContenido(new THREE.Scene(), assert.fail);
  const dato = nuevoObjeto('portal', 'universo-inicial', [0, 0, -30], 'portal-1');
  contenido.cargar({ objetos: [dato] });
  const original = contenido.obtener(dato.id), geometria = original.children[0].geometry;
  contenido.cargar({ objetos: [{ ...dato, nombre: 'Otro nombre', posicion: [7, 4, -60], accion: { ...dato.accion, tipo: 'informacion' } }] });
  assert.equal(contenido.obtener(dato.id), original);
  assert.equal(original.children[0].geometry, geometria);
  assert.deepEqual(original.position.toArray(), [7, 4, -60]);
  assert.equal(original.userData.dato.accion.tipo, 'informacion');
  contenido.cargar({ objetos: [] });
});
test('cambiar de universo filtra objetos sin duplicarlos; retirar libera sus recursos', () => {
  const scene = new THREE.Scene(), contenido = crearContenido(scene, assert.fail);
  const uno = nuevoObjeto('portal', 'universo-inicial', [0, 0, 0], 'uno');
  const dos = nuevoObjeto('espiral', 'universo-rosado', [0, 0, 0], 'dos');
  contenido.cargar({ objetos: [uno, dos] });
  let liberaciones = 0;
  contenido.obtener('dos').children[0].geometry.addEventListener('dispose', () => liberaciones++);
  for (let i = 0; i < 3; i++) {
    contenido.universo('universo-rosado'); assert.deepEqual(contenido.visibles().map(o => o.userData.idContenido), ['dos']);
    contenido.universo('universo-inicial'); assert.deepEqual(contenido.visibles().map(o => o.userData.idContenido), ['uno']);
  }
  assert.equal(scene.children.length, 2);
  contenido.cargar({ objetos: [uno] });
  assert.equal(liberaciones, 1); assert.equal(scene.children.length, 1);
  contenido.cargar({ objetos: [] });
});
