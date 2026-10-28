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

export function makeRacer(spec) {
  const vMax = (90 + 1.6 * spec.topSpeed) * 0.44704;
  const ends = [];
  for (let i = 1; i <= spec.gears; i++) ends.push(vMax * Math.pow(i / spec.gears, 0.75));
  return {
    spec, vMax, ends, a0: 4 + 0.16 * spec.accel,
    gear: 0, v: 0, a: 0, dist: 0, time: 0, rpm: 0.15,
    launched: false, launchT: 0, launchQ: 0, launchLabel: null, reaction: null, jump: false,
    shifting: 0, effect: null, limiter: 0, shifts: [],
    finished: false, finishTime: null,
  };
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
  let a = 0;
  if (r.shifting > 0) r.shifting -= dt;
  else a = r.a0 * (1.25 - (0.35 * r.gear) / Math.max(1, n - 1)) * Math.max(0, 1 - Math.pow(r.v / r.vMax, 2.2)) * mult;
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
export function runSolo(spec, distance, { reaction, launchQ, shiftQ }) {
  const r = makeRacer(spec), dt = SIM.dt;
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
    step(r, dt, distance);
  }
  return r.finished ? r.finishTime : 120;
}

export const shiftReady = ready;

// An AI opponent's inputs for one race, drawn from its driving profile.
export function aiInputs(ai, rand) {
  const launchQ = rand() < ai.launch ? (rand() < 0.3 ? 'perfect' : 'good') : 'poor';
  const shifts = Array.from({ length: 8 }, () => pick(ai.shift, rand));
  return { reaction: Math.max(0.12, gauss(rand, ai.reaction[0], ai.reaction[1])), launchQ, shiftQ: i => shifts[i] };
}
