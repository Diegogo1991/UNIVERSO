export const UNIVERSOS = ['universo-inicial', 'universo-rosado'];
export const TIPOS = ['plano', 'modelo', 'galaxia', 'espiral', 'portal'];
export const ACCIONES = ['ninguna', 'informacion', 'portal'];
export const MAX_OBJETOS = 80;
export const MAX_JSON = 2_000_000;

export function recursoValido(url, tipo) {
  if (!url) return true;
  if (typeof url !== 'string' || url.length > 1_000_000) return false;
  if (/^\/(?!\/)[^\\\s]*$/.test(url)) return true;
  if (tipo === 'plano' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(url)) return true;
  return false;
}
function vector(v, min, max) {
  return Array.isArray(v) && v.length === 3 && v.every(n => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max);
}
export function validarMundo(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.objetos) || data.objetos.length > MAX_OBJETOS) throw new Error('Mundo incompatible: se requiere versión 1 y hasta 80 objetos.');
  const ids = new Set();
  const objetos = data.objetos.map(o => {
    if (!o || typeof o.id !== 'string' || !/^[\w-]{1,80}$/.test(o.id) || ids.has(o.id)) throw new Error('Identificador de objeto inválido o repetido.');
    ids.add(o.id);
    if (!TIPOS.includes(o.tipo) || !UNIVERSOS.includes(o.universo)) throw new Error('Tipo de objeto o universo desconocido.');
    if (typeof o.nombre !== 'string' || o.nombre.length > 80 || !o.nombre.trim()) throw new Error('Cada objeto necesita un nombre de hasta 80 caracteres.');
    if (!vector(o.posicion, -10000, 10000) || !vector(o.rotacion, -360, 360) || !vector(o.escala, 0.1, 100)) throw new Error('Transformación inválida: revisa posición, rotación o escala.');
    if (!/^#[a-fA-F0-9]{6}$/.test(o.color)) throw new Error('Color inválido.');
    if (!recursoValido(o.recurso, o.tipo)) throw new Error('Usa una ruta pública local (/...) o una imagen PNG, JPEG o WebP importada.');
    if (!o.accion || !ACCIONES.includes(o.accion.tipo) || typeof o.accion.texto !== 'string' || o.accion.texto.length > 2000 || !UNIVERSOS.includes(o.accion.destino)) throw new Error('Acción inválida.');
    return { id: o.id, tipo: o.tipo, universo: o.universo, nombre: o.nombre.trim(),
      posicion: [...o.posicion], rotacion: [...o.rotacion], escala: [...o.escala], color: o.color,
      recurso: o.recurso || '', accion: { tipo: o.accion.tipo, texto: o.accion.texto, destino: o.accion.destino } };
  });
  return { version: 1, objetos };
}
export function serializarMundo(data) {
  const texto = JSON.stringify(validarMundo(data), null, 2);
  if (texto.length > MAX_JSON) throw new Error('El mundo supera 2 MB. Usa rutas de recursos en lugar de imágenes incrustadas.');
  return texto;
}
export function leerMundo(texto) {
  if (texto.length > MAX_JSON) throw new Error('El archivo supera 2 MB.');
  return validarMundo(JSON.parse(texto));
}
export function nuevoObjeto(tipo, universo, posicion, id = crypto.randomUUID()) {
  return { id, tipo, universo, nombre: { plano: 'Nuevo dibujo', modelo: 'Nuevo modelo', galaxia: 'Nueva galaxia', espiral: 'Nueva espiral', portal: 'Nuevo portal' }[tipo],
    posicion, rotacion: [0, 0, 0], escala: [1, 1, 1], color: '#79d8ff',
    recurso: tipo === 'modelo' ? '/nave/Nave.glb' : '',
    accion: { tipo: tipo === 'portal' ? 'portal' : 'informacion', texto: 'Una idea por descubrir.', destino: universo === UNIVERSOS[0] ? UNIVERSOS[1] : UNIVERSOS[0] } };
}
