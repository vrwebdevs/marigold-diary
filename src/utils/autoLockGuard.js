let suppressedUntil = 0;

/**
 * Suppress auto-lock for `ms` — call right before any native dialog/activity that backgrounds the
 * app (permission prompts, share sheets, OAuth) so the resume isn't treated as "the user left".
 */
export function suppressAutoLock(ms = 60000) {
  suppressedUntil = Date.now() + ms;
}

export function autoLockSuppressed() {
  return Date.now() < suppressedUntil;
}
