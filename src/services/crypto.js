import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';
import { getActiveVault } from '../db/client';

const MARKER = 'enc1:'; // identifies an encrypted value (vs legacy plaintext)
const NONCE_LEN = 24; // nacl.secretbox nonce length
const KEY_LEN = 32; // nacl.secretbox key length
const KDF_ROUNDS = 20000; // PIN-stretch rounds for wrapping the data key
const keyCache = {}; // vault -> Uint8Array (in-memory, avoids repeated keystore reads)
let sessionPin = null; // entered PIN held in memory while unlocked (for key wrap/unwrap)

/** Get-or-create the active vault's data-encryption key (DEK) from secure-store. */
async function ensureVaultKey() {
  const vault = getActiveVault();
  if (keyCache[vault]) return keyCache[vault];
  const storeKey = `marigold.dek.${vault}`;
  const existing = await SecureStore.getItemAsync(storeKey);
  let key;
  if (existing) {
    key = decodeBase64(existing);
  } else {
    key = Crypto.getRandomBytes(KEY_LEN);
    await SecureStore.setItemAsync(storeKey, encodeBase64(key));
  }
  keyCache[vault] = key;
  return key;
}

/** Encrypt a string for the active vault. null/'' pass through unchanged. */
export async function encryptString(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === '') return plaintext;
  const key = await ensureVaultKey();
  const nonce = Crypto.getRandomBytes(NONCE_LEN);
  const box = nacl.secretbox(decodeUTF8(plaintext), nonce, key);
  const combined = new Uint8Array(nonce.length + box.length);
  combined.set(nonce);
  combined.set(box, nonce.length);
  return MARKER + encodeBase64(combined);
}

/**
 * Deterministic encryption: same plaintext → same ciphertext (nonce derived from a
 * keyed hash of the plaintext). Keeps UNIQUE/equality lookups working (tag names).
 * decryptString reads it back like any other value.
 */
export async function encryptDeterministic(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === '') return plaintext;
  const key = await ensureVaultKey();
  const msg = decodeUTF8(plaintext);
  const seed = new Uint8Array(key.length + msg.length);
  seed.set(key);
  seed.set(msg, key.length);
  const nonce = nacl.hash(seed).slice(0, NONCE_LEN); // deterministic + keyed
  const box = nacl.secretbox(msg, nonce, key);
  const combined = new Uint8Array(nonce.length + box.length);
  combined.set(nonce);
  combined.set(box, nonce.length);
  return MARKER + encodeBase64(combined);
}

/** Decrypt a value. Legacy plaintext (no marker) returns unchanged. */
export async function decryptString(value) {
  if (typeof value !== 'string' || !value.startsWith(MARKER)) return value;
  const key = await ensureVaultKey();
  const combined = decodeBase64(value.slice(MARKER.length));
  const nonce = combined.slice(0, NONCE_LEN);
  const box = combined.slice(NONCE_LEN);
  const opened = nacl.secretbox.open(box, nonce, key);
  if (!opened) return ''; // wrong key / tampered — fail safe
  return encodeUTF8(opened);
}

/** True if a value is in our encrypted format. */
export function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(MARKER);
}

/** Drop cached keys from memory (call on lock). */
export function clearKeyCache() {
  for (const k of Object.keys(keyCache)) delete keyCache[k];
}

/** True if the active vault already has a data key stored (without creating one). */
export async function hasVaultKey() {
  const vault = getActiveVault();
  if (keyCache[vault]) return true;
  return !!(await SecureStore.getItemAsync(`marigold.dek.${vault}`));
}

// --- session PIN (held in memory while unlocked, for key wrap/unwrap) ---
export function setSessionPin(pin) {
  sessionPin = pin;
}
export function getSessionPin() {
  return sessionPin;
}
export function clearSessionPin() {
  sessionPin = null;
}

/** Stretch a PIN + salt into a 32-byte key-encryption key (slows brute force). */
function deriveKEK(pin, saltBytes) {
  const pinBytes = decodeUTF8(String(pin));
  let h = new Uint8Array(saltBytes.length + pinBytes.length);
  h.set(saltBytes);
  h.set(pinBytes, saltBytes.length);
  for (let i = 0; i < KDF_ROUNDS; i++) h = nacl.hash(h);
  return h.slice(0, KEY_LEN);
}

/** Wrap the active vault's data key with the PIN — for inclusion in a backup. */
export async function wrapVaultKey(pin) {
  const dek = await ensureVaultKey();
  const salt = Crypto.getRandomBytes(16);
  const kek = deriveKEK(pin, salt);
  const nonce = Crypto.getRandomBytes(NONCE_LEN);
  const box = nacl.secretbox(dek, nonce, kek);
  return { v: 1, salt: encodeBase64(salt), nonce: encodeBase64(nonce), box: encodeBase64(box) };
}

/** Unwrap a backup's data key with the PIN. Returns the DEK bytes, or null on wrong PIN. */
export function unwrapVaultKey(pin, wrapped) {
  if (!pin || !wrapped || !wrapped.salt || !wrapped.box || !wrapped.nonce) return null;
  const kek = deriveKEK(pin, decodeBase64(wrapped.salt));
  const dek = nacl.secretbox.open(decodeBase64(wrapped.box), decodeBase64(wrapped.nonce), kek);
  return dek || null;
}

/** Store a DEK as the active vault's data key (replaces any existing). */
export async function installVaultKey(dek) {
  const vault = getActiveVault();
  await SecureStore.setItemAsync(`marigold.dek.${vault}`, encodeBase64(dek));
  keyCache[vault] = dek;
  await SecureStore.deleteItemAsync(`marigold.wrappedkey.${vault}`); // stale after key change; re-armed on next PIN entry
}

/** Unwrap + install in one step. Returns true on success, false on wrong PIN. */
export async function installWrappedKey(pin, wrapped) {
  const dek = unwrapVaultKey(pin, wrapped);
  if (!dek) return false;
  await installVaultKey(dek);
  return true;
}

/** Short fingerprint of the active vault's data key — identifies which key encrypted a backup. */
export async function getVaultKeyId() {
  const dek = await ensureVaultKey();
  return encodeBase64(nacl.hash(dek)).slice(0, 22);
}

/** Persist the active vault's DEK wrapped by `pin`, so backups always carry a recoverable key even
 *  when the PIN isn't in memory (e.g. after a biometric unlock). Call after a PIN is verified/set. */
export async function armBackupKey(pin) {
  if (!pin) return;
  const wrapped = await wrapVaultKey(pin);
  await SecureStore.setItemAsync(`marigold.wrappedkey.${getActiveVault()}`, JSON.stringify(wrapped));
}

/** The persisted PIN-wrapped DEK for the active vault, or null. */
export async function getStoredWrappedKey() {
  const raw = await SecureStore.getItemAsync(`marigold.wrappedkey.${getActiveVault()}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
