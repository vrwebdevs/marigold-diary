import { create } from 'zustand';
import { StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import { colors, textStyles, spacing, radii, shadows, fontFamilies } from '../theme';

const useDialogStore = create((set) => ({
  config: null, // { title, message, buttons }
  open: (config) => set({ config }),
  close: () => set({ config: null }),
}));

/** Drop-in themed replacement for Alert.alert(title, message, buttons). */
export function showAlert(title, message, buttons) {
  useDialogStore.getState().open({
    title,
    message,
    buttons: buttons && buttons.length ? buttons : [{ text: 'OK' }],
  });
}

function buttonColor(style) {
  if (style === 'destructive') return colors.moods.frayed;
  if (style === 'cancel') return colors.softInk;
  return colors.clayText;
}

/**
 * In-tree overlay (NOT a Modal) so touches work under the root gesture handler.
 * Mounted once at the app root, above the navigator.
 */
export default function ThemedDialog() {
  const config = useDialogStore((s) => s.config);
  const close = useDialogStore((s) => s.close);
  if (!config) return null;
  const { title, message, buttons } = config;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}>
      <Pressable
        onPress={close}
        style={{
          flex: 1,
          backgroundColor: 'rgba(20,14,8,0.45)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            width: '100%',
            maxWidth: 360,
            backgroundColor: colors.paper,
            borderRadius: radii.cardLarge,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: spacing.cardPadding + 4,
            ...shadows.card,
          }}
        >
          {title ? (
            <Text style={[textStyles.title, { fontSize: 20, lineHeight: 26, color: colors.ink }]}>
              {title}
            </Text>
          ) : null}
          {message ? (
            <Text
              style={{
                fontFamily: fontFamilies.sans,
                fontSize: 15,
                lineHeight: 22,
                color: colors.midInk,
                marginTop: title ? 8 : 0,
              }}
            >
              {message}
            </Text>
          ) : null}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 8,
              marginTop: 20,
              flexWrap: 'wrap',
            }}
          >
            {buttons.map((b, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  close();
                  b.onPress?.();
                }}
                hitSlop={6}
                style={{ paddingHorizontal: 16, paddingVertical: 9, borderRadius: radii.pill }}
              >
                <Text style={{ fontFamily: fontFamilies.sansBold, fontSize: 14, color: buttonColor(b.style) }}>
                  {b.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </View>
  );
}
