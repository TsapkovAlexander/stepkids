/**
 * Parent gate: a multiplication a six-year-old can't solve yet but an adult solves instantly.
 * Factors 6–9 keep the product two-digit and out of the multiplication table's easy corner.
 */
export interface Challenge {
  a: number;
  b: number;
  answer: number;
}

export function createChallenge(random: () => number = Math.random): Challenge {
  const factor = () => 6 + Math.floor(random() * 4);
  const a = factor();
  const b = factor();
  return { a, b, answer: a * b };
}

export function isCorrect(challenge: Challenge, input: string): boolean {
  return /^\d{1,3}$/.test(input) && Number(input) === challenge.answer;
}
