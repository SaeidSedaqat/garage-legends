// Car parts (GDD §8): what a car's parts do to its stats and what the next level costs.
// Pure functions of a car definition and its part levels, shared by the game and tools/balance.js.
import { PARTS, PART_LEVELS, PART_STEP, PART_GROWTH, PART_COST, NITRO_STEP } from './data.js';

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

export function partLock(car, tune, id) {
  const needs = PARTS[id].needs;
  if (!needs || !car.parts.includes(needs[0])) return null;
  return (tune[needs[0]] || 0) >= needs[1] ? null : `Needs ${partName(car, needs[0])} Lv ${needs[1]}`;
}
