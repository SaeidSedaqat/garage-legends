// Synthesized placeholder audio (WebAudio), so the prototype ships with no sound files.
let ctx = null;
let master = null;
let muted = false;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.7;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export const unlockAudio = () => ac();

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.7;
}

document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend();
  else ctx.resume();
});

function tone(freq, dur, { type = 'sine', vol = 0.15, to = null, delay = 0 } = {}) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur, vol, freq) {
  const c = ac();
  if (!c) return;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  const f = c.createBiquadFilter();
  const g = c.createGain();
  src.buffer = buf;
  f.type = 'bandpass';
  f.frequency.value = freq;
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start();
}

export const sfx = {
  tap: () => tone(520 + Math.random() * 80, 0.07, { type: 'triangle', vol: 0.08, to: 900 }),
  click: () => tone(700, 0.05, { type: 'triangle', vol: 0.06 }),
  buy: () => { tone(660, 0.08, { type: 'square', vol: 0.05 }); tone(990, 0.12, { type: 'square', vol: 0.05, delay: 0.07 }); },
  deny: () => tone(160, 0.14, { type: 'sawtooth', vol: 0.06 }),
  amber: () => tone(600, 0.12, { vol: 0.12 }),
  green: () => tone(1000, 0.35, { vol: 0.14 }),
  red: () => tone(220, 0.5, { type: 'sawtooth', vol: 0.1, to: 110 }),
  shift: q => { noise(0.08, 0.25, 2500); if (q === 'perfect') tone(1320, 0.15, { type: 'triangle', vol: 0.08 }); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, { type: 'triangle', vol: 0.1, delay: i * 0.1 })),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.08, delay: i * 0.14 })),
};

// Engine drone whose pitch follows RPM.
export const engine = {
  nodes: null,
  start() {
    const c = ac();
    if (!c || this.nodes) return;
    const out = c.createGain();
    const filter = c.createBiquadFilter();
    const o1 = c.createOscillator();
    const o2 = c.createOscillator();
    const sub = c.createGain();
    out.gain.value = 0;
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    o1.type = 'sawtooth';
    o2.type = 'square';
    o2.detune.value = -1200;
    sub.gain.value = 0.5;
    o1.connect(filter);
    o2.connect(sub).connect(filter);
    filter.connect(out).connect(master);
    o1.start();
    o2.start();
    out.gain.setTargetAtTime(0.07, c.currentTime, 0.1);
    this.nodes = { out, filter, o1, o2 };
  },
  set(rpm, load) {
    if (!this.nodes) return;
    const t = ctx.currentTime;
    const f = 20 + rpm / 30;
    this.nodes.o1.frequency.setTargetAtTime(f, t, 0.02);
    this.nodes.o2.frequency.setTargetAtTime(f, t, 0.02);
    this.nodes.filter.frequency.setTargetAtTime(500 + load * 1800, t, 0.05);
  },
  pause(on) {
    if (this.nodes) this.nodes.out.gain.setTargetAtTime(on ? 0 : 0.07, ctx.currentTime, 0.05);
  },
  stop() {
    if (!this.nodes) return;
    const { out, o1, o2 } = this.nodes;
    this.nodes = null;
    out.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
    setTimeout(() => { o1.stop(); o2.stop(); out.disconnect(); }, 400);
  },
};
