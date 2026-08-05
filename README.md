# Wong Way Gaming

A static browser arcade designed for GitHub Pages. The landing page lists games by collection, opens a detail pop-up for each game, and links to standalone game folders.

## Structure

- `index.html` is the main arcade landing page.
- `assets/` contains shared landing-page styles and game metadata.
- `games/jackson/turbo-trails/` is a standalone lane-dodging game.
- `games/jackson/meteor-math/` is a standalone math arcade game.
- `games/jackson/miner/` is a self-contained first-person voxel building game.
- `games/olivia/cupcake-cascade/` is a standalone catch game.
- `games/olivia/crystal-match/` is a standalone memory game.
- `games/grandparents/halo-halo-sudoku/` is a standalone dessert Sudoku game.
- `games/shared/` contains common game-page shell styles.

Most game folders have their own `index.html`, `styles.css`, and `game.js`, so they can be expanded or replaced as standalone browser applications. Miner keeps its styles and JavaScript inside one HTML file.

## Run Locally

```bash
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173/`.

## GitHub Pages

Publish the repository root with GitHub Pages. No build step or package install is required.
