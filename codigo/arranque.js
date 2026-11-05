// Punto de entrada de la página: solo el inicio tipo perfil, sin Three.js.
import { inicializarInicioPerfil } from './inicio_perfil/funciones.js';

inicializarInicioPerfil();

// El universo 3D queda en un archivo aparte que el navegador no descarga hasta
// que se llame a esta función. Todavía no se usa: PLAY sigue en "coming soon".
// Al activarlo, PLAY deberá ocultar #inicio-perfil antes de importar el juego.
export function cargarJuego() {
  return import('./nave/main.js');
}
