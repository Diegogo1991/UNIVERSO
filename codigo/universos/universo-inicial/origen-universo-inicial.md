# Origen del universo y sistema de coordenadas

No existe ningún objeto que "sea" el centro del universo. Es un único sistema de
coordenadas de Three.js (la `scene` de [`codigo/nave/escena.js`](../../nave/escena.js)),
y el origen `(0, 0, 0)` es "el centro" solo porque varias cosas coinciden ahí por
construcción — nadie las fuerza activamente a estarlo.

## Por qué el origen es `(0, 0, 0)`

- **La nave** (`shipGroup`, [`codigo/nave/nave.js:13`](../../nave/nave.js)) se crea con
  `new THREE.Group()` y nunca recibe una posición inicial explícita, así que arranca en
  `(0, 0, 0)`.
- **El campo de estrellas de fondo** ([`fondo-estelar.js`](./fondo-estelar.js)) genera dos
  capas de puntos distribuidos en una esfera (coordenadas esféricas `theta`/`phi`, radios
  1200 y 500) y las agrega a `mainUniverseGroup` ([`universo-inicial.js:8`](./universo-inicial.js)),
  que tampoco tiene posición propia — también vive en `(0, 0, 0)`. Como los planetas están
  a solo ~150-200 unidades y esa esfera tiene radio ~1200, da la ilusión de un fondo
  infinito, pero en realidad es una esfera fija centrada en el origen.
- **La cámara no define el centro.** Su posición inicial `(0, 4, 14)`
  ([`escena.js:7`](../../nave/escena.js)) es solo un valor de arranque antes de que el
  loop de render la reposicione; cada frame se recalcula persiguiendo a `shipGroup.position`
  (lógica en [`codigo/nave/camara.js`](../../nave/camara.js)).

## Todo lo demás son offsets fijos respecto a ese origen

- Planeta principal: `PLANET_POS = (-120, 20, -180)`
  ([`planeta.js:3`](./planeta.js)).
- Planeta "Sistema" (universo rosado): `SYSTEM_PLANET_POS = (90, 12, -100)`
  ([`comportamiento.js:9`](../universo-rosado/comportamiento.js)).
- La distancia para interactuar con cada planeta se calcula directamente como
  `shipGroup.position.distanceTo(PLANET_POS)` (o `SYSTEM_PLANET_POS`), ver
  [`codigo/nave/main.js`](../../nave/main.js).

## El universo rosado usa su propio "origen local"

Al entrar al universo Sistema, la nave se reposiciona a
`SYSTEM_PLANET_POS + (0, 0, 40)` ([`comportamiento.js:267`](../universo-rosado/comportamiento.js)),
y las estrellas de ese universo (cargadas desde `estrellas.json`) se colocan sumando
`SYSTEM_PLANET_POS` a cada posición guardada
([`comportamiento.js:142`](../universo-rosado/comportamiento.js)) — es decir, ese
universo usa `SYSTEM_PLANET_POS` como si fuera su propio origen, dentro del mismo
espacio de coordenadas global. Al volver (tecla `R`), la nave regresa a `(0, 4, 14)`
([`comportamiento.js:291`](../universo-rosado/comportamiento.js)), cerca de donde
arrancó originalmente.
