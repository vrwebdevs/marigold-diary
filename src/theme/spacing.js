/**
 * Marigold spacing, radii and shadow tokens.
 */
export const spacing = {
  screenX: 22, // horizontal screen padding
  cardPadding: 18,
  gap: 12,
  gapLarge: 20,
  sectionGap: 28,
};

export const radii = {
  card: 20, // cards: 18–22 range, 20 default
  cardLarge: 22,
  fab: 20, // squircle feel
  pill: 999, // chips, tags, pills
  input: 14,
};

/**
 * Warm shadows (never gray). Includes Android elevation.
 * Spread into a style object: { ...shadows.card }
 */
export const shadows = {
  card: {
    shadowColor: 'rgba(59,48,38,1)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  clay: {
    shadowColor: 'rgba(150,80,50,1)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 28,
    elevation: 8,
  },
};
