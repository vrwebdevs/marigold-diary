import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useEntries, useEntryDateKeys, useEntryTotals } from './useEntries';
import { useTags } from './useTags';
import { getTagMoodRows } from '../db/queries/tags';
import { computeCurrentStreak, computeLongestStreak } from '../utils/streakUtils';
import { toDateKey, fromDateKey } from '../utils/dateUtils';
import { moodList } from '../theme';

/**
 * All Insights numbers derived client-side from the local DB.
 * Monthly AI summary is NOT here — it arrives with Phase 8.
 */
export function useInsights() {
  const { data: entries, isLoading: l1 } = useEntries({ limit: 1000 });
  const { data: dateRows, isLoading: l2 } = useEntryDateKeys();
  const { data: totals, isLoading: l3 } = useEntryTotals();
  const { data: tags } = useTags();
  const { data: tagMoodRows } = useQuery({ queryKey: ['tagMoods'], queryFn: getTagMoodRows });

  return useMemo(() => {
    const list = entries || [];
    // positivity score from the current emotion order: top of the list scores highest
    const moodScores = {};
    moodList.forEach((m, i) => {
      moodScores[m.key] = moodList.length - i;
    });
    const dateKeys = (dateRows || []).map((row) => row.dateKey);

    const currentStreak = computeCurrentStreak(dateKeys);
    const longestStreak = computeLongestStreak(dateKeys);
    const totalEntries = totals?.totalEntries ?? 0;
    const totalWords = totals?.totalWords ?? 0;
    const avgWords = totalEntries ? Math.round(totalWords / totalEntries) : 0;

    const monthPrefix = toDateKey().slice(0, 7);
    const entriesThisMonth = list.filter((e) => e.dateKey.startsWith(monthPrefix)).length;

    // mood line: average score per day, last 30 days, only days with a mood
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceKey = toDateKey(since);
    const byDay = new Map();
    for (const entry of list) {
      if (entry.dateKey >= sinceKey && moodScores[entry.mood]) {
        if (!byDay.has(entry.dateKey)) byDay.set(entry.dateKey, []);
        byDay.get(entry.dateKey).push(moodScores[entry.mood]);
      }
    }
    const moodLine = [...byDay.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([key, scores], i) => ({
        value: scores.reduce((sum, v) => sum + v, 0) / scores.length,
        label:
          i % 5 === 0
            ? fromDateKey(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : '',
      }));

    const moodCounts = {};
    for (const entry of list) {
      if (entry.mood) moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    }

    // --- patterns / correlations ---
    const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const patterns = [];
    if (list.length >= 5) {
      const dayScores = {};
      const dayCounts = {};
      const timeBuckets = { morning: 0, afternoon: 0, evening: 0, night: 0 };
      for (const e of list) {
        const wd = fromDateKey(e.dateKey).getDay();
        dayCounts[wd] = (dayCounts[wd] || 0) + 1;
        if (moodScores[e.mood]) (dayScores[wd] = dayScores[wd] || []).push(moodScores[e.mood]);
        const h = new Date(e.createdAt).getHours();
        const b = h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 17 ? 'afternoon' : h >= 17 && h < 22 ? 'evening' : 'night';
        timeBuckets[b] += 1;
      }
      let bright = null;
      for (const wd of Object.keys(dayScores)) {
        const arr = dayScores[wd];
        if (arr.length >= 2) {
          const avg = arr.reduce((s, v) => s + v, 0) / arr.length;
          if (!bright || avg > bright.avg) bright = { wd: Number(wd), avg };
        }
      }
      if (bright) patterns.push({ icon: 'sun', text: `You tend to feel brightest on ${WEEKDAYS[bright.wd]}s.` });

      let active = null;
      for (const wd of Object.keys(dayCounts)) {
        if (!active || dayCounts[wd] > active.count) active = { wd: Number(wd), count: dayCounts[wd] };
      }
      if (active && active.count >= 2) patterns.push({ icon: 'edit-3', text: `You write most often on ${WEEKDAYS[active.wd]}s.` });

      const topTime = Object.entries(timeBuckets).sort((a, b) => b[1] - a[1])[0];
      if (topTime && topTime[1] >= 2) patterns.push({ icon: 'clock', text: `You usually write in the ${topTime[0]}.` });
    }

    const tagScores = {};
    for (const row of tagMoodRows || []) {
      if (moodScores[row.mood]) (tagScores[row.name] = tagScores[row.name] || []).push(moodScores[row.mood]);
    }
    const tagAvgs = Object.entries(tagScores)
      .filter(([, arr]) => arr.length >= 2)
      .map(([name, arr]) => ({ name, avg: arr.reduce((s, v) => s + v, 0) / arr.length }))
      .sort((a, b) => b.avg - a.avg);
    if (tagAvgs.length >= 1) {
      patterns.push({ icon: 'tag', text: `Entries tagged #${tagAvgs[0].name} are your brightest.` });
      const low = tagAvgs[tagAvgs.length - 1];
      if (tagAvgs.length >= 2 && low.name !== tagAvgs[0].name) {
        patterns.push({ icon: 'tag', text: `#${low.name} entries tend to be heavier.` });
      }
    }

    return {
      currentStreak,
      longestStreak,
      totalEntries,
      totalWords,
      avgWords,
      entriesThisMonth,
      moodLine,
      moodCounts,
      patterns,
      moodCount: moodList.length,
      tags: tags || [],
      isLoading: l1 || l2 || l3,
    };
  }, [entries, dateRows, totals, tags, tagMoodRows, l1, l2, l3]);
}
