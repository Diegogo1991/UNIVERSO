// Audio ambiente con Web Audio: el bucle es continuo (sin hueco entre vueltas)
// y el volumen se puede animar también en iOS, donde <audio>.volume no cambia.
const FADE_ENTRADA_S = 3;
const FADE_SALIDA_S = 0.4;    // corto, solo para evitar el chasquido al cortar
const VOLUMEN = 0.8;
const PASOS_CURVA = 64;

export function crearAudioAmbiente(url) {
  // Los bytes se descargan desde ya; el AudioContext se crea con el primer toque
  // porque los navegadores no lo dejan sonar antes de un gesto del usuario.
  const descarga = fetch(url).then(respuesta => {
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status} al cargar ${url}`);
    return respuesta.arrayBuffer();
  });
  let contexto = null, ganancia = null, decodificado = null, fuente = null;

  function preparar() {
    const Contexto = window.AudioContext || window.webkitAudioContext;
    contexto = new Contexto();
    ganancia = contexto.createGain();
    ganancia.gain.value = 0;
    ganancia.connect(contexto.destination);
    // Forma con callbacks: Safari antiguo no devuelve promesa.
    decodificado = descarga.then(datos => new Promise((ok, falla) => contexto.decodeAudioData(datos, ok, falla)));
  }

  // Curva suave: arranca despacio al subir y termina despacio al bajar.
  function rampa(destino, duracion) {
    const gain = ganancia.gain, ahora = contexto.currentTime, desde = gain.value;
    const sube = destino > desde, curva = new Float32Array(PASOS_CURVA);
    for (let i = 0; i < PASOS_CURVA; i++) {
      const t = i / (PASOS_CURVA - 1);
      curva[i] = desde + (destino - desde) * (sube ? t * t : 1 - (1 - t) * (1 - t));
    }
    gain.cancelScheduledValues(ahora);
    gain.setValueCurveAtTime(curva, ahora, duracion);
  }

  return {
    // Debe llamarse directamente desde el evento de clic/toque.
    async activar() {
      if (!contexto) preparar();
      const reanudar = contexto.resume();
      const buffer = await decodificado;
      await reanudar;
      if (!fuente) {
        fuente = contexto.createBufferSource();
        fuente.buffer = buffer; fuente.loop = true;
        fuente.connect(ganancia); fuente.start();
      }
      rampa(VOLUMEN, FADE_ENTRADA_S);
    },
    desactivar() {
      if (contexto) rampa(0, FADE_SALIDA_S);
    },
  };
}
