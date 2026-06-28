import { useQuery } from '@tanstack/react-query';
import { getSetting, setSetting } from '../db/queries/settings';
import { generateWritingPrompt } from '../services/geminiAI';
import { toDateKey, formatFullDate } from '../utils/dateUtils';

/**
 * Today's writing prompt, cached one-per-day in the settings table.
 * source: 'ai' (text set) | 'static' (no key / failure) | 'limit' (quota exhausted).
 */
export function useWritingPrompt() {
  return useQuery({
    queryKey: ['writingPrompt', toDateKey()],
    queryFn: async () => {
      const todayKey = toDateKey();
      const cached = await getSetting('dailyPrompt', null);
      if (cached && cached.dateKey === todayKey && cached.text) {
        return cached;
      }
      try {
        const text = await generateWritingPrompt(formatFullDate(new Date()));
        const fresh = { dateKey: todayKey, text, source: 'ai' };
        await setSetting('dailyPrompt', fresh);
        return fresh;
      } catch (err) {
        const source = err.message === 'AI_LIMIT' ? 'limit' : 'static';
        if (err.message !== 'NO_API_KEY') {
          console.warn('[geminiAI] prompt generation failed:', err?.message);
        }
        return { dateKey: todayKey, text: null, source };
      }
    },
    staleTime: 60 * 60 * 1000,
  });
}
