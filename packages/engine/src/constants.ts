export interface Limits {
  maxThreads: number;
  maxStepsPerTick: number;
  maxClones: number;
}

/** Execution limits from the spec; exceeding one stops the run with a friendly message. */
export const LIMITS: Readonly<Limits> = {
  maxThreads: 64,
  maxStepsPerTick: 10_000,
  maxClones: 300,
};

/** Durations in virtual milliseconds at 1× speed. */
export const TIMING = {
  /** One grid cell of walking (spec: 300–400 ms). */
  stepMs: 350,
  /** Walking into an obstacle and bouncing back. */
  bumpMs: 450,
  /** Teleport flash. */
  teleportMs: 400,
  /** Minimal time a speech bubble stays when speech synthesis is unavailable. */
  sayMinMs: 1200,
  sayMaxMs: 5000,
  sayPerCharMs: 70,
  /** Bubble lingers a bit after the voice ends. */
  sayTailMs: 400,
  melodyMs: 2000,
  /** Fixed tick used by the headless checker (60 Hz). */
  tickMs: 1000 / 60,
} as const;

export function estimateSpeechMs(text: string): number {
  const estimate = 600 + text.length * TIMING.sayPerCharMs;
  return Math.min(TIMING.sayMaxMs, Math.max(TIMING.sayMinMs, estimate));
}
