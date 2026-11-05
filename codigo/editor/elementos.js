const id = nombre => document.getElementById(nombre);
export const ui = {
  abrir: id('abrir-editor'), cerrar: id('cerrar-editor'), panel: id('editor'), universo: id('editor-universo'),
  tipo: id('editor-tipo'), agregar: id('editor-agregar'), lista: id('editor-lista'), enfocar: id('editor-enfocar'),
  duplicar: id('editor-duplicar'), eliminar: id('editor-eliminar'), form: id('editor-propiedades'), campos: id('editor-campos'),
  nombre: id('objeto-nombre'), color: id('objeto-color'), herramienta: id('editor-herramienta'),
  transformaciones: id('editor-transformaciones'), recurso: id('objeto-recurso'), imagen: id('objeto-imagen'),
  accion: id('objeto-accion'), texto: id('objeto-texto'), destino: id('objeto-destino'),
  guardar: id('editor-guardar'), publicar: id('editor-publicar'), exportar: id('editor-exportar'),
  importar: id('editor-importar'), deshacer: id('editor-deshacer'), estado: id('editor-estado'),
  imagenLabel: id('imagen-importar-label')
};
