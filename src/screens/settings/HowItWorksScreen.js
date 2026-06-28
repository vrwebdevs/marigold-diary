import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, textStyles, spacing, radii, shadows, fontFamilies } from '../../theme';

const TOPICS = [
  {
    icon: 'home',
    title: 'Home',
    body:
      'Your daily landing. A handwritten greeting, today’s AI-written prompt to spark a thought, ' +
      'your writing streak and heatmap, and three quick tools — Search, On This Day, and Ask Diary. ' +
      'The “My Diary” card opens your book.',
  },
  {
    icon: 'book',
    title: 'Journal',
    body:
      'Every entry, newest first. Filter by emotion or tag with the dropdowns, search your writing, ' +
      'and tap the + button to write. Each card shows the date, mood, tags and a short preview.',
  },
  {
    icon: 'bar-chart-2',
    title: 'Insights',
    body:
      'Your patterns over time — writing streaks, a 30-day mood line, your mood mix (tap a mood to ' +
      'jump to those entries), tag usage, and gentle “patterns” like which day you tend to feel ' +
      'brightest. With AI on, it can also reflect on your week or month.',
  },
  {
    icon: 'user',
    title: 'You',
    body:
      'Your hub — your account & Google Drive sync, managing tags and emotions, AI settings, ' +
      'reminders, appearance (themes + text size), and privacy (app lock & entry locks).',
  },
  {
    icon: 'edit-3',
    title: 'Writing an entry',
    body:
      'Give it a title, pick how you feel, add tags, and write with rich formatting. A weather stamp ' +
      'is added automatically. Tick “can share this entry with AI” only if you want this entry ' +
      'available to AI features — it’s off by default.',
  },
  {
    icon: 'book-open',
    title: 'My Diary (the book)',
    body:
      '“My Diary” turns your entries into a book you flip through, newest first. Each page is ' +
      'softly tinted by a blend of that day’s mood, the season, and the weather.',
  },
  {
    icon: 'cpu',
    title: 'AI & your privacy',
    body:
      'AI is optional and uses your own free Gemini key. The daily prompt sends no personal data — ' +
      'only today’s date. For Ask Diary and reflections you choose what AI may see: nothing, just ' +
      'moods & tags, only entries you mark ✨, or everything. Locked entries are NEVER sent. Your ' +
      'key is stored only on your phone.',
  },
  {
    icon: 'shield',
    title: 'Privacy & security',
    body:
      'Lock the app with a PIN or fingerprint, with auto-lock when you leave it. Your entry text, ' +
      'titles and tag names are encrypted on the device, so the data is unreadable without your phone. ' +
      'Individual entries can be locked too.',
  },
  {
    icon: 'refresh-cw',
    title: 'Sync & backup',
    body:
      'Connect Google Drive to back up and sync. It’s two-way and private (a hidden app folder only ' +
      'Marigold can see), and your encrypted backup can be restored on a new phone using your PIN.',
  },
];

function Section({ topic, open, onToggle }) {
  return (
    <View
      style={{
        backgroundColor: colors.paper,
        borderRadius: radii.card,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        marginBottom: spacing.gap,
        overflow: 'hidden',
      }}
    >
      <Pressable onPress={onToggle} style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.cardPadding }}>
        <View style={{ width: 36, height: 36, borderRadius: 999, backgroundColor: colors.clayTint, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
          <Feather name={topic.icon} size={18} color={colors.clayText} />
        </View>
        <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 17, color: colors.ink, flex: 1 }}>{topic.title}</Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.softInk} />
      </Pressable>
      {open ? (
        <Text style={{ fontFamily: fontFamilies.sans, fontSize: 14, lineHeight: 22, color: colors.midInk, paddingHorizontal: spacing.cardPadding, paddingBottom: spacing.cardPadding }}>
          {topic.body}
        </Text>
      ) : null}
    </View>
  );
}

export default function HowItWorksScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(null);

  return (
    <View style={{ flex: 1, backgroundColor: colors.backdrop, paddingTop: insets.top + 12 }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.screenX, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.clayText }}>← back</Text>
        </Pressable>
        <Text style={[textStyles.heading, { color: colors.ink, marginTop: 14, marginBottom: 16 }]}>
          How Marigold works
        </Text>

        {TOPICS.map((t, i) => (
          <Section key={t.title} topic={t} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
        ))}

        {/* private vault */}
        <View style={{ backgroundColor: colors.paper, borderRadius: radii.cardLarge, borderWidth: 1, borderColor: colors.cardBorder, padding: spacing.cardPadding + 4, marginTop: spacing.sectionGap, ...shadows.card }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Feather name="lock" size={18} color={colors.clayText} style={{ marginRight: 10 }} />
            <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 17, color: colors.ink }}>The private space</Text>
          </View>
          <Text style={{ fontFamily: fontFamilies.sans, fontSize: 14, lineHeight: 22, color: colors.midInk }}>
            Marigold can hold a hidden, completely separate diary behind its own PIN — your normal entries
            and the private ones never mix.{'\n\n'}
            • To create it: open You → My account and long-press the “My account” title, then choose a private PIN.{'\n'}
            • To open it: on the lock screen, type the private PIN instead of your normal one.{'\n'}
            • Fingerprint always opens your normal diary, never the private one.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
