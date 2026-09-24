/**
 * What a thread yields to the scheduler. Waiting is expressed in virtual time, so the
 * headless checker and the animated stage run the exact same program logic; the stage
 * only interpolates between recorded states.
 */
export type Wait =
  /** Give way until the next tick (end of a loop iteration). */
  | { kind: 'frame' }
  /** Sleep until the virtual clock reaches `until`. */
  | { kind: 'until'; until: number }
  /** Wait for an external event (speech finished): not before `until`, not after `timeout`. */
  | { kind: 'latch'; latch: Latch; until: number; timeout: number }
  /** Step mode: wait until the user presses "Шаг". */
  | { kind: 'gate' };

/** A one-shot flag the host resolves, e.g. when speech synthesis finishes. */
export class Latch {
  private done = false;

  get resolved(): boolean {
    return this.done;
  }

  resolve(): void {
    this.done = true;
  }

  static resolved(): Latch {
    const latch = new Latch();
    latch.resolve();
    return latch;
  }
}

export const FRAME: Wait = { kind: 'frame' };
