import Phaser from 'phaser';

export default class HomeBaseScene extends Phaser.Scene {
  private gridSize: number = 20;
  private cellSize: number = 32;

  constructor() {
    super('HomeBaseScene');
  }

  create() {
    console.log('HomeBaseScene created');

    // Create a simple camera setup
    this.cameras.main.setBackgroundColor('#222222');

    // Center camera on grid
    const gridWidth = this.gridSize * this.cellSize;
    const gridHeight = this.gridSize * this.cellSize;

    // We can center it in the middle of our typical view
    this.cameras.main.centerOn(gridWidth / 2, gridHeight / 2);

    // Enable camera drag
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        if (!pointer.isDown) return;
        this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
        this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
    });

    // Zoom controls with mouse wheel
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: any, _deltaX: number, deltaY: number, _deltaZ: number) => {
        const newZoom = this.cameras.main.zoom - deltaY * 0.001;
        this.cameras.main.zoom = Phaser.Math.Clamp(newZoom, 0.5, 2);
    });

    this.drawGrid();
  }

  private drawGrid() {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x444444, 0.8);

    const width = this.gridSize * this.cellSize;
    const height = this.gridSize * this.cellSize;

    // Draw vertical lines
    for (let x = 0; x <= this.gridSize; x++) {
      graphics.moveTo(x * this.cellSize, 0);
      graphics.lineTo(x * this.cellSize, height);
    }

    // Draw horizontal lines
    for (let y = 0; y <= this.gridSize; y++) {
      graphics.moveTo(0, y * this.cellSize);
      graphics.lineTo(width, y * this.cellSize);
    }

    graphics.strokePath();
  }
}
