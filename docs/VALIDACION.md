# Validación del taller y del vuelo

Revisión: 16 de septiembre de 2026.

## Automatizada

`npm test`: 13 pruebas aprobadas con el runner integrado de Node.

- Trayectoria, orientación y energía equivalentes a 30, 60 y 144 FPS.
- Freno que reduce velocidad sin invertir el movimiento.
- Consumo/recuperación de energía y límites de velocidad/orientación.
- Recuperación acotada después de una pausa larga.
- Serialización y separación entre borrador y publicación local.
- Rechazo de datos inválidos, rutas no permitidas e identificadores repetidos.
- Reporte de cuota de almacenamiento y conservación ante escrituras inválidas.
- Edición de posición/nombre/acción sin reconstruir recursos gráficos.
- Filtrado por universo y liberación de geometrías al retirar objetos.

`npm run build`: compila correctamente. Sigue existiendo la advertencia por
chunk JavaScript mayor de 500 kB. La comprobación del JavaScript generado confirma
que el código del taller y TransformControls no se incluyen en producción.

## Comprobada en Chrome

- Arranque, pantalla de carga y aparición de la nave.
- Abrir taller; crear espiral y galaxia; cambiar nombre y posición.
- Seleccionar y enfocar dibujos, galaxias y modelos GLB.
- Guardar un borrador, recargar y encontrar el objeto guardado.
- Publicar localmente y cerrar el taller.
- Entrar/salir varias veces de los dos universos desde el taller.
- Mover una galaxia con el manipulador (X pasó de 90 a 93.06) y deshacer (X=90).
- Disposición del taller en 390 px y comprobaciones en 600/900 px.
- Joystick con entrada de puntero, respuesta del indicador de velocidad y
  detención al abrir configuración.
- Cambio entre los tres modos; reserva de E durante reasignación; Escape cancela
  la captura de tecla. Se conserva el modo Arcade que tenía el navegador.
- Botón móvil de interacción para regresar desde el universo rosado.

Las pruebas móviles fueron sobre viewports de escritorio; falta la comprobación
en dispositivos táctiles físicos. Los objetos temporales que se guardaron para
probar persistencia se retiraron de ese borrador, sin modificar objetos previos.

## Límites de esta revisión

- La extensión no permitió asignar archivos al selector: faltaba acceso a URL de
  archivos. La importación/exportación JSON se valida por pruebas del contrato;
  queda pendiente completar su recorrido de selección/descarga en navegador,
  así como importar una imagen desde el selector.
- La conexión al navegador se interrumpió al final. El ajuste final de reflejos
  con RoomEnvironment y salida sRGB compila, pero queda pendiente su revisión
  visual. La actualización incremental de objetos sí tiene pruebas automáticas.
- No se midió FPS sostenido ni consumo de memoria en hardware móvil.
- No hay backend, autenticación, permisos remotos, colisiones ni multijugador.

## Comprobación manual breve para continuar

1. Ejecutar `npm run dev`, abrir el juego y comprobar que la nave es legible.
2. Probar cada modo: avanzar, frenar, girar, mirar alrededor y soltar la cámara.
3. Abrir el taller; añadir una imagen, cargar un GLB y configurar un portal.
4. Mover/rotar/escalar, duplicar, eliminar y deshacer.
5. Guardar, recargar, publicar y explorar la obra desde fuera del taller.
6. Exportar JSON, importarlo y confirmar que conserva recursos y acciones.
7. Entrar/salir de ambos universos, abrir/cerrar una obra, el CV y el audio.
8. Repetir joystick/arrastre y desplazamiento del taller en un móvil real.
