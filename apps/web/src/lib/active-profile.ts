'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useSyncExternalStore } from 'react';
import { db } from './storage/db';
import type { Profile } from './storage/types';

const KEY = 'stepkids.active-profile';
const listeners = new Set<() => void>();

function read(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setActiveProfileId(id: string | null): void {
  try {
    if (id) window.localStorage.setItem(KEY, id);
    else window.localStorage.removeItem(KEY);
  } catch {
    // Storage unavailable: the child picks the avatar again next time.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useActiveProfileId(): string | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

export type ProfileState =
  { status: 'loading' } | { status: 'none' } | { status: 'ready'; profile: Profile };

/** The child currently playing on this device. */
export function useActiveProfile(): ProfileState {
  const id = useActiveProfileId();
  const profile = useLiveQuery(
    async () => (id ? ((await db().profiles.get(id)) ?? null) : null),
    [id],
    undefined,
  );
  if (profile === undefined) return { status: 'loading' };
  if (profile === null) return { status: 'none' };
  return { status: 'ready', profile };
}
