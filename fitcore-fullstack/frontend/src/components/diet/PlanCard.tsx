// <PlanCard> — pastel category card with bold dark title/subtitle, faint dashed
// decorative arcs in the background, and a food image cut-out that bleeds off the
// right edge. Used on Screen 1 (horizontal strip) and Screen 2 (stacked list).

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Circle } from 'react-native-svg';
import { DIET, RADIUS } from '../../theme/dietTheme';

export interface PlanCardProps {
  title: string;
  subtitle: string;
  color: string; // pastel background
  image: string;
  height?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function PlanCard({
  title,
  subtitle,
  color,
  image,
  height = 150,
  onPress,
  style,
}: PlanCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[styles.card, { backgroundColor: color, height }, style]}
    >
      {/* Faint dashed decorative arcs (top-right) */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Circle cx="78%" cy="20%" r={70}  stroke={DIET.onPastel} strokeOpacity={0.12} strokeWidth={1.5} strokeDasharray="4 6" fill="none" />
        <Circle cx="78%" cy="20%" r={105} stroke={DIET.onPastel} strokeOpacity={0.08} strokeWidth={1.5} strokeDasharray="4 6" fill="none" />
      </Svg>

      {/* Text block */}
      <View style={styles.textBlock}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
      </View>

      {/* Food image cut-out bleeding off the right edge */}
      <Image
        source={{ uri: image }}
        style={[styles.foodImage, { height: height + 24, width: height + 24, top: -12, borderRadius: (height + 24) / 2 }]}
        contentFit="cover"
        transition={250}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.category,
    overflow: 'hidden',
    padding: 18,
    justifyContent: 'center',
  },
  textBlock: { maxWidth: '62%' },
  title: {
    color: DIET.onPastel,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    color: DIET.onPastel,
    opacity: 0.7,
    fontSize: 13,
    fontWeight: '600',
  },
  foodImage: {
    position: 'absolute',
    right: -28,
  },
});
