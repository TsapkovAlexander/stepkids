'use client';

import { useSyncExternalStore } from 'react';

/** Per-device conveniences (volumes, speed). Stored in localStorage; safe to lose. */
export interface DeviceSettings {
  voiceVolume: number;
  sfxVolume: number;
  muted: boolean;
  speed: 0.5 | 1 | 2;
}

export const DEFAULT_SETTINGS: DeviceSettings = { voiceVolume: 1, sfxVolume: 0.7, muted: false, speed: 1 };

const KEY = 'stepkids.device-settings';
const listeners = new Set<() => void>();
let current: DeviceSettings = DEFAULT_SETTINGS;
let loaded = false;

function load(): DeviceSettings {
  if (loaded || typeof window === 'undefined') return current;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) current = { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<DeviceSettings>) };
  } catch {
    current = DEFAULT_SETTINGS;
  }
  return current;
}

export function getSettings(): DeviceSettings {
  return load();
}

export function updateSettings(patch: Partial<DeviceSettings>): void {
  current = { ...load(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Private mode or storage disabled: keep the value in memory only.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDeviceSettings(): DeviceSettings {
  return useSyncExternalStore(subscribe, getSettings, () => DEFAULT_SETTINGS);
}
