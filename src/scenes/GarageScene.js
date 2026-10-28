import { DPR, FONT } from '../config.js';
import { CarView, GARAGE, DECOR, addTex, cover, drawLift, drawLights, drawNeon, drawPosters, drawShelf } from '../art.js';
import { MILESTONES, WRENCH } from '../data.js';
import { state, clickValue, grabWrench, tap, totalStars } from '../state.js';
import { bus } from '../events.js';
import { sfx } from '../audio.js';
import * as ui from '../ui.js';

export class GarageScene extends Phaser.Scene {
  constructor() { super('garage'); }

  create() {
    ui.showGarage();
    this.car = null;
    this.build();
    this.scale.on('resize', this.build, this);
    const offs = [
      bus.on('focus', () => this.placeCar(true)),
      bus.on('change', what => {
        if (what === 'car') this.makeCar();
        if (what === 'race') { this.buildDecor(); this.placeCar(false); }
      }),
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

  build() {
    const W = this.scale.width, H = this.scale.height;
    this.bg?.destroy();
    this.sign?.destroy();
    this.bg = this.add.image(0, 0, GARAGE.key).setDepth(-10);
    const s = cover(this.bg, W, H);
    const fw = this.bg.frame.width, fh = this.bg.frame.height;
    const top = H / 2 - (fh * s) / 2;
    this.floorY = top + fh * s * GARAGE.floor;
    this.groundY = top + fh * s * GARAGE.ground;

    // the board is painted blank so its lettering stays crisp at any size
    const b = GARAGE.sign;
    this.sign = this.add.text(W / 2 + (b.x + b.w / 2 - fw / 2) * s, top + (b.y + b.h / 2) * s, b.lines.join('\n'), {
      fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic bold',
      fontSize: `${Math.round(b.h * s * 0.24)}px`, color: '#f1c45a', align: 'center', lineSpacing: -b.h * s * 0.04,
      shadow: { offsetX: 0, offsetY: 0, color: '#f1b434', blur: b.h * s * 0.08, fill: true },
    }).setOrigin(0.5).setDepth(-9);
    this.bgLayout = { W, s, fw, top };
    this.buildDecor();
    this.makeCar();
  }

  // Decor earned at star milestones (GDD §7.5), placed in background-image coordinates.
  buildDecor() {
    this.decor?.forEach(o => { this.tweens.killTweensOf(o); o.destroy(); });
    this.decor = [];
    this.lift = null;
    const { W, s, fw, top } = this.bgLayout, stars = totalStars();
    const has = key => stars >= MILESTONES.find(m => m.key === key).stars;
    const put = (key, canvas, box) => {
      addTex(this, key, canvas);
      const im = this.add.image(W / 2 + (box.x - fw / 2) * s, top + box.y * s, key).setOrigin(0).setDepth(-8);
      this.decor.push(im);
      return im;
    };
    if (has('posters')) put('decor-posters', drawPosters(s), DECOR.posters);
    if (has('shelf')) put('decor-shelf', drawShelf(s, ['country_5', 'coast_5', 'city_5'].map(id => !!state.events[id]?.won)), DECOR.shelf);
    if (has('lights')) {
      put('decor-lights', drawLights(s), DECOR.lights);
      // the warmer light also brightens the whole room a touch
      const glow = this.add.rectangle(0, 0, W * 2, this.scale.height * 2, 0xffc27a, 0.07).setOrigin(0).setDepth(-7).setBlendMode(Phaser.BlendModes.ADD);
      this.decor.push(glow);
    }
    if (has('neon')) {
      const neon = put('decor-neon', drawNeon(s), DECOR.neon);
      if (!state.reducedMotion) this.tweens.add({ targets: neon, alpha: { from: 1, to: 0.82 }, duration: 90, yoyo: true, repeat: -1, repeatDelay: 2600 });
    }
    if (has('lift')) {
      if (!this.textures.exists('decor-lift')) addTex(this, 'decor-lift', drawLift());
      this.lift = this.add.image(0, 0, 'decor-lift').setOrigin(0.5, 1).setDepth(-1);
      this.decor.push(this.lift);
    }
  }

  makeCar() {
    this.car?.destroy();
    this.car = new CarView(this, `garage-${state.car}`);
    this.placeCar(false);
  }

  placeCar(animate) {
    if (!this.car) return;
    // A bottom sheet doesn't shrink the car; the camera scrolls up to keep it in view instead.
    const f = ui.garageFocus(true);
    const visible = ui.garageFocus();
    // never wider than the art itself, so the car stays sharp
    const w = Math.min(Math.min(f.w * (f.w < f.h ? 0.86 : 0.6), f.h * 1.4) * DPR, this.car.m.w);
    const x = (f.x + f.w / 2) * DPR + w / 2;
    const y = Math.max(this.floorY + w * 0.2, Math.min(this.groundY, (f.y + f.h) * DPR - 4 * DPR));
    const scrollY = Math.max(0, y + 16 * DPR - (visible.y + visible.h) * DPR);
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
