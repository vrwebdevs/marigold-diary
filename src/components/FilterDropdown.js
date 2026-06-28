import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { colors, radii, spacing, fontFamilies } from '../theme';

/** Tap-to-open filter dropdown (modal picker). options: [{ value, label }]. */
export default function FilterDropdown({ placeholder, value, options, onSelect }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  const isActive = value && value !== 'all';
  return (
    <View style={{ flex: 1 }}>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: isActive ? colors.clayTint : colors.paper,
          borderRadius: radii.pill,
          borderWidth: 1,
          borderColor: isActive ? colors.clayText : colors.hairline,
          paddingHorizontal: 14,
          paddingVertical: 9,
        }}
      >
        <Text
          numberOfLines={1}
          style={{ fontFamily: fontFamilies.sans, fontSize: 13, color: isActive ? colors.clayText : colors.midInk, flex: 1 }}
        >
          {current ? current.label : placeholder}
        </Text>
        <Text style={{ fontFamily: fontFamilies.sans, fontSize: 11, color: colors.softInk, marginLeft: 6 }}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: 'rgba(59,48,38,0.4)', justifyContent: 'center', paddingHorizontal: spacing.screenX + 10 }}
        >
          <View style={{ backgroundColor: colors.backdrop, borderRadius: radii.cardLarge, paddingVertical: 8, maxHeight: '70%' }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((o) => (
                <Pressable
                  key={String(o.value)}
                  onPress={() => {
                    onSelect(o.value);
                    setOpen(false);
                  }}
                  style={{ paddingVertical: 12, paddingHorizontal: 20 }}
                >
                  <Text
                    style={{
                      fontFamily: fontFamilies.sans,
                      fontSize: 15,
                      color: o.value === value ? colors.clayText : colors.ink,
                    }}
                  >
                    {o.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
