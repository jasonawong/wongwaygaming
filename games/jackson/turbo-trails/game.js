(function () {
  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.querySelector("#score");
  const livesEl = document.querySelector("#lives");
  const speedEl = document.querySelector("#speed");
  const bestEl = document.querySelector("#best");
  const statusEl = document.querySelector("#status");
  const startButton = document.querySelector("#start-button");
  const resetButton = document.querySelector("#reset-button");
  const leftButton = document.querySelector("#left-button");
  const rightButton = document.querySelector("#right-button");

  const lanes = [canvas.width * 0.28, canvas.width * 0.5, canvas.width * 0.72];
  const car = { lane: 1, y: canvas.height - 122, width: 58, height: 86 };
  let obstacles = [];
  let bolts = [];
  let score = 0;
  let lives = 3;
  let speed = 3.2;
  let running = false;
  let lastSpawn = 0;
  let lastBolt = 0;
  let lastTime = 0;
  let best = Number(localStorage.getItem("turboTrailsBest") || 0);

  bestEl.textContent = best;

  function reset() {
    obstacles = [];
    bolts = [];
    score = 0;
    lives = 3;
    speed = 3.2;
    car.lane = 1;
    running = false;
    lastSpawn = 0;
    lastBolt = 0;
    statusEl.textContent = "Ready when you are.";
    updateStats();
    draw();
  }

  function updateStats() {
    scoreEl.textContent = score;
    livesEl.textContent = lives;
    speedEl.textContent = Math.max(1, Math.round(speed - 2));
    if (score > best) {
      best = score;
      localStorage.setItem("turboTrailsBest", String(best));
      bestEl.textContent = best;
    }
  }

  function move(direction) {
    car.lane = Math.max(0, Math.min(2, car.lane + direction));
  }

  function spawnObstacle() {
    const occupied = Math.floor(Math.random() * lanes.length);
    obstacles.push({
      lane: occupied,
      y: -80,
      width: 62,
      height: 68,
      passed: false,
    });
  }

  function spawnBolt() {
    bolts.push({
      lane: Math.floor(Math.random() * lanes.length),
      y: -50,
      size: 34,
    });
  }

  function overlaps(item, width, height) {
    const carX = lanes[car.lane] - car.width / 2;
    const itemX = lanes[item.lane] - width / 2;
    return (
      carX < itemX + width &&
      carX + car.width > itemX &&
      car.y < item.y + height &&
      car.y + car.height > item.y
    );
  }

  function step(time) {
    if (!running) return;
    const delta = Math.min(32, time - lastTime);
    lastTime = time;
    speed += delta * 0.0007;

    if (time - lastSpawn > Math.max(520, 1180 - speed * 95)) {
      spawnObstacle();
      lastSpawn = time;
    }
    if (time - lastBolt > Math.max(760, 1450 - speed * 60)) {
      spawnBolt();
      lastBolt = time;
    }

    obstacles.forEach((obstacle) => {
      obstacle.y += speed * delta * 0.085;
      if (!obstacle.passed && obstacle.y > car.y + car.height) {
        obstacle.passed = true;
        score += 5;
      }
    });

    bolts.forEach((bolt) => {
      bolt.y += speed * delta * 0.075;
    });

    obstacles = obstacles.filter((obstacle) => {
      if (overlaps(obstacle, obstacle.width, obstacle.height)) {
        lives -= 1;
        statusEl.textContent = lives > 0 ? "Cone hit. Stay with it." : "Game over. Try another run.";
        return false;
      }
      return obstacle.y < canvas.height + 100;
    });

    bolts = bolts.filter((bolt) => {
      if (overlaps(bolt, bolt.size, bolt.size)) {
        score += 20;
        statusEl.textContent = "Bolt collected.";
        return false;
      }
      return bolt.y < canvas.height + 60;
    });

    updateStats();
    draw();

    if (lives <= 0) {
      running = false;
      startButton.textContent = "Restart";
      return;
    }

    requestAnimationFrame(step);
  }

  function drawRoad() {
    ctx.fillStyle = "#26313a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#3a4951";
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.18, 0);
    ctx.lineTo(canvas.width * 0.82, 0);
    ctx.lineTo(canvas.width * 0.95, canvas.height);
    ctx.lineTo(canvas.width * 0.05, canvas.height);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#f5f2ea";
    ctx.lineWidth = 8;
    ctx.setLineDash([34, 28]);
    [canvas.width * 0.39, canvas.width * 0.61].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    });
    ctx.setLineDash([]);
  }

  function drawCar() {
    const x = lanes[car.lane] - car.width / 2;
    ctx.fillStyle = "#f25f5c";
    ctx.fillRect(x, car.y, car.width, car.height);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(x + 10, car.y + 12, car.width - 20, 24);
    ctx.fillStyle = "#17202a";
    ctx.fillRect(x - 8, car.y + 12, 10, 20);
    ctx.fillRect(x + car.width - 2, car.y + 12, 10, 20);
    ctx.fillRect(x - 8, car.y + 54, 10, 20);
    ctx.fillRect(x + car.width - 2, car.y + 54, 10, 20);
  }

  function drawCone(obstacle) {
    const x = lanes[obstacle.lane];
    ctx.fillStyle = "#f3b33d";
    ctx.beginPath();
    ctx.moveTo(x, obstacle.y);
    ctx.lineTo(x - obstacle.width / 2, obstacle.y + obstacle.height);
    ctx.lineTo(x + obstacle.width / 2, obstacle.y + obstacle.height);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(x - 24, obstacle.y + 42, 48, 8);
  }

  function drawBolt(bolt) {
    const x = lanes[bolt.lane];
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.moveTo(x + 6, bolt.y);
    ctx.lineTo(x - 18, bolt.y + 34);
    ctx.lineTo(x, bolt.y + 34);
    ctx.lineTo(x - 8, bolt.y + 68);
    ctx.lineTo(x + 20, bolt.y + 24);
    ctx.lineTo(x + 2, bolt.y + 24);
    ctx.closePath();
    ctx.fill();
  }

  function draw() {
    drawRoad();
    bolts.forEach(drawBolt);
    obstacles.forEach(drawCone);
    drawCar();
    if (!running) {
      ctx.fillStyle = "rgba(23, 32, 42, 0.7)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 44px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(lives <= 0 ? "Game Over" : "Turbo Trails", canvas.width / 2, canvas.height / 2 - 12);
      ctx.font = "bold 24px system-ui, sans-serif";
      ctx.fillText("Press Start or Space", canvas.width / 2, canvas.height / 2 + 34);
    }
  }

  function start() {
    if (lives <= 0) reset();
    if (!running) {
      running = true;
      lastTime = performance.now();
      startButton.textContent = "Running";
      statusEl.textContent = "Go.";
      requestAnimationFrame(step);
    }
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

  reset();
})();
