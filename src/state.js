// Player progress, economy rules and saving (GDD §8, §9, §13).
import {
  CARS, EVENTS, ENVS, OPPONENTS, CAR_UPGRADES, MAX_LEVEL, PER_LEVEL, CLICK_BASE, CLICK_COST, AUTO_CPS,
  AUTO_COST, AUTO_UNLOCK, CRIT, OFFLINE, STAR_BONUS, MILESTONES, MEDALS, LOSS_PCT, LEGEND,
} from './data.js';
import { pr } from './physics.js';
import { bus } from './events.js';

const KEY = 'garageLegends.save.v2';
const PROTOTYPE_KEY = 'garageLegends.save.v1';
const CLICKS_PER_SECOND_CAP = 15;

const blankTune = () => ({ engine: 0, turbo: 0, tires: 0, trans: 0 });
const level = n => Math.min(MAX_LEVEL, Math.max(0, Math.floor(+n || 0)));

export const carDef = id => CARS.find(c => c.id === id);
const LEGEND_ID = /^legend_(\d+)$/;
export const eventDef = id => EVENTS.find(e => e.id === id) || (LEGEND_ID.test(id) ? legendEvent(+id.match(LEGEND_ID)[1]) : undefined);

const prefersReducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function fresh() {
  return {
    v: 2, cash: 0, car: 'kaze', owned: ['kaze'], tune: { kaze: blankTune() },
    clickPower: 0, automation: 0, events: {}, milestones: [], tutorial: {}, legend: { round: 1, best: 0 },
    stats: { clicks: 0, races: 0, wins: 0, perfectShifts: 0, fromClicks: 0, fromRaces: 0, fromAuto: 0 },
    muted: false, units: 'mph', reducedMotion: prefersReducedMotion(), lastActive: Date.now(),
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
    s.tune[id] = { engine: level(t.engine), turbo: 0, tires: level(t.tires), trans: level(t.gearbox) };
  }
  if (s.owned.includes(old.car)) s.car = old.car;
  s.clickPower = Math.min(3, Math.floor((old.click || 0) / 4));
  s.automation = 0;
  const map = { quarter: 'country_1', half: 'country_2', mile: 'country_3' };
  for (const [k, id] of Object.entries(map)) if (old.races?.[k]?.won) s.events[id] = { won: true, stars: 1, best: old.races[k].best };
  s.muted = !!old.muted;
  return s;
}

// Fills missing fields, clamps numbers and drops unknown ids, so a damaged save can't crash the game.
function validate(raw) {
  const s = { ...fresh(), ...raw };
  s.cash = Math.max(0, Math.floor(+s.cash || 0));
  s.owned = ['kaze', ...(s.owned || []).filter(id => id !== 'kaze' && carDef(id))];
  const tune = {};
  for (const id of s.owned) tune[id] = Object.fromEntries(Object.keys(blankTune()).map(k => [k, level(s.tune?.[id]?.[k])]));
  s.tune = tune;
  if (!s.owned.includes(s.car)) s.car = 'kaze';
  s.clickPower = level(s.clickPower);
  s.automation = level(s.automation);
  const events = {};
  for (const [id, e] of Object.entries(s.events || {})) {
    if (EVENTS.some(x => x.id === id)) events[id] = { won: !!e.won, stars: Math.min(3, Math.max(0, e.stars | 0)), best: e.best > 0 ? e.best : null };
  }
  s.events = events;
  s.stats = { ...fresh().stats, ...s.stats };
  s.milestones = (s.milestones || []).filter(n => MILESTONES.some(m => m.stars === n));
  const round = Math.max(1, Math.floor(+s.legend?.round || 1));
  s.legend = { round, best: Math.min(round - 1, Math.max(0, Math.floor(+s.legend?.best || 0))) };
  if (s.units !== 'kmh') s.units = 'mph';
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

// A car's racing stats after its upgrades, as the sim reads them.
export function tunedSpec(id = state.car) {
  const c = carDef(id), t = state.tune[id] || blankTune();
  return {
    ...c.stats,
    launch: c.stats.launch * (1 + PER_LEVEL * t.tires),
    accel: c.stats.accel * (1 + PER_LEVEL * t.engine),
    topSpeed: c.stats.topSpeed * (1 + PER_LEVEL * t.turbo),
    tires: t.tires, trans: t.trans, quirk: c.launchQuirk,
  };
}
export const carPR = id => pr(tunedSpec(id));
export const stockPR = id => pr(carDef(id).stats);

// Stats with one more level of an upgrade, for the "PR 224 → 227" preview.
export function previewSpec(cat, id = state.car) {
  const t = state.tune[id];
  t[cat]++;
  const s = tunedSpec(id);
  t[cat]--;
  return s;
}

const roundNice = n => { const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(n)) - 1)); return Math.round(n / p) * p; };

export const upgradeLevel = (cat, id = state.car) => state.tune[id][cat];
export function upgradeCost(cat, id = state.car) {
  const lvl = upgradeLevel(cat, id);
  return lvl >= MAX_LEVEL ? null : roundNice(carDef(id).upgradeBase * CAR_UPGRADES[cat].weight * Math.pow(1.35, lvl));
}
export function upgradeLock(cat, id = state.car) {
  const needs = CAR_UPGRADES[cat].needs;
  if (!needs) return null;
  const [dep, lvl] = Object.entries(needs)[0];
  return upgradeLevel(dep, id) >= lvl ? null : `Needs ${CAR_UPGRADES[dep].name} Lv ${lvl}`;
}

function spend(n) {
  if (state.cash < n) return false;
  state.cash -= n;
  return true;
}

export function buyUpgrade(cat) {
  const cost = upgradeCost(cat);
  if (cost == null || upgradeLock(cat) || !spend(cost)) return false;
  state.tune[state.car][cat]++;
  state.tutorial.upgraded = true;
  changed('upgrade');
  return true;
}

export const carLock = id => (carDef(id).requires && !state.events[carDef(id).requires]?.won ? `Win ${eventDef(carDef(id).requires).name}` : null);

export function buyCar(id) {
  const c = carDef(id);
  if (state.owned.includes(id) || carLock(id) || !spend(c.price)) return false;
  state.owned.push(id);
  state.tune[id] = blankTune();
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
  earn(value, 'fromClicks');
  return { value, crit };
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

// Applies a finished race and returns what it paid and unlocked (GDD §9.4, §7.3–§7.5).
export function recordRace(e, won, time, perfects) {
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

  const list = EVENTS.filter(x => x.env === e.env);
  const next = firstWin ? list[list.indexOf(e) + 1] : null;
  const env = firstWin ? ENVS.find(v => v.requires === e.id) : null;
  changed('race');
  return { lines, total, firstWin, stars, newStars, milestones, next, env };
}
