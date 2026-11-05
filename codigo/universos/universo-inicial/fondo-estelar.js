import * as THREE from 'three';
import { aplicarTitileo } from '../titileo-estrellas.js';

function makeStarField(count, spread) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = spread * (0.5 + Math.random() * 0.5);
    pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i*3+2] = r * Math.cos(phi);
    const t = Math.random();
    col[i*3] = 0.7 + t*0.3; col[i*3+1] = 0.8 + t*0.15; col[i*3+2] = 1.0;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
  const material = new THREE.PointsMaterial({ size: 0.5, vertexColors: true });
  aplicarTitileo(geo, material);
  return new THREE.Points(geo, material);
}

export function crearFondoEstelar(group) {
  group.add(makeStarField(3000, 1200));
  group.add(makeStarField(800, 500));

  // Nebulosas
  [[0x1a0a4a,[-300,80,-400],600,0.15],[0x0a1a4a,[400,-60,-500],700,0.12],[0x2a0a2a,[100,-200,-300],500,0.1]]
  .forEach(([color, pos, size, op]) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    m.position.set(...pos);
    m.rotation.set(Math.random(), Math.random(), Math.random());
    group.add(m);
  });
}
