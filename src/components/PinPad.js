import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors, fontFamilies } from '../theme';
import { haptics } from '../utils/haptics';

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

const KEY_SIZE = 78;
const KEY_GAP = 20;

/** 4-digit pad with progress dots. Calls onComplete(pin) and clears itself. */
export default function PinPad({ length = 4, onComplete, error = '' }) {
  const [value, setValue] = useState('');

  const press = (key) => {
    if (key) haptics.selection();
    if (key === '⌫') {
      setValue(value.slice(0, -1));
      return;
    }
    if (!key || value.length >= length) return;
    const next = value + key;
    setValue(next);
    if (next.length === length) {
      // let the last dot render before the handler runs
      setTimeout(() => {
        setValue('');
        onComplete(next);
      }, 120);
    }
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', gap: 16, height: 16 }}>
        {Array.from({ length }, (_, i) => (
          <View
            key={i}
            style={{
              width: 15,
              height: 15,
              borderRadius: 999,
              backgroundColor: i < value.length ? colors.clay : 'rgba(59,48,38,0.14)',
            }}
          />
        ))}
      </View>
      <Text
        style={{
          fontFamily: fontFamilies.sans,
          fontSize: 13,
          color: colors.moods.frayed,
          marginTop: 12,
          height: 24,
        }}
      >
        {error || ' '}
      </Text>
      {ROWS.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', gap: KEY_GAP, marginTop: KEY_GAP }}>
          {row.map((key, ki) => (
            <Pressable
              key={ki}
              onPress={() => press(key)}
              disabled={!key}
              android_ripple={key ? { color: colors.clayTint, borderless: false, radius: KEY_SIZE / 2 } : undefined}
              style={{
                width: KEY_SIZE,
                height: KEY_SIZE,
                borderRadius: KEY_SIZE / 2,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: key ? colors.glass : 'transparent',
                borderWidth: key ? 1 : 0,
                borderColor: colors.cardBorder,
                shadowColor: 'rgba(59,48,38,1)',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: key ? 0.1 : 0,
                shadowRadius: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: key === '⌫' ? fontFamilies.serifMedium : fontFamilies.hand,
                  fontSize: key === '⌫' ? 24 : 30,
                  color: colors.ink,
                  width: KEY_SIZE,
                  textAlign: 'center',
                }}
              >
                {key}
              </Text>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}
