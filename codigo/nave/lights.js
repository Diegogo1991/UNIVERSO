import * as THREE from 'three';

export function initLights(scene) {
  scene.add(new THREE.AmbientLight(0x0a1535, 3));

  const sun = new THREE.DirectionalLight(0x6699ff, 5);
  sun.position.set(80, 60, -40);
  sun.castShadow = true;
  scene.add(sun);

  const rim = new THREE.DirectionalLight(0x2244aa, 2.5);
  rim.position.set(-60, 20, 60);
  scene.add(rim);

  scene.add(new THREE.HemisphereLight(0x112244, 0x000511, 1.5));
}
