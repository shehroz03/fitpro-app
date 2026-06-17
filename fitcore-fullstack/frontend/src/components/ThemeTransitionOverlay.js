import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Animated, Dimensions, StyleSheet } from 'react-native';
import { _registerThemeTrigger } from '../utils/themeTransition';

const { width, height } = Dimensions.get('window');
// Circle must cover the full diagonal so every corner is reached
const DIAG = Math.ceil(Math.sqrt(width * width + height * height)) * 2.6;

export default function ThemeTransitionOverlay() {
  const [ripple, setRipple] = useState(null); // { x, y, color }
  const scale   = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const onPeakRef = useRef(null);
  const animRef   = useRef(null);

  const trigger = useCallback((x, y, color, onPeak) => {
    // Cancel any in-progress animation
    animRef.current?.stop();
    onPeakRef.current = onPeak;
    scale.setValue(0);
    opacity.setValue(1);
    setRipple({ x, y, color });
  }, [scale, opacity]);

  useEffect(() => {
    _registerThemeTrigger(trigger);
    return () => _registerThemeTrigger(null);
  }, [trigger]);

  useEffect(() => {
    if (!ripple) return;

    // Phase 1: expand circle to fill screen (220ms)
    const expand = Animated.timing(scale, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    });

    // Phase 2: fade out ripple to reveal the now-switched theme (120ms)
    const fadeOut = Animated.timing(opacity, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    });

    const seq = Animated.sequence([expand, fadeOut]);
    animRef.current = seq;

    seq.start(({ finished }) => {
      if (!finished) return;
      setRipple(null);
      opacity.setValue(1);
    });

    // Switch theme at 50% of expand (110ms) so it's hidden under the ripple circle
    const switchTimer = setTimeout(() => {
      onPeakRef.current?.();
    }, 110);

    return () => clearTimeout(switchTimer);
  }, [ripple]);

  if (!ripple) return null;

  return (
    <Animated.View
      style={[styles.fill, { opacity }]}
      pointerEvents="none"
    >
      <Animated.View
        style={{
          position: 'absolute',
          width: DIAG,
          height: DIAG,
          borderRadius: DIAG / 2,
          backgroundColor: ripple.color,
          left: ripple.x - DIAG / 2,
          top:  ripple.y - DIAG / 2,
          transform: [{ scale }],
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
});
