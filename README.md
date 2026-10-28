# Garage Legends

Cozy idle + drag-racing browser game built with **Phaser 4.2.1**, following the GDD v2.0.
Plain JavaScript modules, no build step.

## Run it locally

Double-click `start-game.bat`. It starts a small local server and opens http://localhost:8080/.
Close the black window to stop it.

(Opening `index.html` directly from the file system won't work: browsers block JavaScript modules on `file://`.)

## How to play

- **Garage:** tap your car to earn cash (4% chance of a ×5 critical). A Golden Wrench appears every
  1–2 minutes: tap it for 30× a tap.
- **Upgrades:** per car — Engine, Turbo (after Engine 3), Tires, Transmission (after Engine 1).
  Garage-wide — Click Power and Automation (after winning Local Rival).
- **Race:** hold the button (or Space) when the amber lights start so the needle sits in the yellow
  launch band, then release on GREEN. Releasing early is a jump start. Tap to shift when the
  needle is in the green zone.
- **Progress:** 15 events across Countryside, Coastal and City, 3 stars each. Stars are Reputation:
  each one adds 5% to tap income, and star milestones pay out cash or add decor to the garage
  (trophy shelf, posters, string lights, car lift, neon sign). Winning City Champion unlocks
  the Apex Zero and the endless **Legend Series**.
- **Before each race** a matchup screen shows your car against the rival, the recommended PR and
  the reward, and lets you change car.
- **First session:** a short guide points at the first upgrade and coaches the first race.
- **Settings** (gear icon): sound, reduce motion, MPH or KM/H, stats, reset progress.

Progress saves automatically in the browser (localStorage). Automation keeps earning at half rate
while you're away (up to 2 hours).

## Project layout

| File | What it does |
|---|---|
| `src/data.js` | All cars, events, opponents, upgrades, economy and sim constants — tune the game here |
| `src/physics.js` | The race simulation (GDD §6.9) and AI driver; no Phaser, so it runs headless |
| `src/state.js` | Money, upgrades, stars, progression, saving and save migration |
| `src/art.js` | Cuts sprites out of their magenta backgrounds, placeholder recolors, mockup crops |
| `src/ui.js` + `style.css` | Menus, HUD and dialogs (HTML over the game canvas) |
| `src/scenes/` | Phaser scenes: boot, garage, race |
| `assets/` | Car, prop and background art |
| `tools/balance.html` | Balance check: win rates and medal times per event, plus the pacing bot |

## Balancing

Open http://localhost:8080/tools/balance.html. It shows, per event, the win rate of a player at the
recommended PR with Good launches and shifts (target 55–85%) and the medal times. After changing
cars, opponents or sim constants in `src/data.js`, re-run it and copy any suggested opponent PRs
and medal times back into `src/data.js`.

## Placeholders

- Cars 4–10 and most rivals are recolors of the existing car art (`tint` in `src/data.js`).
  Drop in real art and point the car's `art` at it.
- Sounds are synthesized in code.
- Garage decor is drawn in code (`src/art.js`, `DECOR`) until it gets real art.
- Not built yet from the GDD: portal adapters.
