import { askAI, isAIReady, getSharingMode } from './geminiAI';
import { listShareableEntries } from '../db/queries/entries';
import { getTagsForEntry } from '../db/queries/tags';
import { getSetting, setSetting } from '../db/queries/settings';
import { listAllTaskLogs } from '../db/queries/tasks';
import { stripHtml } from '../utils/textUtils';
import { toDateKey } from '../utils/dateUtils';

/** Human messages for gate failures (also used by screens). */
export const ACCESS_MESSAGES = {
  AI_OFF: 'turn on AI features in settings first',
  SHARING_OFF: 'choose what the AI may see in settings first',
  CONTENT_OFF: "ask diary needs entry sharing — pick 'entries I mark' or 'everything' in settings",
  AI_LIMIT: 'AI limit exhausted — try again tomorrow',
};

async function getAccess() {
  if (!(await isAIReady())) return { ok: false, reason: 'AI_OFF' };
  const mode = await getSharingMode();
  if (mode === 'none') return { ok: false, reason: 'SHARING_OFF' };
  return { ok: true, mode };
}

/**
 * Builds the data block that is allowed to leave the device.
 * Aggregates come from UNLOCKED entries only (mode 'all' of the gate query —
 * consent-independent counts, but locked entries never count anywhere).
 * Content is appended only for 'selective'/'all', via the same gate query.
 */
async function buildContext({ sinceKey, mode }) {
  const aggRows = await listShareableEntries({ mode: 'all', sinceDateKey: sinceKey, limit: 500 });
  const moodCounts = {};
  const tagCounts = {};
  for (const entry of aggRows) {
    if (entry.mood) moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    const tags = await getTagsForEntry(entry.id);
    for (const tag of tags) tagCounts[tag.name] = (tagCounts[tag.name] || 0) + 1;
  }
  const fmt = (counts) =>
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} (${v})`)
      .join(', ') || 'none recorded';

  let context =
    `Days with entries: ${new Set(aggRows.map((e) => e.dateKey)).size}.\n` +
    `Mood counts: ${fmt(moodCounts)}.\nTags used: ${fmt(tagCounts)}.`;

  if (mode === 'selective' || mode === 'all') {
    const rows = await listShareableEntries({ mode, sinceDateKey: sinceKey, limit: 40 });
    if (rows.length) {
      context +=
        '\n\nShared entries:\n' +
        rows
          .map(
            (e) =>
              `- ${e.dateKey}${e.mood ? ` [${e.mood}]` : ''} ${e.title || 'Untitled'}: ${stripHtml(e.content).slice(0, 500)}`
          )
          .join('\n');
    }
  }
  return context;
}

/** Monday of the current week — cache key for the weekly reflection. */
function weekKey() {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toDateKey(d);
}

function monthKey() {
  return toDateKey().slice(0, 7);
}

export async function getCachedWeeklyReflection() {
  const cached = await getSetting('weeklyReflection', null);
  return cached && cached.key === weekKey() ? cached.text : null;
}

export async function generateWeeklyReflection() {
  const access = await getAccess();
  if (!access.ok) throw new Error(access.reason);
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const context = await buildContext({ sinceKey: toDateKey(since), mode: access.mode });
  const text = await askAI({
    system:
      'You are the gentle reflection voice of Marigold, a personal diary app. Given a week of ' +
      'diary data, write a warm reflection of 2 to 4 sentences, addressed to the writer as "you". ' +
      'Notice patterns kindly. Never give medical advice, never moralize, never use emoji. Plain text only.',
    userText: `My diary data for the last 7 days:\n${context}`,
    maxTokens: 300,
  });
  await setSetting('weeklyReflection', { key: weekKey(), text });
  return text;
}

export async function getCachedMonthlySummary() {
  const cached = await getSetting('monthlySummary', null);
  return cached && cached.key === monthKey() ? cached.text : null;
}

export async function generateMonthlySummary() {
  const access = await getAccess();
  if (!access.ok) throw new Error(access.reason);
  const context = await buildContext({ sinceKey: `${monthKey()}-01`, mode: access.mode });
  const text = await askAI({
    system:
      'You are the gentle reflection voice of Marigold, a personal diary app. Given a month of ' +
      'diary data, write a short month-in-review of 3 to 5 sentences, addressed to the writer as ' +
      '"you". Mention the overall mood arc and one or two specifics if entry text is available. ' +
      'Never give medical advice, never moralize, never use emoji. Plain text only.',
    userText: `My diary data for this month so far:\n${context}`,
    maxTokens: 400,
  });
  await setSetting('monthlySummary', { key: monthKey(), text });
  return text;
}

// ── Task Summary ──────────────────────────────────────────────

async function buildTaskContext() {
  const logs = await listAllTaskLogs();
  if (!logs.length) return 'No tasks logged yet.';
  const byDay = {};
  for (const log of logs) {
    const day = toDateKey(new Date(log.loggedAt));
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(`${log.label} (${log.personName})`);
  }
  return Object.entries(byDay)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 14) // last 2 weeks max
    .map(([day, tasks]) => `${day}: ${tasks.join(', ')}`)
    .join('\n');
}

export async function getCachedTaskSummary() {
  const cached = await getSetting('taskSummary', null);
  return cached && cached.key === toDateKey() ? cached.text : null;
}

export async function generateTaskSummary() {
  const access = await getAccess();
  if (!access.ok) throw new Error(access.reason);
  const context = await buildTaskContext();
  const text = await askAI({
    system:
      'You are the gentle reflection voice of Marigold, a personal diary app. Given a log of ' +
      'tasks with the person who did each, write a warm 2-to-4 sentence summary: who has been ' +
      'doing what, any patterns of consistency or imbalance, and one encouraging observation. ' +
      'Address the writer as "you". Never moralize, never use emoji. Plain text only.',
    userText: `My task log for the past two weeks (most recent first):\n${context}`,
    maxTokens: 300,
  });
  await setSetting('taskSummary', { key: toDateKey(), text });
  return text;
}

/**
 * Ask Diary: keyword-retrieve the most relevant shareable entries, answer from
 * those excerpts only. history: [{ role: 'user'|'assistant', text }].
 */
export async function answerDiaryQuestion(question, history = []) {
  const access = await getAccess();
  if (!access.ok) throw new Error(access.reason);
  if (access.mode === 'aggregates') throw new Error('CONTENT_OFF');

  const all = await listShareableEntries({ mode: access.mode, limit: 500 });
  const words = question.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  const scored = all
    .map((entry) => {
      const haystack = `${entry.title} ${stripHtml(entry.content)}`.toLowerCase();
      return { entry, score: words.reduce((s, w) => s + (haystack.includes(w) ? 1 : 0), 0) };
    })
    .sort((a, b) => b.score - a.score);
  const hits = scored.filter((s) => s.score > 0).slice(0, 6);
  const picked = (hits.length ? hits : scored.slice(0, 4)).map((s) => s.entry);
  const excerpts = picked
    .map(
      (e) =>
        `- ${e.dateKey}${e.mood ? ` [${e.mood}]` : ''} ${e.title || 'Untitled'}: ${stripHtml(e.content).slice(0, 600)}`
    )
    .join('\n');

  return askAI({
    system:
      "You are Marigold's diary companion. Answer the writer's question using ONLY the diary " +
      'excerpts below. Be warm, specific and concise (2-5 sentences). If the excerpts do not ' +
      'contain the answer, say so honestly instead of guessing. Never use emoji.\n\nExcerpts:\n' +
      (excerpts || '(no shared entries available)'),
    messages: [...history.slice(-6), { role: 'user', text: question }],
    maxTokens: 500,
  });
}
