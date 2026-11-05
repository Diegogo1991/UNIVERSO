// Referencias a los elementos del DOM del panel de configuración de controles
// (creados en index.html). Este archivo solo obtiene los nodos; la lógica de
// apertura/cierre, pestañas y sliders vive en funciones.js.

// Botón flotante (⚙ + 🎮) que abre el panel
export const botonAbrir = document.getElementById('btn-config-controles');

// Overlay + tarjeta del panel
export const panel = document.getElementById('panel-controles');
export const botonCerrar = document.getElementById('panel-controles-cerrar');

// Pestañas de los 3 esquemas de control y sus contenidos asociados
export const botonesTabs = Array.from(document.querySelectorAll('.tab-controles'));
export const contenidosTabs = Array.from(document.querySelectorAll('.tab-contenido'));

// Sliders de sensibilidad del modo Estándar
export const sliderSensRotacion = document.getElementById('slider-sens-rotacion');
export const sliderSensCamara = document.getElementById('slider-sens-camara');
export const sliderSensJoystick = document.getElementById('slider-sens-joystick');

// Slider de sensibilidad del modo Medio (Arcade)
export const sliderSensDireccionMedio = document.getElementById('slider-sens-direccion-medio');

// Modo Avanzado (As de Combate): slider de sensibilidad y botones de reasignación
// de teclas para acelerar/frenar
export const sliderSensInclinacionAvanzado = document.getElementById('slider-sens-inclinacion-avanzado');
export const botonRebindAcelerar = document.getElementById('rebind-acelerar');
export const botonRebindFrenar = document.getElementById('rebind-frenar');

// Controles de apariencia de la mira (color y tamaño), siempre visibles sin
// importar la pestaña activa
export const miraColorInput = document.getElementById('mira-color-input');
export const miraTamanoInput = document.getElementById('mira-tamano-input');
