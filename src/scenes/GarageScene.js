import { DPR, FONT } from '../config.js';
import { CarView, GARAGE, DECOR, SCENES, addTex, cover, drawLift, drawLights, drawNeon, drawPosters, drawShelf } from '../art.js';
import { MILESTONES, WRENCH } from '../data.js';
import { state, carLock, clickValue, grabWrench, tap, totalStars } from '../state.js';
import { bus } from '../events.js';
import { sfx } from '../audio.js';
import * as ui from '../ui.js';

export class GarageScene extends Phaser.Scene {
  constructor() { super('garage'); }

  create() {
    ui.showGarage();
    this.car = null;
    this.build();
    // fetch every car's scene in the background, so flipping cars never waits on one
    for (const id of Object.keys(SCENES)) this.sceneFor(id);
    this.scale.on('resize', this.build, this);
    const offs = [
      bus.on('focus', () => this.placeCar(true)),
      bus.on('change', what => {
        if (what === 'car') this.showCar();
        if (what === 'race') { this.buildDecor(); this.placeCar(false); }
      }),
      bus.on('upgraded', u => this.installFx(u)),
      bus.on('view', () => this.showCar()),
    ];
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.build, this);
      offs.forEach(off => off());
      this.wrench = null;
    });
    this.input.on('pointerdown', p => this.onPointer(p));
    this.wrench = null;
    this.scheduleWrench();
  }

  // The scene behind the car on show: its own themed scene once loaded, else the home garage.
  sceneFor(id) {
    const sc = SCENES[id];
    if (!sc) return GARAGE;
    const key = `scene-${id}`;
    if (this.textures.exists(key)) {
      if (sc.crop && !this.textures.get(key).has('crop')) this.textures.get(key).add('crop', 0, ...sc.crop);
      return { ...sc, key, frame: sc.crop ? 'crop' : undefined };
    }
    if (!this.loading?.has(key)) {
      (this.loading ??= new Set()).add(key);
      this.load.image(key, sc.file);
      this.load.once(`filecomplete-image-${key}`, () => {
        if (this.sys.isActive() && ui.shownCar() === id) this.build();
      });
      this.load.start();
    }
    return GARAGE;
  }

  build() {
    // the garage fills the screen beside the dock (above it on phones held upright)
    const area = ui.garageArea(), W = area.w * DPR, H = area.h * DPR;
    const sc = (this.sc = this.sceneFor(ui.shownCar()));
    this.bg?.destroy();
    this.sign?.destroy();
    this.sign = null;
    this.bg = this.add.image(0, 0, sc.key, sc.frame).setDepth(-10);
    const s = cover(this.bg, W, H);
    const fw = this.bg.frame.width, fh = this.bg.frame.height;
    const top = H / 2 - (fh * s) / 2;
    this.floorY = top + fh * s * sc.floor;
    this.groundY = top + fh * s * sc.ground;

    // the board is painted blank so its lettering stays crisp at any size
    const b = sc.sign;
    if (b) {
      this.sign = this.add.text(W / 2 + (b.x + b.w / 2 - fw / 2) * s, top + (b.y + b.h / 2) * s, b.lines.join('\n'), {
        fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic bold',
        fontSize: `${Math.round(b.h * s * 0.24)}px`, color: '#f1c45a', align: 'center', lineSpacing: -b.h * s * 0.04,
        shadow: { offsetX: 0, offsetY: 0, color: '#f1b434', blur: b.h * s * 0.08, fill: true },
      }).setOrigin(0.5).setDepth(-9);
    }
    this.bgLayout = { W, s, fw, top, ox: sc.crop?.[0] || 0, oy: sc.crop?.[1] || 0 };
    this.buildDecor();
    this.makeCar();
  }

  // Decor earned at star milestones (GDD §7.5), placed in background-image coordinates. Only
  // the home garage and the hometown scene have it; the car lift goes wherever there's decor.
  buildDecor() {
    this.decor?.forEach(o => { this.tweens.killTweensOf(o); o.destroy(); });
    this.decor = [];
    this.lift = null;
    const D = this.sc.decor;
    if (!D) return;
    const { W, s, fw, top, ox, oy } = this.bgLayout, stars = totalStars();
    const has = key => stars >= MILESTONES.find(m => m.key === key).stars;
    // a piece's box: its design size from DECOR, placed (and scaled by `k`) for this scene
    const box = key => ({ ...DECOR[key], ...D[key] });
    const put = (key, canvas, b) => {
      addTex(this, key, canvas);
      const im = this.add.image(W / 2 + (b.x - ox - fw / 2) * s, top + (b.y - oy) * s, key).setOrigin(0).setDepth(-8);
      this.decor.push(im);
      return im;
    };
    const k = key => s * (box(key).k || 1);
    if (has('posters')) put('decor-posters', drawPosters(k('posters'), box('posters')), box('posters'));
    if (has('shelf')) put('decor-shelf', drawShelf(k('shelf'), ['country_5', 'coast_5', 'city_5'].map(id => !!state.events[id]?.won), box('shelf')), box('shelf'));
    if (has('lights')) {
      put('decor-lights', drawLights(k('lights'), box('lights')), box('lights'));
      // the warmer light also brightens the whole room a touch
      const glow = this.add.rectangle(0, 0, W * 2, this.scale.height * 2, 0xffc27a, 0.07).setOrigin(0).setDepth(-7).setBlendMode(Phaser.BlendModes.ADD);
      this.decor.push(glow);
    }
    if (has('neon')) {
      const neon = put('decor-neon', drawNeon(k('neon'), box('neon')), box('neon'));
      if (!state.reducedMotion) this.tweens.add({ targets: neon, alpha: { from: 1, to: 0.82 }, duration: 90, yoyo: true, repeat: -1, repeatDelay: 2600 });
    }
    if (has('lift')) {
      if (!this.textures.exists('decor-lift')) addTex(this, 'decor-lift', drawLift());
      this.lift = this.add.image(0, 0, 'decor-lift').setOrigin(0.5, 1).setDepth(-1);
      this.decor.push(this.lift);
    }
  }

  // A different car may live in a different scene.
  showCar() {
    if (this.sceneFor(ui.shownCar()).key !== this.sc?.key) this.build();
    else this.makeCar();
  }

  makeCar() {
    this.car?.destroy();
    const id = ui.shownCar();
    this.car = new CarView(this, `garage-${id}`);
    // a car still locked behind an event shows as a dark silhouette
    if (carLock(id)) this.car.c.each(o => o.setTint?.(0x2e2f3a));
    this.placeCar(false);
  }

  placeCar(animate) {
    if (!this.car) return;
    const f = ui.garageFocus();
    // at most a little wider than the art itself, so the car stays sharp
    const w = Math.min(Math.min(f.w * (f.w < f.h ? 0.9 : 0.72), f.h * 1.4) * DPR, this.car.m.w * 1.3);
    const x = (f.x + f.w / 2) * DPR + w / 2;
    const y = Math.max(this.floorY + w * 0.2, Math.min(this.groundY, (f.y + f.h) * DPR - 4 * DPR));
    const scrollY = 0;
    const cam = this.cameras.main;
    // the lift frames the car: a post just past each bumper, a little taller than the roof
    const lift = { x: x - w / 2, y: y + w * 0.02, displayWidth: w * 1.16, displayHeight: w * 0.5 };
    this.tweens.killTweensOf([this.car.c, cam, ...(this.lift ? [this.lift] : [])]);
    if (!animate) {
      this.car.setWidth(w);
      this.car.c.setPosition(x, y).setScale(1);
      this.lift?.setPosition(lift.x, lift.y).setDisplaySize(lift.displayWidth, lift.displayHeight);
      cam.scrollY = scrollY;
      return;
    }
    if (this.lift) this.tweens.add({ targets: this.lift, ...lift, duration: 280, ease: 'Cubic.easeOut' });
    const size = { w: this.car.w };
    this.tweens.add({ targets: size, w, duration: 280, ease: 'Cubic.easeOut', onUpdate: () => this.car?.setWidth(size.w) });
    this.tweens.add({ targets: this.car.c, x, y, duration: 280, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: cam, scrollY, duration: 280, ease: 'Cubic.easeOut' });
  }

  // Only taps on the car earn cash (GDD §4.5); the Golden Wrench is checked first.
  onPointer(p) {
    const x = p.worldX, y = p.worldY;
    if (this.wrench && Phaser.Math.Distance.Between(x, y, this.wrench.x, this.wrench.y) < this.wrench.r * 1.4) return this.grabWrench();
    const c = this.car.c, w = this.car.w, h = (this.car.m.h * w) / this.car.m.w, pad = 12 * DPR;
    if (x < c.x - w - pad || x > c.x + pad || y < c.y - h - pad || y > c.y + pad) return;
    if (ui.shownCar() !== state.car) return; // a car on show for sale earns nothing
    this.tap(x, y);
  }

  popup(x, y, label, crit) {
    const text = this.add.text(x, y - 10 * DPR, label, {
      fontFamily: FONT, fontSize: `${Math.round((crit ? 40 : 26) * DPR)}px`, fontStyle: '900',
      color: crit ? '#ffcf3a' : '#ffe08a', stroke: crit ? '#7a1f10' : '#3a2410', strokeThickness: (crit ? 8 : 6) * DPR,
    }).setOrigin(0.5).setDepth(5);
    if (crit && !state.reducedMotion) this.tweens.add({ targets: text, scale: { from: 0.4, to: 1.15 }, duration: 160, yoyo: true, hold: 60 });
    this.tweens.add({ targets: text, y: text.y - (crit ? 100 : 70) * DPR, alpha: 0, delay: crit ? 250 : 0, duration: 750, ease: 'Cubic.easeOut', onComplete: () => text.destroy() });
  }

  tap(x, y) {
    const hit = tap();
    if (!hit) return;
    if (hit.crit) sfx.buy(); else sfx.tap();
    bus.emit('tap');
    this.popup(x, y, hit.crit ? `CRIT +${ui.fmt(hit.value)}` : `+${ui.fmt(hit.value)}`, hit.crit);

    for (let i = 0; i < (hit.crit ? 12 : 5); i++) {
      const coin = this.add.circle(x, y, (4 + Math.random() * 3) * DPR, 0xf1b434).setStrokeStyle(1.5 * DPR, 0xa86f12);
      const a = Math.random() * Math.PI * 2, d = (30 + Math.random() * 40) * DPR;
      this.tweens.add({
        targets: coin, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d - 20 * DPR, alpha: 0,
        duration: 500 + Math.random() * 200, ease: 'Cubic.easeOut', onComplete: () => coin.destroy(),
      });
    }

    if (state.reducedMotion) return;
    this.squash?.stop();
    this.car.c.setScale(1);
    this.squash = this.tweens.add({ targets: this.car.c, scaleY: 0.95, scaleX: 1.015, duration: 70, yoyo: true, ease: 'Quad.easeOut' });
  }

  // A bought upgrade: a wrench spins on the car, sparks fly and the gain floats up.
  installFx({ name, lvl, gain }) {
    if (!this.car) return;
    const c = this.car.c, w = this.car.w, h = (this.car.m.h * w) / this.car.m.w;
    const x = c.x - w / 2, y = c.y - h * 0.55;
    this.popup(x, y - h * 0.2, `${name} Lv ${lvl}${gain > 0 ? `  +${gain} PR` : ''}`, false);
    if (state.reducedMotion) return;
    const r = 30 * DPR, wrench = this.add.image(x, y, 'wrench').setDisplaySize(r * 2, r * 2).setDepth(6);
    this.tweens.add({ targets: wrench, angle: 360, scale: { from: wrench.scale * 0.4, to: wrench.scale * 1.2 }, alpha: { from: 1, to: 0 }, duration: 650, ease: 'Cubic.easeOut', onComplete: () => wrench.destroy() });
    for (let i = 0; i < 16; i++) {
      const spark = this.add.rectangle(x, y, 3 * DPR, (8 + Math.random() * 8) * DPR, i % 3 ? 0xffd75a : 0xffffff).setDepth(6).setBlendMode(Phaser.BlendModes.ADD);
      const a = Math.random() * Math.PI * 2, d = (50 + Math.random() * 70) * DPR;
      spark.rotation = a + Math.PI / 2;
      this.tweens.add({ targets: spark, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, duration: 400 + Math.random() * 250, ease: 'Cubic.easeOut', onComplete: () => spark.destroy() });
    }
    this.squash?.stop();
    c.setScale(1);
    this.squash = this.tweens.add({ targets: c, scaleY: 1.04, scaleX: 0.98, duration: 110, yoyo: true, repeat: 1, ease: 'Quad.easeOut' });
  }

  // ------------------------------------------------------------ Golden Wrench (GDD §9.3)

  scheduleWrench() {
    const [lo, hi] = WRENCH.every;
    this.wrenchTimer = this.time.delayedCall((lo + Math.random() * (hi - lo)) * 1000, () => this.spawnWrench());
  }

  spawnWrench() {
    const f = ui.garageFocus(), cam = this.cameras.main, r = 26 * DPR;
    const x = (f.x + f.w * (0.15 + Math.random() * 0.7)) * DPR;
    const y = cam.scrollY + (f.y + f.h * (0.12 + Math.random() * 0.35)) * DPR;
    const c = this.add.container(x, y).setDepth(6);
    c.add(this.add.circle(0, 0, r * 1.6, 0xffd75a, 0.25));
    c.add(this.add.image(0, 0, 'wrench').setDisplaySize(r * 2, r * 2));
    if (!state.reducedMotion) this.tweens.add({ targets: c, angle: { from: -12, to: 12 }, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: c, scale: { from: 0, to: 1 }, duration: 300, ease: 'Back.easeOut' });
    this.wrench = { c, x, y, r };
    this.time.delayedCall(WRENCH.lasts * 1000, () => { if (this.wrench?.c === c) this.dropWrench(); });
  }

  dropWrench() {
    const c = this.wrench.c;
    this.wrench = null;
    this.tweens.add({ targets: c, scale: 0, alpha: 0, duration: 250, onComplete: () => c.destroy() });
    this.scheduleWrench();
  }

  grabWrench() {
    const { x, y } = this.wrench, value = clickValue() * WRENCH.mult;
    grabWrench(value);
    sfx.win();
    this.popup(x, y, `GOLDEN WRENCH +${ui.fmt(value)}`, true);
    this.dropWrench();
  }
}
