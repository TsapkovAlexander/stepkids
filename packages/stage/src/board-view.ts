import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import type { GridWorld } from '@stepkids/engine';
import type { ThemePalette } from './art';
import { cellCenter, type BoardLayout } from './layout';

export interface StageMarkers {
  /** Target cells of "reach" goals without a flag on them. */
  reach?: Array<{ x: number; y: number }>;
  /** Picture to repeat with the trail. */
  shape?: Array<[number, number]>;
}

/** Board, water tiles, goal markers and the trail — everything under the items. */
export class BoardView {
  readonly container = new Container();
  private readonly board = new Graphics();
  private readonly water = new Container();
  private readonly markers = new Graphics();
  private readonly trail = new Graphics();
  private trailLength = -1;
  private layout: BoardLayout | null = null;

  constructor(
    private readonly world: GridWorld,
    private readonly palette: ThemePalette,
    private readonly waterTexture: Texture,
    private readonly goals: StageMarkers,
  ) {
    this.container.addChild(this.board, this.water, this.markers, this.trail);
  }

  relayout(layout: BoardLayout): void {
    this.layout = layout;
    this.drawBoard(layout);
    this.drawWater(layout);
    this.trailLength = -1;
  }

  /** `clock` is real time in ms: markers pulse even while the program is paused. */
  update(clock: number): void {
    const layout = this.layout;
    if (!layout) return;
    this.drawMarkers(layout, clock);
    if (this.world.scene.trail) this.drawTrail(layout);
  }

  private drawBoard(layout: BoardLayout): void {
    const { cell, originX, originY, width, height, border } = layout;
    const { tileA, tileB, board, boardShadow } = this.palette;
    const g = this.board.clear();
    const radius = Math.max(10, cell * 0.22);
    g.roundRect(
      originX - border,
      originY - border + 6,
      width + border * 2,
      height + border * 2,
      radius,
    ).fill({
      color: boardShadow,
    });
    g.roundRect(
      originX - border,
      originY - border,
      width + border * 2,
      height + border * 2,
      radius,
    ).fill({
      color: board,
    });
    g.roundRect(originX, originY, width, height, Math.max(6, radius - border)).fill({
      color: tileA,
    });
    for (let y = 0; y < this.world.rows; y += 1) {
      for (let x = 0; x < this.world.cols; x += 1) {
        if ((x + y) % 2 === 1)
          g.rect(originX + x * cell, originY + y * cell, cell, cell).fill({ color: tileB });
      }
    }
    // Soft dots on tiles read as grass/sand texture and help counting cells.
    for (let y = 0; y < this.world.rows; y += 1) {
      for (let x = 0; x < this.world.cols; x += 1) {
        const cx = originX + x * cell;
        const cy = originY + y * cell;
        g.circle(cx + cell * 0.22, cy + cell * 0.28, Math.max(1.2, cell * 0.025)).fill({
          color: '#ffffff',
          alpha: 0.28,
        });
        g.circle(cx + cell * 0.74, cy + cell * 0.68, Math.max(1.2, cell * 0.02)).fill({
          color: '#ffffff',
          alpha: 0.22,
        });
      }
    }
  }

  private drawWater(layout: BoardLayout): void {
    this.water.removeChildren().forEach((child) => child.destroy());
    for (const item of this.world.items) {
      if (item.kind !== 'water') continue;
      const sprite = new Sprite(this.waterTexture);
      sprite.width = layout.cell + 1;
      sprite.height = layout.cell + 1;
      sprite.x = layout.originX + item.x * layout.cell;
      sprite.y = layout.originY + item.y * layout.cell;
      this.water.addChild(sprite);
    }
  }

  private drawMarkers(layout: BoardLayout, clock: number): void {
    const g = this.markers.clear();
    const { cell } = layout;
    const pulse = 0.5 + 0.5 * Math.sin(clock / 380);
    for (const target of this.goals.reach ?? []) {
      const c = cellCenter(layout, target.x, target.y);
      g.circle(c.x, c.y, cell * (0.3 + pulse * 0.06)).stroke({
        width: Math.max(3, cell * 0.06),
        color: '#ffffff',
        alpha: 0.9,
      });
      g.circle(c.x, c.y, cell * 0.14).fill({ color: '#ff6f91', alpha: 0.85 });
    }
    for (const [x, y] of this.goals.shape ?? []) {
      const inset = cell * 0.14;
      g.roundRect(
        layout.originX + x * cell + inset,
        layout.originY + y * cell + inset,
        cell - inset * 2,
        cell - inset * 2,
        cell * 0.16,
      ).stroke({
        width: Math.max(2, cell * 0.05),
        color: '#ffffff',
        alpha: 0.75 + pulse * 0.25,
      });
    }
  }

  private drawTrail(layout: BoardLayout): void {
    const cells = [...this.world.actors.values()].flatMap((actor) => actor.trail);
    if (cells.length === this.trailLength) return;
    this.trailLength = cells.length;
    const g = this.trail.clear();
    const { cell } = layout;
    const inset = cell * 0.2;
    for (const { x, y } of cells) {
      g.roundRect(
        layout.originX + x * cell + inset,
        layout.originY + y * cell + inset,
        cell - inset * 2,
        cell - inset * 2,
        cell * 0.14,
      ).fill({
        color: this.palette.trail,
        alpha: 0.85,
      });
    }
  }
}
