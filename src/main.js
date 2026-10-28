import { DPR } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { GarageScene } from './scenes/GarageScene.js';
import { RaceScene } from './scenes/RaceScene.js';
import { unlockAudio } from './audio.js';
import * as ui from './ui.js';

const parent = document.getElementById('game');
const size = () => [Math.round(parent.clientWidth * DPR), Math.round(parent.clientHeight * DPR)];
const [width, height] = size();

// The game is sized in device pixels and CSS stretches the canvas to the window,
// so every scene lays itself out from this.scale.width/height on each resize.
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  width,
  height,
  backgroundColor: '#121925',
  banner: false,
  scale: { mode: Phaser.Scale.NONE },
  scene: [BootScene, GarageScene, RaceScene],
});

let frame = 0;
window.addEventListener('resize', () => {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    const [w, h] = size();
    if (w !== game.scale.width || h !== game.scale.height) game.scale.resize(w, h);
  });
});

document.addEventListener('pointerdown', unlockAudio, true);
document.addEventListener('contextmenu', e => e.preventDefault());

ui.init(game);
