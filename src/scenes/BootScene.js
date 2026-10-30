import { ART, CARS, OPPONENTS } from '../data.js';
import {
  GARAGE, MOCKUP, PART_ICONS, PORTRAITS, PROPS, SCENES, addTex, drawShadow, drawWrench, ensureCar, paintedWrench, queueCar,
  registerPartIcons, registerPortraits, registerProps,
} from '../art.js';
import { checkAchievements, collectOffline, save, state } from '../state.js';
import { platform } from '../platform.js';
import { bus } from '../events.js';
import * as ui from '../ui.js';

// Every car texture in the game: [key, art source, recolor]. Rivals are recolors of the
// car model they drive (see data.js).
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
    // the scene of the car you drive is there from the start; the rest load in the garage
    if (SCENES[state.car]) this.load.image(`scene-${state.car}`, SCENES[state.car].file);
    this.load.image(PROPS.key, PROPS.file);
    this.load.image(PORTRAITS.key, PORTRAITS.file);
    this.load.image(PART_ICONS.key, PART_ICONS.file);
    for (const file of new Set(carArt().map(([, s]) => s.file))) this.load.image(file, file);
  }

  async create() {
    const sheet = this.textures.get(MOCKUP.key);
    for (const [name, f] of Object.entries(MOCKUP.frames)) sheet.add(name, 0, f.x, f.y, f.w, f.h);
    addTex(this, 'shadow', drawShadow());
    registerProps(this, this.textures.get(PROPS.key).getSourceImage());
    registerPortraits(this.textures.get(PORTRAITS.key).getSourceImage());
    registerPartIcons(this.textures.get(PART_ICONS.key).getSourceImage());
    addTex(this, 'wrench', paintedWrench() || drawWrench());
    bus.emit('change', 'art'); // the upgrade panel was drawn before the icons were in
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
