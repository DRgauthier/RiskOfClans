import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import HomeBaseScene from './scenes/HomeBaseScene';
import OverworldScene from './scenes/OverworldScene';

export const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  scene: [BootScene, HomeBaseScene, OverworldScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  pixelArt: false, // Set to true later if using pixel art assets
};

export let game: Phaser.Game;

export function initGame() {
    if (!game) {
        game = new Phaser.Game(config);
    }
}

// Window resize handling is mostly covered by Phaser.Scale.RESIZE,
// but you might need to adjust camera bounds on resize.
