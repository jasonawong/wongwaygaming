(function () {
  const board = document.querySelector("#board");
  const turnsEl = document.querySelector("#turns");
  const pairsEl = document.querySelector("#pairs");
  const timeEl = document.querySelector("#time");
  const bestEl = document.querySelector("#best");
  const statusEl = document.querySelector("#status");
  const startButton = document.querySelector("#start-button");
  const resetButton = document.querySelector("#reset-button");

  const crystals = [
    { value: "ruby", color: "#f25f5c" },
    { value: "sun", color: "#f3b33d" },
    { value: "jade", color: "#2d9a62" },
    { value: "aqua", color: "#087f8c" },
    { value: "violet", color: "#6d5dfc" },
    { value: "rose", color: "#ff8fb3" },
  ];

  let deck = [];
  let firstCard = null;
  let lock = false;
  let turns = 0;
  let pairs = 0;
  let time = 60;
  let running = false;
  let timer = null;
  let best = Number(localStorage.getItem("crystalMatchBest") || 0);

  function shuffle(values) {
    return values.sort(() => Math.random() - 0.5);
  }

  function updateStats() {
    turnsEl.textContent = turns;
    pairsEl.textContent = `${pairs}/6`;
    timeEl.textContent = time;
    bestEl.textContent = best ? `${best}s` : "--";
  }

  function buildDeck() {
    deck = shuffle([...crystals, ...crystals].map((card, index) => ({ ...card, id: `${card.value}-${index}` })));
  }

  function render() {
    board.innerHTML = "";
    deck.forEach((card) => {
      const button = document.createElement("button");
      button.className = "card";
      button.type = "button";
      button.dataset.value = card.value;
      button.dataset.id = card.id;
      button.style.setProperty("--card-color", card.color);
      button.setAttribute("aria-label", "Hidden crystal card");
      button.setAttribute("aria-pressed", "false");
      button.innerHTML = '<span class="card-face card-front"></span><span class="card-face card-back"></span>';
      board.appendChild(button);
    });
  }

  function start() {
    if (running) return;
    running = true;
    startButton.textContent = "Running";
    statusEl.textContent = "Find the matching pairs.";
    timer = window.setInterval(() => {
      time -= 1;
      updateStats();
      if (time <= 0) finish(false);
    }, 1000);
  }

  function finish(won) {
    running = false;
    window.clearInterval(timer);
    startButton.textContent = won ? "Play Again" : "Restart";
    document.querySelectorAll(".card").forEach((card) => (card.disabled = true));
    if (won) {
      const elapsed = 60 - time;
      if (!best || elapsed < best) {
        best = elapsed;
        localStorage.setItem("crystalMatchBest", String(best));
      }
      statusEl.textContent = `All matched in ${elapsed} seconds.`;
    } else {
      statusEl.textContent = "Time ran out. Shuffle for a fresh board.";
    }
    updateStats();
  }

  function reset() {
    window.clearInterval(timer);
    firstCard = null;
    lock = false;
    turns = 0;
    pairs = 0;
    time = 60;
    running = false;
    startButton.textContent = "Start";
    statusEl.textContent = "Memorize the shimmer.";
    buildDeck();
    render();
    updateStats();
  }

  function flip(card) {
    if (!running) start();
    if (lock || card.classList.contains("matched") || card === firstCard) return;

    card.setAttribute("aria-pressed", "true");
    card.setAttribute("aria-label", `${card.dataset.value} crystal`);

    if (!firstCard) {
      firstCard = card;
      return;
    }

    turns += 1;
    updateStats();

    if (firstCard.dataset.value === card.dataset.value) {
      firstCard.classList.add("matched");
      card.classList.add("matched");
      firstCard.disabled = true;
      card.disabled = true;
      firstCard = null;
      pairs += 1;
      statusEl.textContent = "Pair matched.";
      updateStats();
      if (pairs === crystals.length) finish(true);
      return;
    }

    lock = true;
    statusEl.textContent = "Not a match. Watch where they land.";
    window.setTimeout(() => {
      firstCard.setAttribute("aria-pressed", "false");
      card.setAttribute("aria-pressed", "false");
      firstCard.setAttribute("aria-label", "Hidden crystal card");
      card.setAttribute("aria-label", "Hidden crystal card");
      firstCard = null;
      lock = false;
    }, 720);
  }

  board.addEventListener("click", (event) => {
    const card = event.target.closest(".card");
    if (card) flip(card);
  });

  startButton.addEventListener("click", () => {
    if (pairs === crystals.length || time <= 0) reset();
    start();
  });
  resetButton.addEventListener("click", reset);
  reset();
})();
