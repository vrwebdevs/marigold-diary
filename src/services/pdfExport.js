import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { suppressAutoLock } from '../utils/autoLockGuard';
import * as FileSystem from 'expo-file-system';
import { listEntries } from '../db/queries/entries';
import { getTagsForEntry } from '../db/queries/tags';
import { getAllSettings } from '../db/queries/settings';
import { colors } from '../theme';
import { moodByKey } from '../utils/constants';
import { formatFullDate, fromDateKey, toDateKey } from '../utils/dateUtils';

const PAGE_STYLE = `
  body { font-family: Georgia, 'Times New Roman', serif; color: ${colors.ink};
         background: #ffffff; margin: 36px 44px; }
  .entry { page-break-inside: avoid; margin-bottom: 36px; border-bottom: 1px solid #e8e0d2;
           padding-bottom: 28px; }
  .date { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #b0a082; }
  .title { font-size: 24px; margin: 6px 0 2px; }
  .meta { font-size: 13px; color: #9b8b74; margin-bottom: 12px; }
  .mood-dot { display: inline-block; width: 9px; height: 9px; border-radius: 9px;
              margin-right: 5px; vertical-align: baseline; }
  .content { font-size: 15px; line-height: 1.8; color: #4a4036; }
  .content p { margin: 0 0 12px; }
  .tags { font-size: 12px; color: #a55f3e; margin-top: 10px; }
  .cover { text-align: center; margin: 120px 0 80px; page-break-after: always; }
  .cover h1 { font-size: 44px; margin: 0; }
  .cover p { color: #9b8b74; letter-spacing: 2px; text-transform: uppercase; font-size: 12px; }
`;

function entryHtml(entry, tags) {
  const mood = moodByKey(entry.mood);
  return `
    <div class="entry">
      <div class="date">${formatFullDate(fromDateKey(entry.dateKey))}</div>
      ${entry.title ? `<div class="title">${escapeHtml(entry.title)}</div>` : ''}
      <div class="meta">
        ${mood ? `<span class="mood-dot" style="background:${mood.color}"></span>${mood.label} · ` : ''}
        ${entry.wordCount} words
      </div>
      <div class="content">${entry.content || ''}</div>
      ${tags.length ? `<div class="tags">${tags.map((t) => `#${escapeHtml(t.name)}`).join('  ')}</div>` : ''}
    </div>`;
}

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function wrapDocument(body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>${PAGE_STYLE}</style></head><body>${body}</body></html>`;
}

async function sharePdf(html, dialogTitle) {
  const { uri } = await Print.printToFileAsync({ html });
  suppressAutoLock();
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle });
}

/** One entry → PDF → share sheet. */
export async function exportEntryPdf(entry) {
  const tags = await getTagsForEntry(entry.id);
  await sharePdf(wrapDocument(entryHtml(entry, tags)), 'Export entry');
}

/** Whole diary (newest first) → PDF with cover page → share sheet. */
export async function exportDiaryPdf(diaryName) {
  const entries = await listEntries({ limit: 5000 });
  let body = `<div class="cover"><h1>${escapeHtml(diaryName)}</h1>
    <p>exported ${formatFullDate(new Date())} · ${entries.length} entries</p></div>`;
  for (const entry of entries) {
    const tags = await getTagsForEntry(entry.id);
    body += entryHtml(entry, tags);
  }
  await sharePdf(wrapDocument(body), 'Export diary');
}

/** Whole diary → JSON backup file → share sheet. Secrets never live in this data. */
export async function exportDiaryJson(diaryName) {
  const entries = await listEntries({ limit: 5000 });
  const withTags = [];
  for (const entry of entries) {
    const tags = await getTagsForEntry(entry.id);
    withTags.push({ ...entry, tags: tags.map((t) => t.name) });
  }
  const payload = {
    app: 'Marigold',
    format: 1,
    diaryName,
    exportedAt: new Date().toISOString(),
    settings: await getAllSettings(),
    entries: withTags,
  };
  const uri = `${FileSystem.cacheDirectory}marigold-backup-${toDateKey()}.json`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2));
  suppressAutoLock();
  await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Export backup' });
}
