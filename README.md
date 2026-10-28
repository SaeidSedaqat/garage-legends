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
  needle is in the green zone. The gearing is set per race distance, so shifts come through
  most of the race.
- **Nitro (top gear):** the button turns blue. Each tap fires a 1.5 s burst. Tap again when the
  button flashes white at the end of a burst to **chain** it for a bigger boost; tapping any
  earlier wastes the charge. You get enough charges to cover most of the way to the line, plus
  one for a perfect launch and one for every two perfect shifts. Rivals use nitro too.
- **Achievements** (trophy icon): 24 goals from your first win to Legend round 20, each with a
  cash reward.
- **Progress:** 15 events across Countryside, Coastal and City, 3 stars each. Stars are Reputation:
  each one adds 5% to tap income, and star milestones pay out cash or add decor to the garage
  (trophy shelf, posters, string lights, car lift, neon sign). Winning City Champion unlocks
  the Apex Zero and the endless **Legend Series**.
- **Before each race** a matchup screen shows your car against the rival, the recommended PR and
  the reward, and lets you change car.
- **First session:** a short guide points at the first upgrade and coaches the first race.
- **Settings** (gear icon): sound, reduce motion, KM/H (default) or MPH, stats, reset progress.

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
recommended PR with Good launches, shifts and nitro (target 55–85%; all events now sit at 68–73%)
and the medal times, plus the Legend Series opponent ratios. After changing cars, opponents or sim
constants in `src/data.js`, re-run it and copy any suggested opponent PRs, medal times and ratios
back into `src/data.js`.

Skill and upgrades both matter. A driver with a few early shifts can make up for them with
about 10% more PR. At an event's recommended PR:

| Driving | Win rate |
|---|---|
| Perfect launches, shifts and chained nitro | ~100% |
| Good launches and shifts, nitro fired | ~70% |
| Good but no nitro | ~20% |
| A few early shifts | ~40% (70–100% with 10% more PR) |
| Sloppy (poor launch, every other shift early) | ~12% |

Rivals' form varies a little from race to race (`SIM.aiForm`), so results aren't all-or-nothing.

The economy is tuned with the pacing bot (`pacing()` in `tools/balance.js`). The bot taps 2 times a
second, races each event once its PR is close, buys the next car the goal chip suggests, and
replays its best event when that beats tapping. At 2 taps/s it hits the GDD §9.5 targets:

| Milestone | Target | Bot (1.5 / 2 / 2.5 taps/s) |
|---|---|---|
| Car 2 | 4–6 min | 6 / 5 / 4 min |
| Car 3 | 12–18 min | 18 / 14 / 12 min |
| Countryside Champion | 15–25 min | 18 / 15 / 13 min |
| City unlocked (Coastal Champion) | 70–90 min | 98 / 90 / 85 min |
| City Champion | 3–3.5 h | 3h13 / 3h05 / 3h00 |

To get there, race rewards are 40% / 60% / 37.5% of the GDD table (Countryside / Coastal / City),
and some prices moved: Hikari $4,000, Kodiak $18,000, Valken $40,000, Sora $120,000,
Furia $220,000, Click Power levels 1–7 a little dearer.

## Placeholders

- Cars 4–10 and most rivals are recolors of the existing car art (`tint` in `src/data.js`).
  Drop in real art and point the car's `art` at it.
- Sounds are synthesized in code.
- Garage decor is drawn in code (`src/art.js`, `DECOR`) until it gets real art.
- Not built yet from the GDD: portal adapters.
