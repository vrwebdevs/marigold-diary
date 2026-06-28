import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/**
 * Gesture-driven page turner. Drag left → next page; drag right → previous.
 * Layers: the next page waits beneath, the current page slides off to the
 * left with a slight tilt, the previous page slides back in over the top.
 * Horizontal activation offsets keep the page's inner vertical scroll working.
 */
export default function PageFlipAnimator({ index, count, renderPage, onIndexChange }) {
  const { width } = useWindowDimensions();
  const tx = useSharedValue(0);

  const hasNext = index < count - 1;
  const hasPrev = index > 0;

  const settle = (dir) => {
    onIndexChange(index + dir);
    tx.value = 0;
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-16, 16])
    .failOffsetY([-12, 12])
    .onUpdate((event) => {
      let x = event.translationX;
      if (x < 0 && !hasNext) x = Math.max(x, -72) / 3; // rubber-band at the ends
      if (x > 0 && !hasPrev) x = Math.min(x, 72) / 3;
      tx.value = x;
    })
    .onEnd(() => {
      if (tx.value < -width * 0.28 && hasNext) {
        tx.value = withTiming(-width * 1.05, { duration: 220 }, (done) => {
          if (done) runOnJS(settle)(1);
        });
      } else if (tx.value > width * 0.28 && hasPrev) {
        tx.value = withTiming(width * 1.05, { duration: 220 }, (done) => {
          if (done) runOnJS(settle)(-1);
        });
      } else {
        tx.value = withSpring(0, { damping: 18, stiffness: 180 });
      }
    });

  const currentStyle = useAnimatedStyle(() => {
    const x = Math.min(tx.value, 0);
    return {
      transform: [{ translateX: x }, { rotateZ: `${(x / width) * -4}deg` }],
    };
  });

  const prevStyle = useAnimatedStyle(() => {
    const x = Math.max(tx.value, 0);
    return {
      transform: [
        { translateX: -width * 1.05 + x },
        { rotateZ: `${((x - width * 1.05) / width) * -4}deg` },
      ],
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <View style={{ flex: 1 }}>
        {hasNext ? <View style={StyleSheet.absoluteFill}>{renderPage(index + 1)}</View> : null}
        <Animated.View style={[StyleSheet.absoluteFill, currentStyle]}>
          {renderPage(index)}
        </Animated.View>
        {hasPrev ? (
          <Animated.View style={[StyleSheet.absoluteFill, prevStyle]}>
            {renderPage(index - 1)}
          </Animated.View>
        ) : null}
      </View>
    </GestureDetector>
  );
}
