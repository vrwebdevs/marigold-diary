import { Pressable, View } from 'react-native';
import { colors } from '../theme';
import { toDateKey } from '../utils/dateUtils';

const CELL = 11;
const GAP = 3;
const WEEKS = 8;

/** 8-week mini heatmap ending today. countsByDay: { 'YYYY-MM-DD': n }. */
export default function MiniHeatmap({ countsByDay = {}, onPress }) {
  const today = new Date();
  const days = [];
  for (let i = WEEKS * 7 - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(toDateKey(d));
  }
  const weeks = [];
  for (let w = 0; w < WEEKS; w++) {
    weeks.push(days.slice(w * 7, w * 7 + 7));
  }
  // intensity ramp derived from ink/clay theme colors
  const cellColor = (key) => {
    const n = countsByDay[key] || 0;
    if (!n) return 'rgba(59,48,38,0.06)';
    if (n === 1) return 'rgba(178,106,71,0.45)';
    return colors.clay;
  };
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', gap: GAP }}>
      {weeks.map((week, i) => (
        <View key={i} style={{ gap: GAP }}>
          {week.map((key) => (
            <View
              key={key}
              style={{
                width: CELL,
                height: CELL,
                borderRadius: 3,
                backgroundColor: cellColor(key),
              }}
            />
          ))}
        </View>
      ))}
    </Pressable>
  );
}
