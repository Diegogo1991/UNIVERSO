// Punto de entrada de la página: solo el inicio tipo perfil, sin Three.js.
import { inicializarInicioPerfil } from './inicio_perfil/funciones.js';
import { inicioPerfil, cargaInicio } from './inicio_perfil/elementos.js';

// El universo 3D queda en un archivo aparte que el navegador no descarga hasta
// que se llame a esta función. PLAY aún no la usa (sigue en "coming soon"); al
// activarlo, PLAY deberá ocultar #inicio-perfil antes de importar el juego.
export function cargarJuego() {
  return import('./nave/main.js');
}

// Solo en desarrollo: http://localhost:3000/?juego salta el inicio y abre el
// juego para probarlo. En la compilación esta rama se elimina.
if (import.meta.env.DEV && new URLSearchParams(location.search).has('juego')) {
  inicioPerfil.hidden = true;
  cargaInicio.hidden = true;
  cargarJuego();
} else {
  inicializarInicioPerfil();
}
