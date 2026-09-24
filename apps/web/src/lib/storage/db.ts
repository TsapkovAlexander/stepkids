import Dexie, { type EntityTable } from 'dexie';
import type {
  AttemptRecord,
  Draft,
  FamilyLocal,
  LevelProgress,
  Profile,
  Project,
  SeenReward,
} from './types';

/** Everything the child app needs offline lives in IndexedDB on the device. */
export class StepkidsDb extends Dexie {
  profiles!: EntityTable<Profile, 'id'>;
  progress!: Dexie.Table<LevelProgress, [string, string]>;
  attempts!: EntityTable<AttemptRecord, 'clientId'>;
  drafts!: Dexie.Table<Draft, [string, string]>;
  projects!: EntityTable<Project, 'id'>;
  family!: EntityTable<FamilyLocal, 'key'>;
  seenRewards!: Dexie.Table<SeenReward, [string, string]>;

  constructor(name = 'stepkids') {
    super(name);
    this.version(1).stores({
      profiles: 'id, createdAt',
      progress: '[profileId+levelId], profileId',
      attempts: 'clientId, profileId, synced, createdAt',
      drafts: '[profileId+levelId]',
      projects: 'id, profileId, updatedAt',
      family: 'key',
      seenRewards: '[profileId+rewardId], profileId',
    });
  }
}

let instance: StepkidsDb | null = null;

export function db(): StepkidsDb {
  instance ??= new StepkidsDb();
  return instance;
}

/** Tests swap in a fresh database. */
export function setDbForTests(next: StepkidsDb): void {
  instance = next;
}
