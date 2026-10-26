# Copilot instructions for this repository

## Repository overview

This repository is a small browser game built with plain HTML, CSS, and JavaScript. There is no framework, package manager, or build pipeline. The app is centered around a single canvas-based side-scrolling action game and a minimal UI shell around it.

## How to run and validate

There are no automated build, test, or lint commands configured in this repository.

Use a local static server to preview the game:

```bash
cd /workspaces/my-first-app
python3 -m http.server 8000
```

Then open `http://localhost:8000` in a browser.

If you need a quick smoke test during local edits, reload the page and verify the game still starts, the HUD updates, and the player can move, jump, attack, and complete the level.

## High-level architecture

- `index.html` defines the page structure: the canvas, HUD, overlay, and touch controls.
- `style.css` contains the visual styling for the game shell, HUD, overlay, and responsive behavior.
- `game.js` contains the actual game logic and rendering pipeline.

The game logic in `game.js` follows a single-file architecture:

- `platforms`, `gemSpots`, and `enemySpots` are the world data that defines level geometry and collectible/enemy placement.
- `resetGame()` reinitializes the player, gems, enemies, score, lives, and camera state.
- `update(dt)` is the main gameplay loop: input handling, movement, collisions, pickups, enemy behavior, fall/death logic, and win/lose conditions.
- `drawBackground()`, `drawWorld()`, `drawPlayer()`, and related functions render the scene onto the canvas.
- `gameState` is a simple state machine (`ready`, `playing`, `won`, `lost`) that drives the overlay and start/restart flow.

This project is intentionally compact: world tuning and gameplay behavior are largely done by adjusting the arrays and constants near the top of `game.js` rather than by introducing abstraction layers.

## Key conventions in this codebase

- Keep the project dependency-free. Prefer direct edits to `index.html`, `style.css`, and `game.js` rather than introducing build tooling or packages.
- Treat the canvas as the primary runtime surface. Most game behavior is expressed in object literals with `x`, `y`, `w`, `h`, `vx`, and `vy` fields.
- Keep HUD and overlay updates in sync through helper functions like `updateHud()` and `showOverlay()`. The UI is intentionally derived from game state rather than manually manipulated in multiple places.
- Use `cameraX` and `WORLD_WIDTH` as the canonical references for side-scrolling and completion checks; many gameplay systems depend on those values.
- Level layout is data-first. Adding or adjusting platforms, gems, or enemies is typically done by editing the top-level arrays in `game.js` instead of creating new config files.
- The project uses a mix of keyboard and touch controls. If you add input handling, keep it consistent with the existing `keys` set and the `data-control` buttons in `index.html`.
- Preserve the existing Japanese/UI copy style and arcade-game feel. This is a themed single-page app rather than a generic engine template.

## Notes for future Copilot sessions

- The README is intentionally minimal (`README.md` says this is a place to write explanations), so do not assume a deeper project doc exists elsewhere.
- 説明は日本語で表示するようにして。
- There is no hidden build/test setup to discover; the app is a static front-end game.
- Prefer small, direct changes that keep the single-file game architecture intact.
