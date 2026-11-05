# Arquitectura de Universo DG

## Capas

- `codigo/nave/main.js`: arranque, loop 3D, interacciones y transiciones.
- `codigo/nave/simulacion.js`: estado y simulación de vuelo sin DOM ni escena.
- `codigo/nave/nave.js`: entrada local, modelo y adaptación del estado a Three.js.
- `codigo/nave/camara.js`: seguimiento y órbita, independientes de la simulación.
- `codigo/contenido/datos.js`: contrato versionado, tipos y validación.
- `codigo/contenido/objetos.js`: fábricas gráficas, carga y liberación de recursos.
- `codigo/contenido/almacenamiento.js`: adaptador de persistencia local.
- `codigo/editor/`: taller, selección, transformaciones y formularios.
- `codigo/universos/`: ambientación y comportamientos particulares.
- `codigo/interfaz/` y `codigo/nave/mira/`: interfaz de exploración.

Se conserva una escena global. El renderer y la cámara pertenecen a
`escena.js`. El taller utiliza la misma cámara con OrbitControls mientras
el seguimiento de vuelo está suspendido; no crea otro loop de render.
Los nodos DOM siguen definidos en `index.html`.

## Flujo

```text
Entrada local -> simulación (120 pasos/segundo) -> estado de la nave
                                               -> modelo y cámara -> HUD
Datos del mundo -> fábricas de objetos -> objetos Three.js
                      ^
Taller -> borrador -> publicación local -> modo exploración
```

La simulación usa unidades por segundo, orientación por quaternion y
acumulación de tiempo. Limita a 100 ms la recuperación de cada frame para
evitar saltos tras una pestaña suspendida. Aún no hay colisiones.

El estado contiene posición, orientación, velocidad, velocidad angular y energía.
No contiene meshes ni cámara. Es una separación útil para multijugador, pero
todavía no hay protocolo de red, interpolación remota, predicción ni servidor.
Las ambientaciones heredadas (asteroides, nave secundaria y letras) conservan
algunas animaciones por frame; la independencia temporal comprobada corresponde
a la nave del jugador.

## Datos de contenido

`mundo-inicial.json` es el catálogo de partida. Su formato:

```json
{
  "version": 1,
  "objetos": [{
    "id": "dibujo-1",
    "tipo": "plano",
    "universo": "universo-inicial",
    "nombre": "Mi dibujo",
    "posicion": [0, 5, -45],
    "rotacion": [0, 0, 0],
    "escala": [1, 1, 1],
    "color": "#79d8ff",
    "recurso": "/dibujos/idea.png",
    "accion": {
      "tipo": "informacion",
      "texto": "Historia de esta idea.",
      "destino": "universo-rosado"
    }
  }]
}
```

Tipos: `plano`, `modelo`, `galaxia`, `espiral`, `portal`.
Acciones independientes: `ninguna`, `informacion`, `portal`.
Las rotaciones se almacenan en grados y las posiciones son globales.
Cada objeto pertenece a uno de los universos registrados.

Límites iniciales: 80 objetos, 2 millones de caracteres de JSON, posiciones
±10000, escala 0.1–100. Se rechazan tipos desconocidos, identificadores
repetidos, transformaciones no finitas y recursos que no sean rutas públicas
locales o imágenes raster incrustadas. El texto se muestra con `textContent`.
Los límites no son garantía de rendimiento; la complejidad de los GLB importa.

Las fábricas registran y liberan geometrías, materiales y texturas. Sus
callbacks de carga comprueban vigencia antes de añadir recursos, evitando
objetos huérfanos cuando se reconstruye o abandona el contenido.

## Taller y persistencia

El taller se importa dinámicamente solo con `import.meta.env.DEV`.
El visitante carga primero la versión local publicada y, si no existe,
el catálogo de partida. Al editar se carga el borrador por separado.

Claves:
- `universo-mundo-borrador-v1`
- `universo-mundo-publicado-v1`
- `universo-config-controles` (preferencias anteriores, conservadas)

Cerrar guarda el borrador; un fallo de cuota deja el taller abierto para poder
exportar. Publicar escribe una copia independiente. Importar sustituye el
borrador en memoria, tras validación, y permite deshacer. No se guardan cambios
del formulario hasta pulsar Aplicar.

No hay login, roles autenticados ni publicación remota. El rótulo
«creador local» describe una herramienta de desarrollo, no un permiso seguro.
El siguiente adaptador deberá comprobar sesión y permisos en servidor, y
gestionar conflictos/versiones cuando haya más de un editor.

## Interacciones y transiciones

Clic/tap hace raycast sobre los objetos visibles. Un arrastre de cámara no
activa una obra. E y el botón móvil comparten la interacción por proximidad.
Los elementos personalizados usan 28 unidades hasta su origen; los planetas
heredados conservan 55. Los objetos decorativos no capturan la interacción E.

`main.js` coordina el cambio de universo y su contenido. El universo rosado
invalida las cargas pendientes al salir y usa una fuente incluida en el paquete
Three.js. Los teletransportes llaman a `reposicionarNave`, que sincroniza modelo,
estado, velocidad y cámara. No se debe modificar solo `shipGroup.position`.

`setEntradaSuspendida(valor, motivo)` usa motivos independientes (`editor`,
`cv`, `detalle`, `audio`, `panel`). Cerrar una ventana no reanuda el juego
si otra sigue abierta. La simulación se detiene durante la edición.

## Ampliación

Para otro tipo de objeto: añadir su nombre al contrato, su fábrica a
`objetos.js` y sus opciones al taller. Para otra acción: añadirla al contrato
y despacharla desde el orquestador, sin acoplarla a una geometría concreta.

Para otro universo: registrar su identificador y sus funciones de transición,
crear su ambientación y conectar el orquestador y los selectores. Aún no
existe creación de universos arbitrarios desde el taller.

Los recursos públicos siguen en `recursos-estaticos/`; una URL
`/modelos/mando.glb` corresponde a
`recursos-estaticos/modelos/mando.glb`.
