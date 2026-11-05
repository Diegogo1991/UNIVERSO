import * as THREE from 'three';
import { scene } from '../../nave/escena.js';
import { crearFondoEstelar } from './fondo-estelar.js';
import { planet, PLANET_POS, crearPlaneta, actualizarPlaneta } from './planeta.js';
import { crearAsteroides, actualizarAsteroides } from './asteroides.js';
import { crearNaveSecundaria, actualizarNaveSecundaria } from './nave-secundaria.js';

export const mainUniverseGroup = new THREE.Group();
scene.add(mainUniverseGroup);

crearFondoEstelar(mainUniverseGroup);
crearPlaneta(mainUniverseGroup);
export const asteroids = crearAsteroides(mainUniverseGroup, PLANET_POS);

export { planet, PLANET_POS };

export function inicializarNaveSecundaria(modeloBase) {
  crearNaveSecundaria(modeloBase);
}

export function setVisible(visible) {
  mainUniverseGroup.visible = visible;
}

export function actualizarUniversoInicial(t) {
  actualizarPlaneta(t);
  actualizarAsteroides(asteroids, PLANET_POS);
  actualizarNaveSecundaria(t, PLANET_POS);
}
