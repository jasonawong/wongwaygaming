(function () {
  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.querySelector("#score");
  const heartsEl = document.querySelector("#hearts");
  const comboEl = document.querySelector("#combo");
  const bestEl = document.querySelector("#best");
  const statusEl = document.querySelector("#status");
  const startButton = document.querySelector("#start-button");
  const resetButton = document.querySelector("#reset-button");
  const leftButton = document.querySelector("#left-button");
  const rightButton = document.querySelector("#right-button");

  const basket = { x: canvas.width / 2 - 80, y: canvas.height - 88, width: 160, height: 44, velocity: 0 };
  let treats = [];
  let score = 0;
  let hearts = 3;
  let combo = 0;
  let running = false;
  let lastTime = 0;
  let lastDrop = 0;
  let pointerActive = false;
  let best = Number(localStorage.getItem("cupcakeCascadeBest") || 0);
  bestEl.textContent = best;

  function updateStats() {
    scoreEl.textContent = score;
    heartsEl.textContent = hearts;
    comboEl.textContent = combo;
    if (score > best) {
      best = score;
      localStorage.setItem("cupcakeCascadeBest", String(best));
      bestEl.textContent = best;
    }
  }

  function reset() {
    treats = [];
    score = 0;
    hearts = 3;
    combo = 0;
    running = false;
    basket.x = canvas.width / 2 - basket.width / 2;
    basket.velocity = 0;
    startButton.textContent = "Start";
    statusEl.textContent = "Ready to bake a high score.";
    updateStats();
    draw();
  }

  function start() {
    if (hearts <= 0) reset();
    if (!running) {
      running = true;
      startButton.textContent = "Running";
      statusEl.textContent = "Catch the fresh ones.";
      lastTime = performance.now();
      requestAnimationFrame(step);
    }
  }

  function dropTreat() {
    const burnt = Math.random() < 0.22;
    treats.push({
      x: 50 + Math.random() * (canvas.width - 100),
      y: -40,
      radius: burnt ? 28 : 25,
      speed: 2.8 + Math.random() * 2.2 + score / 220,
      burnt,
    });
  }

  function collect(treat) {
    const overlapsX = treat.x > basket.x - treat.radius && treat.x < basket.x + basket.width + treat.radius;
    const overlapsY = treat.y + treat.radius > basket.y && treat.y - treat.radius < basket.y + basket.height;
    return overlapsX && overlapsY;
  }

  function step(time) {
    if (!running) return;
    const delta = Math.min(32, time - lastTime);
    lastTime = time;

    if (!pointerActive) {
      basket.x += basket.velocity * delta * 0.42;
      basket.x = Math.max(0, Math.min(canvas.width - basket.width, basket.x));
    }

    if (time - lastDrop > Math.max(430, 960 - score * 2.5)) {
      dropTreat();
      lastDrop = time;
    }

    treats.forEach((treat) => {
      treat.y += treat.speed * delta * 0.12;
    });

    treats = treats.filter((treat) => {
      if (collect(treat)) {
        if (treat.burnt) {
          hearts -= 1;
          combo = 0;
          statusEl.textContent = hearts > 0 ? "Burnt cupcake. Shake it off." : "Out of hearts. Fresh run?";
        } else {
          combo += 1;
          score += 10 + combo * 2;
          statusEl.textContent = combo >= 5 ? "Sweet combo." : "Cupcake caught.";
        }
        updateStats();
        return false;
      }

      if (treat.y > canvas.height + 50) {
        if (!treat.burnt) combo = 0;
        return false;
      }
      return true;
    });

    draw();
    if (hearts <= 0) {
      running = false;
      startButton.textContent = "Restart";
      return;
    }
    requestAnimationFrame(step);
  }

  function drawBackground() {
    ctx.fillStyle = "#f9efe8";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#bfe8dd";
    for (let x = 0; x < canvas.width; x += 90) {
      ctx.beginPath();
      ctx.arc(x, 90, 46, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#fff6f1";
    ctx.fillRect(0, canvas.height - 118, canvas.width, 118);
  }

  function drawCupcake(treat) {
    ctx.save();
    ctx.translate(treat.x, treat.y);
    ctx.fillStyle = treat.burnt ? "#49312a" : "#ff8fb3";
    ctx.beginPath();
    ctx.arc(0, -8, treat.radius, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = treat.burnt ? "#2f201c" : "#f3b33d";
    ctx.beginPath();
    ctx.moveTo(-24, -4);
    ctx.lineTo(24, -4);
    ctx.lineTo(15, 30);
    ctx.lineTo(-15, 30);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = treat.burnt ? "#777" : "#f25f5c";
    ctx.beginPath();
    ctx.arc(4, -30, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBasket() {
    ctx.fillStyle = "#087f8c";
    ctx.fillRect(basket.x, basket.y, basket.width, basket.height);
    ctx.fillStyle = "#0b5e68";
    ctx.fillRect(basket.x + 12, basket.y + 12, basket.width - 24, 12);
    ctx.strokeStyle = "#17202a";
    ctx.lineWidth = 5;
    ctx.strokeRect(basket.x, basket.y, basket.width, basket.height);
  }

  function draw() {
    drawBackground();
    treats.forEach(drawCupcake);
    drawBasket();
    if (!running) {
      ctx.fillStyle = "rgba(251, 250, 247, 0.78)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#17202a";
      ctx.font = "bold 44px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(hearts <= 0 ? "Game Over" : "Cupcake Cascade", canvas.width / 2, canvas.height / 2 - 12);
      ctx.font = "bold 24px system-ui, sans-serif";
      ctx.fillText("Press Start or Space", canvas.width / 2, canvas.height / 2 + 34);
    }
  }

  function setVelocity(direction) {
    pointerActive = false;
    basket.velocity = direction;
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") setVelocity(-1);
    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") setVelocity(1);
    if (event.code === "Space") start();
  });
  document.addEventListener("keyup", (event) => {
    if (["ArrowLeft", "ArrowRight", "a", "d", "A", "D"].includes(event.key)) basket.velocity = 0;
  });

  canvas.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    pointerActive = true;
    basket.x = (event.clientX - rect.left) * scale - basket.width / 2;
    basket.x = Math.max(0, Math.min(canvas.width - basket.width, basket.x));
  });
  canvas.addEventListener("pointerleave", () => {
    pointerActive = false;
  });

  leftButton.addEventListener("pointerdown", () => setVelocity(-1));
  rightButton.addEventListener("pointerdown", () => setVelocity(1));
  leftButton.addEventListener("pointerup", () => (basket.velocity = 0));
  rightButton.addEventListener("pointerup", () => (basket.velocity = 0));
  startButton.addEventListener("click", start);
  resetButton.addEventListener("click", reset);
  reset();
})();
