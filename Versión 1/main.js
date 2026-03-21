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

// Atmosphere shells
[30, 34, 38].forEach((r, i) => {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0x3388ff, transparent: true, opacity: 0.06 - i*0.015, side: THREE.BackSide, depthWrite: false })
  );
  m.position.copy(PLANET_POS);
  scene.add(m);
});

// Rings
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

// ─── SHIP GROUP ──────────────────────────────────────────────────────────────
const shipGroup = new THREE.Group();
scene.add(shipGroup);
const engineLight = new THREE.PointLight(0x44aaff, 0, 10);
shipGroup.add(engineLight);

let shipModel = null;

// ─── LOAD GLB ────────────────────────────────────────────────────────────────
const loadingBar  = document.getElementById('loading-bar');
const loadingEl   = document.getElementById('loading');
const loadingText = document.getElementById('loading-text');

const loader = new THREE.GLTFLoader();
loader.load(
  'assets/nave.glb',
  (gltf) => {
    shipModel = gltf.scene;
    shipModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.roughness = 0.35;
          child.material.metalness = 0.65;
          if (child.material.color) {
            const c = child.material.color;
            if (c.r + c.g + c.b < 0.15) child.material.color.set(0x8899aa);
          }
        }
      }
    });
    // Center model
    const box = new THREE.Box3().setFromObject(shipModel);
    const center = box.getCenter(new THREE.Vector3());
    shipModel.position.sub(center);
    // Scale to reasonable size
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) shipModel.scale.multiplyScalar(6 / maxDim);
    shipModel.rotation.y = 0;
    shipGroup.add(shipModel);

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
    // Show scene anyway
    setTimeout(() => loadingEl.classList.add('hidden'), 2000);
  }
);

// ─── INPUT ───────────────────────────────────────────────────────────────────
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  e.preventDefault();
  if (e.code === 'KeyE') {
    const d = shipGroup.position.distanceTo(PLANET_POS);
    if (d < 55) cvOverlay.classList.add('active');
  }
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

// ─── SHIP STATE ──────────────────────────────────────────────────────────────
const velocity   = new THREE.Vector3();
const MAX_SPEED  = 18;
const ACCEL      = 0.04;
const FRICTION   = 0.96;
const ROT_SPEED  = 0.015;
const ROT_FRIC   = 0.50;
let angularVel   = 0;

// ─── CAMERA FOLLOW ───────────────────────────────────────────────────────────
const camCurrent = new THREE.Vector3(0, 4, 14);

// ─── PLANET CLICK ────────────────────────────────────────────────────────────
const raycaster  = new THREE.Raycaster();
const mouse      = new THREE.Vector2();
const cvOverlay  = document.getElementById('cv-overlay');
const planetHint = document.getElementById('planet-hint');

renderer.domElement.addEventListener('click', (e) => {
  mouse.x =  (e.clientX / innerWidth)  * 2 - 1;
  mouse.y = -(e.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  if (raycaster.intersectObject(planet, false).length > 0) {
    cvOverlay.classList.add('active');
  }
});
document.getElementById('close-btn').addEventListener('click', () => cvOverlay.classList.remove('active'));
cvOverlay.addEventListener('click', e => { if (e.target === cvOverlay) cvOverlay.classList.remove('active'); });

// ─── TRAIL ───────────────────────────────────────────────────────────────────
const TRAIL_MAX  = 50;
const trailGeo   = new THREE.BufferGeometry();
const trailPos   = new Float32Array(TRAIL_MAX * 3);
trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
const trailPts   = [];
scene.add(new THREE.Points(trailGeo, new THREE.PointsMaterial({
  color: 0x44aaff, size: 0.35, transparent: true, opacity: 0.55,
  blending: THREE.AdditiveBlending, depthWrite: false
})));

// ─── CLOCK ───────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

// ─── ANIMATE ─────────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const t  = clock.getElapsedTime();

  // --- Ship controls ---
  const turning = (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0) - (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0);
  angularVel += turning * ROT_SPEED;
  angularVel *= ROT_FRIC;
  shipGroup.rotation.y += angularVel;

  if (shipModel) {
    const targetRoll = -turning * 0.4;
    shipModel.rotation.z += (targetRoll - shipModel.rotation.z) * 0.08;
    const pitching = (keys['KeyQ'] ? 1 : 0) - (keys['KeyE'] ? 1 : 0);
    shipGroup.rotation.x += pitching * 0.02;
    shipGroup.rotation.x *= 0.95;
  }

  const forward = new THREE.Vector3(
    -Math.sin(shipGroup.rotation.y),
    -Math.sin(shipGroup.rotation.x),
    -Math.cos(shipGroup.rotation.y)
  );

  const thrusting = keys['KeyW'] || keys['ArrowUp'];
  const braking   = keys['KeyS'] || keys['ArrowDown'];

  if (thrusting) velocity.addScaledVector(forward, ACCEL);
  else if (braking) velocity.addScaledVector(forward, -ACCEL * 0.4);

  const spd = velocity.length();
  if (spd > MAX_SPEED) velocity.multiplyScalar(MAX_SPEED / spd);
  velocity.multiplyScalar(FRICTION);
  shipGroup.position.add(velocity);

  // Engine glow
  engineLight.intensity = thrusting ? 3 + Math.random() * 2 : 0;

  // Speed HUD
  document.getElementById('speed-fill').style.width = (spd / MAX_SPEED * 100).toFixed(1) + '%';

  // Trail
  if (thrusting && Math.random() > 0.35) {
    const pt = shipGroup.position.clone().addScaledVector(forward, -2);
    pt.x += (Math.random()-0.5)*0.3; pt.y += (Math.random()-0.5)*0.3;
    trailPts.unshift({ pos: pt, life: 1 });
    if (trailPts.length > TRAIL_MAX) trailPts.pop();
  }
  for (let i = 0; i < TRAIL_MAX; i++) {
    if (trailPts[i]) {
      trailPos[i*3]   = trailPts[i].pos.x;
      trailPos[i*3+1] = trailPts[i].pos.y;
      trailPos[i*3+2] = trailPts[i].pos.z;
      trailPts[i].life -= 0.03;
      if (trailPts[i].life <= 0) trailPts.splice(i--, 1);
    } else { trailPos[i*3] = trailPos[i*3+1] = trailPos[i*3+2] = 99999; }
  }
  trailGeo.attributes.position.needsUpdate = true;

  // --- Camera follow ---
  const quat   = new THREE.Quaternion().setFromEuler(shipGroup.rotation);
  const offset = new THREE.Vector3(0, 3.5, 13).applyQuaternion(quat);
  const target = shipGroup.position.clone().add(offset);
  camCurrent.lerp(target, 0.055);
  camera.position.copy(camCurrent);
  const lookAt = shipGroup.position.clone(); lookAt.y += 0.8;
  camera.lookAt(lookAt);

  // --- Planet ---
  planet.rotation.y = t * 0.04;
  planetLight.intensity = 3 + Math.sin(t * 1.5) * 0.5;
  const distPlanet = shipGroup.position.distanceTo(PLANET_POS);
planetHint.style.opacity = distPlanet < 130 ? Math.min(1, (130 - distPlanet) / 70) : 0;

const interactZone = document.getElementById('interact-prompt');
if (distPlanet < 55) {
  interactZone.style.opacity = '1';
  interactZone.style.pointerEvents = 'auto';
} else {
  interactZone.style.opacity = '0';
  interactZone.style.pointerEvents = 'none';
}sd

  // --- Asteroids ---
  asteroids.forEach(({ mesh, speed, ry }) => {
    const rel = mesh.position.clone().sub(PLANET_POS);
    const angle = Math.atan2(rel.z, rel.x) + speed;
    const dist  = Math.sqrt(rel.x*rel.x + rel.z*rel.z);
    mesh.position.x = PLANET_POS.x + Math.cos(angle) * dist;
    mesh.position.z = PLANET_POS.z + Math.sin(angle) * dist;
    mesh.rotation.x += ry; mesh.rotation.y += ry * 0.7;
  });

  // Ship idle bob
  if (shipModel && spd < 0.1) {
    shipModel.position.y = Math.sin(t * 1.2) * 0.1;
  }

  renderer.render(scene, camera);
}

animate();
