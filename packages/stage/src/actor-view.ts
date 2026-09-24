import { Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import type { GridActorState, GridWorld } from '@stepkids/engine';
import { cellCenter, type BoardLayout } from './layout';

/** Feet of the character art sit at 94 in a viewBox that starts at −12 and is 112 tall. */
const FEET_ANCHOR = (94 + 12) / 112;
const SPRITE_SCALE = 1.18;

export interface ActorViewOptions {
  fontFamily: string;
  onTap?: (actorId: string) => void;
}

/** One actor: shadow, sprite with walk/idle motion, and a speech bubble. */
export class ActorView {
  readonly container = new Container();
  private readonly shadow = new Graphics();
  private readonly sprite: Sprite;
  private readonly bubble = new Container();
  private readonly bubbleBg = new Graphics();
  private readonly bubbleText: Text;
  private facing = 1;
  private costume: string;
  private layout: BoardLayout | null = null;
  private bubbleKey = '';

  constructor(
    private readonly world: GridWorld,
    readonly actorId: string,
    private readonly costumes: Map<string, Texture>,
    options: ActorViewOptions,
  ) {
    const actor = world.actor(actorId);
    this.costume = actor.costume;
    this.facing = actor.dir === 'left' ? -1 : 1;
    this.sprite = new Sprite(this.costumeTexture(actor.costume));
    this.sprite.anchor.set(0.5, FEET_ANCHOR);
    this.bubbleText = new Text({
      text: '',
      style: {
        fontFamily: options.fontFamily,
        fontSize: 18,
        fontWeight: '700',
        fill: '#3d2c29',
        align: 'center',
        wordWrap: true,
      },
    });
    this.bubbleText.anchor.set(0.5, 0.5);
    this.bubble.addChild(this.bubbleBg, this.bubbleText);
    this.bubble.visible = false;
    this.container.addChild(this.shadow, this.sprite);
    if (options.onTap) {
      this.sprite.eventMode = 'static';
      this.sprite.cursor = 'pointer';
      this.sprite.on('pointertap', () => options.onTap?.(actorId));
    }
  }

  /** The bubble lives in a separate top layer so it is never covered by other sprites. */
  get bubbleLayer(): Container {
    return this.bubble;
  }

  relayout(layout: BoardLayout): void {
    this.layout = layout;
    this.shadow
      .clear()
      .ellipse(0, 0, layout.cell * 0.3, layout.cell * 0.09)
      .fill({ color: '#000000', alpha: 0.16 });
    this.bubbleKey = '';
  }

  update(now: number, clock: number, viewWidth: number): void {
    const layout = this.layout;
    if (!layout) return;
    const actor = this.world.actor(this.actorId);
    const pose = this.world.pose(this.actorId, now);
    if (pose.dir === 'left') this.facing = -1;
    else if (pose.dir === 'right') this.facing = 1;
    if (actor.costume !== this.costume) {
      this.costume = actor.costume;
      this.sprite.texture = this.costumeTexture(actor.costume);
    }

    const { cell } = layout;
    const base = cellCenter(layout, pose.x, pose.y);
    const feetY = base.y + cell * 0.36;
    const hop = walkHop(actor, now) * cell * 0.14;
    const breath = Math.sin(clock / 520 + actor.x) * 0.018;
    const size = cell * SPRITE_SCALE;

    this.container.visible = !actor.hidden;
    this.container.alpha = pose.alpha;
    this.container.zIndex = pose.y * 10 + 5;
    this.shadow.position.set(base.x, feetY - cell * 0.02);
    this.shadow.scale.set(1 - hop / cell);
    this.sprite.position.set(base.x, feetY - hop);
    const scale = size / this.sprite.texture.width;
    this.sprite.scale.set(scale * this.facing, scale * (1 + breath));
    this.updateBubble(actor, now, base.x, feetY - size * 0.95, viewWidth);
  }

  private updateBubble(
    actor: GridActorState,
    now: number,
    x: number,
    top: number,
    viewWidth: number,
  ): void {
    const layout = this.layout;
    const bubble = actor.bubble;
    const visible =
      !!bubble && !actor.hidden && now >= bubble.start && (bubble.end === null || now < bubble.end);
    this.bubble.visible = visible;
    if (!visible || !bubble || !layout) return;
    const fontSize = Math.round(Math.min(24, Math.max(15, layout.cell * 0.24)));
    const maxWidth = Math.min(viewWidth - 24, Math.max(160, layout.cell * 3.2));
    const key = `${bubble.text}|${fontSize}|${maxWidth}`;
    if (key !== this.bubbleKey) {
      this.bubbleKey = key;
      this.bubbleText.style.fontSize = fontSize;
      this.bubbleText.style.wordWrapWidth = maxWidth - 28;
      this.bubbleText.text = bubble.text;
      const w = Math.min(maxWidth, this.bubbleText.width + 28);
      const h = this.bubbleText.height + 18;
      this.bubbleBg
        .clear()
        .roundRect(-w / 2, -h, w, h, Math.min(18, h / 2))
        .fill({ color: '#ffffff' })
        .stroke({ width: 3, color: '#3d2c29' })
        .poly([-9, -1.5, 9, -1.5, 0, 12])
        .fill({ color: '#ffffff' })
        .stroke({ width: 3, color: '#3d2c29' });
      // Cover the stroke between the body and the tail.
      this.bubbleBg.rect(-7.5, -4, 15, 5).fill({ color: '#ffffff' });
      this.bubbleText.position.set(0, -h / 2);
    }
    const half = this.bubbleBg.width / 2;
    const clampedX = Math.min(viewWidth - half - 8, Math.max(half + 8, x));
    this.bubble.position.set(clampedX, Math.max(this.bubbleBg.height + 4, top - 12));
  }

  private costumeTexture(costume: string): Texture {
    const texture = this.costumes.get(costume) ?? this.costumes.values().next().value;
    if (!texture) throw new Error(`No textures for actor ${this.actorId}`);
    return texture;
  }
}

/** 0…1 hop height while walking between cells. */
function walkHop(actor: GridActorState, now: number): number {
  const motion = actor.motion;
  if (!motion || motion.kind !== 'walk' || motion.duration <= 0) return 0;
  const t = (now - motion.start) / motion.duration;
  if (t <= 0 || t >= 1) return 0;
  return Math.abs(Math.sin(t * Math.PI));
}
