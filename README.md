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
- **Screen layout:** the garage fills the left 70%, the panel the right 30% (on phones held
  upright the panel sits along the bottom).
  - **‹ ›** beside the car flip through every car. Owned ones are driven straight away; others
    go on show with their stats and a Buy button (arrow keys work too).
  - **RACE** (bottom left, or R) swaps the panel to the race list; "Upgrades" takes it back.
- **Upgrades** (the panel): tap one to buy its next level. Each row says what the part does and
  how much one level adds.
  - The car's own four parts. Every car has its own set, e.g. the Bulldog has a Big-Block V8,
    Supercharger, Drag Slicks and Gearbox, and the Volta X has Twin Motors and Power Cells.
    Each part has 4 levels; together they add about 30% PR. Gearbox parts widen the shift zones,
    tires, slicks and AWD soften a slow launch, and nitrous, battery and hybrid parts make nitro
    stronger.
  - Garage: Tap Power (+$1 a tap per level, no limit) and Pit Crew (taps 0.5 times a second as
    soon as Local Rival is won; each level adds 0.25 taps/s, no limit),
    plus Reputation (stars and star-milestone rewards).
- **Race:** press and hold the button (or Space) when the amber lights come on, then let go the
  instant the light turns GREEN: the launch is scored on reaction time (under 0.2 s is perfect).
  Letting go early is a jump start. Tap to shift when the
  needle is in the green zone. The gearing is set per race distance, so shifts come through
  most of the race.
- **Nitro (top gear):** the button turns blue. Each tap fires a 1.5 s burst. Tap again when the
  button flashes white at the end of a burst to **chain** it for a bigger boost; tapping any
  earlier wastes the charge. You get enough charges to cover most of the way to the line, plus
  one for a perfect launch and one for every two perfect shifts. Rivals use nitro too.
- **Achievements** (trophy icon): 24 goals from your first win to Legend round 20, each with a
  cash reward.
- **Progress:** 15 events across Countryside, Coastal and City, 3 stars each. Stars are Reputation:
  each one adds 5% to tap income, and star milestones pay out cash (45★ also gives the "Garage
  Legend" title). Winning City Champion unlocks
  the Apex Zero and the endless **Legend Series**.
- **Before each race** a matchup screen shows your car against the rival, the recommended PR and
  the reward, and lets you change car.
- **Driving lesson:** the first race teaches launch, shifting and nitro one step at a time.
  At each key moment the race freezes, slow motion leads into it, and it waits until you do
  the move. Jump starts restart the countdown. Replay it any time with **Practice** in the Race
  menu: no rewards, and a summary of how each skill went.
- **First session:** a short guide points at the first upgrade.
- **Settings** (gear icon): sound, reduce motion, KM/H (default) or MPH, stats, reset progress.

Progress saves automatically in the browser (localStorage). Automation keeps earning at half rate
while you're away (up to 2 hours).

## Project layout

| File | What it does |
|---|---|
| `src/data.js` | All cars, their parts, events, opponents, economy and sim constants — tune the game here |
| `src/tuning.js` | What a car's parts do to its stats and what the next level costs |
| `src/physics.js` | The race simulation (GDD §6.9) and AI driver; no Phaser, so it runs headless |
| `src/state.js` | Money, upgrades, stars, progression, saving and save migration |
| `src/art.js` | Cuts sprites out of their magenta backgrounds, placeholder recolors, mockup crops |
| `src/ui.js` + `style.css` | Menus, HUD and dialogs (HTML over the game canvas) |
| `src/scenes/` | Phaser scenes: boot, garage, race |
| `assets/` | Car, prop and background art |
| `tools/balance.html` | Balance check: win rates and medal times per event, plus the pacing bot |
| `tools/promo.html` | Builds the store cover (1280×720), icon (512×512) and tab icon from the game's own cars, scenes and logo, ready to download |

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
| Car 2 | 4–6 min | 5 / 4 / 3 min |
| Car 3 | 12–18 min | 17 / 18 / 16 min |
| Countryside Champion | 15–25 min | 18 / 18 / 17 min |
| City unlocked (Coastal Champion) | 70–90 min | 95 / 85 / 73 min |
| City Champion | 3–3.5 h | 3h26 / 3h16 / 3h04 |

Car parts and cars are few and each one is worth saving for; Tap Power and Pit Crew are the
small, frequent buys in between. The bot makes about 128 purchases on the way to City Champion
(about 34 of them Tap Power), each costing a median of about 70 seconds of its income at the
time. The first part upgrade costs $60 (about 30 s of tapping).
`pacing()` returns every purchase with its cost in seconds of income, and `carGains()` checks
that every car's parts add about +30% PR.

To get there:
- Race rewards are 80% / 60% / 37.5% of the GDD table (Countryside / Coastal / City).
- Car prices: Hikari $2,500, Kodiak $18,000, Valken $40,000, Sora $120,000, Furia $220,000.
- Part prices are set per car (`upgradeBase`).
- Tap Power and Pit Crew never max out. Level n costs `cost × n^pow` (`TAP`, `CREW` in
  `src/data.js`), so a level stays within a minute or two of income and gets bought often: the bot
  buys about 34 Tap Power levels on the way to City Champion.

## Art and placeholders

- All 10 cars are original designs on two sheets: `assets/cars-side.webp` (race side views)
  and `assets/cars-pose.webp` (garage views). Crops and wheel circles are in `ART` in
  `src/data.js`. Every rival drives one of these models in its own colours (`tint`).
- Sounds and music are real recordings; see Credits below.
- Rival portraits are on `assets/portraits.jpg` (`portrait` crops in `OPPONENTS`) and show on
  the pre-race screen. Upgrade part icons are painted on `assets/parts.jpg` (`PART_ICONS` in
  `src/art.js`); Tires and Drag Slicks use the tyre stack, and the Golden Wrench the wrench,
  from the portrait sheet. The garage upgrades, RACE and achievements buttons and the cash badge
  use the painted icons on `assets/ui-icons.jpg` (`UI_ICONS`).
- Every car has its own themed scene (`assets/scene-<car>.jpg`, `SCENES` in `src/art.js`, with
  crops and floor lines). The one for the car you drive loads at startup, the rest in the
  background; the old garage (`bg-garage.jpg`) only shows while a scene is still loading.
- Not built yet from the GDD: portal adapters.

## Credits

Sound effects and music (all free for commercial use):

- Crowd cheering: "Free Crowd Cheering Sounds" by Gregor Quendel, CC BY 4.0,
  https://opengameart.org/content/free-crowd-cheering-sounds
- Tyre squeal: "Car tire squeal skid loop" by audible-edge (Tom Haigh), CC BY 3.0,
  https://opengameart.org/content/car-tire-squeal-skid-loop
- Engine loop: "racing car engine sound loops" by domasx2, CC0
- Effects: Kenney.nl Casino Audio, Interface Sounds, Digital Audio, Impact Sounds, Music Jingles
  and Sci-fi Sounds, CC0
- Music: "Awake! (Megawall-10)" by cynicmusic (CC0); "Countryside" and "Oceanside" from TAD's
  lofi compilation (CC0)

Clips are trimmed and converted to WebM (Opus) and M4A (AAC) in `assets/audio/`; the game loads
whichever the browser plays. The engine loop stays WAV so it loops without a gap.
