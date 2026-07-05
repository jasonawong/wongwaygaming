const canvas = document.querySelector("#game");
const scoreEl = document.querySelector("#score");
const livesEl = document.querySelector("#lives");
const speedEl = document.querySelector("#speed");
const bestEl = document.querySelector("#best");
const statusEl = document.querySelector("#status");
const startButton = document.querySelector("#start-button");
const resetButton = document.querySelector("#reset-button");
const leftButton = document.querySelector("#left-button");
const rightButton = document.querySelector("#right-button");

if (!window.THREE) {
  statusEl.textContent = "3D engine could not load. Check your internet connection or open from GitHub Pages.";
  startButton.disabled = true;
  resetButton.disabled = true;
  leftButton.disabled = true;
  rightButton.disabled = true;
  throw new Error("Three.js failed to load.");
}

const lanes = [-3.2, 0, 3.2];
const player = {
  lane: 1,
  x: lanes[1],
  z: 8.2,
  targetX: lanes[1],
  invulnerableUntil: 0
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02040a);
scene.fog = new THREE.FogExp2(0x041126, 0.027);

const camera = new THREE.PerspectiveCamera(64, 4 / 3, 0.1, 180);
camera.position.set(0, 6.8, 18.5);
camera.lookAt(0, 0.55, -38);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.36;

const materials = {
  carbon: new THREE.MeshPhysicalMaterial({
    color: 0x02050b,
    metalness: 0.85,
    roughness: 0.24,
    clearcoat: 1,
    clearcoatRoughness: 0.16
  }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0x66f7ff,
    emissive: 0x19dfff,
    emissiveIntensity: 1.3,
    metalness: 0.1,
    roughness: 0.08,
    transmission: 0.25,
    transparent: true,
    opacity: 0.78
  }),
  pearlPaint: new THREE.MeshPhysicalMaterial({
    color: 0xf3f8fb,
    metalness: 0.58,
    roughness: 0.18,
    clearcoat: 1,
    clearcoatRoughness: 0.08
  }),
  blackGlass: new THREE.MeshPhysicalMaterial({
    color: 0x06111d,
    emissive: 0x0c5f73,
    emissiveIntensity: 0.18,
    metalness: 0.2,
    roughness: 0.06,
    transparent: true,
    opacity: 0.86,
    clearcoat: 1
  }),
  tire: new THREE.MeshPhysicalMaterial({
    color: 0x050507,
    metalness: 0.5,
    roughness: 0.34,
    clearcoat: 0.45
  }),
  cyan: new THREE.MeshBasicMaterial({ color: 0x5ff7ff, toneMapped: false }),
  magenta: new THREE.MeshBasicMaterial({ color: 0xff38d4, toneMapped: false }),
  amber: new THREE.MeshBasicMaterial({ color: 0xffd66b, toneMapped: false }),
  red: new THREE.MeshBasicMaterial({ color: 0xff3c6a, toneMapped: false }),
  track: new THREE.MeshPhysicalMaterial({
    color: 0x050914,
    metalness: 0.55,
    roughness: 0.18,
    clearcoat: 0.8,
    clearcoatRoughness: 0.12
  }),
  darkGlass: new THREE.MeshPhysicalMaterial({
    color: 0x071423,
    metalness: 0.6,
    roughness: 0.22,
    clearcoat: 0.7,
    transparent: true,
    opacity: 0.8
  })
};

const obstacleGeometry = new THREE.BoxGeometry(1.28, 1.5, 0.5);
const pickupGeometry = new THREE.OctahedronGeometry(0.58, 2);
const items = [];
const stars = [];
let score = 0;
let lives = 5;
let speed = 10;
let running = false;
let lastTime = 0;
let lastObstacle = 0;
let lastPickup = 0;
let roadOffset = 0;
let best = Number(localStorage.getItem("turboTrailsBest") || 0);
const gridLoopLength = 125;
const cityLoopLength = 140.4;

bestEl.textContent = best;

const world = new THREE.Group();
scene.add(world);

function makeGlowPlane(color, width, height, opacity) {
  const canvasTexture = document.createElement("canvas");
  canvasTexture.width = 128;
  canvasTexture.height = 128;
  const ctx = canvasTexture.getContext("2d");
  const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`);
  gradient.addColorStop(0.42, `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity * 0.42})`);
  gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvasTexture);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
}

function addBox(parent, size, position, material, shadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
  mesh.position.copy(position);
  mesh.castShadow = shadow;
  mesh.receiveShadow = shadow;
  parent.add(mesh);
  return mesh;
}

function buildArena() {
  const ambient = new THREE.HemisphereLight(0x7befff, 0x05020a, 1.2);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xd9fbff, 2.2);
  key.position.set(-6, 12, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -14;
  key.shadow.camera.right = 14;
  key.shadow.camera.top = 16;
  key.shadow.camera.bottom = -26;
  scene.add(key);

  const cyanLight = new THREE.PointLight(0x3ceeff, 25, 35, 1.8);
  cyanLight.position.set(-5.8, 2.2, 2);
  scene.add(cyanLight);

  const magentaLight = new THREE.PointLight(0xff28d7, 22, 34, 1.8);
  magentaLight.position.set(5.8, 2.2, -8);
  scene.add(magentaLight);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(13.5, 0.18, 190), materials.track);
  floor.position.set(0, -0.12, -50);
  floor.receiveShadow = true;
  world.add(floor);

  for (let i = -1; i <= 1; i += 1) {
    const laneGlow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.045, 190), i === 0 ? materials.cyan : materials.magenta);
    laneGlow.position.set(lanes[i + 1], 0.03, -50);
    world.add(laneGlow);
  }

  [-5.2, 5.2].forEach((x, index) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 190), index === 0 ? materials.cyan : materials.magenta);
    rail.position.set(x, 0.22, -50);
    world.add(rail);
    const railGlow = makeGlowPlane(index === 0 ? { r: 95, g: 247, b: 255 } : { r: 255, g: 56, b: 212 }, 2.2, 190, 0.36);
    railGlow.position.set(x, 0.25, -50);
    railGlow.rotation.x = -Math.PI / 2;
    world.add(railGlow);
  });

  for (let z = 8; z > -118; z -= 5) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.035, 0.05), z % 10 === 3 ? materials.magenta : materials.cyan);
    line.position.set(0, 0.04, z);
    line.userData.baseZ = z;
    line.userData.gridLine = true;
    world.add(line);
  }

  for (let row = 0; row < 26; row += 1) {
    const z = 8 - row * 5.4;
    [-8.8, 8.8].forEach((x, side) => {
      const height = 1.8 + Math.random() * 7.5;
      const building = new THREE.Mesh(
        new THREE.BoxGeometry(1.2 + Math.random() * 1.8, height, 1.2 + Math.random() * 2.4),
        materials.darkGlass
      );
      building.position.set(x + (side === 0 ? -Math.random() * 4 : Math.random() * 4), height / 2 - 0.12, z);
      building.userData.baseZ = z;
      building.castShadow = true;
      building.receiveShadow = true;
      world.add(building);

      const cap = new THREE.Mesh(new THREE.BoxGeometry(building.geometry.parameters.width * 0.84, 0.08, 0.08), side === 0 ? materials.cyan : materials.magenta);
      cap.position.set(building.position.x, height + 0.04, z - building.geometry.parameters.depth * 0.48);
      cap.userData.baseZ = z;
      world.add(cap);
    });
  }

  const starGeo = new THREE.BufferGeometry();
  const positions = [];
  for (let i = 0; i < 320; i += 1) {
    positions.push((Math.random() - 0.5) * 90, 6 + Math.random() * 42, -120 + Math.random() * 140);
  }
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xbefbff,
    size: 0.08,
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });
  const starField = new THREE.Points(starGeo, starMat);
  stars.push(starField);
  scene.add(starField);
}

function buildLightRunner() {
  const group = new THREE.Group();
  group.position.set(player.x, 0.68, player.z);

  const lowerBody = addBox(group, new THREE.Vector3(1.72, 0.34, 2.72), new THREE.Vector3(0, 0.1, 0), materials.pearlPaint);
  lowerBody.scale.set(1, 0.92, 1);
  const frontNose = addBox(group, new THREE.Vector3(1.48, 0.2, 0.78), new THREE.Vector3(0, 0.18, -1.54), materials.pearlPaint);
  frontNose.rotation.x = -0.08;
  const rearDeck = addBox(group, new THREE.Vector3(1.56, 0.22, 0.72), new THREE.Vector3(0, 0.22, 1.42), materials.pearlPaint);
  rearDeck.rotation.x = 0.06;
  const cabin = addBox(group, new THREE.Vector3(1.18, 0.48, 1.2), new THREE.Vector3(0, 0.48, -0.1), materials.blackGlass);
  cabin.scale.set(0.92, 0.86, 1);
  cabin.rotation.x = -0.04;
  addBox(group, new THREE.Vector3(1.02, 0.05, 1.34), new THREE.Vector3(0, 0.76, -0.1), materials.glass, false);
  addBox(group, new THREE.Vector3(1.82, 0.08, 0.16), new THREE.Vector3(0, 0.3, -1.88), materials.cyan, false);
  addBox(group, new THREE.Vector3(1.58, 0.08, 0.14), new THREE.Vector3(0, 0.3, 1.78), materials.red, false);
  addBox(group, new THREE.Vector3(0.08, 0.1, 2.48), new THREE.Vector3(-0.94, 0.22, 0), materials.magenta, false);
  addBox(group, new THREE.Vector3(0.08, 0.1, 2.48), new THREE.Vector3(0.94, 0.22, 0), materials.magenta, false);
  addBox(group, new THREE.Vector3(1.36, 0.08, 0.12), new THREE.Vector3(0, -0.08, -1.08), materials.carbon);
  addBox(group, new THREE.Vector3(1.28, 0.08, 0.12), new THREE.Vector3(0, -0.08, 1.08), materials.carbon);

  const wheelGlow = new THREE.MeshBasicMaterial({ color: 0x5ff7ff, toneMapped: false });
  const rimMetal = new THREE.MeshPhysicalMaterial({
    color: 0xc8d3d8,
    metalness: 0.9,
    roughness: 0.16,
    clearcoat: 0.7
  });
  [-0.84, 0.84].forEach((x) => {
    [-0.96, 0.96].forEach((z) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.2, 48), materials.tire);
      wheel.position.set(x, -0.12, z);
      wheel.rotation.z = Math.PI / 2;
      wheel.castShadow = true;
      group.add(wheel);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.026, 8, 44), rimMetal);
      rim.position.copy(wheel.position);
      rim.rotation.y = Math.PI / 2;
      group.add(rim);
      const glowRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.012, 8, 44), wheelGlow);
      glowRing.position.copy(wheel.position);
      glowRing.rotation.y = Math.PI / 2;
      group.add(glowRing);
    });
  });

  const trail = makeGlowPlane({ r: 95, g: 247, b: 255 }, 1.7, 5.8, 0.38);
  trail.position.set(0, 0.01, 4.1);
  trail.rotation.x = -Math.PI / 2;
  group.add(trail);
  group.userData.trail = trail;
  scene.add(group);
  return group;
}

const runner = buildLightRunner();
buildArena();

function makeBarrier(lane) {
  const group = new THREE.Group();
  group.position.set(lanes[lane], 0.92, -90);
  group.userData = { type: "barrier", lane, hit: false };
  addBox(group, new THREE.Vector3(1.72, 1.64, 0.38), new THREE.Vector3(0, 0, 0), materials.red);
  addBox(group, new THREE.Vector3(2.1, 0.08, 0.48), new THREE.Vector3(0, 0.86, 0), materials.amber, false);
  const glow = makeGlowPlane({ r: 255, g: 60, b: 106 }, 4, 3.2, 0.5);
  glow.position.set(0, 0, 0.04);
  group.add(glow);
  scene.add(group);
  items.push(group);
}

function makeEnergyCore(lane) {
  const group = new THREE.Group();
  group.position.set(lanes[lane], 1.06, -90);
  group.userData = { type: "core", lane };
  const core = new THREE.Mesh(pickupGeometry, materials.amber);
  group.add(core);
  const glow = makeGlowPlane({ r: 255, g: 214, b: 107 }, 3, 3, 0.52);
  glow.position.set(0, 0, 0);
  group.add(glow);
  scene.add(group);
  items.push(group);
}

function spawnObjects(time) {
  if (time - lastObstacle > Math.max(1200, 2600 - speed * 42)) {
    makeBarrier(Math.floor(Math.random() * lanes.length));
    lastObstacle = time;
  }
  if (time - lastPickup > Math.max(1350, 3100 - speed * 36)) {
    makeEnergyCore(Math.floor(Math.random() * lanes.length));
    lastPickup = time;
  }
}

function move(direction) {
  player.lane = Math.max(0, Math.min(2, player.lane + direction));
  player.targetX = lanes[player.lane];
}

function updateStats() {
  scoreEl.textContent = score;
  livesEl.textContent = lives;
  speedEl.textContent = Math.max(1, Math.round((speed - 7) / 4));
  if (score > best) {
    best = score;
    localStorage.setItem("turboTrailsBest", String(best));
    bestEl.textContent = best;
  }
}

function clearItems() {
  while (items.length) {
    const item = items.pop();
    scene.remove(item);
    item.traverse((child) => {
      if (child.geometry && child.geometry !== obstacleGeometry && child.geometry !== pickupGeometry) child.geometry.dispose();
    });
  }
}

function reset() {
  clearItems();
  score = 0;
  lives = 5;
  speed = 10;
  roadOffset = 0;
  running = false;
  lastObstacle = 0;
  lastPickup = 0;
  player.lane = 1;
  player.x = lanes[1];
  player.targetX = lanes[1];
  player.invulnerableUntil = 0;
  runner.position.x = player.x;
  runner.rotation.set(0, 0, 0);
  startButton.textContent = "Start";
  statusEl.textContent = "Ready when you are.";
  updateStats();
  render(0);
}

function handleCollisions(time) {
  const collisionZ = player.z - 0.6;
  for (const item of [...items]) {
    const closeInZ = Math.abs(item.position.z - collisionZ) < 1.15;
    const sameLane = item.userData.lane === player.lane;
    if (!closeInZ || !sameLane) continue;

    if (item.userData.type === "core") {
      score += 25;
      statusEl.textContent = "Energy core captured.";
      scene.remove(item);
      items.splice(items.indexOf(item), 1);
    } else if (time > player.invulnerableUntil && !item.userData.hit) {
      lives -= 1;
      item.userData.hit = true;
      player.invulnerableUntil = time + 1800;
      statusEl.textContent = lives > 0 ? "Light barrier clipped. Re-center." : "Game over. Grid offline.";
      runner.rotation.z = player.x < 0 ? 0.18 : -0.18;
    }
  }
}

function updateWorld(delta, time) {
  speed += delta * 0.00055;
  const trackTravel = speed * delta * 0.00062;
  roadOffset += trackTravel;
  world.children.forEach((child) => {
    if (child.userData.gridLine) {
      let z = child.userData.baseZ + roadOffset;
      while (z > 12) z -= gridLoopLength;
      child.position.z = z;
    }
    if (child.userData.baseZ !== undefined && !child.userData.gridLine) {
      let z = child.userData.baseZ + roadOffset;
      while (z > 15) z -= cityLoopLength;
      child.position.z = z;
    }
  });

  player.x += (player.targetX - player.x) * Math.min(1, delta * 0.014);
  runner.position.x = player.x;
  runner.rotation.z += (((player.targetX - player.x) * -0.08) - runner.rotation.z) * 0.14;
  runner.userData.trail.material.opacity = 0.56 + Math.sin(time * 0.012) * 0.16;

  for (const item of [...items]) {
    item.position.z += trackTravel;
    item.rotation.y += delta * 0.0015;
    item.rotation.x += item.userData.type === "core" ? delta * 0.0015 : 0;
    if (item.position.z > 16) {
      if (item.userData.type === "barrier" && !item.userData.hit) score += 5;
      scene.remove(item);
      items.splice(items.indexOf(item), 1);
    }
  }

  camera.position.x += (player.x * 0.2 - camera.position.x) * 0.06;
  camera.lookAt(player.x * 0.14, 0.55, -38);
  handleCollisions(time);
  updateStats();
}

function render(time) {
  stars.forEach((star) => {
    star.rotation.y = time * 0.000025;
  });
  renderer.render(scene, camera);
}

function step(time) {
  if (!running) {
    render(time);
    return;
  }
  const delta = Math.min(36, time - lastTime);
  lastTime = time;
  spawnObjects(time);
  updateWorld(delta, time);
  render(time);

  if (lives <= 0) {
    running = false;
    startButton.textContent = "Restart";
    return;
  }

  requestAnimationFrame(step);
}

function start() {
  if (lives <= 0) reset();
  if (!running) {
    running = true;
    lastTime = performance.now();
    lastObstacle = lastTime + 900;
    lastPickup = lastTime + 500;
    startButton.textContent = "Running";
    statusEl.textContent = "Grid online.";
    requestAnimationFrame(step);
  }
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(320, Math.round(rect.width));
  const height = Math.max(260, Math.round(rect.height));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  render(performance.now());
}

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") move(-1);
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") move(1);
  if (event.code === "Space") start();
});

leftButton.addEventListener("click", () => move(-1));
rightButton.addEventListener("click", () => move(1));
startButton.addEventListener("click", start);
resetButton.addEventListener("click", reset);
window.addEventListener("resize", resize);

resize();
reset();
