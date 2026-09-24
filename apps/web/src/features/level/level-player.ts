import type { LevelContent, ProgramDoc } from '@stepkids/blocks';
import { GridWorld, LevelRun, Latch, type RunResult } from '@stepkids/engine';
import type { GridStage, StageMarkers } from '@stepkids/stage';

/** `done` — a sandbox run ended; the scene stays as the program left it until Stop. */
export type PlayerStatus = 'idle' | 'running' | 'stepping' | 'reacting' | 'won' | 'done';

export interface PlayerState {
  status: PlayerStatus;
  activeIds: ReadonlySet<string>;
  /** Block that caused a bump — the ribbon wiggles it. */
  oopsId: string | null;
}

export interface PlayerHooks {
  costumes: (character: string) => string[];
  /** Speaks a phrase in a character's voice; returns a promise for its end or null if silent. */
  speak: (text: string, character: string) => Promise<void> | null;
  sound: (event: 'melody' | 'collect' | 'bump' | 'teleport' | 'win' | 'oops', detail?: string) => void;
  /** Reaction line for a finished run. */
  reaction: (result: RunResult) => string;
  onState: (state: PlayerState) => void;
  /** Called once a run is over (after the hero's reaction for failures). */
  onFinish: (result: RunResult, program: ProgramDoc) => void;
  /** Workshop and shows: no goals, no reactions, the final scene stays on screen. */
  sandbox?: boolean;
}

const EMPTY: ReadonlySet<string> = new Set();
const MAX_FRAME_MS = 64;
const REACTION_MIN_MS = 1400;
const REACTION_MAX_MS = 4000;

/**
 * Imperative core of the level screen: owns the current run, the animation loop and the
 * idle world shown between runs. React only mirrors its state.
 */
export class LevelPlayer {
  private stage: GridStage | null = null;
  private run: LevelRun | null = null;
  private world: GridWorld;
  private displayTime = 0;
  private speed = 1;
  private raf = 0;
  private last = 0;
  private state: PlayerState = { status: 'idle', activeIds: EMPTY, oopsId: null };
  private destroyed = false;
  private reactionTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly level: LevelContent,
    private readonly markers: StageMarkers,
    private readonly hooks: PlayerHooks,
  ) {
    this.world = this.freshWorld();
    this.raf = requestAnimationFrame(this.loop);
  }

  get status(): PlayerStatus {
    return this.state.status;
  }

  attach(stage: GridStage | null): void {
    this.stage = stage;
    if (!stage) return;
    stage.setTimeSource(() => this.displayTime);
    void stage.show(this.run?.world ?? this.world, this.markers);
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  play(program: ProgramDoc): void {
    if (this.run && !this.run.finished && this.state.status === 'stepping') {
      this.run.runtime.setStepMode(false);
      this.setState({ status: 'running' });
      return;
    }
    if (this.state.status === 'running' || this.state.status === 'reacting') return;
    this.startRun(program, false);
  }

  step(program: ProgramDoc): void {
    if (!this.run || this.run.finished || this.state.status === 'idle' || this.state.status === 'won' || this.state.status === 'done') {
      if (this.state.status === 'reacting') return;
      this.startRun(program, true);
    } else {
      this.run.runtime.setStepMode(true);
      this.setState({ status: 'stepping' });
    }
    this.run?.runtime.grantStep();
  }

  stop(): void {
    this.clearReaction();
    this.run?.stop();
    this.run = null;
    this.reset();
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.clearReaction();
    this.run?.stop();
    this.run = null;
  }

  private freshWorld(): GridWorld {
    if (this.level.scene.kind !== 'grid') throw new Error('Only grid scenes are playable in the ribbon');
    return new GridWorld(this.level.scene, { costumes: this.hooks.costumes });
  }

  private hero(world: GridWorld): string {
    return world.hasActor('hero') ? 'hero' : (world.actors.keys().next().value ?? 'hero');
  }

  private startRun(program: ProgramDoc, stepMode: boolean): void {
    this.clearReaction();
    this.run?.stop();
    const run = new LevelRun(this.level, program, {
      costumes: this.hooks.costumes,
      speak: ({ actorId, text }) => {
        const done = this.hooks.speak(text, run.world.actor(actorId).character);
        if (!done) return null;
        const latch = new Latch();
        void done.then(() => latch.resolve());
        return latch;
      },
    });
    const events = run.runtime.events;
    events.on('sound', (event) => this.hooks.sound('melody', event.melody));
    events.on('collect', () => this.hooks.sound('collect'));
    events.on('teleport', () => this.hooks.sound('teleport'));
    events.on('bump', (event) => {
      this.hooks.sound('bump');
      this.setState({ oopsId: event.blockId });
    });
    run.events.on('finish', (result) => this.finish(run, program, result));
    this.run = run;
    this.displayTime = 0;
    this.setState({ status: stepMode ? 'stepping' : 'running', activeIds: EMPTY, oopsId: null });
    run.runtime.setStepMode(stepMode);
    void this.stage?.show(run.world, this.markers);
    run.start();
  }

  private finish(run: LevelRun, program: ProgramDoc, result: RunResult): void {
    if (this.destroyed || run !== this.run) return;
    const heroId = this.hero(run.world);
    const character = run.world.actor(heroId).character;
    if (result.failure?.kind === 'empty') {
      this.hooks.speak(this.hooks.reaction(result), character);
      this.run = null;
      this.reset();
      this.hooks.onFinish(result, program);
      return;
    }
    if (this.hooks.sandbox) {
      if (result.failure?.kind === 'bump') this.hooks.sound('oops');
      this.setState({ status: 'done', activeIds: EMPTY });
      this.hooks.onFinish(result, program);
      return;
    }
    const line = this.hooks.reaction(result);
    run.world.say(heroId, line, this.displayTime);
    this.hooks.sound(result.success ? 'win' : 'oops');
    const spoken = this.hooks.speak(line, character) ?? Promise.resolve();
    this.setState({ status: result.success ? 'won' : 'reacting', activeIds: EMPTY });
    const started = performance.now();
    const settle = () => {
      if (this.destroyed || run !== this.run) return;
      run.world.endSay(heroId, this.displayTime + 300);
      if (result.success) {
        this.hooks.onFinish(result, program);
        return;
      }
      // Errors are part of the game: the hero goes back to the start and we try again.
      this.reactionTimer = setTimeout(() => {
        if (run !== this.run) return;
        this.run = null;
        this.reset();
        this.hooks.onFinish(result, program);
      }, 450);
    };
    void Promise.race([spoken, delay(REACTION_MAX_MS)]).then(() => {
      const wait = Math.max(0, REACTION_MIN_MS - (performance.now() - started));
      this.reactionTimer = setTimeout(settle, wait);
    });
  }

  private reset(): void {
    this.world = this.freshWorld();
    this.displayTime = 0;
    this.setState({ status: 'idle', activeIds: EMPTY });
    void this.stage?.show(this.world, this.markers);
  }

  private clearReaction(): void {
    if (this.reactionTimer) clearTimeout(this.reactionTimer);
    this.reactionTimer = null;
  }

  private loop = (timestamp: number): void => {
    if (this.destroyed) return;
    const dt = this.last ? Math.min(MAX_FRAME_MS, timestamp - this.last) : 0;
    this.last = timestamp;
    const run = this.run;
    if (run && !run.finished && (this.state.status === 'running' || this.state.status === 'stepping')) {
      run.advance(dt * this.speed);
      this.displayTime = run.timeMs;
      const active = run.runtime.activeBlockIds();
      if (!sameSet(active, this.state.activeIds)) this.setState({ activeIds: active });
    } else if (run) {
      // Keep the clock ticking after the run so bubbles and pickups finish animating.
      this.displayTime += dt;
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  private setState(patch: Partial<PlayerState>): void {
    this.state = { ...this.state, ...patch };
    this.hooks.onState(this.state);
  }
}

function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false;
  for (const value of a) if (!b.has(value)) return false;
  return true;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
