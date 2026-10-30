// Balance check (GDD §17.2). Open tools/balance.html through the local server to run it.
// For every event it finds the opponent PR at which a player at the recommended PR with
// Good launches and Good shifts wins ~70%, and generates the Silver/Gold medal times.
import { CARS, EVENTS, OPPONENTS, DIST, PART_LEVELS, STAR_BONUS, LEGEND } from '../src/data.js';
import { pr, rng, hash, runSolo, aiInputs } from '../src/physics.js';
import { blankTune, crewCost, crewRate, partCost, partLock, tapBase, tapCost, tuned } from '../src/tuning.js';

const SAMPLES = 400;
const TARGET_WIN = 0.7;
const GOOD = { reaction: 0.35, launchQ: 'good', shiftQ: () => 'good', nitroQ: 'boost' };
const PERFECT = { reaction: 0.2, launchQ: 'perfect', shiftQ: () => 'perfect', nitroQ: 'chain' };

const car = id => CARS.find(c => c.id === id);

// A car's stats scaled so its PR equals `target`.
export function scaled(c, target) {
  const k = target / pr(c.stats);
  return { ...c.stats, launch: c.stats.launch * k, accel: c.stats.accel * k, topSpeed: c.stats.topSpeed * k, quirk: c.launchQuirk };
}

export function winRate(event, playerTime, oppPR) {
  const o = OPPONENTS[event.opp], s = scaled(car(o.carId), oppPR), rand = rng(hash(event.id));
  let wins = 0;
  for (let i = 0; i < SAMPLES; i++) if (playerTime <= runSolo(s, DIST[event.dist].m, aiInputs(o.ai, rand))) wins++;
  return wins / SAMPLES;
}

// ---------------------------------------------------------------- pacing bot (GDD §9.5)

// Each car's PR stock and fully tuned: every car's parts should add about +30%.
export const carGains = () => CARS.map(c => {
  const full = Object.fromEntries(c.parts.map(p => [p, PART_LEVELS]));
  const stock = pr(c.stats), max = pr(tuned(c, full));
  return { car: c.id, stock, max, gain: +(max / stock - 1).toFixed(3) };
});

// A "mixed" player: taps at `tapsPerSec` while in the garage, races the next event once its PR
// reaches the recommendation, otherwise replays its best won event or taps, and spends on
// whatever adds the most PR per dollar. Each race costs `raceS` seconds including menus.
// `buys` lists every purchase with how many seconds of the bot's income it cost at the time.
export function pacing({ tapsPerSec = 2, raceS = 35, seed = 1 } = {}) {
  const rand = rng(seed);
  // ~70% at the recommended PR (by definition), better or worse by the PR gap
  const winChance = (mine, rec) => Math.min(0.97, Math.max(0.05, 0.7 + (mine / rec - 1) * 3));
  const def = id => CARS.find(x => x.id === id);
  const tune = { kaze: blankTune(def('kaze')) };
  let t = 0, cash = 0, car = 'kaze', cp = 0, auto = 0, stars = 0, idx = 0;
  const won = new Set(), log = {}, buys = [], mark = k => { log[k] ??= t; };
  const spec = id => tuned(def(id), tune[id]);
  const clickV = () => Math.round(tapBase(cp) * (1 + STAR_BONUS * stars));
  const crew = () => (won.has('country_2') ? crewRate(auto) : 0);
  const farmEvent = () => EVENTS.filter(x => won.has(x.id)).sort((a, b) => b.win - a.win)[0];
  const income = () => Math.max(tapsPerSec * clickV(), (farmEvent()?.win || 0) / raceS) + crew() * clickV();
  const buy = (what, c) => { cash -= c; buys.push({ what, t, cost: c, secs: Math.round(c / income()) }); };
  const pass = s => { cash += crew() * clickV() * s; t += s; };

  while (t < 8 * 3600 && idx < EVENTS.length) {
    const e = EVENTS[idx], mine = pr(spec(car));
    if (mine >= e.rec * 0.95) {
      pass(raceS);
      if (rand() < winChance(mine, e.rec)) {
        cash += e.win + e.first + (e.champion || 0);
        won.add(e.id); stars++; idx++;
        mark(`won ${e.id}`);
      } else cash += e.win * 0.25;
      continue;
    }
    // shopping: the next car in the roster (what the goal chip points at), an upgrade, or a
    // garage upgrade costing under 90 s (Tap Power) or 2 min (Pit Crew) of income
    const nextCar = CARS.find(c => !tune[c.id] && !c.requires);
    if (nextCar && cash >= nextCar.price) { buy(`car ${nextCar.tier}`, nextCar.price); tune[nextCar.id] = blankTune(nextCar); car = nextCar.id; mark(`car ${nextCar.tier}`); continue; }
    if (cash >= tapCost(cp) && tapCost(cp) < income() * 90) { buy(`tap ${cp + 1}`, tapCost(cp++)); continue; }
    if (won.has('country_2') && cash >= crewCost(auto) && crewCost(auto) < income() * 120) { buy(`crew ${auto + 1}`, crewCost(auto++)); continue; }
    const c = def(car);
    const ups = c.parts.filter(k => partCost(c, k, tune[car][k]) != null && !partLock(c, tune[car], k)).map(k => {
      const cost = partCost(c, k, tune[car][k]), gain = pr(tuned(c, { ...tune[car], [k]: tune[car][k] + 1 })) - mine;
      return { k, c: cost, v: gain / cost };
    }).filter(u => u.v > 0).sort((a, b) => b.v - a.v);
    const affordable = ups.find(u => u.c <= cash);
    // only buy upgrades if they're cheaper than saving towards the next car would be
    if (affordable && (!nextCar || affordable.c < nextCar.price * 0.25 || ups[0].c > nextCar.price)) { buy(`${car} ${affordable.k}`, affordable.c); tune[car][affordable.k]++; continue; }
    // earn: replay the best won event if it beats tapping, else tap for 10 s
    const farm = farmEvent();
    if (farm && farm.win / raceS > tapsPerSec * clickV()) { pass(raceS); cash += farm.win; }
    else { cash += tapsPerSec * clickV() * 10; pass(10); }
  }
  return { log, buys };
}

// Legend Series: the player drives an Apex Zero at each round's recommended PR. For every
// rival and distance this finds the opponent PR ÷ recommended PR that gives a ~70% win,
// which goes into LEGEND.ratio in src/data.js.
export function legendBalance(rec = 1100) {
  const ratio = {};
  for (const id of LEGEND.rivals) {
    ratio[id] = {};
    const o = OPPONENTS[id], c = car(o.carId);
    for (const dist of LEGEND.dists) {
      const good = runSolo(scaled(car('apex'), rec), DIST[dist].m, GOOD);
      const win = oppPR => {
        const s = scaled(c, oppPR), rand = rng(hash(`${id}:${dist}`));
        let wins = 0;
        for (let i = 0; i < SAMPLES; i++) if (good <= runSolo(s, DIST[dist].m, aiInputs(o.ai, rand))) wins++;
        return wins / SAMPLES;
      };
      let lo = rec * 0.6, hi = rec * 1.4;
      for (let i = 0; i < 18; i++) {
        const mid = (lo + hi) / 2;
        if (win(mid) > TARGET_WIN) lo = mid; else hi = mid;
      }
      ratio[id][dist] = +((lo + hi) / 2 / rec).toFixed(3);
    }
  }
  return ratio;
}

export function balance() {
  return EVENTS.map(e => {
    const c = car(OPPONENTS[e.opp].carId), dist = DIST[e.dist].m;
    const good = runSolo(scaled(c, e.rec), dist, GOOD);
    let lo = e.rec * 0.6, hi = e.rec * 1.4;
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2;
      if (winRate(e, good, mid) > TARGET_WIN) lo = mid; else hi = mid;
    }
    const oppPR = Math.round((lo + hi) / 2);
    return {
      event: e.id, rec: e.rec, oppPR, currentPR: OPPONENTS[e.opp].pr,
      winAtCurrent: winRate(e, good, OPPONENTS[e.opp].pr),
      silver: +(good * 0.97).toFixed(2),
      gold: +runSolo(scaled(c, e.rec * 1.15), dist, PERFECT).toFixed(2),
    };
  });
}
