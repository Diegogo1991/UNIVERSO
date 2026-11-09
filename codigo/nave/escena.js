import * as THREE from 'three';

export const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x00000f, 0.0015);

export const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 3000);
camera.position.set(0, 4, 14);

export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);
renderer.domElement.tabIndex = 0;
renderer.domElement.setAttribute('aria-label', 'Universo 3D');

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Environment map para reflejos metálicos
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
// Entorno vacío a propósito: un RoomEnvironment (estudio blanco) iluminaba todos
// los MeshStandardMaterial y dejaba un velo blanco sobre planeta, asteroides y nave.
const envTexture = pmremGenerator.fromScene(new THREE.Scene()).texture;
pmremGenerator.dispose();
const envLight = new THREE.PointLight(0xffffff, 1, 500);
envLight.position.set(0, 50, 0);
scene.add(envLight);
scene.environment = envTexture;

// Reloj del juego: igual que THREE.Clock para quien lo lee, pero se puede
// pausar sin que el tiempo salte al reanudar (las animaciones dependen de t).
const relojReal = new THREE.Clock();
let pausadoDesde = null, tiempoEnPausa = 0;
export const clock = {
  getElapsedTime: () => (pausadoDesde ?? relojReal.getElapsedTime()) - tiempoEnPausa
};
export function pausarReloj(pausar) {
  const ahora = relojReal.getElapsedTime();
  if (pausar && pausadoDesde === null) pausadoDesde = ahora;
  else if (!pausar && pausadoDesde !== null) { tiempoEnPausa += ahora - pausadoDesde; pausadoDesde = null; }
}
