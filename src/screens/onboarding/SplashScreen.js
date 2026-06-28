import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { colors, textStyles, fontFamilies } from '../../theme';
import { MOODS } from '../../utils/constants';
import { getSetting } from '../../db/queries/settings';

/** Animated intro — plays on first launch, then hands off. */
export default function SplashScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    const timer = setTimeout(async () => {
      const onboarded = await getSetting('onboarded', false);
      navigation.replace(onboarded ? 'MainTabs' : 'Onboarding');
    }, 2300);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.backdrop,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.Text
        entering={FadeInDown.duration(700)}
        style={{ fontFamily: fontFamilies.handBold, fontSize: 56, color: colors.clayText }}
      >
        marigold
      </Animated.Text>
      <Animated.Text
        entering={FadeIn.delay(600).duration(700)}
        style={[textStyles.label, { color: colors.mutedLabel, marginTop: 10 }]}
      >
        your quiet place to write
      </Animated.Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 26 }}>
        {MOODS.map((mood, i) => (
          <Animated.View
            key={mood.key}
            entering={FadeIn.delay(900 + i * 140).duration(400)}
            style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: mood.color }}
          />
        ))}
      </View>
    </View>
  );
}
