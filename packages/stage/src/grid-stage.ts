import { Application, Container, Sprite, type Texture } from 'pixi.js';
import type { GridWorld } from '@stepkids/engine';
import { THEMES } from './art';
import { ActorView } from './actor-view';
import { BoardView, type StageMarkers } from './board-view';
import { ItemView } from './item-view';
import { cellAt, cellCenter, computeLayout, type BoardLayout } from './layout';
import { burstTexture, characterTexture, itemTexture, preloadTextures } from './textures';

export interface GridStageOptions {
  /** CSS font family for speech bubbles; the host loads the font before creating the stage. */
  fontFamily?: string;
  /** Costume ids of a character, to preload every texture it may switch to. */
  costumes?: (character: string) => string[];
  onActorTap?: (actorId: string) => void;
  onCellTap?: (cell: { x: number; y: number }) => void;
}

/**
 * PixiJS renderer of the grid scene. It owns no game logic: every frame it reads the world
 * model and the virtual clock supplied by the host and draws the interpolated state.
 */
export class GridStage {
  private readonly root = new Container();
  private readonly scene = new Container();
  private readonly bubbles = new Container();
  private board: BoardView | null = null;
  private items: ItemView[] = [];
  private actors: ActorView[] = [];
  private burst: Sprite | null = null;
  private world: GridWorld | null = null;
  private layout: BoardLayout | null = null;
  private timeSource: () => number = () => 0;
  private destroyed = false;
  private showToken = 0;

  private constructor(
    private readonly app: Application,
    private readonly options: GridStageOptions,
  ) {
    this.scene.sortableChildren = true;
    this.root.addChild(this.scene, this.bubbles);
    app.stage.addChild(this.root);
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('pointertap', (event) => {
      if (!this.world || !this.layout || !this.options.onCellTap) return;
      const cell = cellAt(
        this.layout,
        event.global.x,
        event.global.y,
        this.world.cols,
        this.world.rows,
      );
      if (cell) this.options.onCellTap(cell);
    });
    app.renderer.on('resize', () => this.relayout());
    app.ticker.add(() => this.frame());
  }

  static async create(host: HTMLElement, options: GridStageOptions = {}): Promise<GridStage> {
    const app = new Application();
    await app.init({
      resizeTo: host,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(2, globalThis.devicePixelRatio || 1),
      preference: 'webgl',
    });
    app.canvas.style.display = 'block';
    app.canvas.style.touchAction = 'manipulation';
    host.appendChild(app.canvas);
    return new GridStage(app, options);
  }

  /** Virtual time of the current run; the stage interpolates motions with it. */
  setTimeSource(source: () => number): void {
    this.timeSource = source;
  }

  /** Rebuilds the scene graph for a world (a new run or a newly loaded level). */
  async show(world: GridWorld, markers: StageMarkers = {}): Promise<void> {
    const token = ++this.showToken;
    const palette = THEMES[world.theme];
    const costumesOf = this.options.costumes ?? (() => ['default']);
    const characters = [...world.actors.values()].map((actor) => ({
      character: actor.character,
      costumes: costumesOf(actor.character),
    }));
    await preloadTextures(characters, palette.tree);
    const water = await itemTexture('water');
    const itemViews = await Promise.all(
      world.items
        .filter((item) => item.kind !== 'water')
        .map(async (item) => {
          const main = await itemTexture(item.kind, { color: item.color, tree: palette.tree });
          const open =
            item.kind === 'door'
              ? await itemTexture('door', { color: item.color, open: true })
              : undefined;
          return new ItemView(item, { main, ...(open ? { open } : {}) });
        }),
    );
    const actorViews = await Promise.all(
      [...world.actors.values()].map(async (actor) => {
        const textures = new Map<string, Texture>();
        for (const costume of new Set([actor.costume, ...costumesOf(actor.character)])) {
          textures.set(costume, await characterTexture(actor.character, costume));
        }
        return new ActorView(world, actor.id, textures, {
          fontFamily: this.options.fontFamily ?? 'sans-serif',
          ...(this.options.onActorTap ? { onTap: this.options.onActorTap } : {}),
        });
      }),
    );
    const burst = new Sprite(await burstTexture());
    // A newer show() or destroy() happened while textures were loading.
    if (token !== this.showToken || this.destroyed) return;

    this.clearScene();
    this.world = world;
    this.board = new BoardView(world, palette, water, markers);
    this.items = itemViews;
    this.actors = actorViews;
    this.burst = burst;
    burst.anchor.set(0.5);
    burst.visible = false;
    burst.zIndex = 1000;
    this.scene.addChild(this.board.container, ...itemViews.map((view) => view.container));
    this.scene.addChild(...actorViews.map((view) => view.container), burst);
    this.bubbles.addChild(...actorViews.map((view) => view.bubbleLayer));
    this.board.container.zIndex = -1000;
    this.relayout();
    this.frame();
  }

  /** Current layout, for hosts that position DOM overlays over cells. */
  getLayout(): BoardLayout | null {
    return this.layout;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.clearScene();
    // Textures are shared between stages through the module cache: keep them alive.
    this.app.destroy(
      { removeView: true },
      { children: true, texture: false, textureSource: false },
    );
  }

  private clearScene(): void {
    for (const child of [...this.scene.removeChildren(), ...this.bubbles.removeChildren()]) {
      child.destroy({ children: true });
    }
    this.items = [];
    this.actors = [];
    this.board = null;
    this.burst = null;
  }

  private relayout(): void {
    const world = this.world;
    if (!world || this.destroyed) return;
    const { width, height } = this.app.screen;
    this.layout = computeLayout(width, height, world.cols, world.rows);
    this.board?.relayout(this.layout);
    for (const view of this.items) view.relayout(this.layout);
    for (const view of this.actors) view.relayout(this.layout);
  }

  private frame(): void {
    if (!this.world || !this.layout || this.destroyed) return;
    const now = this.timeSource();
    const clock = performance.now();
    this.board?.update(clock);
    for (const view of this.items) view.update(now, clock);
    for (const view of this.actors) view.update(now, clock, this.app.screen.width);
    this.updateBurst(now);
  }

  /** Shows a cartoon "bonk" where an actor bumped into something. */
  private updateBurst(now: number): void {
    const burst = this.burst;
    const layout = this.layout;
    if (!burst || !layout || !this.world) return;
    burst.visible = false;
    for (const actor of this.world.actors.values()) {
      const motion = actor.motion;
      if (!motion || motion.kind !== 'bump') continue;
      const t = (now - motion.start) / motion.duration;
      if (t < 0.3 || t > 1.1) continue;
      const from = cellCenter(layout, motion.fromX, motion.fromY);
      const to = cellCenter(layout, motion.toX, motion.toY);
      const size = layout.cell * 0.55 * (1 + Math.sin(Math.min(1, t) * Math.PI) * 0.3);
      burst.visible = true;
      burst.alpha = t > 0.85 ? Math.max(0, (1.1 - t) / 0.25) : 1;
      burst.scale.set(size / burst.texture.width);
      burst.position.set(
        (from.x + to.x) / 2 + (to.x - from.x) * 0.1,
        (from.y + to.y) / 2 - layout.cell * 0.1,
      );
    }
  }
}
