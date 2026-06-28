import { Pressable, Text, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontFamilies } from '../../theme';
import BookPage from '../../components/BookPage';
import { useEntries } from '../../hooks/useEntries';
import ScreenLoader from '../../components/ScreenLoader';

/** The diary as a book: newest entry first, swipe to turn pages (smooth pager). */
export default function BookScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { data: entries, isLoading } = useEntries({ sort: 'newest', limit: 500 });
  const count = entries?.length ?? 0;

  if (isLoading) return <ScreenLoader />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.backdrop, paddingTop: insets.top + 16 }}>
      <Pressable
        onPress={() => navigation.goBack()}
        hitSlop={10}
        style={{ paddingHorizontal: spacing.screenX, marginBottom: 6 }}
      >
        <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.clayText }}>← back</Text>
      </Pressable>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          paddingHorizontal: spacing.screenX,
          marginBottom: 14,
        }}
      >
        <Text style={{ fontFamily: fontFamilies.handBold, fontSize: 30, color: colors.clayText, flex: 1 }}>
          My diary
        </Text>
        <Text style={{ fontFamily: fontFamilies.sans, fontSize: 13, color: colors.softInk }}>
          swipe to turn the page
        </Text>
      </View>

      {count === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.softInk }}>
            your diary is empty — write something
          </Text>
        </View>
      ) : (
        <PagerView style={{ flex: 1 }} initialPage={0} offscreenPageLimit={1}>
          {entries.map((entry, i) => (
            <View key={entry.id} style={{ flex: 1 }}>
              <BookPage
                entry={entry}
                pageNumber={i + 1}
                pageCount={count}
                onOpen={() => navigation.navigate('EntryDetail', { entryId: entry.id })}
              />
            </View>
          ))}
        </PagerView>
      )}
    </View>
  );
}
