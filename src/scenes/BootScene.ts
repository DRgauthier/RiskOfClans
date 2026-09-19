import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Load assets here later (spritesheets, images)
  }

  create() {
    console.log('BootScene ready. Transitioning to HomeBaseScene.');
    // Start the Home Base scene initially
    this.scene.start('HomeBaseScene');
  }
}
