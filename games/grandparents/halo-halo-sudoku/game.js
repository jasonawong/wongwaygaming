(function () {
  const boardEl = document.querySelector("#board");
  const trayEl = document.querySelector("#ingredient-tray");
  const filledEl = document.querySelector("#filled");
  const mistakesEl = document.querySelector("#mistakes");
  const timeEl = document.querySelector("#time");
  const bestEl = document.querySelector("#best");
  const statusEl = document.querySelector("#status");
  const newButton = document.querySelector("#new-button");
  const hintButton = document.querySelector("#hint-button");
  const clearButton = document.querySelector("#clear-button");

  const ingredients = [
    { value: 1, name: "Ube", short: "U", icon: "ube" },
    { value: 2, name: "Jelly", short: "J", icon: "jelly" },
    { value: 3, name: "Beans", short: "B", icon: "beans" },
    { value: 4, name: "Flan", short: "F", icon: "flan" },
  ];

  const puzzles = [
    {
      puzzle: [1, 0, 0, 4, 0, 4, 1, 0, 2, 0, 0, 3, 0, 3, 2, 0],
      solution: [1, 2, 3, 4, 3, 4, 1, 2, 2, 1, 4, 3, 4, 3, 2, 1],
    },
    {
      puzzle: [0, 4, 1, 0, 1, 0, 0, 4, 4, 0, 0, 1, 0, 1, 4, 0],
      solution: [3, 4, 1, 2, 1, 2, 3, 4, 4, 3, 2, 1, 2, 1, 4, 3],
    },
    {
      puzzle: [2, 0, 0, 3, 0, 3, 2, 0, 4, 0, 0, 1, 0, 1, 4, 0],
      solution: [2, 4, 1, 3, 1, 3, 2, 4, 4, 2, 3, 1, 3, 1, 4, 2],
    },
  ];

  let puzzleIndex = 0;
  let puzzle = [];
  let solution = [];
  let values = [];
  let selectedIndex = -1;
  let mistakes = 0;
  let startedAt = 0;
  let elapsed = 0;
  let timer = 0;
  let complete = false;
  let best = Number(localStorage.getItem("haloHaloSudokuBest") || 0);

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}:${String(remainder).padStart(2, "0")}`;
  }

  function ingredientFor(value) {
    return ingredients.find((ingredient) => ingredient.value === value);
  }

  function startTimer() {
    if (timer || complete) return;
    startedAt = Date.now() - elapsed * 1000;
    timer = window.setInterval(() => {
      elapsed = Math.floor((Date.now() - startedAt) / 1000);
      timeEl.textContent = formatTime(elapsed);
    }, 1000);
  }

  function stopTimer() {
    window.clearInterval(timer);
    timer = 0;
  }

  function sameSection(index, otherIndex) {
    const row = Math.floor(index / 4);
    const col = index % 4;
    const otherRow = Math.floor(otherIndex / 4);
    const otherCol = otherIndex % 4;
    return Math.floor(row / 2) === Math.floor(otherRow / 2) && Math.floor(col / 2) === Math.floor(otherCol / 2);
  }

  function conflictsWithBoard(index, value) {
    return values.some((currentValue, otherIndex) => {
      if (!currentValue || otherIndex === index || currentValue !== value) return false;
      return (
        Math.floor(index / 4) === Math.floor(otherIndex / 4) ||
        index % 4 === otherIndex % 4 ||
        sameSection(index, otherIndex)
      );
    });
  }

  function relatedToSelected(index) {
    if (selectedIndex < 0) return false;
    return (
      Math.floor(index / 4) === Math.floor(selectedIndex / 4) ||
      index % 4 === selectedIndex % 4 ||
      sameSection(index, selectedIndex)
    );
  }

  function renderCell(index) {
    const value = values[index];
    const ingredient = ingredientFor(value);
    const button = document.createElement("button");
    button.className = "sudoku-cell";
    button.type = "button";
    button.dataset.index = index;
    button.setAttribute("aria-label", ingredient ? `${ingredient.name} at row ${Math.floor(index / 4) + 1}, column ${(index % 4) + 1}` : `Empty square at row ${Math.floor(index / 4) + 1}, column ${(index % 4) + 1}`);
    if (puzzle[index]) button.classList.add("given");
    if (index === selectedIndex) button.classList.add("selected");
    if (relatedToSelected(index)) button.classList.add("related");
    if (value && selectedIndex >= 0 && value === values[selectedIndex]) button.classList.add("same");
    button.innerHTML = ingredient
      ? `<span class="ingredient ${ingredient.icon}" aria-hidden="true"></span><strong>${ingredient.name}</strong>`
      : `<span class="empty-dot" aria-hidden="true"></span>`;
    return button;
  }

  function renderBoard() {
    boardEl.innerHTML = "";
    values.forEach((_, index) => boardEl.appendChild(renderCell(index)));
  }

  function renderTray() {
    trayEl.innerHTML = "";
    ingredients.forEach((ingredient) => {
      const button = document.createElement("button");
      button.className = "ingredient-button";
      button.type = "button";
      button.dataset.value = ingredient.value;
      button.innerHTML = `<span class="ingredient ${ingredient.icon}" aria-hidden="true"></span><strong>${ingredient.name}</strong><small>${ingredient.short}</small>`;
      trayEl.appendChild(button);
    });
  }

  function updateStats() {
    const filled = values.filter(Boolean).length;
    filledEl.textContent = `${filled}/16`;
    mistakesEl.textContent = mistakes;
    timeEl.textContent = formatTime(elapsed);
    bestEl.textContent = best ? formatTime(best) : "--";
    hintButton.disabled = complete || filled >= 16;
    clearButton.disabled = complete || selectedIndex < 0 || puzzle[selectedIndex] || !values[selectedIndex];
  }

  function selectCell(index) {
    selectedIndex = index;
    renderBoard();
    updateStats();
  }

  function flashCell(index, className) {
    const cell = boardEl.querySelector(`[data-index="${index}"]`);
    if (!cell) return;
    cell.classList.remove(className);
    void cell.offsetWidth;
    cell.classList.add(className);
  }

  function finishIfComplete() {
    if (!values.every((value, index) => value === solution[index])) return;
    complete = true;
    stopTimer();
    if (!best || elapsed < best) {
      best = elapsed;
      localStorage.setItem("haloHaloSudokuBest", String(best));
    }
    statusEl.textContent = "Halo-halo complete. Every spoonful fits.";
    boardEl.classList.add("complete");
    updateStats();
  }

  function placeIngredient(value) {
    if (selectedIndex < 0 || complete) return;
    if (puzzle[selectedIndex]) {
      statusEl.textContent = "That square is already part of the recipe.";
      flashCell(selectedIndex, "wrong");
      return;
    }

    startTimer();
    if (solution[selectedIndex] !== value || conflictsWithBoard(selectedIndex, value)) {
      mistakes += 1;
      statusEl.textContent = "That ingredient belongs somewhere else.";
      flashCell(selectedIndex, "wrong");
      updateStats();
      return;
    }

    values[selectedIndex] = value;
    statusEl.textContent = `${ingredientFor(value).name} added.`;
    renderBoard();
    flashCell(selectedIndex, "correct");
    updateStats();
    finishIfComplete();
  }

  function clearSelected() {
    if (selectedIndex < 0 || puzzle[selectedIndex] || complete) return;
    values[selectedIndex] = 0;
    statusEl.textContent = "Square cleared.";
    renderBoard();
    updateStats();
  }

  function hint() {
    if (complete) return;
    startTimer();
    const openIndexes = values
      .map((value, index) => (value ? -1 : index))
      .filter((index) => index >= 0);
    if (!openIndexes.length) return;
    const index = selectedIndex >= 0 && !values[selectedIndex] && !puzzle[selectedIndex]
      ? selectedIndex
      : openIndexes[0];
    values[index] = solution[index];
    selectedIndex = index;
    statusEl.textContent = `${ingredientFor(values[index]).name} tucked into place.`;
    renderBoard();
    flashCell(index, "correct");
    updateStats();
    finishIfComplete();
  }

  function newPuzzle(next = true) {
    stopTimer();
    if (next) puzzleIndex = (puzzleIndex + 1) % puzzles.length;
    puzzle = [...puzzles[puzzleIndex].puzzle];
    solution = [...puzzles[puzzleIndex].solution];
    values = [...puzzle];
    selectedIndex = values.findIndex((value) => value === 0);
    mistakes = 0;
    elapsed = 0;
    complete = false;
    boardEl.classList.remove("complete");
    statusEl.textContent = "Choose a square, then add an ingredient.";
    renderBoard();
    renderTray();
    updateStats();
  }

  boardEl.addEventListener("click", (event) => {
    const cell = event.target.closest("[data-index]");
    if (cell) selectCell(Number(cell.dataset.index));
  });

  trayEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-value]");
    if (button) placeIngredient(Number(button.dataset.value));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key >= "1" && event.key <= "4") placeIngredient(Number(event.key));
    if (event.key === "Backspace" || event.key === "Delete") clearSelected();
    if (event.key.startsWith("Arrow") && selectedIndex >= 0) {
      event.preventDefault();
      const row = Math.floor(selectedIndex / 4);
      const col = selectedIndex % 4;
      const nextRow = Math.max(0, Math.min(3, row + (event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0)));
      const nextCol = Math.max(0, Math.min(3, col + (event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0)));
      selectCell(nextRow * 4 + nextCol);
    }
  });

  newButton.addEventListener("click", () => newPuzzle(true));
  hintButton.addEventListener("click", hint);
  clearButton.addEventListener("click", clearSelected);
  newPuzzle(false);
})();
