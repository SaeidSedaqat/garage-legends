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
    price: 0, stats: { launch: 12, accel: 12, topSpeed: 10, shiftWindow: 0.75, gears: 4 }, upgradeBase: 15, redlineRpm: 6800,
    art: 'kaze',
    parts: ['engine', 'tires', 'exhaust', 'gearbox'],
  },
  {
    id: 'ronin', tier: 2, name: 'Ronin Compact', tagline: 'A classic with real character.', niche: 'Very easy to drive',
    price: 500, stats: { launch: 15, accel: 16, topSpeed: 14, shiftWindow: 0.8, gears: 4 }, upgradeBase: 24, redlineRpm: 8200,
    art: 'ronin',
    parts: ['engine', 'tires', 'ecu', 'gearbox'],
  },
  {
    id: 'hikari', tier: 3, name: 'Hikari Coupe', tagline: 'Balance, style and control.', niche: 'Balanced tuner',
    price: 2500, stats: { launch: 19, accel: 23, topSpeed: 24, shiftWindow: 0.72, gears: 5 }, upgradeBase: 90, redlineRpm: 7500,
    art: 'hikari',
    parts: ['engine', 'turbo', 'tires', 'gearbox'],
  },
  {
    id: 'bulldog', tier: 4, name: "Bulldog '70", tagline: 'Raw power and timeless appeal.', niche: 'Huge mid-range punch, wheelspin-prone launch',
    price: 8000, stats: { launch: 24, accel: 32, topSpeed: 30, shiftWindow: 0.62, gears: 4 }, upgradeBase: 200, redlineRpm: 6200,
    launchQuirk: 'wheelspin', art: 'ronin', tint: [28, 1.15, 1.05],
    parts: ['bigblock', 'supercharger', 'slicks', 'gearbox'],
  },
  {
    id: 'kodiak', tier: 5, name: 'Kodiak Rally', tagline: 'Built for grip, not just straight lines.', niche: 'Best launch for its tier, rules the quarter mile',
    price: 18000, stats: { launch: 44, accel: 38, topSpeed: 34, shiftWindow: 0.78, gears: 5 }, upgradeBase: 400, redlineRpm: 7800,
    art: 'kaze', tint: [12, 1.5, 0.72],
    parts: ['engine', 'turbo', 'awd', 'gearbox'],
  },
  {
    id: 'valken', tier: 6, name: 'Valken GT', tagline: 'Power, precision, all around.', niche: 'All-rounder, strong at the half mile',
    price: 40000, stats: { launch: 48, accel: 52, topSpeed: 56, shiftWindow: 0.75, gears: 6 }, upgradeBase: 1000, redlineRpm: 7600,
    art: 'hikari', tint: [0, 0.12, 1.2],
    parts: ['engine', 'aero', 'tires', 'nitrous'],
  },
  {
    id: 'sora', tier: 7, name: 'Sora Roadster', tagline: 'Lightweight fun, maximum feel.', niche: 'Widest shift window, the easiest perfect runs',
    price: 120000, stats: { launch: 62, accel: 64, topSpeed: 54, shiftWindow: 0.88, gears: 6 }, upgradeBase: 3000, redlineRpm: 8000,
    art: 'ronin', tint: [48, 1.2, 1.15],
    parts: ['engine', 'weight', 'tires', 'gearbox'],
  },
  {
    id: 'furia', tier: 8, name: 'Furia V10', tagline: "Speed isn't a dream anymore.", niche: 'Top-speed monster, demanding shifts',
    price: 220000, stats: { launch: 70, accel: 76, topSpeed: 80, shiftWindow: 0.68, gears: 7 }, upgradeBase: 7500, redlineRpm: 8500,
    art: 'hikari', tint: [-85, 1.5, 1.2],
    parts: ['engine', 'aero', 'slicks', 'seqbox'], partNames: { engine: 'V10 Tune' },
  },
  {
    id: 'volta', tier: 9, name: 'Volta X', tagline: "The edge of what's possible.", niche: 'Mile specialist',
    price: 1000000, stats: { launch: 86, accel: 90, topSpeed: 94, shiftWindow: 0.7, gears: 7 }, upgradeBase: 11500, redlineRpm: 9000,
    art: 'hikari', tint: [0, 0.08, 1.55],
    parts: ['motor', 'battery', 'tires', 'gearbox'], partNames: { gearbox: 'Drive Unit' },
  },
  {
    id: 'apex', tier: 10, name: 'Apex Zero', tagline: 'A machine for the few.', niche: 'The ultimate',
    price: 2500000, requires: 'city_5', stats: { launch: 96, accel: 100, topSpeed: 100, shiftWindow: 0.76, gears: 7 }, upgradeBase: 25000, redlineRpm: 9500,
    art: 'hikari', tint: [0, 0.3, 0.42],
    parts: ['engine', 'hybrid', 'aero', 'seqbox'],
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
  dusty: { name: 'Dusty Dan', carId: 'kaze', pr: 110, ai: STEADY, art: 'dusty' },
  mira: { name: 'Mira', carId: 'ronin', pr: 137, ai: STEADY, art: 'ronin', tint: [200, 1.1, 1.05] },
  hank: { name: 'Hank', carId: 'ronin', pr: 181, ai: STEADY, art: 'ronin', tint: [120, 0.9, 0.9] },
  fox: { name: 'Silver Fox', carId: 'hikari', pr: 219, ai: STEADY, art: 'fox' },
  sol: { name: 'Sol', carId: 'hikari', pr: 262, ai: STEADY, art: 'hikari', tint: [-150, 1.3, 1.15] },
  marina: { name: 'Marina', carId: 'bulldog', pr: 319, ai: STEADY, art: 'ronin', tint: [-60, 1.1, 0.9] },
  rocco: { name: 'Rocco', carId: 'bulldog', pr: 371, ai: SHARP, art: 'rusty', tint: [180, 0.6, 0.9] },
  jade: { name: 'Jade', carId: 'kodiak', pr: 447, ai: SHARP, art: 'dusty', tint: [100, 1.2, 0.9] },
  reef: { name: 'Captain Reef', carId: 'valken', pr: 512, ai: SHARP, art: 'fox', tint: [0, 0.2, 1.25] },
  neon: { name: 'Neon', carId: 'valken', pr: 549, ai: SHARP, art: 'hikari', tint: [130, 1.6, 1.1] },
  vex: { name: 'Vex', carId: 'sora', pr: 622, ai: { ...SHARP, launch: 1 }, art: 'ronin', tint: [-100, 1.3, 0.75] },
  duke: { name: 'Duke', carId: 'furia', pr: 718, ai: SHARP, art: 'hikari', tint: [-170, 1.2, 0.85] },
  aria: { name: 'Aria', carId: 'furia', pr: 788, ai: ACE, art: 'fox', tint: [-60, 1.2, 1.1] },
  legend: { name: 'The Legend', carId: 'volta', pr: 881, ai: ACE, art: 'hikari', tint: [15, 1.3, 1.25] },
  // Legend Series rivals: their PR is set per round (see LEGEND below)
  storm: { name: 'Storm', carId: 'apex', pr: 1000, ai: ACE, art: 'hikari', tint: [0, 1.3, 0.75] },
  ghost: { name: 'Ghost', carId: 'volta', pr: 1000, ai: ACE, art: 'fox', tint: [0, 0.05, 1.35] },
  blaze: { name: 'Blaze', carId: 'furia', pr: 1000, ai: ACE, art: 'ronin', tint: [0, 1.3, 0.95] },
  frost: { name: 'Frost', carId: 'sora', pr: 1000, ai: ACE, art: 'kaze', tint: [-25, 0.6, 1.3] },
  crown: { name: 'The Crown', carId: 'apex', pr: 1000, ai: ACE, art: 'ronin', tint: [40, 1.1, 1.2] },
};

// Rewards: `win` when winning (a finish without winning pays LOSS_PCT of it), `first` once on
// the first win, `champion` once on a venue's last event. Tuned with the pacing bot in
// tools/balance.js against the GDD §9.5 targets (2 taps/s, buying each car the goal chip
// suggests): rewards are 40% (Countryside), 60% (Coastal) and 37.5% (City) of the GDD table,
// and some car prices and Click Power costs moved too (see README).
export const EVENTS = [
  { id: 'country_1', env: 'countryside', name: 'First Run', dist: 'quarter', opp: 'rusty', rec: 90, win: 32, first: 48 },
  { id: 'country_2', env: 'countryside', name: 'Local Rival', dist: 'quarter', opp: 'dusty', rec: 120, win: 56, first: 80 },
  { id: 'country_3', env: 'countryside', name: 'Weekend Challenge', dist: 'quarter', opp: 'mira', rec: 150, win: 96, first: 144 },
  { id: 'country_4', env: 'countryside', name: 'Long Straight', dist: 'half', opp: 'hank', rec: 190, win: 160, first: 240 },
  { id: 'country_5', env: 'countryside', name: 'Countryside Champion', dist: 'half', opp: 'fox', rec: 230, win: 280, first: 480, champion: 2000 },
  { id: 'coast_1', env: 'coastal', name: 'Coastal Debut', dist: 'quarter', opp: 'sol', rec: 280, win: 360, first: 600 },
  { id: 'coast_2', env: 'coastal', name: 'Seaside Rival', dist: 'half', opp: 'marina', rec: 330, win: 600, first: 960 },
  { id: 'coast_3', env: 'coastal', name: 'Cliffside Challenge', dist: 'half', opp: 'rocco', rec: 400, win: 1020, first: 1500 },
  { id: 'coast_4', env: 'coastal', name: 'Sunset Sprint', dist: 'mile', opp: 'jade', rec: 470, win: 1680, first: 2700 },
  { id: 'coast_5', env: 'coastal', name: 'Coastal Champion', dist: 'mile', opp: 'reef', rec: 540, win: 2700, first: 4800, champion: 25000 },
  { id: 'city_1', env: 'city', name: 'Night Qualifier', dist: 'half', opp: 'neon', rec: 600, win: 2850, first: 4500 },
  { id: 'city_2', env: 'city', name: 'City Rival', dist: 'half', opp: 'vex', rec: 680, win: 4500, first: 7500 },
  { id: 'city_3', env: 'city', name: 'Midnight Challenge', dist: 'mile', opp: 'duke', rec: 760, win: 7500, first: 13200 },
  { id: 'city_4', env: 'city', name: 'Grand Prix Drag', dist: 'mile', opp: 'aria', rec: 860, win: 13200, first: 22500 },
  { id: 'city_5', env: 'city', name: 'City Champion', dist: 'mile', opp: 'legend', rec: 960, win: 22500, first: 37500, champion: 187500 },
];

export const LOSS_PCT = 0.25;

// Star medal times in seconds (silver, gold), generated by the balance check.
export const MEDALS = {
  country_1: [13.75, 13.14], country_2: [13.2, 12.54], country_3: [12.68, 11.97], country_4: [19.18, 18.37], country_5: [18.22, 17.18],
  coast_1: [11.15, 10.16], coast_2: [16.21, 15.24], coast_3: [15.21, 14.2], coast_4: [25.7, 24.08], coast_5: [23.19, 21.4],
  city_1: [13.52, 12.19], city_2: [13.11, 11.83], city_3: [20.08, 18.22], city_4: [18.92, 17.07], city_5: [18, 16.18],
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
  win: 30000,
  winGrowth: 0.15,
  rivals: ['storm', 'ghost', 'blaze', 'frost', 'crown'],
  dists: ['quarter', 'half', 'mile'],
  envs: ['city', 'coastal', 'countryside'],
  ratio: {
    storm: { quarter: 0.754, half: 0.852, mile: 0.919 },
    ghost: { quarter: 0.75, half: 0.851, mile: 0.904 },
    blaze: { quarter: 0.749, half: 0.84, mile: 0.894 },
    frost: { quarter: 0.709, half: 0.861, mile: 0.969 },
    crown: { quarter: 0.752, half: 0.857, mile: 0.918 },
  },
};

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
export const PART_COST = 4; // × each car's upgradeBase
export const NITRO_STEP = 0.125; // nitro burst strength per level at fx 1 (+50% at full tune)

// Garage upgrades: few, big steps. Index = level.
export const GARAGE_LEVELS = 5;
export const CLICK_BASE = [1, 3, 8, 20, 50, 110];
export const CLICK_COST = [null, 200, 1200, 9000, 45000, 200000];
export const AUTO_CPS = [0, 0.5, 1.2, 2.2, 3.5, 5];
export const AUTO_COST = [null, 1500, 12000, 70000, 300000, 1200000];
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
  { id: 'champ_country', name: 'Country Champ', desc: 'Win Countryside Champion', track: 'country_5', goal: 1, reward: 300 },
  { id: 'flawless', name: 'Flawless', desc: 'Win with every shift perfect', track: 'flawlessWins', goal: 1, reward: 300 },
  { id: 'auto_5', name: 'Crew Chief', desc: 'Max out Garage Automation', track: 'automation', goal: 5, reward: 3000 },
  { id: 'perfect_100', name: 'Gearhead', desc: 'Make 100 perfect shifts', track: 'perfectShifts', goal: 100, reward: 3000 },
  { id: 'max_upgrade', name: 'Maxed Out', desc: 'Max out any car part', track: 'maxLevel', goal: PART_LEVELS, reward: 150 },
  { id: 'cars_6', name: 'Showroom', desc: 'Own 6 cars', track: 'cars', goal: 6, reward: 6000 },
  { id: 'champ_coast', name: 'Coast Champ', desc: 'Win Coastal Champion', track: 'coast_5', goal: 1, reward: 5000 },
  { id: 'millionaire', name: 'Millionaire', desc: 'Earn $1M in total', track: 'earned', goal: 1e6, reward: 50000 },
  { id: 'champ_city', name: 'City Champ', desc: 'Win City Champion', track: 'city_5', goal: 1, reward: 50000 },
  { id: 'stars', name: 'Perfectionist', desc: 'Earn all 45 stars', track: 'stars', goal: 45, reward: 250000 },
  { id: 'cars_10', name: 'Full Garage', desc: 'Own all 10 cars', track: 'cars', goal: 10, reward: 250000 },
  { id: 'legend_5', name: 'Rising Legend', desc: 'Clear Legend round 5', track: 'legend', goal: 5, reward: 100000 },
  { id: 'legend_10', name: 'Living Legend', desc: 'Clear Legend round 10', track: 'legend', goal: 10, reward: 250000 },
  { id: 'legend_20', name: 'Myth', desc: 'Clear Legend round 20', track: 'legend', goal: 20, reward: 1000000 },
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
  lastShiftAt: 0.5, // gearing is set per distance so the last shift lands about this far in
  // Top-gear nitro, the rhythm part of the race: charges fill `cover` of the time left to the
  // line, + 1 for a perfect launch, + 1 per 2 perfect shifts (at most `bonusMax` bonus). Each
  // is a burst of `time` s raising top speed and push. Firing the next one in the last
  // `chainWindow` s of a burst chains it (×chainBonus); any earlier wastes it.
  nitro: { cover: 0.75, bonusMax: 3, time: 1.5, speed: 1.05, force: 1.15, chainWindow: 0.35, chainBonus: 1.6 },
  aiForm: 0.04, // spread of a rival's day-to-day acceleration (1 ± this, one standard deviation)
  postFinish: 3,  // race ends this long after the player crosses
};
