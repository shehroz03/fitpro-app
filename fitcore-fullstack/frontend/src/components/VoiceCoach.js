import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { rf, rs, rw } from '../utils/responsive';

// ── Agent definitions ─────────────────────────────────────────────────────────
const AGENT_FEMALE = {
  name:   'Nova',
  title:  'Female AI Coach',
  avatar: require('../../assets/avatars/fav1.jpg'),
  color:  '#C084FC',
  shadow: '#9333EA',
};
const AGENT_MALE = {
  name:   'Max',
  title:  'Male AI Coach',
  avatar: require('../../assets/avatars/mav2.jpg'),
  color:  '#4ECDC4',
  shadow: '#0E8F8A',
};

// ── Waveform animation (3 bars) ───────────────────────────────────────────────
function WaveBar({ delay, color }) {
  const h = useRef(new Animated.Value(4)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(h, { toValue: 18, duration: 350, useNativeDriver: false }),
        Animated.timing(h, { toValue: 4,  duration: 350, useNativeDriver: false }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);
  return (
    <Animated.View style={{
      width: rs(3), height: h, borderRadius: rs(2),
      backgroundColor: color, marginHorizontal: rs(1.5),
    }} />
  );
}

// ── Main VoiceCoach card ──────────────────────────────────────────────────────
export function VoiceCoach({ gender = 'female', speaking = false, message = '', C, style }) {
  const agent = gender === 'male' ? AGENT_MALE : AGENT_FEMALE;
  const ring  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (speaking) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(ring, { toValue: 1.10, duration: 700, useNativeDriver: true }),
          Animated.timing(ring, { toValue: 1.00, duration: 700, useNativeDriver: true }),
        ]),
      );
      anim.start();
      return () => { anim.stop(); ring.setValue(1); };
    } else {
      ring.setValue(1);
    }
  }, [speaking]);

  return (
    <View style={[sv.wrap, { backgroundColor: C.card2 || C.card, borderColor: agent.color + '44' }, style]}>
      {/* Avatar with pulse ring */}
      <Animated.View style={[sv.ring, {
        borderColor: agent.color,
        transform: [{ scale: ring }],
        shadowColor: agent.shadow,
      }]}>
        <Image source={agent.avatar} style={sv.avatar} resizeMode="cover" />
        {/* Live badge */}
        {speaking && (
          <View style={[sv.liveBadge, { backgroundColor: agent.color }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 20 }}>
              {[0, 120, 240].map(d => <WaveBar key={d} delay={d} color="#000" />)}
            </View>
          </View>
        )}
      </Animated.View>

      {/* Info column */}
      <View style={{ flex: 1 }}>
        <View style={sv.nameRow}>
          <Text style={[sv.agentName, { color: agent.color }]}>{agent.name}</Text>
          <View style={[sv.badge, { borderColor: agent.color + '55', backgroundColor: agent.color + '18' }]}>
            <Text style={[sv.badgeTxt, { color: agent.color }]}>AI COACH</Text>
          </View>
          {speaking && (
            <View style={[sv.speakingPill, { backgroundColor: agent.color + '22' }]}>
              <Text style={[sv.speakingTxt, { color: agent.color }]}>speaking</Text>
            </View>
          )}
        </View>

        <Text
          style={[sv.message, { color: speaking ? C.text : C.muted }]}
          numberOfLines={3}
        >
          {speaking && message ? message : 'Ready to coach you'}
        </Text>
      </View>
    </View>
  );
}

// ── Compact agent chip (for chat header) ─────────────────────────────────────
export function AgentChip({ gender = 'female', speaking = false, onPress, C }) {
  const agent = gender === 'male' ? AGENT_MALE : AGENT_FEMALE;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[sc.chip, { borderColor: agent.color + '55', backgroundColor: agent.color + '12' }]}
    >
      <View style={[sc.avatarWrap, { borderColor: agent.color, shadowColor: agent.shadow }]}>
        <Image source={agent.avatar} style={sc.avatar} resizeMode="cover" />
        {speaking && (
          <View style={[sc.dot, { backgroundColor: agent.color }]} />
        )}
      </View>
      <View>
        <Text style={[sc.name, { color: agent.color }]}>{agent.name}</Text>
        <Text style={[sc.role, { color: C.muted }]}>{speaking ? 'speaking…' : agent.title}</Text>
      </View>
      <Ionicons name={speaking ? 'volume-high' : 'volume-medium-outline'} size={16} color={agent.color} />
    </TouchableOpacity>
  );
}

// ── Speak button (inline in chat messages) ────────────────────────────────────
export function SpeakBtn({ onPress, speaking = false, gender = 'female', C }) {
  const agent = gender === 'male' ? AGENT_MALE : AGENT_FEMALE;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (speaking) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.15, duration: 500, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.00, duration: 500, useNativeDriver: true }),
        ]),
      );
      anim.start();
      return () => { anim.stop(); scale.setValue(1); };
    } else {
      scale.setValue(1);
    }
  }, [speaking]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Animated.View style={[
        sb.btn,
        { borderColor: agent.color + '60', backgroundColor: agent.color + '18', transform: [{ scale }] }
      ]}>
        <Ionicons
          name={speaking ? 'volume-high' : 'volume-medium-outline'}
          size={13}
          color={agent.color}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const sv = StyleSheet.create({
  wrap:         { flexDirection: 'row', alignItems: 'center', gap: rs(12),
                  borderRadius: rw(16), borderWidth: 1.5,
                  padding: rs(12), marginHorizontal: rs(16), marginBottom: rs(10),
                  shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  ring:         { width: rw(56), height: rw(56), borderRadius: rw(28), borderWidth: 2.5,
                  overflow: 'hidden',
                  shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 5 },
  avatar:       { width: '100%', height: '100%' },
  liveBadge:    { position: 'absolute', bottom: 0, left: 0, right: 0,
                  alignItems: 'center', justifyContent: 'center', paddingVertical: rs(2) },
  nameRow:      { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(3), flexWrap: 'wrap' },
  agentName:    { fontSize: rf(13), fontWeight: '900' },
  badge:        { borderRadius: 5, paddingHorizontal: rs(5), paddingVertical: rs(1.5), borderWidth: 1 },
  badgeTxt:     { fontSize: rf(8.5), fontWeight: '800', letterSpacing: 0.5 },
  speakingPill: { borderRadius: 20, paddingHorizontal: rs(7), paddingVertical: rs(2) },
  speakingTxt:  { fontSize: rf(9), fontWeight: '700' },
  message:      { fontSize: rf(12.5), lineHeight: rf(19) },
});

const sc = StyleSheet.create({
  chip:       { flexDirection: 'row', alignItems: 'center', gap: rs(10),
                borderRadius: rw(14), borderWidth: 1, padding: rs(10) },
  avatarWrap: { width: rw(36), height: rw(36), borderRadius: rw(18), borderWidth: 2,
                overflow: 'hidden', shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  avatar:     { width: '100%', height: '100%' },
  dot:        { position: 'absolute', bottom: 0, right: 0, width: rs(10), height: rs(10),
                borderRadius: rs(5), borderWidth: 1.5, borderColor: '#000' },
  name:       { fontSize: rf(13), fontWeight: '800' },
  role:       { fontSize: rf(10), marginTop: rs(1) },
});

const sb = StyleSheet.create({
  btn: { width: rw(26), height: rw(26), borderRadius: rw(13), borderWidth: 1,
         alignItems: 'center', justifyContent: 'center' },
});
