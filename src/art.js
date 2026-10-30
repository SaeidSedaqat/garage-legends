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
  decor: null, // set below: DECOR, placed for this background
};

// Themed scenes, one per car; a car without one is shown in GARAGE. Loaded on first view.
// `crop` [x, y, w, h] trims unwanted edges; `floor`/`ground` are as in GARAGE (fractions of
// the cropped height). `decor` places the star-milestone decor in scene pixels, `k` scaling
// each piece; the hometown garage (the starter car's scene) keeps it.
export const SCENES = {
  kaze: {
    file: 'assets/scene-kaze.jpg', floor: 0.555, ground: 0.86,
    decor: {
      lights: { x: 385, y: 120, w: 505, h: 46, hooks: [390, 515, 640, 765, 885], sag: 14 },
      neon: { x: 395, y: 203, k: 0.55 },
      posters: { x: 398, y: 252, k: 0.8 },
      shelf: { x: 528, y: 290, k: 0.8 },
    },
  },
  ronin: { file: 'assets/scene-ronin.jpg', crop: [0, 0, 1264, 712], floor: 0.57, ground: 0.9 }, // the bottom held a stray car hood
  hikari: { file: 'assets/scene-hikari.jpg', crop: [123, 0, 1034, 848], floor: 0.66, ground: 0.9 }, // without the dark side bars
  bulldog: { file: 'assets/scene-bulldog.jpg', crop: [62, 0, 1202, 848], floor: 0.5, ground: 0.86 }, // without the post on the left
  kodiak: { file: 'assets/scene-kodiak.jpg', crop: [0, 0, 1264, 738], floor: 0.68, ground: 0.92 }, // without the stray hood at the bottom
  valken: { file: 'assets/scene-valken.jpg', floor: 0.6, ground: 0.88 },
  sora: { file: 'assets/scene-sora.jpg', floor: 0.62, ground: 0.88 },
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

// ---------------------------------------------------------------- garage decor (star milestones)

// Where each piece sits on the garage background, in its source pixels. Every piece is drawn
// at the background's on-screen scale `s`, so it stays sharp at any window size.
export const DECOR = {
  posters: { x: 988, y: 122, w: 156, h: 112 },  // wall right of the door
  shelf: { x: 988, y: 232, w: 156, h: 72 },     // below the posters, above the light switch
  lights: { x: 226, y: 90, w: 936, h: 52, hooks: [236, 466, 696, 926, 1152], sag: 18 },
  neon: { x: 500, y: 112, w: 420, h: 72 },      // on the roll-up door housing
};
GARAGE.decor = DECOR;

function scaled(box, s) {
  const c = canvas(box.w * s, box.h * s), x = c.getContext('2d');
  x.scale(s, s);
  return [c, x];
}

// A paper poster pinned to the wall, rotated a little; `paint` draws its face in local coordinates.
function poster(x, cx, cy, w, h, angle, paint) {
  x.save();
  x.translate(cx, cy);
  x.rotate(angle);
  x.fillStyle = 'rgba(0,0,0,0.35)';
  x.fillRect(-w / 2 + 2, -h / 2 + 3, w, h);
  x.beginPath();
  x.rect(-w / 2, -h / 2, w, h);
  x.clip();
  paint(-w / 2, -h / 2, w, h);
  x.restore();
  x.fillStyle = '#c9c2b4';
  circle(x, cx, cy - h / 2 + 4, 2.2);
}

export function drawPosters(s, D = DECOR.posters) {
  const [c, x] = scaled(D, s);
  poster(x, 40, 56, 66, 96, -0.05, (l, t, w, h) => {
    const g = x.createLinearGradient(0, t, 0, t + h);
    g.addColorStop(0, '#2a1d4a'); g.addColorStop(0.55, '#d4604a'); g.addColorStop(1, '#f3b562');
    x.fillStyle = g;
    x.fillRect(l, t, w, h);
    x.fillStyle = '#ffe3a1';
    circle(x, l + w * 0.68, t + h * 0.5, 9);
    x.fillStyle = '#1b1430'; // a low coupe silhouette on the horizon
    x.beginPath();
    x.moveTo(l + 6, t + h * 0.8);
    x.lineTo(l + 12, t + h * 0.7);
    x.quadraticCurveTo(l + 26, t + h * 0.6, l + 40, t + h * 0.66);
    x.lineTo(l + w - 6, t + h * 0.72);
    x.lineTo(l + w - 6, t + h * 0.8);
    x.fill();
    x.fillRect(l, t + h * 0.8, w, h * 0.2);
    x.fillStyle = '#fff4dc';
    x.font = 'italic 900 13px "Segoe UI", sans-serif';
    x.textAlign = 'center';
    x.fillText('LEGENDS', 0, t + 18, w - 6);
    x.font = '700 6px "Segoe UI", sans-serif';
    x.fillText('OF THE STRIP', 0, t + 26);
  });
  poster(x, 114, 60, 62, 86, 0.04, (l, t, w, h) => {
    x.fillStyle = '#16324f';
    x.fillRect(l, t, w, h);
    const sq = w / 8;
    for (let r = 0; r < 2; r++) for (let k = 0; k < 8; k++) {
      x.fillStyle = (r + k) % 2 ? '#f4f1ea' : '#111';
      x.fillRect(l + k * sq, t + r * sq, sq, sq);
    }
    x.fillStyle = '#f1b434';
    x.textAlign = 'center';
    x.font = 'italic 900 15px "Segoe UI", sans-serif';
    x.fillText('DRAG', 0, t + 36, w - 6);
    x.fillText('NIGHT', 0, t + 52, w - 6);
    x.fillStyle = '#e0483a';
    x.fillRect(l + 8, t + 60, w - 16, 2);
    x.fillStyle = '#cfe3f5';
    x.font = '800 7px "Segoe UI", sans-serif';
    x.fillText('1/4 MILE · SAT 9PM', 0, t + 74, w - 6);
  });
  return c;
}

// A trophy cup standing on `y`; `metal` is [highlight, body, shadow].
function cup(x, cx, y, h, metal) {
  const w = h * 0.62;
  const g = x.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
  g.addColorStop(0, metal[2]); g.addColorStop(0.35, metal[0]); g.addColorStop(1, metal[1]);
  x.fillStyle = '#3a2a1e';
  x.fillRect(cx - w * 0.42, y - h * 0.16, w * 0.84, h * 0.16); // wooden base
  x.fillStyle = g;
  x.fillRect(cx - w * 0.08, y - h * 0.36, w * 0.16, h * 0.2);  // stem
  x.fillRect(cx - w * 0.28, y - h * 0.4, w * 0.56, h * 0.05);
  x.beginPath();                                               // bowl
  x.moveTo(cx - w / 2, y - h);
  x.lineTo(cx + w / 2, y - h);
  x.quadraticCurveTo(cx + w * 0.46, y - h * 0.42, cx, y - h * 0.4);
  x.quadraticCurveTo(cx - w * 0.46, y - h * 0.42, cx - w / 2, y - h);
  x.fill();
  x.strokeStyle = metal[1];
  x.lineWidth = h * 0.05;
  for (const sd of [-1, 1]) {                                  // handles
    x.beginPath();
    x.arc(cx + sd * w * 0.5, y - h * 0.82, h * 0.12, sd < 0 ? Math.PI * 0.5 : -Math.PI * 0.5, sd < 0 ? Math.PI * 1.5 : Math.PI * 0.5, sd > 0);
    x.stroke();
  }
}

const GOLD = ['#fff1b0', '#e0a526', '#8a5d0c'], SILVER = ['#ffffff', '#b8c2cc', '#5f6b78'], BRONZE = ['#ffd2a8', '#c27a3e', '#6b3a14'];

// The shelf holds a cup per venue champion won (bronze, silver, gold) and a plaque for the first win.
export function drawShelf(s, champions, D = DECOR.shelf) {
  const [c, x] = scaled(D, s), y = D.h - 14;
  x.fillStyle = 'rgba(0,0,0,0.3)';
  x.fillRect(6, y + 6, D.w - 12, 4);
  x.fillStyle = '#7a4f2e';
  x.fillRect(4, y, D.w - 8, 7);
  x.fillStyle = '#9b6a40';
  x.fillRect(4, y, D.w - 8, 2);
  x.fillStyle = '#3a2a1e';
  for (const bx of [18, D.w - 24]) x.fillRect(bx, y + 7, 6, 7);
  // first-win plaque
  x.fillStyle = '#5a3a22';
  rrect(x, 12, y - 26, 30, 24, 3);
  x.fillStyle = '#e0a526';
  rrect(x, 16, y - 22, 22, 12, 2);
  x.fillStyle = '#5a3a22';
  x.font = '900 5px "Segoe UI", sans-serif';
  x.textAlign = 'center';
  x.fillText('1ST WIN', 27, y - 14, 20);
  const cups = [[BRONZE, 32], [SILVER, 40], [GOLD, 48]];
  champions.forEach((won, i) => { if (won) cup(x, 66 + i * 30, y, cups[i][1], cups[i][0]); });
  return c;
}

// Warm bulbs on a sagging wire along the ceiling beam.
export function drawLights(s, D = DECOR.lights) {
  const [c, x] = scaled(D, s), top = 8;
  const pts = [];
  for (let i = 0; i < D.hooks.length - 1; i++) {
    const x0 = D.hooks[i] - D.x, x1 = D.hooks[i + 1] - D.x, n = Math.round((x1 - x0) / 26);
    for (let k = i ? 1 : 0; k <= n; k++) { // a shared hook point is added once
      const t = k / n;
      pts.push([x0 + (x1 - x0) * t, top + 4 * D.sag * t * (1 - t)]);
    }
  }
  x.strokeStyle = '#1c1712';
  x.lineWidth = 1.4;
  x.beginPath();
  pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)));
  x.stroke();
  pts.forEach(([px, py]) => {
    const g = x.createRadialGradient(px, py + 9, 0, px, py + 9, 14);
    g.addColorStop(0, 'rgba(255,214,140,0.55)');
    g.addColorStop(1, 'rgba(255,190,100,0)');
    x.fillStyle = g;
    circle(x, px, py + 9, 14);
    x.fillStyle = '#2a2420';
    x.fillRect(px - 2, py, 4, 4);
    x.fillStyle = '#ffe3a8';
    x.beginPath();
    x.ellipse(px, py + 8.5, 3.4, 4.6, 0, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#fffbe8';
    circle(x, px - 0.8, py + 7.5, 1.4);
  });
  return c;
}

// The pink neon sign; it gets a slow flicker in the scene.
export function drawNeon(s, D = DECOR.neon) {
  const [c, x] = scaled(D, s);
  x.fillStyle = 'rgba(20,10,30,0.72)';
  rrect(x, 8, 6, D.w - 16, D.h - 12, 10);
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.font = `italic 900 ${D.h * 0.56}px "Segoe UI", sans-serif`;
  x.lineJoin = 'round';
  const tube = (color, width, blur) => {
    x.shadowColor = color;
    x.shadowBlur = blur * s;
    x.strokeStyle = color;
    x.lineWidth = width;
    x.strokeText('LEGEND', D.w / 2, D.h / 2 + 2);
  };
  tube('#ff3fd2', 5, 18);
  tube('#ff8ae6', 2.6, 8);
  tube('#fff0fb', 1, 2);
  x.shadowBlur = 0;
  x.strokeStyle = '#38e1ff';
  x.shadowColor = '#38e1ff';
  x.shadowBlur = 10 * s;
  x.lineWidth = 2;
  x.beginPath();
  if (x.roundRect) x.roundRect(14, 11, D.w - 28, D.h - 22, 8); else x.rect(14, 11, D.w - 28, D.h - 22);
  x.stroke();
  return c;
}

// A two-post car lift drawn at a fixed size; the scene scales it to the car.
export function drawLift() {
  const W = 600, H = 260, c = canvas(W, H), x = c.getContext('2d'), pw = 26;
  for (const px of [6, W - pw - 6]) {
    const g = x.createLinearGradient(px, 0, px + pw, 0);
    g.addColorStop(0, '#b8860b'); g.addColorStop(0.4, '#f1c232'); g.addColorStop(1, '#a87a10');
    x.fillStyle = g;
    x.fillRect(px, 0, pw, H);
    x.fillStyle = '#8a6a10';
    x.fillRect(px - 3, 0, pw + 6, 8); // cap
    x.fillStyle = '#6b4f0a';
    for (let y = 40; y < H - 40; y += 22) x.fillRect(px + pw / 2 - 3, y, 6, 10); // lock slots
    x.fillStyle = '#f1c232';                                                      // hazard-striped base
    x.fillRect(px - 6, H - 26, pw + 12, 26);
    x.save();
    x.beginPath();
    x.rect(px - 6, H - 26, pw + 12, 26);
    x.clip();
    x.fillStyle = '#1a1a1a';
    for (let k = -2; k < 6; k++) {
      x.beginPath();
      x.moveTo(px - 6 + k * 14, H);
      x.lineTo(px + 4 + k * 14, H - 26);
      x.lineTo(px + 11 + k * 14, H - 26);
      x.lineTo(px + 1 + k * 14, H);
      x.fill();
    }
    x.restore();
  }
  x.fillStyle = '#3d3d42'; // lift arms, low and tucked under the car
  x.fillRect(pw + 6, H - 46, 70, 9);
  x.fillRect(W - pw - 76, H - 46, 70, 9);
  return c;
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
