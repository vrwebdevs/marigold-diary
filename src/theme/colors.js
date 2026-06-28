import { THEMES } from './themes';

/**
 * Marigold color tokens — a MUTABLE singleton. Components read these at render
 * time; applyTheme swaps every value in place, and the navigation tree remounts
 * (key change in RootNavigator) so every screen re-renders with the new palette.
 * Never hardcode hex values in components.
 */
export const colors = { ...THEMES.light, moods: { ...THEMES.light.moods } };

export function applyTheme(name) {
  const theme = THEMES[name] || THEMES.light;
  Object.assign(colors, theme, { moods: { ...theme.moods } });
}
