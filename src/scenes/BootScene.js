import { ART, CARS, OPPONENTS } from '../data.js';
import { GARAGE, MOCKUP, PROPS, addTex, drawShadow, drawWrench, ensureCar, queueCar, registerProps } from '../art.js';
import { checkAchievements, collectOffline, save, state } from '../state.js';
import { platform } from '../platform.js';
import * as ui from '../ui.js';

// Every car texture in the game: [key, art source, recolor]. Cars without their own art
// yet are recolors of another car's art (see data.js).
const carArt = () => [
  ...CARS.map(c => [`car-${c.id}`, ART[c.art].side, c.tint]),
  ...CARS.map(c => [`garage-${c.id}`, ART[c.art].pose, c.tint]),
  ...Object.entries(OPPONENTS).map(([id, o]) => [`opp-${id}`, ART[o.art].side, o.tint]),
];

export class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }

  preload() {
    this.load.image(MOCKUP.key, MOCKUP.file);
    this.load.image(GARAGE.key, GARAGE.file);
    this.load.image(PROPS.key, PROPS.file);
    for (const file of new Set(carArt().map(([, s]) => s.file))) this.load.image(file, file);
  }

  async create() {
    const sheet = this.textures.get(MOCKUP.key);
    for (const [name, f] of Object.entries(MOCKUP.frames)) sheet.add(name, 0, f.x, f.y, f.w, f.h);
    addTex(this, 'shadow', drawShadow());
    addTex(this, 'wrench', drawWrench());
    registerProps(this, this.textures.get(PROPS.key).getSourceImage());
    this.textures.remove(PROPS.key);
    // cars are cut out when first shown; only the garage car is needed right away
    const sources = new Set();
    for (const [key, s, tint] of carArt()) {
      queueCar(this.textures, key, this.textures.get(s.file).getSourceImage(), s, tint);
      sources.add(s.file);
    }
    ensureCar(`garage-${state.car}`);
    for (const file of sources) this.textures.remove(file); // the queue keeps the images themselves
    await platform.init();
    const away = collectOffline();
    this.scene.start('garage');
    if (away > 0) ui.toast(`Welcome back! Your crew earned ${ui.fmt(away)}`);
    // progress made before achievements existed (or in an older version) unlocks right away
    if (checkAchievements().length) save();
  }
}
