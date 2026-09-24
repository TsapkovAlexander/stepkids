/**
 * Thin wrapper over the Web Speech API tuned for a Russian-speaking child:
 * picks the best available ru-RU voice, interrupts the previous phrase, never throws,
 * and resolves `done` even if the browser forgets to fire `end` (a known Chrome/iOS quirk).
 */

export interface SpeakOptions {
  pitch?: number;
  rate?: number;
  volume?: number;
}

export interface SpeechHandle {
  done: Promise<void>;
  cancel(): void;
}

const PREFERRED = [/google/i, /milena/i, /yandex/i, /irina|svetlana|dariya|ekaterina/i, /premium|enhanced|natural/i];

export function pickRussianVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const russian = voices.filter((voice) => voice.lang.toLowerCase().replace('_', '-').startsWith('ru'));
  if (russian.length === 0) return null;
  for (const pattern of PREFERRED) {
    const match = russian.find((voice) => pattern.test(voice.name));
    if (match) return match;
  }
  return russian.find((voice) => voice.localService) ?? russian[0] ?? null;
}

/** Upper bound for a phrase so a missing `end` event never blocks the program. */
export function speechTimeoutMs(text: string, rate = 1): number {
  return Math.min(15_000, (1200 + text.length * 110) / Math.max(0.5, rate));
}

class SpeechService {
  private voice: SpeechSynthesisVoice | null = null;
  private current: { cancel(): void } | null = null;
  private initialised = false;

  private get synth(): SpeechSynthesis | null {
    return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  }

  private init(): void {
    if (this.initialised) return;
    const synth = this.synth;
    if (!synth) return;
    this.initialised = true;
    const load = () => {
      this.voice = pickRussianVoice(synth.getVoices());
    };
    load();
    synth.addEventListener?.('voiceschanged', load);
  }

  /** True when a Russian voice exists; otherwise the UI shows text longer instead. */
  get available(): boolean {
    this.init();
    return this.voice !== null;
  }

  speak(text: string, options: SpeakOptions = {}): SpeechHandle | null {
    this.init();
    const synth = this.synth;
    const clean = text.trim();
    if (!synth || !this.voice || !clean) return null;
    this.cancel();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.voice = this.voice;
    utterance.lang = this.voice.lang;
    utterance.pitch = options.pitch ?? 1;
    utterance.rate = options.rate ?? 0.95;
    utterance.volume = options.volume ?? 1;

    let settle: () => void = () => undefined;
    const done = new Promise<void>((resolve) => {
      let finished = false;
      const timer = setTimeout(() => settle(), speechTimeoutMs(clean, utterance.rate));
      settle = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        resolve();
      };
    });
    utterance.onend = () => settle();
    utterance.onerror = () => settle();

    const handle = {
      done,
      cancel: () => {
        settle();
        if (this.current === handle) this.current = null;
      },
    };
    this.current = handle;
    // Chrome sometimes stays paused after a tab switch.
    if (synth.paused) synth.resume();
    synth.speak(utterance);
    return handle;
  }

  cancel(): void {
    const synth = this.synth;
    this.current?.cancel();
    this.current = null;
    if (synth && (synth.speaking || synth.pending)) synth.cancel();
  }
}

export const speech = new SpeechService();
