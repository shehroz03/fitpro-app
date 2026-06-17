import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import {
  useSharedValue, useAnimatedStyle,
  withTiming, withSpring, withRepeat, withSequence,
  withDelay, Easing as RnEasing,
} from 'react-native-reanimated';

// ── Staggered entrance: fade in + slide up ─────────────────────
// index controls the delay (60ms per section).
// Returns an Animated.View style object (useNativeDriver-safe).
export function useEntrance(index = 0, baseDelay = 80) {
  const opacity   = useSharedValue(0);
  const translateY = useSharedValue(18);

  useEffect(() => {
    const delay = index * baseDelay;
    opacity.value    = withDelay(delay, withTiming(1,  { duration: 260, easing: RnEasing.out(RnEasing.quad) }));
    translateY.value = withDelay(delay, withTiming(0,  { duration: 300, easing: RnEasing.out(RnEasing.cubic) }));
  }, []);

  return useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
}

// ── Spring press scale ─────────────────────────────────────────
// Returns { animStyle, onPressIn, onPressOut } to spread on a button.
export function useSpringPress(scaleDown = 0.93) {
  const scale = useSharedValue(1);

  const animStyle  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn  = () => { scale.value = withSpring(scaleDown, { mass: 0.4, damping: 12, stiffness: 200 }); };
  const onPressOut = () => { scale.value = withSpring(1.0,       { mass: 0.4, damping: 12, stiffness: 200 }); };

  return { animStyle, onPressIn, onPressOut };
}

// ── Idle pulse (for play/primary buttons) ─────────────────────
// Returns an animStyle with a subtle scale oscillation.
export function usePulse(enabled = true, min = 0.97, max = 1.0, duration = 1400) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!enabled) return;
    scale.value = withRepeat(
      withSequence(
        withTiming(min, { duration: duration / 2, easing: RnEasing.inOut(RnEasing.sine) }),
        withTiming(max, { duration: duration / 2, easing: RnEasing.inOut(RnEasing.sine) }),
      ),
      -1,
      false,
    );
    return () => { scale.value = 1; };
  }, [enabled]);

  return useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
}

// ── Checkmark spring (set complete, goal done) ─────────────────
// Returns { animStyle, trigger } — call trigger() to fire once.
export function useCheckSpring() {
  const scale = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const trigger   = () => {
    scale.value = withSpring(1, { mass: 0.5, damping: 8, stiffness: 300 });
  };

  return { animStyle, trigger };
}

// ── Count-up number ───────────────────────────────────────────
// Returns the current displayed integer, counting from 0 to `target`
// over `duration` ms. Fires once when `enabled` becomes true.
export function useCountUp(target = 0, duration = 900, enabled = true) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (!enabled || !target) return;
    const start     = Date.now();
    const startVal  = 0;
    const diff      = target - startVal;

    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startVal + diff * eased));
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [enabled, target]);

  return display;
}

// ── Dark-mode accent glow ─────────────────────────────────────
// Returns shadow style only when isDark is true.
// Spread onto View style: <View style={[s.card, glowStyle(isDark, C.accent)]} />
export function glowStyle(isDark, accent = '#C8F135', radius = 12, opacity = 0.22) {
  if (!isDark) return {};
  return {
    shadowColor:   accent,
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: opacity,
    shadowRadius:  radius,
    elevation:     6,
  };
}

// ── Animated bar fill (progress bars, macro bars) ─────────────
// Returns an RN Animated.Value (0→1) that fills on mount.
// Use with Animated.View width: anim.interpolate({ inputRange:[0,1], outputRange:['0%','100%'] })
export function useBarFill(pct = 0, delay = 0, duration = 600) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue:        Math.min(Math.max(pct / 100, 0), 1),
      duration,
      delay,
      easing:         Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return anim;
}
