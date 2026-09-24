import { hashPin } from '../lock/pin';
import { db } from './db';
import type { PinSecret } from './types';

export async function getPin(): Promise<PinSecret | null> {
  return (await db().family.get('family'))?.pin ?? null;
}

export async function setPin(pin: string): Promise<void> {
  await db().family.put({ key: 'family', pin: await hashPin(pin) });
}

export async function clearPin(): Promise<void> {
  await db().family.put({ key: 'family', pin: null });
}
