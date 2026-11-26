import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/src/theme';

export function IntroOverlay({ onDone }: { onDone: () => void }) {
  const ballY = useSharedValue(-220);
  const ballScale = useSharedValue(0.4);
  const title = useSharedValue(0);
  const overlay = useSharedValue(1);

  useEffect(() => {
    ballY.value = withSequence(
      withTiming(0, { duration: 620, easing: Easing.bezier(0.16, 0.84, 0.44, 1) }),
      withSpring(-36, { damping: 6, stiffness: 220 }),
      withSpring(0, { damping: 10, stiffness: 180 }),
    );
    ballScale.value = withSpring(1, { damping: 8, stiffness: 140 });
    title.value = withDelay(380, withTiming(1, { duration: 420 }));
    overlay.value = withDelay(
      1480,
      withTiming(0, { duration: 420 }, (finished) => {
        if (finished) runOnJS(onDone)();
      }),
    );
    const tap = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, 620);
    return () => clearTimeout(tap);
  }, [ballScale, ballY, onDone, overlay, title]);

  const ballStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ballY.value }, { scale: ballScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: title.value,
    transform: [{ translateY: (1 - title.value) * 16 }],
  }));
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlay.value,
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.overlay, overlayStyle]}>
      <View style={styles.pitchLine} />
      <View style={styles.circle} />
      <Animated.View style={[styles.ball, ballStyle]}>
        <Text style={styles.ballMark}>●</Text>
      </Animated.View>
      <Animated.View style={titleStyle}>
        <Text style={styles.kicker}>SEASON 2026</Text>
        <Text style={styles.title}>DARK TEAM</Text>
        <Text style={styles.sub}>Fantasy League</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  pitchLine: {
    position: 'absolute',
    width: 2,
    top: 80,
    bottom: 80,
    backgroundColor: 'rgba(216,248,48,0.16)',
  },
  circle: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: 'rgba(216,248,48,0.18)',
  },
  ball: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    shadowColor: colors.lime,
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  ballMark: { color: '#111', fontSize: 28 },
  kicker: {
    color: colors.lime,
    fontFamily: 'BebasNeue_400Regular',
    letterSpacing: 3,
    fontSize: 16,
    textAlign: 'center',
  },
  title: {
    color: colors.text,
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 56,
    lineHeight: 56,
    textAlign: 'center',
  },
  sub: {
    color: colors.muted,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    letterSpacing: 1,
  },
});
