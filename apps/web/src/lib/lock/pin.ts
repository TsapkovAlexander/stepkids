import type { PinSecret } from '../storage/types';

export const PIN_LENGTH = 4;
const DEFAULT_ITERATIONS = 120_000;

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(text);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

async function derive(
  pin: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

/** Salted PBKDF2 so the PIN never lies around in plain text (it is checked offline, on the device). */
export async function hashPin(pin: string, iterations = DEFAULT_ITERATIONS): Promise<PinSecret> {
  if (!isValidPin(pin)) throw new Error(`PIN должен состоять из ${PIN_LENGTH} цифр`);
  const salt = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)));
  return { hash: await derive(pin, salt, iterations), salt: toBase64(salt), iterations };
}

export async function verifyPin(pin: string, secret: PinSecret): Promise<boolean> {
  if (!isValidPin(pin)) return false;
  const hash = await derive(pin, fromBase64(secret.salt), secret.iterations);
  // Constant-time comparison is overkill for a local gate, but cheap.
  let diff = hash.length ^ secret.hash.length;
  for (let i = 0; i < Math.min(hash.length, secret.hash.length); i += 1)
    diff |= hash.charCodeAt(i) ^ secret.hash.charCodeAt(i);
  return diff === 0;
}
