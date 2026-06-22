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
import { POSES, POSE_MAP, WEEKLY, DAY_NAMES, YOGA_MUSIC_URI } from '../utils/yogaData';

const { width: W } = Dimensions.get('window');

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

// ── Full pose card (Today tab) ─────────────────────────────────────────────
function PoseCardFull({ pose, C, isDark, navigation }) {
  const [ready, setReady] = useState(false);
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('YogaPoseDetail', { poseId: pose.id }); }}
      style={[st.fullCard, { backgroundColor: isDark ? '#111118' : '#F5F5F8' }]}
    >
      <View style={st.fullVideoBox}>
        {!ready && (
          <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a14' }]}>
            <Ionicons name="leaf-outline" size={28} color="rgba(200,241,53,0.4)" />
          </View>
        )}
        <Video source={pose.src} style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER} shouldPlay isLooping isMuted
          onReadyForDisplay={() => setReady(true)} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']}
          style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', padding: 12 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{pose.label}</Text>
            <View style={st.yogaTag}><Text style={st.yogaTagTxt}>YOGA</Text></View>
          </View>
        </LinearGradient>
        {/* Tap hint */}
        <View style={st.tapHint}>
          <Ionicons name="expand-outline" size={13} color="rgba(255,255,255,0.7)" />
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600' }}>Tap for details</Text>
        </View>
      </View>
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Ionicons name="time-outline" size={13} color="#C8F135" />
            <Text style={{ color: '#C8F135', fontWeight: '700', fontSize: 13 }}>{pose.dur}</Text>
          </View>
          <View style={{ width: 1, height: 12, backgroundColor: C.border }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Ionicons name="refresh-outline" size={13} color={C.dim} />
            <Text style={{ color: C.dim, fontSize: 12 }}>{pose.reps}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {pose.benefits.map((b, i) => (
            <View key={i} style={st.benefitPill}>
              <Text style={st.benefitTxt}>✦ {b}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Compact pose card (Weekly + All Poses tabs) ───────────────────────────────
function PoseCardCompact({ pose, C, isDark, navigation }) {
  const [ready, setReady] = useState(false);
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('YogaPoseDetail', { poseId: pose.id }); }}
      style={[st.compactCard, { backgroundColor: isDark ? '#111118' : '#F5F5F8' }]}
    >
      <View style={st.compactVideo}>
        <Video source={pose.src} style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          shouldPlay={false} isMuted
          onReadyForDisplay={() => setReady(true)} />
        {!ready && (
          <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a14' }]}>
            <Ionicons name="leaf-outline" size={18} color="rgba(200,241,53,0.4)" />
          </View>
        )}
        {/* Watermark cover */}
        <View style={st.watermarkCoverSmall} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)']} style={StyleSheet.absoluteFill} />
        {/* Play indicator */}
        <View style={{ position:'absolute', top:4, left:4, backgroundColor:'rgba(0,0,0,0.5)', borderRadius:8, padding:2 }}>
          <Ionicons name="play" size={8} color="rgba(255,255,255,0.8)" />
        </View>
      </View>
      <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10 }}>
        <Text style={{ color: C.text, fontWeight: '700', fontSize: 14, marginBottom: 3 }}>{pose.label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="time-outline" size={11} color="#C8F135" />
            <Text style={{ color: '#C8F135', fontWeight: '700', fontSize: 11 }}>{pose.dur}</Text>
          </View>
          <Text style={{ color: C.dim, fontSize: 11 }}>{pose.reps}</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {pose.benefits.slice(0, 2).map((b, i) => (
            <View key={i} style={[st.benefitPill, { paddingHorizontal: 6, paddingVertical: 2 }]}>
              <Text style={[st.benefitTxt, { fontSize: 9 }]}>✦ {b}</Text>
            </View>
          ))}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.dim} style={{ marginRight: 12 }} />
    </TouchableOpacity>
  );
}

// ── Today Tab ─────────────────────────────────────────────────────────────────
function TodayTab({ C, isDark, navigation }) {
  const todayName = DAY_NAMES[new Date().getDay()];
  const session = WEEKLY.find(w => w.day === todayName) || WEEKLY[0];
  const poses = session.poses.map(id => POSE_MAP[id]).filter(Boolean);
  const totalMins = poses.reduce((acc, p) => acc + parseInt(p.dur), 0);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <LinearGradient
        colors={[session.color + '33', session.color + '11']}
        style={[st.sessionBanner, { borderColor: session.color + '44' }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.dim, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 3 }}>TODAY · {todayName.toUpperCase()}</Text>
          <Text style={{ color: C.text, fontSize: 20, fontWeight: '800', marginBottom: 4 }}>{session.name}</Text>
          <Text style={{ color: C.dim, fontSize: 12, lineHeight: 18 }}>{session.desc}</Text>
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name="time-outline" size={13} color={session.color} />
              <Text style={{ color: session.color, fontWeight: '700', fontSize: 13 }}>{session.dur}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name="body-outline" size={13} color={session.color} />
              <Text style={{ color: session.color, fontWeight: '700', fontSize: 13 }}>{poses.length} Poses</Text>
            </View>
          </View>
        </View>
        <View style={[st.sessionDot, { backgroundColor: session.color }]}>
          <Ionicons name="leaf" size={22} color="#fff" />
        </View>
      </LinearGradient>

      <Text style={[st.sectionHeading, { color: C.text }]}>Today's Poses</Text>
      {poses.map((pose, i) => (
        <View key={pose.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <View style={[st.stepDot, { backgroundColor: session.color }]}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{i + 1}</Text>
            </View>
            <View style={{ height: 1, flex: 1, backgroundColor: C.border }} />
          </View>
          <PoseCardFull pose={pose} C={C} isDark={isDark} navigation={navigation} />
          {i < poses.length - 1 && <View style={{ height: 16 }} />}
        </View>
      ))}

      <LinearGradient
        colors={['rgba(200,241,53,0.08)', 'rgba(200,241,53,0.03)']}
        style={[st.totalBanner, { borderColor: 'rgba(200,241,53,0.2)' }]}
      >
        <Ionicons name="checkmark-circle-outline" size={20} color="#C8F135" />
        <Text style={{ color: '#C8F135', fontWeight: '700', fontSize: 14 }}>
          Total Session: {totalMins} minutes
        </Text>
      </LinearGradient>
    </ScrollView>
  );
}

// ── Weekly Tab ────────────────────────────────────────────────────────────────
function WeeklyTab({ C, isDark, navigation }) {
  const todayName = DAY_NAMES[new Date().getDay()];
  const todayIdx = WEEKLY.findIndex(w => w.day === todayName);
  const [selected, setSelected] = useState(todayIdx >= 0 ? todayIdx : 0);
  const session = WEEKLY[selected];
  const poses = session.poses.map(id => POSE_MAP[id]).filter(Boolean);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 10 }}>
        {WEEKLY.map((w, i) => {
          const isToday = w.day === todayName;
          const isActive = i === selected;
          return (
            <TouchableOpacity key={w.day}
              onPress={() => { Haptics.selectionAsync(); setSelected(i); }}
              style={[st.dayPill, {
                backgroundColor: isActive ? w.color : (isDark ? '#1a1a25' : '#F0F0F5'),
                borderColor: isToday && !isActive ? w.color : 'transparent',
                borderWidth: isToday && !isActive ? 1.5 : 0,
              }]}>
              {isToday && !isActive && <View style={[st.todayDot, { backgroundColor: w.color }]} />}
              <Text style={{ color: isActive ? '#0A0A0F' : C.dim, fontWeight: '800', fontSize: 11 }}>{w.day}</Text>
              <Text style={{ color: isActive ? '#0A0A0F' : C.text, fontWeight: '700', fontSize: 10, marginTop: 1 }}>{w.name.split(' ')[0]}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={{ paddingHorizontal: 16 }}>
        <LinearGradient
          colors={[session.color + '28', session.color + '0A']}
          style={[st.weeklyBanner, { borderColor: session.color + '40' }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <View>
            <Text style={{ color: session.color, fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>{session.day.toUpperCase()}</Text>
            <Text style={{ color: C.text, fontSize: 18, fontWeight: '800', marginTop: 2 }}>{session.name}</Text>
            <Text style={{ color: C.dim, fontSize: 12, marginTop: 4, lineHeight: 18 }}>{session.desc}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <View style={[st.durationBadge, { backgroundColor: session.color + '22', borderColor: session.color + '44' }]}>
              <Ionicons name="time-outline" size={12} color={session.color} />
              <Text style={{ color: session.color, fontWeight: '700', fontSize: 12 }}>{session.dur}</Text>
            </View>
            <Text style={{ color: C.dim, fontSize: 11 }}>{poses.length} poses</Text>
          </View>
        </LinearGradient>

        <Text style={[st.sectionHeading, { color: C.text }]}>Session Poses</Text>
        {poses.map(pose => (
          <View key={pose.id} style={{ marginBottom: 10 }}>
            <PoseCardCompact pose={pose} C={C} isDark={isDark} navigation={navigation} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ── All Poses Tab ─────────────────────────────────────────────────────────────
function AllPosesTab({ C, isDark, navigation }) {
  return (
    <ScrollView showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Text style={{ color: C.dim, fontSize: 12, marginBottom: 14, lineHeight: 18 }}>
        Complete library — tap any pose to see full details and guided instructions.
      </Text>
      {POSES.map(pose => (
        <View key={pose.id} style={{ marginBottom: 10 }}>
          <PoseCardCompact pose={pose} C={C} isDark={isDark} navigation={navigation} />
        </View>
      ))}
    </ScrollView>
  );
}

// ── Main YogaScreen ───────────────────────────────────────────────────────────
export default function YogaScreen({ navigation }) {
  const C = useC();
  const isDark = useThemeStore(s => s.isDark);
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(0);
  const tabs = ['Today', 'Weekly', 'All Poses'];

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
    } catch (e) { console.warn('Yoga music:', e); }
    setMusicLoading(false);
  };

  return (
    <View style={[st.root, { backgroundColor: C.bg }]}>
      <LinearGradient
        colors={isDark ? ['#0D1A05', '#0A0A0F'] : ['#1A2A0A', '#0E1117']}
        style={[st.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <View style={st.leafBadge}>
              <Ionicons name="leaf" size={14} color="#C8F135" />
            </View>
            <Text style={st.headerTitle}>Yoga Studio</Text>
          </View>
          <Text style={st.headerSub}>Your daily mind-body practice</Text>
        </View>
        <TouchableOpacity onPress={toggleMusic} activeOpacity={0.8}
          style={[st.musicBtn, {
            backgroundColor: musicOn ? 'rgba(200,241,53,0.18)' : 'rgba(255,255,255,0.08)',
            borderColor: musicOn ? 'rgba(200,241,53,0.55)' : 'rgba(255,255,255,0.15)',
          }]}>
          {musicOn
            ? <><MusicBars active /><Ionicons name="musical-notes" size={15} color="#C8F135" /></>
            : <><Ionicons name="musical-notes-outline" size={15} color="rgba(255,255,255,0.6)" />
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600' }}>
                  {musicLoading ? 'Loading…' : 'Music'}
                </Text></>
          }
        </TouchableOpacity>
      </LinearGradient>

      <View style={[st.tabBar, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        {tabs.map((t, i) => (
          <TouchableOpacity key={t}
            onPress={() => { Haptics.selectionAsync(); setActiveTab(i); }}
            style={[st.tabBtn, activeTab === i && st.tabBtnActive]}>
            <Text style={[st.tabTxt, { color: activeTab === i ? '#C8F135' : C.dim }]}>{t}</Text>
            {activeTab === i && <View style={st.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 0 && <TodayTab C={C} isDark={isDark} navigation={navigation} />}
        {activeTab === 1 && <WeeklyTab C={C} isDark={isDark} navigation={navigation} />}
        {activeTab === 2 && <AllPosesTab C={C} isDark={isDark} navigation={navigation} />}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  root:           { flex: 1 },
  header:         { paddingHorizontal: 18, paddingBottom: 16, flexDirection: 'row', alignItems: 'flex-end' },
  headerTitle:    { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 0.2 },
  headerSub:      { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  leafBadge:      { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(200,241,53,0.15)', justifyContent: 'center', alignItems: 'center' },
  musicBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 22, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  tabBar:         { flexDirection: 'row', borderBottomWidth: 1 },
  tabBtn:         { flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative' },
  tabBtnActive:   {},
  tabTxt:         { fontSize: 13, fontWeight: '700' },
  tabUnderline:   { position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 2, backgroundColor: '#C8F135', borderRadius: 2 },
  sectionHeading: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5, marginTop: 20, marginBottom: 12 },
  sessionBanner:  { borderRadius: 16, padding: 18, marginBottom: 4, flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  sessionDot:     { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  stepDot:        { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  totalBanner:    { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 14, marginTop: 20, borderWidth: 1 },
  fullCard:       { borderRadius: 16, overflow: 'hidden', marginBottom: 2 },
  fullVideoBox:   { height: 200, width: '100%', backgroundColor: '#0a0a14' },
  yogaTag:        { backgroundColor: 'rgba(200,241,53,0.22)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  yogaTagTxt:     { color: '#C8F135', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  benefitPill:    { backgroundColor: 'rgba(200,241,53,0.11)', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(200,241,53,0.28)' },
  benefitTxt:     { color: '#C8F135', fontSize: 10, fontWeight: '700' },
  compactCard:    { flexDirection: 'row', borderRadius: 14, overflow: 'hidden', alignItems: 'center' },
  compactVideo:   { width: 100, height: 80, backgroundColor: '#0a0a14' },
  watermarkCover: { position: 'absolute', bottom: 38, right: 8, width: 28, height: 28, backgroundColor: '#0a0a14', borderRadius: 6 },
  watermarkCoverSmall: { position: 'absolute', bottom: 2, right: 2, width: 18, height: 18, backgroundColor: '#0a0a14', borderRadius: 4 },
  tapHint:        { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  weeklyBanner:   { borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderWidth: 1, marginBottom: 4 },
  durationBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1 },
  dayPill:        { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, minWidth: 58, borderWidth: 1, borderColor: 'transparent' },
  todayDot:       { width: 5, height: 5, borderRadius: 3, marginBottom: 3 },
});
