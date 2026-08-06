(function () {
  const boardEl = document.querySelector("#board");
  const trayEl = document.querySelector("#ingredient-tray");
  const difficultyScreenEl = document.querySelector("#difficulty-screen");
  const instructionsEl = document.querySelector("#instructions");
  const filledEl = document.querySelector("#filled");
  const mistakesEl = document.querySelector("#mistakes");
  const timeEl = document.querySelector("#time");
  const bestEl = document.querySelector("#best");
  const statusEl = document.querySelector("#status");
  const newButton = document.querySelector("#new-button");
  const hintButton = document.querySelector("#hint-button");
  const clearButton = document.querySelector("#clear-button");
  const difficultyButton = document.querySelector("#difficulty-button");

  const allIngredients = [
    { value: 1, name: "Ube", icon: "ube" },
    { value: 2, name: "Jelly", icon: "jelly" },
    { value: 3, name: "Beans", icon: "beans" },
    { value: 4, name: "Flan", icon: "flan" },
    { value: 5, name: "Leche", icon: "leche" },
    { value: 6, name: "Langka", icon: "langka" },
    { value: 7, name: "Coconut", icon: "coconut" },
    { value: 8, name: "Corn", icon: "corn" },
    { value: 9, name: "Banana", icon: "banana" },
  ];

  const gameModes = {
    easy: {
      label: "Easy",
      size: 4,
      sectionSize: 2,
      ingredientCount: 4,
      trayColumns: 2,
      bestKey: "haloHaloSudokuBest4",
      solution: [
        1, 2, 3, 4,
        3, 4, 1, 2,
        2, 1, 4, 3,
        4, 3, 2, 1,
      ],
      puzzleMasks: [
        [0, 1, 3, 5, 6, 9, 10, 12, 15],
        [0, 1, 2, 4, 7, 8, 11, 13, 14],
        [0, 2, 5, 7, 8, 10, 13, 15],
      ],
    },
    hard: {
      label: "Hard",
      size: 9,
      sectionSize: 3,
      ingredientCount: 9,
      trayColumns: 3,
      bestKey: "haloHaloSudokuBest9",
      solution: [
        1, 2, 3, 4, 5, 6, 7, 8, 9,
        4, 5, 6, 7, 8, 9, 1, 2, 3,
        7, 8, 9, 1, 2, 3, 4, 5, 6,
        2, 3, 4, 5, 6, 7, 8, 9, 1,
        5, 6, 7, 8, 9, 1, 2, 3, 4,
        8, 9, 1, 2, 3, 4, 5, 6, 7,
        3, 4, 5, 6, 7, 8, 9, 1, 2,
        6, 7, 8, 9, 1, 2, 3, 4, 5,
        9, 1, 2, 3, 4, 5, 6, 7, 8,
      ],
      puzzleMasks: [
        [0, 1, 4, 6, 8, 10, 12, 14, 17, 18, 22, 25, 28, 30, 32, 35, 36, 39, 41, 44, 46, 49, 50, 53, 55, 57, 60, 62, 64, 67, 69, 71, 73, 76, 80],
        [0, 3, 5, 7, 11, 13, 15, 16, 19, 21, 24, 26, 27, 31, 34, 37, 40, 42, 45, 47, 51, 52, 54, 58, 61, 63, 65, 68, 70, 72, 74, 77, 78, 79, 80],
        [1, 2, 4, 6, 8, 9, 12, 14, 16, 18, 20, 23, 25, 28, 29, 33, 35, 36, 38, 43, 45, 48, 50, 52, 54, 56, 59, 62, 63, 66, 68, 71, 73, 75, 78],
      ],
    },
  };

  let activeMode = null;
  let size = 0;
  let sectionSize = 0;
  let ingredients = [];
  let solution = [];
  let puzzleMasks = [];
  let puzzleIndex = 0;
  let puzzle = [];
  let values = [];
  let selectedIndex = -1;
  let mistakes = 0;
  let startedAt = 0;
  let elapsed = 0;
  let timer = 0;
  let complete = false;
  let best = 0;

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}:${String(remainder).padStart(2, "0")}`;
  }

  function ingredientFor(value) {
    return ingredients.find((ingredient) => ingredient.value === value);
  }

  function startTimer() {
    if (!activeMode || timer || complete) return;
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

  function rowFor(index) {
    return Math.floor(index / size);
  }

  function columnFor(index) {
    return index % size;
  }

  function sameSection(index, otherIndex) {
    return (
      Math.floor(rowFor(index) / sectionSize) === Math.floor(rowFor(otherIndex) / sectionSize) &&
      Math.floor(columnFor(index) / sectionSize) === Math.floor(columnFor(otherIndex) / sectionSize)
    );
  }

  function conflictsWithBoard(index, value) {
    return values.some((currentValue, otherIndex) => {
      if (!currentValue || otherIndex === index || currentValue !== value) return false;
      return rowFor(index) === rowFor(otherIndex) || columnFor(index) === columnFor(otherIndex) || sameSection(index, otherIndex);
    });
  }

  function relatedToSelected(index) {
    if (selectedIndex < 0) return false;
    return rowFor(index) === rowFor(selectedIndex) || columnFor(index) === columnFor(selectedIndex) || sameSection(index, selectedIndex);
  }

  function renderCell(index) {
    const value = values[index];
    const ingredient = ingredientFor(value);
    const row = rowFor(index);
    const column = columnFor(index);
    const button = document.createElement("button");
    button.className = "sudoku-cell";
    button.type = "button";
    button.dataset.index = index;
    button.setAttribute("aria-label", ingredient ? `${ingredient.name} at row ${row + 1}, column ${column + 1}` : `Empty square at row ${row + 1}, column ${column + 1}`);
    if ((column + 1) % sectionSize === 0 && column < size - 1) button.classList.add("section-right");
    if ((row + 1) % sectionSize === 0 && row < size - 1) button.classList.add("section-bottom");
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
      button.setAttribute("aria-label", `${ingredient.name}, key ${ingredient.value}`);
      button.innerHTML = `<span class="ingredient ${ingredient.icon}" aria-hidden="true"></span><strong>${ingredient.name}</strong><small>${ingredient.value}</small>`;
      trayEl.appendChild(button);
    });
  }

  function updateStats() {
    if (!activeMode) return;
    const filled = values.filter(Boolean).length;
    filledEl.textContent = `${filled}/${size * size}`;
    mistakesEl.textContent = mistakes;
    timeEl.textContent = formatTime(elapsed);
    bestEl.textContent = best ? formatTime(best) : "--";
    newButton.disabled = false;
    hintButton.disabled = complete || filled >= size * size;
    clearButton.disabled = complete || selectedIndex < 0 || puzzle[selectedIndex] || !values[selectedIndex];
  }

  function selectCell(index) {
    if (!activeMode) return;
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
      localStorage.setItem(activeMode.bestKey, String(best));
    }
    statusEl.textContent = `${activeMode.label} bowl complete. Every spoonful fits.`;
    boardEl.classList.add("complete");
    updateStats();
  }

  function placeIngredient(value) {
    if (!activeMode || value < 1 || value > size || selectedIndex < 0 || complete) return;
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
    if (!activeMode || selectedIndex < 0 || puzzle[selectedIndex] || complete) return;
    values[selectedIndex] = 0;
    statusEl.textContent = "Square cleared.";
    renderBoard();
    updateStats();
  }

  function hint() {
    if (!activeMode || complete) return;
    startTimer();
    const openIndexes = values
      .map((value, index) => (value ? -1 : index))
      .filter((index) => index >= 0);
    if (!openIndexes.length) return;
    const index = selectedIndex >= 0 && !values[selectedIndex] && !puzzle[selectedIndex] ? selectedIndex : openIndexes[0];
    values[index] = solution[index];
    selectedIndex = index;
    statusEl.textContent = `${ingredientFor(values[index]).name} tucked into place.`;
    renderBoard();
    flashCell(index, "correct");
    updateStats();
    finishIfComplete();
  }

  function newPuzzle(next = true) {
    if (!activeMode) return;
    stopTimer();
    if (next) puzzleIndex = (puzzleIndex + 1) % puzzleMasks.length;
    const givens = new Set(puzzleMasks[puzzleIndex]);
    puzzle = solution.map((value, index) => (givens.has(index) ? value : 0));
    values = [...puzzle];
    selectedIndex = values.findIndex((value) => value === 0);
    mistakes = 0;
    elapsed = 0;
    complete = false;
    boardEl.classList.remove("complete");
    statusEl.textContent = `${activeMode.label} bowl ready. Choose a square, then add an ingredient.`;
    renderBoard();
    renderTray();
    updateStats();
  }

  function startGame(difficulty) {
    const mode = gameModes[difficulty];
    if (!mode) return;
    activeMode = mode;
    size = mode.size;
    sectionSize = mode.sectionSize;
    ingredients = allIngredients.slice(0, mode.ingredientCount);
    solution = [...mode.solution];
    puzzleMasks = mode.puzzleMasks;
    puzzleIndex = 0;
    best = Number(localStorage.getItem(mode.bestKey) || 0);
    document.body.dataset.difficulty = difficulty;
    boardEl.dataset.size = String(size);
    boardEl.style.setProperty("--grid-size", String(size));
    boardEl.setAttribute("aria-label", `${mode.label} Sudoku board, ${size} by ${size}`);
    trayEl.style.setProperty("--tray-columns", String(mode.trayColumns));
    trayEl.setAttribute("aria-label", `${mode.ingredientCount} ingredient choices for ${mode.label} mode`);
    instructionsEl.textContent = `Fill the bowl so every row, column, and ${sectionSize}-by-${sectionSize} section has one of each of the ${mode.ingredientCount} ingredients.`;
    difficultyScreenEl.hidden = true;
    boardEl.hidden = false;
    trayEl.hidden = false;
    difficultyButton.hidden = false;
    newPuzzle(false);
  }

  function showDifficultyChooser() {
    stopTimer();
    activeMode = null;
    delete document.body.dataset.difficulty;
    difficultyScreenEl.hidden = false;
    boardEl.hidden = true;
    trayEl.hidden = true;
    difficultyButton.hidden = true;
    newButton.disabled = true;
    hintButton.disabled = true;
    clearButton.disabled = true;
    instructionsEl.textContent = "Choose Easy for a 4-by-4 bowl or Hard for the full 9-by-9 recipe.";
    filledEl.textContent = "0/--";
    mistakesEl.textContent = "0";
    timeEl.textContent = "0:00";
    bestEl.textContent = "--";
    statusEl.textContent = "Choose your difficulty to start.";
    difficultyScreenEl.querySelector("[data-difficulty=\"easy\"]").focus();
  }

  difficultyScreenEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-difficulty]");
    if (button) startGame(button.dataset.difficulty);
  });

  boardEl.addEventListener("click", (event) => {
    const cell = event.target.closest("[data-index]");
    if (cell) selectCell(Number(cell.dataset.index));
  });

  trayEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-value]");
    if (button) placeIngredient(Number(button.dataset.value));
  });

  document.addEventListener("keydown", (event) => {
    const value = Number(event.key);
    if (activeMode && Number.isInteger(value) && value >= 1 && value <= size) placeIngredient(value);
    if (event.key === "Backspace" || event.key === "Delete") clearSelected();
    if (activeMode && event.key.startsWith("Arrow") && selectedIndex >= 0) {
      event.preventDefault();
      const row = rowFor(selectedIndex);
      const column = columnFor(selectedIndex);
      const nextRow = Math.max(0, Math.min(size - 1, row + (event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0)));
      const nextColumn = Math.max(0, Math.min(size - 1, column + (event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0)));
      selectCell(nextRow * size + nextColumn);
    }
  });

  newButton.addEventListener("click", () => newPuzzle(true));
  hintButton.addEventListener("click", hint);
  clearButton.addEventListener("click", clearSelected);
  difficultyButton.addEventListener("click", showDifficultyChooser);
  showDifficultyChooser();
})();
