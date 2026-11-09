import * as THREE from 'three';
import { scene, camera, renderer, clock, pausarReloj } from './escena.js';
import { initLights } from './lights.js';
import { cargarNave, setRaycastBlockers, shipGroup, actualizarNave,
  entradaEstaSuspendida, esEntradaTexto, setEntradaSuspendida, reposicionarNave } from './nave.js';
import { fueArrastreCamara, vistaPreviaCamara } from './camara.js';
import { planet, PLANET_POS, asteroids, inicializarNaveSecundaria, actualizarUniversoInicial } from '../universos/universo-inicial/universo-inicial.js';
import { sistemaPlanet, SYSTEM_PLANET_POS, entrarUniversoRosado, salirUniversoRosado, estaActivo, actualizarUniversoRosado } from '../universos/universo-rosado/comportamiento.js';
import { actualizarTitileo } from '../universos/titileo-estrellas.js';
import { actualizarProgresoCarga, finalizarCarga, mostrarErrorCarga } from '../interfaz-carga/funciones.js';
import { mostrarCV, actualizarIndicadoresVuelo, mostrarMensajeTemporal } from '../interfaz/funciones.js';
import { btnE } from '../interfaz/elementos.js';
import { actualizarMira } from './mira/funciones.js';
import { actualizarEscaleraCabeceo } from './mira/escalera-cabeceo.js';
import { inicializarControlesNave } from './controles-nave/funciones.js';
import { inicializarControlesTactiles } from './controles-tactiles/funciones.js';
import { crearContenido } from '../contenido/objetos.js';
import { cargarMundoLocal } from '../contenido/almacenamiento.js';
import mundoBase from '../contenido/mundo-inicial.json';

// En pausa (personalizar HUD) el mundo se congela pero se sigue dibujando.
let pausado = false;
initLights(scene);
inicializarControlesTactiles({ estaSuspendida: entradaEstaSuspendida });
inicializarControlesNave({
  pausar: valor => { pausado = valor; pausarReloj(valor); },
  puntosFijos: { 'planeta-naranja': PLANET_POS, 'planeta-morado': SYSTEM_PLANET_POS }
});
let publicado = mundoBase;
try { publicado = cargarMundoLocal('publicado', mundoBase); }
catch (error) { mostrarMensajeTemporal('No se pudo abrir la versión local: ' + error.message, 7000); }
const contenido = crearContenido(scene, mostrarMensajeTemporal);
contenido.cargar(publicado);
let editor = null;
const universoActual = () => estaActivo() ? 'universo-rosado' : 'universo-inicial';
function cambiarUniverso(id) {
  if (id === 'universo-rosado') entrarUniversoRosado();
  else if (estaActivo()) salirUniversoRosado();
  contenido.universo(universoActual());
  document.getElementById('nombre-universo').textContent = estaActivo() ? 'UNIVERSO ROSADO' : 'UNIVERSO INICIAL';
}
if (import.meta.env.DEV) {
  import('../editor/funciones.js').then(({ inicializarEditor }) => {
    editor = inicializarEditor({ scene, camera, renderer, ship: shipGroup, contenido,
      obtenerPublicado: () => publicado, publicar: mundo => { publicado = mundo; }, cambiarUniverso, universoActual });
  }).catch(error => mostrarMensajeTemporal('No se pudo abrir el taller: ' + error.message));
}
setRaycastBlockers(() => [...(!estaActivo() ? [planet, sistemaPlanet, ...asteroids.map(a => a.mesh)] : []), ...contenido.visibles()]);
cargarNave({
  onProgress: xhr => { if (xhr.total) actualizarProgresoCarga(Math.round(xhr.loaded / xhr.total * 100)); },
  onModeloListo: modelo => { inicializarNaveSecundaria(modelo); finalizarCarga(); },
  onError: err => { console.error('GLB error:', err); mostrarErrorCarga(err.message); }
});

const dialogo = document.getElementById('detalle-objeto');
function activarObjeto(obj) {
  const dato = obj.userData.dato;
  if (dato.accion.tipo === 'portal') { cambiarUniverso(dato.accion.destino); return; }
  if (dato.accion.tipo !== 'informacion') return;
  document.getElementById('detalle-titulo').textContent = dato.nombre;
  document.getElementById('detalle-texto').textContent = dato.accion.texto;
  const imagen = document.getElementById('detalle-imagen');
  imagen.hidden = dato.tipo !== 'plano' || !dato.recurso;
  if (!imagen.hidden) { imagen.src = dato.recurso; imagen.alt = dato.nombre; } else imagen.removeAttribute('src');
  setEntradaSuspendida(true, 'detalle'); dialogo.showModal();
}
document.getElementById('detalle-cerrar').addEventListener('click', () => dialogo.close());
dialogo.addEventListener('close', () => setEntradaSuspendida(false, 'detalle'));
let cercano = null;
function interactuar() {
  if (entradaEstaSuspendida()) return;
  if (cercano) { activarObjeto(cercano); return; }
  if (estaActivo()) { cambiarUniverso('universo-inicial'); return; }
  if (shipGroup.position.distanceTo(SYSTEM_PLANET_POS) < 55) cambiarUniverso('universo-rosado');
  else if (shipGroup.position.distanceTo(PLANET_POS) < 55) mostrarCV();
}
window.addEventListener('keydown', e => {
  if (e.repeat || entradaEstaSuspendida() || esEntradaTexto(e.target)) return;
  if (e.code === 'KeyE') interactuar();
  if (e.code === 'KeyR') cambiarUniverso('universo-inicial');
});
btnE.addEventListener('click', interactuar);
document.getElementById('volver-inicio').addEventListener('click', () => {
  if (entradaEstaSuspendida()) return;
  cambiarUniverso('universo-inicial'); reposicionarNave(new THREE.Vector3()); mostrarMensajeTemporal('De vuelta al punto de partida.');
});
const ray = new THREE.Raycaster(), puntero = new THREE.Vector2();
renderer.domElement.addEventListener('click', e => {
  if (entradaEstaSuspendida() || fueArrastreCamara()) return;
  puntero.set(e.clientX / innerWidth * 2 - 1, 1 - e.clientY / innerHeight * 2); ray.setFromCamera(puntero, camera);
  const blancos = [...contenido.visibles(), ...(!estaActivo() ? [planet, sistemaPlanet] : [])];
  const hit = ray.intersectObjects(blancos, true)[0]; if (!hit) return;
  const obj = contenido.resolver(hit.object);
  if (obj) activarObjeto(obj);
  else if (hit.object === planet) mostrarCV();
  else if (hit.object === sistemaPlanet) cambiarUniverso('universo-rosado');
});
const pista = document.getElementById('contenido-pista');
function animate() {
  requestAnimationFrame(animate);
  if (pausado) {
    vistaPreviaCamara(shipGroup);
    actualizarEscaleraCabeceo({ shipGroup });
    renderer.render(scene, camera);
    return;
  }
  const t = clock.getElapsedTime();
  const vuelo = actualizarNave(t);
  actualizarTitileo(t); actualizarUniversoInicial(t); actualizarUniversoRosado(t);
  editor?.actualizar();
  cercano = null; let distancia = 28;
  for (const obj of contenido.visibles()) {
    if (obj.userData.dato.accion.tipo === 'ninguna') continue;
    const d = shipGroup.position.distanceTo(obj.position);
    if (d < distancia) { cercano = obj; distancia = d; }
  }
  pista.textContent = cercano ? '[ E / INTERACTUAR ] ' + cercano.userData.dato.nombre : '';
  actualizarIndicadoresVuelo({ distPlanet: shipGroup.position.distanceTo(PLANET_POS),
    distSistema: shipGroup.position.distanceTo(SYSTEM_PLANET_POS), inSistemaUniverse: estaActivo(), ...vuelo });
  actualizarMira(vuelo);
  actualizarEscaleraCabeceo({ shipGroup });
  renderer.render(scene, camera);
}
animate();
