import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { workoutAPI } from '../api/services';
import { useC } from '../utils/theme';
import { rf, rs, rw, SCREEN_W } from '../utils/responsive';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';

// Guaranteed fallback images (always local, never blank)
const FALLBACK_IMAGES = [
  require('../../assets/images/female/female_banner_strength.png'),
  require('../../assets/images/female/female_banner_cardio.png'),
  require('../../assets/images/female/female_banner_core.png'),
  require('../../assets/images/female/female_banner_flexibility.png'),
  require('../../assets/images/female/female_banner_recovery.png'),
  require('../../assets/images/female/female_banner_yoga.png'),
];

const strHashFallback = (s = '') => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

// SmartImage: shows fallback local image if URI/remote image fails to load
function SmartImage({ source, style, resizeMode = 'cover', contentPosition, planName = '' }) {
  const [failed, setFailed] = useState(false);
  const fallback = FALLBACK_IMAGES[strHashFallback(planName) % FALLBACK_IMAGES.length];
  const src = failed ? fallback : source;
  return (
    <Image
      source={src}
      style={style}
      contentFit={resizeMode === 'cover' ? 'cover' : 'contain'}
      contentPosition={contentPosition || "center"}
      onError={() => setFailed(true)}
    />
  );
}

// ── Local female images ───────────────────────────────────────────────────────
const F = {
  banner_strength:    require('../../assets/images/female/female_banner_strength.png'),
  banner_cardio:      require('../../assets/images/female/female_banner_cardio.png'),
  banner_hiit:        require('../../assets/images/female/female_banner_hiit.png'),
  banner_core:        require('../../assets/images/female/female_banner_core.png'),
  banner_flexibility: require('../../assets/images/female/female_banner_flexibility.png'),
  banner_recovery:    require('../../assets/images/female/female_banner_recovery.png'),
  banner_yoga:        require('../../assets/images/female/female_banner_yoga.png'),
  focus_abs:          require('../../assets/images/female/female_focus_abs.png'),
  focus_butt:         require('../../assets/images/female/female_focus_butt.png'),
  focus_leg:          require('../../assets/images/female/female_focus_leg.png'),
  focus_arm:          require('../../assets/images/female/female_focus_arm.png'),
  focus_back:         require('../../assets/images/female/female_focus_back.png'),
  focus_core:         require('../../assets/images/female/female_focus_core.png'),
};

const imgSrc = (val) => (typeof val === 'string') ? { uri: val } : val;

const strHash = (s = '') => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

// ── Per-workout images — FEMALE ───────────────────────────────────────────────
// We now rely on the category-based female_banner_*.png images instead of the placeholder JPGs.


const FEMALE_IMG_POOL = [
  'https://images.pexels.com/photos/3768916/pexels-photo-3768916.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/3822356/pexels-photo-3822356.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/3775566/pexels-photo-3775566.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/4498606/pexels-photo-4498606.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/3823039/pexels-photo-3823039.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/3757376/pexels-photo-3757376.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/4662344/pexels-photo-4662344.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/3823488/pexels-photo-3823488.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/4056723/pexels-photo-4056723.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/3757954/pexels-photo-3757954.jpeg?auto=compress&cs=tinysrgb&w=600',
];

const MALE_IMG_POOL = [
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80',
  'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=600&q=80',
  'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80',
  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80',
  'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80',
  'https://images.unsplash.com/photo-1581009137042-c552e485697a?w=600&q=80',
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80',
  'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&q=80',
  'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=600&q=80',
];

const BODY_FOCUS_MALE = [
  { key:'strength',    label:'Strength',  img:'https://images.unsplash.com/photo-1581009137042-c552e485697a?w=300&q=80' },
  { key:'cardio',      label:'Cardio',    img:'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=300&q=80' },
  { key:'hiit',        label:'HIIT',      img:'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=300&q=80' },
  { key:'flexibility', label:'Flex',      img:'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=300&q=80' },
  { key:'core',        label:'Core',      img:'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=300&q=80' },
  { key:'recovery',    label:'Recovery',  img:'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=300&q=80' },
];

const BODY_FOCUS_FEMALE = [
  { key:'core',        label:'ABS',       img: F.focus_abs  },
  { key:'strength',    label:'BUTT',      img: F.focus_butt },
  { key:'cardio',      label:'LEG',       img: F.focus_leg  },
  { key:'hiit',        label:'ARM',       img: F.focus_arm  },
  { key:'flexibility', label:'BACK',      img: F.focus_back },
  { key:'recovery',    label:'CORE',      img: F.focus_core },
];

const FOCUS_TO_CAT = { arms:'strength', chest:'strength', abs:'core', glutes:'strength', legs:'strength', back:'strength', full:null };
const FOCUS_LABELS = { arms:'Arms', chest:'Chest', abs:'Abs', glutes:'Glutes', legs:'Legs', back:'Back', full:'Full Body' };

const CAT_CFG = {
  strength:    { label:'Strength',   icon:'dumbbell',       grad:['#FF6B35','#C84B11'], accent:'#FF6B35' },
  cardio:      { label:'Cardio',     icon:'run',            grad:['#4ECDC4','#0E8F8A'], accent:'#4ECDC4' },
  hiit:        { label:'HIIT',       icon:'lightning-bolt', grad:['#FF3C5F','#B91048'], accent:'#FF3C5F' },
  flexibility: { label:'Flex',       icon:'yoga',           grad:['#A855F7','#7C3AED'], accent:'#A855F7' },
  core:        { label:'Core',       icon:'human-handsup',  grad:['#C8F135','#8BBF0A'], accent:'#C8F135' },
  recovery:    { label:'Recovery',   icon:'leaf',           grad:['#34D399','#059669'], accent:'#34D399' },
  yoga:        { label:'Yoga',       icon:'yoga',           grad:['#A855F7','#7C3AED'], accent:'#A855F7' },
};
const DEFAULT_CFG = { label:'Workout', icon:'weight-lifter', grad:['#6366F1','#4338CA'], accent:'#6366F1' };
const getCfg = (cat) => CAT_CFG[cat] || DEFAULT_CFG;
const DIFFICULTY_COLOR = { beginner:'#34D399', intermediate:'#F59E0B', advanced:'#FF3C5F' };

export default function WorkoutsScreen({ navigation }) {
  const C   = useC();
  const s   = useMemo(() => makeStyles(C), [C]);
  const user = useAuthStore(st => st.user);
  const focusAreas = user?.focus_areas || [];
  const gender = (user?.gender || '').toLowerCase() === 'female' ? 'female' : 'male';
  const BODY_FOCUS = gender === 'female' ? BODY_FOCUS_FEMALE : BODY_FOCUS_MALE;

  const FEMALE_BANNER = {
    strength:    F.banner_strength,
    cardio:      F.banner_cardio,
    hiit:        F.banner_hiit,
    core:        F.banner_core,
    flexibility: F.banner_flexibility,
    recovery:    F.banner_recovery,
    yoga:        F.banner_yoga,
  };

  const getCatImg = (plan) => {
    if (gender === 'female') {
      const cat = (plan?.category || '').toLowerCase();
      const local = FEMALE_BANNER[cat];
      if (local) return local;
      return FEMALE_IMG_POOL[strHash(plan?.name || plan?.id || plan?.category || '') % FEMALE_IMG_POOL.length];
    }
    return MALE_IMG_POOL[strHash(plan?.name || plan?.id || plan?.category || '') % MALE_IMG_POOL.length];
  };

  const [cat,     setCat]     = useState('All');
  const [search,  setSearch]  = useState('');
  const [logging, setLogging] = useState(null);
  const queryClient = useQueryClient();

  const { data: plans = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['workouts', cat, search],
    queryFn: () => {
      const p = {};
      if (cat !== 'All') p.category = cat;
      if (search)        p.search   = search;
      return workoutAPI.getPlans(p).then(r => r.data.data || []);
    },
  });

  const { data: allPlans = [] } = useQuery({
    queryKey: ['workouts-all'],
    queryFn: () => workoutAPI.getPlans({}).then(r => r.data.data || []),
    enabled: focusAreas.length > 0,
  });

  const forYouPlans = useMemo(() => {
    if (!focusAreas.length || !allPlans.length) return [];
    const cats = [...new Set(focusAreas.map(f => FOCUS_TO_CAT[f]).filter(Boolean))];
    const hasFull = focusAreas.includes('full');
    return allPlans.filter(p => hasFull || cats.includes(p.category)).slice(0, 8);
  }, [allPlans, focusAreas]);

  const { mutateAsync: quickLog } = useMutation({
    mutationFn: (plan) => workoutAPI.logWorkout({
      plan_id: plan.id, name: plan.name, category: plan.category,
      started_at:   new Date(Date.now() - plan.duration_min * 60000).toISOString(),
      ended_at:     new Date().toISOString(),
      duration_min: plan.duration_min,
      calories_burned: plan.calories,
      rating: 4,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  });

  const handleQuickLog = async (plan) => {
    setLogging(plan.id);
    try {
      await quickLog(plan);
      Alert.alert('Logged!', `${plan.name} saved.`);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Could not log');
    } finally { setLogging(null); }
  };

  const goDetail = (plan) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('WorkoutDetail', { plan });
  };

  const activeCats = useMemo(() => {
    const seen = new Set();
    plans.forEach(p => p.category && seen.add(p.category));
    return ['All', ...Object.keys(CAT_CFG).filter(k => seen.has(k))];
  }, [plans]);

  const showAll = cat === 'All' && !search;
  const heroPlan = showAll && plans.length > 0 ? plans[0] : null;
  const bannerPlans = showAll && plans.length > 1 ? plans.slice(1, 7) : [];

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.accent} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.secLabel}>DISCOVER</Text>
            <Text style={s.title}>Workouts</Text>
          </View>
          <TouchableOpacity
            style={s.videosBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('VideoLibrary'); }}
          >
            <Ionicons name="videocam-outline" size={15} color={C.accent} />
            <Text style={s.videosBtnTxt}>Videos</Text>
          </TouchableOpacity>
        </View>

        {/* ── Search ── */}
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={16} color={C.dim} style={{ marginLeft: rs(12) }} />
          <TextInput
            style={s.searchInput}
            placeholder="Search workouts..."
            placeholderTextColor={C.dim}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={{ paddingRight: rs(12) }}>
              <Ionicons name="close-circle" size={16} color={C.dim} />
            </TouchableOpacity>
          )}
        </View>

        {isLoading && <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />}

        {/* ── HERO CARD — full-width, very tall, female image prominent ── */}
        {heroPlan && (
          <HeroCard plan={heroPlan} onPress={() => goDetail(heroPlan)} getCatImg={getCatImg} />
        )}

        {/* ── FEATURED BANNERS ── */}
        {bannerPlans.length > 0 && (
          <>
            <View style={[s.sectionRow, { marginTop: rs(22) }]}>
              <View>
                <Text style={[s.secLabel, { color: C.accent }]}>NEW UPDATE</Text>
                <Text style={s.sectionTitle}>Featured Plans</Text>
              </View>
              <View style={s.countBadge}>
                <Text style={s.countBadgeTxt}>{plans.length} PROGRAMS</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: rs(16), gap: rs(14) }}>
              {bannerPlans.map(plan => (
                <BannerCard key={plan.id} plan={plan} onPress={() => goDetail(plan)} getCatImg={getCatImg} />
              ))}
            </ScrollView>
          </>
        )}

        {/* ── BODY FOCUS CIRCLES ── */}
        {showAll && (
          <>
            <View style={[s.sectionRow, { marginTop: rs(26) }]}>
              <Text style={s.sectionTitle}>Body Focus</Text>
              <Text style={[s.secLabel, { color: C.dim }]}>TAP TO FILTER</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: rs(16), gap: rs(14) }}>
              {BODY_FOCUS.map(bf => (
                <TouchableOpacity key={bf.key} style={s.focusItem}
                  onPress={() => { setCat(bf.key); Haptics.selectionAsync(); }}>
                  <View style={s.focusCircle}>
                    <Image source={imgSrc(bf.img)} style={s.focusImg} resizeMode="cover" />
                    <View style={s.focusVignette} />
                  </View>
                  <Text style={s.focusLabel}>{bf.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── CATEGORY PILLS (when filtering) ── */}
        {!showAll && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={s.pillScroll} contentContainerStyle={{ paddingHorizontal: rs(16), gap: rs(8) }}>
            {activeCats.map(c => {
              const cfg = getCfg(c);
              const on = cat === c;
              return (
                <TouchableOpacity key={c}
                  style={[s.pill, on && { backgroundColor: cfg.accent, borderColor: cfg.accent }]}
                  onPress={() => setCat(c)}>
                  <Text style={[s.pillTxt, on && { color: '#000' }]}>{c === 'All' ? 'All' : cfg.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ── TRENDING CHOICES ── */}
        {showAll && plans.length > 0 && (
          <>
            <View style={[s.sectionRow, { marginTop: rs(26) }]}>
              <View>
                <Text style={[s.secLabel, { color: C.accent }]}>TRENDING NOW</Text>
                <Text style={s.sectionTitle}>Fat Burning</Text>
              </View>
              <TouchableOpacity style={s.viewAllBtn}>
                <Text style={s.viewAllTxt}>See all</Text>
                <Ionicons name="chevron-forward" size={12} color={C.accent} />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: rs(16), gap: rs(14) }}>
              {plans.slice(0, 5).map((p, i) => (
                <TrendCard key={p.id} plan={p} rank={i + 1} onPress={() => goDetail(p)} getCatImg={getCatImg} />
              ))}
            </ScrollView>
          </>
        )}

        {/* ── FOR YOU ── */}
        {cat === 'All' && forYouPlans.length > 0 && (
          <>
            <View style={[s.sectionRow, { marginTop: rs(26) }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(6) }}>
                <Ionicons name="star" size={14} color={C.accent} />
                <Text style={s.sectionTitle}>For You</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: rs(4), flexWrap: 'wrap' }}>
                {focusAreas.slice(0, 3).map(f => (
                  <View key={f} style={s.focusBadge}>
                    <Text style={s.focusBadgeTxt}>{FOCUS_LABELS[f]}</Text>
                  </View>
                ))}
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: rs(16), gap: rs(14) }}>
              {forYouPlans.map((p, i) => (
                <TrendCard key={p.id} plan={p} rank={i + 1} onPress={() => goDetail(p)} getCatImg={getCatImg} />
              ))}
            </ScrollView>
          </>
        )}

        {/* ── ALL WORKOUTS LIST ── */}
        <View style={[s.sectionRow, { marginTop: rs(26) }]}>
          <Text style={s.sectionTitle}>
            {cat === 'All' ? 'All Workouts' : `${getCfg(cat).label} Workouts`}
          </Text>
          <Text style={s.secCount}>{plans.length} TOTAL</Text>
        </View>

        {plans.length === 0 && !isLoading && (
          <View style={s.empty}>
            <Ionicons name="search-outline" size={rf(40)} color={C.dim} style={{ marginBottom: 10 }} />
            <Text style={s.emptyTxt}>No workouts found</Text>
          </View>
        )}

        {plans.map((item, idx) => (
          <ListCard key={item.id} plan={item} rank={idx + 1}
            isLogging={logging === item.id}
            logging={logging}
            onPress={() => goDetail(item)}
            onLog={() => handleQuickLog(item)}
            getCatImg={getCatImg}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── HERO CARD — full-width large card, woman fully visible ────────────────────
function HeroCard({ plan, onPress, getCatImg }) {
  const C    = useC();
  const cfg  = getCfg(plan.category);
  const diff = plan.difficulty || 'beginner';
  const imgUri = getCatImg(plan);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}
      style={{ marginHorizontal: rs(16), marginTop: rs(8), borderRadius: rw(24), overflow: 'hidden', height: rw(280) }}>
      {/* Full image — woman fully visible, no overlay on top */}
      <SmartImage source={imgSrc(imgUri)} style={StyleSheet.absoluteFill} resizeMode="cover" contentPosition="center top" planName={plan.name || plan.category || ''} />

      {/* Only bottom 45% dark gradient — top stays bright and clear */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={{ flex: 0.55 }} />
        <View style={{
          flex: 0.45,
          backgroundColor: 'rgba(0,0,0,0.72)',
        }} />
      </View>

      {/* Top badges */}
      <View style={{ position: 'absolute', top: rs(14), left: rs(14), right: rs(14), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ backgroundColor: cfg.accent, borderRadius: rw(20), paddingHorizontal: rs(12), paddingVertical: rs(5) }}>
          <Text style={{ color: '#000', fontSize: rf(10), fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' }}>
            {cfg.label}
          </Text>
        </View>
        <View style={{ backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: rw(16), paddingHorizontal: rs(10), paddingVertical: rs(4), borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
          <Text style={{ color: '#fff', fontSize: rf(10), fontWeight: '700' }}>⭐ FEATURED</Text>
        </View>
      </View>

      {/* Bottom content */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: rs(18) }}>
        <Text style={{ color: '#fff', fontSize: rf(22), fontWeight: '900', lineHeight: rf(28), marginBottom: rs(8),
          textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 }}
          numberOfLines={2}>{plan.name}</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(14), marginBottom: rs(12) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(5) }}>
            <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: rf(13), fontWeight: '700' }}>{plan.duration_min} min</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(5) }}>
            <Ionicons name="flame-outline" size={14} color="#FF6B35" />
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: rf(13), fontWeight: '700' }}>{plan.calories} kcal</Text>
          </View>
          <View style={{ backgroundColor: DIFFICULTY_COLOR[diff] + '33', borderRadius: rw(10), paddingHorizontal: rs(8), paddingVertical: rs(3), borderWidth: 1, borderColor: DIFFICULTY_COLOR[diff] }}>
            <Text style={{ color: DIFFICULTY_COLOR[diff], fontSize: rf(10), fontWeight: '800', textTransform: 'capitalize' }}>{diff}</Text>
          </View>
        </View>

        {/* Start button */}
        <TouchableOpacity onPress={onPress}
          style={{ backgroundColor: C.accent, borderRadius: rw(14), paddingVertical: rs(12), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(8) }}>
          <Ionicons name="play" size={16} color={C.accentText} />
          <Text style={{ color: C.accentText, fontSize: rf(14), fontWeight: '900', letterSpacing: 0.5 }}>START WORKOUT</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ── BANNER CARD — horizontal scroll, woman clearly visible ───────────────────
function BannerCard({ plan, onPress, getCatImg }) {
  const cfg   = getCfg(plan.category);
  const diff  = plan.difficulty || 'beginner';
  const cardW = SCREEN_W * 0.72;
  const imgUri = getCatImg(plan);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88}
      style={{ width: cardW, height: rw(230), borderRadius: rw(22), overflow: 'hidden' }}>
      {/* full image — woman visible */}
      <SmartImage source={imgSrc(imgUri)} style={StyleSheet.absoluteFill} resizeMode="cover" contentPosition="center top" planName={plan.name || plan.category || ''} />

      {/* Gradient — only bottom 40% */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={{ flex: 0.6 }} />
        <View style={{ flex: 0.4, backgroundColor: 'rgba(0,0,0,0.75)' }} />
      </View>

      {/* Top row badges */}
      <View style={{ position: 'absolute', top: rs(12), left: rs(12), right: rs(12), flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ backgroundColor: cfg.accent + 'EE', borderRadius: rw(18), paddingHorizontal: rs(10), paddingVertical: rs(4) }}>
          <Text style={{ color: '#000', fontSize: rf(10), fontWeight: '900', textTransform: 'uppercase' }}>{cfg.label}</Text>
        </View>
        <View style={{ backgroundColor: DIFFICULTY_COLOR[diff] + '33', borderRadius: rw(12), paddingHorizontal: rs(8), paddingVertical: rs(3), borderWidth: 1, borderColor: DIFFICULTY_COLOR[diff] }}>
          <Text style={{ color: DIFFICULTY_COLOR[diff], fontSize: rf(10), fontWeight: '700', textTransform: 'capitalize' }}>{diff}</Text>
        </View>
      </View>

      {/* Play button */}
      <View style={{
        position: 'absolute', right: rs(14), top: '38%',
        width: rw(44), height: rw(44), borderRadius: rw(22),
        backgroundColor: 'rgba(255,255,255,0.22)',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)',
      }}>
        <Ionicons name="play" size={rw(17)} color="#fff" style={{ marginLeft: rs(2) }} />
      </View>

      {/* Bottom content */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: rs(14) }}>
        <Text style={{ color: '#fff', fontSize: rf(16), fontWeight: '900', marginBottom: rs(5),
          textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }}
          numberOfLines={2}>{plan.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(12) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(4) }}>
            <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: rf(12), fontWeight: '600' }}>{plan.duration_min} min</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(4) }}>
            <Ionicons name="flame-outline" size={12} color="#FF6B35" />
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: rf(12), fontWeight: '600' }}>{plan.calories} kcal</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── TREND CARD — photo thumbnail + info ──────────────────────────────────────
function TrendCard({ plan, rank, onPress, getCatImg }) {
  const C    = useC();
  const cfg  = getCfg(plan.category);
  const diff = plan.difficulty || 'beginner';
  const imgUri = getCatImg(plan);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}
      style={{ width: rw(170), backgroundColor: '#16161F', borderRadius: rw(20),
        overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
      {/* photo thumbnail — taller */}
      <View style={{ height: rw(120), overflow: 'hidden' }}>
        <SmartImage source={imgSrc(imgUri)} style={{ width: '100%', height: '100%' }} resizeMode="cover" contentPosition="right top" planName={plan.name || plan.category || ''} />
        {/* lighter overlay so woman is visible */}
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.18)' }} />
        {/* rank */}
        <Text style={{ position: 'absolute', left: rs(9), top: rs(5),
          color: 'rgba(255,255,255,0.9)', fontSize: rf(34), fontWeight: '900',
          textShadowColor: 'rgba(0,0,0,0.95)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5 }}>
          {rank}
        </Text>
        {/* category pill bottom */}
        <View style={{ position: 'absolute', bottom: rs(8), left: rs(8),
          backgroundColor: cfg.accent, borderRadius: rw(10),
          paddingHorizontal: rs(8), paddingVertical: rs(3) }}>
          <Text style={{ color: '#000', fontSize: rf(9), fontWeight: '900', textTransform: 'uppercase' }}>
            {cfg.label}
          </Text>
        </View>
      </View>
      {/* info */}
      <View style={{ padding: rs(11) }}>
        <Text style={{ color: '#fff', fontSize: rf(13), fontWeight: '800', marginBottom: rs(4) }} numberOfLines={2}>
          {plan.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(8) }}>
          <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.45)" />
          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: rf(11) }}>
            {plan.duration_min} min · {plan.calories} kcal
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(6) }}>
          <View style={{ backgroundColor: DIFFICULTY_COLOR[diff] + '22', borderRadius: rw(7),
            paddingHorizontal: rs(7), paddingVertical: rs(2), borderWidth: 1,
            borderColor: DIFFICULTY_COLOR[diff] + '66' }}>
            <Text style={{ color: DIFFICULTY_COLOR[diff], fontSize: rf(9), fontWeight: '700', textTransform: 'capitalize' }}>
              {diff}
            </Text>
          </View>
          {plan.is_featured && (
            <View style={{ backgroundColor: C.accentDim, borderRadius: rw(7),
              paddingHorizontal: rs(6), paddingVertical: rs(2), borderWidth: 1, borderColor: `${C.accent}80` }}>
              <Text style={{ color: C.accent, fontSize: rf(9), fontWeight: '700' }}>FREE</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── LIST CARD — bigger image, cleaner layout ──────────────────────────────────
function ListCard({ plan, rank, isLogging, logging, onPress, onLog, getCatImg }) {
  const C    = useC();
  const cfg  = getCfg(plan.category);
  const diff = plan.difficulty || 'beginner';
  const imgUri = getCatImg(plan);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88}
      style={{ marginHorizontal: rs(16), marginBottom: rs(10), borderRadius: rw(18),
        backgroundColor: '#16161F', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
        flexDirection: 'row', overflow: 'hidden', height: rw(90) }}>

      {/* left color accent bar */}
      <View style={{ width: 3, backgroundColor: cfg.accent }} />

      {/* photo thumbnail */}
      <View style={{ width: rw(90), overflow: 'hidden' }}>
        <SmartImage source={imgSrc(imgUri)} style={{ width: '100%', height: '100%' }} resizeMode="cover" contentPosition="center top" planName={plan.name || plan.category || ''} />
        {/* subtle overlay */}
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' }} />
        {/* rank */}
        <Text style={{ position: 'absolute', left: rs(6), bottom: rs(4),
          color: 'rgba(255,255,255,0.8)', fontSize: rf(20), fontWeight: '900',
          textShadowColor: 'rgba(0,0,0,0.95)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
          {rank}
        </Text>
      </View>

      {/* info */}
      <View style={{ flex: 1, paddingHorizontal: rs(12), justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontSize: rf(14), fontWeight: '800', marginBottom: rs(3) }} numberOfLines={1}>
          {plan.name}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: rf(11), marginBottom: rs(7) }}>
          {plan.duration_min} min • {plan.calories} kcal
        </Text>
        <View style={{ flexDirection: 'row', gap: rs(6) }}>
          <View style={{ backgroundColor: DIFFICULTY_COLOR[diff] + '22', borderRadius: rw(7),
            paddingHorizontal: rs(7), paddingVertical: rs(2),
            borderWidth: 1, borderColor: DIFFICULTY_COLOR[diff] + '55' }}>
            <Text style={{ color: DIFFICULTY_COLOR[diff], fontSize: rf(9), fontWeight: '700', textTransform: 'capitalize' }}>
              {diff}
            </Text>
          </View>
          {plan.is_featured && (
            <View style={{ backgroundColor: C.accentDim, borderRadius: rw(7),
              paddingHorizontal: rs(7), paddingVertical: rs(2),
              borderWidth: 1, borderColor: `${C.accent}66` }}>
              <Text style={{ color: C.accent, fontSize: rf(9), fontWeight: '700' }}>⭐ Featured</Text>
            </View>
          )}
        </View>
      </View>

      {/* log button */}
      <TouchableOpacity onPress={onLog} disabled={!!logging}
        style={{ width: rw(56), alignItems: 'center', justifyContent: 'center',
          borderLeftWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
        {isLogging
          ? <ActivityIndicator size="small" color={C.accent} />
          : <>
              <Ionicons name="play-circle" size={rw(28)} color={C.accent} />
              <Text style={{ color: C.accent, fontSize: rf(9), fontWeight: '900', marginTop: rs(2), letterSpacing: 0.5 }}>LOG</Text>
            </>
        }
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const makeStyles = (C) => StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.bg },
  header:       { paddingHorizontal: rs(16), paddingTop: rs(12), paddingBottom: rs(8), flexDirection: 'row', alignItems: 'center' },
  secLabel:     { color: C.muted, fontSize: rf(10), fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: rs(2) },
  title:        { color: C.text, fontSize: rf(28), fontWeight: '900', letterSpacing: -0.5 },
  secCount:     { color: C.muted, fontSize: rf(10), fontWeight: '700', letterSpacing: 1 },

  videosBtn:    { flexDirection: 'row', alignItems: 'center', gap: rs(5), backgroundColor: C.accentDim, borderRadius: rw(14), paddingHorizontal: rs(12), paddingVertical: rs(8), borderWidth: 1, borderColor: `${C.accent}4D` },
  videosBtnTxt: { color: C.accent, fontSize: rf(12), fontWeight: '800' },

  searchWrap:   { flexDirection: 'row', alignItems: 'center', marginHorizontal: rs(16),
                  marginBottom: rs(14), backgroundColor: C.card, borderRadius: rw(16),
                  borderWidth: 1, borderColor: C.border },
  searchInput:  { flex: 1, color: C.text, fontSize: rf(14), paddingHorizontal: rs(10), paddingVertical: rs(12) },

  sectionRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  paddingHorizontal: rs(16), marginBottom: rs(14) },
  sectionTitle: { color: C.text, fontSize: rf(18), fontWeight: '900' },

  countBadge:   { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: rw(10), paddingHorizontal: rs(10), paddingVertical: rs(4) },
  countBadgeTxt:{ color: C.muted, fontSize: rf(10), fontWeight: '700', letterSpacing: 0.8 },

  viewAllBtn:   { flexDirection: 'row', alignItems: 'center', gap: rs(3) },
  viewAllTxt:   { color: C.accent, fontSize: rf(13), fontWeight: '700' },

  // Body Focus circles
  focusItem:    { alignItems: 'center', gap: rs(8) },
  focusCircle:  { width: rw(80), height: rw(80), borderRadius: rw(40), overflow: 'hidden',
                  borderWidth: 2.5, borderColor: `${C.accent}40` },
  focusImg:     { width: '100%', height: '100%' },
  focusVignette:{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.12)' },
  focusLabel:   { color: C.text, fontSize: rf(10), fontWeight: '800', letterSpacing: 0.5 },

  pillScroll:   { maxHeight: rs(48), marginBottom: rs(14) },
  pill:         { borderRadius: 20, borderWidth: 1, borderColor: C.border,
                  paddingHorizontal: rs(16), paddingVertical: rs(8),
                  backgroundColor: C.card, alignSelf: 'flex-start' },
  pillTxt:      { fontSize: rf(12), fontWeight: '700', color: C.muted },

  focusBadge:   { backgroundColor: C.accentDim, borderRadius: 8,
                  paddingHorizontal: rs(8), paddingVertical: rs(2),
                  borderWidth: 1, borderColor: C.accent },
  focusBadgeTxt:{ color: C.accent, fontSize: rf(9), fontWeight: '700' },

  empty:        { alignItems: 'center', paddingTop: rs(60) },
  emptyTxt:     { color: C.muted, fontSize: rf(15) },
});
