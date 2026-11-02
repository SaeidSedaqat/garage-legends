# Garage Legends

Cozy idle + drag-racing browser game built with **Phaser 4.2.1**, following the GDD v2.0.
Plain JavaScript modules, no build step. Phaser is included in `vendor/phaser.min.js` (MIT
licence), so the game needs no CDN. The first screen downloads about 3 MB; the other cars'
scenes follow 15 s later, and sounds and music on the first tap.

## Run it locally

Double-click `start-game.bat`. It starts a small local server and opens http://localhost:8080/.
Close the black window to stop it.

(Opening `index.html` directly from the file system won't work: browsers block JavaScript modules on `file://`.)

## How to play

- **Garage:** tap your car to earn cash (4% chance of a ×5 critical). A Golden Wrench appears every
  1–2 minutes: tap it for 30× a tap.
- **Screen layout:** the garage fills the left 70%, the panel the right 30% (on phones held
  upright the panel sits along the bottom). The panel and its cards scale with the window.
  - **‹ ›** beside the car flip through every car. Owned ones are driven straight away; others
    go on show with their stats and a Buy button (arrow keys work too).
  - **RACE** (bottom left, or R) starts the next race straight away: no menus. It shows the race
    number, its distance and its recommended PR (⚠ when your car is well short). The first 10
    races have no wait; after that RACE cools down for 15 s, 5 s longer each race up to 1 minute
    from race 20.
    **Race now** beside it plays a rewarded ad to skip the wait.
- **Upgrades** (the panel): tap one to buy its next level. Each row says what the part does and
  how much one level adds.
  - The car's own four parts. Every car has its own set, e.g. the Bulldog has a Big-Block V8,
    Supercharger, Drag Slicks and Gearbox, and the Volta X has Twin Motors and Power Cells.
    Each part has 4 levels; together they add about 30% PR. Gearbox parts widen the shift zones,
    tires, slicks and AWD soften a slow launch, and nitrous, battery and hybrid parts make nitro
    stronger.
  - Garage: Tap Power (+$1 a tap per level, no limit) and Pit Crew (taps 0.5 times a second as
    soon as race 2 is won; each level adds 0.25 taps/s, no limit),
    plus Reputation (stars and star-milestone rewards).
- **Race:** press and hold the button (or Space) when the amber lights come on, then let go the
  instant the light turns GREEN: the launch is scored on reaction time (under 0.2 s is perfect).
  Letting go early is a jump start. Tap to shift when the
  rev bar is in the green zone (its bright middle is a perfect shift). The gearing is set per race distance, so shifts come through
  most of the race.
- **Nitro (top gear):** the button turns blue. Each tap fires a strong 2.5 s burst. Tap again
  when the button flashes white at the end of a burst to **chain** it for a bigger boost;
  tapping any earlier wastes the charge. You get a few charges (2–4 on a quarter mile): enough
  for about half the way to the line, plus one for a perfect launch and one for every two
  perfect shifts (two bonus charges at most). Rivals use nitro too.
- **Dash:** a round speedometer (speed in the middle; the arc fills up to the car's top speed
  and turns blue during nitro) with the rev bar running out of its side: gear, shift zones and
  red line. The bar turns green in the shift zone and red on the limiter.
- **Feel:** speed streaks grow with speed, the camera pushes in during a nitro burst (both off
  with Reduce motion), a tag at the screen edge shows how far the rival is when it's off screen,
  and a finish closer than 4 m plays out in slow motion.
- **Achievements** (trophy icon): 24 goals from your first win to race 100, each with a cash
  reward.
- **Progress: the race ladder.** One endless line of races (`LADDER` in `src/data.js`). Every
  win moves you up a rung where the recommended PR is 4% higher, so the next race usually wants
  an upgrade or two; a loss keeps the same race (and pays 25% of the prize). Early races ask
  for up to 22% more PR than that curve (fading out by race 30), so the starter cars are matched
  and some races are lost until you upgrade. A new rival takes over every 2–3 races at first
  (`LADDER.debut`). The first 3 races are quarter miles; after that the distance depends on your
  car: a longer race only comes up when the car still gains speed for most of it (95% of top
  speed past 72% of a half mile, or 55% of a mile: `LADDER.distFit`). The starter cars stay on
  quarter miles, the Hikari to the Sora add the half, and the mile opens with the Furia; a tune
  that only adds acceleration hits top speed early and drops back to shorter races. Coastal opens at race 7 and City at race 16; from then on the races take turns across the
  open venues. Every win is a Reputation star: each adds 5% to tap income,
  and star milestones pay out cash (62★ also gives the "Garage Legend" title). Race 62 unlocks
  the Apex Zero; past PR 1290 the ladder only climbs 1% a race and five top rivals take turns.
- **Rewarded ads** (test mode): **Race now** skips the cooldown, and **2× prize** on the result
  screen pays a race's prize again. Each plays a 3-second test ad from `platform.rewardedAd()`
  in `src/platform.js`, where a portal SDK's rewarded ad goes.
- **Driving lesson:** the first race teaches launch, shifting and nitro one step at a time.
  At each key moment the race freezes, slow motion leads into it, and it waits until you do
  the move. Jump starts restart the countdown, and the rival never gets past you, so the
  lesson always ends in a (close) win. Replay it any time from **Settings**: no rewards, and a
  summary of how each skill went.
- **First session:** a short guide points at the first upgrade, then at RACE.
- **Settings** (gear icon): sound, reduce motion, KM/H (default) or MPH, stats, the driving
  lesson, reset progress.

Saves from before the ladder start just above the hardest race they had won (by recommended
PR), with the star milestones below that counted as claimed.

Progress saves automatically in the browser (localStorage). Automation keeps earning at half rate
while you're away (up to 2 hours).

## Project layout

| File | What it does |
|---|---|
| `src/data.js` | All cars, their parts, the race ladder, rivals, economy and sim constants — tune the game here |
| `src/tuning.js` | What a car's parts do to its stats and what the next level costs |
| `src/physics.js` | The race simulation (GDD §6.9) and AI driver; no Phaser, so it runs headless |
| `src/state.js` | Money, upgrades, stars, progression, saving and save migration |
| `src/art.js` | Cuts sprites out of their magenta backgrounds, placeholder recolors, mockup crops |
| `src/ui.js` + `style.css` | Menus, HUD and dialogs (HTML over the game canvas) |
| `src/scenes/` | Phaser scenes: boot, garage, race |
| `assets/` | Car, prop and background art |
| `src/platform.js` | Portal SDK hooks; rewarded ads play a 3-second test ad until a portal is chosen |
| `tools/balance.html` | Balance check: win rates up the ladder, the pacing bot and the rival ratios |
| `tools/promo.html` | Builds the store cover (1280×720), icon (512×512) and tab icon from the game's own cars, scenes and logo, ready to download |

## Balancing

Open http://localhost:8080/tools/balance.html. It shows, for races 1–60, the win rate at the
recommended PR for three drivers, runs the pacing bot, and works out `LADDER.ratio` (rival PR ÷
recommended PR at which a sharp driver wins ~65%, per rival and distance). After changing cars,
rivals or sim constants in `src/data.js`, re-run it and copy the ratios back. Each roster rival's
`pr` is the recommended PR in the middle of their stint (from `debut`); the ratios are worked out
there.

Rivals are tuned against a **sharp** driver: a perfect launch, every other shift perfect, nitro
fired (not chained). Skill and upgrades both matter. At a race's recommended PR:

| Driving | Win rate |
|---|---|
| Flawless: perfect launches and shifts, chained nitro | ~100% (~80% with 10% less PR) |
| Sharp (the target) | ~65% (~95% with 10% more PR) |
| Good launches and shifts, nitro fired | ~10% (~30% with 10% more PR, ~70% with 20% more) |

So a good-but-not-sharp player needs a car 15–20% over the recommendation, and even a flawless
one can't skip upgrades for long.

Rivals' form varies a little from race to race (`SIM.aiForm`), so results aren't all-or-nothing.

The economy is tuned with the pacing bot (`pacing()` in `tools/balance.js`). The bot taps at
2 taps/s, buys the next car as soon as it can, otherwise whatever adds the most PR per dollar,
and races whenever RACE is ready and its PR is within 10% of the recommendation (`edge` makes
it a better driver):

| Milestone | Sharp driver | Flawless driver | Sharp, watching every skip ad |
|---|---|---|---|
| Race 10 | 8 min | 6 min | 8 min |
| Car 2 (Ronin, $1,200) | 10 min | 9 min | 10 min |
| Car 3 (Hikari, $6,000) | 22 min | 17 min | 16 min |
| Race 30 | 39 min | 32 min | 23 min |
| Race 40 | 54 min | 48 min | 35 min |
| Race 62 (Apex Zero) | 2h30 | 2h05 | 2h15 |

Up to about race 50 the cooldown sets the pace; after that the next car's price does, with a
few waits of 10–17 minutes around races 47–62 saving for the next car.

To get there:
- A win pays `LADDER.reward` × (rec ÷ 90)^`rewardPow`, with rec from the curve before the early
  lift ($60 at race 1, $1,800 at race 30, $79K at race 62); star milestones top it up.
- Car prices: Ronin $1,200, Hikari $6,000, Bulldog $20,000, Kodiak $45,000, Valken $100,000,
  Sora $300,000, Furia $550,000, Volta $2.5M, Apex $6M.
- Part prices are set per car (`upgradeBase` × `PART_COST`, ×1.8 a level).
- Tap Power and Pit Crew never max out. Level n costs `cost × n^pow` (`TAP`, `CREW` in
  `src/data.js`), so a level stays within a minute or two of income and gets bought often.

## Art and placeholders

- All 10 cars are original designs on two sheets: `assets/cars-side.webp` (race side views)
  and `assets/cars-pose.webp` (garage views). Crops and wheel circles are in `ART` in
  `src/data.js`. Every rival drives one of these models in its own colours (`tint`).
- Sounds and music are real recordings; see Credits below.
- Rival portraits are on `assets/portraits.webp` (`portrait` crops in `OPPONENTS`). They are
  not shown since the pre-race screen went (kept for a later rival intro). Upgrade part icons are painted on `assets/parts.webp` (`PART_ICONS` in
  `src/art.js`); Tires and Drag Slicks use the tyre stack, and the Golden Wrench the wrench,
  from the portrait sheet. The garage upgrades, RACE and achievements buttons and the cash badge
  use the painted icons on `assets/ui-icons.webp` (`UI_ICONS`).
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
