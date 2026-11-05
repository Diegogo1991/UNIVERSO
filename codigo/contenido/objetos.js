import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function liberarObjeto(objeto) {
  const recursos = new Set();
  objeto.traverse(o => {
    if (o.geometry) recursos.add(o.geometry);
    for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
      if (!m) continue;
      recursos.add(m);
      Object.values(m).forEach(v => { if (v?.isTexture) recursos.add(v); });
    }
  });
  recursos.forEach(r => r.dispose()); objeto.parent?.remove(objeto);
}
function tarjeta(color) {
  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 480;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#071421'; ctx.fillRect(0, 0, 768, 480);
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.ellipse(385, 210, 50 + i * 27, 45 + i * 8, -0.4, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = '#e7f4ff'; ctx.font = '26px monospace'; ctx.fillText('UN ESPACIO PARA TUS IDEAS', 185, 380);
  const textura = new THREE.CanvasTexture(canvas); textura.encoding = THREE.sRGBEncoding; return textura;
}
function crearGalaxia(color) {
  const posiciones = [], colores = [], base = new THREE.Color(color), blanco = new THREE.Color('#fff1d9');
  let semilla = 42;
  const azar = () => { semilla = (Math.imul(1664525, semilla) + 1013904223) >>> 0; return semilla / 4294967296; };
  for (let i = 0; i < 2200; i++) {
    const r = Math.sqrt(azar()) * 15, a = (i % 3) * Math.PI * 2 / 3 + r * 0.3 + (azar() - 0.5) * 0.5;
    posiciones.push(Math.cos(a) * r, (azar() - 0.5) * (1.7 - r * 0.08), Math.sin(a) * r);
    const c = blanco.clone().lerp(base, r / 15); colores.push(c.r, c.g, c.b);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colores, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.18, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
}
export function aplicarTransformacion(grupo, dato) {
  grupo.position.fromArray(dato.posicion);
  grupo.rotation.set(...dato.rotacion.map(THREE.MathUtils.degToRad));
  grupo.scale.fromArray(dato.escala);
}
export function crearObjeto(dato, onError) {
  const grupo = new THREE.Group(); grupo.userData.idContenido = dato.id;
  let vigente = true;
  grupo.userData.cancelar = () => { vigente = false; };
  const material = () => new THREE.MeshStandardMaterial({ color: dato.color, emissive: dato.color, emissiveIntensity: 0.4, roughness: 0.4 });
  if (dato.tipo === 'plano') {
    const mat = new THREE.MeshBasicMaterial({ map: tarjeta(dato.color), side: THREE.DoubleSide });
    const plano = new THREE.Mesh(new THREE.PlaneGeometry(12, 7.5), mat); grupo.add(plano);
    if (dato.recurso) {
      new THREE.TextureLoader().load(dato.recurso, textura => {
        if (!vigente) { textura.dispose(); return; }
        textura.encoding = THREE.sRGBEncoding; mat.map.dispose(); mat.map = textura; mat.needsUpdate = true;
        plano.scale.x = (textura.image.width / textura.image.height) / 1.6;
      }, undefined, () => { if (vigente) onError('No se pudo cargar la imagen de ' + dato.nombre); });
    }
  } else if (dato.tipo === 'galaxia') grupo.add(crearGalaxia(dato.color));
  else if (dato.tipo === 'espiral') {
    const puntos = [];
    for (let i = 0; i <= 180; i++) { const a = i / 180 * Math.PI * 8, r = 1 + i / 25; puntos.push(new THREE.Vector3(Math.cos(a) * r, (i / 180 - 0.5) * 8, Math.sin(a) * r)); }
    grupo.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(puntos), 180, 0.16, 6, false), material()));
  } else if (dato.tipo === 'portal') {
    grupo.add(new THREE.Mesh(new THREE.TorusGeometry(6, 0.25, 12, 80), material()));
    grupo.add(new THREE.Mesh(new THREE.CircleGeometry(5.8, 64), new THREE.MeshBasicMaterial({ color: dato.color, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false })));
  } else {
    const placeholder = new THREE.Mesh(new THREE.IcosahedronGeometry(2, 1), material()); grupo.add(placeholder);
    if (dato.recurso) new GLTFLoader().load(dato.recurso, gltf => {
      if (!vigente) { liberarObjeto(gltf.scene); return; }
      const box = new THREE.Box3().setFromObject(gltf.scene), size = box.getSize(new THREE.Vector3()), centro = box.getCenter(new THREE.Vector3());
      const escala = 8 / (Math.max(size.x, size.y, size.z) || 1);
      gltf.scene.scale.multiplyScalar(escala); gltf.scene.position.addScaledVector(centro, -escala);
      liberarObjeto(placeholder); grupo.add(gltf.scene);
    }, undefined, () => { if (vigente) onError('No se pudo cargar el modelo de ' + dato.nombre); });
  }
  aplicarTransformacion(grupo, dato); return grupo;
}
export function crearContenido(scene, onError) {
  const objetos = new Map(); let universo = 'universo-inicial', visibles = [];
  const actualizarVisibles = () => { visibles = [...objetos.values()].filter(o => o.visible); };
  return {
    cargar(mundo) {
      const ids = new Set(mundo.objetos.map(dato => dato.id));
      objetos.forEach((o, id) => {
        if (!ids.has(id)) { o.userData.cancelar(); liberarObjeto(o); objetos.delete(id); }
      });
      mundo.objetos.forEach(dato => {
        const apariencia = JSON.stringify([dato.tipo, dato.recurso, dato.color]);
        let obj = objetos.get(dato.id);
        if (obj && obj.userData.apariencia !== apariencia) {
          obj.userData.cancelar(); liberarObjeto(obj); obj = null;
        }
        if (!obj) { obj = crearObjeto(dato, onError); objetos.set(dato.id, obj); scene.add(obj); }
        // Mover, renombrar o cambiar una acción no recarga texturas/modelos.
        obj.userData.apariencia = apariencia; obj.userData.dato = dato;
        aplicarTransformacion(obj, dato); obj.visible = dato.universo === universo;
      });
      actualizarVisibles();
    },
    universo(id) { universo = id; objetos.forEach(o => { o.visible = o.userData.dato.universo === id; }); actualizarVisibles(); },
    obtener(id) { return objetos.get(id); },
    visibles() { return visibles; },
    resolver(mesh) { while (mesh && !mesh.userData.idContenido) mesh = mesh.parent; return mesh; }
  };
}
