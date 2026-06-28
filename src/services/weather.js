import * as Location from 'expo-location';
import { suppressAutoLock } from '../utils/autoLockGuard';

/**
 * One-shot weather for stamping entries. Returns { temp, code } (°C, WMO code)
 * or null on permission denial / offline / any error. Never throws.
 */
export async function getCurrentWeather() {
  try {
    suppressAutoLock(); // the location permission dialog backgrounds the app — don't auto-lock on return
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
    });
    const { latitude, longitude } = position.coords;
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.current_weather) return null;
    return { temp: json.current_weather.temperature, code: json.current_weather.weathercode };
  } catch {
    return null;
  }
}

/** WMO weather code → { label, glyph } (text glyphs, no icon fonts). */
export function describeWeather(code) {
  if (code === 0) return { label: 'clear', glyph: '☀' };
  if (code === 1 || code === 2) return { label: 'partly cloudy', glyph: '⛅' };
  if (code === 3) return { label: 'overcast', glyph: '☁' };
  if (code === 45 || code === 48) return { label: 'foggy', glyph: '☁' };
  if (code >= 51 && code <= 67) return { label: 'rainy', glyph: '☂' };
  if (code >= 71 && code <= 77) return { label: 'snowy', glyph: '❄' };
  if (code >= 80 && code <= 82) return { label: 'showers', glyph: '☂' };
  if (code === 85 || code === 86) return { label: 'snow showers', glyph: '❄' };
  if (code >= 95) return { label: 'stormy', glyph: '⚡' };
  return null;
}

/** '31° ☂' — or null when the entry has no stamp. */
export function formatWeatherStamp(temp, code) {
  if (temp === null || temp === undefined || code === null || code === undefined) return null;
  const described = describeWeather(code);
  return `${Math.round(temp)}°${described ? ` ${described.glyph}` : ''}`;
}
