(function () {
  const games = window.WONG_WAY_GAMES || [];
  const dialog = document.querySelector("#game-dialog");
  const dialogArt = document.querySelector("#dialog-art");
  const dialogGroup = document.querySelector("#dialog-group");
  const dialogTitle = document.querySelector("#dialog-title");
  const dialogDescription = document.querySelector("#dialog-description");
  const dialogGoal = document.querySelector("#dialog-goal");
  const dialogControls = document.querySelector("#dialog-controls");
  const dialogPlay = document.querySelector("#dialog-play");

  function buildTile(game) {
    const button = document.createElement("button");
    button.className = `game-tile ${game.theme}`;
    button.type = "button";
    button.dataset.gameId = game.id;
    button.innerHTML = `
      <span class="tile-art" aria-hidden="true"></span>
      <span class="tile-copy">
        <span class="tile-title">${game.title}</span>
        <span class="tile-tagline">${game.tagline}</span>
      </span>
      <span class="tile-cta">Details</span>
    `;
    return button;
  }

  function openGameDialog(game) {
    dialogArt.className = `dialog-art ${game.theme}`;
    dialogGroup.textContent = game.groupLabel;
    dialogTitle.textContent = game.title;
    dialogDescription.textContent = game.description;
    dialogGoal.textContent = game.goal;
    dialogControls.textContent = game.controls;
    dialogPlay.href = game.href;

    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }

  function closeGameDialog() {
    if (typeof dialog.close === "function") {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
    }
  }

  document.querySelectorAll("[data-game-group]").forEach((grid) => {
    const group = grid.dataset.gameGroup;
    games.filter((game) => game.group === group).forEach((game) => {
      grid.appendChild(buildTile(game));
    });
  });

  document.addEventListener("click", (event) => {
    const tile = event.target.closest("[data-game-id]");
    if (tile) {
      const game = games.find((candidate) => candidate.id === tile.dataset.gameId);
      if (game) openGameDialog(game);
    }

    if (event.target.closest("[data-close-dialog]")) {
      closeGameDialog();
    }
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeGameDialog();
  });
})();
