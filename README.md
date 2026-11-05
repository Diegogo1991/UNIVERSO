# Universo DG

Un espacio creativo en 3D para explorar ideas a bordo de una nave. Puede alojar
dibujos, modelos, galaxias, portales y experiencias; el portafolio es uno de sus
contenidos. JavaScript ES modules, Three.js y Vite.

## Ejecutar

```bash
npm install
npm run dev
npm test
npm run build
npm run preview
```

En PowerShell usa `npm.cmd` si se bloquea `npm.ps1`. Desarrollo:
http://localhost:3000. Vite conserva `recursos-estaticos/` como raíz pública.

## Crear tu mundo

1. Abre **Taller local** (disponible con `npm run dev`).
2. Elige universo y añade un dibujo, modelo GLB, galaxia, espiral o portal.
3. Selecciónalo en la lista o en la escena. **Enfocar** acerca la cámara.
4. Mueve, rota o escala con los ejes de colores o los campos numéricos.
5. Configura nombre, color, recurso y acción; pulsa **Aplicar al objeto**.
6. **Guardar borrador** conserva el trabajo. **Publicar localmente** actualiza
   la versión que se explora en este navegador.
7. Cerrar el taller guarda el borrador y vuelve a la versión publicada.

Puedes duplicar, eliminar y deshacer el último cambio (hasta 12 operaciones por
sesión del taller). Importa/exporta JSON para respaldar o trasladar el mundo.
El selector de imagen acepta PNG, JPEG y WebP de hasta 650 KB.

Para modelos GLB y recursos grandes, coloca el archivo en
`recursos-estaticos/` y escribe su ruta pública, por ejemplo
`/modelos/mando.glb`. Los recursos externos de un GLTF deben mantener sus rutas
relativas; se recomienda GLB autocontenido. No se ejecutan scripts importados.

**Alcance local:** no hay cuentas ni autenticación. El taller se excluye del
JavaScript de producción. Publicar localmente no sube archivos a Internet ni
comparte datos con otras personas. La información se guarda por origen del
navegador; cambiar de puerto/navegador o borrar sus datos no conserva esa copia.
Exporta JSON antes de borrar datos. Para distribuir un mundo de partida,
integra el JSON exportado en `codigo/contenido/mundo-inicial.json` y copia sus
recursos públicos antes de compilar.

## Vuelo

- **Exploración (Estándar):** W/↑ impulsa, S/↓ o Espacio frena,
  A/D o ←/→ gira, Q/Z sube/baja el morro.
- **Arcade (Medio):** el cursor dirige con zona muerta central; W/S controla
  impulso/freno. Arrastrar permite mirar sin dirigir con el cursor.
- **Avanzado:** W/S inclina, A/D gira, Q/Z alabea; Shift acelera y Ctrl frena
  (reasignables). Espacio también frena.
- **Turbo:** Shift mientras aceleras, en Exploración/Arcade. Consume energía;
  el impulso normal permite recuperarla.
- **Cámara:** arrastrar para orbitar; rueda para ajustar distancia.
- **Interacción:** clic sobre objetos o E al acercarte. E no controla el vuelo.
- **R:** regresar al universo inicial. **Volver al inicio** recupera la posición.
- **Móvil:** joystick para avance/giro; arrastre derecho para mirar (en Arcade
  también dirige el cabeceo); botón INTERACTUAR para objetos y regreso.
  Avanzado queda deshabilitado bajo 900 px.

Al abrir el taller, un panel o una obra, el vuelo se detiene. Al perder el foco
se liberan las teclas. La cámara sigue la nave sin acumular retraso de posición.
La mira mantiene un centro fijo y un marcador móvil de la dirección de la nave.

## Documentación

- [Arquitectura](docs/ARQUITECTURA.md): responsabilidades y contratos.
- [Guía para agentes](AGENTS.md): reglas de desarrollo.
- [Hoja de ruta](docs/HOJA_DE_RUTA.md): cuentas, publicación y multijugador.
- [Validación](docs/VALIDACION.md): pruebas y límites.

La migración local de `src/public` a `codigo/recursos-estaticos` continúa siendo
trabajo vigente. No reviertas los cambios preexistentes.
