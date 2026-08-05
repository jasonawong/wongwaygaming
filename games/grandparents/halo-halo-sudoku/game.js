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

  const size = 9;
  const sectionSize = 3;
  const ingredients = [
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

  const solution = [
    1, 2, 3, 4, 5, 6, 7, 8, 9,
    4, 5, 6, 7, 8, 9, 1, 2, 3,
    7, 8, 9, 1, 2, 3, 4, 5, 6,
    2, 3, 4, 5, 6, 7, 8, 9, 1,
    5, 6, 7, 8, 9, 1, 2, 3, 4,
    8, 9, 1, 2, 3, 4, 5, 6, 7,
    3, 4, 5, 6, 7, 8, 9, 1, 2,
    6, 7, 8, 9, 1, 2, 3, 4, 5,
    9, 1, 2, 3, 4, 5, 6, 7, 8,
  ];

  const puzzleMasks = [
    [0, 1, 4, 6, 8, 10, 12, 14, 17, 18, 22, 25, 28, 30, 32, 35, 36, 39, 41, 44, 46, 49, 50, 53, 55, 57, 60, 62, 64, 67, 69, 71, 73, 76, 80],
    [0, 3, 5, 7, 11, 13, 15, 16, 19, 21, 24, 26, 27, 31, 34, 37, 40, 42, 45, 47, 51, 52, 54, 58, 61, 63, 65, 68, 70, 72, 74, 77, 78, 79, 80],
    [1, 2, 4, 6, 8, 9, 12, 14, 16, 18, 20, 23, 25, 28, 29, 33, 35, 36, 38, 43, 45, 48, 50, 52, 54, 56, 59, 62, 63, 66, 68, 71, 73, 75, 78],
  ];

  let puzzleIndex = 0;
  let puzzle = [];
  let values = [];
  let selectedIndex = -1;
  let mistakes = 0;
  let startedAt = 0;
  let elapsed = 0;
  let timer = 0;
  let complete = false;
  let best = Number(localStorage.getItem("haloHaloSudokuBest9") || 0);

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
    const button = document.createElement("button");
    button.className = "sudoku-cell";
    button.type = "button";
    button.dataset.index = index;
    button.setAttribute("aria-label", ingredient ? `${ingredient.name} at row ${rowFor(index) + 1}, column ${columnFor(index) + 1}` : `Empty square at row ${rowFor(index) + 1}, column ${columnFor(index) + 1}`);
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
    const filled = values.filter(Boolean).length;
    filledEl.textContent = `${filled}/81`;
    mistakesEl.textContent = mistakes;
    timeEl.textContent = formatTime(elapsed);
    bestEl.textContent = best ? formatTime(best) : "--";
    hintButton.disabled = complete || filled >= size * size;
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
      localStorage.setItem("haloHaloSudokuBest9", String(best));
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
    if (event.key >= "1" && event.key <= "9") placeIngredient(Number(event.key));
    if (event.key === "Backspace" || event.key === "Delete") clearSelected();
    if (event.key.startsWith("Arrow") && selectedIndex >= 0) {
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
  newPuzzle(false);
})();
