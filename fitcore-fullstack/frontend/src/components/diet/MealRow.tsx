// <MealRow> — circular food photo + bold meal type + muted meal name.
// The divider is owned by the parent (render <MealRow showDivider /> on every
// row except the last).

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { DIET } from '../../theme/dietTheme';

export interface MealRowProps {
  image?: string;
  type: string;
  name: string;
  calories?: number;
  showDivider?: boolean;
  onPress?: () => void;
}

export default function MealRow({ image, type, name, calories, showDivider, onPress }: MealRowProps) {
  const Wrapper: any = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.row, showDivider && styles.divider]}
    >
      {/* Thumbnail — 48px circle with food-icon fallback */}
      {image ? (
        <Image source={{ uri: image }} style={styles.avatar} contentFit="cover" transition={200} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Ionicons name="restaurant-outline" size={20} color={DIET.label} />
        </View>
      )}

      <View style={styles.textCol}>
        {/* Overline: meal-type label */}
        <Text style={styles.type}>{type.toUpperCase()}</Text>
        {/* Body: meal name */}
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {/* Caption: kcal in accent, helper text neutral */}
        {calories != null && (
          <Text style={styles.meta}>
            <Text style={styles.metaKcal}>{calories} kcal</Text>
            {onPress ? <Text style={styles.metaHint}> · tap to view</Text> : null}
          </Text>
        )}
      </View>

      {onPress && <Ionicons name="chevron-forward" size={16} color={DIET.label} />}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: DIET.divider,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    backgroundColor: DIET.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1 },
  type: {
    color: DIET.label,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  name: {
    color: DIET.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  meta: {
    fontSize: 13,
  },
  metaKcal: {
    color: DIET.accent,
    fontWeight: '600',
  },
  metaHint: {
    color: DIET.textMuted,
    fontWeight: '400',
  },
});
