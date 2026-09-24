import { DEFAULT_HERO } from '@stepkids/content';
import { randomId } from '../utils';
import { db } from './db';
import type { Profile } from './types';

export const PROFILE_NAME_MAX = 30;

export function normalizeName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().slice(0, PROFILE_NAME_MAX);
}

export async function listProfiles(): Promise<Profile[]> {
  return db().profiles.orderBy('createdAt').toArray();
}

export async function createProfile(input: { name: string; avatarId: string }): Promise<Profile> {
  const name = normalizeName(input.name);
  if (!name) throw new Error('Имя не может быть пустым');
  const now = Date.now();
  const profile: Profile = {
    id: randomId(),
    name,
    avatarId: input.avatarId,
    heroId: DEFAULT_HERO,
    currentTier: 1,
    unlockedWorlds: [],
    createdAt: now,
    updatedAt: now,
    remoteId: null,
  };
  await db().profiles.add(profile);
  return profile;
}

export async function updateProfile(
  id: string,
  patch: Partial<Omit<Profile, 'id' | 'createdAt'>>,
): Promise<void> {
  const next = { ...patch, updatedAt: Date.now() };
  if (next.name !== undefined) {
    next.name = normalizeName(next.name);
    if (!next.name) throw new Error('Имя не может быть пустым');
  }
  await db().profiles.update(id, next);
}

/** Removes a child with everything recorded on this device. */
export async function deleteProfile(id: string): Promise<void> {
  const d = db();
  // Table names as strings: Dexie's typed overload recurses into the program AST types.
  await d.transaction(
    'rw',
    ['profiles', 'progress', 'attempts', 'drafts', 'projects', 'seenRewards'],
    async () => {
      await d.progress.where('profileId').equals(id).delete();
      await d.attempts.where('profileId').equals(id).delete();
      await d.drafts.filter((draft) => draft.profileId === id).delete();
      await d.projects.where('profileId').equals(id).delete();
      await d.seenRewards.where('profileId').equals(id).delete();
      await d.profiles.delete(id);
    },
  );
}
