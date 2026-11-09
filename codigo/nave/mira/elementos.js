// Referencias a los elementos del DOM de la mira (creados en index.html).
// Este archivo solo obtiene los nodos; la lógica que los actualiza vive en funciones.js.

export const mira = document.getElementById('mira');               // contenedor raíz de toda la mira
export const miraCentro = document.getElementById('mira-centro');   // marcador central (crosshair)
export const indicadores = [...mira.querySelectorAll('.mira-escala')]; // ENERGÍA y VELOCIDAD

// Escala izquierda: ENERGÍA (reemplaza el "ALT" de un HUD de caza real)
export const energiaFill = document.getElementById('mira-energia-fill');   // barra que sube/baja según % de energía
export const energiaValor = document.getElementById('mira-energia-valor'); // número de energía actual

// Escala derecha: VELOCIDAD
export const velocidadFill = document.getElementById('mira-velocidad-fill');   // barra que sube/baja según % de velocidad
export const velocidadValor = document.getElementById('mira-velocidad-valor'); // número de velocidad actual
