'use client';

import { getSettings } from '../settings';

/**
 * Sound effects and melodies synthesised with Web Audio — no audio files to download,
 * works offline, no licensing questions.
 */

type Wave = OscillatorType;

interface Note {
  /** MIDI note number; 0 = rest. */
  midi: number;
  beats: number;
}

const MELODIES: Record<string, { bpm: number; wave: Wave; notes: Note[] }> = {
  // Each melody lasts about two seconds — the time the "Музыка" block waits in the engine.
  happy: {
    bpm: 270,
    wave: 'triangle',
    notes: [60, 64, 67, 72, 67, 64, 67, 72].map((midi, i) => ({ midi, beats: i === 7 ? 2 : 1 })),
  },
  lullaby: {
    bpm: 210,
    wave: 'sine',
    notes: [
      { midi: 67, beats: 1.5 },
      { midi: 64, beats: 0.5 },
      { midi: 67, beats: 1 },
      { midi: 64, beats: 1 },
      { midi: 62, beats: 1 },
      { midi: 60, beats: 2 },
    ],
  },
  fanfare: {
    bpm: 195,
    wave: 'square',
    notes: [
      { midi: 67, beats: 0.5 },
      { midi: 67, beats: 0.5 },
      { midi: 67, beats: 0.5 },
      { midi: 72, beats: 2 },
      { midi: 0, beats: 0.5 },
      { midi: 71, beats: 0.5 },
      { midi: 72, beats: 2 },
    ],
  },
  bells: {
    bpm: 195,
    wave: 'sine',
    notes: [84, 81, 79, 81, 84, 88, 84].map((midi, i) => ({ midi, beats: i === 6 ? 2 : 0.75 })),
  },
  drum: { bpm: 180, wave: 'sine', notes: [] },
};

let context: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  context ??= new Ctor();
  // Autoplay policies: resume inside the first user gesture.
  if (context.state === 'suspended') void context.resume();
  return context;
}

function volume(): number {
  const settings = getSettings();
  return settings.muted ? 0 : settings.sfxVolume;
}

const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

function tone(at: number, frequency: number, duration: number, wave: Wave, gain = 0.25, slideTo?: number): void {
  const audio = ctx();
  const level = volume() * gain;
  if (!audio || level <= 0) return;
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(frequency, at);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + duration);
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(level, at + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(amp).connect(audio.destination);
  osc.start(at);
  osc.stop(at + duration + 0.02);
}

function noise(at: number, duration: number, gain: number, lowpass = 1200): void {
  const audio = ctx();
  const level = volume() * gain;
  if (!audio || level <= 0) return;
  const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * duration), audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  const source = audio.createBufferSource();
  const filter = audio.createBiquadFilter();
  const amp = audio.createGain();
  source.buffer = buffer;
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  amp.gain.setValueAtTime(level, at);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  source.connect(filter).connect(amp).connect(audio.destination);
  source.start(at);
}

function now(): number {
  return ctx()?.currentTime ?? 0;
}

export const sfx = {
  /** Call from the first user gesture so later sounds are allowed to play. */
  unlock(): void {
    ctx();
  },
  tap(): void {
    tone(now(), 660, 0.07, 'triangle', 0.12);
  },
  add(): void {
    const t = now();
    tone(t, 520, 0.08, 'triangle', 0.18);
    tone(t + 0.06, 780, 0.1, 'triangle', 0.16);
  },
  remove(): void {
    tone(now(), 500, 0.14, 'triangle', 0.16, 260);
  },
  collect(): void {
    const t = now();
    tone(t, 1175, 0.12, 'sine', 0.2);
    tone(t + 0.08, 1568, 0.22, 'sine', 0.2);
  },
  bump(): void {
    const t = now();
    tone(t, 180, 0.18, 'sine', 0.35, 90);
    noise(t, 0.12, 0.12, 600);
  },
  teleport(): void {
    tone(now(), 300, 0.4, 'sine', 0.18, 1400);
  },
  step(): void {
    tone(now(), 420, 0.05, 'sine', 0.05);
  },
  win(): void {
    const t = now();
    [72, 76, 79, 84].forEach((midi, i) => tone(t + i * 0.11, freq(midi), 0.3, 'triangle', 0.2));
  },
  oops(): void {
    const t = now();
    tone(t, 392, 0.16, 'triangle', 0.14);
    tone(t + 0.14, 330, 0.24, 'triangle', 0.14);
  },
  star(index: number): void {
    tone(now(), freq(76 + index * 4), 0.25, 'sine', 0.2);
  },
  melody(id: string): void {
    const t = now();
    if (id === 'drum') {
      for (let i = 0; i < 6; i += 1) {
        const at = t + i * 0.25;
        tone(at, i % 2 === 0 ? 110 : 160, 0.16, 'sine', 0.45, 50);
        if (i % 2 === 1) noise(at, 0.08, 0.1, 4000);
      }
      return;
    }
    const melody = MELODIES[id] ?? MELODIES.happy;
    if (!melody) return;
    const beat = 60 / melody.bpm;
    let at = t;
    for (const note of melody.notes) {
      if (note.midi > 0) tone(at, freq(note.midi), note.beats * beat * 0.95, melody.wave, melody.wave === 'square' ? 0.1 : 0.2);
      at += note.beats * beat;
    }
  },
};
