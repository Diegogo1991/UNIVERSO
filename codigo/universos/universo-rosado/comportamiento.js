import * as THREE from 'three';
import { FontLoader, TextGeometry } from 'three';
import fuenteLocal from 'three/examples/fonts/helvetiker_regular.typeface.json';
import { scene, camera, clock } from '../../nave/escena.js';
import { shipGroup, reposicionarNave } from '../../nave/nave.js';
import { mainUniverseGroup, setVisible as setUniversoInicialVisible } from '../universo-inicial/universo-inicial.js';
import { mostrarNaveSecundaria, ocultarNaveSecundaria } from '../universo-inicial/nave-secundaria.js';
import { mostrarMensajeTemporal } from '../../interfaz/funciones.js';
import { aplicarTitileo } from '../titileo-estrellas.js';

export const SYSTEM_PLANET_POS = new THREE.Vector3(90, 12, -100);

export const sistemaPlanet = new THREE.Mesh(
  new THREE.SphereGeometry(14, 48, 48),
  new THREE.MeshStandardMaterial({
    color: 0x8f00ff, // morado
    roughness: 0.35,
    metalness: 0.25,
    emissive: 0x330066,
    emissiveIntensity: 0.3,
    normalMap: new THREE.TextureLoader().load('/universos/universo-rosado/texturas/ChristmasTreeOrnament020_2K-JPG_NormalDX.jpg')
  })
);
sistemaPlanet.position.copy(SYSTEM_PLANET_POS);
mainUniverseGroup.add(sistemaPlanet);

const sistemaPlanetLight = new THREE.PointLight(0x9b31ff, 1.8, 120);
sistemaPlanetLight.position.copy(SYSTEM_PLANET_POS);
mainUniverseGroup.add(sistemaPlanetLight);

let activo = false;
let generacion = 0;
export function estaActivo() { return activo; }

// ─── OBJETOS DINÁMICOS CARGADOS DESDE JSON ───────────────────────────────────
const dynamicObjects = [];

function disposeObject(obj) {
  if (!obj) return;

  // Liberar hijos primero recursivamente
  if (obj.children && obj.children.length > 0) {
    for (let i = obj.children.length - 1; i >= 0; i--) {
      disposeObject(obj.children[i]);
    }
  }

  // Liberar geometría
  if (obj.geometry) {
    obj.geometry.dispose();
  }

  // Liberar material(es)
  if (obj.material) {
    if (Array.isArray(obj.material)) {
      obj.material.forEach(mat => disposeMaterial(mat));
    } else {
      disposeMaterial(obj.material);
    }
  }

  // Remover de su padre
  if (obj.parent) {
    obj.parent.remove(obj);
  }
}

function disposeMaterial(mat) {
  if (!mat) return;
  mat.dispose();

  // Liberar texturas vinculadas a propiedades del material
  for (const key in mat) {
    if (mat[key] && typeof mat[key].dispose === 'function') {
      mat[key].dispose();
    }
  }
}

function clearDynamicObjects() {
  dynamicObjects.forEach(obj => disposeObject(obj));
  dynamicObjects.length = 0;

  // Reiniciar texto Sistema (se recrea al entrar otra vez)
  if (sistemaTextGroup) {
    disposeObject(sistemaTextGroup);
    sistemaTextGroup = null;
  }
  sistemaTextLetters = [];
  sistemaTextExploded = false;
  sistemaTextStartTime = 0;
}

function addStarUniverse(starGroups) {
  starGroups.forEach(({count, spread, size, color}) => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = spread * (0.5 + Math.random() * 0.5);
      positions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i*3+2] = r * Math.cos(phi);

      const t = Math.random();
      const c = new THREE.Color(color || 0xffffff);
      colors[i*3] = THREE.MathUtils.lerp(0.8, 1.0, t) * c.r;
      colors[i*3+1] = THREE.MathUtils.lerp(0.8, 1.0, t) * c.g;
      colors[i*3+2] = THREE.MathUtils.lerp(0.8, 1.0, t) * c.b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const materialEstrellas = new THREE.PointsMaterial({ size: size || 0.4, vertexColors: true, transparent: true, opacity: 0.9 });
    aplicarTitileo(geo, materialEstrellas);
    const starPoints = new THREE.Points(geo, materialEstrellas);

    starPoints.position.copy(SYSTEM_PLANET_POS);
    scene.add(starPoints);
    dynamicObjects.push(starPoints);
  });
}

export function loadUniverseFromFile(url) {
  const solicitud = ++generacion;
  fetch(url)
    .then(res => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
    .then(data => {
      if (!activo || solicitud !== generacion) return;
      console.log('🌌 Universo cargado:', data.galaxy, data);
      clearDynamicObjects();

      if (data.stars && Array.isArray(data.stars) && data.stars.length > 0) {
        addStarUniverse(data.stars);
      }

      if (data.planets && Array.isArray(data.planets)) {
        data.planets.forEach(p => {
          const obj = new THREE.Mesh(
            new THREE.SphereGeometry(p.size, 32, 32),
            new THREE.MeshStandardMaterial({ color: new THREE.Color(p.color), emissive: new THREE.Color(p.color).multiplyScalar(0.2), roughness:0.3 })
          );
          obj.position.set(p.pos[0] + SYSTEM_PLANET_POS.x, p.pos[1] + SYSTEM_PLANET_POS.y, p.pos[2] + SYSTEM_PLANET_POS.z);
          scene.add(obj);
          dynamicObjects.push(obj);
        });
      }

      const desc = data.galaxy + (data.stars && data.stars.length > 0 ? ' (solo estrellas)' : '');
      mostrarMensajeTemporal(`Ahora estás en el universo ${desc}.`);

      // En universo SISTEMA, mostrar texto 3D flotante
      if (activo) {
        addSistemaText();
      }
    })
    .catch(error => {
      console.error('Error cargando universo:', error);
      if (activo && solicitud === generacion) mostrarMensajeTemporal('No se pudo cargar el universo: ' + error.message);
    });
}

// ─── TEXTO 3D FLOTANTE ────────────────────────────────────────────────────────
let sistemaTextGroup = null;
let sistemaTextLetters = [];
let sistemaTextFont = null;
let sistemaTextStartTime = 0;
let sistemaTextExploded = false;
const SISTEMA_TEXT = 'Esto apenas empieza, voy por buen camino.';
const SISTEMA_TEXT_HOLD = 3.0; // segundos antes de explosión

function addSistemaText() {
  if (sistemaTextGroup) return;

  const solicitud = generacion;
  const createTextLetters = (font) => {
    if (!activo || solicitud !== generacion || sistemaTextGroup) return;
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffc0ff,
      emissive: 0x602060,
      emissiveIntensity: 1.0,
      roughness: 0.25,
      metalness: 0.35,
      transparent: true,
      opacity: 0.96,
      side: THREE.DoubleSide
    });

    let cursor = 0;
    const spacing = 0.5;

    // texto por caracter
    for (const ch of SISTEMA_TEXT) {
      if (ch === ' ') {
        cursor += 1.2;
        continue;
      }

      const geo = new TextGeometry(ch, {
        font,
        size: 2.2,
        height: 0.45,
        curveSegments: 8,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.04,
        bevelOffset: 0,
        bevelSegments: 2
      });
      geo.computeBoundingBox();
      const charWidth = geo.boundingBox.max.x - geo.boundingBox.min.x;

      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.position.set(cursor + charWidth * 0.5, 0, 0);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      group.add(mesh);

      sistemaTextLetters.push({ mesh, velocity: new THREE.Vector3(), startPos: mesh.position.clone() });
      cursor += charWidth + spacing;
    }

    mat.dispose();
    // centrar el texto completo
    const bb = new THREE.Box3().setFromObject(group);
    const center = bb.getCenter(new THREE.Vector3());
    group.children.forEach(c => c.position.sub(center));

    group.position.set(0, 0, 0);
    group.userData.initialized = true;
    scene.add(group);
    dynamicObjects.push(group);

    sistemaTextGroup = group;
    sistemaTextStartTime = clock.getElapsedTime();
    sistemaTextExploded = false;
  };

  if (sistemaTextFont) {
    createTextLetters(sistemaTextFont);
    return;
  }

  sistemaTextFont = new FontLoader().parse(fuenteLocal);
  createTextLetters(sistemaTextFont);
}

// ─── TRANSICIONES ────────────────────────────────────────────────────────────
export function entrarUniversoRosado() {
  if (activo) {
    console.log('Ya estás en el universo Sistema.');
    return;
  }

  activo = true;
  console.log('Entrando al universo de estrellas Sistema...');
  setUniversoInicialVisible(false);

  shipGroup.visible = true;
  ocultarNaveSecundaria();

  loadUniverseFromFile('/universos/universo-rosado/estrellas.json');

  // Mover nave/cámara hacia el planeta Sistema como efecto de teletransporte
  reposicionarNave(SYSTEM_PLANET_POS.clone().add(new THREE.Vector3(0, 0, 40)));
  camera.position.copy(shipGroup.position).add(new THREE.Vector3(0, 12, 32));

  // Resetear rotación de la nave al entrar


  mostrarMensajeTemporal('🌌 UNIVERSO DE ESTRELLAS SISTEMA');
}

export function salirUniversoRosado() {
  if (!activo) {
    console.log('Ya estás en el universo principal.');
    return;
  }

  activo = false;
  generacion++;
  clearDynamicObjects();
  setUniversoInicialVisible(true);

  shipGroup.visible = true;
  mostrarNaveSecundaria();

  reposicionarNave(new THREE.Vector3(0, 4, 14));
  camera.position.copy(shipGroup.position).add(new THREE.Vector3(0, 12, 32));

  // Resetear rotación de la nave al regresar



  mostrarMensajeTemporal('◈ REGRESASTE AL UNIVERSO PRINCIPAL');
  console.log('Volviendo al universo principal...');
}

// ─── ACTUALIZACIÓN POR FRAME ──────────────────────────────────────────────────
export function actualizarUniversoRosado(t) {
  sistemaPlanet.rotation.y = t * 0.06;
  sistemaPlanetLight.intensity = 1.8 + Math.sin(t * 1.3) * 0.4;

  // Texto 3D flotante en universo Sistema
  if (sistemaTextGroup && activo) {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(shipGroup.quaternion);
    const target = shipGroup.position.clone().add(forward.multiplyScalar(11)).add(new THREE.Vector3(0, 6, 0));
    sistemaTextGroup.position.lerp(target, 0.12);
    sistemaTextGroup.lookAt(camera.position);

    const elapsed = t - sistemaTextStartTime;

    if (!sistemaTextExploded && elapsed > SISTEMA_TEXT_HOLD) {
      sistemaTextExploded = true;
      sistemaTextLetters.forEach((item) => {
        item.velocity.set(
          (Math.random() - 0.5) * 2.4,
          Math.random() * 1.9 + 1.8,
          (Math.random() - 0.5) * 2.4
        );
      });
    }

    if (sistemaTextExploded) {
      sistemaTextLetters.forEach((item) => {
        item.mesh.position.addScaledVector(item.velocity, 0.05);
        item.mesh.rotation.x += 0.015;
        item.mesh.rotation.y += 0.02;
        item.velocity.y -= 0.025;
        item.mesh.material.opacity = Math.max(0, item.mesh.material.opacity - 0.0008);
      });
    }
  }
}
