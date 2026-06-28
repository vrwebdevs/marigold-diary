import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, textStyles } from '../theme';

/** Marigold bottom nav: Hanken uppercase labels, clay dot under active, no icons. */
export default function MarigoldTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.paper,
        borderTopWidth: 1,
        borderTopColor: colors.hairline,
        paddingTop: 12,
        paddingBottom: insets.bottom + 10,
      }}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? route.name;
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={{ flex: 1, alignItems: 'center' }}
          >
            <Text
              style={[
                textStyles.labelBold,
                { color: isFocused ? colors.ink : colors.softInk },
              ]}
            >
              {label}
            </Text>
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 999,
                marginTop: 6,
                backgroundColor: isFocused ? colors.clay : 'transparent',
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
