// Referencias DOM de los controles táctiles (declarados en index.html).
export const contenedor = document.getElementById('controles-tactiles');
export const joystickIzquierdo = document.getElementById('tactil-joystick-izquierdo');
export const joystickDerecho = document.getElementById('tactil-joystick-derecho');
export const botonesAccion = [...contenedor.querySelectorAll('[data-accion]')];
export const botonesCrucero = [...contenedor.querySelectorAll('[data-crucero]')];
// Todo lo que se puede mover y escalar desde "Personalizar HUD" (incluye #btn-e).
export const controlesMovibles = [...document.querySelectorAll('.tactil-control[data-control]')];
