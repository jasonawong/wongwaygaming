(function () {
  const meteor = document.querySelector("#meteor");
  const problemEl = document.querySelector("#problem");
  const answersEl = document.querySelector("#answers");
  const scoreEl = document.querySelector("#score");
  const shieldsEl = document.querySelector("#shields");
  const streakEl = document.querySelector("#streak");
  const bestEl = document.querySelector("#best");
  const statusEl = document.querySelector("#status");
  const startButton = document.querySelector("#start-button");
  const resetButton = document.querySelector("#reset-button");

  let score = 0;
  let shields = 3;
  let streak = 0;
  let running = false;
  let currentAnswer = 0;
  let fallTimer = null;
  let topPosition = 28;
  let best = Number(localStorage.getItem("meteorMathBest") || 0);
  bestEl.textContent = best;

  function shuffle(values) {
    return values.sort(() => Math.random() - 0.5);
  }

  function updateStats() {
    scoreEl.textContent = score;
    shieldsEl.textContent = shields;
    streakEl.textContent = streak;
    if (score > best) {
      best = score;
      localStorage.setItem("meteorMathBest", String(best));
      bestEl.textContent = best;
    }
  }

  function makeProblem() {
    const max = Math.min(12, 5 + Math.floor(score / 60));
    const a = 1 + Math.floor(Math.random() * max);
    const b = 1 + Math.floor(Math.random() * max);
    currentAnswer = a + b;
    problemEl.textContent = `${a} + ${b}`;

    const wrongOne = currentAnswer + (Math.random() > 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 3));
    const wrongTwo = currentAnswer + (Math.random() > 0.5 ? 1 : -1) * (4 + Math.floor(Math.random() * 4));
    const choices = shuffle([currentAnswer, Math.max(1, wrongOne), Math.max(1, wrongTwo)]);
    answersEl.innerHTML = "";
    choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.className = "answer";
      button.type = "button";
      button.textContent = choice;
      button.dataset.choice = choice;
      button.setAttribute("aria-label", `Answer ${index + 1}: ${choice}`);
      answersEl.appendChild(button);
    });
  }

  function nextMeteor() {
    topPosition = 28;
    meteor.style.top = `${topPosition}px`;
    makeProblem();
  }

  function miss() {
    shields -= 1;
    streak = 0;
    statusEl.textContent = shields > 0 ? "Meteor slipped through. New target." : "Shields down. Start again?";
    updateStats();
    if (shields <= 0) {
      stop();
    } else {
      nextMeteor();
    }
  }

  function tick() {
    topPosition += 10 + Math.floor(score / 80);
    meteor.style.top = `${topPosition}px`;
    if (topPosition > 330) miss();
  }

  function choose(value) {
    if (!running) return;
    if (value === currentAnswer) {
      streak += 1;
      score += 20 + streak * 3;
      statusEl.textContent = "Direct hit.";
      updateStats();
      nextMeteor();
    } else {
      statusEl.textContent = "Close, but not that one.";
      miss();
    }
  }

  function start() {
    if (running) return;
    if (shields <= 0) reset();
    running = true;
    startButton.textContent = "Running";
    statusEl.textContent = "Pick the matching answer.";
    nextMeteor();
    fallTimer = window.setInterval(tick, 650);
  }

  function stop() {
    running = false;
    startButton.textContent = "Restart";
    window.clearInterval(fallTimer);
  }

  function reset() {
    stop();
    score = 0;
    shields = 3;
    streak = 0;
    topPosition = 28;
    meteor.style.top = `${topPosition}px`;
    problemEl.textContent = "?";
    answersEl.innerHTML = "";
    statusEl.textContent = "Start a round to load the first meteor.";
    startButton.textContent = "Start";
    updateStats();
  }

  answersEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-choice]");
    if (button) choose(Number(button.dataset.choice));
  });

  document.addEventListener("keydown", (event) => {
    const index = Number(event.key) - 1;
    if (index >= 0 && index < answersEl.children.length) {
      choose(Number(answersEl.children[index].dataset.choice));
    }
  });

  startButton.addEventListener("click", start);
  resetButton.addEventListener("click", reset);
  reset();
})();
