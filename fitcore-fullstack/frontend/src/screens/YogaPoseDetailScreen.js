import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, Dimensions,
} from 'react-native';
import { Video, ResizeMode, Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useC } from '../utils/theme';
import { useThemeStore } from '../store/themeStore';
import { POSES, POSE_MAP, WEEKLY, YOGA_MUSIC_URI } from '../utils/yogaData';

const { width: W, height: H } = Dimensions.get('window');

// ── Music bars ────────────────────────────────────────────────────────────────
function MusicBars({ active }) {
  const bars = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.7)).current,
    useRef(new Animated.Value(0.5)).current,
  ];
  useEffect(() => {
    if (!active) { bars.forEach(v => v.setValue(0.3)); return; }
    const durs = [380, 260, 500];
    const anims = bars.map((v, i) =>
      Animated.loop(Animated.sequence([
        Animated.timing(v, { toValue: 1.0, duration: durs[i], useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.15, duration: durs[i], useNativeDriver: true }),
      ]))
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, [active]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 14 }}>
      {bars.map((v, i) => (
        <Animated.View key={i} style={{
          width: 3, height: 14, borderRadius: 2,
          backgroundColor: '#C8F135', transform: [{ scaleY: v }],
        }} />
      ))}
    </View>
  );
}

export default function YogaPoseDetailScreen({ route, navigation }) {
  const { poseId } = route.params;
  const pose = POSE_MAP[poseId];
  const C = useC();
  const isDark = useThemeStore(s => s.isDark);
  const insets = useSafeAreaInsets();
  const [videoReady, setVideoReady] = useState(false);

  // Music
  const [musicOn, setMusicOn] = useState(false);
  const [musicLoading, setMusicLoading] = useState(false);
  const soundRef = useRef(null);

  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });
    return () => { soundRef.current?.unloadAsync().catch(() => {}); };
  }, []);

  const toggleMusic = async () => {
    if (musicLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMusicLoading(true);
    try {
      if (musicOn) {
        await soundRef.current?.pauseAsync();
        setMusicOn(false);
      } else {
        if (!soundRef.current) {
          const { sound } = await Audio.Sound.createAsync(
            { uri: YOGA_MUSIC_URI },
            { shouldPlay: true, isLooping: true, volume: 0.65 }
          );
          soundRef.current = sound;
        } else {
          await soundRef.current.playAsync();
        }
        setMusicOn(true);
      }
    } catch (e) { console.warn('Music:', e); }
    setMusicLoading(false);
  };

  // Level color
  const levelColor = { Beginner: '#C8F135', Intermediate: '#F59E0B', Advanced: '#FF6B6B', 'All Levels': '#4ECDC4' };
  const lColor = levelColor[pose?.level] || '#C8F135';

  // Related poses (same day sessions that include this pose)
  const related = POSES.filter(p => p.id !== poseId).slice(0, 3);

  if (!pose) return null;

  return (
    <View style={[st.root, { backgroundColor: '#0A0A0F' }]}>
      {/* ── Video section ───────────────────────────────────── */}
      <View style={st.videoBox}>
        {!videoReady && (
          <LinearGradient
            colors={['#0D1A0D', '#0A0A14', '#0a0a14']}
            style={[StyleSheet.absoluteFill, st.videoPlaceholder]}
          >
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(200,241,53,0.08)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(200,241,53,0.2)' }}>
              <Ionicons name="leaf" size={28} color="rgba(200,241,53,0.5)" />
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.25)', marginTop: 14, fontSize: 12, fontWeight: '600', letterSpacing: 1 }}>LOADING POSE</Text>
          </LinearGradient>
        )}
        <Video
          source={pose.src}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          shouldPlay isLooping isMuted
          onReadyForDisplay={() => setVideoReady(true)}
        />

        {/* Gradient overlay bottom */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.5)', '#0A0A0F']}
          style={StyleSheet.absoluteFill}
          locations={[0.4, 0.75, 1]}
        />

        {/* Watermark cover — bottom right, only visible when video is playing */}
        {videoReady && <View style={st.watermarkCover} />}

        {/* Back button */}
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }}
          style={[st.backBtn, { top: insets.top + 10 }]}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>

        {/* Music button */}
        <TouchableOpacity
          onPress={toggleMusic}
          style={[st.musicBtnVideo, {
            top: insets.top + 10,
            backgroundColor: musicOn ? 'rgba(200,241,53,0.2)' : 'rgba(0,0,0,0.55)',
            borderColor: musicOn ? 'rgba(200,241,53,0.55)' : 'rgba(255,255,255,0.18)',
          }]}
        >
          {musicOn
            ? <><MusicBars active /><Ionicons name="musical-notes" size={14} color="#C8F135" /></>
            : <><Ionicons name="musical-notes-outline" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' }}>
                  {musicLoading ? '…' : 'Music'}
                </Text></>
          }
        </TouchableOpacity>

        {/* Pose name overlay at bottom of video */}
        <View style={st.videoPoseInfo}>
          <View style={st.yogaTag}><Text style={st.yogaTagTxt}>YOGA</Text></View>
          <Text style={st.videoPoseName}>{pose.label}</Text>
        </View>
      </View>

      {/* ── Scrollable details ──────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}
      >
        {/* Stats row */}
        <View style={st.statsRow}>
          <View style={st.statBox}>
            <Ionicons name="time-outline" size={18} color="#C8F135" />
            <Text style={st.statVal}>{pose.dur}</Text>
            <Text style={st.statLbl}>Duration</Text>
          </View>
          <View style={st.statDivider} />
          <View style={st.statBox}>
            <Ionicons name="refresh-outline" size={18} color="#4ECDC4" />
            <Text style={[st.statVal, { color: '#4ECDC4' }]}>{pose.reps}</Text>
            <Text style={st.statLbl}>Sets & Reps</Text>
          </View>
          <View style={st.statDivider} />
          <View style={st.statBox}>
            <Ionicons name="flame-outline" size={18} color="#F59E0B" />
            <Text style={[st.statVal, { color: '#F59E0B' }]}>{pose.calories} cal</Text>
            <Text style={st.statLbl}>Burned</Text>
          </View>
        </View>

        {/* Level badge */}
        <View style={[st.levelBadge, { backgroundColor: lColor + '18', borderColor: lColor + '40' }]}>
          <View style={[st.levelDot, { backgroundColor: lColor }]} />
          <Text style={[st.levelTxt, { color: lColor }]}>{pose.level}</Text>
        </View>

        {/* Benefits */}
        <Text style={[st.heading, { color: C.text }]}>Benefits</Text>
        <View style={st.benefitsRow}>
          {pose.benefits.map((b, i) => (
            <View key={i} style={st.benefitPill}>
              <Ionicons name="checkmark-circle" size={13} color="#C8F135" />
              <Text style={st.benefitTxt}>{b}</Text>
            </View>
          ))}
        </View>

        {/* Tips */}
        <Text style={[st.heading, { color: C.text }]}>How to Do It</Text>
        <View style={[st.tipsBox, { backgroundColor: isDark ? '#111118' : '#F5F5F8', borderColor: 'rgba(200,241,53,0.15)' }]}>
          <Ionicons name="information-circle-outline" size={18} color="#C8F135" style={{ marginTop: 2 }} />
          <Text style={[st.tipsTxt, { color: C.dim }]}>{pose.tips}</Text>
        </View>

        {/* Related poses */}
        <Text style={[st.heading, { color: C.text }]}>More Poses</Text>
        {related.map((p, idx) => {
          const thumbColors = [['#1A2A1A','#0D1A0D'], ['#1A1A2A','#0D0D1A'], ['#2A1A1A','#1A0D0D']];
          const [tc1, tc2] = thumbColors[idx % 3];
          return (
            <TouchableOpacity
              key={p.id}
              activeOpacity={0.8}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.replace('YogaPoseDetail', { poseId: p.id }); }}
              style={[st.relatedCard, { backgroundColor: isDark ? '#111118' : '#F5F5F8' }]}
            >
              <LinearGradient colors={[tc1, tc2]} style={st.relatedThumb} start={{x:0,y:0}} end={{x:1,y:1}}>
                <Ionicons name="leaf" size={22} color="rgba(200,241,53,0.35)" />
                <View style={{ position:'absolute', bottom:5, right:6 }}>
                  <Ionicons name="play-circle" size={16} color="rgba(200,241,53,0.6)" />
                </View>
              </LinearGradient>
              <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10 }}>
                <Text style={{ color: C.text, fontWeight: '700', fontSize: 14, marginBottom: 3 }}>{p.label}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="time-outline" size={11} color="#C8F135" />
                  <Text style={{ color: '#C8F135', fontSize: 11, fontWeight: '700' }}>{p.dur}</Text>
                  <Text style={{ color: C.dim, fontSize: 11 }}>· {p.reps}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.dim} style={{ marginRight: 12 }} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root:             { flex: 1 },
  videoBox:         { height: H * 0.45, backgroundColor: '#0a0a14' },
  videoPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  watermarkCover:   { position: 'absolute', bottom: 48, right: 10, width: 32, height: 32, backgroundColor: '#0A0A0F', borderRadius: 6 },
  watermarkCoverSmall: { position: 'absolute', bottom: 2, right: 2, width: 20, height: 20, backgroundColor: '#0a0a14', borderRadius: 4 },
  backBtn:          { position: 'absolute', left: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  musicBtnVideo:    { position: 'absolute', right: 16, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 22, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  videoPoseInfo:    { position: 'absolute', bottom: 16, left: 20 },
  videoPoseName:    { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 6 },
  yogaTag:          { backgroundColor: 'rgba(200,241,53,0.22)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  yogaTagTxt:       { color: '#C8F135', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  statsRow:     { flexDirection: 'row', marginTop: 20, marginBottom: 16 },
  statBox:      { flex: 1, alignItems: 'center', gap: 4 },
  statVal:      { color: '#C8F135', fontSize: 14, fontWeight: '800' },
  statLbl:      { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '600' },
  statDivider:  { width: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 4 },

  levelBadge:   { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, marginBottom: 20 },
  levelDot:     { width: 7, height: 7, borderRadius: 4 },
  levelTxt:     { fontSize: 12, fontWeight: '700' },

  heading:      { fontSize: 15, fontWeight: '800', letterSpacing: 0.3, marginBottom: 10 },

  benefitsRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 },
  benefitPill:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(200,241,53,0.1)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(200,241,53,0.25)' },
  benefitTxt:   { color: '#C8F135', fontSize: 12, fontWeight: '600' },

  tipsBox:      { flexDirection: 'row', gap: 10, borderRadius: 14, padding: 14, marginBottom: 22, borderWidth: 1 },
  tipsTxt:      { flex: 1, fontSize: 13, lineHeight: 20 },

  relatedCard:  { flexDirection: 'row', borderRadius: 14, overflow: 'hidden', marginBottom: 10, alignItems: 'center' },
  relatedThumb: { width: 90, height: 70, justifyContent: 'center', alignItems: 'center' },
});
