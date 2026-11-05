import { leerMundo, serializarMundo } from './datos.js';
export const CLAVES = { borrador: 'universo-mundo-borrador-v1', publicado: 'universo-mundo-publicado-v1' };
// Adaptador local. Un futuro servicio autenticado debe validar permisos en servidor.
export function cargarMundoLocal(tipo, fallback, storage = localStorage) {
  const texto = storage.getItem(CLAVES[tipo]);
  return texto === null ? leerMundo(serializarMundo(fallback)) : leerMundo(texto);
}
export function guardarMundoLocal(tipo, mundo, storage = localStorage) {
  const texto = serializarMundo(mundo);
  try { storage.setItem(CLAVES[tipo], texto); }
  catch { throw new Error('No se pudo guardar: almacenamiento lleno o bloqueado. Exporta tu mundo como copia.'); }
}
