# Guía para agentes de desarrollo

## Objetivo del proyecto

Este repositorio contiene **Universo DG**, un espacio creativo 3D web donde se
exploran ideas en una nave. El portafolio es uno de sus contenidos posibles;
otros incluyen dibujos, modelos, galaxias y experiencias. Cuenta con un taller
local de objetos. Las cuentas, permisos remotos y el multijugador son siguientes
etapas, no capacidades ya implementadas.

Antes de cambiar código, lee [`README.md`](README.md),
[`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) y, si la tarea afecta el espacio
3D, [`codigo/universos/universo-inicial/origen-universo-inicial.md`](codigo/universos/universo-inicial/origen-universo-inicial.md).

## Comandos

```bash
npm install
npm run dev
npm test
npm run build
npm run preview
```

En Windows con PowerShell y políticas de ejecución restrictivas usa
`npm.cmd` en lugar de `npm`, por ejemplo `npm.cmd run build`.

Hay pruebas con Node en `pruebas/` para vuelo y contenido. No hay lint.
Antes de entregar un cambio ejecuta `npm test` y `npm run build`, más revisión en el
navegador proporcional al área modificada.

## Estructura y responsabilidades

- `index.html`: única entrada HTML y contrato de nodos DOM para todos los módulos
  de interfaz. Si se cambia un `id`, hay que actualizar su módulo `elementos.js`.
- `codigo/nave/main.js`: composición de sistemas, interacción entre universos y
  loop principal. Debe seguir siendo un orquestador, no un contenedor de toda la
  lógica.
- `codigo/nave/`: escena, render, cámara, carga y movimiento de la nave.
- `codigo/nave/simulacion.js`: estado y simulación temporal sin DOM/escena.
- `codigo/contenido/`: contrato versionado, fábricas y persistencia local.
- `codigo/editor/`: taller importado solo en desarrollo; no equivale a login.
- `codigo/nave/controles-nave/`: panel de controles, persistencia y reasignación
  de teclas. Su estado se guarda en `localStorage` bajo
  `universo-config-controles`.
- `codigo/nave/mira/`: HUD de energía, velocidad y escalera de cabeceo.
- `codigo/interfaz/`: HUD general, CV y reproductor de audio.
- `codigo/interfaz-carga/`: pantalla y estado de carga inicial.
- `codigo/universos/`: contenido y comportamiento propios de cada universo.
- `recursos-estaticos/`: raíz pública de Vite; sus archivos se referencian desde
  el navegador con `/`, sin incluir `recursos-estaticos` en la URL.
- `codigo/configuracion/vite.config.js`: configuración de Vite. Mantén
  `publicDir: 'recursos-estaticos'` salvo una migración deliberada.
- `codigo/herramientas/`: utilidades de desarrollo que no forman parte del
  runtime del navegador.

## Reglas de implementación

1. Conserva JavaScript ES modules y Three.js. No introduzcas un framework, motor
   o sistema de compilación nuevo sin una decisión explícita del propietario.
2. Usa nombres en español para carpetas y módulos nuevos, siguiendo la estructura
   actual. Para API de Three.js y conceptos técnicos establecidos puede usarse
   su nombre original.
3. Mantén separado el acceso al DOM (`elementos.js`), el comportamiento
   (`funciones.js`) y los estilos (`estilos.css`) cuando el dominio use ese patrón.
4. Evita acoplar un universo directamente a detalles internos de otro. Las
   transiciones globales se coordinan en `main.js`; cada universo crea, actualiza,
   muestra, oculta y libera sus propios objetos.
5. Todo objeto animado debe actualizarse desde el loop existente; no agregues un
   segundo `requestAnimationFrame` para lógica 3D. Una excepción actual es la
   animación DOM del botón de audio.
6. Reutiliza vectores, quaternions, geometrías y materiales dentro de rutas por
   frame cuando sea posible. No cargues archivos, añadas listeners ni construyas
   geometría repetidamente desde el loop.
7. Al retirar objetos dinámicos de Three.js, elimina listeners asociados y libera
   geometrías, materiales y texturas que sean propiedad del objeto.
8. Los modos `estandar`, `medio` y `avanzado` son valores de contrato entre el
   panel, `nave.js` y `camara.js`. Si se añade o renombra uno, actualiza las tres
   capas y su persistencia.
9. Usa `KeyboardEvent.code` para controles configurables. Conserva soporte de
   teclado, mouse y táctil, y prueba los breakpoints móviles de 900 px y 600 px.
10. No cambies coordenadas, radios de interacción, física o sensibilidad por una
    refactorización cosmética: son parámetros de diseño jugable.
11. No edites ni recomprimas recursos binarios salvo que la tarea lo requiera.
    Evita incorporar ZIP, BLEND, SBSAR u otros archivos fuente al bundle si no se
    consumen en runtime.
12. Conserva UTF-8 en HTML, CSS, JS, JSON y Markdown. El contenido incluye tildes,
    símbolos y emojis; verifica que no aparezca texto mojibake como `Ã³` o `â€”`.

## Cómo ampliar el juego

- Para una función de nave o cámara, trabaja dentro de `codigo/nave/` y expón una
  API pequeña que `main.js` pueda componer.
- Para UI nueva, declara el HTML en `index.html`, centraliza referencias DOM en
  `elementos.js` y coloca eventos/estado en `funciones.js`.
- Para un universo nuevo, crea `codigo/universos/<nombre>/` y
  `recursos-estaticos/universos/<nombre>/`. Expón funciones equivalentes a
  `entrar`, `salir`, `estaActivo` y `actualizar`, y conecta la transición desde
  `main.js`. Consulta el procedimiento completo en `docs/ARQUITECTURA.md`.
- Las URL de recursos públicos deben ser absolutas desde la raíz pública, por
  ejemplo `/nave/Nave.glb` o `/universos/universo-rosado/estrellas.json`.

## Verificación por tipo de cambio

- Siempre: `npm test` y `npm run build`.
- Editor: crear, transformar, guardar/recargar, publicar, deshacer y revisar ambos
  universos. No presentar localStorage o una etiqueta de rol como autenticación.
- Teletransporte: usar `reposicionarNave()`; no cambiar solo el mesh de la nave.
- Nave/física/cámara: acelerar, frenar, rotar y cambiar entre los tres modos;
  comprobar que la cámara recupera su posición y que energía/velocidad responden.
- Interfaz: abrir/cerrar CV, panel de controles y audio; comprobar teclado y
  viewport móvil.
- Universo: entrar, permanecer varios segundos, salir con `R`, volver a entrar y
  revisar la consola por errores o recursos duplicados.
- Recursos: confirmar respuesta HTTP correcta y revisar la pestaña Network; la
  compilación no garantiza que una URL pública exista en ejecución.

## Estado conocido y límites

- La compilación actual termina correctamente, con una advertencia porque el
  chunk principal supera 500 kB.
- La fuente 3D se incluye localmente desde el paquete Three.js.
- Hay pruebas de vuelo y datos. No hay lint, CI ni tipado estático configurados.
- Three.js `0.128.x` y Vite `4.x` son versiones antiguas. No las actualices como
  efecto secundario: una actualización requiere revisar loaders, geometrías,
  color management, salida visual y controles.
- Hay una reorganización local en curso desde `src/` y `public/` hacia `codigo/`
  y `recursos-estaticos/`. No reviertas ni dupliques esa migración.

## Alcance y disciplina de cambios

El repositorio puede contener cambios sin confirmar del propietario. Inspecciona
`git status` antes de editar, conserva cambios ajenos y evita reformateos masivos.
Documenta parámetros de diseño nuevos cerca de su definición y actualiza la
arquitectura o la hoja de ruta cuando una decisión cambie la forma de extender el
proyecto.
