import { describe, expect, it } from 'vitest';
import { createChallenge, isCorrect } from '@/lib/lock/challenge';
import { hashPin, isValidPin, verifyPin } from '@/lib/lock/pin';

describe('parent challenge', () => {
  it('multiplies factors from 6 to 9', () => {
    for (let i = 0; i < 50; i += 1) {
      const challenge = createChallenge();
      expect(challenge.a).toBeGreaterThanOrEqual(6);
      expect(challenge.b).toBeLessThanOrEqual(9);
      expect(challenge.answer).toBe(challenge.a * challenge.b);
    }
    const fixed = createChallenge(() => 0.99);
    expect(fixed).toEqual({ a: 9, b: 9, answer: 81 });
  });

  it('checks answers strictly', () => {
    const challenge = { a: 7, b: 8, answer: 56 };
    expect(isCorrect(challenge, '56')).toBe(true);
    expect(isCorrect(challenge, '056')).toBe(true);
    expect(isCorrect(challenge, '55')).toBe(false);
    expect(isCorrect(challenge, '5 6')).toBe(false);
    expect(isCorrect(challenge, '')).toBe(false);
  });
});

describe('PIN', () => {
  it('validates the format', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
  });

  it('hashes with salt and verifies', async () => {
    const secret = await hashPin('4821', 1000);
    expect(secret.hash).not.toContain('4821');
    expect(await verifyPin('4821', secret)).toBe(true);
    expect(await verifyPin('4822', secret)).toBe(false);
    expect(await verifyPin('x', secret)).toBe(false);
    const again = await hashPin('4821', 1000);
    expect(again.salt).not.toBe(secret.salt);
    await expect(hashPin('12')).rejects.toThrow(/4/);
  });
});
