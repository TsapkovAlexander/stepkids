import { Container, Sprite, type Texture } from 'pixi.js';
import type { GridItemState } from '@stepkids/engine';
import { cellCenter, type BoardLayout } from './layout';

/** Size relative to the cell and vertical anchor for each kind of item. */
const ITEM_LOOK: Record<string, { size: number; anchorY: number; offsetY: number }> = {
  star: { size: 0.74, anchorY: 0.5, offsetY: 0 },
  rock: { size: 0.98, anchorY: 0.86, offsetY: 0.4 },
  tree: { size: 1.12, anchorY: 0.9, offsetY: 0.42 },
  flag: { size: 0.9, anchorY: 0.9, offsetY: 0.4 },
  door: { size: 1.0, anchorY: 0.92, offsetY: 0.44 },
  key: { size: 0.72, anchorY: 0.55, offsetY: 0 },
  teleport: { size: 0.86, anchorY: 0.5, offsetY: 0 },
  flower: { size: 0.72, anchorY: 0.9, offsetY: 0.4 },
};

const POP_MS = 320;

export interface ItemTextures {
  main: Texture;
  /** Door once opened. */
  open?: Texture;
}

/** A static or collectable item on a cell, with its idle and pickup animations. */
export class ItemView {
  readonly container = new Container();
  private readonly sprite: Sprite;
  private layout: BoardLayout | null = null;
  private opened = false;

  constructor(
    readonly item: GridItemState,
    private readonly textures: ItemTextures,
  ) {
    const look = ITEM_LOOK[item.kind] ?? { size: 0.8, anchorY: 0.5, offsetY: 0 };
    this.sprite = new Sprite(textures.main);
    this.sprite.anchor.set(0.5, look.anchorY);
    this.container.addChild(this.sprite);
  }

  relayout(layout: BoardLayout): void {
    this.layout = layout;
  }

  update(now: number, clock: number): void {
    const layout = this.layout;
    if (!layout) return;
    const { item } = this;
    const look = ITEM_LOOK[item.kind] ?? { size: 0.8, anchorY: 0.5, offsetY: 0 };
    const center = cellCenter(layout, item.x, item.y);
    const size = layout.cell * look.size;
    let scale = size / this.sprite.texture.width;
    let alpha = 1;
    let lift = 0;
    let rotation = 0;
    const phase = clock / 1000 + item.x * 0.7 + item.y * 0.3;

    if (item.kind === 'star' || item.kind === 'key') {
      scale *= 1 + Math.sin(phase * 3) * 0.04;
      rotation = Math.sin(phase * 2) * 0.08;
      if (item.collectedAt !== null && now >= item.collectedAt) {
        const t = (now - item.collectedAt) / POP_MS;
        alpha = Math.max(0, 1 - t);
        scale *= 1 + Math.min(1, t) * 0.7;
        lift = Math.min(1, t) * layout.cell * 0.5;
      }
    } else if (item.kind === 'teleport') {
      rotation = clock / 900;
    } else if (item.kind === 'flag') {
      this.sprite.skew.y = Math.sin(phase * 4) * 0.04;
    } else if (item.kind === 'door' && this.textures.open) {
      const open = item.openedAt !== null && now >= item.openedAt;
      if (open !== this.opened) {
        this.opened = open;
        this.sprite.texture = open ? this.textures.open : this.textures.main;
      }
    }

    this.container.visible = alpha > 0;
    this.sprite.alpha = alpha;
    this.sprite.rotation = rotation;
    this.sprite.scale.set(scale);
    this.sprite.position.set(center.x, center.y + look.offsetY * layout.cell - lift);
    this.container.zIndex =
      item.y * 10 + (item.kind === 'teleport' || item.kind === 'flower' ? 0 : 3);
  }
}
