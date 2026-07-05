(function () {
  const meteor = document.querySelector("#meteor");
  const sky = document.querySelector(".sky");
  const ship = document.querySelector(".space-plane");
  const beam = document.querySelector("#beam");
  const impactRing = document.querySelector("#impact-ring");
  const floatingScore = document.querySelector("#floating-score");
  const shipBurst = document.querySelector("#ship-burst");
  const gameOverBanner = document.querySelector("#game-over-banner");
  const shieldDome = document.querySelector("#shield-dome");
  const speedBanner = document.querySelector("#speed-banner");
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
  let resolving = false;
  let currentAnswer = 0;
  let meteorY = 28;
  let meteorX = 50;
  let lastFrame = 0;
  let animationId = 0;
  let questionsResolved = 0;
  let speedLevel = 0;
  let fallSpeed = 58;
  let best = Number(localStorage.getItem("meteorMathBest") || 0);
  const crashImpactDelay = 680;
  const crashResolveDelay = 1650;
  bestEl.textContent = best;

  function restartAnimation(element, className) {
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
  }

  function playAnimation(element, animation) {
    element.style.animation = "none";
    void element.offsetWidth;
    element.style.animation = animation;
  }

  function clearEffectClasses() {
    sky.classList.remove("hit-flash", "miss-shake");
    meteor.classList.remove("hit", "dodge", "crash", "hidden");
    ship.classList.remove("fire", "destroyed");
    beam.classList.remove("fire", "miss");
    impactRing.classList.remove("fire");
    shieldDome.classList.remove("hit", "destroyed");
    floatingScore.classList.remove("show", "damage");
    shipBurst.classList.remove("show");
    gameOverBanner.classList.remove("show");
    speedBanner.classList.remove("show");
    floatingScore.textContent = "";
    [meteor, ship, beam, impactRing, shieldDome, floatingScore, shipBurst, gameOverBanner, speedBanner].forEach((element) => {
      element.style.animation = "";
    });
  }

  function setMeteorPosition(x, y) {
    meteorX = x;
    meteorY = y;
    meteor.style.left = `${meteorX}%`;
    meteor.style.top = `${meteorY}px`;
  }

  function positionElementAtMeteor(element) {
    const meteorRect = meteor.getBoundingClientRect();
    const skyRect = sky.getBoundingClientRect();
    element.style.left = `${meteorRect.left - skyRect.left + meteorRect.width / 2}px`;
    element.style.top = `${meteorRect.top - skyRect.top + meteorRect.height / 2}px`;
  }

  function showFloatingText(text, kind) {
    positionElementAtMeteor(floatingScore);
    floatingScore.textContent = text;
    floatingScore.classList.toggle("damage", kind === "damage");
    restartAnimation(floatingScore, "show");
    playAnimation(floatingScore, "scoreDissolve 1150ms ease-out forwards");
  }

  function showSpeedBanner() {
    restartAnimation(speedBanner, "show");
    playAnimation(speedBanner, "bannerPop 1700ms ease-out");
  }

  function showGameOver() {
    gameOverBanner.textContent = "Game Over";
    restartAnimation(ship, "destroyed");
    restartAnimation(shieldDome, "destroyed");
    restartAnimation(shipBurst, "show");
    restartAnimation(gameOverBanner, "show");
    playAnimation(ship, "fighterBreak 1400ms ease-out forwards");
    playAnimation(shieldDome, "shieldCollapse 1450ms ease-out forwards");
    playAnimation(shipBurst, "shipBurst 1250ms ease-out forwards");
    playAnimation(gameOverBanner, "gameOverPop 1800ms ease-out forwards");
    statusEl.textContent = "Game over.";
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

  function shuffle(values) {
    return values.sort(() => Math.random() - 0.5);
  }

  function makeProblem() {
    const max = Math.min(14, 5 + speedLevel + Math.floor(score / 110));
    const a = 1 + Math.floor(Math.random() * max);
    const b = 1 + Math.floor(Math.random() * max);
    currentAnswer = a + b;
    problemEl.textContent = `${a} + ${b}`;

    const wrongOne = currentAnswer + (Math.random() > 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 3));
    const wrongTwo = currentAnswer + (Math.random() > 0.5 ? 1 : -1) * (4 + Math.floor(Math.random() * 5));
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

  function setAnswersDisabled(disabled) {
    answersEl.querySelectorAll(".answer").forEach((button) => {
      button.disabled = disabled;
    });
  }

  function updateSpeedIfNeeded() {
    if (questionsResolved > 0 && questionsResolved % 5 === 0) {
      speedLevel += 1;
      fallSpeed += 16;
      return true;
    }
    return false;
  }

  function countResolvedQuestion() {
    questionsResolved += 1;
    return updateSpeedIfNeeded();
  }

  function announceSpeedUp() {
    statusEl.textContent = "Meteors are coming in faster.";
    showSpeedBanner();
  }

  function nextMeteor() {
    clearEffectClasses();
    resolving = false;
    setAnswersDisabled(false);
    setMeteorPosition(50, 28);
    makeProblem();
    lastFrame = performance.now();
    animationId = requestAnimationFrame(tick);
  }

  function fireBeam(kind) {
    restartAnimation(ship, "fire");
    restartAnimation(beam, kind === "miss" ? "miss" : "fire");
    playAnimation(ship, "planeRecoil 420ms ease-out");
    playAnimation(beam, kind === "miss" ? "beamMiss 520ms ease-out" : "beamFire 420ms ease-out");
  }

  function explodeMeteor(pointsEarned) {
    positionElementAtMeteor(impactRing);
    restartAnimation(impactRing, "fire");
    restartAnimation(meteor, "hit");
    restartAnimation(sky, "hit-flash");
    playAnimation(impactRing, "impactPop 900ms ease-out forwards");
    playAnimation(meteor, "meteorExplode 760ms ease-out forwards");
    showFloatingText(`+${pointsEarned}`, "score");
  }

  function crashIntoShield() {
    setMeteorPosition(50, 248);
    restartAnimation(meteor, "crash");
    restartAnimation(sky, "miss-shake");
    playAnimation(meteor, "meteorShieldCrash 760ms ease-in forwards");
    window.setTimeout(() => {
      restartAnimation(shieldDome, "hit");
      positionElementAtMeteor(impactRing);
      restartAnimation(impactRing, "fire");
      playAnimation(shieldDome, "shieldImpact 820ms ease-out");
      playAnimation(impactRing, "impactPop 900ms ease-out forwards");
      showFloatingText("-1 shield", "damage");
    }, crashImpactDelay);
  }

  function completeWrongAnswer(message, dodgeLaser) {
    if (!running || resolving) return;
    resolving = true;
    setAnswersDisabled(true);
    cancelAnimationFrame(animationId);
    streak = 0;
    shields -= 1;
    if (dodgeLaser) fireBeam("miss");
    statusEl.textContent = message;
    updateStats();

    if (dodgeLaser) {
      restartAnimation(meteor, "dodge");
      playAnimation(meteor, "meteorDodge 520ms ease-out forwards");
      window.setTimeout(crashIntoShield, 520);
    } else {
      crashIntoShield();
    }

    window.setTimeout(() => {
      const spedUp = countResolvedQuestion();
      if (shields <= 0) {
        stop();
        meteor.classList.add("hidden");
        showGameOver();
      } else {
        nextMeteor();
        if (spedUp) announceSpeedUp();
      }
    }, crashResolveDelay);
  }

  function choose(value) {
    if (!running || resolving) return;

    if (value === currentAnswer) {
      resolving = true;
      setAnswersDisabled(true);
      cancelAnimationFrame(animationId);
      streak += 1;
      const pointsEarned = 20 + streak * 3 + speedLevel * 2;
      score += pointsEarned;
      fireBeam("hit");
      explodeMeteor(pointsEarned);
      statusEl.textContent = "Direct hit.";
      updateStats();
      window.setTimeout(() => {
        const spedUp = countResolvedQuestion();
        nextMeteor();
        if (spedUp) announceSpeedUp();
      }, 1180);
      return;
    }

    completeWrongAnswer("The meteor dodged the laser.", true);
  }

  function tick(time) {
    if (!running || resolving) return;
    const delta = Math.min(40, time - lastFrame) / 1000;
    lastFrame = time;
    setMeteorPosition(meteorX, meteorY + fallSpeed * delta);

    if (meteorY > 302) {
      completeWrongAnswer("Meteor hit the space fighter.", false);
      return;
    }

    animationId = requestAnimationFrame(tick);
  }

  function start() {
    if (running) return;
    if (shields <= 0) reset();
    running = true;
    resolving = false;
    startButton.textContent = "Running";
    statusEl.textContent = "Pick the matching answer.";
    nextMeteor();
  }

  function stop() {
    running = false;
    resolving = false;
    startButton.textContent = "Restart";
    cancelAnimationFrame(animationId);
    setAnswersDisabled(true);
  }

  function reset() {
    stop();
    score = 0;
    shields = 3;
    streak = 0;
    questionsResolved = 0;
    speedLevel = 0;
    fallSpeed = 58;
    currentAnswer = 0;
    setMeteorPosition(50, 28);
    clearEffectClasses();
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
