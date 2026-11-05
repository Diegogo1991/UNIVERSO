import * as THREE from 'three';

const tiempo = { value: 0 };

// Cada estrella combina dos ondas con fase, velocidad y amplitud propias: el
// producto solo es alto cuando ambas coinciden, así los apagones son irregulares.
export function aplicarTitileo(geometria, material) {
  const cantidad = geometria.attributes.position.count;
  const datos = new Float32Array(cantidad * 3);
  for (let i = 0; i < cantidad; i++) {
    datos[i*3] = Math.random() * Math.PI * 2;     // fase
    datos[i*3+1] = 0.6 + Math.random() * 2.4;     // velocidad (rad/s)
    datos[i*3+2] = 0.3 + Math.random() * 0.6;     // cuánto se apaga en el mínimo
  }
  geometria.setAttribute('titileo', new THREE.BufferAttribute(datos, 3));
  material.onBeforeCompile = shader => {
    shader.uniforms.uTiempo = tiempo;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 titileo;\nuniform float uTiempo;')
      .replace('#include <color_vertex>', `#include <color_vertex>
        float ondaA = 0.5 + 0.5 * sin(uTiempo * titileo.y + titileo.x);
        float ondaB = 0.5 + 0.5 * sin(uTiempo * titileo.y * 0.43 + titileo.x * 2.3);
        vColor *= 1.0 - titileo.z * pow(ondaA * ondaB, 2.0);`);
  };
}

export function actualizarTitileo(t) {
  tiempo.value = t;
}
