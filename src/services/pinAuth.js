import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { SECURE_KEYS } from '../utils/constants';

/**
 * App-lock gate. SHA-256(salt + pin) stored in the device keystore via
 * expo-secure-store. A 4-digit PIN is a gate, not a vault — the salt only
 * prevents trivial hash recognition.
 */
const SALT = 'marigold.v1.';

async function hashPin(pin) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, SALT + pin);
}

export async function isPinSet() {
  return !!(await SecureStore.getItemAsync(SECURE_KEYS.pinHash));
}

export async function setPin(pin) {
  await SecureStore.setItemAsync(SECURE_KEYS.pinHash, await hashPin(pin));
}

export async function clearPin() {
  await SecureStore.deleteItemAsync(SECURE_KEYS.pinHash);
}

export async function verifyPin(pin) {
  const stored = await SecureStore.getItemAsync(SECURE_KEYS.pinHash);
  if (!stored) return false;
  return stored === (await hashPin(pin));
}

export async function canUseBiometrics() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && enrolled;
}

export async function biometricUnlock() {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock your diary',
      cancelLabel: 'Use PIN',
    });
    return result.success;
  } catch {
    return false; // never let a biometric error block PIN entry
  }
}

/** Dismiss any in-flight biometric prompt (e.g. when the user used the PIN instead). */
export async function cancelBiometrics() {
  try {
    await LocalAuthentication.cancelAuthenticate();
  } catch {}
}

/** Resolve a typed PIN to a vault: 'main' | 'secret' | null. */
export async function resolvePin(pin) {
  const entered = await hashPin(pin);
  const mainHash = await SecureStore.getItemAsync(SECURE_KEYS.pinHash);
  if (mainHash && entered === mainHash) return 'main';
  const secretHash = await SecureStore.getItemAsync(SECURE_KEYS.secretPinHash);
  if (secretHash && entered === secretHash) return 'secret';
  return null;
}

/** Whether a private-vault PIN has been set. */
export async function hasSecretPin() {
  return !!(await SecureStore.getItemAsync(SECURE_KEYS.secretPinHash));
}

/** Set the private-vault PIN. Must differ from the main app PIN. */
export async function setSecretPin(pin) {
  const h = await hashPin(pin);
  const mainHash = await SecureStore.getItemAsync(SECURE_KEYS.pinHash);
  if (mainHash && h === mainHash) {
    throw new Error('Private PIN must be different from your app PIN');
  }
  await SecureStore.setItemAsync(SECURE_KEYS.secretPinHash, h);
}

export async function clearSecretPin() {
  await SecureStore.deleteItemAsync(SECURE_KEYS.secretPinHash);
}
