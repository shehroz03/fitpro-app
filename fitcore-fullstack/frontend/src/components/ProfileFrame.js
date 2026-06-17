import React, { useId } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FRAMES, getFrame } from '../utils/frames';

// ─────────────────────────────────────────────────────────────────────────────
//  ProfileFrame — wraps any avatar with a decorative SVG frame.
//  The avatar shows through the transparent center, so frames fit perfectly
//  on the DP at any size.
//
//  Props: frameId, avatarSize, children (the avatar image / initials view)
// ─────────────────────────────────────────────────────────────────────────────
export function ProfileFrame({ frameId = 'none', avatarSize, children }) {
  const uid = useId().replace(/:/g, '');     // safe id for SVG gradient refs
  const frame = getFrame(frameId);
  const Render = frame.Render;

  if (!Render) {
    return <View style={{ width: avatarSize, height: avatarSize }}>{children}</View>;
  }

  const pad = Math.round(avatarSize * frame.padRatio);
  const S = avatarSize + pad * 2;

  return (
    <View style={{ width: S, height: S, alignItems: 'center', justifyContent: 'center' }}>
      {/* avatar, clipped to a circle, centered */}
      <View style={{
        position: 'absolute', left: pad, top: pad,
        width: avatarSize, height: avatarSize,
        borderRadius: avatarSize / 2, overflow: 'hidden',
      }}>
        {children}
      </View>
      {/* frame drawn on top, center transparent */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Render S={S} avatarSize={avatarSize} uid={uid} />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  FrameSelector — grid of frames. Each preview uses the same ProfileFrame
//  renderer, so the thumbnail looks exactly like the real DP frame.
// ─────────────────────────────────────────────────────────────────────────────
export function FrameSelector({ currentId, onSelect, C }) {
  const AV = 50;
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      contentContainerStyle={fs.grid}
    >
      {FRAMES.map(frame => {
        const active = frame.id === currentId;
        return (
          <TouchableOpacity
            key={frame.id}
            style={[fs.item, { backgroundColor: C.card, borderColor: active ? C.accent : C.border }]}
            onPress={() => onSelect(frame.id)}
            activeOpacity={0.7}
          >
            <View style={fs.previewBox}>
              <ProfileFrame frameId={frame.id} avatarSize={AV}>
                <View style={{
                  width: AV, height: AV, borderRadius: AV / 2,
                  backgroundColor: C.accentDim,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name="person" size={AV * 0.5} color={C.accent} />
                </View>
              </ProfileFrame>
            </View>

            <Text style={[fs.label, { color: active ? C.accent : C.muted }]} numberOfLines={1}>
              {frame.label}
            </Text>

            {active && (
              <View style={[fs.tick, { backgroundColor: C.accent }]}>
                <Ionicons name="checkmark" size={9} color="#000" />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const fs = StyleSheet.create({
  grid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 4, paddingVertical: 4 },
  item:       { width: '30%', alignItems: 'center', borderRadius: 14, borderWidth: 1.5,
                paddingVertical: 12, paddingHorizontal: 4, position: 'relative' },
  previewBox: { height: 84, alignItems: 'center', justifyContent: 'center' },
  label:      { fontSize: 11, fontWeight: '700', marginTop: 6, textAlign: 'center' },
  tick:       { position: 'absolute', top: 6, right: 6, width: 16, height: 16,
                borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
