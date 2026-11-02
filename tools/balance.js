// Balance check (GDD §17.2). Open tools/balance.html through the local server to run it.
// The race ladder: for every rival and distance it finds the rival PR at which a player at the
// recommended PR driving like REF (below) wins ~65% (LADDER.ratio), checks the win
// rate up the ladder, and runs a pacing bot through it.
import { CARS, OPPONENTS, DIST, LADDER, PART_LEVELS, STAR_BONUS, MILESTONES, LOSS_PCT } from '../src/data.js';
import { pr, rng, hash, runSolo, aiInputs } from '../src/physics.js';
import { blankTune, cooldownAfter, crewCost, crewRate, ladderEvent, partCost, partLock, tapBase, tapCost, tuned } from '../src/tuning.js';

const SAMPLES = 400;
const TARGET_WIN = 0.65;
// Rivals are tuned against REF, a sharp player: perfect launches, every other shift perfect, nitro
// fired (not chained). GOOD and ACE show how a weaker and a flawless driver fare.
const GOOD = { reaction: 0.35, launchQ: 'good', shiftQ: () => 'good', nitroQ: 'boost' };
const REF = { reaction: 0.25, launchQ: 'perfect', shiftQ: i => (i % 2 ? 'perfect' : 'good'), nitroQ: 'boost' };
const ACE = { reaction: 0.18, launchQ: 'perfect', shiftQ: () => 'perfect', nitroQ: 'chain' };

const car = id => CARS.find(c => c.id === id);

// A car's stats scaled so its PR equals `target`.
export function scaled(c, target) {
  const k = target / pr(c.stats);
  return { ...c.stats, launch: c.stats.launch * k, accel: c.stats.accel * k, topSpeed: c.stats.topSpeed * k, quirk: c.launchQuirk };
}

function winRate(oppId, dist, playerTime, oppPR) {
  const o = OPPONENTS[oppId], s = scaled(car(o.carId), oppPR), rand = rng(hash(`${oppId}:${dist}`));
  let wins = 0;
  for (let i = 0; i < SAMPLES; i++) if (playerTime <= runSolo(s, DIST[dist].m, aiInputs(o.ai, rand))) wins++;
  return wins / SAMPLES;
}

// The player drives the rival's own model at the rival's own PR (the top rivals: an Apex Zero at
// PR 1100); the rival PR at which REF wins ~65%, as a ratio of that, goes into LADDER.ratio.
export function ladderRatios() {
  const ratio = {};
  for (const id of [...LADDER.roster, ...LADDER.endRivals]) {
    const end = LADDER.endRivals.includes(id), rec = end ? 1100 : OPPONENTS[id].pr;
    const mine = scaled(car(end ? 'apex' : OPPONENTS[id].carId), rec);
    ratio[id] = {};
    for (const dist of Object.keys(DIST)) {
      const ref = runSolo(mine, DIST[dist].m, REF);
      let lo = rec * 0.5, hi = rec * 1.5;
      for (let i = 0; i < 16; i++) {
        const mid = (lo + hi) / 2;
        if (winRate(id, dist, ref, mid) > TARGET_WIN) lo = mid; else hi = mid;
      }
      ratio[id][dist] = +((lo + hi) / 2 / rec).toFixed(3);
    }
  }
  return ratio;
}

// Win rates at the recommended PR in the rival's model, for races 1..n: `rate` for REF (the
// target), `good` and `ace` for a weaker and a flawless driver.
export function ladderCheck(n = 60) {
  return Array.from({ length: n }, (_, i) => {
    const e = ladderEvent(i + 1), o = OPPONENTS[e.opp], end = LADDER.endRivals.includes(e.opp);
    const mine = scaled(car(end ? 'apex' : o.carId), e.rec), at = d => winRate(e.opp, e.dist, runSolo(mine, DIST[e.dist].m, d), e.oppPR);
    return { n: e.n, rec: e.rec, opp: e.opp, dist: e.dist, env: e.env, win: e.win, rate: at(REF), good: at(GOOD), ace: at(ACE) };
  });
}

// ---------------------------------------------------------------- pacing bot (GDD §9.5)

// Each car's PR stock and fully tuned: every car's parts should add about +30%.
export const carGains = () => CARS.map(c => {
  const full = Object.fromEntries(c.parts.map(p => [p, PART_LEVELS]));
  const stock = pr(c.stats), max = pr(tuned(c, full));
  return { car: c.id, stock, max, gain: +(max / stock - 1).toFixed(3) };
});

// A "mixed" player: taps at `tapsPerSec` in the garage, races the next ladder race whenever the
// cooldown is over and its PR is within 10% of the recommendation, and spends on whatever adds
// the most PR per dollar, or saves for the next car. Each race takes `raceS` seconds with
// menus, and then RACE cools down (cooldownAfter). With `ads`, it skips every cooldown.
// `edge` is how much PR the driving is worth over REF (0.1 for a flawless driver).
// `log` has when each milestone race was won and each car bought; `gaps` the longest waits.
export function pacing({ tapsPerSec = 2, raceS = 30, seed = 1, until = 41, ads = false, edge = 0 } = {}) {
  const rand = rng(seed);
  // a REF-level driver: 65% at the recommended PR, a near-certain win 10% above it
  const winChance = (mine, rec) => Math.min(0.97, Math.max(0.03, 0.65 + ((mine * (1 + edge)) / rec - 1) * 3.5));
  const def = id => CARS.find(x => x.id === id);
  const tune = { kaze: blankTune(def('kaze')) };
  let t = 0, cash = 0, car = 'kaze', cp = 0, auto = 0, best = 0, ready = 0, lastWin = 0, races = 0;
  const log = {}, buys = [], waits = [], claimed = new Set();
  const spec = id => tuned(def(id), tune[id]);
  const clickV = () => Math.round(tapBase(cp) * (1 + STAR_BONUS * best));
  const crew = () => (best >= 2 ? crewRate(auto) : 0);
  const income = () => tapsPerSec * clickV() + crew() * clickV();
  const buy = (what, c) => { cash -= c; buys.push({ what, t, cost: c, secs: Math.round(c / income()) }); };
  const pass = s => { cash += crew() * clickV() * s; t += s; };

  while (t < 10 * 3600 && best < until) {
    const e = ladderEvent(best + 1, spec(car)), mine = pr(spec(car));
    // shop first: with no cooldown early on, racing first would never leave time to upgrade
    const nextCar = CARS.find(c => !tune[c.id] && !(c.requires > best));
    if (nextCar && cash >= nextCar.price) { buy(`car ${nextCar.tier}`, nextCar.price); tune[nextCar.id] = blankTune(nextCar); car = nextCar.id; log[`car ${nextCar.tier}`] = t; continue; }
    if (cash >= tapCost(cp) && tapCost(cp) < income() * 90) { buy(`tap ${cp + 1}`, tapCost(cp++)); continue; }
    if (best >= 2 && cash >= crewCost(auto) && crewCost(auto) < income() * 120) { buy(`crew ${auto + 1}`, crewCost(auto++)); continue; }
    const c = def(car);
    const ups = c.parts.filter(k => partCost(c, k, tune[car][k]) != null && !partLock(c, tune[car], k)).map(k => {
      const cost = partCost(c, k, tune[car][k]), gain = pr(tuned(c, { ...tune[car], [k]: tune[car][k] + 1 })) - mine;
      return { k, c: cost, v: gain / cost };
    }).filter(u => u.v > 0).sort((a, b) => b.v - a.v);
    const affordable = ups.find(u => u.c <= cash);
    if (affordable && (!nextCar || affordable.c < nextCar.price * 0.25 || ups[0].c > nextCar.price)) { buy(`${car} ${affordable.k}`, affordable.c); tune[car][affordable.k]++; continue; }
    // nothing worth buying: race when RACE is ready, even a little short of the recommendation
    // (a loss pays LOSS_PCT), unless far off
    if (t >= ready && mine * (1 + edge) >= e.rec * 0.9) {
      pass(raceS);
      races++;
      if (rand() < winChance(mine, e.rec)) {
        cash += e.win;
        best++;
        for (const m of MILESTONES) if (m.stars <= best && !claimed.has(m.stars)) { claimed.add(m.stars); cash += m.cash; }
        waits.push({ race: best, wait: Math.round((t - lastWin) / 60 * 10) / 10 });
        lastWin = t;
        if (best % 5 === 0 || best === 1) log[`race ${best}`] = t;
      } else cash += Math.round(e.win * LOSS_PCT);
      ready = ads ? t : t + cooldownAfter(e.n);
      continue;
    }
    // otherwise tap for 10 s (racing too early just pays the loss share and burns the cooldown)
    cash += tapsPerSec * clickV() * 10;
    pass(10);
  }
  const gaps = [...waits].sort((a, b) => b.wait - a.wait).slice(0, 5);
  return { log, buys, gaps, races, waits, minutes: Math.round(t / 6) / 10 };
}
