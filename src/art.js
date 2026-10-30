// Art helpers: cutting car sprites out of their magenta backgrounds, mockup crops,
// and the remaining placeholder scenery drawn with Canvas 2D.

// Regions cut from the environment mockup sheet (assets/mockups/3.webp), in source pixels.
// The crops skip the sheet's labels and anything that would clash with in-game objects.
export const MOCKUP = {
  key: 'mock-env',
  file: 'assets/mockups/3.webp',
  frames: {
    countrySky: { x: 978, y: 60, w: 400, h: 232 },
    coastSky: { x: 192, y: 575, w: 398, h: 215 },
    citySky: { x: 985, y: 560, w: 430, h: 205 },
  },
};

// Garage background. Heights are fractions of the image; `sign` is the blank board in image pixels.
export const GARAGE = {
  key: 'bg-garage',
  file: 'assets/bg-garage.jpg',
  floor: 0.68,  // where the floor starts, under the open door
  ground: 0.84, // where the car's wheels touch the parking bay
  sign: { x: 264, y: 212, w: 156, h: 98, lines: ['Better', 'Faster', 'Higher'] },
};

// Themed scenes, one per car; a car without one is shown in GARAGE. Loaded on first view.
// `crop` [x, y, w, h] trims unwanted edges; `floor`/`ground` are as in GARAGE (fractions of
// the cropped height).
export const SCENES = {
  kaze: { file: 'assets/scene-kaze.jpg', floor: 0.555, ground: 0.86 },
  ronin: { file: 'assets/scene-ronin.jpg', crop: [0, 0, 1264, 712], floor: 0.57, ground: 0.9 }, // the bottom held a stray car hood
  hikari: { file: 'assets/scene-hikari.jpg', crop: [123, 0, 1034, 848], floor: 0.66, ground: 0.9 }, // without the dark side bars
  bulldog: { file: 'assets/scene-bulldog.jpg', crop: [62, 0, 1202, 848], floor: 0.5, ground: 0.86 }, // without the post on the left
  kodiak: { file: 'assets/scene-kodiak.jpg', crop: [0, 0, 1264, 738], floor: 0.68, ground: 0.92 }, // without the stray hood at the bottom
  valken: { file: 'assets/scene-valken.jpg', floor: 0.6, ground: 0.88 },
  sora: { file: 'assets/scene-sora.jpg', floor: 0.62, ground: 0.88 },
  furia: { file: 'assets/scene-furia.jpg', floor: 0.55, ground: 0.79 }, // in the spotlight, above the front step
  volta: { file: 'assets/scene-volta.jpg', floor: 0.68, ground: 0.84 },  // inside the glowing ring
  apex: { file: 'assets/scene-apex.jpg', floor: 0.68, ground: 0.84 },   // on the golden platform
};

// Scales an image to cover a W×H box, centered horizontally and anchored at `ay` (0 top, 1 bottom).
export function cover(image, W, H, ay = 0.5) {
  const s = Math.max(W / image.frame.width, H / image.frame.height);
  image.setOrigin(0.5, ay).setScale(s).setPosition(W / 2, H * ay);
  return s;
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function rrect(x, a, b, w, h, r) {
  x.beginPath();
  if (x.roundRect) x.roundRect(a, b, w, h, r);
  else x.rect(a, b, w, h);
  x.fill();
}

function circle(x, cx, cy, r) {
  x.beginPath();
  x.arc(cx, cy, r, 0, Math.PI * 2);
  x.fill();
}

export function addTex(scene, key, c) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, c);
  return key;
}

// ---------------------------------------------------------------- cars

const KEY_LO = 50;   // magenta-ness (min(r, b) - g) where a pixel starts fading out
const KEY_HI = 130;  // ... and where it is fully background
const WHEEL_WELL = '#1b1d22';

// Crops [x, y, w, h] out of a source image and removes its magenta background.
function keyOut(img, [cx, cy, cw, ch], flip = false) {
  const c = canvas(cw, ch), x = c.getContext('2d', { willReadFrequently: true });
  if (flip) x.setTransform(-1, 0, 0, 1, cw, 0);
  x.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);
  x.setTransform(1, 0, 0, 1, 0, 0);

  const px = x.getImageData(0, 0, cw, ch), d = px.data, n = cw * ch;
  const K = [243, 56, 243];
  const tOf = new Float32Array(n);
  for (let p = 0; p < n; p++) { const i = p * 4; tOf[p] = Math.min(1, Math.max(0, (Math.min(d[i], d[i + 2]) - d[i + 1] - KEY_LO) / (KEY_HI - KEY_LO))); }
  // Purple-tinted glass looks a bit like the background. Only pinkish pixels joined to real
  // background (fully magenta) are keyed out; tinted glass enclosed by the body is kept.
  const outside = new Uint8Array(n), stack = [];
  for (let p = 0; p < n; p++) if (tOf[p] === 1) { outside[p] = 1; stack.push(p); }
  while (stack.length) {
    const p = stack.pop(), px0 = p % cw;
    for (const q of [p - 1, p + 1, p - cw, p + cw]) {
      if (q < 0 || q >= n || outside[q] || !tOf[q] || (q === p - 1 && px0 === 0) || (q === p + 1 && px0 === cw - 1)) continue;
      outside[q] = 1;
      stack.push(q);
    }
  }
  for (let i = 0; i < d.length; i += 4) {
    const p = i / 4, t = tOf[p];
    if (t === 0) continue;
    if (!outside[p]) {
      // enclosed glass: a cool smoky grey instead of purple
      const v = (d[i] + d[i + 1] + d[i + 2]) / 3;
      d[i] = v * 0.88; d[i + 1] = v * 0.95; d[i + 2] = Math.min(255, v * 1.12);
      continue;
    }
    if (t === 1) { d[i + 3] = 0; continue; }
    // un-mix the background from edge pixels, then pull any remaining pink back to neutral
    for (let k = 0; k < 3; k++) d[i + k] = Math.min(255, Math.max(0, (d[i + k] - t * K[k]) / (1 - t)));
    const cap = d[i + 1] + 24;
    if (d[i] > cap) d[i] = cap;
    if (d[i + 2] > cap) d[i + 2] = cap;
    d[i + 3] = Math.round(255 * (1 - t));
  }
  x.putImageData(px, 0, 0);
  return c;
}

// Cuts any crop of a sheet out of its magenta background (tools/promo.html uses this too).
export const cutout = (img, crop) => keyOut(img, crop);

const MAX_CAR_W = 900; // side sprites are shrunk to this; the race never shows them larger

// Cuts a car out of its magenta background. `spec` comes from data.js: the crop box and
// wheel circles are in source-image pixels; `flip` mirrors cars that were drawn facing left.
// Garage poses have no wheel list: their wheels stay painted on and never spin.
const cutCache = new Map();
function cutCar(img, spec) {
  const id = `${spec.file}|${spec.crop}|${spec.flip}`;
  if (cutCache.has(id)) return cutCache.get(id);
  const [cx, cy, cw, ch] = spec.crop;
  let c = keyOut(img, spec.crop, spec.flip);
  const f = Math.min(1, MAX_CAR_W / cw);
  if (f < 1) {
    const small = canvas(cw * f, ch * f);
    small.getContext('2d').drawImage(c, 0, 0, small.width, small.height);
    c = small;
  }
  const x = c.getContext('2d');
  const wheels = (spec.wheels || []).map(([wx, wy, r]) => ({ x: (spec.flip ? cw - (wx - cx) : wx - cx) * f, y: (wy - cy) * f, r: r * f }));
  // gaps between rim spokes become a dark wheel well instead of see-through holes
  x.globalCompositeOperation = 'destination-over';
  x.fillStyle = WHEEL_WELL;
  for (const w of wheels) circle(x, w.x, w.y, w.r * 0.9);
  x.globalCompositeOperation = 'source-over';
  const cut = { canvas: c, wheels, ground: wheels.length ? Math.max(...wheels.map(w => w.y + w.r)) : c.height };
  cutCache.set(id, cut);
  return cut;
}

// Placeholder recolor: shifts hue and scales saturation and lightness of every pixel.
function recolor(src, [hue, sat, light]) {
  const c = canvas(src.width, src.height), x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(src, 0, 0);
  const px = x.getImageData(0, 0, c.width, c.height), d = px.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const dd = max - min;
      s = l > 0.5 ? dd / (2 - max - min) : dd / (max + min);
      h = max === r ? (g - b) / dd + (g < b ? 6 : 0) : max === g ? (b - r) / dd + 2 : (r - g) / dd + 4;
      h *= 60;
    }
    h = (h + hue + 360) % 360;
    s = Math.min(1, s * sat);
    l = Math.min(1, l * light);
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const ch = t => { t = (t + 360) % 360; return t < 60 ? p + ((q - p) * t) / 60 : t < 180 ? q : t < 240 ? p + ((q - p) * (240 - t)) / 60 : p; };
    d[i] = ch(h + 120) * 255;
    d[i + 1] = ch(h) * 255;
    d[i + 2] = ch(h - 120) * 255;
  }
  x.putImageData(px, 0, 0);
  return c;
}

// Each wheel is cut out on its own so it can spin on top of the body.
function cutWheel(body, w) {
  const s = Math.ceil(w.r * 2), wc = canvas(s, s), x = wc.getContext('2d');
  x.beginPath();
  x.arc(s / 2, s / 2, w.r, 0, Math.PI * 2);
  x.clip();
  x.drawImage(body, w.x - s / 2, w.y - s / 2, s, s, 0, 0, s, s);
  return wc;
}

const SPRITES = new Map();

// Car textures are cut on first use, so startup doesn't pay for all of them at once.
// `textures` is the game's texture manager; queued entries keep their source image.
const pending = new Map();
let textureOwner = null;
export function queueCar(textures, key, img, spec, tint) {
  textureOwner = { textures };
  pending.set(key, [img, spec, tint]);
}
export function ensureCar(key) {
  if (SPRITES.has(key) || !pending.has(key)) return;
  registerCar(textureOwner, key, ...pending.get(key));
  pending.delete(key);
}

export function registerCar(scene, key, img, spec, tint) {
  const base = cutCar(img, spec);
  const car = { ...base, canvas: tint ? recolor(base.canvas, tint) : base.canvas };
  car.wheels = base.wheels.map(w => ({ ...w, canvas: cutWheel(car.canvas, w) }));
  addTex(scene, key, car.canvas);
  SPRITES.set(key, {
    w: car.canvas.width,
    h: car.canvas.height,
    ground: car.ground,
    canvas: car.canvas,
    wheels: car.wheels.map((w, i) => ({ x: w.x, y: w.y, key: addTex(scene, `${key}-w${i}`, w.canvas) })),
  });
}

// ---------------------------------------------------------------- track props

// Pieces of the props sheet (assets/props.webp), all in source pixels.
// `lights` holds the painted lamp centers of the start tree; `panel`/`board` are blank areas for text.
export const PROPS = {
  key: 'props-sheet',
  file: 'assets/props.webp',
  crowd: { crop: [42, 93, 1453, 192], fence: 36 },
  barrier: { red: [423, 384, 342, 120], plain: [768, 384, 343, 120], blue: [1162, 398, 259, 63], panel: [41, 14, 260, 63] },
  tree: { crop: [182, 597, 113, 335], cols: [208, 268], rows: [648, 680, 712, 744, 775, 807, 839], r: 12 },
  finish: { crop: [523, 608, 482, 323], panel: [650, 632, 223, 90] },
  sign: { crop: [1210, 695, 168, 235], board: [1210, 711, 168, 79] },
};

// Cuts every prop and registers it as a texture. The barrier becomes one repeatable tile of
// four blocks (red, plain, blue, plain); the blue panel is copied in from the sheet's last block.
export function registerProps(scene, img) {
  const P = PROPS;
  addTex(scene, 'p-crowd', keyOut(img, P.crowd.crop));
  addTex(scene, 'p-tree', keyOut(img, P.tree.crop));
  addTex(scene, 'p-finish', keyOut(img, P.finish.crop));
  addTex(scene, 'p-sign', keyOut(img, P.sign.crop));

  const red = keyOut(img, P.barrier.red), plain = keyOut(img, P.barrier.plain);
  const blue = keyOut(img, P.barrier.red), [bx, by, bw, bh] = P.barrier.blue, [px, py, pw, ph] = P.barrier.panel;
  blue.getContext('2d').drawImage(img, bx, by, bw, bh, px, py, pw, ph);
  for (const [c, word] of [[red, 'RACEWAY'], [blue, 'SPEED']]) {
    const bx2 = c.getContext('2d');
    bx2.font = `italic 900 ${Math.round(ph * 0.6)}px "Segoe UI", sans-serif`;
    bx2.textAlign = 'center';
    bx2.textBaseline = 'middle';
    bx2.fillStyle = '#ffffff';
    bx2.fillText(word, px + pw / 2, py + ph / 2 + 2, pw * 0.9);
  }
  const tile = canvas(red.width * 2 + plain.width * 2, red.height), x = tile.getContext('2d');
  [red, plain, blue, plain].reduce((at, c) => (x.drawImage(c, at, 0), at + c.width), 0);
  addTex(scene, 'p-barrier', tile);
}

const previews = new Map();
export function carPreview(key) {
  ensureCar(key);
  if (!previews.has(key)) {
    const src = SPRITES.get(key).canvas, w = 360;
    const c = canvas(w, (src.height * w) / src.width);
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    previews.set(key, c.toDataURL());
  }
  return previews.get(key);
}

// The Golden Wrench bonus: a gold coin with a wrench on it.
export function drawWrench() {
  const S = 128, c = canvas(S, S), x = c.getContext('2d');
  const g = x.createRadialGradient(S * 0.4, S * 0.35, 4, S / 2, S / 2, S / 2);
  g.addColorStop(0, '#fff3b0'); g.addColorStop(0.6, '#f1b434'); g.addColorStop(1, '#a86f12');
  x.fillStyle = g;
  circle(x, S / 2, S / 2, S / 2 - 4);
  x.lineWidth = 5;
  x.strokeStyle = '#7a4d0c';
  x.stroke();
  x.setTransform(S / 24 * 0.62, 0, 0, S / 24 * 0.62, S * 0.19, S * 0.19);
  x.lineWidth = 2.4;
  x.lineJoin = x.lineCap = 'round';
  x.strokeStyle = '#5a3708';
  x.fillStyle = '#fff7d6';
  const p = new Path2D('M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z');
  x.fill(p);
  x.stroke(p);
  return c;
}

export function drawShadow() {
  const c = canvas(128, 32), x = c.getContext('2d');
  const g = x.createRadialGradient(64, 16, 2, 64, 16, 64);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.setTransform(1, 0, 0, 0.25, 0, 12);
  x.fillStyle = g;
  x.fillRect(0, -48, 128, 128);
  return c;
}

// A car made of a body sprite plus two spinning wheels. Origin: front bumper at ground level.
export class CarView {
  constructor(scene, key, parent) {
    ensureCar(key);
    this.m = SPRITES.get(key);
    this.c = scene.add.container(0, 0);
    this.shadow = scene.add.image(0, 0, 'shadow');
    this.body = scene.add.image(0, 0, key).setOrigin(1, this.m.ground / this.m.h);
    this.wheels = this.m.wheels.map(w => scene.add.image(0, 0, w.key));
    this.c.add([this.shadow, this.body, ...this.wheels]);
    parent?.add(this.c);
    this.w = 0;
  }

  setWidth(w) {
    const m = this.m, s = w / m.w;
    this.w = w;
    this.body.setScale(s);
    this.wheels.forEach((wh, i) => wh.setScale(s).setPosition((m.wheels[i].x - m.w) * s, (m.wheels[i].y - m.ground) * s));
    this.shadow.setDisplaySize(w * 1.08, w * 0.09).setPosition(-w / 2, -w * 0.005);
  }

  spin(rad) {
    for (const wh of this.wheels) wh.rotation += rad;
  }

  destroy() {
    this.c.destroy();
  }
}

// ---------------------------------------------------------------- rival portraits

// Rival portraits, painted on assets/portraits.jpg; each rival's crop is `portrait` in data.js.
export const PORTRAITS = { key: 'portraits', file: 'assets/portraits.jpg' };
let portraitSheet = null;
const portraitCache = new Map();
export const registerPortraits = img => { portraitSheet = img; };
export function portraitURL(crop) {
  if (!portraitSheet || !crop) return null;
  const id = crop.join(',');
  if (!portraitCache.has(id)) portraitCache.set(id, cutout(portraitSheet, crop).toDataURL());
  return portraitCache.get(id);
}

// ---------------------------------------------------------------- scenery

// Grass verge and asphalt below the horizon. `o` holds y offsets measured from the horizon.
export function drawGround(W, h, o, env) {
  const c = canvas(W, h), x = c.getContext('2d');
  let g = x.createLinearGradient(0, 0, 0, o.track);
  g.addColorStop(0, env.verge[0]); g.addColorStop(1, env.verge[1]);
  x.fillStyle = g;
  x.fillRect(0, 0, W, o.track);
  x.fillStyle = 'rgba(255,255,255,0.05)';
  for (let y = 0, i = 0; y < o.track; y += o.track / 6, i++) if (i % 2) x.fillRect(0, y, W, o.track / 6);
  g = x.createLinearGradient(0, o.track, 0, h);
  g.addColorStop(0, env.asphalt[0]); g.addColorStop(1, env.asphalt[1]);
  x.fillStyle = g;
  x.fillRect(0, o.track, W, h - o.track);
  const band = (o.laneP - o.track) * 0.14;
  x.fillStyle = 'rgba(0,0,0,0.2)';
  x.fillRect(0, o.laneO - band * 0.7, W, band);
  x.fillRect(0, o.laneP - band * 0.7, W, band);
  x.fillStyle = 'rgba(255,255,255,0.75)';
  x.fillRect(0, o.track, W, Math.max(2, h * 0.006));
  return c;
}

export function drawDashes(ppm, h) {
  const P = Math.round(ppm * 12);
  const c = canvas(P, h), x = c.getContext('2d');
  x.fillStyle = 'rgba(255,255,255,0.8)';
  rrect(x, 0, 0, ppm * 5, h, h / 2);
  return c;
}

export function drawChecker(cols, rows, s) {
  const c = canvas(cols * s, rows * s), x = c.getContext('2d');
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      x.fillStyle = (r + k) % 2 ? '#1a1a1a' : '#f4f1ea';
      x.fillRect(k * s, r * s, s, s);
    }
  }
  return c;
}

export function drawMarks(len, h) {
  const c = canvas(len, h), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, len, 0);
  g.addColorStop(0, 'rgba(10,8,12,0.55)'); g.addColorStop(1, 'rgba(10,8,12,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, len, h);
  return c;
}
