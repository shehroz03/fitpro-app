// <MealRow> — circular food photo + bold meal type + muted meal name.
// The divider is owned by the parent (render <MealRow showDivider /> on every
// row except the last).

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { DIET } from '../../theme/dietTheme';

export interface MealRowProps {
  image: string;
  type: string;
  name: string;
  showDivider?: boolean;
  onPress?: () => void;
}

export default function MealRow({ image, type, name, showDivider, onPress }: MealRowProps) {
  const Wrapper: any = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.row, showDivider && styles.divider]}
    >
      <Image source={{ uri: image }} style={styles.avatar} contentFit="cover" transition={200} />
      <View style={styles.textCol}>
        <Text style={styles.type}>{type}</Text>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={18} color={DIET.label} />}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: DIET.divider,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: DIET.divider,
  },
  textCol: { flex: 1 },
  type: {
    color: DIET.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  name: {
    color: DIET.textMuted,
    fontSize: 15,
    fontWeight: '500',
  },
});
