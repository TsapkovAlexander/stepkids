import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import type { FreeWorld, SpriteState } from '@stepkids/engine';
import { PROPS } from './art';
import { SpeechBubble } from './bubble';

const STAGE_W = 480;
const STAGE_H = 360;
const SPRITE_BASE = 64;
/** Props spin with their direction; heroes only look left or right (Scratch "left-right"). */
const ROTATING = new Set<string>(PROPS);

export interface FreeLayout {
  scale: number;
  originX: number;
  originY: number;
}

export function computeFreeLayout(viewWidth: number, viewHeight: number, padding = 8): FreeLayout {
  const scale = Math.max(
    0.1,
    Math.min((viewWidth - padding * 2) / STAGE_W, (viewHeight - padding * 2) / STAGE_H),
  );
  return {
    scale,
    originX: (viewWidth - STAGE_W * scale) / 2,
    originY: (viewHeight - STAGE_H * scale) / 2,
  };
}

/** Stage coordinates (centre origin, y up) to view pixels. */
export function toView(layout: FreeLayout, x: number, y: number): { x: number; y: number } {
  return {
    x: layout.originX + (x + STAGE_W / 2) * layout.scale,
    y: layout.originY + (STAGE_H / 2 - y) * layout.scale,
  };
}

/** Everything of a free scene: backdrop, sprites (clones appear and vanish live) and bubbles. */
export class FreeView {
  readonly container = new Container();
  private readonly backdrop: Sprite;
  private readonly frame = new Graphics();
  private readonly mask = new Graphics();
  private readonly sprites = new Container();
  private readonly bubbles = new Container();
  private readonly views = new Map<string, { sprite: Sprite; bubble: SpeechBubble }>();
  private layout: FreeLayout | null = null;

  constructor(
    private readonly world: FreeWorld,
    backdrop: Texture,
    /** Resolved textures by `character:costume`. */
    private readonly textures: Map<string, Texture>,
    private readonly fontFamily: string,
    private readonly onTap?: (actorId: string) => void,
  ) {
    this.backdrop = new Sprite(backdrop);
    this.sprites.sortableChildren = true;
    this.sprites.mask = this.mask;
    this.container.addChild(this.frame, this.backdrop, this.mask, this.sprites, this.bubbles);
    this.backdrop.mask = this.mask;
  }

  relayout(viewWidth: number, viewHeight: number): FreeLayout {
    const layout = computeFreeLayout(viewWidth, viewHeight);
    this.layout = layout;
    const w = STAGE_W * layout.scale;
    const h = STAGE_H * layout.scale;
    this.backdrop.position.set(layout.originX, layout.originY);
    this.backdrop.width = w;
    this.backdrop.height = h;
    this.mask
      .clear()
      .roundRect(layout.originX, layout.originY, w, h, 18)
      .fill({ color: '#ffffff' });
    this.frame
      .clear()
      .roundRect(layout.originX - 6, layout.originY - 6 + 5, w + 12, h + 12, 22)
      .fill({ color: '#3d2c29', alpha: 0.18 })
      .roundRect(layout.originX - 6, layout.originY - 6, w + 12, h + 12, 22)
      .fill({ color: '#ffffff' });
    return layout;
  }

  update(now: number, viewWidth: number): void {
    const layout = this.layout;
    if (!layout) return;
    const alive = new Set(this.world.sprites.keys());
    for (const [id, view] of this.views) {
      if (!alive.has(id)) {
        view.sprite.destroy();
        view.bubble.container.destroy({ children: true });
        this.views.delete(id);
      }
    }
    for (const state of this.world.sprites.values())
      this.updateSprite(state, now, layout, viewWidth);
  }

  private viewOf(state: SpriteState): { sprite: Sprite; bubble: SpeechBubble } | null {
    let view = this.views.get(state.id);
    if (view) return view;
    const texture = this.texture(state);
    if (!texture) return null;
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    if (this.onTap) {
      sprite.eventMode = 'static';
      sprite.cursor = 'pointer';
      sprite.on('pointertap', () => this.onTap?.(state.id));
    }
    const bubble = new SpeechBubble(this.fontFamily);
    this.sprites.addChild(sprite);
    this.bubbles.addChild(bubble.container);
    view = { sprite, bubble };
    this.views.set(state.id, view);
    return view;
  }

  private texture(state: SpriteState): Texture | undefined {
    return (
      this.textures.get(`${state.character}:${state.costume}`) ??
      this.textures.get(`${state.character}:default`)
    );
  }

  private updateSprite(
    state: SpriteState,
    now: number,
    layout: FreeLayout,
    viewWidth: number,
  ): void {
    const view = this.viewOf(state);
    if (!view) return;
    const texture = this.texture(state);
    if (texture && view.sprite.texture !== texture) view.sprite.texture = texture;
    const pose = this.world.pose(state.id, now);
    const point = toView(layout, pose.x, pose.y);
    const size = ((SPRITE_BASE * pose.size) / 100) * layout.scale * 1.25;
    const scale = size / view.sprite.texture.width;
    const rotates = ROTATING.has(state.character);
    view.sprite.visible = !state.hidden;
    view.sprite.position.set(point.x, point.y);
    view.sprite.zIndex = state.layer;
    view.sprite.rotation = rotates ? ((pose.direction - 90) * Math.PI) / 180 : 0;
    view.sprite.scale.set(!rotates && pose.direction < 0 ? -scale : scale, scale);
    const fontSize = Math.round(Math.max(14, Math.min(22, 18 * layout.scale)));
    view.bubble.update(
      state.bubble,
      state.hidden,
      now,
      point.x,
      point.y - size / 2,
      viewWidth,
      fontSize,
      Math.max(160, 220 * layout.scale),
    );
  }
}
