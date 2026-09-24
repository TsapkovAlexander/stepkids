import { describe, expect, it } from 'vitest';
import { GridWorld } from '../src/world/grid-world';
import { scene } from './helpers';

function world(items = scene().items, extra: Partial<Parameters<typeof scene>[0]> = {}) {
  return new GridWorld(scene({ items, ...extra }), { costumes: () => ['default', 'party'] });
}

describe('GridWorld', () => {
  it('sets up actors and items from the scene', () => {
    const w = world([{ id: 's', kind: 'star', x: 2, y: 0 }]);
    const hero = w.actor('hero');
    expect(hero).toMatchObject({
      x: 0,
      y: 0,
      dir: 'right',
      costume: 'default',
      hidden: false,
      bumps: 0,
    });
    expect(hero.trail).toEqual([{ x: 0, y: 0 }]);
    expect(w.starsTotal()).toBe(1);
    expect(w.starsLeft()).toBe(1);
    expect(w.hasActor('ghost')).toBe(false);
    expect(() => w.actor('ghost')).toThrow(/No actor/);
    expect(w.theme).toBe('meadow');
  });

  it('uses the scene costume or a default one', () => {
    const w = new GridWorld(
      scene({ actors: [{ id: 'hero', character: 'kitten', x: 0, y: 0, costume: 'party' }] }),
    );
    expect(w.actor('hero').costume).toBe('party');
    const fallback = new GridWorld(scene(), { costumes: () => [] });
    expect(fallback.actor('hero').costume).toBe('default');
  });

  it('plans steps against edges and obstacles', () => {
    const w = world([
      { id: 'r', kind: 'rock', x: 1, y: 0 },
      { id: 't', kind: 'tree', x: 0, y: 1 },
    ]);
    expect(w.planStep('hero', 'left', 0)).toEqual({ ok: false, reason: 'edge' });
    expect(w.planStep('hero', 'up', 0)).toEqual({ ok: false, reason: 'edge' });
    expect(w.planStep('hero', 'right', 0)).toMatchObject({ ok: false, reason: 'rock' });
    expect(w.planStep('hero', 'down', 0)).toMatchObject({ ok: false, reason: 'tree' });
  });

  it('treats water as not walkable', () => {
    const w = world([{ id: 'w', kind: 'water', x: 1, y: 0 }]);
    expect(w.planStep('hero', 'right', 0)).toMatchObject({ ok: false, reason: 'water' });
  });

  it('opens doors with a key of the same colour', () => {
    const w = world([
      { id: 'k', kind: 'key', x: 1, y: 0, color: 'blue' },
      { id: 'd', kind: 'door', x: 2, y: 0, color: 'blue' },
      { id: 'd2', kind: 'door', x: 1, y: 1 },
    ]);
    expect(w.planStep('hero', 'down', 0)).toEqual({ ok: true, toX: 0, toY: 1 });
    w.beginWalk('hero', 'right', 1, 0, 0, 100);
    const arrival = w.arrive('hero', 100);
    expect(arrival.collected.map((item) => item.id)).toEqual(['k']);
    expect(w.actor('hero').keys).toEqual(['blue']);
    const plan = w.planStep('hero', 'right', 150);
    expect(plan).toMatchObject({ ok: true, toX: 2, toY: 0 });
    expect(plan.ok && plan.openedDoor?.openedAt).toBe(150);
    // A default-coloured door stays locked for a blue key.
    expect(w.planStep('hero', 'down', 200)).toMatchObject({ ok: false, reason: 'door' });
  });

  it('opens default doors with default keys', () => {
    const w = world([
      { id: 'k', kind: 'key', x: 1, y: 0 },
      { id: 'd', kind: 'door', x: 2, y: 0 },
    ]);
    expect(w.planStep('hero', 'right', 0)).toEqual({ ok: true, toX: 1, toY: 0 });
    w.beginWalk('hero', 'right', 1, 0, 0, 100);
    w.arrive('hero', 100);
    expect(w.actor('hero').keys).toEqual(['yellow']);
    expect(w.planStep('hero', 'right', 100)).toMatchObject({ ok: true });
    // Once open, the door stays open.
    expect(w.planStep('hero', 'right', 200)).toEqual({ ok: true, toX: 2, toY: 0 });
  });

  it('collects stars on arrival and records touches', () => {
    const w = world([
      { id: 's', kind: 'star', x: 1, y: 0 },
      { id: 'f', kind: 'flag', x: 2, y: 0 },
    ]);
    w.beginWalk('hero', 'right', 1, 0, 0, 350);
    expect(w.actor('hero').x).toBe(0);
    const arrival = w.arrive('hero', 350);
    expect(arrival.collected[0]?.collectedAt).toBe(350);
    expect(w.starsLeft()).toBe(0);
    expect(w.itemsAt(1, 0)).toEqual([]);
    w.beginWalk('hero', 'right', 2, 0, 350, 350);
    w.arrive('hero', 700);
    expect(w.drainTouches()).toEqual([
      { actorId: 'hero', what: 'star' },
      { actorId: 'hero', what: 'flag' },
    ]);
    expect(w.drainTouches()).toEqual([]);
    expect(w.actor('hero').trail).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]);
  });

  it('reports teleport exits and does not chain teleports', () => {
    const w = world([
      { id: 'a', kind: 'teleport', x: 1, y: 0, pair: 'p' },
      { id: 'b', kind: 'teleport', x: 4, y: 3, pair: 'p' },
    ]);
    w.beginWalk('hero', 'right', 1, 0, 0, 100);
    const arrival = w.arrive('hero', 100);
    expect(arrival.teleportTo).toEqual({ x: 4, y: 3 });
    w.beginTeleport('hero', 4, 3, 100, 400);
    const exit = w.arrive('hero', 500);
    expect(exit.teleportTo).toBeNull();
    expect(w.actor('hero')).toMatchObject({ x: 4, y: 3 });
  });

  it('records meetings of visible actors', () => {
    const w = new GridWorld(
      scene({
        actors: [
          { id: 'hero', character: 'kitten', x: 0, y: 0 },
          { id: 'friend', character: 'bunny', x: 1, y: 0 },
          { id: 'ghost', character: 'bunny', x: 2, y: 0, hidden: true },
        ],
      }),
    );
    w.beginWalk('hero', 'right', 1, 0, 0, 100);
    w.arrive('hero', 100);
    expect(w.drainTouches()).toEqual([
      { actorId: 'hero', what: 'actor' },
      { actorId: 'friend', what: 'actor' },
    ]);
    w.beginWalk('hero', 'right', 2, 0, 100, 100);
    w.arrive('hero', 200);
    expect(w.drainTouches()).toEqual([]);
  });

  it('ignores arrive without a walk and after a bump', () => {
    const w = world();
    expect(w.arrive('hero', 0)).toEqual({ collected: [], teleportTo: null });
    w.beginBump('hero', 'left', 0, 450);
    expect(w.arrive('hero', 450)).toEqual({ collected: [], teleportTo: null });
    expect(w.actor('hero').bumps).toBe(1);
    expect(w.totalBumps()).toBe(1);
    w.markStopped('hero');
    expect(w.actor('hero').stopped).toBe(true);
  });

  it('keeps speech bubbles and the said log', () => {
    const w = world();
    w.endSay('hero', 5);
    expect(w.actor('hero').bubble).toBeNull();
    w.say('hero', 'Привет!', 10);
    expect(w.actor('hero').bubble).toEqual({ text: 'Привет!', start: 10, end: null });
    w.endSay('hero', 900);
    expect(w.actor('hero').bubble?.end).toBe(900);
    expect(w.said).toEqual([{ actorId: 'hero', text: 'Привет!', time: 10 }]);
  });

  it('switches visibility and costumes', () => {
    const w = world();
    w.setVisible('hero', false);
    expect(w.actor('hero').hidden).toBe(true);
    w.setVisible('hero', true);
    expect(w.actor('hero').hidden).toBe(false);
    w.setCostume('hero', 'next');
    expect(w.actor('hero').costume).toBe('party');
    w.setCostume('hero', 'next');
    expect(w.actor('hero').costume).toBe('default');
    w.setCostume('hero', 'party');
    expect(w.actor('hero').costume).toBe('party');
    w.setCostume('hero', 'unknown');
    expect(w.actor('hero').costume).toBe('party');
  });

  it('interpolates poses for walking, bumping and teleporting', () => {
    const w = world();
    expect(w.pose('hero', 0)).toEqual({ x: 0, y: 0, alpha: 1, dir: 'right' });
    w.beginWalk('hero', 'down', 0, 1, 0, 100);
    expect(w.pose('hero', 0)).toMatchObject({ x: 0, y: 0 });
    expect(w.pose('hero', 50).y).toBeCloseTo(0.5);
    expect(w.pose('hero', 25).y).toBeCloseTo(0.125);
    expect(w.pose('hero', 75).y).toBeCloseTo(0.875);
    w.arrive('hero', 100);
    expect(w.pose('hero', 200)).toMatchObject({ x: 0, y: 1, dir: 'down' });

    w.beginBump('hero', 'right', 200, 100);
    const mid = w.pose('hero', 250);
    expect(mid.x).toBeCloseTo(0.32);
    expect(mid.y).toBe(1);
    expect(w.pose('hero', 300)).toMatchObject({ x: 0, y: 1 });

    w.beginTeleport('hero', 3, 3, 300, 100);
    expect(w.pose('hero', 325)).toMatchObject({ x: 0, y: 1, alpha: 0.5 });
    expect(w.pose('hero', 375)).toMatchObject({ x: 3, y: 3, alpha: 0.5 });

    w.beginWalk('hero', 'right', 1, 1, 400, 0);
    expect(w.pose('hero', 400)).toMatchObject({ x: 0, y: 1 });
  });
});
