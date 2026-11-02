// Game content and tuning, following the GDD v2.0. Every balance number lives here.

// ---------------------------------------------------------------- art sources

// Car art: `crop` is [x, y, w, h] and `wheels` are [x, y, radius], both in source-image pixels.
// All ten cars are original designs on two sheets: side views for races, three-quarter
// showroom poses for the garage.
const SIDE = 'cars-side.webp';
const sprite = (file, crop, wheels, flip = false) => ({ file: `assets/${file}`, crop, wheels, flip });
const pose = crop => ({ file: 'assets/cars-pose.webp', crop });

export const ART = {
  kaze: {
    side: sprite(SIDE, [73, 54, 447, 194], [[139, 202, 42], [424, 202, 43]]),
    pose: pose([99, 36, 437, 220]),
  },
  ronin: {
    side: sprite(SIDE, [651, 60, 538, 186], [[759, 199, 44], [1065, 197, 46]]),
    pose: pose([654, 43, 517, 216]),
  },
  hikari: {
    side: sprite(SIDE, [45, 295, 547, 172], [[150, 421, 43], [465, 423, 41]]),
    pose: pose([55, 279, 533, 201]),
  },
  bulldog: {
    side: sprite(SIDE, [643, 292, 564, 179], [[764, 419, 49], [1089, 423, 43]]),
    pose: pose([644, 283, 565, 204]),
  },
  kodiak: {
    side: sprite(SIDE, [52, 510, 502, 209], [[144, 664, 51], [448, 666, 50]]),
    pose: pose([65, 493, 503, 237]),
  },
  valken: {
    side: sprite(SIDE, [630, 538, 587, 171], [[740, 658, 48], [1090, 661, 45]]),
    pose: pose([638, 532, 571, 196]),
  },
  sora: {
    side: sprite(SIDE, [51, 771, 522, 169], [[150, 894, 43], [452, 896, 41]]),
    pose: pose([57, 761, 512, 183]),
  },
  furia: {
    side: sprite(SIDE, [638, 770, 578, 171], [[732, 892, 46], [1080, 892, 46]]),
    pose: pose([641, 768, 562, 185]),
  },
  volta: {
    side: sprite(SIDE, [36, 1000, 556, 168], [[124, 1119, 45], [466, 1124, 41]]),
    pose: pose([41, 985, 556, 192]),
  },
  apex: {
    side: sprite(SIDE, [632, 1006, 589, 172], [[729, 1121, 49], [1071, 1132, 43]]),
    pose: pose([638, 986, 580, 213]),
  },
};

// ---------------------------------------------------------------- cars (GDD §4.2)

// `art` names a source above. `redlineRpm` is for display only.
export const CARS = [
  {
    id: 'kaze', tier: 1, name: 'Kaze Hatch', tagline: 'Simple, reliable, ready for the journey.', niche: 'Forgiving starter',
    price: 0, stats: { launch: 12, accel: 12, topSpeed: 10, shiftWindow: 0.75, gears: 4 }, upgradeBase: 15, redlineRpm: 6800,
    art: 'kaze',
    parts: ['engine', 'tires', 'exhaust', 'gearbox'],
  },
  {
    id: 'ronin', tier: 2, name: 'Ronin Compact', tagline: 'A classic with real character.', niche: 'Very easy to drive',
    price: 1200, stats: { launch: 15, accel: 16, topSpeed: 14, shiftWindow: 0.8, gears: 4 }, upgradeBase: 24, redlineRpm: 8200,
    art: 'ronin',
    parts: ['engine', 'tires', 'ecu', 'gearbox'],
  },
  {
    id: 'hikari', tier: 3, name: 'Hikari Coupe', tagline: 'Balance, style and control.', niche: 'Balanced tuner',
    price: 6000, stats: { launch: 19, accel: 23, topSpeed: 24, shiftWindow: 0.72, gears: 5 }, upgradeBase: 90, redlineRpm: 7500,
    art: 'hikari',
    parts: ['engine', 'turbo', 'tires', 'gearbox'],
  },
  {
    id: 'bulldog', tier: 4, name: "Bulldog '70", tagline: 'Raw power and timeless appeal.', niche: 'Huge mid-range punch, wheelspin-prone launch',
    price: 20000, stats: { launch: 24, accel: 32, topSpeed: 30, shiftWindow: 0.62, gears: 4 }, upgradeBase: 200, redlineRpm: 6200,
    launchQuirk: 'wheelspin', art: 'bulldog',
    parts: ['bigblock', 'supercharger', 'slicks', 'gearbox'],
  },
  {
    id: 'kodiak', tier: 5, name: 'Kodiak Rally', tagline: 'Built for grip, not just straight lines.', niche: 'Best launch for its tier, rules the quarter mile',
    price: 45000, stats: { launch: 44, accel: 38, topSpeed: 34, shiftWindow: 0.78, gears: 5 }, upgradeBase: 400, redlineRpm: 7800,
    art: 'kodiak',
    parts: ['engine', 'turbo', 'awd', 'gearbox'],
  },
  {
    id: 'valken', tier: 6, name: 'Valken GT', tagline: 'Power, precision, all around.', niche: 'All-rounder, strong at the half mile',
    price: 100000, stats: { launch: 48, accel: 52, topSpeed: 56, shiftWindow: 0.75, gears: 6 }, upgradeBase: 1000, redlineRpm: 7600,
    art: 'valken',
    parts: ['engine', 'aero', 'tires', 'nitrous'],
  },
  {
    id: 'sora', tier: 7, name: 'Sora Roadster', tagline: 'Lightweight fun, maximum feel.', niche: 'Widest shift window, the easiest perfect runs',
    price: 300000, stats: { launch: 62, accel: 64, topSpeed: 54, shiftWindow: 0.88, gears: 6 }, upgradeBase: 3000, redlineRpm: 8000,
    art: 'sora',
    parts: ['engine', 'weight', 'tires', 'gearbox'],
  },
  {
    id: 'furia', tier: 8, name: 'Furia V10', tagline: "Speed isn't a dream anymore.", niche: 'Top-speed monster, demanding shifts',
    price: 550000, stats: { launch: 70, accel: 76, topSpeed: 80, shiftWindow: 0.68, gears: 7 }, upgradeBase: 7500, redlineRpm: 8500,
    art: 'furia',
    parts: ['engine', 'aero', 'slicks', 'seqbox'], partNames: { engine: 'V10 Tune' },
  },
  {
    id: 'volta', tier: 9, name: 'Volta X', tagline: "The edge of what's possible.", niche: 'Mile specialist',
    price: 2500000, stats: { launch: 86, accel: 90, topSpeed: 94, shiftWindow: 0.7, gears: 7 }, upgradeBase: 11500, redlineRpm: 9000,
    art: 'volta',
    parts: ['motor', 'battery', 'tires', 'gearbox'], partNames: { gearbox: 'Drive Unit' },
  },
  {
    id: 'apex', tier: 10, name: 'Apex Zero', tagline: 'A machine for the few.', niche: 'The ultimate',
    price: 6000000, requires: 62, stats: { launch: 96, accel: 100, topSpeed: 100, shiftWindow: 0.76, gears: 7 }, upgradeBase: 25000, redlineRpm: 9500,
    art: 'apex',
    parts: ['engine', 'hybrid', 'aero', 'seqbox'],
  },
];

// ---------------------------------------------------------------- venues and the race ladder (GDD §5, §7.2)

export const DIST = {
  quarter: { m: 402, label: '1/4 MILE', short: '¼ mi' },
  half: { m: 805, label: '1/2 MILE', short: '½ mi' },
  mile: { m: 1609, label: '1 MILE', short: '1 mi' },
};

// Where a race is held, by how far up the ladder it is. `sky` is a frame of the sky sheet; the
// ground colors set the verge and asphalt.
export const ENVS = [
  { id: 'countryside', name: 'Countryside Drag Strip', short: 'Countryside', sky: 'countrySky', verge: ['#4c663c', '#718748'], asphalt: ['#514a58', '#2c2833'] },
  { id: 'coastal', name: 'Coastal Raceway', short: 'Coastal', sky: 'coastSky', verge: ['#c9b48a', '#e2cf9f'], asphalt: ['#55545c', '#2f2f36'] },
  { id: 'city', name: 'City Raceway', short: 'City', sky: 'citySky', verge: ['#2c2a3c', '#3a3550'], asphalt: ['#35324a', '#1a1828'] },
];

// AI driving: reaction time (s), chance to land the launch band, and how each shift lands.
// `name` is how the pre-race screen describes the driver.
const SLOPPY = { name: 'Rookie', reaction: [0.38, 0.06], launch: 0.5, shift: { perfect: 0.05, good: 0.6, early: 0.2, late: 0.15 } };
const STEADY = { name: 'Steady', reaction: [0.3, 0.04], launch: 0.75, shift: { perfect: 0.15, good: 0.75, early: 0.05, late: 0.05 } };
const SHARP = { name: 'Sharp', reaction: [0.25, 0.03], launch: 0.9, shift: { perfect: 0.35, good: 0.6, early: 0.03, late: 0.02 } };
const ACE = { name: 'Ace', reaction: [0.2, 0.02], launch: 0.97, shift: { perfect: 0.55, good: 0.43, early: 0.01, late: 0.01 } };

// `pr` is the opponent's Performance Rating; its car's stats are scaled to hit it.
// Opponent PRs come from tools/balance.js: a player at the event's recommended PR with
// Good launches and Good shifts wins about 70% of the time. `portrait` is the driver's
// [x, y, w, h] on assets/portraits.webp.
export const OPPONENTS = {
  rusty: { name: 'The Rusty', carId: 'kaze', pr: 115, ai: SLOPPY, art: 'kaze', tint: [175, 0.45, 0.75], portrait: [9, 23, 128, 144] },
  dusty: { name: 'Dusty Dan', carId: 'kaze', pr: 122, ai: STEADY, art: 'kaze', tint: [170, 0.25, 1.1], portrait: [291, 18, 110, 150] },
  mira: { name: 'Mira', carId: 'ronin', pr: 130, ai: STEADY, art: 'ronin', tint: [200, 1.1, 1.05], portrait: [429, 26, 106, 143] },
  hank: { name: 'Hank', carId: 'ronin', pr: 143, ai: STEADY, art: 'ronin', tint: [120, 0.9, 0.9], portrait: [698, 21, 139, 156] },
  fox: { name: 'Silver Fox', carId: 'hikari', pr: 159, ai: STEADY, art: 'hikari', tint: [0, 0.08, 1.35], portrait: [846, 23, 113, 144] },
  sol: { name: 'Sol', carId: 'hikari', pr: 180, ai: STEADY, art: 'hikari', tint: [-150, 1.3, 1.15], portrait: [1110, 22, 120, 147] },
  marina: { name: 'Marina', carId: 'bulldog', pr: 205, ai: STEADY, art: 'bulldog', tint: [195, 1, 0.65], portrait: [156, 188, 114, 136] },
  rocco: { name: 'Rocco', carId: 'bulldog', pr: 232, ai: SHARP, art: 'bulldog', tint: [100, 0.8, 0.75], portrait: [839, 190, 121, 134] },
  jade: { name: 'Jade', carId: 'kodiak', pr: 264, ai: SHARP, art: 'kodiak', tint: [150, 1, 1.1], portrait: [295, 183, 105, 140] },
  reef: { name: 'Captain Reef', carId: 'valken', pr: 304, ai: SHARP, art: 'valken', tint: [0, 1, 0.6], portrait: [976, 186, 117, 138] },
  neon: { name: 'Neon', carId: 'valken', pr: 369, ai: SHARP, art: 'furia', tint: [-125, 1.15, 1.05], portrait: [17, 339, 111, 140] },
  vex: { name: 'Vex', carId: 'sora', pr: 449, ai: { ...SHARP, launch: 1 }, art: 'sora', tint: [-100, 1.2, 0.8], portrait: [155, 347, 111, 132] },
  duke: { name: 'Duke', carId: 'furia', pr: 547, ai: SHARP, art: 'furia', tint: [-85, 1.1, 0.9], portrait: [292, 344, 107, 135] },
  aria: { name: 'Aria', carId: 'furia', pr: 665, ai: ACE, art: 'furia', tint: [130, 1.1, 1], portrait: [427, 345, 113, 135] },
  legend: { name: 'The Legend', carId: 'volta', pr: 778, ai: ACE, art: 'volta', tint: [0, 1, 0.45], portrait: [416, 712, 94, 110] },
  // the top of the ladder: their PR is set per race (see LADDER below)
  storm: { name: 'Storm', carId: 'apex', pr: 1000, ai: ACE, art: 'apex', tint: [0, 1, 1.6], portrait: [700, 191, 127, 133] },
  ghost: { name: 'Ghost', carId: 'volta', pr: 1000, ai: ACE, art: 'volta', tint: [0, 1, 0.8], portrait: [977, 26, 118, 141] },
  blaze: { name: 'Blaze', carId: 'furia', pr: 1000, ai: ACE, art: 'furia', tint: [-60, 1.2, 1], portrait: [28, 705, 94, 118] },
  frost: { name: 'Frost', carId: 'sora', pr: 1000, ai: ACE, art: 'sora', tint: [150, 0.6, 1.2], portrait: [843, 348, 108, 131] },
  crown: { name: 'The Crown', carId: 'apex', pr: 1000, ai: ACE, art: 'apex', tint: [0, 1, 1.3], portrait: [561, 347, 127, 132] },
};

// ---------------------------------------------------------------- the race ladder

// One endless line of races, no menus: RACE starts the next one. Each win moves the player up a
// rung, where the recommended PR is `growth` higher (so the next race wants an upgrade or two),
// up to `softCap` (about a maxed Apex Zero) and only `lateGrowth` after that. A loss keeps the
// same race. After the first few races RACE cools down between races (a rewarded ad skips it).
//
// Each driver in `roster` races from their `debut` until the next one's; from `endFrom` the
// `endRivals` take turns.
// `ratio` is rival PR ÷ recommended PR for a ~65% win by a sharp driver (perfect launch, every
// other shift perfect, nitro fired), per rival and distance, from tools/balance.js (`ladderRatios()`).
// A win pays `reward` × (curve rec ÷ `rec`)^`rewardPow`; a loss pays LOSS_PCT of that. Every win is
// also a Reputation star.
export const LADDER = {
  rec: 90,
  growth: 0.04,
  softCap: 1290,
  lateGrowth: 0.01,
  reward: 60,
  rewardPow: 3,
  // early races ask for up to `lift` more PR than the curve, fading out over `liftFade` races,
  // so the starter cars are matched and an upgrade is what wins the next race (prizes stay on the curve)
  lift: 0.22,
  liftFade: 28,
  // no cooldown for the first `freeRaces`, then `cooldownStart` s, `cooldownStep` s longer each race up to `cooldown`
  cooldown: 60,
  freeRaces: 10,
  cooldownStart: 15,
  cooldownStep: 5,
  // each rival takes over at its `debut` race: every 2–3 races early on, further apart later
  roster: ['rusty', 'dusty', 'mira', 'hank', 'fox', 'sol', 'marina', 'rocco', 'jade', 'reef', 'neon', 'vex', 'duke', 'aria', 'legend'],
  debut: [1, 3, 5, 8, 11, 14, 18, 22, 26, 30, 35, 40, 45, 50, 54],
  endFrom: 58,
  endRivals: ['storm', 'ghost', 'blaze', 'frost', 'crown'],
  // each venue opens at race `from`; from then on the races take turns across the open venues
  envs: [{ id: 'countryside', from: 1 }, { id: 'coastal', from: 7 }, { id: 'city', from: 16 }],
  // a longer race is picked only for a car that reaches 95% of its top speed past this share of it
  distFit: { half: 0.72, mile: 0.55 },
  ratio: {
    rusty: { quarter: 1.239, half: 1.136, mile: 1.065 },
    dusty: { quarter: 1.082, half: 1.055, mile: 1.024 },
    mira: { quarter: 1.076, half: 1.048, mile: 1.031 },
    hank: { quarter: 1.093, half: 1.048, mile: 1.022 },
    fox: { quarter: 1.137, half: 1.087, mile: 1.064 },
    sol: { quarter: 1.117, half: 1.068, mile: 1.064 },
    marina: { quarter: 1.081, half: 1.048, mile: 1.018 },
    rocco: { quarter: 0.996, half: 1, mile: 0.987 },
    jade: { quarter: 1.024, half: 1.002, mile: 1.005 },
    reef: { quarter: 1.003, half: 0.988, mile: 1.003 },
    neon: { quarter: 1.009, half: 0.994, mile: 0.997 },
    vex: { quarter: 1.009, half: 0.998, mile: 0.999 },
    duke: { quarter: 1.034, half: 1.01, mile: 1.008 },
    aria: { quarter: 0.919, half: 0.958, mile: 0.974 },
    legend: { quarter: 0.918, half: 0.96, mile: 0.973 },
    storm: { quarter: 0.917, half: 0.954, mile: 0.973 },
    ghost: { quarter: 0.92, half: 0.954, mile: 0.958 },
    blaze: { quarter: 0.919, half: 0.943, mile: 0.949 },
    frost: { quarter: 0.866, half: 0.959, mile: 1.018 },
    crown: { quarter: 0.922, half: 0.96, mile: 0.971 },
  },
};

export const LOSS_PCT = 0.25;

// ---------------------------------------------------------------- upgrades (GDD §8)

// Every car has its own four parts (`parts` in CARS), picked from this library. Each level adds
// PART_STEP × `fx` to the stats it names: `launch`, `accel`, `topSpeed` (+7.5% per level at fx 1),
// `shift` (wider shift zones, quicker shifts), `grip` (less grip lost off a slow launch), `nitro` (stronger
// nitro bursts). Levels 1–PART_LEVELS; level n costs upgradeBase × `cost` × PART_GROWTH^(n-1).
// Each car's four parts together add about +30% PR at full tune.
export const PARTS = {
  engine: { name: 'Engine', icon: 'engine', desc: 'Acceleration in every gear.', fx: { accel: 1 }, cost: 1 },
  bigblock: { name: 'Big-Block V8', icon: 'engine', desc: 'Brutal mid-range acceleration.', fx: { accel: 1.1 }, cost: 1.1 },
  turbo: { name: 'Turbo', icon: 'turbo', desc: 'More top speed.', fx: { topSpeed: 1 }, cost: 1.2, needs: ['engine', 2] },
  supercharger: { name: 'Supercharger', icon: 'turbo', desc: 'Instant boost: acceleration and launch.', fx: { accel: 0.6, launch: 0.5 }, cost: 1.15 },
  tires: { name: 'Tires', icon: 'tire', desc: 'Launch grip: a slow start costs less.', fx: { launch: 1, grip: 1 }, cost: 0.8 },
  slicks: { name: 'Drag Slicks', icon: 'tire', desc: 'Huge launch grip, tames wheelspin.', fx: { launch: 1.2, grip: 1.5 }, cost: 1 },
  awd: { name: 'AWD System', icon: 'awd', desc: 'All four wheels bite at launch.', fx: { launch: 1.2, grip: 1 }, cost: 1 },
  gearbox: { name: 'Gearbox', icon: 'gear', desc: 'Wider shift zones, quicker shifts.', fx: { shift: 1 }, cost: 0.9 },
  seqbox: { name: 'Sequential Box', icon: 'gear', desc: 'Lightning shifts, much wider zones.', fx: { shift: 1.3 }, cost: 1 },
  exhaust: { name: 'Exhaust', icon: 'exhaust', desc: 'Breathes better: acceleration and top speed.', fx: { accel: 0.5, topSpeed: 0.5 }, cost: 1 },
  ecu: { name: 'ECU Tune', icon: 'chip', desc: 'A little more of everything.', fx: { launch: 0.4, accel: 0.4, topSpeed: 0.4 }, cost: 1.1 },
  aero: { name: 'Aero Kit', icon: 'wing', desc: 'Cuts drag for more top speed.', fx: { topSpeed: 1 }, cost: 1 },
  weight: { name: 'Weight Cut', icon: 'feather', desc: 'Lighter: acceleration and launch.', fx: { accel: 0.5, launch: 0.5 }, cost: 0.95 },
  nitrous: { name: 'Nitrous Kit', icon: 'bottle', desc: 'Stronger nitro bursts.', fx: { nitro: 1, accel: 0.2 }, cost: 1 },
  motor: { name: 'Twin Motors', icon: 'bolt', desc: 'Instant torque: acceleration and launch.', fx: { accel: 1, launch: 0.4 }, cost: 1.2 },
  battery: { name: 'Power Cells', icon: 'battery', desc: 'Top speed and stronger nitro.', fx: { topSpeed: 1, nitro: 0.6 }, cost: 1.2 },
  hybrid: { name: 'Hybrid Boost', icon: 'bolt', desc: 'Electric shove: acceleration and nitro.', fx: { accel: 0.5, nitro: 1 }, cost: 1.1 },
};
export const PART_LEVELS = 4;
export const PART_STEP = 0.075;
export const PART_GROWTH = 1.8;
export const PART_COST = 6; // × each car's upgradeBase
export const NITRO_STEP = 0.125; // nitro burst strength per level at fx 1 (+50% at full tune)

// Garage upgrades have no top level: small, frequent steps that get steadily dearer.
// Tap Power: a tap is worth 1 + level (× the star bonus); level n+1 costs cost × (n + 1)^pow,
// so a level stays within a minute or two of income all game and gets bought often.
export const TAP = { cost: 75, pow: 1.8 };
// Pit Crew: unlocking it gives `base` taps/s for free, each level adds `step`; level n+1 costs
// cost × (n + 1)^pow.
export const CREW = { base: 0.5, step: 0.25, cost: 1500, pow: 2 };
export const AUTO_UNLOCK = 2; // the Pit Crew starts once this race is won

export const CRIT = { chance: 0.04, mult: 5 };
export const WRENCH = { every: [60, 120], lasts: 8, mult: 30 };
export const OFFLINE = { rate: 0.5, capS: 2 * 3600 };
export const STAR_BONUS = 0.05; // click value × (1 + 0.05 × stars)

// Star milestones: cash rewards; the last one also gives the "Garage Legend" title.
export const MILESTONES = [
  { stars: 3, cash: 30 },
  { stars: 6, cash: 100 },
  { stars: 10, cash: 400 },
  { stars: 15, cash: 2000 },
  { stars: 20, cash: 5000 },
  { stars: 25, cash: 15000 },
  { stars: 30, cash: 30000 },
  { stars: 40, cash: 100000 },
  { stars: 50, cash: 150000 },
  { stars: 62, cash: 250000, title: 'Garage Legend' },
];

// ---------------------------------------------------------------- achievements

// `track` names a progress value in state.js (PROGRESS); unlocked once it reaches `goal`.
// Rewards are small next to races and cars at the point a player usually earns them, so they
// don't throw off the pacing targets (all early ones together are ~$2.7K).
export const ACHIEVEMENTS = [
  { id: 'first_win', name: 'Off the Line', desc: 'Win your first race', track: 'wins', goal: 1, reward: 25 },
  { id: 'taps', name: 'Busy Hands', desc: 'Tap your car 1,000 times', track: 'clicks', goal: 1000, reward: 100 },
  { id: 'perfect_launch', name: 'Lightning Start', desc: 'Get a perfect launch', track: 'perfectLaunches', goal: 1, reward: 50 },
  { id: 'perfect_10', name: 'Smooth Operator', desc: 'Make 10 perfect shifts', track: 'perfectShifts', goal: 10, reward: 100 },
  { id: 'cars_3', name: 'Collector', desc: 'Own 3 cars', track: 'cars', goal: 3, reward: 200 },
  { id: 'crits', name: 'Lucky Strikes', desc: 'Land 50 critical taps', track: 'crits', goal: 50, reward: 250 },
  { id: 'wrench', name: 'Golden Touch', desc: 'Grab 10 Golden Wrenches', track: 'wrenches', goal: 10, reward: 400 },
  { id: 'chain', name: 'Nitro Combo', desc: 'Chain 3 nitro bursts in one race', track: 'bestChain', goal: 3, reward: 150 },
  { id: 'photo', name: 'Photo Finish', desc: 'Win by less than 0.05 s', track: 'photoFinishes', goal: 1, reward: 300 },
  { id: 'comeback', name: 'Comeback Kid', desc: 'Win after trailing by half a second', track: 'comebacks', goal: 1, reward: 400 },
  { id: 'champ_country', name: 'Country Champ', desc: 'Win race 10', track: 'ladder', goal: 10, reward: 300 },
  { id: 'flawless', name: 'Flawless', desc: 'Win with every shift perfect', track: 'flawlessWins', goal: 1, reward: 300 },
  { id: 'auto_5', name: 'Crew Chief', desc: 'Pit Crew level 10', track: 'automation', goal: 10, reward: 3000 },
  { id: 'perfect_100', name: 'Gearhead', desc: 'Make 100 perfect shifts', track: 'perfectShifts', goal: 100, reward: 3000 },
  { id: 'max_upgrade', name: 'Maxed Out', desc: 'Max out any car part', track: 'maxLevel', goal: PART_LEVELS, reward: 150 },
  { id: 'cars_6', name: 'Showroom', desc: 'Own 6 cars', track: 'cars', goal: 6, reward: 6000 },
  { id: 'champ_coast', name: 'Coast Champ', desc: 'Win race 25', track: 'ladder', goal: 25, reward: 5000 },
  { id: 'millionaire', name: 'Millionaire', desc: 'Earn $1M in total', track: 'earned', goal: 1e6, reward: 50000 },
  { id: 'champ_city', name: 'City Champ', desc: 'Win race 40', track: 'ladder', goal: 40, reward: 50000 },
  { id: 'stars', name: 'Half Century', desc: 'Win race 50', track: 'ladder', goal: 50, reward: 250000 },
  { id: 'cars_10', name: 'Full Garage', desc: 'Own all 10 cars', track: 'cars', goal: 10, reward: 250000 },
  { id: 'legend_5', name: 'Rising Legend', desc: 'Win race 60', track: 'ladder', goal: 60, reward: 100000 },
  { id: 'legend_10', name: 'Living Legend', desc: 'Win race 75', track: 'ladder', goal: 75, reward: 250000 },
  { id: 'legend_20', name: 'Myth', desc: 'Win race 100', track: 'ladder', goal: 100, reward: 1000000 },
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
  earlyBog: { mult: 0.75, time: 1 },
  limiterMult: 0.15,
  launchFade: 2,
  jumpHold: 0.6,
  lateWait: 0.35, // how long a "late" scripted driver sits on the limiter before shifting
  // Rev-range fraction per second while holding before the start (just for show: the launch is
  // scored on how fast the player lets go after green; letting go before green is a jump start).
  revRate: 0.35,
  revFall: 2.2,   // ... and while released
  drag: 1.6, // how sharply acceleration fades near top speed (lower: the car keeps gaining speed for longer)
  lastShiftAt: 0.5, // gearing is set per distance so the last shift lands about this far in
  // Top-gear nitro: a few strong bursts. Charges fill `cover` of the time left to the
  // line, + 1 for a perfect launch, + 1 per 2 perfect shifts (at most `bonusMax` bonus). Each
  // is a burst of `time` s raising top speed and push. Firing the next one in the last
  // `chainWindow` s of a burst chains it (×chainBonus); any earlier wastes it.
  nitro: { cover: 0.5, bonusMax: 2, time: 2.5, speed: 1.075, force: 1.22, chainWindow: 0.4, chainBonus: 1.5 },
  aiForm: 0.04, // spread of a rival's day-to-day acceleration (1 ± this, one standard deviation)
  postFinish: 3,  // race ends this long after the player crosses
};
