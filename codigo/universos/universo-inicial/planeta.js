import * as THREE from 'three';

export const PLANET_POS = new THREE.Vector3(-120, 20, -180);

let planetPulseIntensity = 2.0;

export function setPlanetPulseIntensity(intensity) {
  planetPulseIntensity = Math.max(0.1, Math.min(10, intensity));
  console.log(`🔄 Pulsos actualizados: ${planetPulseIntensity}`);
  console.log(`🌟 Intensidad de pulsos del planeta cambiada a: ${planetPulseIntensity}`);
}

function showPlanetPulseInfo() {
  console.log(`🔥 PLANETA NARANJA INTENSO:`);
  console.log(`   Color: Naranja rojizo vibrante (#ff4500)`);
  console.log(`   Intensidad actual: ${planetPulseIntensity}`);
  console.log(`   Rango recomendado: 0.5 - 5.0`);
  console.log(`   Para cambiar: setPlanetPulseIntensity(2.5)`);
}

// Exponer en la consola del navegador, tal como indica el HUD ("CONSOLA — setPlanetPulseIntensity(2.5)")
window.setPlanetPulseIntensity = setPlanetPulseIntensity;

// Mostrar información inicial del planeta al cargar
setTimeout(() => {
  console.log(`🔥 ¡Planeta naranja INTENSO activado!`);
  showPlanetPulseInfo();
}, 2000);

export const planet = new THREE.Mesh(
  new THREE.SphereGeometry(28, 64, 64),
  new THREE.MeshStandardMaterial({
    color: 0xff4500,     // Naranja intenso / Óxido
    metalness: 0.85,     // Alta reflectividad metálica
    roughness: 0.2,      // Pulido, pero con ligera dispersión de luz
    envMapIntensity: 1.5, // Multiplicador para absorber la luz del espacio
    map: new THREE.TextureLoader().load('/universos/universo-inicial/texturas/Lava004_2K-JPG_Color.jpg')
  })
);
planet.position.copy(PLANET_POS);

const atmosphereLayers = [30, 34, 38].map((r, i) => {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0xff6600, // Naranja más brillante para atmósfera
      transparent: true,
      opacity: 0.06 - i*0.015,
      side: THREE.BackSide,
      depthWrite: false
    })
  );
  m.position.copy(PLANET_POS);
  return m;
});

const rings = [[36, 52, 0.18], [54, 66, 0.08]].map(([inner, outer, op]) => {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(inner, outer, 80),
    new THREE.MeshBasicMaterial({
      color: 0xff7733, // Naranja intenso para los anillos
      transparent: true,
      opacity: op,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  ring.position.copy(PLANET_POS);
  ring.rotation.x = Math.PI / 2.4;
  return ring;
});

const planetLight = new THREE.PointLight(0xff4500, 3, 140); // Luz naranja intensa rojiza
planetLight.position.copy(PLANET_POS);

export function crearPlaneta(group) {
  group.add(planet);
  atmosphereLayers.forEach(m => group.add(m));
  rings.forEach(r => group.add(r));
  group.add(planetLight);
}

export function actualizarPlaneta(t) {
  planet.rotation.y = t * 0.04;
  planetLight.intensity = 3 + Math.sin(t * 1.5) * planetPulseIntensity;
  planet.material.emissiveIntensity = 0.3 + Math.sin(t * 1.5) * (planetPulseIntensity * 0.1);
}
