import { moodColor } from '../theme';
import { fromDateKey } from './dateUtils';

const ALPHA = 0.16; // noticeable-but-soft; raise/lower to taste

function withAlpha(hex, a) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/** Northern-hemisphere season tint from month index (0-11). */
function seasonColor(month) {
  if (month <= 1 || month === 11) return '#7E8AA0'; // winter — dusty blue
  if (month <= 4) return '#8FA383'; // spring — sage
  if (month <= 7) return '#D9A94E'; // summer — warm gold
  return '#B0664B'; // autumn — rust
}

/** Temperature (°C) → warm/cool accent; null when no weather stamp. */
function tempColor(temp) {
  if (temp === null || temp === undefined) return null;
  if (temp >= 25) return '#C9743C'; // hot
  if (temp >= 15) return '#C2A878'; // mild
  if (temp >= 5) return '#8FA383'; // cool
  return '#7E8AA0'; // cold
}

/**
 * Subtle gradient for a diary page: season (top) → temperature (mid) → mood (bottom),
 * all at low alpha. Returns >= 2 rgba strings for expo-linear-gradient `colors`.
 */
export function pageGradient(entry) {
  const month = fromDateKey(entry.dateKey).getMonth();
  const stops = [withAlpha(seasonColor(month), ALPHA)];
  const temp = tempColor(entry.weatherTemp);
  if (temp) stops.push(withAlpha(temp, ALPHA * 0.9));
  if (entry.mood) stops.push(withAlpha(moodColor(entry.mood), ALPHA));
  if (stops.length < 2) stops.push('rgba(0,0,0,0)');
  return stops;
}
