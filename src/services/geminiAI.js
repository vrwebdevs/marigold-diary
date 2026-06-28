import * as SecureStore from 'expo-secure-store';
import { SECURE_KEYS } from '../utils/constants';
import { encryptString, decryptString } from './crypto';

const API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// No bundled API key — AI prompts require the user's own key (kept in secure-store).

/**
 * Error contract (check err.message):
 *  'NO_API_KEY'  — no usable key for this call
 *  'AI_LIMIT'    — daily free quota exhausted (HTTP 429)
 *  'INVALID_KEY' — key rejected (HTTP 400/403)
 */

export async function getUserApiKey() {
  return SecureStore.getItemAsync(SECURE_KEYS.geminiApiKey);
}

export async function hasUserApiKey() {
  return !!(await getUserApiKey());
}

/** Pass null/'' to remove the stored key. */
export async function setUserApiKey(key) {
  const trimmed = (key || '').trim();
  if (trimmed) {
    await SecureStore.setItemAsync(SECURE_KEYS.geminiApiKey, trimmed);
  } else {
    await SecureStore.deleteItemAsync(SECURE_KEYS.geminiApiKey);
  }
}

/** AI on/off — device-global so it's shared across vaults (like the key). */
export async function getAiEnabledFlag() {
  return (await SecureStore.getItemAsync(SECURE_KEYS.aiEnabled)) === '1';
}

export async function setAiEnabledFlag(value) {
  await SecureStore.setItemAsync(SECURE_KEYS.aiEnabled, value ? '1' : '0');
}

/** AI toggle + key — the gate for every AI feature. Both are device-global. */
export async function isAIReady() {
  return (await getAiEnabledFlag()) && (await hasUserApiKey());
}

/** Sharing mode (device-global): 'none' (default) | 'aggregates' | 'selective' | 'all'. */
export async function getSharingMode() {
  return (await SecureStore.getItemAsync(SECURE_KEYS.aiSharingMode)) || 'none';
}

export async function setSharingMode(mode) {
  await SecureStore.setItemAsync(SECURE_KEYS.aiSharingMode, mode);
}

async function callGemini(apiKey, { system, userText, messages, maxTokens = 1024 }) {
  const contents = (messages || [{ role: 'user', text: userText }]).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }));
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
      contents,
      generationConfig: {
        maxOutputTokens: maxTokens,
        // gemini-2.5-flash is a thinking model — without this, short token budgets
        // are consumed by internal thoughts and the response text comes back empty
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });
  const json = await res.json().catch(() => null);
  if (res.status === 429) throw new Error('AI_LIMIT');
  if (res.status === 400 || res.status === 403) throw new Error('INVALID_KEY');
  if (!res.ok) {
    throw new Error(json?.error?.message || `Gemini error (HTTP ${res.status})`);
  }
  const text = (json?.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || '')
    .join('')
    .trim();
  if (!text) throw new Error('EMPTY_RESPONSE');
  return text;
}

/**
 * All AI features EXCEPT the daily prompt — user key required, dev key never used.
 * { system, userText, maxTokens } or { system, messages, maxTokens } where messages
 * is [{ role: 'user'|'assistant', text }] for multi-turn (Ask Diary).
 * Callers must source entry content EXCLUSIVELY from listShareableEntries().
 */
export async function askAI(options) {
  const key = await getUserApiKey();
  if (!key) throw new Error('NO_API_KEY');
  return callGemini(key, options);
}

/** Daily prompt: user key only. No key → NO_API_KEY → screen falls back to STATIC_PROMPTS. Zero personal data. */
export async function generateWritingPrompt(dateLabel) {
  const key = await getUserApiKey();
  if (!key) throw new Error('NO_API_KEY');
  return callGemini(key, {
    system:
      'You write a single, short journaling prompt for Marigold, a warm personal diary app. ' +
      'The prompt should be reflective, specific and gentle — never cheesy or generic. ' +
      'Under 18 words. Reply with ONLY the prompt text: no quotes, no preamble, no emoji.',
    userText: `Write one fresh journaling prompt for ${dateLabel}.`,
    maxTokens: 100,
  });
}

/** Key check — a quota-exhausted key is still a VALID key. */
export async function verifyUserApiKey() {
  try {
    await askAI({ userText: 'Reply with the word: ok', maxTokens: 8 });
    return true;
  } catch (err) {
    return err.message === 'AI_LIMIT';
  }
}

/** Bundle the AI config for backup (the key is encrypted with the active vault key). */
export async function exportAiConfig() {
  const key = await getUserApiKey();
  return {
    apiKey: key ? await encryptString(key) : null,
    enabled: await getAiEnabledFlag(),
    sharingMode: await getSharingMode(),
  };
}

/** Restore AI config from a backup. No-op if this device already has a key (avoids clobbering). */
export async function importAiConfig(ai) {
  if (!ai || !ai.apiKey) return;
  if (await hasUserApiKey()) return;
  const key = await decryptString(ai.apiKey);
  if (!key) return; // couldn't decrypt (wrong/absent vault key)
  await setUserApiKey(key);
  if (typeof ai.enabled === 'boolean') await setAiEnabledFlag(ai.enabled);
  if (ai.sharingMode) await setSharingMode(ai.sharingMode);
}
