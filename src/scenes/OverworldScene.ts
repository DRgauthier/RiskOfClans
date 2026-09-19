import Phaser from 'phaser';

export default class OverworldScene extends Phaser.Scene {
  private hexRadius: number = 30; // Radius of a single hexagon
  // private mapRadius: number = 20; // Matches DB seed generator radius

  constructor() {
    super('OverworldScene');
  }

  create() {
    console.log('OverworldScene created');

    this.cameras.main.setBackgroundColor('#2a2a2a');

    // Enable camera drag
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        if (!pointer.isDown) return;
        this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
        this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
    });

    // Zoom controls with mouse wheel
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: any, _deltaX: number, deltaY: number, _deltaZ: number) => {
        const newZoom = this.cameras.main.zoom - deltaY * 0.001;
        this.cameras.main.zoom = Phaser.Math.Clamp(newZoom, 0.2, 1.5);
    });

    // We will draw hexes based on data fetched from Supabase later.
    // For now, let's draw a few placeholder hexes at the center.
    this.drawHexGridPlaceholder();
  }

  private drawHexGridPlaceholder() {
      const graphics = this.add.graphics();
      graphics.lineStyle(2, 0x555555, 1);

      // Draw a small 3-radius hex map as placeholder
      const radius = 3;
      for (let q = -radius; q <= radius; q++) {
          for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
              this.drawHex(graphics, q, r);
          }
      }
      graphics.strokePath();
  }

  private drawHex(graphics: Phaser.GameObjects.Graphics, q: number, r: number) {
      // Axial to Pixel conversion (Pointy topped hex)
      const x = this.hexRadius * Math.sqrt(3) * (q + r / 2);
      const y = this.hexRadius * 3/2 * r;

      // Draw the 6 points of the hex
      const points = [];
      for (let i = 0; i < 6; i++) {
          const angle_deg = 60 * i - 30;
          const angle_rad = Math.PI / 180 * angle_deg;
          points.push({
              x: x + this.hexRadius * Math.cos(angle_rad),
              y: y + this.hexRadius * Math.sin(angle_rad)
          });
      }

      graphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < 6; i++) {
          graphics.lineTo(points[i].x, points[i].y);
      }
      graphics.lineTo(points[0].x, points[0].y);
  }
}
