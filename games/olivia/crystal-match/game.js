(function () {
  const board = document.querySelector("#board");
  const turnsEl = document.querySelector("#turns");
  const pairsEl = document.querySelector("#pairs");
  const timeEl = document.querySelector("#time");
  const bestEl = document.querySelector("#best");
  const statusEl = document.querySelector("#status");
  const startButton = document.querySelector("#start-button");
  const resetButton = document.querySelector("#reset-button");
  const freezeButton = document.querySelector("#freeze-button");
  const hintButton = document.querySelector("#hint-button");
  const scramblePanel = document.querySelector("#scramble-panel");
  const scrambleTitle = document.querySelector("#scramble-title");
  const scrambleLetters = document.querySelector("#scramble-letters");
  const scrambleAnswer = document.querySelector("#scramble-answer");
  const scrambleCancel = document.querySelector("#scramble-cancel");
  const gameOverOverlay = document.querySelector("#game-over-overlay");
  const freezeEffect = document.querySelector("#freeze-effect");
  const freezeTimer = document.querySelector("#freeze-timer");

  const colorMatches = [
    { value: "green", label: "Green", color: "#25a85a", ink: "#ffffff" },
    { value: "indigo", label: "Indigo", color: "#4b43b8", ink: "#ffffff" },
    { value: "yellow", label: "Yellow", color: "#ffd84d", ink: "#17202a" },
    { value: "pink", label: "Pink", color: "#ff83b7", ink: "#17202a" },
    { value: "blue", label: "Blue", color: "#2378ff", ink: "#ffffff" },
    { value: "red", label: "Red", color: "#e63535", ink: "#ffffff" },
  ];
  const gameDuration = 60;
  const scrambleWords = {
    freeze: ["cat", "dog", "sun", "hat", "box", "pig", "cup", "run", "map", "bed"],
    hint: ["frog", "milk", "star", "jump", "bird", "fish", "cake", "tree", "book", "moon"],
  };

  let deck = [];
  let firstCard = null;
  let lock = false;
  let turns = 0;
  let pairs = 0;
  let time = gameDuration;
  let running = false;
  let timer = null;
  let gameOverRevealTimer = null;
  let effectResumeTimer = null;
  let freezeCountdownTimer = null;
  let effectActive = false;
  let activeChallenge = null;
  let best = Number(localStorage.getItem("crystalMatchBest") || 0);

  function shuffle(values) {
    return values.sort(() => Math.random() - 0.5);
  }

  function updateStats() {
    turnsEl.textContent = turns;
    pairsEl.textContent = `${pairs}/${colorMatches.length}`;
    timeEl.textContent = time;
    bestEl.textContent = best ? `${best}s` : "--";
    const powerDisabled = Boolean(activeChallenge) || effectActive || time <= 0 || pairs === colorMatches.length;
    freezeButton.disabled = powerDisabled;
    hintButton.disabled = powerDisabled;
  }

  function buildDeck() {
    deck = shuffle(colorMatches.flatMap((color) => [
      { ...color, type: "word", id: `${color.value}-word` },
      { ...color, type: "gem", id: `${color.value}-gem` },
    ]));
  }

  function render() {
    board.innerHTML = "";
    deck.forEach((card) => {
      const button = document.createElement("button");
      button.className = "card";
      button.type = "button";
      button.dataset.value = card.value;
      button.dataset.label = card.label;
      button.dataset.type = card.type;
      button.dataset.id = card.id;
      button.style.setProperty("--card-color", card.color);
      button.style.setProperty("--card-ink", card.ink);
      button.setAttribute("aria-label", "Hidden crystal card");
      button.setAttribute("aria-pressed", "false");
      button.innerHTML = `
        <span class="card-face card-front"></span>
        <span class="card-face card-back card-${card.type}">
          ${card.type === "word" ? `<span class="card-label">${card.label}</span>` : '<span class="gem-shape" aria-hidden="true"></span>'}
        </span>
      `;
      board.appendChild(button);
    });
  }

  function cleanAnswer(value) {
    return value.trim().toLowerCase().replace(/[^a-z]/g, "");
  }

  function scrambleWord(word) {
    const letters = word.split("");
    for (let i = letters.length - 1; i > 0; i -= 1) {
      const swapIndex = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[swapIndex]] = [letters[swapIndex], letters[i]];
    }
    const scrambled = letters.join("");
    return scrambled === word ? `${word.slice(1)}${word[0]}` : scrambled;
  }

  function showChallenge(type) {
    if (!running) start();
    pauseTimer();
    const words = scrambleWords[type];
    const word = words[Math.floor(Math.random() * words.length)];
    const scrambled = scrambleWord(word);
    activeChallenge = { type, word };
    scramblePanel.hidden = false;
    scrambleTitle.textContent = type === "freeze" ? "Earn Freeze Time" : "Earn a Hint";
    scrambleLetters.innerHTML = scrambled
      .split("")
      .map((letter) => `<span>${letter.toUpperCase()}</span>`)
      .join("");
    scrambleAnswer.value = "";
    scrambleAnswer.maxLength = word.length;
    scrambleAnswer.focus();
    statusEl.textContent = "Unscramble the letters to earn the power.";
    updateStats();
  }

  function closeChallenge(resumeTimer = true) {
    activeChallenge = null;
    scramblePanel.hidden = true;
    scrambleAnswer.value = "";
    if (resumeTimer && running) startTimer();
    updateStats();
  }

  function startTimer() {
    if (timer) return;
    timer = window.setTimeout(() => {
      timer = null;
      if (!running || activeChallenge) return;
      time -= 1;
      updateStats();
      if (time <= 0) finish(false);
      else startTimer();
    }, 1000);
  }

  function pauseTimer() {
    window.clearTimeout(timer);
    timer = null;
  }

  function start() {
    if (running) return;
    running = true;
    startButton.textContent = "Running";
    statusEl.textContent = "Match each color word to its gem.";
    startTimer();
  }

  function finish(won) {
    running = false;
    pauseTimer();
    window.clearTimeout(gameOverRevealTimer);
    window.clearTimeout(effectResumeTimer);
    window.clearInterval(freezeCountdownTimer);
    effectActive = false;
    board.classList.remove("frozen-board");
    hideFreezeEffect();
    closeChallenge(false);
    startButton.textContent = won ? "Play Again" : "Restart";
    document.querySelectorAll(".card").forEach((card) => (card.disabled = true));
    if (won) {
      const elapsed = gameDuration - time;
      if (!best || elapsed < best) {
        best = elapsed;
        localStorage.setItem("crystalMatchBest", String(best));
      }
      statusEl.textContent = `All matched in ${elapsed} seconds.`;
    } else {
      board.classList.add("game-over-shake");
      statusEl.textContent = "Time ran out.";
      gameOverRevealTimer = window.setTimeout(() => {
        document.querySelectorAll(".card").forEach((card) => {
          card.setAttribute("aria-pressed", "true");
          card.setAttribute("aria-label", `${card.dataset.label} ${card.dataset.type} card`);
        });
        gameOverOverlay.classList.add("show");
        gameOverOverlay.setAttribute("aria-hidden", "false");
      }, 720);
    }
    updateStats();
  }

  function reset() {
    pauseTimer();
    window.clearTimeout(gameOverRevealTimer);
    window.clearTimeout(effectResumeTimer);
    window.clearInterval(freezeCountdownTimer);
    effectActive = false;
    closeChallenge(false);
    firstCard = null;
    lock = false;
    turns = 0;
    pairs = 0;
    time = gameDuration;
    running = false;
    startButton.textContent = "Start";
    statusEl.textContent = "Match words to gems.";
    board.classList.remove("game-over-shake");
    board.classList.remove("frozen-board");
    hideFreezeEffect();
    gameOverOverlay.classList.remove("show");
    gameOverOverlay.setAttribute("aria-hidden", "true");
    buildDeck();
    render();
    updateStats();
  }

  function useFreeze() {
    showChallenge("freeze");
  }

  function useHint() {
    showChallenge("hint");
  }

  function applyFreezeReward() {
    window.clearTimeout(effectResumeTimer);
    window.clearInterval(freezeCountdownTimer);
    pauseTimer();
    effectActive = true;
    board.classList.add("frozen-board");
    showFreezeEffect();
    statusEl.textContent = "Time frozen for 10 seconds.";
    let remaining = 10;
    freezeTimer.textContent = remaining;
    freezeCountdownTimer = window.setInterval(() => {
      remaining -= 1;
      freezeTimer.textContent = Math.max(0, remaining);
    }, 1000);
    effectResumeTimer = window.setTimeout(() => {
      window.clearInterval(freezeCountdownTimer);
      effectActive = false;
      board.classList.remove("frozen-board");
      hideFreezeEffect();
      if (running) {
        statusEl.textContent = "Timer restarted.";
        startTimer();
      }
      updateStats();
    }, 10000);
    updateStats();
  }

  function showFreezeEffect() {
    freezeEffect.classList.add("show");
    freezeEffect.setAttribute("aria-hidden", "false");
  }

  function hideFreezeEffect() {
    freezeEffect.classList.remove("show");
    freezeEffect.setAttribute("aria-hidden", "true");
    freezeTimer.textContent = "10";
  }

  function applyHintReward() {
    const candidates = colorMatches
      .map((color) => [
        document.querySelector(`.card[data-value="${color.value}"][data-type="word"]:not(.matched)`),
        document.querySelector(`.card[data-value="${color.value}"][data-type="gem"]:not(.matched)`),
      ])
      .filter((pair) => pair[0] && pair[1]);

    if (!candidates.length) return;

    window.clearTimeout(effectResumeTimer);
    pauseTimer();
    effectActive = true;
    const pair = candidates[Math.floor(Math.random() * candidates.length)];
    pair.forEach((card) => card.classList.add("hint-shake", "hint-grow"));
    statusEl.textContent = "Two matching cards are shaking.";
    effectResumeTimer = window.setTimeout(() => {
      pair.forEach((card) => card.classList.remove("hint-shake"));
      pair.forEach((card) => card.classList.remove("hint-grow"));
      effectActive = false;
      if (running) {
        statusEl.textContent = "Timer restarted.";
        startTimer();
      }
      updateStats();
    }, 2000);
    updateStats();
  }

  function flip(card) {
    if (!running) start();
    if (activeChallenge || lock || card.classList.contains("matched") || card === firstCard) return;

    card.setAttribute("aria-pressed", "true");
    card.setAttribute("aria-label", `${card.dataset.value} ${card.dataset.type} card`);

    if (!firstCard) {
      firstCard = card;
      return;
    }

    turns += 1;
    updateStats();

    if (firstCard.dataset.value === card.dataset.value && firstCard.dataset.type !== card.dataset.type) {
      firstCard.classList.add("matched");
      card.classList.add("matched");
      firstCard.disabled = true;
      card.disabled = true;
      firstCard = null;
      pairs += 1;
      statusEl.textContent = `${card.dataset.label} match found.`;
      updateStats();
      if (pairs === colorMatches.length) finish(true);
      return;
    }

    lock = true;
    statusEl.textContent = "Not a match. Watch where they land.";
    const previousFirstCard = firstCard;
    window.setTimeout(() => {
      if (!previousFirstCard || !card.isConnected) return;
      previousFirstCard.setAttribute("aria-pressed", "false");
      card.setAttribute("aria-pressed", "false");
      previousFirstCard.setAttribute("aria-label", "Hidden crystal card");
      card.setAttribute("aria-label", "Hidden crystal card");
      if (firstCard === previousFirstCard) firstCard = null;
      lock = false;
    }, 720);
  }

  board.addEventListener("click", (event) => {
    const card = event.target.closest(".card");
    if (card) flip(card);
  });

  startButton.addEventListener("click", () => {
    if (pairs === colorMatches.length || time <= 0) reset();
    start();
  });
  resetButton.addEventListener("click", reset);
  freezeButton.addEventListener("click", useFreeze);
  hintButton.addEventListener("click", useHint);
  scrambleCancel.addEventListener("click", () => closeChallenge(true));
  scramblePanel.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!activeChallenge) return;
    if (cleanAnswer(scrambleAnswer.value) !== activeChallenge.word) {
      statusEl.textContent = "Try that scramble again.";
      scrambleAnswer.select();
      return;
    }
    const challengeType = activeChallenge.type;
    closeChallenge(false);
    if (challengeType === "freeze") {
      applyFreezeReward();
    } else {
      applyHintReward();
    }
    updateStats();
  });
  reset();
})();
