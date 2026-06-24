// <MacroCircle> — a single pastel macro circle (carbs / fat / protein).
// The value sits inside the circle, the macro name sits in gray below it.
// Pastel backgrounds are intentionally kept bright on the dark page.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DIET } from '../../theme/dietTheme';

export interface MacroCircleProps {
  label: string;       // e.g. "CARBS"
  value: string;       // e.g. "48.4g"
  bg: string;          // pastel background (see MACRO in dietTheme)
  size?: number;       // diameter, defaults to 90
}

export default function MacroCircle({ label, value, bg, size = 90 }: MacroCircleProps) {
  const isZero = parseFloat(value) === 0;
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <Text style={[
        styles.value,
        isZero && { color: DIET.label, fontWeight: '400' },
      ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: DIET.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  value: {
    color: DIET.onPastel,
    fontSize: 18,
    fontWeight: '800',
  },
});
