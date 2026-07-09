export function initLights(scene) {
  // Luz ambiental
  const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
  scene.add(ambientLight);

  // Luz solar (DirectionalLight azul claro con mapa de sombras)
  const sunLight = new THREE.DirectionalLight(0xffffff, 1);
  sunLight.position.set(5, 5, 5);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 50;
  sunLight.shadow.camera.left = -10;
  sunLight.shadow.camera.right = 10;
  sunLight.shadow.camera.top = 10;
  sunLight.shadow.camera.bottom = -10;
  scene.add(sunLight);

  // Luz de borde (Rim Light)
  const rimLight = new THREE.DirectionalLight(0x00ffff, 1);
  rimLight.position.set(-5, -5, -5);
  scene.add(rimLight);
}