import * as THREE from 'three';

export function crearAsteroides(group, centerPos, cantidad = 35) {
  const asteroids = [];
  for (let i = 0; i < cantidad; i++) {
    const mesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.3 + Math.random() * 1.5, 0),
      new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.9, metalness: 0.1 })
    );
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 100;
    mesh.position.set(centerPos.x + Math.cos(angle)*dist, centerPos.y + (Math.random()-0.5)*30, centerPos.z + Math.sin(angle)*dist);
    mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
    group.add(mesh);
    asteroids.push({ mesh, speed: (Math.random()-0.5)*0.005, ry: Math.random()*0.01 });
  }
  return asteroids;
}

export function actualizarAsteroides(asteroids, centerPos) {
  asteroids.forEach(({ mesh, speed, ry }) => {
    const rel   = mesh.position.clone().sub(centerPos);
    const angle = Math.atan2(rel.z, rel.x) + speed;
    const dist  = Math.sqrt(rel.x*rel.x + rel.z*rel.z);
    mesh.position.x = centerPos.x + Math.cos(angle) * dist;
    mesh.position.z = centerPos.z + Math.sin(angle) * dist;
    mesh.rotation.x += ry; mesh.rotation.y += ry * 0.7;
  });
}
