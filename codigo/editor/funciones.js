import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { ui } from './elementos.js';
import { nuevoObjeto, validarMundo, leerMundo, serializarMundo, MAX_JSON } from '../contenido/datos.js';
import { cargarMundoLocal, guardarMundoLocal } from '../contenido/almacenamiento.js';
import { aplicarTransformacion } from '../contenido/objetos.js';
import { setEntradaSuspendida } from '../nave/nave.js';
import { reiniciarCamara } from '../nave/camara.js';

// Solo se importa en desarrollo. No representa autenticación ni permisos de servidor.
export function inicializarEditor({ scene, camera, renderer, ship, contenido, obtenerPublicado, publicar, cambiarUniverso, universoActual }) {
  let abierto = false, mundo, seleccionado = null, pendiente = false;
  const historial = [], campos = {};
  const orbita = new OrbitControls(camera, renderer.domElement); orbita.enabled = false;
  orbita.minDistance = 3; orbita.maxDistance = 800;
  const gizmo = new TransformControls(camera, renderer.domElement); gizmo.enabled = false; gizmo.setSize(0.8); scene.add(gizmo);
  const ray = new THREE.Raycaster(), puntero = new THREE.Vector2(), inicio = new THREE.Vector2();
  let manipulando = false;
  const estado = texto => { ui.estado.textContent = texto; };
  const actual = () => mundo?.objetos.find(o => o.id === seleccionado);
  const recordar = () => { historial.push(serializarMundo(mundo)); if (historial.length > 12) historial.shift(); };
  const marcar = () => { pendiente = true; estado('Cambios sin guardar.'); };
  const intentar = fn => { try { fn(); } catch (error) { estado(error.message); } };

  ['posicion', 'rotacion', 'escala'].forEach((grupo, i) => {
    const titulo = document.createElement('div'); titulo.textContent = ['Posición', 'Rotación', 'Escala'][i];
    const fila = document.createElement('div'); fila.className = 'transformacion';
    campos[grupo] = ['X', 'Y', 'Z'].map(eje => {
      const label = document.createElement('label'); label.textContent = eje;
      const input = document.createElement('input'); input.type = 'number'; input.step = grupo === 'rotacion' ? '1' : '0.1';
      input.min = grupo === 'escala' ? '0.1' : grupo === 'rotacion' ? '-360' : '-10000';
      input.max = grupo === 'escala' ? '100' : grupo === 'rotacion' ? '360' : '10000';
      input.required = true; input.setAttribute('aria-label', titulo.textContent + ' ' + eje);
      label.append(input); fila.append(label); return input;
    });
    ui.transformaciones.append(titulo, fila);
  });
  function rellenarTransformaciones() {
    const o = actual(); if (!o) return;
    Object.entries(campos).forEach(([grupo, inputs]) => inputs.forEach((input, i) => { input.value = Number(o[grupo][i].toFixed(2)); }));
  }
  function seleccionar(id) {
    seleccionado = id; const o = actual(); gizmo.detach();
    ui.campos.disabled = !o;
    [ui.enfocar, ui.duplicar, ui.eliminar].forEach(b => { b.disabled = !o; });
    if (!o) return;
    ui.lista.value = o.id; ui.nombre.value = o.nombre; ui.color.value = o.color;
    ui.recurso.value = o.recurso.startsWith('data:') ? '' : o.recurso;
    ui.recurso.placeholder = o.recurso.startsWith('data:') ? 'Imagen importada (conservada)' : '/dibujos/mi-dibujo.png';
    ui.recurso.disabled = !['plano', 'modelo'].includes(o.tipo);
    ui.imagenLabel.hidden = o.tipo !== 'plano'; ui.imagen.value = '';
    ui.accion.value = o.accion.tipo; ui.texto.value = o.accion.texto; ui.destino.value = o.accion.destino;
    rellenarTransformaciones();
    const objeto = contenido.obtener(id); if (objeto) gizmo.attach(objeto);
  }
  function listar() {
    ui.lista.replaceChildren();
    mundo.objetos.filter(o => o.universo === universoActual()).forEach(o => ui.lista.add(new Option(o.nombre + ' · ' + o.tipo, o.id)));
    if (!mundo.objetos.some(o => o.id === seleccionado && o.universo === universoActual())) seleccionado = null;
    seleccionar(seleccionado);
  }
  function reconstruir() { gizmo.detach(); contenido.cargar(mundo); contenido.universo(universoActual()); listar(); }
  function enfocar() {
    const objeto = contenido.obtener(seleccionado); if (!objeto) return;
    const box = new THREE.Box3().setFromObject(objeto), size = box.getSize(new THREE.Vector3());
    const centro = box.getCenter(new THREE.Vector3()), radio = Math.max(15, size.length() * 0.8);
    orbita.target.copy(centro); camera.position.copy(centro).add(new THREE.Vector3(0, radio * 0.3, radio * 1.4)); camera.up.set(0, 1, 0); orbita.update();
  }
  function encuadrarEditor() {
    if (!abierto) return;
    const rect = ui.panel.getBoundingClientRect();
    camera.setViewOffset(innerWidth, innerHeight, innerWidth <= 600 ? 0 : rect.width / 2, innerWidth <= 600 ? rect.height / 2 : 0, innerWidth, innerHeight);
  }
  window.addEventListener('resize', encuadrarEditor);
  ui.abrir.hidden = false;
  ui.abrir.addEventListener('click', () => intentar(() => {
    mundo = cargarMundoLocal('borrador', obtenerPublicado());
    abierto = true; pendiente = false; historial.length = 0;
    setEntradaSuspendida(true, 'editor'); document.body.classList.add('editando'); ui.panel.hidden = false;
    orbita.enabled = gizmo.enabled = true; orbita.target.copy(ship.position); camera.up.set(0, 1, 0); orbita.update();
    ui.universo.value = universoActual(); reconstruir(); encuadrarEditor(); estado('Borrador local abierto.');
  }));
  function guardar() { guardarMundoLocal('borrador', mundo); pendiente = false; estado('Borrador guardado en este navegador.'); }
  ui.cerrar.addEventListener('click', () => intentar(() => {
    // Si la escritura falla se conserva abierto el borrador para poder exportarlo.
    guardar(); abierto = false; gizmo.detach(); orbita.enabled = gizmo.enabled = false;
    contenido.cargar(obtenerPublicado()); contenido.universo(universoActual());
    document.body.classList.remove('editando'); ui.panel.hidden = true;
    camera.clearViewOffset();
    setEntradaSuspendida(false, 'editor'); reiniciarCamara(); ui.abrir.focus();
  }));
  ui.universo.addEventListener('change', () => {
    cambiarUniverso(ui.universo.value); seleccionado = null; listar();
    orbita.target.copy(ship.position); camera.position.copy(ship.position).add(new THREE.Vector3(0, 10, 30)); orbita.update();
  });
  ui.agregar.addEventListener('click', () => intentar(() => {
    const posicion = new THREE.Vector3(0, 0, -32).applyQuaternion(ship.quaternion).add(ship.position);
    const objeto = nuevoObjeto(ui.tipo.value, universoActual(), posicion.toArray());
    const nuevo = validarMundo({ version: 1, objetos: [...mundo.objetos, objeto] });
    recordar(); mundo = nuevo; seleccionado = objeto.id; reconstruir(); enfocar(); marcar();
  }));
  ui.lista.addEventListener('change', () => seleccionar(ui.lista.value));
  ui.enfocar.addEventListener('click', enfocar);
  ui.herramienta.addEventListener('change', () => gizmo.setMode(ui.herramienta.value));
  ui.duplicar.addEventListener('click', () => intentar(() => {
    if (!actual()) return;
    const copia = JSON.parse(JSON.stringify(actual())); copia.id = crypto.randomUUID(); copia.nombre = (copia.nombre.slice(0, 70) + ' copia'); copia.posicion[0] += 10;
    const nuevo = validarMundo({ version: 1, objetos: [...mundo.objetos, copia] });
    recordar(); mundo = nuevo; seleccionado = copia.id; reconstruir(); enfocar(); marcar();
  }));
  ui.eliminar.addEventListener('click', () => {
    if (!actual()) return;
    recordar(); mundo.objetos = mundo.objetos.filter(o => o.id !== seleccionado); seleccionado = null; reconstruir(); marcar();
  });
  ui.deshacer.addEventListener('click', () => {
    if (!historial.length) { estado('No hay cambios para deshacer.'); return; }
    mundo = leerMundo(historial.pop()); reconstruir(); marcar();
  });
  ui.form.addEventListener('submit', e => {
    e.preventDefault(); intentar(() => {
      const o = actual(); if (!o) return;
      const cambio = { ...o, nombre: ui.nombre.value, color: ui.color.value,
        recurso: ui.recurso.value || (o.recurso.startsWith('data:') ? o.recurso : ''),
        accion: { tipo: ui.accion.value, texto: ui.texto.value, destino: ui.destino.value } };
      Object.entries(campos).forEach(([grupo, inputs]) => { cambio[grupo] = inputs.map(input => Number(input.value)); });
      const nuevo = validarMundo({ version: 1, objetos: mundo.objetos.map(obj => obj.id === o.id ? cambio : obj) });
      recordar(); mundo = nuevo; reconstruir(); marcar();
    });
  });
  ui.imagen.addEventListener('change', async () => {
    const archivo = ui.imagen.files[0], id = seleccionado;
    if (!archivo) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(archivo.type) || archivo.size > 650000) { estado('Elige PNG, JPEG o WebP de hasta 650 KB.'); return; }
    const lector = new FileReader();
    lector.onload = () => intentar(() => {
      if (!abierto || seleccionado !== id) return;
      const nuevo = validarMundo({ version: 1, objetos: mundo.objetos.map(o => o.id === id ? { ...o, recurso: lector.result } : o) });
      serializarMundo(nuevo); recordar(); mundo = nuevo; reconstruir(); marcar();
    });
    lector.onerror = () => estado('No se pudo leer la imagen.'); lector.readAsDataURL(archivo);
  });
  ui.guardar.addEventListener('click', () => intentar(guardar));
  ui.publicar.addEventListener('click', () => intentar(() => {
    guardar(); guardarMundoLocal('publicado', mundo); publicar(validarMundo(mundo)); estado('Versión publicada localmente. Cierra el taller para explorarla.');
  }));
  ui.exportar.addEventListener('click', () => intentar(() => {
    const url = URL.createObjectURL(new Blob([serializarMundo(mundo)], { type: 'application/json' }));
    const enlace = document.createElement('a'); enlace.href = url; enlace.download = 'universo-dg.json'; enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); estado('Copia JSON exportada.');
  }));
  ui.importar.addEventListener('change', async () => {
    const archivo = ui.importar.files[0]; if (!archivo) return;
    if (archivo.size > MAX_JSON) { estado('El archivo supera 2 MB.'); return; }
    try {
      const nuevo = leerMundo(await archivo.text()); if (!abierto) return;
      recordar(); mundo = nuevo; seleccionado = null; reconstruir(); marcar();
    } catch (error) { estado('No se importó: ' + error.message); }
    ui.importar.value = '';
  });
  gizmo.addEventListener('mouseDown', () => { recordar(); manipulando = true; });
  gizmo.addEventListener('dragging-changed', e => { orbita.enabled = abierto && !e.value; });
  gizmo.addEventListener('objectChange', () => {
    const o = actual(), mesh = gizmo.object; if (!o || !mesh) return;
    const transformacion = { posicion: mesh.position.toArray(), rotacion: [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z].map(THREE.MathUtils.radToDeg), escala: mesh.scale.toArray() };
    try {
      validarMundo({ version: 1, objetos: [{ ...o, ...transformacion }] }); Object.assign(o, transformacion); rellenarTransformaciones(); marcar();
    } catch { aplicarTransformacion(mesh, o); estado('Transformación fuera de los límites permitidos.'); }
  });
  renderer.domElement.addEventListener('pointerdown', e => { inicio.set(e.clientX, e.clientY); manipulando = false; }, true);
  renderer.domElement.addEventListener('click', e => {
    if (!abierto || manipulando || inicio.distanceTo(puntero.set(e.clientX, e.clientY)) > 5) return;
    puntero.set(e.clientX / innerWidth * 2 - 1, 1 - e.clientY / innerHeight * 2); ray.setFromCamera(puntero, camera);
    const hit = ray.intersectObjects(contenido.visibles(), true)[0];
    if (hit) seleccionar(contenido.resolver(hit.object)?.userData.idContenido);
  });
  window.addEventListener('beforeunload', e => { if (abierto && pendiente) { e.preventDefault(); e.returnValue = ''; } });
  return { actualizar() { if (abierto) orbita.update(); }, estaAbierto: () => abierto };
}
