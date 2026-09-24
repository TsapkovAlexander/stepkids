import { describe, expect, it } from 'vitest';
import { gridSceneSchema } from '@stepkids/blocks';
import {
  applyTool,
  defaultWorkshopScene,
  setTheme,
  type EditState,
} from '@/lib/workshop/scene-edit';

const start = (): EditState => ({ scene: defaultWorkshopScene('bunny'), pendingPortal: null });

describe('workshop scene editing', () => {
  it('starts with the chosen hero on an empty field', () => {
    const scene = defaultWorkshopScene('robot', 'snow');
    expect(scene.actors[0]).toMatchObject({ character: 'robot', x: 0, y: 0 });
    expect(gridSceneSchema.safeParse(scene).success).toBe(true);
    expect(setTheme(scene, 'candy').theme).toBe('candy');
  });

  it('places, replaces and erases items', () => {
    let state = applyTool(start(), 'star', { x: 2, y: 1 });
    state = applyTool(state, 'rock', { x: 2, y: 1 });
    expect(state.scene.items.map((item) => item.kind)).toEqual(['rock']);
    state = applyTool(state, 'key', { x: 3, y: 1 });
    expect(state.scene.items[1]).toMatchObject({ kind: 'key', color: 'yellow' });
    state = applyTool(state, 'eraser', { x: 2, y: 1 });
    expect(state.scene.items.map((item) => item.kind)).toEqual(['key']);
    expect(new Set(state.scene.items.map((item) => item.id)).size).toBe(state.scene.items.length);
  });

  it('never puts items under the hero and moves the hero onto free cells', () => {
    let state = applyTool(start(), 'rock', { x: 0, y: 0 });
    expect(state.scene.items).toEqual([]);
    state = applyTool(state, 'star', { x: 4, y: 4 });
    state = applyTool(state, 'hero', { x: 4, y: 4 });
    expect(state.scene.actors[0]).toMatchObject({ x: 4, y: 4 });
    expect(state.scene.items).toEqual([]);
  });

  it('builds portals in pairs and removes both ends together', () => {
    let state = applyTool(start(), 'teleport', { x: 1, y: 1 });
    expect(state.pendingPortal).toEqual({ x: 1, y: 1 });
    expect(state.scene.items).toEqual([]);
    state = applyTool(state, 'teleport', { x: 1, y: 1 });
    expect(state.pendingPortal).toBeNull();
    state = applyTool(applyTool(state, 'teleport', { x: 1, y: 1 }), 'teleport', { x: 5, y: 3 });
    expect(state.scene.items.filter((item) => item.kind === 'teleport')).toHaveLength(2);
    expect(gridSceneSchema.safeParse(state.scene).success).toBe(true);
    state = applyTool(state, 'eraser', { x: 5, y: 3 });
    expect(state.scene.items).toEqual([]);
  });

  it('drops a pending portal end when something else takes its cell', () => {
    let state = applyTool(start(), 'teleport', { x: 2, y: 2 });
    state = applyTool(state, 'star', { x: 2, y: 2 });
    expect(state.pendingPortal).toBeNull();
    state = applyTool(applyTool(state, 'teleport', { x: 3, y: 3 }), 'eraser', { x: 3, y: 3 });
    expect(state.pendingPortal).toBeNull();
    state = applyTool(applyTool(state, 'teleport', { x: 3, y: 3 }), 'hero', { x: 3, y: 3 });
    expect(state.pendingPortal).toBeNull();
  });
});
