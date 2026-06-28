import * as Crypto from 'expo-crypto';

/** UUID v4 for entry/tag primary keys. */
export function generateId() {
  return Crypto.randomUUID();
}

/** ISO timestamp for createdAt/updatedAt columns. */
export function nowISO() {
  return new Date().toISOString();
}
