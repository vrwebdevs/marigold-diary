/**
 * Marigold typography tokens.
 * Families map to the keys registered with expo-font in App.js.
 * textStyles is a MUTABLE singleton — applyFontScale rebuilds it in place
 * (the nav tree remounts afterwards, same mechanism as theming).
 */
export const fontFamilies = {
  serif: 'Newsreader_400Regular', // content: entry body, excerpts
  serifMedium: 'Newsreader_500Medium', // titles, big dates, headings
  hand: 'Caveat_500Medium', // warmth accents: greeting, daily prompt ONLY
  handBold: 'Caveat_600SemiBold', // daily prompt
  sans: 'HankenGrotesk_600SemiBold', // all functional UI text + micro labels
  sansBold: 'HankenGrotesk_700Bold', // nav labels, stat captions
};

export const fontSizes = {
  micro: 12, // uppercase labels, nav
  caption: 13, // stat captions
  small: 14, // metadata
  hand: 15, // small handwriting accents
  body: 18, // entry body (serif)
  handLarge: 22, // greeting handwriting
  title: 24, // entry titles
  heading: 28, // screen headings
  display: 34, // big dates, hero numerals
};

export const lineHeights = {
  body: 32, // 18px serif body
  title: 30,
  heading: 36,
  display: 40,
};

export const letterSpacing = {
  label: 1.5, // ALL Hanken uppercase labels
};

function buildTextStyles(scale) {
  const s = (n) => Math.round(n * scale);
  return {
    body: {
      fontFamily: fontFamilies.serif,
      fontSize: s(fontSizes.body),
      lineHeight: s(lineHeights.body),
    },
    title: {
      fontFamily: fontFamilies.serifMedium,
      fontSize: s(fontSizes.title),
      lineHeight: s(lineHeights.title),
    },
    heading: {
      fontFamily: fontFamilies.serifMedium,
      fontSize: s(fontSizes.heading),
      lineHeight: s(lineHeights.heading),
    },
    display: {
      fontFamily: fontFamilies.serifMedium,
      fontSize: s(fontSizes.display),
      lineHeight: s(lineHeights.display),
    },
    greeting: {
      fontFamily: fontFamilies.hand,
      fontSize: s(fontSizes.handLarge),
    },
    handAccent: {
      fontFamily: fontFamilies.hand,
      fontSize: s(fontSizes.hand),
    },
    prompt: {
      fontFamily: fontFamilies.handBold,
      fontSize: s(20),
      lineHeight: s(28),
    },
    label: {
      fontFamily: fontFamilies.sans,
      fontSize: s(fontSizes.micro),
      letterSpacing: letterSpacing.label,
      textTransform: 'uppercase',
    },
    labelBold: {
      fontFamily: fontFamilies.sansBold,
      fontSize: s(fontSizes.micro),
      letterSpacing: letterSpacing.label,
      textTransform: 'uppercase',
    },
    caption: {
      fontFamily: fontFamilies.sans,
      fontSize: s(fontSizes.caption),
    },
  };
}

/**
 * Ready-made text style presets. Spread into a <Text> style prop:
 *   <Text style={textStyles.body}>
 */
export const textStyles = buildTextStyles(1);

/** scale: 0.9 | 1 | 1.15 — rebuilds every preset in place. */
export function applyFontScale(scale) {
  Object.assign(textStyles, buildTextStyles(scale || 1));
}
