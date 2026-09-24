import type { GridSceneInput, ProgramDoc } from '@stepkids/blocks';
import { randomId } from '../utils';
import { db } from './db';
import type { Project } from './types';

export async function listProjects(profileId: string): Promise<Project[]> {
  const list = await db().projects.where('profileId').equals(profileId).sortBy('updatedAt');
  return list.reverse();
}

export async function getProject(id: string): Promise<Project | undefined> {
  return db().projects.get(id);
}

export async function createProject(profileId: string, scene: GridSceneInput, program: ProgramDoc, title: string): Promise<Project> {
  const now = Date.now();
  const project: Project = { id: randomId(), profileId, title, scene, program, createdAt: now, updatedAt: now, sharedAt: null, synced: 0 };
  await db().projects.add(project);
  return project;
}

export async function saveProject(id: string, patch: Partial<Pick<Project, 'title' | 'scene' | 'program' | 'sharedAt'>>): Promise<void> {
  const d = db();
  // Read-modify-write instead of update(): Dexie's key-path typing recurses into the program AST.
  await d.transaction('rw', 'projects', async () => {
    const current = await d.projects.get(id);
    if (current) await d.projects.put({ ...current, ...patch, updatedAt: Date.now(), synced: 0 });
  });
}

export async function deleteProject(id: string): Promise<void> {
  await db().projects.delete(id);
}
