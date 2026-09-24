'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { toProgressMap, type ProgressMap } from './progress/unlocks';
import { progressOf } from './storage/progress';

/** Live progress of a child keyed by level id; undefined while loading. */
export function useProgress(profileId: string | undefined): ProgressMap | undefined {
  return useLiveQuery(async () => (profileId ? toProgressMap(await progressOf(profileId)) : new Map()), [profileId], undefined);
}
