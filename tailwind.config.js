/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.js', './src/**/*.{js,jsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Marigold surfaces
        backdrop: '#EFE5D3',
        paper: '#FBF6EC',
        hairline: 'rgba(59,48,38,0.08)',
        // ink
        ink: '#3B3026',
        midink: '#6E6354',
        softink: '#9B8B74',
        mutedlabel: '#B0A082',
        // accents
        clay: '#B26A47',
        claytext: '#A55F3E',
        sage: '#8FA383',
        claytint: 'rgba(178,106,71,0.10)',
        // moods
        radiant: '#D9A94E',
        calm: '#8FA383',
        steady: '#C2A878',
        heavy: '#7E8AA0',
        frayed: '#B0664B',
      },
      fontFamily: {
        serif: ['Newsreader_400Regular'],
        serifmed: ['Newsreader_500Medium'],
        hand: ['Caveat_500Medium'],
        handbold: ['Caveat_600SemiBold'],
        sans: ['HankenGrotesk_600SemiBold'],
        sansbold: ['HankenGrotesk_700Bold'],
      },
      borderRadius: {
        card: '20px',
        fab: '20px',
        pill: '999px',
      },
    },
  },
  plugins: [],
};
