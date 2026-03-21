// Three.js ya está disponible como global (THREE) desde el script CDN

// ─── SCENE ───────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x00000f, 0.0015);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 3000);
camera.position.set(0, 4, 14);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ─── LIGHTS ──────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x0a1535, 3));
const sun = new THREE.DirectionalLight(0x6699ff, 5);
sun.position.set(80, 60, -40);
sun.castShadow = true;
scene.add(sun);
const rim = new THREE.DirectionalLight(0x2244aa, 2.5);
rim.position.set(-60, 20, 60);
scene.add(rim);
scene.add(new THREE.HemisphereLight(0x112244, 0x000511, 1.5));

// ─── STARS ───────────────────────────────────────────────────────────────────
function makeStarField(count, spread) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = spread * (0.5 + Math.random() * 0.5);
    pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i*3+2] = r * Math.cos(phi);
    const t = Math.random();
    col[i*3] = 0.7 + t*0.3; col[i*3+1] = 0.8 + t*0.15; col[i*3+2] = 1.0;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.5, vertexColors: true }));
}
scene.add(makeStarField(3000, 1200));
scene.add(makeStarField(800, 500));

// ─── NEBULAE ─────────────────────────────────────────────────────────────────
[[0x1a0a4a,[-300,80,-400],600,0.15],[0x0a1a4a,[400,-60,-500],700,0.12],[0x2a0a2a,[100,-200,-300],500,0.1]]
.forEach(([color, pos, size, op]) => {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  m.position.set(...pos);
  m.rotation.set(Math.random(), Math.random(), Math.random());
  scene.add(m);
});

// ─── PLANET ──────────────────────────────────────────────────────────────────
const PLANET_POS = new THREE.Vector3(-120, 20, -180);

const planet = new THREE.Mesh(
  new THREE.SphereGeometry(28, 64, 64),
  new THREE.MeshStandardMaterial({ color: 0x1a4fc8, roughness: 0.6, metalness: 0.1, emissive: 0x0a1a5a, emissiveIntensity: 0.4 })
);
planet.position.copy(PLANET_POS);
scene.add(planet);

[30, 34, 38].forEach((r, i) => {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0x3388ff, transparent: true, opacity: 0.06 - i*0.015, side: THREE.BackSide, depthWrite: false })
  );
  m.position.copy(PLANET_POS);
  scene.add(m);
});

[[36, 52, 0.18], [54, 66, 0.08]].forEach(([inner, outer, op]) => {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(inner, outer, 80),
    new THREE.MeshBasicMaterial({ color: 0x4488ee, transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false })
  );
  ring.position.copy(PLANET_POS);
  ring.rotation.x = Math.PI / 2.4;
  scene.add(ring);
});

const planetLight = new THREE.PointLight(0x3366ff, 3, 140);
planetLight.position.copy(PLANET_POS);
scene.add(planetLight);

// ─── ASTEROIDS ───────────────────────────────────────────────────────────────
const asteroids = [];
for (let i = 0; i < 35; i++) {
  const mesh = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.3 + Math.random() * 1.5, 0),
    new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.9, metalness: 0.1 })
  );
  const angle = Math.random() * Math.PI * 2;
  const dist = 60 + Math.random() * 100;
  mesh.position.set(PLANET_POS.x + Math.cos(angle)*dist, PLANET_POS.y + (Math.random()-0.5)*30, PLANET_POS.z + Math.sin(angle)*dist);
  mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
  scene.add(mesh);
  asteroids.push({ mesh, speed: (Math.random()-0.5)*0.005, ry: Math.random()*0.01 });
}

// ─── SHIP ────────────────────────────────────────────────────────────────────
const shipGroup = new THREE.Group();
scene.add(shipGroup);
const engineLight = new THREE.PointLight(0x44aaff, 0, 10);
shipGroup.add(engineLight);
let shipModel = null;

const loadingBar  = document.getElementById('loading-bar');
const loadingEl   = document.getElementById('loading');
const loadingText = document.getElementById('loading-text');

// Environment map para reflejos metálicos
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
const envTexture = pmremGenerator.fromScene(
  new THREE.Scene()
).texture;
// Luz de entorno manual para reflejos
const envLight = new THREE.PointLight(0xffffff, 1, 500);
envLight.position.set(0, 50, 0);
scene.add(envLight);
scene.environment = envTexture;

const loader = new THREE.GLTFLoader();
loader.load('assets/nave.glb',
  (gltf) => {
    shipModel = gltf.scene;
    console.log('GLB cargado OK');
    // Log materiales para debug del calor
    shipModel.traverse((child) => {
      if (child.isMesh && child.material) {
        const c = child.material.color;
        console.log("MAT:", child.material.name, "| r:", c.r.toFixed(3), "g:", c.g.toFixed(3), "b:", c.b.toFixed(3));
      }
    });

    shipModel.traverse((child) => {
      if (child.isMesh) {
        console.log('Mesh:', child.name, '| metalness:', child.material.metalness, '| roughness:', child.material.roughness);
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.envMapIntensity = 1.5;
          child.material.needsUpdate = true;
          child.material.envMapIntensity = 1.5;
          child.material.needsUpdate = true;
        }
      }
    });
    // Añadir al grupo primero para que las matrices se calculen bien
    shipGroup.add(shipModel);
    shipModel.rotation.y = 0;

    // Forzar actualización de matrices antes de calcular bounds
    shipModel.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(shipModel);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    console.log('Box size:', size, '| maxDim:', maxDim, '| center:', center);

    shipModel.position.set(-center.x, -center.y, -center.z);

    if (maxDim > 0) {
      const scaleFactor = 6 / maxDim;
      shipModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
      console.log('Scale aplicado:', scaleFactor);
    } else {
      shipModel.scale.set(0.5, 0.5, 0.5);
      console.warn('maxDim es 0 — usando escala fija 0.5');
    }
    loadingBar.style.width = '100%';
    loadingText.textContent = '¡LISTO! DESPEGANDO...';
    setTimeout(() => loadingEl.classList.add('hidden'), 800);
  },
  (xhr) => {
    if (xhr.total) {
      const pct = Math.round(xhr.loaded / xhr.total * 100);
      loadingBar.style.width = pct + '%';
      loadingText.textContent = 'CARGANDO NAVE... ' + pct + '%';
    }
  },
  (err) => {
    console.error('GLB error:', err);
    loadingText.textContent = 'ERROR: ' + err.message;
    setTimeout(() => loadingEl.classList.add('hidden'), 2000);
  }
);

// ─── INPUT TECLADO ───────────────────────────────────────────────────────────
const keys = {};
const cvOverlay  = document.getElementById('cv-overlay');
const planetHint = document.getElementById('planet-hint');

window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyE') {
    const d = shipGroup.position.distanceTo(PLANET_POS);
    if (d < 55) cvOverlay.classList.add('active');
  }
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

// ─── MOUSE LOOK (arrastrar sobre espacio vacío) ───────────────────────────────
const mouseLook = { active: false, x: 0, y: 0, yaw: 0, pitch: 0 };

renderer.domElement.addEventListener('mousedown', (e) => {
  // Solo activa si NO hay un objeto 3D clickeado (espacio vacío)
  const m = new THREE.Vector2((e.clientX/innerWidth)*2-1, -(e.clientY/innerHeight)*2+1);
  const rc = new THREE.Raycaster();
  rc.setFromCamera(m, camera);
  const hits = rc.intersectObjects([planet, ...asteroids.map(a=>a.mesh)], false);
  if (hits.length === 0) {
    mouseLook.active = true;
    mouseLook.x = e.clientX;
    mouseLook.y = e.clientY;
  }
});
renderer.domElement.addEventListener('mousemove', (e) => {
  if (!mouseLook.active) return;
  const dx = e.clientX - mouseLook.x;
  const dy = e.clientY - mouseLook.y;
  mouseLook.x = e.clientX;
  mouseLook.y = e.clientY;
  mouseLook.yaw   -= dx * 0.003;
  mouseLook.pitch -= dy * 0.003;
  mouseLook.pitch  = Math.max(-Math.PI * 0.85, Math.min(Math.PI * 0.85, mouseLook.pitch));
});
renderer.domElement.addEventListener('mouseup',   () => { mouseLook.active = false; });
renderer.domElement.addEventListener('mouseleave',() => { mouseLook.active = false; });

// ─── PLANET CLICK (mouse) ────────────────────────────────────────────────────
renderer.domElement.addEventListener('click', (e) => {
  if (mouseLook.active) return;
  const mouse = new THREE.Vector2((e.clientX/innerWidth)*2-1, -(e.clientY/innerHeight)*2+1);
  const rc = new THREE.Raycaster();
  rc.setFromCamera(mouse, camera);
  if (rc.intersectObject(planet, false).length > 0) cvOverlay.classList.add('active');
});

document.getElementById('close-btn').addEventListener('click', () => cvOverlay.classList.remove('active'));
cvOverlay.addEventListener('click', e => { if (e.target === cvOverlay) cvOverlay.classList.remove('active'); });

// ─── JOYSTICK MÓVIL ──────────────────────────────────────────────────────────
const joyEl    = document.getElementById('joystick');
const joyKnob  = document.getElementById('joystick-knob');
const JOY_R    = 50; // radio máximo del knob
let joyActive  = false;
let joyId      = null;
let joyOrigin  = { x: 0, y: 0 };
let joyVec     = { x: 0, y: 0 }; // -1..1

function joyStart(x, y, id) {
  const rect = joyEl.getBoundingClientRect();
  joyOrigin = { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
  joyActive = true;
  joyId = id;
  joyMove(x, y);
}
function joyMove(x, y) {
  if (!joyActive) return;
  let dx = x - joyOrigin.x;
  let dy = y - joyOrigin.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  if (dist > JOY_R) { dx = dx/dist*JOY_R; dy = dy/dist*JOY_R; }
  joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  joyVec.x = dx / JOY_R;
  joyVec.y = dy / JOY_R;
}
function joyEnd() {
  joyActive = false; joyId = null;
  joyKnob.style.transform = 'translate(-50%, -50%)';
  joyVec.x = 0; joyVec.y = 0;
}

joyEl.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.changedTouches[0];
  joyStart(t.clientX, t.clientY, t.identifier);
}, { passive: false });

// Touch look — dedo derecho (fuera del joystick)
const touchLook = { active: false, id: null, x: 0, y: 0 };

renderer.domElement.addEventListener('touchstart', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    // Si el toque está en la mitad izquierda y cerca del joystick, ignorar (ya lo maneja joyEl)
    if (t.clientX < innerWidth * 0.35) continue;
    if (!touchLook.active) {
      touchLook.active = true;
      touchLook.id = t.identifier;
      touchLook.x = t.clientX;
      touchLook.y = t.clientY;
    }
  }
}, { passive: false });

window.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    // Joystick
    if (joyActive && t.identifier === joyId) joyMove(t.clientX, t.clientY);
    // Look
    if (touchLook.active && t.identifier === touchLook.id) {
      const dx = t.clientX - touchLook.x;
      const dy = t.clientY - touchLook.y;
      touchLook.x = t.clientX; touchLook.y = t.clientY;
      mouseLook.yaw   -= dx * 0.004;
      mouseLook.pitch -= dy * 0.004;
      mouseLook.pitch  = Math.max(-Math.PI * 0.85, Math.min(Math.PI * 0.85, mouseLook.pitch));
    }
  }
}, { passive: false });

window.addEventListener('touchend', e => {
  for (const t of e.changedTouches) {
    if (t.identifier === joyId) joyEnd();
    if (t.identifier === touchLook.id) { touchLook.active = false; touchLook.id = null; }
  }
});

// Botón E móvil
document.getElementById('btn-e').addEventListener('touchstart', e => {
  e.preventDefault();
  const d = shipGroup.position.distanceTo(PLANET_POS);
  if (d < 55) cvOverlay.classList.add('active');
});

// ─── TRAIL ───────────────────────────────────────────────────────────────────
const TRAIL_MAX = 50;
const trailGeo  = new THREE.BufferGeometry();
const trailPos  = new Float32Array(TRAIL_MAX * 3);
trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
const trailPts  = [];
scene.add(new THREE.Points(trailGeo, new THREE.PointsMaterial({
  color: 0x44aaff, size: 0.35, transparent: true, opacity: 0.55,
  blending: THREE.AdditiveBlending, depthWrite: false
})));

// ─── SHIP PHYSICS ────────────────────────────────────────────────────────────
const velocity  = new THREE.Vector3();
const MAX_SPEED = 4;
const ACCEL     = 0.18;
const FRICTION  = 0.96;
const ROT_SPEED = 0.012;
const ROT_FRIC  = 0.50;
let angularVel  = 0;

// ─── CAMERA ──────────────────────────────────────────────────────────────────
const camCurrent = new THREE.Vector3(0, 4, 14);
// Offset de cámara relativo a la nave, modulado por mouse look
const CAM_DIST   = 13;
const CAM_HEIGHT = 3.5;

// ─── CLOCK ───────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  // --- Joystick → controles nave ---
  const joyTurn    = joyVec.x;              // -1 izq, +1 der
  const joyThrust  = -joyVec.y;             // +1 adelante, -1 atrás

  // Rotación
  const turnInput = (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0)
                  - (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0)
                  + joyTurn;
  angularVel += turnInput * ROT_SPEED;
  angularVel *= ROT_FRIC;
  shipGroup.rotation.y += angularVel;

  if (shipModel) {
    const targetRoll = -turnInput * 0.4;
    shipModel.rotation.z += (targetRoll - shipModel.rotation.z) * 0.08;
    const pitchInput = (keys['KeyQ'] ? 1 : 0) - (keys['KeyE'] ? 1 : 0);
    shipGroup.rotation.x += pitchInput * 0.02;
    shipGroup.rotation.x *= 0.95;
  }

  const forward = new THREE.Vector3(
    -Math.sin(shipGroup.rotation.y),
    -Math.sin(shipGroup.rotation.x),
    -Math.cos(shipGroup.rotation.y)
  );

  const thrusting = keys['KeyW'] || keys['ArrowUp']  || joyThrust > 0.15;
  const braking   = keys['KeyS'] || keys['ArrowDown'] || joyThrust < -0.15;

  if (thrusting) velocity.addScaledVector(forward, ACCEL * Math.max(1, Math.abs(joyThrust)));
  else if (braking) velocity.addScaledVector(forward, -ACCEL * 0.4);

  const spd = velocity.length();
  if (spd > MAX_SPEED) velocity.multiplyScalar(MAX_SPEED / spd);
  velocity.multiplyScalar(FRICTION);
  shipGroup.position.add(velocity);

  engineLight.intensity = thrusting ? 3 + Math.random() * 2 : 0;

  // Metal caliente en partes naranjas según velocidad
  if (shipModel) {
    const heatRatio = spd / MAX_SPEED;
    shipModel.traverse((child) => {
      if (child.isMesh && child.material) {
        const c = child.material.color;
        const name = (child.material.name || '').toLowerCase();
        // Detecta naranja por nombre O por color (sRGB: r>0.3, g>0.1, b<0.15)
        const isOrange = name.includes('naranj') || name.includes('orange') || name.includes('amarill') ||
                         (c && c.r > 0.3 && c.g > 0.08 && c.g < 0.55 && c.b < 0.12) ||
                         (c && c.r > 0.25 && c.g > 0.05 && c.b < 0.08);
        if (isOrange) {
          if (!child.material.emissive) child.material.emissive = new THREE.Color();
          child.material.emissive.setRGB(
            heatRatio * 1.2,
            heatRatio * 0.4,
            heatRatio * 0.02
          );
          child.material.emissiveIntensity = heatRatio * 3.0;
          child.material.needsUpdate = true;
        }
      }
    });
  }

  document.getElementById('speed-fill').style.width = (spd / MAX_SPEED * 100).toFixed(1) + '%';

  // Trail
  if (thrusting && Math.random() > 0.35) {
    const pt = shipGroup.position.clone().addScaledVector(forward, -2);
    pt.x += (Math.random()-0.5)*0.3; pt.y += (Math.random()-0.5)*0.3;
    trailPts.unshift({ pos: pt });
    if (trailPts.length > TRAIL_MAX) trailPts.pop();
  }
  for (let i = 0; i < TRAIL_MAX; i++) {
    if (trailPts[i]) {
      trailPos[i*3]   = trailPts[i].pos.x;
      trailPos[i*3+1] = trailPts[i].pos.y;
      trailPos[i*3+2] = trailPts[i].pos.z;
    } else { trailPos[i*3] = trailPos[i*3+1] = trailPos[i*3+2] = 99999; }
  }
  trailGeo.attributes.position.needsUpdate = true;

  // --- Cámara con mouse look ---
  // Base: detrás de la nave
  const shipQuat = new THREE.Quaternion().setFromEuler(shipGroup.rotation);
  const baseOff  = new THREE.Vector3(0, CAM_HEIGHT, CAM_DIST).applyQuaternion(shipQuat);

  // Aplicar rotación de mouse look sobre el pivot de la nave
  const lookQuat = new THREE.Quaternion();
  lookQuat.setFromEuler(new THREE.Euler(mouseLook.pitch, mouseLook.yaw, 0, 'YXZ'));
  const lookOff = new THREE.Vector3(0, CAM_HEIGHT, CAM_DIST).applyQuaternion(lookQuat);

  // Mezcla: si mouseLook activo usamos el look offset, si no volvemos al base
  const blendOff = mouseLook.active || touchLook.active
    ? lookOff
    : baseOff;

  const targetCam = shipGroup.position.clone().add(blendOff);
  camCurrent.lerp(targetCam, mouseLook.active || touchLook.active ? 0.12 : 0.055);
  camera.position.copy(camCurrent);
  const lookAt = shipGroup.position.clone(); lookAt.y += 0.8;
  camera.lookAt(lookAt);

  // Cuando se suelta el mouse, suavizar yaw/pitch de vuelta a 0
  if (!mouseLook.active && !touchLook.active) {
    mouseLook.yaw   *= 0.92;
    mouseLook.pitch *= 0.92;
  }

  // --- Planeta ---
  planet.rotation.y = t * 0.04;
  planetLight.intensity = 3 + Math.sin(t * 1.5) * 0.5;
  const distPlanet = shipGroup.position.distanceTo(PLANET_POS);
  planetHint.style.opacity = distPlanet < 130 ? Math.min(1, (130 - distPlanet) / 70) : 0;

  const interactPrompt = document.getElementById('interact-prompt');
  if (distPlanet < 55) {
    interactPrompt.style.opacity = '1';
    interactPrompt.style.pointerEvents = 'auto';
  } else {
    interactPrompt.style.opacity = '0';
    interactPrompt.style.pointerEvents = 'none';
  }

  // --- Asteroides ---
  asteroids.forEach(({ mesh, speed, ry }) => {
    const rel   = mesh.position.clone().sub(PLANET_POS);
    const angle = Math.atan2(rel.z, rel.x) + speed;
    const dist  = Math.sqrt(rel.x*rel.x + rel.z*rel.z);
    mesh.position.x = PLANET_POS.x + Math.cos(angle) * dist;
    mesh.position.z = PLANET_POS.z + Math.sin(angle) * dist;
    mesh.rotation.x += ry; mesh.rotation.y += ry * 0.7;
  });

  // Ship idle bob
  if (shipModel && spd < 0.1) shipModel.position.y = Math.sin(t * 1.2) * 0.1;

  renderer.render(scene, camera);
}

animate();
