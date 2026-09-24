'use client';

import { useCallback } from 'react';
import { sfx } from '../audio/sfx';
import { voice, type SayOptions } from './voice';

/** `speak(text)` for event handlers; also unlocks audio on the first gesture. */
export function useSpeak(): (text: string, options?: SayOptions) => void {
  return useCallback((text: string, options?: SayOptions) => {
    sfx.unlock();
    voice.say(text, options);
  }, []);
}
