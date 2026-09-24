import { Container, Graphics, Text } from 'pixi.js';
import type { Bubble } from '@stepkids/engine';

/** Comic speech bubble with a tail, kept inside the view horizontally. */
export class SpeechBubble {
  readonly container = new Container();
  private readonly background = new Graphics();
  private readonly label: Text;
  private key = '';

  constructor(fontFamily: string) {
    this.label = new Text({
      text: '',
      style: {
        fontFamily,
        fontSize: 18,
        fontWeight: '700',
        fill: '#3d2c29',
        align: 'center',
        wordWrap: true,
      },
    });
    this.label.anchor.set(0.5, 0.5);
    this.container.addChild(this.background, this.label);
    this.container.visible = false;
  }

  /** Shows the bubble above (x, top) if it is active at `now`. */
  update(
    bubble: Bubble | null,
    hidden: boolean,
    now: number,
    x: number,
    top: number,
    viewWidth: number,
    fontSize: number,
    maxWidth: number,
  ): void {
    const visible =
      !!bubble && !hidden && now >= bubble.start && (bubble.end === null || now < bubble.end);
    this.container.visible = visible;
    if (!visible || !bubble) return;
    const width = Math.min(viewWidth - 24, maxWidth);
    const key = `${bubble.text}|${fontSize}|${width}`;
    if (key !== this.key) {
      this.key = key;
      this.label.style.fontSize = fontSize;
      this.label.style.wordWrapWidth = width - 28;
      this.label.text = bubble.text;
      const w = Math.min(width, this.label.width + 28);
      const h = this.label.height + 18;
      this.background
        .clear()
        .roundRect(-w / 2, -h, w, h, Math.min(18, h / 2))
        .fill({ color: '#ffffff' })
        .stroke({ width: 3, color: '#3d2c29' })
        .poly([-9, -1.5, 9, -1.5, 0, 12])
        .fill({ color: '#ffffff' })
        .stroke({ width: 3, color: '#3d2c29' });
      // Cover the stroke between the body and the tail.
      this.background.rect(-7.5, -4, 15, 5).fill({ color: '#ffffff' });
      this.label.position.set(0, -h / 2);
    }
    const half = this.background.width / 2;
    this.container.position.set(
      Math.min(viewWidth - half - 8, Math.max(half + 8, x)),
      Math.max(this.background.height + 4, top - 12),
    );
  }
}
