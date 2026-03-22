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

// ─── UNIVERSO BASE
const mainUniverseGroup = new THREE.Group();
scene.add(mainUniverseGroup);

// Texto 3D del universo SISTEMA
let sistemaTextGroup = null;
let sistemaTextLetters = [];
let sistemaTextFont = null;
let sistemaTextStartTime = 0;
let sistemaTextExploded = false;
const SISTEMA_TEXT = 'Esto apenas empieza, voy por buen camino.';
const SISTEMA_TEXT_HOLD = 3.0; // segundos antes de explosión

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

function clearUniverseObjects() {
  if (window.universeObjects && Array.isArray(window.universeObjects)) {
    window.universeObjects.forEach(o => scene.remove(o));
  }
  window.universeObjects = [];

  // Reiniciar texto Sistema (se recrea al entrar otra vez)
  if (sistemaTextGroup) {
    sistemaTextGroup.children.forEach(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
    scene.remove(sistemaTextGroup);
  }
  sistemaTextGroup = null;
  sistemaTextLetters = [];
  sistemaTextExploded = false;
  sistemaTextStartTime = 0;
}

function addStarUniverse(starGroups) {
  starGroups.forEach(({count, spread, size, color}) => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = spread * (0.5 + Math.random() * 0.5);
      positions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i*3+2] = r * Math.cos(phi);

      const t = Math.random();
      const c = new THREE.Color(color || 0xffffff);
      colors[i*3] = THREE.MathUtils.lerp(0.8, 1.0, t) * c.r;
      colors[i*3+1] = THREE.MathUtils.lerp(0.8, 1.0, t) * c.g;
      colors[i*3+2] = THREE.MathUtils.lerp(0.8, 1.0, t) * c.b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starPoints = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ size: size || 0.4, vertexColors: true, transparent: true, opacity: 0.9 })
    );

    scene.add(starPoints);
    window.universeObjects.push(starPoints);
  });
}

mainUniverseGroup.add(makeStarField(3000, 1200));
mainUniverseGroup.add(makeStarField(800, 500));

// ─── NEBULAE ─────────────────────────────────────────────────────────────────
[[0x1a0a4a,[-300,80,-400],600,0.15],[0x0a1a4a,[400,-60,-500],700,0.12],[0x2a0a2a,[100,-200,-300],500,0.1]]
.forEach(([color, pos, size, op]) => {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  m.position.set(...pos);
  m.rotation.set(Math.random(), Math.random(), Math.random());
  mainUniverseGroup.add(m);
});

// ─── PLANET ──────────────────────────────────────────────────────────────────
const PLANET_POS = new THREE.Vector3(-120, 20, -180);

// Variable para controlar la intensidad de los pulsos de luz del planeta
let PLANET_PULSE_INTENSITY = 2.0; // Modifica este valor para cambiar la intensidad (0.5-5.0 recomendado)

// Función para actualizar información de pulsos en HUD (si se implementa)
function updateHUDPulseInfo() {
  // Por ahora solo log, pero se puede extender para mostrar en HUD
  console.log(`🔄 Pulsos actualizados: ${PLANET_PULSE_INTENSITY}`);
}

// Función para cambiar la intensidad de los pulsos (puede llamarse desde la consola)
function setPlanetPulseIntensity(intensity) {
  PLANET_PULSE_INTENSITY = Math.max(0.1, Math.min(10, intensity));
  updateHUDPulseInfo();
  console.log(`🌟 Intensidad de pulsos del planeta cambiada a: ${PLANET_PULSE_INTENSITY}`);
}

// Función para mostrar información de pulsos en consola
function showPlanetPulseInfo() {
  console.log(`🔥 PLANETA NARANJA INTENSO:`);
  console.log(`   Color: Naranja rojizo vibrante (#ff4500)`);
  console.log(`   Intensidad actual: ${PLANET_PULSE_INTENSITY}`);
  console.log(`   Rango recomendado: 0.5 - 5.0`);
  console.log(`   Para cambiar: setPlanetPulseIntensity(2.5)`);
}

window.setPlanetPulseIntensity = setPlanetPulseIntensity;
window.showPlanetPulseInfo = showPlanetPulseInfo;

// Mostrar información inicial del planeta al cargar
setTimeout(() => {
  console.log(`🔥 ¡Planeta naranja INTENSO activado!`);
  console.log(`   Ejecuta: showPlanetPulseInfo()`);
  console.log(`   Para cambiar intensidad: setPlanetPulseIntensity(3.0)`);
}, 2000);

const planet = new THREE.Mesh(
  new THREE.SphereGeometry(28, 64, 64),
  new THREE.MeshStandardMaterial({
    color: 0xff4500,     // Naranja intenso / Óxido
    metalness: 0.85,     // Alta reflectividad metálica
    roughness: 0.2,      // Pulido, pero con ligera dispersión de luz
    envMapIntensity: 1.5, // Multiplicador para absorber la luz del espacio
    map: new THREE.TextureLoader().load('Assets/Texturas/Lava004_2K-JPG_Color.jpg')
  })
);
planet.position.copy(PLANET_POS);
mainUniverseGroup.add(planet);

[30, 34, 38].forEach((r, i) => {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, 32, 32),
    new THREE.MeshBasicMaterial({ 
      color: 0xff6600, // Naranja más brillante para atmósfera
      transparent: true, 
      opacity: 0.06 - i*0.015, 
      side: THREE.BackSide, 
      depthWrite: false 
    })
  );
  m.position.copy(PLANET_POS);
  mainUniverseGroup.add(m);
});

[[36, 52, 0.18], [54, 66, 0.08]].forEach(([inner, outer, op]) => {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(inner, outer, 80),
    new THREE.MeshBasicMaterial({ 
      color: 0xff7733, // Naranja intenso para los anillos
      transparent: true, 
      opacity: op, 
      side: THREE.DoubleSide, 
      depthWrite: false 
    })
  );
  ring.position.copy(PLANET_POS);
  ring.rotation.x = Math.PI / 2.4;
  mainUniverseGroup.add(ring);
});

const planetLight = new THREE.PointLight(0xff4500, 3, 140); // Luz naranja intensa rojiza
planetLight.position.copy(PLANET_POS);
mainUniverseGroup.add(planetLight);

// Planeta que abre otro universo (Sistema)
const SYSTEM_PLANET_POS = new THREE.Vector3(90, 12, -100);
const SYSTEM_PLANET_NAME = 'Sistema';
let inSistemaUniverse = false;

const sistemaPlanet = new THREE.Mesh(
  new THREE.SphereGeometry(14, 48, 48),
  new THREE.MeshStandardMaterial({
    color: 0x8f00ff, // morado
    roughness: 0.35,
    metalness: 0.25,
    emissive: 0x330066,
    emissiveIntensity: 0.3,
    normalMap: new THREE.TextureLoader().load('Assets/Texturas/ChristmasTreeOrnament020_2K-JPG_NormalDX.jpg')
  })
);
sistemaPlanet.position.copy(SYSTEM_PLANET_POS);
mainUniverseGroup.add(sistemaPlanet);

const sistemaPlanetLight = new THREE.PointLight(0x9b31ff, 1.8, 120);
sistemaPlanetLight.position.copy(SYSTEM_PLANET_POS);
mainUniverseGroup.add(sistemaPlanetLight);

// Cargar universo desde JSON al hacer click (archivo sistema-universe.json)
function loadUniverseFromFile(url) {
  fetch(url)
    .then(res => res.json())
    .then(data => {
      console.log('🌌 Universo cargado:', data.galaxy, data);
      clearUniverseObjects();

      if (data.stars && Array.isArray(data.stars) && data.stars.length > 0) {
        addStarUniverse(data.stars);
      }

      if (data.planets && Array.isArray(data.planets)) {
        data.planets.forEach(p => {
          const obj = new THREE.Mesh(
            new THREE.SphereGeometry(p.size, 32, 32),
            new THREE.MeshStandardMaterial({ color: new THREE.Color(p.color), emissive: new THREE.Color(p.color).multiplyScalar(0.2), roughness:0.3 })
          );
          obj.position.set(p.pos[0] + SYSTEM_PLANET_POS.x, p.pos[1] + SYSTEM_PLANET_POS.y, p.pos[2] + SYSTEM_PLANET_POS.z);
          scene.add(obj);
          window.universeObjects.push(obj);
        });
      }

      const desc = data.galaxy + (data.stars && data.stars.length > 0 ? ' (solo estrellas)' : '');
      alert(`Ahora estás en el universo ${desc}.`);

      // En universo SISTEMA, mostrar texto 3D flotante
      if (inSistemaUniverse) {
        addSistemaText();
      }
    })
    .catch(error => {
      console.error('Error cargando universo:', error);
      alert('No se pudo cargar el universo: ' + error.message);
    });
}

function addSistemaText() {
  if (sistemaTextGroup) return;

  const createTextLetters = (font) => {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffc0ff,
      emissive: 0x602060,
      emissiveIntensity: 1.0,
      roughness: 0.25,
      metalness: 0.35,
      transparent: true,
      opacity: 0.96,
      side: THREE.DoubleSide
    });

    let cursor = 0;
    const spacing = 0.5;

    // texto por caracter
    for (const ch of SISTEMA_TEXT) {
      if (ch === ' ') {
        cursor += 1.2;
        continue;
      }

      const geo = new THREE.TextGeometry(ch, {
        font,
        size: 2.2,
        height: 0.45,
        curveSegments: 8,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.04,
        bevelOffset: 0,
        bevelSegments: 2
      });
      geo.computeBoundingBox();
      const charWidth = geo.boundingBox.max.x - geo.boundingBox.min.x;

      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.position.set(cursor + charWidth * 0.5, 0, 0);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      group.add(mesh);

      sistemaTextLetters.push({ mesh, velocity: new THREE.Vector3(), startPos: mesh.position.clone() });
      cursor += charWidth + spacing;
    }

    // centrar el texto completo
    const bb = new THREE.Box3().setFromObject(group);
    const center = bb.getCenter(new THREE.Vector3());
    group.children.forEach(c => c.position.sub(center));

    group.position.set(0, 0, 0);
    group.userData.initialized = true;
    scene.add(group);
    window.universeObjects.push(group);

    sistemaTextGroup = group;
    sistemaTextStartTime = clock.getElapsedTime();
    sistemaTextExploded = false;
  };

  if (sistemaTextFont) {
    createTextLetters(sistemaTextFont);
    return;
  }

  const loader = new THREE.FontLoader();
  loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', font => {
    sistemaTextFont = font;
    createTextLetters(font);
  }, undefined, err => {
    console.error('Error cargando fuente para texto del sistema:', err);
  });
}

function setMainUniverseVisible(visible) {
  mainUniverseGroup.visible = visible;
}

function exitSistemaUniverse() {
  if (!inSistemaUniverse) {
    console.log('Ya estás en el universo principal.');
    return;
  }

  inSistemaUniverse = false;
  clearUniverseObjects();
  setMainUniverseVisible(true);

  shipGroup.visible = true;
  shipGroup2.visible = true;

  shipGroup.position.set(0, 4, 14);
  camera.position.copy(shipGroup.position).add(new THREE.Vector3(0, 12, 32));
  
  // Resetear rotación de la nave al regresar
  shipGroup.rotation.set(0, 0, 0);
  angularVel = 0;
  if (shipModel) shipModel.rotation.z = 0;

  // Darle velocidad máxima por 3 segundos, luego control al usuario
  const forwardDir = new THREE.Vector3(0, 0, -1);
  velocity.copy(forwardDir.multiplyScalar(MAX_SPEED));
  setTimeout(() => {
    velocity.set(0, 0, 0);
    console.log('Control de velocidad devuelto al usuario.');
  }, 3000);

  planetHint.textContent = '◈ REGRESASTE AL UNIVERSO PRINCIPAL';
  planetHint.style.opacity = 1;
  setTimeout(() => {
    planetHint.style.opacity = 0;
    planetHint.textContent = '◈ PLANETA DETECTADO — HAZ CLICK ◈';
  }, 3000);

  console.log('Volviendo al universo principal...');
}

function enterSistemaUniverse() {
  if (inSistemaUniverse) {
    console.log('Ya estás en el universo Sistema.');
    return;
  }

  inSistemaUniverse = true;
  console.log('Entrando al universo de estrellas Sistema...');
  setMainUniverseVisible(false);

  shipGroup.visible = true;
  shipGroup2.visible = false;

  loadUniverseFromFile('stars-universe.json');

  // Mover nave/cámara hacia el planeta Sistema como efecto de teletransporte
  shipGroup.position.copy(SYSTEM_PLANET_POS).add(new THREE.Vector3(0, 0, 40));
  camera.position.copy(shipGroup.position).add(new THREE.Vector3(0, 12, 32));
  
  // Resetear rotación de la nave al entrar
  shipGroup.rotation.set(0, 0, 0);
  angularVel = 0;
  joyVec.x = 0;  // Resetear joystick para evitar giros involuntarios
  joyVec.y = 0;
  if (shipModel) shipModel.rotation.z = 0;

  // Mensaje visual en pantalla
  planetHint.textContent = '🌌 UNIVERSO DE ESTRELLAS SISTEMA';
  planetHint.style.opacity = 1;
  setTimeout(() => {
    planetHint.style.opacity = 0;
    planetHint.textContent = '◈ PLANETA DETECTADO — HAZ CLICK ◈';
  }, 3000);
}

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
  mainUniverseGroup.add(mesh);
  asteroids.push({ mesh, speed: (Math.random()-0.5)*0.005, ry: Math.random()*0.01 });
}

// ─── SHIP ────────────────────────────────────────────────────────────────────
const shipGroup = new THREE.Group();
scene.add(shipGroup);
const engineLight = new THREE.PointLight(0x44aaff, 0, 10);
shipGroup.add(engineLight);
let shipModel = null;

// ─── SECOND SHIP (BLUE VERSION) ────────────────────────────────────────────────
const shipGroup2 = new THREE.Group();
scene.add(shipGroup2);
const engineLight2 = new THREE.PointLight(0x4488ff, 0, 8);
shipGroup2.add(engineLight2);
let shipModel2 = null;

// Physics for second ship
const velocity2 = new THREE.Vector3();
const MAX_SPEED2 = 2.5;
let angularVel2 = 0;
let moveTimer2 = 0;
let targetDirection2 = new THREE.Vector3();

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
loader.load('Assets/Nave.glb',
  (gltf) => {
    // First ship (original orange)
    shipModel = gltf.scene.clone();
    console.log('GLB cargado OK');
    
    // Setup first ship
    setupShipModel(shipModel, shipGroup, false);
    
    // Second ship (blue version)
    shipModel2 = gltf.scene.clone();
    console.log('Segunda nave creada');
    
    // Setup second ship with blue materials
    setupShipModel(shipModel2, shipGroup2, true);
    
    // Position second ship near the orange planet
    shipGroup2.position.set(-90, 35, -160);
    
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

// Helper function to setup ship models
function setupShipModel(model, group, makeBlue = false) {
  model.traverse((child) => {
    if (child.isMesh && child.material) {
      const c = child.material.color;
      console.log("MAT:", child.material.name, "| r:", c.r.toFixed(3), "g:", c.g.toFixed(3), "b:", c.b.toFixed(3));
      
      if (makeBlue) {
        // Change orange parts to blue
        const name = (child.material.name || '').toLowerCase();
        const isOrange = name.includes('naranj') || name.includes('orange') || name.includes('amarill') ||
                         (c && c.r > 0.3 && c.g > 0.08 && c.g < 0.55 && c.b < 0.12) ||
                         (c && c.r > 0.25 && c.g > 0.05 && c.b < 0.08);
        
        if (isOrange) {
          child.material = child.material.clone();
          child.material.color.setHex(0x4488ff); // Blue color
          child.material.emissive.setHex(0x002244); // Blue emissive
          console.log("Changed to blue:", child.material.name);
        }
      }
    }
  });

  model.traverse((child) => {
    if (child.isMesh) {
      console.log('Mesh:', child.name, '| metalness:', child.material.metalness, '| roughness:', child.material.roughness);
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material.envMapIntensity = 1.5;
        child.material.needsUpdate = true;
      }
    }
  });
  
  // Añadir al grupo
  group.add(model);
  model.rotation.y = 0;

  // Forzar actualización de matrices antes de calcular bounds
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  console.log('Box size:', size, '| maxDim:', maxDim, '| center:', center);

  model.position.set(-center.x, -center.y, -center.z);

  if (maxDim > 0) {
    const scaleFactor = 6 / maxDim;
    model.scale.set(scaleFactor, scaleFactor, scaleFactor);
    console.log('Scale aplicado:', scaleFactor);
  } else {
    model.scale.set(0.5, 0.5, 0.5);
    console.warn('maxDim es 0 — usando escala fija 0.5');
  }
}

// ─── INPUT TECLADO ───────────────────────────────────────────────────────────
const keys = {};
const cvOverlay  = document.getElementById('cv-overlay');
const planetHint = document.getElementById('planet-hint');

window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyR') {
    exitSistemaUniverse();
    return;
  }

  if (e.code === 'KeyE') {
    if (inSistemaUniverse) {
      console.log('Estás en el universo de estrellas. Presiona R para volver al universo principal.');
      return;
    }

    const dPlanet = shipGroup.position.distanceTo(PLANET_POS);
    const dSistema = shipGroup.position.distanceTo(SYSTEM_PLANET_POS);

    if (dSistema < 55) {
      console.log('E presionado cerca del planeta Sistema -> entrando al universo Sistema.');
      enterSistemaUniverse();
      return;
    }

    if (dPlanet < 55) {
      cvOverlay.classList.add('active');
      return;
    }

    console.log('E presionado, pero no estás cerca de un planeta interactivo.');
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

  // Si clickea planeta naranja: abre CV
  if (rc.intersectObject(planet, false).length > 0) {
    cvOverlay.classList.add('active');
    return;
  }

  if (inSistemaUniverse) {
    console.log('Estás en el universo de estrellas. Presiona R para volver al universo principal.');
    return;
  }

  // Si clickea el planeta naranja: abre CV
  if (rc.intersectObject(planet, false).length > 0) {
    cvOverlay.classList.add('active');
    return;
  }

  // Si clickea el planeta Sistema (morado): abrir otro universo de estrellas
  if (rc.intersectObject(sistemaPlanet, false).length > 0) {
    console.log('🌀 Click en Sistema, entrando al universo de estrellas.');
    enterSistemaUniverse();
    return;
  }
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
const CAM_DIST   = 10;
const CAM_HEIGHT = 3;

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
    shipGroup.rotation.x *= 0.88;  // Más rápido decay para volver a neutral
  }

  const forward = new THREE.Vector3(
    -Math.sin(shipGroup.rotation.y),
    -Math.sin(shipGroup.rotation.x),
    -Math.cos(shipGroup.rotation.y)
  );

  const thrusting = keys['KeyW'] || keys['ArrowUp']  || joyThrust > 0.15;
  const braking   = keys['KeyS'] || keys['ArrowDown'] || joyThrust < -0.15;

  const joyMultiplier = Math.max(1, Math.abs(joyThrust));
  if (thrusting) {
    // Curva: arranca con impulso mínimo, explosiva después del 50%
    const spdNow = velocity.length();
    const spdRatio = spdNow / MAX_SPEED;
    const accelCurve = spdRatio < 0.5
      ? ACCEL * (0.3 + 0.7 * (spdRatio / 0.5))   // mínimo 30% de ACCEL al arrancar
      : ACCEL * (1.0 + 2.5 * ((spdRatio - 0.5) / 0.5)); // explosivo en segunda mitad
    velocity.addScaledVector(forward, accelCurve * joyMultiplier);
  } else if (braking) {
    velocity.addScaledVector(forward, -ACCEL * 0.4);
  }

  const spd = velocity.length();
  if (spd > MAX_SPEED) velocity.multiplyScalar(MAX_SPEED / spd);
  velocity.multiplyScalar(FRICTION);
  shipGroup.position.add(velocity);

  engineLight.intensity = thrusting ? 3 + Math.random() * 2 : 0;

  // Metal caliente en partes naranjas según velocidad
  if (shipModel) {
    const heatRatio = Math.min(1, spd / (MAX_SPEED * 0.4));
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

  // ─── SECOND SHIP AUTONOMOUS MOVEMENT ────────────────────────────────────────
  if (shipModel2) {
    moveTimer2 += 0.016; // ~60fps
    
    // Change direction every 3-8 seconds
    if (moveTimer2 > Math.random() * 5 + 3) {
      moveTimer2 = 0;
      
      // Generate new random direction
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 40; // -20 to +20
      targetDirection2.set(
        Math.cos(angle) * 0.8,
        height * 0.01,
        Math.sin(angle) * 0.8
      ).normalize();
      
      // Add some random rotation
      angularVel2 = (Math.random() - 0.5) * 0.02;
    }
    
    // Smooth rotation towards target direction
    const currentForward = new THREE.Vector3(
      Math.sin(shipGroup2.rotation.y),
      0,
      Math.cos(shipGroup2.rotation.y)
    );
    
    const targetYaw = Math.atan2(targetDirection2.x, targetDirection2.z);
    let diffYaw = targetYaw - shipGroup2.rotation.y;
    while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
    while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
    
    angularVel2 += diffYaw * 0.005;
    angularVel2 *= 0.95;
    shipGroup2.rotation.y += angularVel2;
    
    // Add some pitch variation
    shipGroup2.rotation.x += (targetDirection2.y * 0.5 - shipGroup2.rotation.x) * 0.02;
    shipGroup2.rotation.x *= 0.98;
    
    // Visual roll based on turn
    if (shipModel2) {
      const targetRoll = -angularVel2 * 20;
      shipModel2.rotation.z += (targetRoll - shipModel2.rotation.z) * 0.05;
    }
    
    // Movement
    const forward2 = new THREE.Vector3(
      Math.sin(shipGroup2.rotation.y),
      Math.sin(shipGroup2.rotation.x),
      Math.cos(shipGroup2.rotation.y)
    );
    
    // Apply thrust with some variation
    const thrustVariation = 0.8 + Math.sin(t * 0.5) * 0.3; // 0.5 to 1.1
    velocity2.addScaledVector(forward2, ACCEL * 0.3 * thrustVariation);
    
    // Limit speed
    const spd2 = velocity2.length();
    if (spd2 > MAX_SPEED2) velocity2.multiplyScalar(MAX_SPEED2 / spd2);
    
    // Apply friction
    velocity2.multiplyScalar(0.98);
    
    // Update position
    shipGroup2.position.add(velocity2);
    
    // Add continuous rotation on ship's own axis based on movement direction
    if (shipModel2) {
      // Rotate around Y axis (spin) based on forward movement
      const spinSpeed = velocity2.length() * 0.1;
      shipModel2.rotation.y += spinSpeed;
      
      // Add some wobble/tilt based on direction changes
      shipModel2.rotation.x = Math.sin(t * 2) * 0.1 + shipGroup2.rotation.x * 0.3;
      shipModel2.rotation.z = Math.cos(t * 1.5) * 0.05;
    }
    
    // Keep within bounds around the orange planet (prevent going too far)
    const distFromPlanet = shipGroup2.position.distanceTo(PLANET_POS);
    if (distFromPlanet > 60) {
      const pullBack = shipGroup2.position.clone().sub(PLANET_POS).normalize().multiplyScalar(-0.3);
      velocity2.add(pullBack);
    }
    
    // Engine light effect
    engineLight2.intensity = 2 + Math.sin(t * 3) * 1.5;
    
    // Heat effect on blue parts
    shipModel2.traverse((child) => {
      if (child.isMesh && child.material) {
        const heatRatio = Math.min(1, spd2 / (MAX_SPEED2 * 0.6));
        const name = (child.material.name || '').toLowerCase();
        const isBlue = name.includes('azul') || name.includes('blue') ||
                       (child.material.color && 
                        child.material.color.b > 0.4 && 
                        child.material.color.r < 0.3 && 
                        child.material.color.g < 0.3);
        
        if (isBlue) {
          if (!child.material.emissive) child.material.emissive = new THREE.Color();
          child.material.emissive.setRGB(
            heatRatio * 0.2,
            heatRatio * 0.4,
            heatRatio * 1.5
          );
          child.material.emissiveIntensity = heatRatio * 2.0;
          child.material.needsUpdate = true;
        }
      }
    });
  }

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
  camCurrent.lerp(targetCam, 0.12);
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
  planetLight.intensity = 3 + Math.sin(t * 1.5) * PLANET_PULSE_INTENSITY;
  planet.material.emissiveIntensity = 0.3 + Math.sin(t * 1.5) * (PLANET_PULSE_INTENSITY * 0.1);

  // --- Sistema planet ---
  sistemaPlanet.rotation.y = t * 0.06;
  sistemaPlanetLight.intensity = 1.8 + Math.sin(t * 1.3) * 0.4;

  // Texto 3D flotante en universo Sistema
  if (sistemaTextGroup && inSistemaUniverse) {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(shipGroup.quaternion);
    const target = shipGroup.position.clone().add(forward.multiplyScalar(11)).add(new THREE.Vector3(0, 6, 0));
    sistemaTextGroup.position.lerp(target, 0.12);
    sistemaTextGroup.lookAt(camera.position);

    const elapsed = t - sistemaTextStartTime;

    if (!sistemaTextExploded && elapsed > SISTEMA_TEXT_HOLD) {
      sistemaTextExploded = true;
      sistemaTextLetters.forEach((item) => {
        item.velocity.set(
          (Math.random() - 0.5) * 2.4,
          Math.random() * 1.9 + 1.8,
          (Math.random() - 0.5) * 2.4
        );
      });
    }

    if (sistemaTextExploded) {
      sistemaTextLetters.forEach((item) => {
        item.mesh.position.addScaledVector(item.velocity, 0.05);
        item.mesh.rotation.x += 0.015;
        item.mesh.rotation.y += 0.02;
        item.velocity.y -= 0.025;
        item.mesh.material.opacity = Math.max(0, item.mesh.material.opacity - 0.0008);
      });
    }
  }

  const distPlanet = shipGroup.position.distanceTo(PLANET_POS);
  const distSistema = shipGroup.position.distanceTo(SYSTEM_PLANET_POS);

  if (inSistemaUniverse) {
    planetHint.textContent = '🌌 UNIVERSO ESTELAR: Presiona R para regresar';
    planetHint.style.opacity = 1;
  } else if (distSistema < 130) {
    planetHint.textContent = '◈ SISTEMA detectado — presiona E o haz click';
    planetHint.style.opacity = Math.min(1, (130 - distSistema) / 70);
  } else if (distPlanet < 130) {
    planetHint.textContent = '◈ PLANETA DETECTADO — HAZ CLICK o E';
    planetHint.style.opacity = Math.min(1, (130 - distPlanet) / 70);
  } else {
    planetHint.textContent = '◈ PLANETA DETECTADO — HAZ CLICK ◈';
    planetHint.style.opacity = 0;
  }

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
