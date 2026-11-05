# Hoja de ruta

## Base implementada

- Simulación del jugador separada del modelo y consistente entre frecuencias.
- Freno, turbo, cámara orbital y mira con marcador de dirección.
- Objetos descritos como datos con apariencia y acciones independientes.
- Taller local: crear, seleccionar, transformar, duplicar, eliminar y deshacer.
- Borradores, publicación local e importación/exportación JSON.
- Pruebas de vuelo, validación de contenido y separación borrador/publicación.

## Próximo paso: cuentas y publicación compartida

1. Elegir servicio de identidad y backend según el despliegue real.
2. Permitir explorar como invitado; autenticar a los creadores.
3. Asignar el primer creador desde el servidor, sin autorregistro de privilegios.
4. Reemplazar el adaptador local por API con permisos validados en cada escritura.
5. Guardar borradores, versiones publicadas y recursos en almacenamiento remoto.
6. Resolver conflictos de edición y proporcionar respaldo/recuperación.
7. Habilitar el editor alojado solo después de implementar esas comprobaciones.

No se han añadido formularios de contraseña, usuarios ficticios ni roles en
localStorage. La herramienta actual es exclusivamente local y no protege
contenido compartido.

## Después: multijugador de exploración

- Primer ensayo: dos clientes en una sala, con estado validado por servidor.
- Identificadores estables para jugadores, objetos, universos e instancias.
- Interpolación de naves remotas; medir latencia antes de decidir predicción.
- Portales como transición entre salas y carga de la versión publicada.
- Probar desconexión, reconexión, límites de usuarios y presupuesto del servidor.

La elección concreta de biblioteca de red queda pendiente. No es necesario
implantar un MMO para probar encuentros entre unas pocas personas.

## Contenido, aprendizaje y tienda

- Añadir comportamientos a partir de experiencias concretas: video, audio,
  minijuego, recorrido guiado, actividad y ficha de producto.
- Incorporar editor de universos y biblioteca de recursos reutilizables.
- Mantener progreso, catálogo, inventario y pagos en servicios separados.
- Añadir colisiones, accesibilidad, tutorial y configuración de confort.
- Medir en móvil real, optimizar recursos y actualizar dependencias en una tarea
  dedicada. El bundle aún supera el umbral de advertencia de Vite.
