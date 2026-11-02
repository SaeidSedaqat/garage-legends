// Player progress, economy rules and saving (GDD §8, §9, §13).
import {
  CARS, OPPONENTS, PARTS, PART_LEVELS, CREW, LADDER,
  AUTO_UNLOCK, CRIT, OFFLINE, STAR_BONUS, MILESTONES, LOSS_PCT, ACHIEVEMENTS,
} from './data.js';
import { pr } from './physics.js';
import { blankTune, cooldownAfter, crewCost, crewRate, ladderEvent, partCost, partLock, tapBase, tapCost, tuned } from './tuning.js';
import { bus } from './events.js';

const KEY = 'garageLegends.save.v2';
const PROTOTYPE_KEY = 'garageLegends.save.v1';
const CLICKS_PER_SECOND_CAP = 15;

const level = (n, max) => Math.min(max, Math.max(0, Math.floor(+n || 0)));

export const carDef = id => CARS.find(c => c.id === id);
const RACE_ID = /^race_(\d+)$/;
export const eventDef = id => (RACE_ID.test(id) ? ladderEvent(+id.match(RACE_ID)[1]) : undefined);

const prefersReducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function fresh() {
  return {
    v: 5, cash: 0, car: 'kaze', owned: ['kaze'], tune: { kaze: blankTune(carDef('kaze')) },
    // the ladder: the next race, the best race won, and when RACE is ready again (ms)
    clickPower: 0, automation: 0, race: { n: 1, best: 0, readyAt: 0 }, milestones: [], tutorial: {}, achievements: {},
    stats: {
      clicks: 0, races: 0, wins: 0, perfectShifts: 0, fromClicks: 0, fromRaces: 0, fromAuto: 0,
      crits: 0, wrenches: 0, perfectLaunches: 0, bestChain: 0, photoFinishes: 0, comebacks: 0, flawlessWins: 0,
    },
    muted: false, musicOff: false, units: 'kmh', unitsChosen: false, reducedMotion: prefersReducedMotion(), lastActive: Date.now(),
  };
}

// The first prototype's save. Its economy was far more generous, so cars and their tuning are
// kept but cash is capped and the garage levels are scaled down to the new tables.
const PROTOTYPE_CASH_CAP = 2000;
function migratePrototype(old) {
  const s = fresh();
  s.cash = Math.min(PROTOTYPE_CASH_CAP, Math.max(0, Math.floor(old.money || 0)));
  for (const id of old.owned || []) {
    if (!carDef(id)) continue;
    if (!s.owned.includes(id)) s.owned.push(id);
    const t = old.tune?.[id] || {};
    s.tune[id] = { engine: t.engine, tires: t.tires, trans: t.gearbox };
  }
  if (s.owned.includes(old.car)) s.car = old.car;
  s.v = 2; // old part levels: converted in validate()
  s.clickPower = Math.min(3, Math.floor((old.click || 0) / 4));
  s.automation = 0;
  const map = { quarter: 'country_1', half: 'country_2', mile: 'country_3' };
  s.events = {};
  for (const [k, id] of Object.entries(map)) if (old.races?.[k]?.won) s.events[id] = { won: true };
  s.muted = !!old.muted;
  return s;
}

// Saves before v3 had the same four upgrades on every car (engine/turbo/tires/trans, levels
// 0–10) and 10-level garage upgrades. Each of a car's own parts takes over the old upgrade
// closest to what it does, at the same share of the new level range (rounded up).
function migrateParts(s) {
  const scale = (n, max) => Math.ceil((level(n, 10) * max) / 10);
  const oldKey = fx => (fx.shift ? 'trans' : (fx.launch || 0) > (fx.accel || 0) ? 'tires' : (fx.topSpeed || 0) > (fx.accel || 0) ? 'turbo' : 'engine');
  for (const id of Object.keys(s.tune || {})) {
    if (!carDef(id)) continue;
    const old = s.tune[id] || {};
    s.tune[id] = Object.fromEntries(carDef(id).parts.map(p => [p, scale(old[oldKey(PARTS[p].fx)], PART_LEVELS)]));
  }
  s.clickPower = scale(s.clickPower, 5);
  s.automation = scale(s.automation, 5);
}

// v3 saves had 5-level garage upgrades. Tap Power keeps the same cash per tap; Pit Crew keeps
// about the same taps per second.
function migrateGarage(s) {
  const tap = [1, 3, 8, 20, 50, 110], crew = [0, 0.5, 1.2, 2.2, 3.5, 5];
  s.clickPower = tap[level(s.clickPower, 5)] - 1;
  s.automation = Math.max(0, Math.round((crew[level(s.automation, 5)] - CREW.base) / CREW.step));
}

// v4 saves had 17 named events in three venues and the Legend Series. The player starts the
// ladder just above the hardest race they had won, by recommended PR.
const OLD_REC = {
  country_1: 90, country_2: 120, country_3: 150, country_4: 190, country_4b: 200, country_5: 230,
  coast_1: 280, coast_2: 330, coast_2b: 365, coast_3: 400, coast_4: 470, coast_5: 540,
  city_1: 600, city_2: 680, city_3: 760, city_4: 860, city_5: 960,
};
function migrateLadder(s) {
  const won = Object.entries(s.events || {}).filter(([id, e]) => e?.won && OLD_REC[id]).map(([id]) => OLD_REC[id]);
  const legend = Math.floor(+s.legend?.best || 0);
  if (legend > 0) won.push(1000 * Math.pow(1.035, legend - 1));
  const top = Math.max(0, ...won);
  let best = 0;
  while (top && ladderEvent(best + 1).rec <= top * 1.001) best++;
  s.race = { n: best + 1, best, readyAt: 0 };
  // milestones the new star count has passed are taken as claimed, not paid out in one go
  s.milestones = MILESTONES.filter(m => m.stars <= best).map(m => m.stars);
  delete s.events;
  delete s.legend;
}

// Fills missing fields, clamps numbers and drops unknown ids, so a damaged save can't crash the game.
function validate(raw) {
  const s = { ...fresh(), ...raw };
  s.cash = Math.max(0, Math.floor(+s.cash || 0));
  s.owned = ['kaze', ...(s.owned || []).filter(id => id !== 'kaze' && carDef(id))];
  if (!(s.v >= 3)) migrateParts(s);
  if (!(s.v >= 4)) migrateGarage(s);
  if (!(s.v >= 5)) migrateLadder(s);
  s.v = 5;
  const tune = {};
  for (const id of s.owned) tune[id] = Object.fromEntries(carDef(id).parts.map(k => [k, level(s.tune?.[id]?.[k], PART_LEVELS)]));
  s.tune = tune;
  if (!s.owned.includes(s.car)) s.car = 'kaze';
  s.clickPower = level(s.clickPower, 10000);
  s.automation = level(s.automation, 10000);
  const n = Math.max(1, Math.floor(+s.race?.n || 1));
  s.race = { n, best: Math.min(n - 1, Math.max(0, Math.floor(+s.race?.best || 0))), readyAt: Math.min(+s.race?.readyAt || 0, Date.now() + LADDER.cooldown * 1000) };
  s.stats = { ...fresh().stats, ...s.stats };
  s.achievements = Object.fromEntries(Object.entries(s.achievements || {}).filter(([id]) => ACHIEVEMENTS.some(a => a.id === id)));
  s.milestones = (s.milestones || []).filter(n => MILESTONES.some(m => m.stars === n));
  // KM/H is the default; MPH only if the player picked it in Settings
  s.unitsChosen = !!s.unitsChosen;
  s.units = s.unitsChosen && s.units === 'mph' ? 'mph' : 'kmh';
  s.reducedMotion = !!s.reducedMotion;
  s.musicOff = !!s.musicOff;
  // players who already raced or tuned (including migrated saves) skip the first-session guide
  s.tutorial = { ...s.tutorial };
  if (s.race.best > 0 || s.stats.races > 0) s.tutorial = { upgraded: true, raced: true, done: true };
  return s;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return validate(JSON.parse(raw));
    const old = localStorage.getItem(PROTOTYPE_KEY);
    if (old) return validate(migratePrototype(JSON.parse(old)));
  } catch { /* storage unavailable or corrupt: start fresh */ }
  return fresh();
}

export const state = load();

let saveTimer = 0;
let wiped = false;
export function save() {
  clearTimeout(saveTimer);
  if (wiped) return;
  state.lastActive = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* keep playing in memory */ }
}
// Purchases and results save at once; click income saves 2 s after the last change.
export function changed(what, now = what !== 'money') {
  if (what !== 'money') checkAchievements();
  bus.emit('change', what);
  if (now) save();
  else { clearTimeout(saveTimer); saveTimer = setTimeout(save, 2000); }
}
setInterval(save, 15000);

// Settings → Reset progress. Nothing may save after this, or the page-hide save would undo it.
export function resetSave() {
  wiped = true;
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(PROTOTYPE_KEY);
  } catch { /* nothing stored */ }
  location.reload();
}
window.addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

// ---------------------------------------------------------------- cars and upgrades

// A car's racing stats after its parts, as the sim reads them.
export const tunedSpec = (id = state.car) => tuned(carDef(id), state.tune[id]);
export const carPR = id => pr(tunedSpec(id));
export const stockPR = id => pr(carDef(id).stats);

// Stats with one more level of a part, for the "PR 224 → 231" preview.
export function previewSpec(part, id = state.car) {
  return tuned(carDef(id), { ...state.tune[id], [part]: state.tune[id][part] + 1 });
}

export const upgradeLevel = (part, id = state.car) => state.tune[id][part];
export const upgradeCost = (part, id = state.car) => partCost(carDef(id), part, upgradeLevel(part, id));
export const upgradeLock = (part, id = state.car) => partLock(carDef(id), state.tune[id], part);

function spend(n) {
  if (state.cash < n) return false;
  state.cash -= n;
  return true;
}

export function buyUpgrade(part) {
  if (!(part in state.tune[state.car])) return false;
  const cost = upgradeCost(part);
  if (cost == null || upgradeLock(part) || !spend(cost)) return false;
  state.tune[state.car][part]++;
  state.tutorial.upgraded = true;
  changed('upgrade');
  return true;
}

export const carLock = id => (carDef(id).requires > state.race.best ? `Win race ${carDef(id).requires}` : null);

export function buyCar(id) {
  const c = carDef(id);
  if (state.owned.includes(id) || carLock(id) || !spend(c.price)) return false;
  state.owned.push(id);
  state.tune[id] = blankTune(c);
  state.car = id;
  changed('car');
  return true;
}

export function selectCar(id) {
  if (!state.owned.includes(id) || state.car === id) return;
  state.car = id;
  changed('car');
}

// ---------------------------------------------------------------- garage upgrades and income

// every race won on the ladder is a Reputation star
export const totalStars = () => state.race.best;
export const clickValue = () => Math.max(1, Math.round(tapBase(state.clickPower) * (1 + STAR_BONUS * totalStars())));
// the Pit Crew starts tapping as soon as it's unlocked
export const crewTaps = () => (autoUnlocked() ? crewRate(state.automation) : 0);
export const autoRate = () => crewTaps() * clickValue();
export const autoUnlocked = () => state.race.best >= AUTO_UNLOCK;

export const garageCost = kind => (kind === 'click' ? tapCost(state.clickPower) : crewCost(state.automation));
export function buyGarage(kind) {
  const cost = garageCost(kind);
  if (cost == null || (kind === 'auto' && !autoUnlocked()) || !spend(cost)) return false;
  if (kind === 'click') state.clickPower++; else state.automation++;
  changed('upgrade');
  return true;
}

export function earn(n, source) {
  if (n <= 0) return;
  state.cash += n;
  if (source) state.stats[source] += n;
  changed('money', false);
}

// One tap on the car. Taps beyond the per-second cap earn nothing, which ignores auto-clickers.
let tapWindow = [];
export function tap() {
  const now = performance.now();
  tapWindow = tapWindow.filter(t => now - t < 1000);
  if (tapWindow.length >= CLICKS_PER_SECOND_CAP) return null;
  tapWindow.push(now);
  const crit = Math.random() < CRIT.chance;
  const value = clickValue() * (crit ? CRIT.mult : 1);
  state.stats.clicks++;
  if (crit) state.stats.crits++;
  earn(value, 'fromClicks');
  // tap counters only cross achievement goals now and then, so check sparingly
  if ((crit || state.stats.clicks % 25 === 0) && checkAchievements().length) save();
  return { value, crit };
}

export function grabWrench(value) {
  state.stats.wrenches++;
  earn(value, 'fromClicks');
  changed('wrench');
}

// ---------------------------------------------------------------- achievements

const PROGRESS = {
  cars: () => state.owned.length,
  automation: () => state.automation,
  maxLevel: () => Math.max(0, ...Object.values(state.tune).flatMap(t => Object.values(t))),
  earned: () => state.stats.fromClicks + state.stats.fromRaces + state.stats.fromAuto,
  ladder: () => state.race.best,
};
export const achievementProgress = a => Math.min(a.goal, PROGRESS[a.track] ? PROGRESS[a.track]() : state.stats[a.track] || 0);

// Unlocks every achievement whose goal is reached and pays its reward. Callers save.
export function checkAchievements() {
  const fresh = ACHIEVEMENTS.filter(a => !state.achievements[a.id] && achievementProgress(a) >= a.goal);
  for (const a of fresh) {
    state.achievements[a.id] = Date.now();
    state.cash += a.reward;
  }
  if (fresh.length) bus.emit('achievement', fresh);
  return fresh;
}

export function collectOffline() {
  const secs = (Date.now() - state.lastActive) / 1000;
  if (!(secs > 0) || secs > 30 * 86400) return 0;
  const amount = Math.floor(Math.min(secs, OFFLINE.capS) * autoRate() * OFFLINE.rate);
  earn(amount, 'fromAuto');
  return amount;
}

setInterval(() => earn(autoRate() / 4, 'fromAuto'), 250);

// ---------------------------------------------------------------- the race ladder

export const nextRace = () => ladderEvent(state.race.n);

// Seconds until RACE is ready again (0 when it is).
export const raceCooldown = () => Math.max(0, (state.race.readyAt - Date.now()) / 1000);
export function skipCooldown() {
  state.race.readyAt = 0;
  changed('race');
}

// The opponent's car scaled to the opponent's PR (GDD §6.6).
export function opponentSpec(e) {
  const o = OPPONENTS[e.opp], c = carDef(o.carId), target = e.oppPR ?? o.pr, k = target / pr(c.stats);
  return { ...c.stats, launch: c.stats.launch * k, accel: c.stats.accel * k, topSpeed: c.stats.topSpeed * k, quirk: c.launchQuirk, name: o.name, pr: target };
}

function payout(lines, won, perfects) {
  const total = lines.reduce((n, [, v]) => n + v, 0);
  state.cash += total;
  state.stats.fromRaces += total;
  state.stats.races++;
  if (won) state.stats.wins++;
  state.stats.perfectShifts += perfects;
  return total;
}

// A rewarded ad on the result screen pays the race's prize again.
export function bonusPayout(n) {
  earn(n, 'fromRaces');
  changed('race');
}

// Race feats for achievements: perfect launch, the longest nitro chain, and (for wins) an
// all-perfect run, a comeback from half a second down, or a winning margin under 0.05 s.
function recordFeats(won, f) {
  const s = state.stats;
  s.perfectLaunches += f.perfectLaunch ? 1 : 0;
  s.bestChain = Math.max(s.bestChain, f.chain);
  if (!won) return;
  s.flawlessWins += f.flawless ? 1 : 0;
  s.comebacks += f.behind >= 0.5 ? 1 : 0;
  s.photoFinishes += f.margin < 0.05 ? 1 : 0;
}

// Applies a finished race and returns what it paid (GDD §9.4). A win moves the ladder up a rung
// and is a Reputation star; either way RACE cools down (after the first few races).
export function recordRace(e, won, time, perfects, feats) {
  if (feats) recordFeats(won, feats);
  const starsBefore = totalStars();
  if (won && e.n >= state.race.n) {
    state.race.n = e.n + 1;
    state.race.best = Math.max(state.race.best, e.n);
  }
  const lines = [[won ? 'Win' : 'Finish', won ? e.win : Math.round(e.win * LOSS_PCT)]];
  const milestones = [];
  for (const m of MILESTONES) {
    if (m.stars > starsBefore && m.stars <= totalStars() && !state.milestones.includes(m.stars)) {
      state.milestones.push(m.stars);
      milestones.push(m);
      if (m.cash) lines.push([`${m.stars}★ milestone`, m.cash]);
    }
  }
  state.race.readyAt = Date.now() + cooldownAfter(e.n) * 1000;
  const total = payout(lines, won, perfects);
  changed('race');
  return { lines, total, newStars: totalStars() - starsBefore, milestones };
}
