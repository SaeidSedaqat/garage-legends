// Game audio (WebAudio). Effects are short clips decoded once; music streams from audio
// elements so long tracks don't sit in memory decoded. Clips are WebM (Opus) where the browser
// plays it and M4A (AAC) elsewhere (older Safari); the engine loop stays WAV so it loops
// without a gap. Credits for the sources are in README.md and Settings.
let ctx = null;
let master = null, sfxBus = null, musicBus = null;
let muted = false, musicOn = true;
const SFX_VOL = 0.8, MUSIC_VOL = 0.35;

const FORMAT = (() => {
  const a = document.createElement('audio');
  return a.canPlayType?.('audio/webm; codecs="opus"') ? 'webm' : 'm4a';
})();
const file = name => `assets/audio/${name}.${FORMAT}`;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    // iPhones mute WebAudio (effects, engine) with the silent switch but not <audio> music;
    // 'playback' makes the whole game sound like a media app instead
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* not supported */ }
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = SFX_VOL;
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = musicOn ? MUSIC_VOL : 0;
    musicBus.connect(master);
    loadClips();
    music.resume();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Browsers only allow sound after the player touches the page, so audio starts on the first input.
export const unlockAudio = () => ac();
for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, unlockAudio, { once: true, capture: true });

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 1;
}
export function setMusic(on) {
  musicOn = on;
  if (musicBus) musicBus.gain.setTargetAtTime(on ? MUSIC_VOL : 0, ctx.currentTime, 0.1);
}

document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) { ctx.suspend(); music.el?.pause(); }
  else { ctx.resume(); music.el?.play().catch(() => {}); }
});

// ---------------------------------------------------------------- effects

// clip name → relative volume
const CLIPS = {
  tap1: 0.5, tap2: 0.5, tap3: 0.5, crit: 0.8, buy: 0.7, click: 0.5, deny: 0.6,
  amber: 0.6, green: 0.8, jump: 0.7, shift: 0.7, perfect: 0.6, nitro: 0.8,
  wrench: 0.7, achieve: 0.6, win: 0.9, lose: 0.7, crowd: 0.6, screech: 0.45,
};
const buffers = {};
function loadClips() {
  for (const name of [...Object.keys(CLIPS), 'engine']) {
    const url = name === 'engine' ? 'assets/audio/engine.wav' : file(name);
    fetch(url).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(buf => {
      buffers[name] = buf;
      if (name === 'engine') for (const e of engines) if (e.wanted) e.start();
    }).catch(() => { /* a missing clip just stays silent */ });
  }
}

function play(name, { rate = 1, vol = 1, delay = 0 } = {}) {
  const c = ac();
  if (!c || !buffers[name]) return null;
  const src = c.createBufferSource(), g = c.createGain();
  src.buffer = buffers[name];
  src.playbackRate.value = rate;
  g.gain.value = CLIPS[name] * vol;
  src.connect(g).connect(sfxBus);
  src.start(c.currentTime + delay);
  return src;
}

export const sfx = {
  tap: () => play(`tap${1 + Math.floor(Math.random() * 3)}`, { rate: 0.95 + Math.random() * 0.1 }),
  crit: () => play('crit'),
  click: () => play('click'),
  buy: () => play('buy'),
  deny: () => play('deny'),
  amber: () => play('amber'),
  green: () => play('green'),
  red: () => play('jump'),
  shift: q => { play('shift', { rate: q === 'early' ? 0.85 : 1 }); if (q === 'perfect') play('perfect', { delay: 0.04 }); },
  nitro: chain => play('nitro', { rate: chain ? 1.2 : 1, vol: chain ? 1.1 : 1 }),
  screech: hard => play('screech', { vol: hard ? 1.3 : 0.7 }),
  wrench: () => play('wrench'),
  achieve: () => play('achieve'),
  win: () => { play('win'); play('crowd', { delay: 0.3 }); },
  lose: () => play('lose'),
};

// ---------------------------------------------------------------- engine

// A recorded engine loop whose playback speed (and so its pitch) follows the RPM. The player's
// car and the rival each get one; `level` scales how loud it is.
const engineRate = rpm => Math.min(2.6, Math.max(0.5, 0.45 + rpm / 4200));
function makeEngine(level) {
  return {
    nodes: null,
    wanted: false,
    start() {
      this.wanted = true;
      const c = ac();
      if (!c || this.nodes || !buffers.engine) return;
      const src = c.createBufferSource(), filter = c.createBiquadFilter(), out = c.createGain();
      src.buffer = buffers.engine;
      src.loop = true;
      // the rival's loop starts at another point, so the two engines don't phase together
      filter.type = 'lowpass';
      filter.frequency.value = 1200;
      out.gain.value = 0;
      src.connect(filter).connect(out).connect(sfxBus);
      src.start(0, level < 1 ? buffers.engine.duration / 2 : 0);
      out.gain.setTargetAtTime(0.35 * level, c.currentTime, 0.1);
      this.nodes = { src, filter, out };
    },
    set(rpm, load) {
      if (!this.nodes) return;
      const t = ctx.currentTime;
      this.nodes.src.playbackRate.setTargetAtTime(engineRate(rpm), t, 0.03);
      this.nodes.filter.frequency.setTargetAtTime(700 + load * 3000, t, 0.05);
      this.nodes.out.gain.setTargetAtTime((0.2 + load * 0.25) * level, t, 0.05);
    },
    pause(on) {
      if (this.nodes) this.nodes.out.gain.setTargetAtTime(on ? 0 : 0.35 * level, ctx.currentTime, 0.05);
    },
    stop() {
      this.wanted = false;
      if (!this.nodes) return;
      const { src, out } = this.nodes;
      this.nodes = null;
      out.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
      setTimeout(() => { try { src.stop(); } catch { /* already stopped */ } out.disconnect(); }, 400);
    },
  };
}
export const engine = makeEngine(1);
export const rivalEngine = makeEngine(0.55);
const engines = [engine, rivalEngine];

// A short rev in the garage: the engine loop pitched up and back down.
export function revBlip() {
  const c = ac();
  if (!c || !buffers.engine) return;
  const src = c.createBufferSource(), g = c.createGain(), t = c.currentTime;
  src.buffer = buffers.engine;
  src.loop = true;
  src.playbackRate.setValueAtTime(0.6, t);
  src.playbackRate.linearRampToValueAtTime(1.9, t + 0.35);
  src.playbackRate.linearRampToValueAtTime(0.65, t + 1.1);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.4, t + 0.08);
  g.gain.setTargetAtTime(0, t + 0.8, 0.15);
  src.connect(g).connect(sfxBus);
  src.start(t);
  src.stop(t + 1.6);
}

// ---------------------------------------------------------------- music

// 'garage' alternates between two calm tracks; 'race' is the upbeat one. Each streams from an
// <audio> element routed through the music channel, and crossfades in.
const TRACKS = { garage: ['music-garage1', 'music-garage2'], race: ['music-race'] };
// per-track level, so the quieter garage recordings sit near the race track
const TRACK_GAIN = { 'music-garage1': 1.8, 'music-garage2': 1.4, 'music-race': 1 };
export const music = {
  el: null, mood: null, nextGarage: Math.floor(Math.random() * 2),
  play(mood) {
    if (this.mood === mood && this.el) return;
    this.mood = mood;
    if (ctx) this.start();
  },
  resume() { if (this.mood) this.start(); },
  start() {
    const list = TRACKS[this.mood];
    const name = this.mood === 'garage' ? list[this.nextGarage++ % list.length] : list[0];
    const old = this.el;
    const el = new Audio(file(name));
    el.loop = this.mood === 'race';
    el.crossOrigin = 'anonymous';
    const src = ctx.createMediaElementSource(el), g = ctx.createGain();
    g.gain.value = 0;
    src.connect(g).connect(musicBus);
    g.gain.setTargetAtTime(TRACK_GAIN[name] ?? 1, ctx.currentTime, 0.6);
    // the garage playlist moves on to the other track when one ends
    el.addEventListener('ended', () => { if (this.el === el) this.start(); });
    el.play().catch(() => {});
    this.el = el;
    if (old) {
      const og = old.gain;
      og?.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
      setTimeout(() => old.pause(), 1500);
    }
    el.gain = g;
  },
};
