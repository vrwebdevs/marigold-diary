let lastActivityAt = Date.now();

export function resetActivity() {
  lastActivityAt = Date.now();
}

export function getLastActivityAt() {
  return lastActivityAt;
}
