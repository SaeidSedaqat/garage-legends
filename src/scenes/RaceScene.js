import { DPR, FONT } from '../config.js';
import { DIST, ENVS, OPPONENTS, SIM } from '../data.js';
import { state, carDef, eventDef, tunedSpec, opponentSpec, recordRace } from '../state.js';
import {
  makeRacer, step, launch, scriptedLaunch, shift, topGear, zones, plannedShift, shiftReady, aiInputs, rng, hash,
  nitro, nitroReady,
} from '../physics.js';
import { CarView, MOCKUP, PROPS, cover, addTex, drawGround, drawDashes, drawChecker, drawMarks } from '../art.js';
import { sfx, engine, music } from '../audio.js';
import { platform } from '../platform.js';
import * as ui from '../ui.js';

const KEYS = new Set(['Space', 'ArrowUp', 'ArrowRight', 'Enter', 'KeyW']);
const LIGHT = { pre: 0xfff3c4, stage: 0xfff3c4, amber: 0xffb52e, green: 0x4dff7a, red: 0xff3b30 };
const STAGE_AT = { pre: 0.3, stage: 0.8 };
const IDLE_RPM = 0.12;
const LAUNCH_TEXT = { perfect: 'PERFECT LAUNCH!', good: 'GOOD LAUNCH', slow: 'SLOW START', late: 'LATE START', jump: 'JUMP START' };
const LAUNCH_KIND = { perfect: 'perfect', good: 'good', slow: 'early', late: 'early', jump: 'foul' };
const SHIFT_TEXT = { perfect: 'PERFECT SHIFT!', good: 'GOOD SHIFT', early: 'EARLY SHIFT', late: 'LATE SHIFT' };
const NITRO_TEXT = { boost: ['NITRO!', 'good'], chain: ['CHAIN!', 'perfect'], early: ['WASTED', 'foul'] };

export class RaceScene extends Phaser.Scene {
  constructor() { super('race'); }

  init(data) {
    this.event = eventDef(data.eventId);
    this.env = ENVS.find(v => v.id === this.event.env);
    this.D = DIST[this.event.dist].m;
    this.pSpec = tunedSpec();
    this.oSpec = opponentSpec(this.event);
    this.p = makeRacer(this.pSpec, this.D);
    this.o = makeRacer(this.oSpec, this.D);

    // every attempt is seeded, so a retry plays differently but any run can be replayed (GDD §6.6)
    const rand = rng(hash(`${this.event.id}#${state.stats.races}`));
    this.ai = aiInputs(OPPONENTS[this.event.opp].ai, rand);
    this.o.a0 *= this.ai.form;
    this.oppPlan = plannedShift(this.oSpec, this.ai.shiftQ(0));
    // the very first race is a driving lesson (so is Practice from the Race menu), with a
    // longer lead-in so there's time to read
    this.practice = !!data.practice;
    this.guide = this.practice || !state.tutorial.raced;
    this.freeze = false; // the lesson stops the race: 'button', or until a press ('down') or release ('up')
    this.slow = 1;       // the lesson's slow motion
    this.step = this.guide ? 'intro' : null;
    if (this.guide) this.freeze = 'button';
    // countdown: three ambers with ±150 ms jitter so the rhythm can't be memorised (GDD §6.3)
    this.ambers = [];
    let t = (this.guide ? 3 : 1.3) + rand() * 0.3;
    for (let i = 0; i < 3; i++) { this.ambers.push(t); t += 0.5 + (rand() - 0.5) * 0.3; }
    this.greenAt = t;

    this.t = 0;
    this.phase = 'countdown'; // countdown → racing → done
    this.green = false;
    this.holding = false;
    this.jumpAt = null;
    this.beeps = -1;
    this.doneT = 0;
    this.paused = false;
    this.cam = 0;
    this.maxBehind = 0;
    this.lastPress = -1;
    this.pitch = 0;
    this.smoke = [];
  }

  create() {
    ui.showRace(this.event, this.pSpec, this.oSpec, {
      down: () => this.down(), up: () => this.up(), pause: () => this.setPaused(true),
    }, this.practice);
    this.build();
    this.scale.on('resize', this.build, this);
    this.input.on('pointerdown', () => this.down());
    this.input.on('pointerup', () => this.up());
    const kb = this.input.keyboard;
    kb?.on('keydown', e => {
      if (e.repeat) return;
      if (KEYS.has(e.code)) this.down();
      else if (e.code === 'Escape' || e.code === 'KeyP') this.setPaused(!this.paused);
      else if (e.code === 'KeyR' && this.paused) this.restart();
    });
    kb?.on('keyup', e => { if (KEYS.has(e.code)) this.up(); });
    const onHide = () => { if (document.hidden) this.setPaused(true); };
    document.addEventListener('visibilitychange', onHide);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.build, this);
      document.removeEventListener('visibilitychange', onHide);
      engine.stop();
      ui.coachOff();
    });
    engine.start();
    music.play('race');
    platform.gameplayStart();
  }

  // ------------------------------------------------------------ layout

  build() {
    this.root?.destroy();
    const W = this.scale.width, H = this.scale.height, portrait = H > W * 1.05;
    const topH = ui.raceTopInset() * DPR, hudH = ui.raceHudHeight() * DPR;
    const viewH = Math.max(160 * DPR, H - topH - hudH);
    const L = (this.L = { W, H, portrait });
    L.horizon = topH + viewH * 0.34;
    L.trackTop = topH + viewH * 0.5;
    L.trackBot = topH + viewH;
    const th = L.trackBot - L.trackTop;
    L.laneO = L.trackTop + th * 0.36;
    L.laneP = L.trackTop + th * 0.95;
    L.carW = Math.min(portrait ? W * 0.47 : W * 0.2, th * 1.15);
    L.ppm = L.carW / 4.3;
    L.px = W * (portrait ? 0.66 : 0.45);
    const D = this.D, env = this.env, night = env.id === 'city' ? 0xa99fd0 : 0xffffff;

    const root = (this.root = this.add.container(0, 0));
    const image = (key, c, x, y, ox = 0, oy = 0) => {
      addTex(this, key, c);
      const im = this.add.image(x, y, key).setOrigin(ox, oy);
      root.add(im);
      return im;
    };
    // A strip repeated along the track. `mirror` flips every other copy so the ends always match.
    this.layers = [];
    const layer = (key, y, factor, scale = 1, mirror = false) => {
      const P = this.textures.get(key).getSourceImage().width * scale, imgs = [];
      for (let i = 0; i < Math.ceil(W / P) + 2; i++) {
        const im = this.add.image(i * P, y, key).setOrigin(0, 1).setScale(scale).setFlipX(mirror && i % 2 === 1).setTint(night);
        root.add(im);
        imgs.push(im);
      }
      this.layers.push({ imgs, P, factor, period: mirror ? P * 2 : P });
    };
    this.world = [];
    const put = (obj, wx) => { root.add(obj); this.world.push({ obj, wx }); return obj; };

    // painted sky from the mockup sheet, bottom edge sitting on the horizon
    const sky = this.add.image(0, 0, MOCKUP.key, env.sky);
    cover(sky, W, L.horizon, 1);
    root.add(sky);
    image('r-ground', drawGround(W, H - L.horizon, {
      track: L.trackTop - L.horizon, laneO: L.laneO - L.horizon, laneP: L.laneP - L.horizon,
    }, env), 0, L.horizon);
    // spectators behind the concrete wall: blocks 0.85 m tall, people cut off at the fence
    const wallBase = L.trackTop + 2 * DPR, wallScale = (0.85 * L.ppm) / PROPS.barrier.red[3];
    const crowdScale = (1.6 * L.ppm) / PROPS.crowd.crop[3];
    const wallTop = wallBase - PROPS.barrier.red[3] * wallScale;
    layer('p-crowd', wallTop + PROPS.crowd.fence * crowdScale * 0.6, 1, crowdScale, true);
    layer('p-barrier', wallBase, 1, wallScale);
    const dashH = Math.max(2 * DPR, th * 0.025);
    addTex(this, 'r-dash', drawDashes(L.ppm, dashH));
    layer('r-dash', L.trackTop + th * 0.62 + dashH / 2, 1);

    // rubber marks, start and finish lines
    addTex(this, 'r-marks', drawMarks(L.ppm * 40, th * 0.07));
    put(this.add.image(0, L.laneP, 'r-marks').setOrigin(0, 1), -4);
    put(this.add.image(0, L.laneO, 'r-marks').setOrigin(0, 1).setScale(0.92), -4);
    const cs = L.ppm * 0.5;
    addTex(this, 'r-check', drawChecker(2, Math.ceil((H - L.trackTop) / cs), cs));
    put(this.add.image(0, L.trackTop, 'r-check').setOrigin(1, 0), 0);
    put(this.add.image(0, L.trackTop, 'r-check').setOrigin(0, 0), D);
    put(this.prop('p-finish', PROPS.finish, (1.35 * L.carW) / PROPS.finish.crop[2], 'FINISH', '#ffffff', 0.55), D)
      .y = wallBase;
    for (let d = 100; d < D - 40; d += 100) {
      put(this.prop('p-sign', { crop: PROPS.sign.crop, panel: PROPS.sign.board }, (1.7 * L.ppm) / PROPS.sign.crop[2], `${d} m`, '#1c2738', 0.5), d)
        .y = wallBase;
    }

    // the start lights must stay on screen, even when a narrow phone shows little track ahead
    const treeScale = (3.4 * L.ppm) / PROPS.tree.crop[3], treeW = PROPS.tree.crop[2] * treeScale;
    put(this.buildTree(treeScale), Math.min(7, (W - treeW * 0.7 - L.px) / L.ppm)).y = L.trackTop + th * 0.12;

    this.oCar = new CarView(this, `opp-${this.event.opp}`, root);
    this.oCar.setWidth(L.carW * 0.92);
    this.smokeLayer = this.add.container(0, 0);
    root.add(this.smokeLayer);
    this.smoke = [];
    this.pCar = new CarView(this, `car-${state.car}`, root);
    this.pCar.setWidth(L.carW);

    this.render(0);
  }

  // A prop standing on the ground (origin: bottom center) with text on its blank panel.
  prop(key, spec, scale, label, color, size) {
    const [cx, cy, cw, ch] = spec.crop, [px, py, pw, ph] = spec.panel;
    const c = this.add.container(0, 0);
    c.add(this.add.image(0, 0, key).setOrigin(0.5, 1).setScale(scale));
    c.add(this.add.text((px + pw / 2 - cx - cw / 2) * scale, (py + ph / 2 - cy - ch) * scale, label, {
      fontFamily: FONT, fontSize: `${Math.max(8, Math.round(ph * scale * size))}px`, fontStyle: 'italic 900', color,
    }).setOrigin(0.5));
    return c;
  }

  // The painted tree with its lamps dark; each lamp gets a glowing light laid over it.
  buildTree(scale) {
    const T = PROPS.tree, [cx, cy, cw, ch] = T.crop;
    const c = this.add.container(0, 0);
    c.add(this.add.image(0, 0, 'p-tree').setOrigin(0.5, 1).setScale(scale));
    c.add(this.add.text(0, (612 - cy - ch) * scale, 'STAGE', {
      fontFamily: FONT, fontSize: `${Math.max(7, Math.round(17 * scale))}px`, fontStyle: '900', color: '#ffffff',
    }).setOrigin(0.5));
    const rows = ['pre', 'stage', 'amber', 'amber', 'amber', 'green', 'red'];
    this.lights = { pre: [], stage: [], amber: [[], [], []], green: [], red: [] };
    let amber = 0;
    rows.forEach((kind, i) => {
      for (const col of T.cols) {
        const x = (col - cx - cw / 2) * scale, y = (T.rows[i] - cy - ch) * scale, r = T.r * scale;
        const light = this.add.container(x, y, [
          this.add.circle(0, 0, r * 2.2, LIGHT[kind], 0.3),
          this.add.circle(0, 0, r, LIGHT[kind]),
          this.add.circle(-r * 0.3, -r * 0.3, r * 0.35, 0xffffff, 0.6),
        ]).setVisible(false);
        c.add(light);
        if (kind === 'amber') this.lights.amber[amber].push(light);
        else this.lights[kind].push(light);
      }
      if (kind === 'amber') amber++;
    });
    return c;
  }

  // ------------------------------------------------------------ loop

  update(_, deltaMs) {
    if (this.paused || !this.L) return;
    if (this.guide) this.lessonUpdate();
    if (this.freeze) return this.render(0);
    const dt = Math.min(deltaMs / 1000, 0.05) * this.slow;
    const { p, o, D } = this;
    this.t += dt;

    if (!this.green && this.t >= this.greenAt) {
      this.green = true;
      this.phase = 'racing';
      sfx.green();
      if (!this.jumpAt) {
        ui.callout('GO!', 'go');
        ui.raceMsg(this.holding ? 'Release to launch!' : 'Tap to launch!');
      }
      // the lesson waits on green for the release
      if (this.guide && this.holding) {
        this.freeze = 'up';
        this.updateTree();
        return this.render(0);
      }
    }
    this.updateTree();

    // revving before launch: the needle climbs while held and falls when released
    if (!p.launched) {
      const target = this.holding ? 1 : IDLE_RPM;
      p.rpm += Math.sign(target - p.rpm) * Math.min(Math.abs(target - p.rpm), (this.holding ? SIM.revRate : SIM.revFall) * dt);
      if (p.rpm >= 0.99) p.rpm = 0.96 + Math.random() * 0.04; // limiter bounce
    }
    if (this.jumpAt != null && !p.launched && this.t >= this.jumpAt) this.launchPlayer(true);

    if (this.green) {
      for (let left = dt; left > 1e-6; left -= SIM.dt) {
        const h = Math.min(SIM.dt, left);
        this.stepOpponent(h);
        step(p, h, D);
      }
    }

    // how far behind the player has been, in seconds, for the comeback achievement
    if (p.launched && o.launched && !p.finished) this.maxBehind = Math.max(this.maxBehind, (o.dist - p.dist) / Math.max(p.v, 1));
    if (p.finished && !this.pDone) {
      this.pDone = true;
      ui.callout(o.finished ? 'FINISHED' : 'FIRST!', o.finished ? 'good' : 'finish');
      ui.raceMsg('Finished!');
      ui.setPrimary('done');
    }
    if (this.phase === 'racing' && p.finished) {
      this.doneT += dt;
      // the race ends when both cars are home, or 3 s after the player is (GDD §6.3)
      if (!o.finished && this.doneT > SIM.postFinish) for (let i = 0; i < 40000 && !o.finished; i++) this.stepOpponent(SIM.dt);
      if (o.finished && this.doneT > 1.2) this.finish();
    }
    this.render(dt);
  }

  // ------------------------------------------------------------ driving lesson

  // The first race and Practice teach the three skills one at a time (GDD §2.3). At each key
  // moment the race freezes until the player does what's being taught, approaching it in slow
  // motion, and the rival waits at the line until the player launches. Steps: intro → amber →
  // rev → shift1 → shift2 → nitro → chain → free.
  lessonUpdate() {
    const p = this.p, z = zones(p.spec);
    const btn = document.getElementById('btn-shift'), tach = document.getElementById('tach');
    let card = null;
    for (let guard = 0; guard < 4; guard++) {
      const step = this.step;
      card = this.lessonCard(p, z, btn, tach);
      if (this.step === step) break;
    }
    if (!card) return ui.lesson(null);
    ui.lesson(card[0], card[1]);
  }

  // The card for the current step; moves on to the next step when this one is done.
  lessonCard(p, z, btn, tach) {
    const N = SIM.nitro;
    switch (this.step) {
      case 'intro':
        return [null, {
          title: 'Driving lesson', frozen: true, button: "Let's go",
          text: 'Drag racing takes three skills: LAUNCH, SHIFT and NITRO. This race stops at each one and shows you what to do. Your rival waits for you at the line.',
          onButton: () => { this.freeze = false; this.step = 'amber'; },
        }];
      case 'amber':
        if (this.holding) { this.step = 'rev'; return null; }
        if (this.t >= this.ambers[0] && !this.freeze) this.freeze = 'down';
        return [btn, {
          title: '1/3 · Launch', frozen: !!this.freeze,
          text: this.freeze ? 'Yellow lights! Press and HOLD the button now.'
            : this.jumped ? "Too early: letting go before GREEN is a jump start. Again: when the yellow lights come on, press and HOLD."
              : 'Watch the start lights. When the yellow lights come on, press and HOLD this button.',
        }];
      case 'rev':
        if (p.launched) { this.step = 'shift1'; return null; }
        if (this.freeze === 'up') return [btn, { title: '1/3 · Launch', text: 'GREEN! Let go of the button NOW.', frozen: true }];
        return [btn, {
          title: '1/3 · Launch',
          text: 'Keep holding and watch the start lights. The moment they turn GREEN, let go: the quicker you react, the better your launch.',
        }];
      case 'shift1': {
        if (p.shifts.length) { this.step = 'shift2'; this.slow = 1; return null; }
        const near = p.rpm >= z.good[0] - 0.15, aim = (z.perfect[0] + z.perfect[1]) / 2;
        this.slow = near ? 0.35 : 1;
        if (!this.freeze && p.rpm >= aim && p.shifting <= 0) this.freeze = 'down';
        if (this.freeze) return [btn, { title: '2/3 · Shift', text: 'The needle is in the GREEN zone. Tap now to SHIFT!', frozen: true }];
        return [tach, {
          title: '2/3 · Shift',
          text: near ? 'Here it comes… the needle is heading for the GREEN zone.'
            : 'Each gear runs out of revs. You shift up when the needle reaches the GREEN zone on the rev meter.',
        }];
      }
      case 'shift2': {
        if (topGear(p)) { this.step = 'nitro'; this.slow = 1; return null; }
        const last = p.shifts[p.shifts.length - 1], limiter = p.shifting <= 0 && p.rpm >= 0.995;
        this.slow = p.shifting <= 0 && p.rpm >= z.good[0] - 0.08 && !limiter ? 0.6 : 1;
        return [tach, {
          title: '2/3 · Shift',
          text: limiter ? "Shift! You're bouncing off the limiter and losing time."
            : last === 'early' ? 'That was early: the car bogged down. Wait for the green zone.'
              : `Now you: shift in the green zone. Its bright middle is a PERFECT shift${last === 'perfect' ? '. Nice!' : '.'}`,
        }];
      }
      case 'nitro':
        if (p.nitros.length) { this.step = 'chain'; return null; }
        // wait for the last gear change to finish: nitro can't fire mid-shift
        if (!this.freeze && p.shifting <= 0) { this.freeze = 'down'; this.lastPress = -1; }
        return [btn, { title: '3/3 · Nitro', text: 'Top gear: no more shifting. The button is now NITRO. Tap it for a speed burst!', frozen: true }];
      case 'chain':
        if (p.finished || p.nitro <= 0 || p.nitros.length > 1) { this.step = 'free'; return null; }
        if (p.boost > 0 && p.boost <= N.chainWindow && !this.freeze) this.freeze = 'down';
        return [btn, {
          title: '3/3 · Nitro', frozen: !!this.freeze,
          text: this.freeze ? 'It FLASHED! Tap now to CHAIN a bigger burst.'
            : 'The burst is burning. When the button flashes white, tap again to CHAIN it. Tapping before the flash wastes a charge.',
        }];
      default: // free run to the line
        if (p.finished) return null;
        if (p.nitro <= 0) return [null, { text: 'Out of nitro. Hold on to the finish!' }];
        return [btn, {
          title: 'Nitro',
          text: p.nitros[p.nitros.length - 1] === 'early' ? 'Wasted! Wait for the white flash before you tap.' : 'Keep chaining: tap on every flash to the line!',
        }];
    }
  }

  // Letting go before green in the lesson restarts the countdown instead of a jump start.
  lessonJump() {
    const d = this.t + 1.5 - this.ambers[0];
    this.ambers = this.ambers.map(a => a + d);
    this.greenAt += d;
    this.beeps = -1;
    this.jumped = true;
    this.step = 'amber';
    sfx.red();
    ui.callout('TOO EARLY', 'foul');
  }

  stepOpponent(h) {
    const o = this.o;
    // in the coached first race the rival waits for the player, so a slow first try still wins
    if (!o.launched && o.time >= this.ai.reaction && (!this.guide || this.p.launched)) {
      launch(o, this.ai.reaction, false, scriptedLaunch(this.ai.launchQ, this.ai.reaction));
    }
    if (o.launched && o.shifting <= 0 && !topGear(o) && shiftReady(o, this.oppPlan)) {
      shift(o);
      this.oppPlan = plannedShift(this.oSpec, this.ai.shiftQ(o.gear));
    }
    if (nitroReady(o, this.ai.nitroQ)) nitro(o);
    step(o, h, this.D);
  }

  updateTree() {
    const t = this.t, lit = (arr, on) => arr.forEach(l => l.setVisible(on));
    lit(this.lights.pre, t >= STAGE_AT.pre);
    lit(this.lights.stage, t >= STAGE_AT.stage);
    this.lights.amber.forEach((arr, i) => lit(arr, !this.green && t >= this.ambers[i]));
    lit(this.lights.green, this.green);
    this.lights.red[0].setVisible(this.jumpAt != null && !this.p.launched);
    if (!this.green) {
      const n = this.ambers.filter(a => t >= a).length - 1;
      if (n > this.beeps) {
        this.beeps = n;
        sfx.amber();
      }
    }
  }

  render(dt) {
    const { L, p, o } = this;
    const prevCam = this.cam;
    this.cam = p.dist;
    const sx = w => L.px + (w - this.cam) * L.ppm;

    for (const ly of this.layers) {
      const off = (this.cam * L.ppm * ly.factor) % ly.period;
      ly.imgs.forEach((im, i) => { im.x = i * ly.P - off; });
    }
    for (const { obj, wx } of this.world) obj.x = sx(wx);

    this.pCar.c.setPosition(sx(p.dist), L.laneP);
    this.oCar.c.setPosition(sx(o.dist), L.laneO);
    this.pCar.spin((p.v * dt) / 0.31);
    this.oCar.spin((o.v * dt) / 0.31);
    this.pitch += (Phaser.Math.Clamp(-p.a * 0.004, -0.05, 0.02) - this.pitch) * Math.min(1, dt * 8);
    this.pCar.c.rotation = this.pitch;

    // tire smoke off the line, heavy off a slow launch in a wheelspin-prone car
    const spin = p.launched && p.launchT < 1.2 ? (p.spec.quirk === 'wheelspin' && p.launchQ < 0.95 ? 1 : 0.35) * (1 - p.launchT / 1.2) : 0;
    if (spin > 0 && this.smoke.length < 60 && Math.random() < spin * 1.5) this.puff();
    // blue exhaust flame while a nitro burst burns, for both cars
    if (p.boost > 0 && !p.finished) this.flame(this.pCar, L.laneP, L.carW);
    if (o.boost > 0 && !o.finished) this.flame(this.oCar, L.laneO, L.carW * 0.92);
    const scroll = (this.cam - prevCam) * L.ppm;
    this.smoke = this.smoke.filter(s => {
      s.life += dt;
      if (s.life >= s.max) { s.c.destroy(); return false; }
      s.c.x += s.vx * dt - (s.grow ? 0 : scroll); // smoke stays on the road, nitro flame rides with the car
      s.c.y += s.vy * dt;
      s.c.setScale(1 + s.life * (s.grow ?? 3)).setAlpha((s.grow ? 0.9 : 0.5) * (1 - s.life / s.max));
      return true;
    });

    const z = zones(p.spec);
    const racing = p.launched && !p.finished && !topGear(p) && p.shifting <= 0;
    const nitroOn = p.launched && !p.finished && topGear(p) && p.nitro > 0;
    const limiter = racing && p.rpm >= 1;
    ui.updateRace({
      rpm: limiter ? 0.96 + Math.random() * 0.04 : p.rpm,
      gear: p.gear + 1,
      mph: p.v * 2.237,
      you: Math.min(1, p.dist / this.D),
      opp: Math.min(1, o.dist / this.D),
      zone: racing && p.rpm >= z.perfect[0] && p.rpm <= z.perfect[1] ? 'perfect' : racing && p.rpm >= z.good[0] && p.rpm <= z.good[1] ? 'good' : limiter ? 'limiter' : null,
      launched: p.launched,
      go: !p.launched && this.green,
      gap: p.launched && o.launched ? o.dist - p.dist : null,
      speed: Math.max(p.v, 1),
      nitro: !nitroOn ? null : p.boost <= 0 ? 'ready' : p.boost <= SIM.nitro.chainWindow ? 'chain' : 'burn',
    });
    engine.set(p.rpm * carDef(state.car).redlineRpm, !p.launched ? 0.45 : p.shifting > 0 || p.finished ? 0.15 : 1);
  }

  // Nitro: a short blue-white flame from the exhaust, built from quick additive sparks.
  flame(car, lane, carW) {
    if (this.smoke.length > 120) return;
    // sparks start spread along the trail so the flame reads as one shape at any frame rate
    for (let i = 0; i < 4; i++) {
      const hot = i === 0, back = Math.random() * carW * 0.14;
      const c = this.add.ellipse(car.c.x - carW * 0.99 - back, lane - carW * 0.075, carW * (hot ? 0.07 : 0.12), carW * (hot ? 0.03 : 0.055), hot ? 0xffffff : 0x4fc3ff, 0.85)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.smokeLayer.add(c);
      this.smoke.push({ c, life: 0, max: 0.08 + Math.random() * 0.08, vx: -(120 + Math.random() * 80) * DPR, vy: (Math.random() - 0.5) * 20 * DPR, grow: -2 });
    }
  }

  puff() {
    const L = this.L;
    const c = this.add.circle(this.pCar.c.x - L.carW * 0.8, L.laneP - L.carW * 0.04, L.carW * 0.05 * (0.7 + Math.random() * 0.6), 0xe8e2da, 0.5);
    this.smokeLayer.add(c);
    this.smoke.push({ c, life: 0, max: 0.6 + Math.random() * 0.5, vx: -(30 + Math.random() * 60) * DPR, vy: -(15 + Math.random() * 35) * DPR });
  }

  // ------------------------------------------------------------ input

  // One input for everything (GDD §10.7): hold to rev, release to launch, tap to shift.
  down() {
    if (this.paused || this.phase === 'done') return;
    if (this.freeze === 'button') return document.querySelector('.lesson-btn')?.click();
    // the lesson waits on green for a release; a fresh tap (say after a pause) counts too
    if (this.freeze === 'up') {
      this.freeze = false;
      this.holding = false;
      return this.launchPlayer(false);
    }
    if (this.freeze === 'down') this.freeze = false;
    const p = this.p;
    if (!p.launched) {
      if (this.jumpAt == null) {
        this.holding = true;
        if (!this.green) ui.raceMsg('Revving… let go the moment it turns GREEN');
      }
      return;
    }
    if (p.finished) return;
    // a tap right after the last shift or a nitro is a double tap, not a nitro press
    if (topGear(p)) return this.t - this.lastPress > 0.25 && this.fireNitro();
    const q = shift(p);
    if (!q) return;
    this.lastPress = this.t;
    sfx.shift(q);
    ui.callout(SHIFT_TEXT[q], q);
    if (q === 'perfect') ui.buzz();
    if (q === 'perfect' && !state.reducedMotion) this.cameras.main.shake(110, 0.003);
    if (topGear(p)) {
      ui.setPrimary('nitro', p.nitro);
      ui.raceMsg('Top gear! Tap NITRO · chain on the flash');
    }
  }

  fireNitro() {
    const p = this.p, q = nitro(p);
    if (!q) return;
    this.lastPress = this.t;
    ui.callout(...NITRO_TEXT[q]);
    if (q === 'chain') ui.buzz(40);
    if (q !== 'early') sfx.nitro(q === 'chain');
    if (q !== 'early' && !state.reducedMotion) this.cameras.main.shake(q === 'chain' ? 160 : 90, q === 'chain' ? 0.004 : 0.002);
    if (p.nitro > 0) ui.setPrimary('nitro', p.nitro);
    else { ui.setPrimary('done'); ui.raceMsg('Out of nitro. Hold on!'); }
  }

  up() {
    if (!this.holding) return;
    if (this.freeze === 'up') this.freeze = false;
    this.holding = false;
    if (this.paused || this.p.launched) return;
    if (this.green) return this.launchPlayer(false);
    if (this.guide) return this.lessonJump();
    // released before green: a cozy jump start holds the car for a moment (GDD §6.3)
    this.jumpAt = this.greenAt + SIM.jumpHold;
    sfx.red();
    ui.callout('JUMP START', 'foul');
    ui.raceMsg('Too early! Held at the line…');
  }

  launchPlayer(jump) {
    const p = this.p;
    const label = launch(p, this.t - this.greenAt, jump);
    ui.callout(LAUNCH_TEXT[label], LAUNCH_KIND[label]);
    if (label === 'perfect') ui.buzz(40);
    // tyres squeal off the line, hardest in a wheelspin-prone car
    if (!jump) sfx.screech(p.spec.quirk === 'wheelspin');
    ui.setPrimary('shift');
    ui.raceMsg('Shift in the green zone');
  }

  setPaused(on) {
    // once the player is over the line there's nothing to pause; the results are seconds away
    if (on === this.paused || this.phase === 'done' || (on && this.p.finished)) return;
    this.paused = on;
    this.holding = false;
    engine.pause(on);
    if (on) {
      ui.showPause({
        resume: () => this.setPaused(false),
        restart: () => this.restart(),
        quit: () => { platform.gameplayStop(); this.scene.start('garage'); },
      });
    } else {
      ui.hideModal();
    }
  }

  restart() {
    ui.hideModal();
    platform.gameplayStop();
    state.stats.races++; // an abandoned attempt still advances the seed
    this.scene.restart({ eventId: this.event.id, practice: this.practice });
  }

  // ------------------------------------------------------------ result

  finish() {
    if (this.phase === 'done') return;
    this.phase = 'done';
    engine.stop();
    platform.gameplayStop();
    const { p, o, event } = this;
    const won = p.finishTime <= o.finishTime + 0.001;
    // the guide repeats until the first win
    if (this.guide) {
      if (won && !this.practice) state.tutorial.raced = true;
      ui.coachOff();
    }
    // longest run of linked bursts: a burst plus every chain fired straight after it
    let chain = 0, run = 0;
    for (const q of p.nitros) { run = q === 'chain' ? run + 1 : q === 'boost' ? 1 : run; chain = Math.max(chain, run); }
    // practice pays nothing and records nothing: just how each skill went
    if (this.practice) {
      sfx.win();
      ui.showPracticeDone({ launch: p.launchLabel, reaction: p.reaction, shifts: p.shifts, nitros: p.nitros }, {
        again: () => this.scene.restart({ eventId: event.id, practice: true }),
        garage: () => this.scene.start('garage'),
      });
      return;
    }
    const res = recordRace(event, won, p.finishTime, p.shifts.filter(s => s === 'perfect').length, {
      perfectLaunch: p.launchLabel === 'perfect', chain, behind: this.maxBehind, margin: o.finishTime - p.finishTime,
      flawless: p.shifts.length > 0 && p.shifts.every(s => s === 'perfect'),
    });
    if (won) sfx.win(); else sfx.lose();
    ui.showResult({
      won, event, opp: this.oSpec.name, you: p.finishTime, them: o.finishTime,
      reaction: p.reaction, launch: p.launchLabel, shifts: p.shifts, nitros: p.nitros, ...res,
    }, {
      again: () => this.scene.restart({ eventId: event.id }),
      next: res.next ? () => ui.showMatchup(res.next.id) : null,
      garage: () => this.scene.start('garage'),
    });
  }
}
