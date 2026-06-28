import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, textStyles, spacing, radii, shadows, fontFamilies } from '../../theme';

const APP_VERSION = '0.1.0'; // keep in sync with app.json

export default function AboutScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.backdrop, paddingTop: insets.top + 12 }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.screenX, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.clayText }}>← back</Text>
        </Pressable>

        {/* header card */}
        <View style={{ backgroundColor: colors.paper, borderRadius: radii.cardLarge, borderWidth: 1, borderColor: colors.cardBorder, padding: spacing.cardPadding + 6, marginTop: 16, alignItems: 'center', ...shadows.card }}>
          <Text style={{ fontFamily: fontFamilies.handBold, fontSize: 44, color: colors.clayText, alignSelf: 'stretch', textAlign: 'center' }}>Marigold</Text>
          <Text style={[textStyles.caption, { color: colors.mutedLabel, marginTop: 2 }]}>version {APP_VERSION}</Text>
          <Text style={{ fontFamily: fontFamilies.sans, fontSize: 14, color: colors.softInk, marginTop: 10, textAlign: 'center', lineHeight: 20 }}>
            A calm, private place for your thoughts.
          </Text>
          <View style={{ height: 1, alignSelf: 'stretch', backgroundColor: colors.hairline, marginVertical: 16 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image
              source={require('../../../assets/vrwdLogo.png')}
              style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12, overflow: 'hidden' }}
              resizeMode="cover"
            />
            <View>
              <Text style={[textStyles.caption, { color: colors.softInk }]}>crafted by</Text>
              <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 16, color: colors.ink }}>VR Web Devs</Text>
            </View>
          </View>
        </View>

        {/* How Marigold works → its own page */}
        <Pressable onPress={() => navigation.navigate('HowItWorks')} hitSlop={8}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.paper,
              borderRadius: radii.card,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              padding: spacing.cardPadding,
              marginTop: spacing.sectionGap,
            }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 999, backgroundColor: colors.clayTint, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
              <Feather name="info" size={18} color={colors.clayText} />
            </View>
            <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 17, color: colors.ink, flex: 1 }}>
              How Marigold works
            </Text>
            <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 20, color: colors.clayText }}>→</Text>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}
