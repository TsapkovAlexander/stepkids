'use client';

import { characterById } from '@stepkids/content';
import { getSettings } from '../settings';
import { speech, type SpeechHandle } from './speech';

export interface SayOptions {
  /** Character whose voice profile (pitch, rate) is used; the narrator otherwise. */
  character?: string;
}

const NARRATOR = { pitch: 1.1, rate: 0.95 };

/**
 * Everything the child hears as words goes through here. Static lines will later come from
 * pre-generated audio files (backoffice TTS); until then — and for the child's own phrases —
 * the browser synthesises speech.
 */
export const voice = {
  get available(): boolean {
    return speech.available;
  },

  say(text: string, options: SayOptions = {}): SpeechHandle | null {
    const settings = getSettings();
    if (settings.muted || settings.voiceVolume <= 0) return null;
    const profile = (options.character && characterById(options.character)?.voice) || NARRATOR;
    return speech.speak(text, { pitch: profile.pitch, rate: profile.rate, volume: settings.voiceVolume });
  },

  stop(): void {
    speech.cancel();
  },
};
