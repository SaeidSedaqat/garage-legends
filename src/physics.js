// Deterministic drag-race simulation (GDD §6.4–§6.9). No Phaser here, so the balance
// check can run it headless. Units: meters, seconds; RPM is a 0–1 fraction of the rev range.
import { SIM } from './data.js';

export const pr = s => Math.round(10 * (0.25 * s.launch + 0.4 * s.accel + 0.35 * s.topSpeed));

export function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Shift zones widen with the car's window and Transmission level.
export function zones(spec) {
  const m = spec.shiftWindow * (1 + 0.04 * (spec.trans || 0)), c = SIM.shiftCenter;
  return {
    good: [c - SIM.goodHalf * m, c + SIM.goodHalf * m],
    perfect: [c - SIM.perfectHalf * m, c + SIM.perfectHalf * m],
  };
}

export function launchBand(spec) {
  const w = SIM.launchWidth * (0.8 + spec.launch / 250) * (1 + 0.025 * (spec.tires || 0)) * (spec.quirk === 'wheelspin' ? 0.75 : 1);
  return [SIM.launchCenter - w / 2, SIM.launchCenter + w / 2];
}

const vMaxOf = spec => (90 + 1.6 * spec.topSpeed) * 0.44704;

// Gearing is set per race distance: the shifts come at even intervals, the last one about
// SIM.lastShiftAt of the way through the race. With one fixed gearbox a car sat in top gear
// for most of a mile with nothing to do. Each gear's top speed is read off the car's own speed
// curve (a few passes, since shifting changes the curve); the engine's power is unchanged.
const gearCache = new Map();
function gearEnds(spec, distance) {
  const key = `${spec.launch}|${spec.accel}|${spec.topSpeed}|${spec.gears}|${spec.shiftWindow}|${spec.trans || 0}|${spec.tires || 0}|${distance}|${SIM.lastShiftAt}`;
  if (!gearCache.has(key)) {
    const n = spec.gears, vMax = vMaxOf(spec), shiftAt = plannedShift(spec, 'good').rpm;
    let ends = null;
    for (let pass = 0; pass < 3; pass++) {
      const { speeds, finish } = trial(spec, distance, ends);
      const at = t => speeds[Math.min(speeds.length - 1, Math.round(t / SIM.dt))];
      // built from the last shift backwards so every gear is reachable, and kept at least 25%
      // apart so after a shift the needle drops back and climbs again
      ends = new Array(n);
      for (let i = n - 1; i >= 1; i--) {
        const want = (0.94 * at((finish * SIM.lastShiftAt * i) / (n - 1))) / shiftAt;
        ends[i - 1] = i === n - 1 ? want : Math.min(want, ends[i] / 1.25);
      }
      ends[n - 1] = Math.max(vMax, ends[n - 2] * 1.15);
    }
    if (gearCache.size > 2000) gearCache.clear();
    gearCache.set(key, ends);
  }
  return gearCache.get(key);
}

// One race with Good inputs on the given gear ends (the default gearbox when null): the speed
// at every step and the finish time.
function trial(spec, distance, ends) {
  const r = build(spec, ends, distance), dt = SIM.dt, speeds = [];
  let target = plannedShift(spec, 'good'), t = 0;
  for (; !r.finished && t < 120; t += dt) {
    if (!r.launched && t >= 0.3) {
      r.rpm = plannedRev(spec, 'good');
      launch(r, 0.3);
    }
    if (r.launched && r.shifting <= 0 && !topGear(r) && ready(r, target)) shift(r);
    if (topGear(r) && r.boost <= 0) nitro(r);
    step(r, dt, distance);
    speeds.push(r.v);
  }
  return { speeds, finish: r.finished ? r.finishTime : t };
}

export const makeRacer = (spec, distance) => build(spec, distance ? gearEnds(spec, distance) : null, distance || 402);

function build(spec, gearing, distance) {
  const vMax = vMaxOf(spec);
  const ends = gearing ? [...gearing] : [];
  if (!gearing) for (let i = 1; i <= spec.gears; i++) ends.push(vMax * Math.pow(i / spec.gears, 0.75));
  return {
    spec, vMax, ends, distance, a0: 4 + 0.16 * spec.accel,
    gear: 0, v: 0, a: 0, dist: 0, time: 0, rpm: 0.15,
    launched: false, launchT: 0, launchQ: 0, launchLabel: null, reaction: null, jump: false,
    shifting: 0, effect: null, limiter: 0, shifts: [],
    nitro: 0, boost: 0, boostMult: 1, nitros: [],
    finished: false, finishTime: null,
  };
}

// Nitro charges are handed out on reaching top gear: enough to fill `cover` of the time left
// to the line, plus one for a perfect launch and one for every two perfect shifts.
function nitroCharges(r) {
  const N = SIM.nitro, left = (r.distance - r.dist) / Math.max(r.v, 1);
  const bonus = (r.launchLabel === 'perfect' ? 1 : 0) + Math.floor(r.shifts.filter(q => q === 'perfect').length / 2);
  return Math.max(1, Math.round((left * N.cover) / N.time)) + Math.min(N.bonusMax, bonus);
}

// Fires one nitro charge (top gear only). A charge fired in the last moment of the running
// burst chains for a bigger boost; fired any earlier it's wasted (GDD-style timing skill for
// the top-gear stretch, which used to be spent just watching).
export function nitro(r) {
  if (!r.launched || r.finished || !topGear(r) || r.nitro <= 0 || r.shifting > 0) return null;
  const N = SIM.nitro;
  const q = r.boost <= 0 ? 'boost' : r.boost <= N.chainWindow ? 'chain' : 'early';
  r.nitro--;
  r.nitros.push(q);
  if (q !== 'early') {
    r.boost = N.time;
    r.boostMult = q === 'chain' ? N.chainBonus : 1;
  }
  return q;
}

export const topGear = r => r.gear >= r.ends.length - 1;

function rpmOf(r) {
  const i = r.gear, vS = i ? r.ends[i - 1] : 0, vE = r.ends[i], entry = i ? vS / vE : 0;
  return entry + ((1 - entry) * (r.v - vS)) / (vE - vS);
}

// Scores a launch from the rev held at release and the reaction time (GDD §6.4).
export function launch(r, reaction, jump = false) {
  const [lo, hi] = launchBand(r.spec), c = (lo + hi) / 2, half = (hi - lo) / 2;
  let rpmScore = 0.3, label = r.rpm < lo ? 'bog' : 'wheelspin';
  if (Math.abs(r.rpm - c) <= half * 0.3) { rpmScore = 1; label = null; }
  else if (r.rpm >= lo && r.rpm <= hi) { rpmScore = 0.7; label = null; }
  const reactScore = jump ? 0.3 : reaction <= 0.25 ? 1 : reaction <= 0.45 ? 0.7 : 0.3;
  r.launchQ = rpmScore * 0.6 + reactScore * 0.4;
  r.launchLabel = jump ? 'jump' : label || (r.launchQ >= 0.95 ? 'perfect' : 'good');
  r.reaction = reaction;
  r.jump = jump;
  r.launched = true;
  r.launchT = 0;
  r.rpm = 0;
  return r.launchLabel;
}

export function shiftQuality(r) {
  const z = zones(r.spec), f = r.rpm;
  if (f >= z.perfect[0] && f <= z.perfect[1]) return 'perfect';
  if (f >= z.good[0] && f <= z.good[1]) return 'good';
  return f < z.good[0] ? 'early' : 'late';
}

export function shift(r) {
  if (!r.launched || r.finished || r.shifting > 0 || topGear(r)) return null;
  const q = shiftQuality(r);
  r.gear++;
  r.shifting = SIM.shiftTime[q] * (1 - 0.03 * (r.spec.trans || 0));
  r.effect = q === 'perfect' ? { ...SIM.perfectBoost } : q === 'early' ? { ...SIM.earlyBog } : null;
  r.limiter = 0;
  r.shifts.push(q);
  if (topGear(r)) r.nitro = nitroCharges(r);
  return q;
}

export function step(r, dt, distance) {
  r.time += dt;
  if (!r.launched) return;
  if (r.finished) {
    r.v = Math.max(0, r.v - 8 * dt);
    r.dist += r.v * dt;
    r.rpm += (0.25 - r.rpm) * Math.min(1, dt * 3);
    r.a = 0;
    return;
  }
  const s = r.spec, n = r.ends.length;
  let mult = 1;
  if (r.launchT < SIM.launchFade) {
    mult *= 1 - (1 - r.launchQ) * 0.45 * (1 - s.launch / 200) * (1 - r.launchT / SIM.launchFade);
  }
  r.launchT += dt;
  if (r.effect) {
    mult *= r.effect.mult;
    if ((r.effect.time -= dt) <= 0) r.effect = null;
  }
  let rpm = rpmOf(r);
  if (!topGear(r) && rpm >= 1) {
    rpm = 1;
    mult *= SIM.limiterMult;
    r.limiter += dt;
  }
  // nitro raises the speed the car can reach and pushes harder while it burns; afterwards
  // drag eases the car back down to its normal top speed
  let vMax = r.vMax;
  if (r.boost > 0) {
    const N = SIM.nitro, k = r.boostMult;
    vMax *= 1 + (N.speed - 1) * k;
    mult *= 1 + (N.force - 1) * k;
    r.boost -= dt;
  }
  let a = 0;
  if (r.shifting > 0) r.shifting -= dt;
  else a = r.a0 * (1.25 - (0.35 * r.gear) / Math.max(1, n - 1)) * Math.max(-0.4, 1 - Math.pow(r.v / vMax, 2.2)) * mult;
  r.a = a;
  r.v = Math.max(0, r.v + a * dt);
  r.dist += r.v * dt;
  r.rpm = Math.min(1, Math.max(0, rpmOf(r)));
  if (r.dist >= distance) {
    r.finished = true;
    r.finishTime = r.time - (r.dist - distance) / Math.max(r.v, 0.1);
  }
}

// ---------------------------------------------------------------- scripted drivers

// The rev an AI or test driver holds at launch: inside the band's sweet spot, inside the
// band, or outside it.
export function plannedRev(spec, quality) {
  const [lo, hi] = launchBand(spec), c = (lo + hi) / 2;
  if (quality === 'perfect') return c;
  if (quality === 'good') return c + (hi - c) * 0.7;
  return lo - 0.08;
}

// RPM at which a driver shifts for a planned outcome. A late shift waits on the limiter.
export function plannedShift(spec, quality) {
  const z = zones(spec);
  if (quality === 'perfect') return { rpm: SIM.shiftCenter, wait: 0 };
  if (quality === 'good') return { rpm: (z.good[1] + z.perfect[1]) / 2, wait: 0 };
  if (quality === 'early') return { rpm: z.good[0] - 0.05, wait: 0 };
  return { rpm: 1, wait: SIM.lateWait };
}

const ready = (r, plan) => r.rpm >= plan.rpm && r.limiter >= plan.wait;

// When a scripted driver fires nitro: 'boost' waits for each burst to end, 'chain' fires
// inside the chain window, 'none' never uses it.
export function nitroReady(r, style) {
  if (style === 'none' || r.nitro <= 0 || !topGear(r) || r.shifting > 0) return false;
  return style === 'chain' ? r.boost <= SIM.nitro.chainWindow * 0.6 : r.boost <= 0;
}

export function pick(dist, rand) {
  let x = rand();
  for (const [k, p] of Object.entries(dist)) if ((x -= p) <= 0) return k;
  return 'good';
}

// Gaussian sample (Box–Muller) for reaction times.
export function gauss(rand, mean, sd) {
  return mean + sd * Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
}

// A whole race for one car with scripted inputs; returns its finish time from green.
export function runSolo(spec, distance, { reaction, launchQ, shiftQ, nitroQ = 'boost', form = 1 }) {
  const r = makeRacer(spec, distance), dt = SIM.dt;
  r.a0 *= form;
  let target = plannedShift(spec, shiftQ(0));
  for (let t = 0; !r.finished && t < 120; t += dt) {
    if (!r.launched && t >= reaction) {
      r.rpm = plannedRev(spec, launchQ);
      launch(r, reaction);
    }
    if (r.launched && r.shifting <= 0 && !topGear(r) && ready(r, target)) {
      shift(r);
      target = plannedShift(spec, shiftQ(r.gear));
    }
    if (nitroReady(r, nitroQ)) nitro(r);
    step(r, dt, distance);
  }
  return r.finished ? r.finishTime : 120;
}

export const shiftReady = ready;

// An AI opponent's inputs for one race, drawn from its driving profile.
export function aiInputs(ai, rand) {
  const launchQ = rand() < ai.launch ? (rand() < 0.3 ? 'perfect' : 'good') : 'poor';
  const shifts = Array.from({ length: 8 }, () => pick(ai.shift, rand));
  // sharper drivers chain their nitro more often
  const nitroQ = rand() < ai.shift.perfect + 0.1 ? 'chain' : 'boost';
  // the car's form on the day scales its acceleration, so results spread out a little and a
  // slightly worse run can still win
  const form = gauss(rand, 1, SIM.aiForm);
  return { reaction: Math.max(0.12, gauss(rand, ai.reaction[0], ai.reaction[1])), launchQ, shiftQ: i => shifts[i], nitroQ, form };
}
