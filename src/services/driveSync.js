import { getAccessToken } from './googleAuth';
import { exportSnapshot, importSnapshot, mergeSnapshots } from '../db/queries/backup';
import { getSessionPin, unwrapVaultKey, installVaultKey, getVaultKeyId, hasVaultKey } from './crypto';
import { importAiConfig } from './geminiAI';
import { getActiveVault } from '../db/client';

const VAULT_BACKUP_FILES = {
  main: 'marigold-backup.json',
  secret: 'marigold-secret-backup.json',
};

/** Backup filename for the ACTIVE vault — keeps each vault's Drive file separate. */
function backupFileName() {
  return VAULT_BACKUP_FILES[getActiveVault()] || VAULT_BACKUP_FILES.main;
}
const DRIVE_FILES = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';

async function authHeaders() {
  const token = await getAccessToken();
  return { Authorization: `Bearer ${token}` };
}

/** Locate the backup in appDataFolder. Returns {id, modifiedTime, size} or null. */
export async function getBackupInfo() {
  const headers = await authHeaders();
  const q = encodeURIComponent(`name='${backupFileName()}'`);
  const url = `${DRIVE_FILES}?spaces=appDataFolder&q=${q}&fields=files(id,name,modifiedTime,size)`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Drive list failed (${res.status})`);
  const json = await res.json();
  const file = json.files?.[0];
  return file
    ? { id: file.id, modifiedTime: file.modifiedTime, size: Number(file.size) || 0 }
    : null;
}

async function downloadSnapshot(id) {
  const headers = await authHeaders();
  const res = await fetch(`${DRIVE_FILES}/${id}?alt=media`, { headers });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  return res.json();
}

/** Upload a snapshot object, overwriting `existing` if given. Returns modifiedTime ISO. */
async function uploadSnapshot(snapshot, existing) {
  const headers = await authHeaders();
  const body = JSON.stringify(snapshot);
  let res;
  if (existing) {
    res = await fetch(`${DRIVE_UPLOAD}/${existing.id}?uploadType=media&fields=id,modifiedTime`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body,
    });
  } else {
    const boundary = 'marigold-' + Math.random().toString(36).slice(2);
    const metadata = { name: backupFileName(), parents: ['appDataFolder'] };
    const multipart =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify(metadata) +
      `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
      body +
      `\r\n--${boundary}--`;
    res = await fetch(`${DRIVE_UPLOAD}?uploadType=multipart&fields=id,modifiedTime`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': `multipart/related; boundary=${boundary}` },
      body: multipart,
    });
  }
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  const json = await res.json();
  return json.modifiedTime || new Date().toISOString();
}

/**
 * Two-way sync: merge local + remote (newest-wins per entry), write the merged
 * result to BOTH local DB and Drive so they converge. Returns a summary.
 */
export async function syncNow() {
  const info = await getBackupInfo();
  const remote = info ? await downloadSnapshot(info.id) : null;
  // If the backup holds entries under a DIFFERENT key, adopt that key (needs the PIN). If we can't
  // (no wrapped key / wrong PIN), ABORT — importing would write undecryptable (blank) entries.
  if (remote && (remote.entries?.length || 0) > 0) {
    const localKeyId = await getVaultKeyId();
    if (!remote.keyId || remote.keyId !== localKeyId) {
      const pin = getSessionPin();
      const dek = pin && remote.vaultKey ? unwrapVaultKey(pin, remote.vaultKey) : null;
      if (!dek) {
        const err = new Error('PIN_MISMATCH');
        err.code = 'PIN_MISMATCH';
        throw err;
      }
      await installVaultKey(dek);
    }
  }
  await importAiConfig(remote?.ai); // restore AI key/config on a fresh device
  const local = await exportSnapshot();
  const merged = mergeSnapshots(local, remote);
  await importSnapshot(merged);
  const modifiedTime = await uploadSnapshot(merged, info);
  return { modifiedTime, entries: merged.entries.length, tags: merged.tags.length };
}

/** Manual one-way push (kept for now; UI moves to syncNow). */
export async function backupNow() {
  return uploadSnapshot(await exportSnapshot(), await getBackupInfo());
}

/** Manual one-way pull (kept for now; UI moves to syncNow). */
export async function restoreFromDrive() {
  const info = await getBackupInfo();
  if (!info) throw new Error('No backup found in your Drive');
  return importSnapshot(await downloadSnapshot(info.id));
}

/** Permanently delete the active vault's Drive backup. Returns true if something was deleted. */
export async function removeBackup() {
  const info = await getBackupInfo();
  if (!info) return false;
  const headers = await authHeaders();
  const res = await fetch(`${DRIVE_FILES}/${info.id}`, { method: 'DELETE', headers });
  if (!res.ok && res.status !== 404) throw new Error(`Delete failed (${res.status})`);
  return true;
}

/**
 * Restore the active vault's backup using the PIN.
 * Returns 'none' (no backup), 'mismatch' (wrong PIN — nothing changed), or 'ok' (restored).
 */
export async function restoreFromBackup(pin) {
  const info = await getBackupInfo();
  if (!info) return 'none';
  const remote = await downloadSnapshot(info.id);
  if (!remote?.vaultKey) return 'none';
  const dek = unwrapVaultKey(pin, remote.vaultKey);
  if (!dek) return 'mismatch';
  await installVaultKey(dek);
  await importAiConfig(remote.ai);
  await importSnapshot(remote);
  return 'ok';
}

/**
 * On a brand-new device with NO local data key for the active vault, adopt that vault's backup
 * using `pin`. Returns 'same' (key already exists locally), 'none' (no backup), 'mismatch'
 * (wrong PIN — nothing changed), or 'ok' (restored). Never clobbers existing local data.
 */
export async function restoreIfFreshDevice(pin) {
  if (await hasVaultKey()) return 'same';
  const info = await getBackupInfo();
  if (!info) return 'none';
  const remote = await downloadSnapshot(info.id);
  if (!remote?.vaultKey) return 'none';
  const dek = unwrapVaultKey(pin, remote.vaultKey);
  if (!dek) return 'mismatch';
  await installVaultKey(dek);
  await importAiConfig(remote.ai);
  await importSnapshot(remote);
  return 'ok';
}
