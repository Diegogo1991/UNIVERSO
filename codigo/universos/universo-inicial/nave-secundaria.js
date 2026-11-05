import * as THREE from 'three';
import { scene } from '../../nave/escena.js';
import { configurarModeloNave } from '../../nave/nave.js';

// ─── SEGUNDA NAVE (VERSIÓN AZUL) — decoración autónoma del universo inicial ──
export const shipGroup2 = new THREE.Group();
scene.add(shipGroup2);
const engineLight2 = new THREE.PointLight(0x4488ff, 0, 8);
shipGroup2.add(engineLight2);
export let shipModel2 = null;

const velocity2 = new THREE.Vector3();
const MAX_SPEED2 = 2.5;
let angularVel2 = 0;
let moveTimer2 = 0;
const targetDirection2 = new THREE.Vector3();

export function crearNaveSecundaria(modeloBase) {
  shipModel2 = modeloBase.clone();
  console.log('Segunda nave creada');
  configurarModeloNave(shipModel2, shipGroup2, true);
  // Posicionar la segunda nave cerca del planeta naranja
  shipGroup2.position.set(-90, 35, -160);
}

export function mostrarNaveSecundaria() { shipGroup2.visible = true; }
export function ocultarNaveSecundaria() { shipGroup2.visible = false; }

export function actualizarNaveSecundaria(t, centerPos) {
  if (!shipModel2) return;

  moveTimer2 += 0.016; // ~60fps

  // Change direction every 3-8 seconds
  if (moveTimer2 > Math.random() * 5 + 3) {
    moveTimer2 = 0;

    // Generate new random direction
    const angle = Math.random() * Math.PI * 2;
    const height = (Math.random() - 0.5) * 40; // -20 to +20
    targetDirection2.set(
      Math.cos(angle) * 0.8,
      height * 0.01,
      Math.sin(angle) * 0.8
    ).normalize();

    // Add some random rotation
    angularVel2 = (Math.random() - 0.5) * 0.02;
  }

  // Smooth rotation towards target direction
  const targetYaw = Math.atan2(targetDirection2.x, targetDirection2.z);
  let diffYaw = targetYaw - shipGroup2.rotation.y;
  while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
  while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;

  angularVel2 += diffYaw * 0.005;
  angularVel2 *= 0.95;
  shipGroup2.rotation.y += angularVel2;

  // Add some pitch variation
  shipGroup2.rotation.x += (targetDirection2.y * 0.5 - shipGroup2.rotation.x) * 0.02;
  shipGroup2.rotation.x *= 0.98;

  // Visual roll based on turn
  const targetRoll = -angularVel2 * 20;
  shipModel2.rotation.z += (targetRoll - shipModel2.rotation.z) * 0.05;

  // Movement
  const forward2 = new THREE.Vector3(
    Math.sin(shipGroup2.rotation.y),
    Math.sin(shipGroup2.rotation.x),
    Math.cos(shipGroup2.rotation.y)
  );

  // Apply thrust with some variation
  const ACCEL = 0.18;
  const thrustVariation = 0.8 + Math.sin(t * 0.5) * 0.3; // 0.5 to 1.1
  velocity2.addScaledVector(forward2, ACCEL * 0.3 * thrustVariation);

  // Limit speed
  const spd2 = velocity2.length();
  if (spd2 > MAX_SPEED2) velocity2.multiplyScalar(MAX_SPEED2 / spd2);

  // Apply friction
  velocity2.multiplyScalar(0.98);

  // Update position
  shipGroup2.position.add(velocity2);

  // Add continuous rotation on ship's own axis based on movement direction
  const spinSpeed = velocity2.length() * 0.1;
  shipModel2.rotation.y += spinSpeed;

  // Add some wobble/tilt based on direction changes
  shipModel2.rotation.x = Math.sin(t * 2) * 0.1 + shipGroup2.rotation.x * 0.3;
  shipModel2.rotation.z = Math.cos(t * 1.5) * 0.05;

  // Keep within bounds around the orange planet (prevent going too far)
  const distFromPlanet = shipGroup2.position.distanceTo(centerPos);
  if (distFromPlanet > 60) {
    const pullBack = shipGroup2.position.clone().sub(centerPos).normalize().multiplyScalar(-0.3);
    velocity2.add(pullBack);
  }

  // Engine light effect
  engineLight2.intensity = 2 + Math.sin(t * 3) * 1.5;

  // Heat effect on blue parts
  shipModel2.traverse((child) => {
    if (child.isMesh && child.material) {
      const heatRatio = Math.min(1, spd2 / (MAX_SPEED2 * 0.6));
      const name = (child.material.name || '').toLowerCase();
      const isBlue = name.includes('azul') || name.includes('blue') ||
                     (child.material.color &&
                      child.material.color.b > 0.4 &&
                      child.material.color.r < 0.3 &&
                      child.material.color.g < 0.3);

      if (isBlue) {
        if (!child.material.emissive) child.material.emissive = new THREE.Color();
        child.material.emissive.setRGB(
          heatRatio * 0.2,
          heatRatio * 0.4,
          heatRatio * 1.5
        );
        child.material.emissiveIntensity = heatRatio * 2.0;
        child.material.needsUpdate = true;
      }
    }
  });
}
