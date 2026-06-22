import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

// ── Staggered entrance: fade in + slide up ─────────────────────
// Returns an Animated style object for use with Animated.View.
// index controls the delay (80ms per section).
export function useEntrance(index = 0, baseDelay = 80) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    const delay = index * baseDelay;
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 280, delay, easing: Easing.out(Easing.quad),  useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 320, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  return { opacity, transform: [{ translateY }] };
}

// ── Spring press scale ─────────────────────────────────────────
// Returns { animStyle, onPressIn, onPressOut }.
export function useSpringPress(scaleDown = 0.93) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn  = () => Animated.spring(scale, { toValue: scaleDown, useNativeDriver: true, speed: 30, bounciness: 0 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,         useNativeDriver: true, speed: 30, bounciness: 2 }).start();

  return { animStyle: { transform: [{ scale }] }, onPressIn, onPressOut };
}

// ── Idle pulse (for play/primary buttons) ─────────────────────
// Returns an Animated style with a subtle scale oscillation.
export function usePulse(enabled = true, min = 0.97, max = 1.0, duration = 1400) {
  const scale = useRef(new Animated.Value(1)).current;
  const loop  = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    loop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: min, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(scale, { toValue: max, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.current.start();
    return () => { loop.current?.stop(); scale.setValue(1); };
  }, [enabled]);

  return { transform: [{ scale }] };
}

// ── Checkmark spring (set complete, goal done) ─────────────────
// Returns { animStyle, trigger } — call trigger() to fire once.
export function useCheckSpring() {
  const scale = useRef(new Animated.Value(0)).current;

  const animStyle = { transform: [{ scale }] };
  const trigger   = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 14 }).start();

  return { animStyle, trigger };
}

// ── Count-up number ───────────────────────────────────────────
// Returns the displayed integer, counting from 0 to `target`.
export function useCountUp(target = 0, duration = 900, enabled = true) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    if (!enabled || !target) { setDisplay(target); return; }
    const start = Date.now();
    const tick  = () => {
      const elapsed  = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(target * eased));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [enabled, target]);

  return display;
}

// ── Dark-mode accent glow ─────────────────────────────────────
// Returns shadow style only in dark mode — call on any View.
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
export function useBarFill(pct = 0, delay = 0, duration = 600) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue:         Math.min(Math.max(pct / 100, 0), 1),
      duration,
      delay,
      easing:          Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return anim;
}
