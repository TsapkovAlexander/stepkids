import type { GridSceneInput, ProgramDoc } from '@stepkids/blocks';
import type { RunResult } from '@stepkids/engine';

export interface Profile {
  id: string;
  name: string;
  avatarId: string;
  /** The hero the child plays with; replaces the scene's hero character. */
  heroId: string;
  currentTier: number;
  /** Worlds opened manually by a parent. */
  unlockedWorlds: string[];
  createdAt: number;
  updatedAt: number;
  /** Id of the matching child_profiles row once synced. */
  remoteId: string | null;
}

export interface LevelProgress {
  profileId: string;
  levelId: string;
  bestStars: number;
  solvedAt: number | null;
  attempts: number;
  hintsUsed: number;
  lastPlayedAt: number;
}

export interface AttemptRecord {
  clientId: string;
  profileId: string;
  levelId: string;
  levelVersion: number;
  program: ProgramDoc;
  result: Pick<RunResult, 'success' | 'blocks' | 'steps' | 'bumps' | 'timeMs'> & {
    failure: string | null;
  };
  stars: number;
  hintsUsed: number;
  durationMs: number;
  createdAt: number;
  /** 0 until the attempt reached the server. */
  synced: 0 | 1;
}

export interface Draft {
  profileId: string;
  levelId: string;
  program: ProgramDoc;
  updatedAt: number;
}

export interface Project {
  id: string;
  profileId: string;
  title: string;
  scene: GridSceneInput;
  program: ProgramDoc;
  createdAt: number;
  updatedAt: number;
  /** When the child sent the field to a parent as a task. */
  sharedAt: number | null;
  synced: 0 | 1;
}

export interface PinSecret {
  hash: string;
  salt: string;
  iterations: number;
}

export interface FamilyLocal {
  key: 'family';
  pin: PinSecret | null;
}

export interface SeenReward {
  profileId: string;
  rewardId: string;
  seenAt: number;
}
