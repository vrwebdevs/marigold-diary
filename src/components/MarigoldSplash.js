import { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, fontFamilies } from '../theme';

const AG = Animated.createAnimatedComponent(G);
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const E_POT = Easing.bezier(0.2, 0.8, 0.3, 1);
const E_STEM = Easing.bezier(0.3, 0.9, 0.3, 1);
const E_BLOOM = Easing.bezier(0.34, 1.56, 0.64, 1); // springy overshoot
const E_SWAY = Easing.inOut(Easing.ease);

const OUTER = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const MID = [15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345];
const INNER = [0, 45, 90, 135, 180, 225, 270, 315];
const SEEDS = [[133, 134], [147, 134], [133, 146], [147, 146], [140, 129], [140, 151]];

/** Animated marigold launch screen. firstLaunch=true plays the full grow; false = quick fade. */
export default function MarigoldSplash({ firstLaunch = true, onDone }) {
  const containerO = useSharedValue(firstLaunch ? 1 : 0);
  const potO = useSharedValue(firstLaunch ? 0 : 1);
  const potTY = useSharedValue(firstLaunch ? 26 : 0);
  const stemSY = useSharedValue(firstLaunch ? 0 : 1);
  const leaf1 = useSharedValue(firstLaunch ? 0 : 1);
  const leaf2 = useSharedValue(firstLaunch ? 0 : 1);
  const bloomS = useSharedValue(firstLaunch ? 0 : 1);
  const bloomR = useSharedValue(firstLaunch ? -45 : 0);
  const bloomO = useSharedValue(firstLaunch ? 0 : 1);
  const sway = useSharedValue(0);
  const text1 = useSharedValue(firstLaunch ? 0 : 1);
  const text2 = useSharedValue(firstLaunch ? 0 : 1);
  const dotsO = useSharedValue(firstLaunch ? 0 : 1);
  const d0 = useSharedValue(0.25);
  const d1 = useSharedValue(0.25);
  const d2 = useSharedValue(0.25);

  useEffect(() => {
    const swayLoop = () =>
      withRepeat(
        withSequence(
          withTiming(2.4, { duration: 1375, easing: E_SWAY }),
          withTiming(-2.4, { duration: 2750, easing: E_SWAY }),
          withTiming(0, { duration: 1375, easing: E_SWAY })
        ),
        -1,
        false
      );
    const pulse = (sv, delay) => {
      sv.value = withDelay(
        delay,
        withRepeat(withSequence(withTiming(1, { duration: 600 }), withTiming(0.25, { duration: 600 })), -1, false)
      );
    };

    let timer;
    if (firstLaunch) {
      potO.value = withTiming(1, { duration: 700, easing: E_POT });
      potTY.value = withTiming(0, { duration: 700, easing: E_POT });
      stemSY.value = withDelay(550, withTiming(1, { duration: 800, easing: E_STEM }));
      leaf1.value = withDelay(1150, withTiming(1, { duration: 500 }));
      leaf2.value = withDelay(1350, withTiming(1, { duration: 500 }));
      bloomO.value = withDelay(1350, withTiming(1, { duration: 350 }));
      bloomS.value = withDelay(1350, withTiming(1, { duration: 950, easing: E_BLOOM }));
      bloomR.value = withDelay(1350, withTiming(0, { duration: 950, easing: E_BLOOM }));
      sway.value = withDelay(2600, swayLoop());
      text1.value = withDelay(2150, withTiming(1, { duration: 700 }));
      text2.value = withDelay(2450, withTiming(1, { duration: 700 }));
      dotsO.value = withDelay(2700, withTiming(1, { duration: 600 }));
      pulse(d0, 2700);
      pulse(d1, 2850);
      pulse(d2, 3000);
      timer = setTimeout(() => {
        containerO.value = withTiming(0, { duration: 450 }, (f) => {
          if (f && onDone) runOnJS(onDone)();
        });
      }, 3500);
    } else {
      containerO.value = withTiming(1, { duration: 320 });
      sway.value = swayLoop();
      pulse(d0, 0);
      pulse(d1, 150);
      pulse(d2, 300);
      timer = setTimeout(() => {
        containerO.value = withTiming(0, { duration: 380 }, (f) => {
          if (f && onDone) runOnJS(onDone)();
        });
      }, 900);
    }
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const potP = useAnimatedProps(() => ({ opacity: potO.value, translateY: potTY.value }));
  const plantP = useAnimatedProps(() => ({ rotation: sway.value }));
  const stemP = useAnimatedProps(() => ({ scaleY: stemSY.value }));
  const leaf1P = useAnimatedProps(() => ({ scale: leaf1.value, opacity: leaf1.value }));
  const leaf2P = useAnimatedProps(() => ({ scale: leaf2.value, opacity: leaf2.value }));
  const bloomP = useAnimatedProps(() => ({ scale: bloomS.value, rotation: bloomR.value, opacity: bloomO.value }));

  const containerStyle = useAnimatedStyle(() => ({ opacity: containerO.value }));
  const t1Style = useAnimatedStyle(() => ({ opacity: text1.value, transform: [{ translateY: 16 * (1 - text1.value) }] }));
  const t2Style = useAnimatedStyle(() => ({ opacity: text2.value, transform: [{ translateY: 16 * (1 - text2.value) }] }));
  const dotsStyle = useAnimatedStyle(() => ({ opacity: dotsO.value }));
  const dot0Style = useAnimatedStyle(() => ({ opacity: d0.value, transform: [{ translateY: -3 * ((d0.value - 0.25) / 0.75) }] }));
  const dot1Style = useAnimatedStyle(() => ({ opacity: d1.value, transform: [{ translateY: -3 * ((d1.value - 0.25) / 0.75) }] }));
  const dot2Style = useAnimatedStyle(() => ({ opacity: d2.value, transform: [{ translateY: -3 * ((d2.value - 0.25) / 0.75) }] }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, containerStyle]} pointerEvents="none">
      <Svg style={StyleSheet.absoluteFill} width={SCREEN_W} height={SCREEN_H}>
        <Defs>
          <RadialGradient id="bg" cx="50%" cy="18%" rx="120%" ry="80%">
            <Stop offset="0%" stopColor="#F3EAD9" />
            <Stop offset="100%" stopColor="#EBDFC8" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={SCREEN_W} height={SCREEN_H} fill="url(#bg)" />
      </Svg>

      <View style={styles.center}>
        <Svg viewBox="0 0 280 400" width={206} height={294} style={{ overflow: 'visible' }}>
          {/* pot */}
          <AG animatedProps={potP}>
            <Ellipse cx={140} cy={305} rx={42} ry={9} fill="#5C4631" />
            <Path d="M101 312 L179 312 L168 368 Q166 376 158 376 L122 376 Q114 376 112 368 Z" fill="#B85F37" />
            <Path d="M108 320 Q140 327 172 320" stroke="rgba(255,228,205,0.22)" strokeWidth={5} fill="none" strokeLinecap="round" />
            <Rect x={93} y={292} width={94} height={21} rx={9} fill="#C9743F" />
            <Rect x={93} y={292} width={94} height={7} rx={3.5} fill="rgba(255,228,205,0.22)" />
          </AG>

          {/* plant: sway about (140,305) */}
          <G transform="translate(140 305)">
            <AG animatedProps={plantP}>
              <G transform="translate(-140 -305)">

                {/* stem: grow up from base (140,305) */}
                <G transform="translate(140 305)">
                  <AG animatedProps={stemP}>
                    <G transform="translate(-140 -305)">
                      <Path d="M140 305 C 135 250, 145 200, 140 152" stroke="#6E8A4D" strokeWidth={7} fill="none" strokeLinecap="round" />
                    </G>
                  </AG>
                </G>

                {/* leaf 1: pop about (138,250) */}
                <G transform="translate(138 250)">
                  <AG animatedProps={leaf1P}>
                    <G transform="translate(-138 -250)">
                      <Path d="M139 244 C 113 234, 99 250, 110 266 C 124 260, 137 256, 139 244 Z" fill="#74904F" />
                    </G>
                  </AG>
                </G>

                {/* leaf 2: pop about (142,212) */}
                <G transform="translate(142 212)">
                  <AG animatedProps={leaf2P}>
                    <G transform="translate(-142 -212)">
                      <Path d="M141 206 C 167 196, 181 212, 170 228 C 156 222, 143 218, 141 206 Z" fill="#6A8649" />
                    </G>
                  </AG>
                </G>

                {/* flower: bloom about (140,140) */}
                <G transform="translate(140 140)">
                  <AG animatedProps={bloomP}>
                    <G transform="translate(-140 -140)">
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
                    </G>
                  </AG>
                </G>

              </G>
            </AG>
          </G>
        </Svg>

        <Animated.Text style={[styles.wordmark, t1Style]}>Marigold</Animated.Text>
        <Animated.Text style={[styles.tagline, t2Style]}>a place to bloom</Animated.Text>
      </View>

      <Animated.View style={[styles.dots, dotsStyle]}>
        <Animated.View style={[styles.dot, dot0Style]} />
        <Animated.View style={[styles.dot, dot1Style]} />
        <Animated.View style={[styles.dot, dot2Style]} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#EFE5D3', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  center: { alignItems: 'center', marginTop: -28 },
  wordmark: { fontFamily: fontFamilies.handBold, fontSize: 54, color: colors.clayText, marginTop: 4, alignSelf: 'stretch', textAlign: 'center' },
  tagline: { fontFamily: fontFamilies.hand, fontSize: 22, color: '#A55F3E', marginTop: 2 },
  dots: { position: 'absolute', bottom: 54, flexDirection: 'row', gap: 9 },
  dot: { width: 8, height: 8, borderRadius: 999, backgroundColor: '#B26A47' },
});
