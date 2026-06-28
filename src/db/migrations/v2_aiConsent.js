/**
 * v2 — per-entry AI consent flag. 0 = isolated from all AI analysis (default,
 * including every pre-existing entry); 1 = user explicitly opted this entry in.
 */
export const v2AiConsent = {
  version: 2,
  async up(txn) {
    await txn.execAsync(
      'ALTER TABLE entries ADD COLUMN aiConsent INTEGER NOT NULL DEFAULT 0;'
    );
  },
};
