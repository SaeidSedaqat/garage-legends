// Game content and tuning, following the GDD v2.0. Every balance number lives here.

// ---------------------------------------------------------------- art sources

// Car art: `crop` is [x, y, w, h] and `wheels` are [x, y, radius], both in source-image pixels.
const sprite = (file, crop, wheels, flip = false) => ({ file: `assets/${file}`, crop, wheels, flip });
// Three-quarter showroom pose used in the garage and the Cars menu.
const pose = crop => ({ file: 'assets/garage-cars.jpg', crop });

export const ART = {
  kaze: {
    side: sprite('car-kaze-hatch.jpg', [65, 111, 1291, 593], [[262, 585, 115], [1135, 585, 115]]),
    pose: pose([423, 9, 598, 255]),
  },
  ronin: {
    side: sprite('car-ronin-compact.jpg', [38, 156, 1352, 548], [[262, 586, 114], [1135, 585, 115]]),
    pose: pose([377, 265, 652, 246]),
  },
  hikari: {
    side: sprite('car-hikari-coupe.jpg', [26, 172, 1362, 530], [[262, 584, 114], [1137, 584, 114]]),
    pose: pose([353, 514, 699, 247]),
  },
  rusty: { side: sprite('opp-rusty.jpg', [22, 171, 1367, 533], [[273, 585, 115], [1137, 584, 115]]) },
  dusty: { side: sprite('opp-dusty-fox.jpg', [292, 15, 824, 395], [[426, 339, 67], [955, 340, 66]]) },
  fox: { side: sprite('opp-dusty-fox.jpg', [231, 422, 1036, 325], [[440, 662, 81], [1054, 661, 82]], true) },
};

// ---------------------------------------------------------------- cars (GDD §4.2)

// `art` names a source above; `tint` is [hue shift°, saturation ×, lightness ×] for placeholder
// recolors until a car gets its own art. `redlineRpm` is for display only.
export const CARS = [
  {
    id: 'kaze', tier: 1, name: 'Kaze Hatch', tagline: 'Simple, reliable, ready for the journey.', niche: 'Forgiving starter',
    price: 0, stats: { launch: 12, accel: 12, topSpeed: 10, shiftWindow: 0.75, gears: 4 }, upgradeBase: 3, redlineRpm: 6800,
    art: 'kaze',
  },
  {
    id: 'ronin', tier: 2, name: 'Ronin Compact', tagline: 'A classic with real character.', niche: 'Very easy to drive',
    price: 500, stats: { launch: 15, accel: 16, topSpeed: 14, shiftWindow: 0.8, gears: 4 }, upgradeBase: 12, redlineRpm: 8200,
    art: 'ronin',
  },
  {
    id: 'hikari', tier: 3, name: 'Hikari Coupe', tagline: 'Balance, style and control.', niche: 'Balanced tuner',
    price: 2500, stats: { launch: 19, accel: 23, topSpeed: 24, shiftWindow: 0.72, gears: 5 }, upgradeBase: 37, redlineRpm: 7500,
    art: 'hikari',
  },
  {
    id: 'bulldog', tier: 4, name: "Bulldog '70", tagline: 'Raw power and timeless appeal.', niche: 'Huge mid-range punch, wheelspin-prone launch',
    price: 8000, stats: { launch: 24, accel: 32, topSpeed: 30, shiftWindow: 0.62, gears: 4 }, upgradeBase: 100, redlineRpm: 6200,
    launchQuirk: 'wheelspin', art: 'ronin', tint: [28, 1.15, 1.05],
  },
  {
    id: 'kodiak', tier: 5, name: 'Kodiak Rally', tagline: 'Built for grip, not just straight lines.', niche: 'Best launch for its tier, rules the quarter mile',
    price: 22000, stats: { launch: 44, accel: 38, topSpeed: 34, shiftWindow: 0.78, gears: 5 }, upgradeBase: 280, redlineRpm: 7800,
    art: 'kaze', tint: [12, 1.5, 0.72],
  },
  {
    id: 'valken', tier: 6, name: 'Valken GT', tagline: 'Power, precision, all around.', niche: 'All-rounder, strong at the half mile',
    price: 60000, stats: { launch: 48, accel: 52, topSpeed: 56, shiftWindow: 0.75, gears: 6 }, upgradeBase: 700, redlineRpm: 7600,
    art: 'hikari', tint: [0, 0.12, 1.2],
  },
  {
    id: 'sora', tier: 7, name: 'Sora Roadster', tagline: 'Lightweight fun, maximum feel.', niche: 'Widest shift window, the easiest perfect runs',
    price: 150000, stats: { launch: 62, accel: 64, topSpeed: 54, shiftWindow: 0.88, gears: 6 }, upgradeBase: 1850, redlineRpm: 8000,
    art: 'ronin', tint: [48, 1.2, 1.15],
  },
  {
    id: 'furia', tier: 8, name: 'Furia V10', tagline: "Speed isn't a dream anymore.", niche: 'Top-speed monster, demanding shifts',
    price: 400000, stats: { launch: 70, accel: 76, topSpeed: 80, shiftWindow: 0.68, gears: 7 }, upgradeBase: 4600, redlineRpm: 8500,
    art: 'hikari', tint: [-85, 1.5, 1.2],
  },
  {
    id: 'volta', tier: 9, name: 'Volta X', tagline: "The edge of what's possible.", niche: 'Mile specialist',
    price: 1000000, stats: { launch: 86, accel: 90, topSpeed: 94, shiftWindow: 0.7, gears: 7 }, upgradeBase: 11500, redlineRpm: 9000,
    art: 'hikari', tint: [0, 0.08, 1.55],
  },
  {
    id: 'apex', tier: 10, name: 'Apex Zero', tagline: 'A machine for the few.', niche: 'The ultimate',
    price: 2500000, requires: 'city_5', stats: { launch: 96, accel: 100, topSpeed: 100, shiftWindow: 0.76, gears: 7 }, upgradeBase: 25000, redlineRpm: 9500,
    art: 'hikari', tint: [0, 0.3, 0.42],
  },
];

// ---------------------------------------------------------------- venues and events (GDD §5, §7.2)

export const DIST = {
  quarter: { m: 402, label: '1/4 MILE' },
  half: { m: 805, label: '1/2 MILE' },
  mile: { m: 1609, label: '1 MILE' },
};

// `sky` is a frame of the mockup sheet; the ground colors set the verge and asphalt.
export const ENVS = [
  { id: 'countryside', name: 'Countryside Drag Strip', short: 'Countryside', tag: 'Beginner', sky: 'countrySky', verge: ['#4c663c', '#718748'], asphalt: ['#514a58', '#2c2833'] },
  { id: 'coastal', name: 'Coastal Raceway', short: 'Coastal', tag: 'Midgame', sky: 'coastSky', verge: ['#c9b48a', '#e2cf9f'], asphalt: ['#55545c', '#2f2f36'], requires: 'country_5' },
  { id: 'city', name: 'City Raceway', short: 'City', tag: 'Late game', sky: 'citySky', verge: ['#2c2a3c', '#3a3550'], asphalt: ['#35324a', '#1a1828'], requires: 'coast_5' },
];

// AI driving: reaction time (s), chance to land the launch band, and how each shift lands.
// `name` is how the pre-race screen describes the driver.
const SLOPPY = { name: 'Rookie', reaction: [0.38, 0.06], launch: 0.5, shift: { perfect: 0.05, good: 0.6, early: 0.2, late: 0.15 } };
const STEADY = { name: 'Steady', reaction: [0.3, 0.04], launch: 0.75, shift: { perfect: 0.15, good: 0.75, early: 0.05, late: 0.05 } };
const SHARP = { name: 'Sharp', reaction: [0.25, 0.03], launch: 0.9, shift: { perfect: 0.35, good: 0.6, early: 0.03, late: 0.02 } };
const ACE = { name: 'Ace', reaction: [0.2, 0.02], launch: 0.97, shift: { perfect: 0.55, good: 0.43, early: 0.01, late: 0.01 } };

// `pr` is the opponent's Performance Rating; its car's stats are scaled to hit it.
// Opponent PRs come from tools/balance.js: a player at the event's recommended PR with
// Good launches and Good shifts wins about 70% of the time.
export const OPPONENTS = {
  rusty: { name: 'The Rusty', carId: 'kaze', pr: 96, ai: SLOPPY, art: 'rusty' },
  dusty: { name: 'Dusty Dan', carId: 'kaze', pr: 114, ai: STEADY, art: 'dusty' },
  mira: { name: 'Mira', carId: 'ronin', pr: 144, ai: STEADY, art: 'ronin', tint: [200, 1.1, 1.05] },
  hank: { name: 'Hank', carId: 'ronin', pr: 186, ai: STEADY, art: 'ronin', tint: [120, 0.9, 0.9] },
  fox: { name: 'Silver Fox', carId: 'hikari', pr: 224, ai: STEADY, art: 'fox' },
  sol: { name: 'Sol', carId: 'hikari', pr: 269, ai: STEADY, art: 'hikari', tint: [-150, 1.3, 1.15] },
  marina: { name: 'Marina', carId: 'bulldog', pr: 324, ai: STEADY, art: 'ronin', tint: [-60, 1.1, 0.9] },
  rocco: { name: 'Rocco', carId: 'bulldog', pr: 380, ai: SHARP, art: 'rusty', tint: [180, 0.6, 0.9] },
  jade: { name: 'Jade', carId: 'kodiak', pr: 455, ai: SHARP, art: 'dusty', tint: [100, 1.2, 0.9] },
  reef: { name: 'Captain Reef', carId: 'valken', pr: 522, ai: SHARP, art: 'fox', tint: [0, 0.2, 1.25] },
  neon: { name: 'Neon', carId: 'valken', pr: 564, ai: SHARP, art: 'hikari', tint: [130, 1.6, 1.1] },
  vex: { name: 'Vex', carId: 'sora', pr: 640, ai: { ...SHARP, launch: 1 }, art: 'ronin', tint: [-100, 1.3, 0.75] },
  duke: { name: 'Duke', carId: 'furia', pr: 731, ai: SHARP, art: 'hikari', tint: [-170, 1.2, 0.85] },
  aria: { name: 'Aria', carId: 'furia', pr: 810, ai: ACE, art: 'fox', tint: [-60, 1.2, 1.1] },
  legend: { name: 'The Legend', carId: 'volta', pr: 904, ai: ACE, art: 'hikari', tint: [15, 1.3, 1.25] },
  // Legend Series rivals: their PR is set per round (see LEGEND below)
  storm: { name: 'Storm', carId: 'apex', pr: 1000, ai: ACE, art: 'hikari', tint: [0, 1.3, 0.75] },
  ghost: { name: 'Ghost', carId: 'volta', pr: 1000, ai: ACE, art: 'fox', tint: [0, 0.05, 1.35] },
  blaze: { name: 'Blaze', carId: 'furia', pr: 1000, ai: ACE, art: 'ronin', tint: [0, 1.3, 0.95] },
  frost: { name: 'Frost', carId: 'sora', pr: 1000, ai: ACE, art: 'kaze', tint: [-25, 0.6, 1.3] },
  crown: { name: 'The Crown', carId: 'apex', pr: 1000, ai: ACE, art: 'ronin', tint: [40, 1.1, 1.2] },
};

// Rewards: `win` when winning (a finish without winning pays LOSS_PCT of it), `first` once on
// the first win, `champion` once on a venue's last event. The pacing bot in tools/balance.js
// ran the GDD's reward table about 2.5× faster than the §9.5 targets, so rewards are scaled
// to 40% (Countryside), 30% (Coastal), 25% (City) and champion bonuses to 50%.
export const EVENTS = [
  { id: 'country_1', env: 'countryside', name: 'First Run', dist: 'quarter', opp: 'rusty', rec: 90, win: 16, first: 24 },
  { id: 'country_2', env: 'countryside', name: 'Local Rival', dist: 'quarter', opp: 'dusty', rec: 120, win: 28, first: 40 },
  { id: 'country_3', env: 'countryside', name: 'Weekend Challenge', dist: 'quarter', opp: 'mira', rec: 150, win: 48, first: 72 },
  { id: 'country_4', env: 'countryside', name: 'Long Straight', dist: 'half', opp: 'hank', rec: 190, win: 80, first: 120 },
  { id: 'country_5', env: 'countryside', name: 'Countryside Champion', dist: 'half', opp: 'fox', rec: 230, win: 140, first: 240, champion: 1000 },
  { id: 'coast_1', env: 'coastal', name: 'Coastal Debut', dist: 'quarter', opp: 'sol', rec: 280, win: 180, first: 300 },
  { id: 'coast_2', env: 'coastal', name: 'Seaside Rival', dist: 'half', opp: 'marina', rec: 330, win: 300, first: 480 },
  { id: 'coast_3', env: 'coastal', name: 'Cliffside Challenge', dist: 'half', opp: 'rocco', rec: 400, win: 510, first: 750 },
  { id: 'coast_4', env: 'coastal', name: 'Sunset Sprint', dist: 'mile', opp: 'jade', rec: 470, win: 840, first: 1350 },
  { id: 'coast_5', env: 'coastal', name: 'Coastal Champion', dist: 'mile', opp: 'reef', rec: 540, win: 1350, first: 2400, champion: 12500 },
  { id: 'city_1', env: 'city', name: 'Night Qualifier', dist: 'half', opp: 'neon', rec: 600, win: 1900, first: 3000 },
  { id: 'city_2', env: 'city', name: 'City Rival', dist: 'half', opp: 'vex', rec: 680, win: 3000, first: 5000 },
  { id: 'city_3', env: 'city', name: 'Midnight Challenge', dist: 'mile', opp: 'duke', rec: 760, win: 5000, first: 8800 },
  { id: 'city_4', env: 'city', name: 'Grand Prix Drag', dist: 'mile', opp: 'aria', rec: 860, win: 8800, first: 15000 },
  { id: 'city_5', env: 'city', name: 'City Champion', dist: 'mile', opp: 'legend', rec: 960, win: 15000, first: 25000, champion: 125000 },
];

export const LOSS_PCT = 0.25;

// Star medal times in seconds (silver, gold), generated by the balance check.
export const MEDALS = {
  country_1: [13.87, 13.48], country_2: [13.32, 12.87], country_3: [12.78, 12.28], country_4: [19.8, 19.19], country_5: [18.67, 17.84],
  coast_1: [11.06, 10.32], coast_2: [16.71, 15.87], coast_3: [15.65, 14.77], coast_4: [26.63, 25.3], coast_5: [23.88, 22.36],
  city_1: [13.64, 12.52], city_2: [13.31, 12.22], city_3: [20.55, 18.94], city_4: [19.32, 17.73], city_5: [18.37, 16.79],
};

// ---------------------------------------------------------------- Legend Series (endgame)

// Unlocked by winning City Champion: endless rounds against five rivals, cycling through the
// venues and distances. The recommended PR climbs `growth` per round up to `softCap`, about a
// maxed Apex Zero (PR 1287), then only `lateGrowth`, so later rounds are won on launches and
// shifts: with a maxed car, Good driving tops out around round 15 and Perfect around round 24.
// `ratio` is opponent PR ÷ recommended PR for a ~70% win at Good inputs, from tools/balance.js.
export const LEGEND = {
  unlock: 'city_5',
  rec: 1000,
  growth: 0.035,
  softCap: 1290,
  lateGrowth: 0.01,
  win: 20000,
  winGrowth: 0.15,
  rivals: ['storm', 'ghost', 'blaze', 'frost', 'crown'],
  dists: ['quarter', 'half', 'mile'],
  envs: ['city', 'coastal', 'countryside'],
  ratio: {
    storm: { quarter: 0.856, half: 0.898, mile: 0.942 },
    ghost: { quarter: 0.856, half: 0.89, mile: 0.927 },
    blaze: { quarter: 0.845, half: 0.883, mile: 0.915 },
    frost: { quarter: 0.857, half: 0.93, mile: 1.005 },
    crown: { quarter: 0.855, half: 0.898, mile: 0.941 },
  },
};

// ---------------------------------------------------------------- upgrades (GDD §8)

// Car upgrades: +3% to one stat per level, levels 0–10. Cost = upgradeBase × weight × 1.35^level.
export const CAR_UPGRADES = {
  engine: { name: 'Engine', icon: 'engine', stat: 'accel', weight: 1, desc: 'Acceleration in every gear.' },
  turbo: { name: 'Turbo', icon: 'turbo', stat: 'topSpeed', weight: 1.5, desc: 'More top speed.', needs: { engine: 3 } },
  tires: { name: 'Tires', icon: 'tire', stat: 'launch', weight: 1, desc: 'Launch grip and a wider launch band.' },
  trans: { name: 'Transmission', icon: 'gear', stat: null, weight: 1.25, desc: 'Wider shift zones, quicker shifts.', needs: { engine: 1 } },
};
export const MAX_LEVEL = 10;
export const PER_LEVEL = 0.03;

export const CLICK_BASE = [1, 2, 3, 5, 8, 12, 18, 27, 40, 60, 90];
export const CLICK_COST = [null, 15, 60, 200, 600, 1800, 5000, 14000, 40000, 110000, 300000];
export const AUTO_CPS = [0, 0.2, 0.4, 0.7, 1, 1.4, 1.9, 2.5, 3.2, 4, 5];
export const AUTO_COST = [null, 300, 1200, 4000, 12000, 35000, 90000, 220000, 500000, 1100000, 2400000];
export const AUTO_UNLOCK = 'country_2';

export const CRIT = { chance: 0.04, mult: 5 };
export const WRENCH = { every: [60, 120], lasts: 8, mult: 30 };
export const OFFLINE = { rate: 0.5, capS: 2 * 3600 };
export const STAR_BONUS = 0.05; // click value × (1 + 0.05 × stars)

// Star milestones: cash rewards, or decor that appears in the garage (`key` picks the piece).
export const MILESTONES = [
  { stars: 3, decor: 'Trophy shelf', key: 'shelf' },
  { stars: 6, cash: 500 },
  { stars: 10, decor: 'Wall posters', key: 'posters' },
  { stars: 15, cash: 10000 },
  { stars: 20, decor: 'String lights', key: 'lights' },
  { stars: 25, cash: 75000 },
  { stars: 30, decor: 'Car lift', key: 'lift' },
  { stars: 38, cash: 500000 },
  { stars: 45, decor: 'Neon LEGEND sign', key: 'neon', title: 'Garage Legend' },
];

// ---------------------------------------------------------------- race simulation (GDD §6)

export const SIM = {
  dt: 1 / 120,
  shiftCenter: 0.86,
  goodHalf: 0.07,
  perfectHalf: 0.025,
  // tuned up from the GDD's starting values so the skill gap lands in the §6.5 band
  shiftTime: { perfect: 0.06, good: 0.2, early: 0.35, late: 0.35 },
  perfectBoost: { mult: 1.12, time: 1 },
  earlyBog: { mult: 0.6, time: 1 },
  limiterMult: 0.15,
  launchCenter: 0.65,
  launchWidth: 0.18,
  launchFade: 2,
  jumpHold: 0.6,
  lateWait: 0.35, // how long a "late" scripted driver sits on the limiter before shifting
  // Rev-range fraction per second while holding. Releasing before green is a jump start, so the
  // launch skill is when to start holding: slow enough that the needle sits in the band ~0.5 s.
  revRate: 0.35,
  revFall: 2.2,   // ... and while released
  postFinish: 3,  // race ends this long after the player crosses
};
