import { describe, expect, it } from 'vitest';
import { pickRussianVoice, speechTimeoutMs } from '@/lib/voice/speech';

const voice = (name: string, lang: string, localService = false) =>
  ({ name, lang, localService }) as SpeechSynthesisVoice;

describe('pickRussianVoice', () => {
  it('prefers well-known natural Russian voices', () => {
    const voices = [
      voice('Alex', 'en-US'),
      voice('Some Russian', 'ru-RU', true),
      voice('Google русский', 'ru-RU'),
    ];
    expect(pickRussianVoice(voices)?.name).toBe('Google русский');
    expect(pickRussianVoice([voice('Milena', 'ru_RU'), voice('Other', 'ru-RU')])?.name).toBe(
      'Milena',
    );
  });

  it('falls back to any Russian voice or none', () => {
    expect(pickRussianVoice([voice('A', 'ru-RU'), voice('B', 'ru-RU', true)])?.name).toBe('B');
    expect(pickRussianVoice([voice('A', 'ru-RU')])?.name).toBe('A');
    expect(pickRussianVoice([voice('Alex', 'en-US')])).toBeNull();
  });

  it('bounds speech time', () => {
    expect(speechTimeoutMs('Привет')).toBeGreaterThan(1000);
    expect(speechTimeoutMs('а'.repeat(1000))).toBe(15_000);
    expect(speechTimeoutMs('Привет', 2)).toBeLessThan(speechTimeoutMs('Привет', 1));
  });
});
