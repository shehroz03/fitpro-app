import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Animated, KeyboardAvoidingView, Platform,
  Dimensions, ActivityIndicator, ScrollView, Clipboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../store/authStore';
import { useC } from '../utils/theme';
import { useThemeStore } from '../store/themeStore';
import { supabase } from '../api/supabase';

const { width: W } = Dimensions.get('window');
const LIME   = '#C8F135';
const LIME2  = '#A8D120'; // darker lime for gradients
const BG     = '#0A0A0F';

// ─────────────────────────────────────────────────────────────────────────────
//  TYPING INDICATOR — pulsing avatar + animated dots
// ─────────────────────────────────────────────────────────────────────────────
function DoctorTyping({ color, emoji }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const dots  = [0, 1, 2].map(() => useRef(new Animated.Value(0)).current);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    ).start();

    const anims = dots.map((d, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 160),
        Animated.timing(d, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(d, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.delay(400),
      ]))
    );
    anims.forEach(a => a.start());
    return () => { pulse.stopAnimation(); anims.forEach(a => a.stop()); };
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 14 }}>
      <Animated.View style={[st.avatar, {
        backgroundColor: color + '20', borderColor: color + '50',
        transform: [{ scale: pulse }],
      }]}>
        <Text style={{ fontSize: 14 }}>{emoji}</Text>
      </Animated.View>
      <View style={[st.typingBubble, { borderColor: color + '30' }]}>
        <Text style={{ color: color, fontSize: 11, fontWeight: '700', marginBottom: 6, letterSpacing: 0.5 }}>
          Analyzing...
        </Text>
        <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
          {dots.map((d, i) => (
            <Animated.View key={i} style={{
              width: 8, height: 8, borderRadius: 4,
              backgroundColor: color,
              opacity: d,
              transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }],
            }} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  RICH TEXT — renders **bold** markers in normal doctor messages
// ─────────────────────────────────────────────────────────────────────────────
function RichText({ text, color, size = 14 }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={{ color, fontSize: size, lineHeight: size * 1.65, flexWrap: 'wrap' }}>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) {
          return <Text key={i} style={{ fontWeight: '800', color: LIME }}>{p.slice(2, -2)}</Text>;
        }
        return <Text key={i}>{p}</Text>;
      })}
    </Text>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  DIET PLAN PARSER — breaks plan text into structured data
// ─────────────────────────────────────────────────────────────────────────────
function parseDietPlan(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let title = '';
  const macros = {};
  const avoidFoods = [];
  const days = [];
  let tips = '';
  let shopping = '';
  let currentDay = null;
  let focus = '';

  for (const line of lines) {
    const clean = line.replace(/\*\*/g, '');

    // Title
    if (clean.includes("7-Day Diet Plan") || clean.includes("Personalized")) {
      title = clean.replace(/^#+\s*/, '');
      continue;
    }
    // Macros line
    if (clean.includes('Goal:') && clean.includes('Calories:')) {
      const gMatch = clean.match(/Goal:\s*([^|]+)/);
      const cMatch = clean.match(/Calories?:\s*~?(\d+)/i);
      const pMatch = clean.match(/Protein:\s*(\d+)/i);
      const cbMatch = clean.match(/Carbs?:\s*(\d+)/i);
      const fMatch = clean.match(/Fat:\s*(\d+)/i);
      if (gMatch) macros.goal     = gMatch[1].trim();
      if (cMatch) macros.calories = cMatch[1];
      if (pMatch) macros.protein  = pMatch[1];
      if (cbMatch) macros.carbs   = cbMatch[1];
      if (fMatch) macros.fat      = fMatch[1];
      continue;
    }
    // Focus line
    if (clean.includes('Hormonal focus:') || clean.includes('Training focus:') || clean.includes('Special Focus:')) {
      focus = clean.split(':').slice(1).join(':').trim();
      continue;
    }
    // Avoid
    if (clean.startsWith('Avoid') || clean.startsWith('⚠️')) {
      const av = clean.replace(/^[⚠️\s]*Avoid[^:]*:\s*/i, '').trim();
      if (av) avoidFoods.push(...av.split(',').map(s => s.trim()).filter(Boolean));
      continue;
    }
    // Day header
    if (/^(DAY\s*\d+)/i.test(clean)) {
      currentDay = { label: clean.replace(/^#+\s*/, ''), meals: [] };
      days.push(currentDay);
      continue;
    }
    // Meal line (has emoji prefix)
    const mealEmojis = ['🌅','🍳','🥗','🍽️','🍎','🌙','💧','💪','💊'];
    if (currentDay && mealEmojis.some(e => clean.startsWith(e))) {
      const colonIdx = clean.indexOf(':');
      if (colonIdx > -1) {
        currentDay.meals.push({
          label: clean.slice(0, colonIdx).trim(),
          food:  clean.slice(colonIdx + 1).trim(),
        });
      }
      continue;
    }
    // Tips
    if (/tip|advice|note|important/i.test(clean) && clean.includes(':')) {
      tips += clean + '\n';
      continue;
    }
    // Shopping
    if (/shopping/i.test(clean)) {
      shopping = clean.split(':').slice(1).join(':').trim();
      continue;
    }
  }

  return { title, macros, avoidFoods, days, focus, tips: tips.trim(), shopping };
}

// ─────────────────────────────────────────────────────────────────────────────
//  MACRO PILL
// ─────────────────────────────────────────────────────────────────────────────
function MacroPill({ icon, label, value, color }) {
  return (
    <View style={[st.macroPill, { borderColor: color + '40', backgroundColor: color + '12' }]}>
      <Text style={{ fontSize: 16 }}>{icon}</Text>
      <View>
        <Text style={{ color: color, fontWeight: '800', fontSize: 13 }}>{value}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '600', letterSpacing: 0.3 }}>{label}</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MEAL ROW inside a day card
// ─────────────────────────────────────────────────────────────────────────────
const MEAL_COLORS = {
  '🌅': ['#FF9500', '#FF6B00'],
  '🍳': ['#FFD60A', '#FF9500'],
  '🥗': ['#30D158', '#25A244'],
  '🍽️': ['#C8F135', '#A8D120'],
  '🍎': ['#FF375F', '#C0173A'],
  '🌙': ['#5E5CE6', '#3D3ABF'],
  '💧': ['#32ADE6', '#0A84FF'],
  '💪': ['#4ECDC4', '#2AB3AA'],
  '💊': ['#FF6B9D', '#E0487A'],
};

function MealRow({ label, food }) {
  const emoji  = [...label].find(c => /\p{Emoji}/u.test(c)) || '🍽️';
  const colors = MEAL_COLORS[emoji] || ['#C8F135', '#A8D120'];
  const mealName = label.replace(/[^\w\s()\-–—]/g, '').trim();

  return (
    <View style={st.mealRow}>
      <LinearGradient colors={colors} style={st.mealIcon} start={{x:0,y:0}} end={{x:1,y:1}}>
        <Text style={{ fontSize: 12 }}>{emoji}</Text>
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' }}>
          {mealName}
        </Text>
        <Text style={{ color: '#fff', fontSize: 13, lineHeight: 18, marginTop: 2, fontWeight: '500' }}>
          {food}
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  DAY CARD
// ─────────────────────────────────────────────────────────────────────────────
const DAY_GRADIENTS = [
  ['#1A2A1A','#0F180F'],
  ['#1A1A2A','#0F0F18'],
  ['#2A1A1A','#180F0F'],
  ['#1A2226','#0F1518'],
  ['#261A22','#180F16'],
  ['#22261A','#15180F'],
  ['#1A2220','#0F1814'],
];

const DAY_ACCENT_COLORS = ['#C8F135','#4ECDC4','#FF9500','#FF6B9D','#5E5CE6','#30D158','#32ADE6'];

function DayCard({ day, index }) {
  const [expanded, setExpanded] = useState(index === 0);
  const chevronAnim = useRef(new Animated.Value(index === 0 ? 1 : 0)).current;
  const grad   = DAY_GRADIENTS[index % DAY_GRADIENTS.length];
  const accent = DAY_ACCENT_COLORS[index % DAY_ACCENT_COLORS.length];
  const dayNum = String(index + 1);

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !expanded;
    setExpanded(next);
    Animated.timing(chevronAnim, {
      toValue: next ? 1 : 0, duration: 220, useNativeDriver: true,
    }).start();
  };

  const rotate = chevronAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <LinearGradient colors={grad} style={[st.dayCard, { borderLeftColor: accent + '60', borderLeftWidth: 3 }]}>
      <TouchableOpacity style={st.dayHeader} onPress={toggle} activeOpacity={0.8}>
        {/* Numbered circle */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <LinearGradient
            colors={[accent, accent + 'AA']}
            style={st.dayNumCircle}
            start={{x:0,y:0}} end={{x:1,y:1}}
          >
            <Text style={{ color: '#0A0A0F', fontWeight: '900', fontSize: 12 }}>{dayNum}</Text>
          </LinearGradient>
          <View>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{day.label}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{day.meals.length} meals</Text>
          </View>
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.35)" />
        </Animated.View>
      </TouchableOpacity>

      {expanded && (
        <View style={{ paddingBottom: 4 }}>
          {day.meals.map((meal, mi) => (
            <View key={mi}>
              <MealRow label={meal.label} food={meal.food} />
              {mi < day.meals.length - 1 && <View style={st.mealDivider} />}
            </View>
          ))}
        </View>
      )}
    </LinearGradient>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  FULL DIET PLAN CARD
// ─────────────────────────────────────────────────────────────────────────────
function DietPlanCard({ text, isFemale }) {
  const plan = parseDietPlan(text);
  const [copied, setCopied] = useState(false);

  const copyPlan = () => {
    Clipboard.setString(text);
    setCopied(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>

      {/* ─ Header gradient ─ */}
      <LinearGradient
        colors={isFemale ? ['#3D1A2A','#1A0D14'] : ['#0D2A1A','#0A1A0F']}
        style={st.planHeader}
        start={{x:0,y:0}} end={{x:1,y:1}}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[st.planIcon, { backgroundColor: isFemale ? '#FF6B9D22' : '#C8F13522' }]}>
            <Text style={{ fontSize: 20 }}>{isFemale ? '👩‍⚕️' : '🥗'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: LIME, fontWeight: '900', fontSize: 14, lineHeight: 18 }}>
              {plan.title || 'Your 7-Day Diet Plan'}
            </Text>
            {plan.focus ? (
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>
                {plan.focus}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={copyPlan} style={st.copyBtn}>
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={14} color={LIME} />
          </TouchableOpacity>
        </View>

        {/* ─ Goal pill ─ */}
        {plan.macros.goal ? (
          <View style={st.goalPill}>
            <Ionicons name="flag" size={11} color={LIME} />
            <Text style={{ color: LIME, fontSize: 11, fontWeight: '700', flex: 1 }} numberOfLines={1}>
              {plan.macros.goal}
            </Text>
          </View>
        ) : null}
      </LinearGradient>

      {/* ─ Macro pills ─ */}
      {(plan.macros.calories || plan.macros.protein) ? (
        <View style={st.macroRow}>
          {plan.macros.calories && <MacroPill icon="🔥" label="KCAL/DAY" value={`~${plan.macros.calories}`} color="#FF9500" />}
          {plan.macros.protein  && <MacroPill icon="💪" label="PROTEIN"  value={`${plan.macros.protein}g`}  color="#4ECDC4" />}
          {plan.macros.carbs    && <MacroPill icon="🌾" label="CARBS"    value={`${plan.macros.carbs}g`}    color={LIME}    />}
          {plan.macros.fat      && <MacroPill icon="🫒" label="FAT"      value={`${plan.macros.fat}g`}      color="#FF6B9D" />}
        </View>
      ) : null}

      {/* ─ Avoid foods ─ */}
      {plan.avoidFoods.length > 0 && (
        <View style={st.avoidBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Ionicons name="warning" size={13} color="#FF375F" />
            <Text style={{ color: '#FF375F', fontWeight: '800', fontSize: 12 }}>Avoid Strictly</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {plan.avoidFoods.map((f, i) => (
              <View key={i} style={st.avoidChip}>
                <Text style={{ color: '#FF375F', fontSize: 11, fontWeight: '600' }}>✕ {f}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ─ Day cards ─ */}
      {plan.days.length > 0 ? (
        <View style={{ gap: 8, marginTop: 4, marginBottom: 8 }}>
          {plan.days.map((day, i) => <DayCard key={i} day={day} index={i} />)}
        </View>
      ) : (
        // Fallback: raw text if parsing found no days
        <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 20, padding: 4, marginTop: 6 }}>
          {text}
        </Text>
      )}

      {/* ─ Shopping list ─ */}
      {plan.shopping ? (
        <View style={st.shoppingBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Ionicons name="cart-outline" size={13} color={LIME} />
            <Text style={{ color: LIME, fontWeight: '800', fontSize: 12 }}>Weekly Shopping</Text>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 18 }}>{plan.shopping}</Text>
        </View>
      ) : null}

      {/* ─ AI disclaimer ─ */}
      <View style={st.disclaimer}>
        <Ionicons name="shield-checkmark-outline" size={11} color="rgba(255,255,255,0.25)" />
        <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, flex: 1, lineHeight: 14 }}>
          AI-generated guidance based on WHO/NIH nutrition guidelines. Consult a registered dietitian for medical conditions.
        </Text>
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ANIMATED MESSAGE BUBBLE — slides up + fades in
// ─────────────────────────────────────────────────────────────────────────────
function MessageBubble({ msg, doctorName, doctorColor, doctorEmoji, isFemale, isDark }) {
  const isUser = msg.role === 'user';
  const isDiet = msg.isDietPlan;

  const slide = useRef(new Animated.Value(18)).current;
  const fade  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 320, useNativeDriver: true }),
      Animated.timing(fade,  { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start();
  }, []);

  if (isUser) {
    return (
      <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], alignItems: 'flex-end', marginBottom: 14 }}>
        <LinearGradient
          colors={[LIME, LIME2]}
          style={st.userBubble}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <Text style={{ color: '#0A0A0F', fontSize: 14, lineHeight: 22, fontWeight: '700' }}>
            {msg.content}
          </Text>
        </LinearGradient>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, marginRight: 4 }}>
          <Text style={{ color: 'rgba(255,255,255,0.18)', fontSize: 10 }}>{msg.time}</Text>
          <Ionicons name="checkmark-done" size={12} color={doctorColor + '80'} />
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], marginBottom: 16 }}>
      {/* Doctor name + avatar row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 }}>
        <View style={[st.avatar, { backgroundColor: doctorColor + '1A', borderColor: doctorColor + '55' }]}>
          <Text style={{ fontSize: 14 }}>{doctorEmoji}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ color: doctorColor, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 }}>
            {doctorName.toUpperCase()}
          </Text>
          {/* Verified badge */}
          <View style={[st.verifiedBadge, { backgroundColor: doctorColor + '20', borderColor: doctorColor + '40' }]}>
            <Ionicons name="shield-checkmark" size={8} color={doctorColor} />
            <Text style={{ color: doctorColor, fontSize: 8, fontWeight: '800' }}>AI</Text>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>{msg.time}</Text>
        </View>
      </View>

      {/* Bubble with left accent bar */}
      <View style={{ paddingLeft: 40 }}>
        {isDiet ? (
          <View style={[st.dietCard, { borderColor: LIME + '35' }]}>
            <DietPlanCard text={msg.content} isFemale={isFemale} />
          </View>
        ) : (
          <View style={[st.docBubble, { borderColor: 'rgba(255,255,255,0.07)' }]}>
            {/* Colored left accent bar */}
            <View style={[st.accentBar, { backgroundColor: doctorColor }]} />
            <View style={{ paddingLeft: 10 }}>
              <RichText text={msg.content} color="rgba(255,255,255,0.90)" size={14} />
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  QUICK REPLY CHIP
// ─────────────────────────────────────────────────────────────────────────────
function QuickChip({ label, icon, onPress, color }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start();
    onPress();
  };
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[st.chip, { borderColor: color + '50', backgroundColor: color + '10' }]}
        onPress={press} activeOpacity={1}
      >
        {icon ? <Text style={{ fontSize: 13 }}>{icon}</Text> : null}
        <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function DietDoctorScreen({ navigation }) {
  const C        = useC();
  const isDark   = useThemeStore(s => s.isDark);
  const insets   = useSafeAreaInsets();
  const user     = useAuthStore(s => s.user);
  const gender   = user?.gender || 'male';
  const isFemale = gender === 'female';

  const doctorName  = isFemale ? 'Dr. Ayesha' : 'Dr. Ahmed';
  const doctorColor = isFemale ? '#FF6B9D' : '#4ECDC4';
  const doctorSpec  = isFemale ? "Women's Health & Nutrition" : "Sports Nutrition & Dietetics";
  const doctorEmoji = isFemale ? '👩‍⚕️' : '👨‍⚕️';

  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [started,    setStarted]    = useState(false);
  const [focused,    setFocused]    = useState(false);
  const [activeGoal, setActiveGoal] = useState(null);
  const flatRef  = useRef(null);
  const inputRef = useRef(null);

  // Fetch active goal
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('goals').select('type, title')
      .eq('user_id', user.id).eq('status', 'active')
      .order('created_at', { ascending: false }).limit(1).single()
      .then(({ data }) => { if (data) setActiveGoal(data.title || data.type); })
      .catch(() => {});
  }, [user?.id]);

  const profile = {
    full_name: user?.full_name, name: user?.name || user?.full_name,
    age: user?.age, height_cm: user?.height_cm, weight_kg: user?.weight_kg,
    bmi: user?.bmi, fitness_level: user?.fitness_level,
    goal: activeGoal || user?.goal || null, gender: user?.gender,
  };

  const getTime = () => {
    const d = new Date();
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const callDietDoctor = useCallback(async (msgs, isStart = false) => {
    const { data, error } = await supabase.functions.invoke('diet-doctor', {
      body: { messages: msgs, profile, gender, isStart, userId: user?.id || 'anonymous' },
    });
    if (error) throw new Error(error.message || 'Doctor unavailable');
    if (data?.error) throw new Error(data.error);
    return { reply: data.reply, isDietPlan: data.isDietPlan || false };
  }, [gender, user, activeGoal]);

  // Auto-start
  useEffect(() => {
    if (started) return;
    setStarted(true);
    setLoading(true);
    callDietDoctor([], true)
      .then(({ reply, isDietPlan }) => {
        setMessages([{ role: 'assistant', content: reply, isDietPlan, time: getTime(), id: 'intro' }]);
      })
      .catch(() => {
        setMessages([{
          role: 'assistant', isDietPlan: false, time: getTime(), id: 'err0',
          content: `Hello! I'm ${doctorName}. I'm having trouble connecting right now — please check your internet and try again.`,
        }]);
      })
      .finally(() => setLoading(false));
  }, []);

  const scrollToEnd = () => setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 120);

  const send = async (textOverride) => {
    const text = (textOverride || input).trim();
    if (!text || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput('');
    const userMsg = { role: 'user', content: text, time: getTime(), id: `u${Date.now()}` };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);
    scrollToEnd();

    try {
      const history = updated.map(m => ({ role: m.role, content: m.content }));
      const { reply, isDietPlan } = await callDietDoctor(history);
      setMessages(prev => [...prev, {
        role: 'assistant', content: reply, isDietPlan,
        time: getTime(), id: `d${Date.now()}`,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant', isDietPlan: false,
        content: 'Sorry, I could not process your message. Please try again.',
        time: getTime(), id: `err${Date.now()}`,
      }]);
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  };

  const clearChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMessages([]); setStarted(false); setLoading(true);
    callDietDoctor([], true)
      .then(({ reply, isDietPlan }) => {
        setMessages([{ role: 'assistant', content: reply, isDietPlan, time: getTime(), id: 'intro2' }]);
      })
      .catch(() => {}).finally(() => setLoading(false));
  };

  const quickReplies = isFemale
    ? [
        { label: 'Lose weight',       icon: '🔥' },
        { label: 'PCOS diet',         icon: '🌿' },
        { label: 'Pregnant hoon',     icon: '🤰' },
        { label: 'Gain weight',       icon: '💪' },
        { label: 'Healthy eating',    icon: '🥗' },
      ]
    : [
        { label: 'Build muscle',      icon: '💪' },
        { label: 'Lose belly fat',    icon: '🔥' },
        { label: 'Gym nutrition',     icon: '🏋️' },
        { label: 'Gain weight',       icon: '📈' },
        { label: 'Healthy eating',    icon: '🥗' },
      ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <LinearGradient
        colors={isFemale ? ['#1A0810','#0A0A0F'] : ['#081A10','#0A0A0F']}
        style={[st.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.iconBtn}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 10 }}>
          {/* Glowing doctor avatar */}
          <View>
            <View style={[st.avatarLg, { backgroundColor: doctorColor + '18', borderColor: doctorColor + '60' }]}>
              <Text style={{ fontSize: 24 }}>{doctorEmoji}</Text>
            </View>
            <View style={[st.onlineDot, { backgroundColor: '#4ADE80', borderColor: '#0A0A0F' }]} />
          </View>
          <View>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 17 }}>{doctorName}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: doctorColor, fontSize: 11, fontWeight: '600' }}>{doctorSpec}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={clearChat} style={st.iconBtn}>
          <Ionicons name="refresh-outline" size={18} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>
      </LinearGradient>

      {/* ── SAFETY BANNER ───────────────────────────────────────────── */}
      <View style={st.banner}>
        <Ionicons name="shield-checkmark" size={11} color="#4ADE80" />
        <Text style={{ color: '#4ADE80', fontSize: 10, fontWeight: '700', flex: 1 }}>
          AI nutrition guidance · Not a substitute for medical advice
        </Text>
      </View>

      {/* ── MESSAGES ────────────────────────────────────────────────── */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={m => m.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToEnd}
        renderItem={({ item }) => (
          <MessageBubble
            msg={item}
            doctorName={doctorName}
            doctorColor={doctorColor}
            doctorEmoji={doctorEmoji}
            isFemale={isFemale}
            isDark={isDark}
          />
        )}
        ListFooterComponent={
          loading ? (
            <DoctorTyping color={doctorColor} emoji={doctorEmoji} />
          ) : null
        }
      />

      {/* ── QUICK REPLIES ───────────────────────────────────────────── */}
      {messages.length <= 2 && !loading && (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 14, gap: 8, paddingBottom: 6, paddingTop: 2 }}
        >
          {quickReplies.map((q, i) => (
            <QuickChip
              key={i}
              label={q.label}
              icon={q.icon}
              color={doctorColor}
              onPress={() => send(q.label)}
            />
          ))}
        </ScrollView>
      )}

      {/* ── INPUT ROW ───────────────────────────────────────────────── */}
      <View style={[st.inputWrap, { paddingBottom: insets.bottom + 6, borderTopColor: 'rgba(255,255,255,0.05)' }]}>
        {/* Character counter (shows when > 380 chars) */}
        {input.length > 380 && (
          <Text style={{ color: input.length > 480 ? '#FF375F' : 'rgba(255,255,255,0.25)', fontSize: 10, textAlign: 'right', marginBottom: 4, marginRight: 4 }}>
            {input.length}/500
          </Text>
        )}
        <View style={[st.inputBox, {
          borderColor: focused ? doctorColor + '70' : 'rgba(255,255,255,0.07)',
          shadowColor: focused ? doctorColor : 'transparent',
          shadowOpacity: 0.25, shadowRadius: 8, elevation: focused ? 4 : 0,
        }]}>
          <TextInput
            ref={inputRef}
            style={{ flex: 1, color: '#fff', fontSize: 14, lineHeight: 20, paddingVertical: 11, maxHeight: 110 }}
            placeholder="Type your reply..."
            placeholderTextColor="rgba(255,255,255,0.18)"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          {/* Send button — gradient when active */}
          {input.trim() && !loading ? (
            <TouchableOpacity onPress={() => send()} activeOpacity={0.85} style={{ marginBottom: 5 }}>
              <LinearGradient
                colors={[LIME, LIME2]}
                style={st.sendBtn}
                start={{x:0,y:0}} end={{x:1,y:1}}
              >
                <Ionicons name="send" size={16} color="#0A0A0F" />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={[st.sendBtn, { backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 5 }]}>
              {loading
                ? <ActivityIndicator size="small" color={doctorColor} />
                : <Ionicons name="send" size={16} color="rgba(255,255,255,0.15)" />
              }
            </View>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  STYLES
// ─────────────────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  // Header
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  iconBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  avatarLg:    { width: 46, height: 46, borderRadius: 23, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  onlineDot:   { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  // Safety banner
  banner:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(74,222,128,0.06)', paddingHorizontal: 14, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: 'rgba(74,222,128,0.1)' },
  // Typing
  avatar:      { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  typingBubble:{ backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderRadius: 16, borderTopLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 10 },
  // Doctor bubble
  docBubble:   { backgroundColor: 'rgba(255,255,255,0.035)', borderWidth: 1, borderRadius: 18, borderTopLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'flex-start' },
  accentBar:   { width: 3, borderRadius: 2, alignSelf: 'stretch', marginRight: 0, opacity: 0.8, minHeight: 20 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, borderWidth: 1, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
  // User bubble
  userBubble:  { maxWidth: W * 0.73, borderRadius: 18, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 11 },
  // Diet plan card
  dietCard:    { borderWidth: 1.5, borderRadius: 18, overflow: 'hidden', backgroundColor: '#0D0D14' },
  // Plan header
  planHeader:  { padding: 14, paddingBottom: 10 },
  planIcon:    { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  goalPill:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(200,241,53,0.08)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8, alignSelf: 'flex-start' },
  copyBtn:     { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(200,241,53,0.1)', alignItems: 'center', justifyContent: 'center' },
  // Macros
  macroRow:    { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 10, flexWrap: 'wrap' },
  macroPill:   { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, flex: 1, minWidth: (W - 80) / 2 - 6 },
  // Avoid box
  avoidBox:    { marginHorizontal: 12, marginBottom: 8, backgroundColor: 'rgba(255,55,95,0.06)', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: 'rgba(255,55,95,0.2)' },
  avoidChip:   { backgroundColor: 'rgba(255,55,95,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255,55,95,0.2)' },
  // Day card
  dayCard:     { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginHorizontal: 10 },
  dayHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  dayBadge:    { backgroundColor: 'rgba(200,241,53,0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(200,241,53,0.2)' },
  dayNumCircle:{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  mealDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginHorizontal: 12 },
  // Meal row
  mealRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 12, paddingVertical: 9 },
  mealIcon:    { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  // Shopping & disclaimer
  shoppingBox: { marginHorizontal: 12, marginBottom: 8, backgroundColor: 'rgba(200,241,53,0.04)', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: 'rgba(200,241,53,0.12)' },
  disclaimer:  { flexDirection: 'row', alignItems: 'flex-start', gap: 6, margin: 12, marginTop: 4 },
  // Quick chips
  chip:        { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  // Input
  inputWrap:   { borderTopWidth: 1, paddingHorizontal: 12, paddingTop: 8 },
  inputBox:    { flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderWidth: 1.5, borderRadius: 24, paddingHorizontal: 14, paddingRight: 6 },
  sendBtn:     { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 5, flexShrink: 0 },
});
