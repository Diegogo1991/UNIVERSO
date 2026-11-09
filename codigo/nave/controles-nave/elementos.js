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

// Interruptores de visibilidad del HUD
export const toggleMira = document.getElementById('hud-mira-toggle');
export const toggleOverlay = document.getElementById('hud-overlay-toggle');
export const toggleIndicadores = document.getElementById('hud-indicadores-toggle');

// Pantalla "Personalizar HUD" (tamaño del HUD y posición de la cámara)
export const botonPersonalizarHud = document.getElementById('btn-personalizar-hud');
export const pantallaPersonalizar = document.getElementById('personalizar-hud');
export const camaraDistanciaInput = document.getElementById('camara-distancia-input');
export const camaraAlturaInput = document.getElementById('camara-altura-input');
export const botonRestablecerHud = document.getElementById('personalizar-hud-restablecer');
export const botonListoHud = document.getElementById('personalizar-hud-listo');

// Modo Personalizado (PC): un botón de reasignación por acción
export const botonesTeclaAccion = [...document.querySelectorAll('[data-tecla-accion]')];
export const sliderSensPersonalizado = document.getElementById('slider-sens-personalizado');

// Punto fijo del overlay (planeta de referencia)
export const togglePuntoFijo = document.getElementById('hud-punto-fijo-toggle');
export const selectPuntoFijo = document.getElementById('hud-punto-fijo-select');

// Controles móviles: esquema y tamaño del control seleccionado en "Personalizar HUD"
export const radiosEsquema = [...document.querySelectorAll('input[name="esquema-tactil"]')];
export const tactilEscalaInput = document.getElementById('tactil-escala-input');
export const tactilEscalaNombre = document.getElementById('tactil-escala-nombre');
