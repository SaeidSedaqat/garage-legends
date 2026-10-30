// Player progress, economy rules and saving (GDD §8, §9, §13).
import {
  CARS, EVENTS, ENVS, OPPONENTS, PARTS, PART_LEVELS, GARAGE_LEVELS, CLICK_BASE, CLICK_COST, AUTO_CPS,
  AUTO_COST, AUTO_UNLOCK, CRIT, OFFLINE, STAR_BONUS, MILESTONES, MEDALS, LOSS_PCT, LEGEND, ACHIEVEMENTS,
} from './data.js';
import { pr } from './physics.js';
import { blankTune, partCost, partLock, tuned } from './tuning.js';
import { bus } from './events.js';

const KEY = 'garageLegends.save.v2';
const PROTOTYPE_KEY = 'garageLegends.save.v1';
const CLICKS_PER_SECOND_CAP = 15;

const level = (n, max) => Math.min(max, Math.max(0, Math.floor(+n || 0)));

export const carDef = id => CARS.find(c => c.id === id);
const LEGEND_ID = /^legend_(\d+)$/;
export const eventDef = id => EVENTS.find(e => e.id === id) || (LEGEND_ID.test(id) ? legendEvent(+id.match(LEGEND_ID)[1]) : undefined);

const prefersReducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function fresh() {
  return {
    v: 3, cash: 0, car: 'kaze', owned: ['kaze'], tune: { kaze: blankTune(carDef('kaze')) },
    clickPower: 0, automation: 0, events: {}, milestones: [], tutorial: {}, legend: { round: 1, best: 0 }, achievements: {},
    stats: {
      clicks: 0, races: 0, wins: 0, perfectShifts: 0, fromClicks: 0, fromRaces: 0, fromAuto: 0,
      crits: 0, wrenches: 0, perfectLaunches: 0, bestChain: 0, photoFinishes: 0, comebacks: 0, flawlessWins: 0,
    },
    muted: false, units: 'kmh', unitsChosen: false, reducedMotion: prefersReducedMotion(), lastActive: Date.now(),
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
  for (const [k, id] of Object.entries(map)) if (old.races?.[k]?.won) s.events[id] = { won: true, stars: 1, best: old.races[k].best };
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
  s.clickPower = scale(s.clickPower, GARAGE_LEVELS);
  s.automation = scale(s.automation, GARAGE_LEVELS);
}

// Fills missing fields, clamps numbers and drops unknown ids, so a damaged save can't crash the game.
function validate(raw) {
  const s = { ...fresh(), ...raw };
  s.cash = Math.max(0, Math.floor(+s.cash || 0));
  s.owned = ['kaze', ...(s.owned || []).filter(id => id !== 'kaze' && carDef(id))];
  if (!(s.v >= 3)) migrateParts(s);
  s.v = 3;
  const tune = {};
  for (const id of s.owned) tune[id] = Object.fromEntries(carDef(id).parts.map(k => [k, level(s.tune?.[id]?.[k], PART_LEVELS)]));
  s.tune = tune;
  if (!s.owned.includes(s.car)) s.car = 'kaze';
  s.clickPower = level(s.clickPower, GARAGE_LEVELS);
  s.automation = level(s.automation, GARAGE_LEVELS);
  const events = {};
  for (const [id, e] of Object.entries(s.events || {})) {
    if (EVENTS.some(x => x.id === id)) events[id] = { won: !!e.won, stars: Math.min(3, Math.max(0, e.stars | 0)), best: e.best > 0 ? e.best : null };
  }
  s.events = events;
  s.stats = { ...fresh().stats, ...s.stats };
  s.achievements = Object.fromEntries(Object.entries(s.achievements || {}).filter(([id]) => ACHIEVEMENTS.some(a => a.id === id)));
  s.milestones = (s.milestones || []).filter(n => MILESTONES.some(m => m.stars === n));
  const round = Math.max(1, Math.floor(+s.legend?.round || 1));
  s.legend = { round, best: Math.min(round - 1, Math.max(0, Math.floor(+s.legend?.best || 0))) };
  // KM/H is the default; MPH only if the player picked it in Settings
  s.unitsChosen = !!s.unitsChosen;
  s.units = s.unitsChosen && s.units === 'mph' ? 'mph' : 'kmh';
  s.reducedMotion = !!s.reducedMotion;
  // players who already raced or tuned (including migrated saves) skip the first-session guide
  s.tutorial = { ...s.tutorial };
  if (Object.keys(s.events).length || s.stats.races > 0) s.tutorial = { upgraded: true, raced: true, done: true };
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

export const carLock = id => (carDef(id).requires && !state.events[carDef(id).requires]?.won ? `Win ${eventDef(carDef(id).requires).name}` : null);

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

export const totalStars = () => Object.values(state.events).reduce((n, e) => n + e.stars, 0);
export const clickValue = () => Math.max(1, Math.round(CLICK_BASE[state.clickPower] * (1 + STAR_BONUS * totalStars())));
export const autoRate = () => AUTO_CPS[state.automation] * clickValue();
export const autoUnlocked = () => !!state.events[AUTO_UNLOCK]?.won;

export const garageCost = kind => (kind === 'click' ? CLICK_COST[state.clickPower + 1] : AUTO_COST[state.automation + 1]) ?? null;
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

const wonEvent = id => +!!state.events[id]?.won;
const PROGRESS = {
  cars: () => state.owned.length,
  automation: () => state.automation,
  maxLevel: () => Math.max(0, ...Object.values(state.tune).flatMap(t => Object.values(t))),
  earned: () => state.stats.fromClicks + state.stats.fromRaces + state.stats.fromAuto,
  stars: () => totalStars(),
  legend: () => state.legend.best,
  country_5: () => wonEvent('country_5'),
  coast_5: () => wonEvent('coast_5'),
  city_5: () => wonEvent('city_5'),
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

// ---------------------------------------------------------------- events and progression

export const envUnlocked = env => !env.requires || !!state.events[env.requires]?.won;
export function eventUnlocked(e) {
  const env = ENVS.find(v => v.id === e.env);
  if (!envUnlocked(env)) return false;
  const list = EVENTS.filter(x => x.env === e.env), i = list.indexOf(e);
  return i === 0 || !!state.events[list[i - 1].id]?.won;
}
export const latestEvent = () => [...EVENTS].reverse().find(eventUnlocked) || EVENTS[0];

// The opponent's car scaled to the opponent's PR (GDD §6.6). Legend rounds set their own PR.
export function opponentSpec(e) {
  const o = OPPONENTS[e.opp], c = carDef(o.carId), target = e.oppPR ?? o.pr, k = target / pr(c.stats);
  return { ...c.stats, launch: c.stats.launch * k, accel: c.stats.accel * k, topSpeed: c.stats.topSpeed * k, quirk: c.launchQuirk, name: o.name, pr: target };
}

export const starsFor = (e, won, time) => (!won ? 0 : time <= MEDALS[e.id][1] ? 3 : time <= MEDALS[e.id][0] ? 2 : 1);

// ---------------------------------------------------------------- Legend Series

export const legendUnlocked = () => !!state.events[LEGEND.unlock]?.won;

// Round n of the endless Legend Series, shaped like a campaign event.
export function legendEvent(n) {
  const L = LEGEND, i = n - 1, opp = L.rivals[i % L.rivals.length], dist = L.dists[i % L.dists.length];
  const fast = Math.log(L.softCap / L.rec) / Math.log(1 + L.growth); // rounds until the soft cap
  const rec = Math.round(i <= fast ? L.rec * Math.pow(1 + L.growth, i) : L.softCap * Math.pow(1 + L.lateGrowth, i - fast));
  return {
    id: `legend_${n}`, legend: n, env: L.envs[i % L.envs.length], name: `Legend Round ${n}`, dist, opp, rec,
    oppPR: Math.round(rec * L.ratio[opp][dist]), win: roundNice(L.win * Math.pow(1 + L.winGrowth, i)), first: 0,
  };
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

// A won round moves the series on; a lost one can be retried as often as needed.
function recordLegend(e, won, perfects) {
  const lines = [[won ? 'Win' : 'Finish', won ? e.win : Math.round(e.win * LOSS_PCT)]];
  if (won) {
    state.legend.round = Math.max(state.legend.round, e.legend + 1);
    state.legend.best = Math.max(state.legend.best, e.legend);
  }
  const total = payout(lines, won, perfects);
  changed('race');
  return { lines, total, firstWin: won, stars: 0, newStars: 0, milestones: [], next: won ? legendEvent(e.legend + 1) : null, env: null };
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

// Applies a finished race and returns what it paid and unlocked (GDD §9.4, §7.3–§7.5).
export function recordRace(e, won, time, perfects, feats) {
  if (feats) recordFeats(won, feats);
  if (e.legend) return recordLegend(e, won, perfects);
  const rec = (state.events[e.id] ||= { won: false, stars: 0, best: null });
  const firstWin = won && !rec.won;
  const starsBefore = totalStars();
  const stars = starsFor(e, won, time);
  const newStars = Math.max(0, stars - rec.stars);
  if (won) rec.won = true;
  rec.stars = Math.max(rec.stars, stars);
  if (won && (rec.best == null || time < rec.best)) rec.best = time;

  const lines = [[won ? 'Win' : 'Finish', won ? e.win : Math.round(e.win * LOSS_PCT)]];
  if (firstWin) lines.push(['First-win bonus', e.first]);
  if (firstWin && e.champion) lines.push(['Champion bonus', e.champion]);
  const milestones = [];
  for (const m of MILESTONES) {
    if (m.stars > starsBefore && m.stars <= totalStars() && !state.milestones.includes(m.stars)) {
      state.milestones.push(m.stars);
      milestones.push(m);
      if (m.cash) lines.push([`${m.stars}★ milestone`, m.cash]);
    }
  }
  const total = payout(lines, won, perfects);

  // the next event: the venue's next one, or after a champion win the new venue's first
  const list = EVENTS.filter(x => x.env === e.env);
  const env = firstWin ? ENVS.find(v => v.requires === e.id) : null;
  const next = firstWin ? list[list.indexOf(e) + 1] || (env && EVENTS.find(x => x.env === env.id)) : null;
  changed('race');
  return { lines, total, firstWin, stars, newStars, milestones, next, env };
}
