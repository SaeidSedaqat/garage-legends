// Car parts (GDD §8): what a car's parts do to its stats and what the next level costs.
// Pure functions of a car definition and its part levels, shared by the game and tools/balance.js.
import { CARS, OPPONENTS, PARTS, PART_LEVELS, PART_STEP, PART_GROWTH, PART_COST, NITRO_STEP, TAP, CREW, LADDER, DIST } from './data.js';
import { pr, topSpeedAt } from './physics.js';

export const partName = (car, id) => car.partNames?.[id] || PARTS[id].name;
export const blankTune = car => Object.fromEntries(car.parts.map(id => [id, 0]));

// physics.js grades `trans` and `tires` 0–10; a fully tuned part at fx 1 reaches 10
const GRADES = 10 / PART_LEVELS;

// Racing stats after the parts, as the sim reads them: `trans` widens the shift zones,
// `tires` softens a slow launch, `nitroPower` strengthens nitro bursts.
export function tuned(car, tune = {}) {
  const gain = { launch: 0, accel: 0, topSpeed: 0 };
  const s = { ...car.stats, trans: 0, tires: 0, nitroPower: 0, quirk: car.launchQuirk };
  for (const id of car.parts) {
    const lvl = tune[id] || 0, fx = PARTS[id].fx;
    for (const k in gain) gain[k] += (fx[k] || 0) * lvl;
    s.trans += GRADES * (fx.shift || 0) * lvl;
    s.tires += GRADES * (fx.grip || 0) * lvl;
    s.nitroPower += NITRO_STEP * (fx.nitro || 0) * lvl;
  }
  for (const k in gain) s[k] = car.stats[k] * (1 + PART_STEP * gain[k]);
  return s;
}

export const roundNice = n => { const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(n)) - 1)); return Math.round(n / p) * p; };

// Price of the next level of a part at level `lvl`, or null once it's maxed.
export const partCost = (car, id, lvl) => (lvl >= PART_LEVELS ? null : roundNice(car.upgradeBase * PART_COST * PARTS[id].cost * Math.pow(PART_GROWTH, lvl)));

// Garage upgrades, which never max out: what a level gives and what the next one costs.
export const tapBase = lvl => 1 + lvl;
export const tapCost = lvl => roundNice(TAP.cost * Math.pow(lvl + 1, TAP.pow));
export const crewRate = lvl => CREW.base + CREW.step * lvl;
export const crewCost = lvl => roundNice(CREW.cost * Math.pow(lvl + 1, CREW.pow));

export function partLock(car, tune, id) {
  const needs = PARTS[id].needs;
  if (!needs || !car.parts.includes(needs[0])) return null;
  return (tune[needs[0]] || 0) >= needs[1] ? null : `Needs ${partName(car, needs[0])} Lv ${needs[1]}`;
}

// ---------------------------------------------------------------- the race ladder

// The distances a car is fit for: the quarter always; a longer race only once the car still gains
// speed for most of it (it reaches 95% of its top speed past `LADDER.distFit` of the way), so a
// slow car is never stuck cruising at top speed for half a mile.
export const fitDistances = spec => Object.keys(DIST).filter(d => !LADDER.distFit[d] || topSpeedAt(spec, DIST[d].m) >= LADDER.distFit[d]);

// Race n of the ladder (1 is the first), shaped like an event: id, venue, distance, rival,
// recommended PR, the rival's PR and the prize for a win. The distance depends on `spec`, the
// player's car as tuned (without one: the rival's model at the recommended PR).
export function ladderEvent(n, spec = null) {
  const L = LADDER, i = n - 1;
  const fast = Math.log(L.softCap / L.rec) / Math.log(1 + L.growth); // races until the soft cap
  const top = i > fast;
  const curve = Math.round(top ? L.softCap * Math.pow(1 + L.lateGrowth, i - fast) : L.rec * Math.pow(1 + L.growth, i));
  // the first race is the lesson and stays easy; the lift starts at race 2
  const rec = n < 2 ? curve : Math.round(curve * (1 + L.lift * Math.max(0, 1 - (n - 2) / L.liftFade)));
  const opp = n >= L.endFrom ? L.endRivals[i % L.endRivals.length] : L.roster[L.debut.findLastIndex(d => d <= n)];
  // the first races are quarter miles; then the races take turns across what the car is fit for
  const fits = n <= 3 ? ['quarter'] : fitDistances(spec || atPR(CARS.find(c => c.id === OPPONENTS[opp].carId), rec));
  const dist = fits[n % fits.length];
  // a new venue hosts its first race, then the open venues take turns
  const open = L.envs.filter(v => v.from <= n);
  const env = open[open.length - 1 - ((n - open.at(-1).from) % open.length)].id;
  return {
    id: `race_${n}`, n, name: `Race ${n}`, env, dist, opp, rec,
    oppPR: Math.round(rec * L.ratio[opp][dist]), win: roundNice(L.reward * Math.pow(curve / L.rec, L.rewardPow)),
  };
}

// Seconds RACE cools down after race n: none for the first races, then growing to LADDER.cooldown.
export const cooldownAfter = n => (n <= LADDER.freeRaces ? 0
  : Math.min(LADDER.cooldown, LADDER.cooldownStart + LADDER.cooldownStep * (n - LADDER.freeRaces - 1)));

// A car's stock stats scaled to `target` PR.
function atPR(car, target) {
  const k = target / pr(car.stats);
  return { ...car.stats, launch: car.stats.launch * k, accel: car.stats.accel * k, topSpeed: car.stats.topSpeed * k, quirk: car.launchQuirk };
}
