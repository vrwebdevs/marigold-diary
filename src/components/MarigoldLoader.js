import { useEffect } from 'react';
import Svg, { Circle, Ellipse } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const OUTER = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const MID = [15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345];
const INNER = [0, 45, 90, 135, 180, 225, 270, 315];
const SEEDS = [[133, 134], [147, 134], [133, 146], [147, 146], [140, 129], [140, 151]];

/** A slowly spinning marigold — reusable loading indicator. */
export default function MarigoldLoader({ size = 64, duration = 2800, style }) {
  const rot = useSharedValue(0);
  useEffect(() => {
    rot.value = withRepeat(withTiming(360, { duration, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(rot);
  }, [duration, rot]);
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  return (
    <Animated.View style={[{ width: size, height: size }, spinStyle, style]}>
      <Svg viewBox="0 0 280 280" width={size} height={size} style={{ overflow: 'visible' }}>
        {OUTER.map((r) => (
          <Ellipse key={`o${r}`} cx={140} cy={84} rx={13.5} ry={31} fill="#EEB94F" transform={`rotate(${r} 140 140)`} />
        ))}
        {MID.map((r) => (
          <Ellipse key={`m${r}`} cx={140} cy={98} rx={12} ry={25} fill="#E0A23C" transform={`rotate(${r} 140 140)`} />
        ))}
        {INNER.map((r) => (
          <Ellipse key={`i${r}`} cx={140} cy={112} rx={10} ry={18} fill="#CE8A2E" transform={`rotate(${r} 140 140)`} />
        ))}
        <Circle cx={140} cy={140} r={21} fill="#A85B1D" />
        <Circle cx={140} cy={140} r={13} fill="#BF7026" />
        {SEEDS.map(([x, y], i) => (
          <Circle key={`s${i}`} cx={x} cy={y} r={2.4} fill="#EEB94F" />
        ))}
      </Svg>
    </Animated.View>
  );
}
