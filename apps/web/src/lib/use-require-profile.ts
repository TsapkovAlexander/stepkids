'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useActiveProfile } from './active-profile';
import type { Profile } from './storage/types';

/** Child screens need a chosen player; without one they go back to the avatar picker. */
export function useRequireProfile(): Profile | null {
  const state = useActiveProfile();
  const router = useRouter();
  useEffect(() => {
    if (state.status === 'none') router.replace('/play');
  }, [state.status, router]);
  return state.status === 'ready' ? state.profile : null;
}
