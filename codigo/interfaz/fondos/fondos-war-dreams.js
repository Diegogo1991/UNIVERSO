/**
 * Fondos de WAR DREAMS — versión independiente (sin React, sin dependencias).
 * Portado de codigo/canvas2Dversion2/fondosV2/ (pintarFondoV2 + FondoAnimadoCanvasV2)
 * y de la cuadrícula de puntos de SuperficieCanvasV2.
 *
 * Uso:
 *   import { montarFondo } from './fondos-war-dreams.js'
 *   const fondo = montarFondo(document.querySelector('#hero'), { tipo: 'galaxia', tema: 'cyber' })
 *   fondo.actualizar({ tipo: 'red', color: '#ff00aa' })
 *   fondo.destruir()
 */

export const FONDOS = {
  ninguno: 'Sin animación', estrellas: 'Estrellas titilantes', galaxia: 'Galaxia espiral',
  hiperespacio: 'Salto al hiperespacio', hexagonos: 'Panal de hexágonos', codigo: 'Lluvia de código',
  simbolos: 'Lluvia de símbolos', lluvia: 'Lluvia de luz', red: 'Constelación interactiva',
  esfera: 'Esfera orbital', ondas: 'Ondas de partículas', orbital: 'Nebulosa orbital',
}

/** Temas del lienzo: color de fondo + color de los puntos de la cuadrícula. */
export const TEMAS = {
  pizarra: { colorFondo: '#111318', colorPuntos: '#3a4658' },
  cyber: { colorFondo: '#06040c', colorPuntos: '#00e5ff' },
  violeta: { colorFondo: '#0c0818', colorPuntos: '#a78bfa' },
  papel: { colorFondo: '#f4f1e8', colorPuntos: '#c7b89a' },
  medianoche: { colorFondo: '#0a0f1e', colorPuntos: '#3f63b0' },
  bosque: { colorFondo: '#0d1a12', colorPuntos: '#40a86e' },
  magenta: { colorFondo: '#170812', colorPuntos: '#e05a9a' },
}

const INICIAL = {
  tipo: 'estrellas', color: '#00cfe8', velocidad: 1, densidad: 0.65, opacidad: 0.55,
  interactivo: true, pausado: false,
  tema: 'cyber', colorFondo: null, colorPuntos: null, cuadricula: true, paso: 28,
}

const clamp = (n, a, b, f) => (Number.isFinite(n) ? Math.max(a, Math.min(b, n)) : f)
function normalizar(v) {
  v = { ...INICIAL, ...v }
  return {
    ...v,
    tipo: v.tipo in FONDOS ? v.tipo : 'ninguno',
    color: /^#[\da-f]{6}$/i.test(v.color) ? v.color : '#00cfe8',
    velocidad: clamp(v.velocidad, 0.1, 3, 1),
    densidad: clamp(v.densidad, 0.15, 1, 0.65),
    opacidad: clamp(v.opacidad, 0.05, 1, 0.55),
  }
}

const tau = Math.PI * 2
const noise = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }

/** Dibuja un frame. Todo se deriva del tiempo: pausar no cambia posiciones. */
export function pintarFondo(ctx, config, f) {
  const { width: w, height: h, time: t, pointer, pan } = f
  const { tipo, color, densidad } = config
  const count = Math.round(80 + densidad * 280), cx = w / 2, cy = h / 2
  const mx = pointer ? (pointer.x - cx) * 0.05 : 0, my = pointer ? (pointer.y - cy) * 0.05 : 0
  ctx.clearRect(0, 0, w, h); ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 0.7
  const dot = (x, y, r, a) => { ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(x, y, r, 0, tau); ctx.fill() }

  if (tipo === 'hexagonos') {
    const r = Math.max(6, f.paso), dx = r * 1.5, dy = r * Math.sqrt(3)
    const startX = Math.floor(-pan.x / dx) - 1, endX = Math.ceil((w - pan.x) / dx) + 1
    const startY = Math.floor(-pan.y / dy) - 1, endY = Math.ceil((h - pan.y) / dy) + 1
    for (let col = startX; col < endX; col++) for (let row = startY; row < endY; row++) {
      const x = col * dx + pan.x, y = (row + (col % 2) / 2) * dy + pan.y
      const near = pointer ? Math.max(0, 1 - Math.hypot(x - pointer.x, y - pointer.y) / 140) : 0
      ctx.globalAlpha = 0.12 + (noise(col * 73 + row) > densidad ? 0 : 0.12 * (1 + Math.sin(col * 0.4 + row * 0.5 - t))) + near * 0.5
      ctx.beginPath()
      for (let k = 0; k < 6; k++) { const a = k * tau / 6, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py) }
      ctx.closePath(); ctx.stroke()
    }
  } else if (tipo === 'codigo' || tipo === 'simbolos' || tipo === 'lluvia') {
    const step = tipo === 'lluvia' ? 12 : 22, cols = Math.min(150, Math.ceil(w / step))
    const chars = tipo === 'simbolos' ? '△○×□◇⬡' : '01アイウカキクケコサシスセソ'
    ctx.font = '14px "Share Tech Mono",monospace'
    for (let i = 0; i < cols; i++) {
      if (noise(i + 50) > densidad + 0.15) continue
      const x = i * step + (pointer ? mx * noise(i) : 0), head = ((t * (25 + noise(i) * 65) + noise(i + 2) * h) % (h + 380)) - 120
      for (let j = 0; j < 14; j++) {
        const y = head - j * 19
        ctx.globalAlpha = (1 - j / 14) * (0.25 + noise(i + 9) * 0.65)
        if (tipo === 'lluvia') ctx.fillRect(x, y, 1.1, 17)
        else ctx.fillText(chars[Math.floor(noise(i * 29 + j + Math.floor(t * 3)) * chars.length)], x, y)
      }
    }
  } else if (tipo === 'red') {
    const n = Math.round(25 + densidad * 60)
    const point = (i) => ({ x: noise(i + 8) * w + Math.sin(t * 0.25 + i) * 24, y: noise(i + 70) * h + Math.cos(t * 0.3 + i) * 24 })
    for (let i = 0; i < n; i++) {
      const a = point(i); dot(a.x, a.y, 1.5, 0.7)
      for (let j = i + 1; j < n; j++) { const b = point(j), d = Math.hypot(a.x - b.x, a.y - b.y); if (d < 140) { ctx.globalAlpha = (1 - d / 140) * 0.45; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke() } }
      if (pointer && Math.hypot(a.x - pointer.x, a.y - pointer.y) < 180) { ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(pointer.x, pointer.y); ctx.stroke() }
    }
  } else if (tipo === 'esfera' || tipo === 'ondas' || tipo === 'orbital') {
    const n = Math.round(350 + densidad * 650), radius = Math.min(w, h) * 0.32
    for (let i = 0; i < n; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / n), theta = i * 2.399963 + t * 0.18
      const wave = tipo === 'ondas' ? 1 + 0.18 * Math.sin(phi * 7 + t) * Math.cos(theta * 4 - t) : 1
      const r = radius * wave
      let x = Math.sin(phi) * Math.cos(theta) * r, z = Math.sin(phi) * Math.sin(theta) * r, y = Math.cos(phi) * r
      if (tipo === 'orbital') { x *= Math.sin(phi * 3 + t * 0.3); y *= Math.cos(theta * 0.6 + t * 0.2); z *= 1.4 }
      const ry = (pointer ? (pointer.x - cx) / w : 0) * 0.7, rx = (pointer ? (pointer.y - cy) / h : 0) * 0.7
      const xx = x * Math.cos(ry) + z * Math.sin(ry); z = z * Math.cos(ry) - x * Math.sin(ry); x = xx
      const yy = y * Math.cos(rx) - z * Math.sin(rx); z = y * Math.sin(rx) + z * Math.cos(rx); y = yy
      const cam = Math.max(600, radius * 3), depth = cam / (cam - z)
      dot(cx + x * depth, cy + y * depth, Math.max(0.5, depth * 1.3), 0.15 + 0.7 * (z / r + 1) / 2)
    }
  } else if (tipo !== 'ninguno') {
    if (tipo === 'galaxia') {
      const glow = ctx.createRadialGradient(cx + mx, cy + my, 0, cx + mx, cy + my, Math.min(w, h) * 0.5)
      glow.addColorStop(0, color + '44'); glow.addColorStop(1, color + '00')
      ctx.fillStyle = glow; ctx.globalAlpha = 1; ctx.fillRect(0, 0, w, h); ctx.fillStyle = color
    }
    for (let i = 0; i < count; i++) {
      let x = noise(i) * w, y = noise(i + 1000) * h, r = 0.5 + noise(i + 55) * 1.2, a = 0.25 + 0.65 * (0.5 + 0.5 * Math.sin(t * (0.4 + noise(i)) + i))
      if (tipo === 'galaxia') {
        const d = Math.sqrt(noise(i)) * Math.min(w, h) * 0.65, angle = i % 3 * tau / 3 + d * 0.018 + t * 0.065 + noise(i + 7) * 0.65
        x = cx + Math.cos(angle) * d + mx; y = cy + Math.sin(angle) * d * 0.48 + my; r *= 1.1
      } else if (tipo === 'hiperespacio') {
        const angle = noise(i) * tau, phase = (noise(i + 6) + t * 0.09) % 1, d = phase * phase * Math.max(w, h) * 0.8
        x = cx + mx + Math.cos(angle) * d; y = cy + my + Math.sin(angle) * d; r = phase * 2; a = phase
        ctx.globalAlpha = phase * 0.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(angle) * phase * 30, y + Math.sin(angle) * phase * 30); ctx.stroke()
      } else { x = (x + mx * noise(i + 2) + w) % w; y = (y + my * noise(i + 3) + h) % h }
      dot(x, y, Math.max(0.3, r), a)
      if (i % 17 === 0) { ctx.globalAlpha = a * 0.4; ctx.fillRect(x - 4, y - 0.35, 8, 0.7); ctx.fillRect(x - 0.35, y - 4, 0.7, 8) }
    }
  }
  ctx.globalAlpha = 1
}

/** Monta el fondo dentro de `elemento` (que debe poder contener un hijo absoluto). */
export function montarFondo(elemento, opciones = {}) {
  let c = normalizar(opciones)
  if (getComputedStyle(elemento).position === 'static') elemento.style.position = 'relative'

  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '0' })
  elemento.prepend(canvas)
  const ctx = canvas.getContext('2d')

  // Capa estática: color del tema + cuadrícula de puntos (CSS puro).
  const aplicarEstatico = () => {
    const tema = TEMAS[c.tema] || TEMAS.cyber
    const fondo = c.colorFondo || tema.colorFondo, puntos = c.colorPuntos || tema.colorPuntos
    elemento.style.backgroundColor = fondo
    const conPuntos = c.cuadricula && c.tipo !== 'hexagonos'
    elemento.style.backgroundImage = conPuntos ? `radial-gradient(circle, ${puntos} 1.2px, transparent 1.2px)` : 'none'
    elemento.style.backgroundSize = conPuntos ? `${c.paso}px ${c.paso}px` : ''
    canvas.style.opacity = String(c.opacidad)
  }
  aplicarEstatico()

  let width = 1, height = 1, raf = 0, last = 0, time = 0, visible = true, dirty = true, pointer = null
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const resize = () => {
    const rect = elemento.getBoundingClientRect(); width = rect.width; height = rect.height
    const dpr = Math.min(devicePixelRatio, 1.5)
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); dirty = true
  }
  const ro = new ResizeObserver(resize); ro.observe(elemento); resize()
  // Se escucha en window para que el puntero funcione aunque haya contenido encima.
  const move = (e) => {
    const b = elemento.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top
    pointer = x >= 0 && y >= 0 && x <= b.width && y <= b.height ? { x, y } : null; dirty = true
  }
  const tick = (now) => {
    raf = 0
    if (document.hidden || !visible) return
    const paused = c.pausado || reduced.matches
    if (now - last >= 1000 / 30 && (!paused || dirty)) {
      if (!paused) time += Math.min((now - last) / 1000, 0.1) * c.velocidad
      last = now; dirty = false
      pintarFondo(ctx, c, { width, height, time, pointer: c.interactivo ? pointer : null, paso: c.paso, pan: { x: 0, y: 0 } })
    }
    raf = requestAnimationFrame(tick)
  }
  const resume = () => { if (!document.hidden && visible && !raf) { last = performance.now(); raf = requestAnimationFrame(tick) } }
  const visibility = () => { cancelAnimationFrame(raf); raf = 0; resume() }
  const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; visibility() }); io.observe(elemento)
  window.addEventListener('pointermove', move, { passive: true })
  document.addEventListener('visibilitychange', visibility)
  resume()

  return {
    actualizar(nuevas) { c = normalizar({ ...c, ...nuevas }); aplicarEstatico(); dirty = true; resume() },
    destruir() {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect()
      window.removeEventListener('pointermove', move); document.removeEventListener('visibilitychange', visibility)
      canvas.remove()
    },
  }
}
