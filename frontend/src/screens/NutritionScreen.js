import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  TextInput, StyleSheet, Alert, ActivityIndicator,
  RefreshControl, Image, FlatList, Animated, Dimensions, Pressable
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { nutritionAPI, goalsAPI } from '../api/services';
import { useAuthStore } from '../store/authStore';
import { C } from '../utils/theme';

const { width: SW } = Dimensions.get('window');

// ── Meal timing rules ─────────────────────────────────────────
const MEAL_TIMES = {
  breakfast:    { label:'Breakfast',    icon:'🌅', time:'7:00 – 9:00 AM',  color:'#FF9F0A' },
  pre_workout:  { label:'Pre-Workout',  icon:'⚡',  time:'60 min before',   color:'#C8F135' },
  lunch:        { label:'Lunch',        icon:'☀️',  time:'12:00 – 2:00 PM', color:'#4D8DFF' },
  snack:        { label:'Snack',        icon:'🍎',  time:'4:00 – 5:00 PM',  color:'#2FCFA0' },
  post_workout: { label:'Post-Workout', icon:'💪',  time:'Within 30 min',   color:'#9B6DFF' },
  dinner:       { label:'Dinner',       icon:'🌙',  time:'7:00 – 9:00 PM',  color:'#FF8C42' },
};

const CAT_ICONS = {
  protein:'🥩', carbs:'🍚', fats:'🥑', dairy:'🥛',
  fruits:'🍌', vegetables:'🥦', supplements:'💊', nuts:'🥜',
  drinks:'🍵', meals:'🍽️',
};

const getFoodBenefits = (food) => {
  const n = food.name.toLowerCase();
  if (n.includes('banana'))                          return ['Quick energy boost', 'Rich in potassium'];
  if (n.includes('egg'))                             return ['Complete protein source', 'Rich in vitamin D'];
  if (n.includes('chicken') || n.includes('turkey')) return ['Lean muscle-building protein', 'Low saturated fat'];
  if (n.includes('oat'))                             return ['Slow-release energy carbs', 'Supports heart health'];
  if (n.includes('brown rice') || n.includes('rice'))return ['Fast energy from carbs', 'Easy to digest'];
  if (n.includes('salmon') || n.includes('tuna') || n.includes('fish')) return ['Omega-3 for heart health', 'High-quality protein'];
  if (n.includes('almond') || n.includes('peanut') || n.includes('cashew')) return ['Heart-healthy fats', 'Vitamin E rich'];
  if (n.includes('milk') || n.includes('yogurt') || n.includes('paneer')) return ['Calcium for strong bones', 'Probiotic support'];
  if (n.includes('sweet potato') || n.includes('potato')) return ['Complex carb energy', 'Vitamin A & C source'];
  if (n.includes('broccoli') || n.includes('spinach')) return ['Rich in micronutrients', 'Anti-inflammatory'];
  if (n.includes('protein') || n.includes('whey'))   return ['Fast muscle recovery', 'Complete amino acids'];
  if (n.includes('avocado'))                         return ['Healthy monounsaturated fats', 'Supports hormone health'];
  if (n.includes('apple') || n.includes('mango') || n.includes('orange')) return ['Natural vitamins & fiber', 'Antioxidant-rich'];
  if (n.includes('bread') || n.includes('pasta') || n.includes('roti'))   return ['Energy from complex carbs', 'B-vitamins for energy'];
  if (n.includes('dal') || n.includes('lentil') || n.includes('bean'))    return ['Plant-based protein', 'High in dietary fiber'];
  if (n.includes('olive oil') || n.includes('coconut'))                    return ['Anti-inflammatory fats', 'Supports heart health'];
  const { protein_g: p, carbs_g: c, fat_g: f, category } = food;
  const b = [];
  if (p >= 20) b.push('High protein for muscle growth');
  else if (p >= 10) b.push('Good protein source');
  if (c >= 30) b.push('Fast fuel for workouts');
  else if (c >= 15) b.push('Steady energy supply');
  if (f >= 15) b.push('Healthy fats for hormones');
  if (category === 'fruits')      b.push('Natural vitamins & fiber');
  if (category === 'vegetables')  b.push('Rich in micronutrients');
  if (category === 'dairy')       b.push('Calcium for strong bones');
  if (category === 'supplements') b.push('Fast nutrient absorption');
  if (category === 'drinks')      b.push('Hydrates and energizes');
  return b.slice(0, 2).length ? b.slice(0, 2) : ['Nutritious whole food', 'Supports daily goals'];
};

// ── Macro bar mini ─────────────────────────────────────────────
const MacroMini = ({ p, c, f }) => {
  const tot = p + c + f || 1;
  return (
    <View style={mm.wrap}>
      <View style={[mm.seg, { width:`${(p/tot)*100}%`, backgroundColor:C.blue    }]} />
      <View style={[mm.seg, { width:`${(c/tot)*100}%`, backgroundColor:C.orange  }]} />
      <View style={[mm.seg, { width:`${(f/tot)*100}%`, backgroundColor:C.purple  }]} />
    </View>
  );
};
const mm = StyleSheet.create({
  wrap: { height:4, borderRadius:2, overflow:'hidden', flexDirection:'row', backgroundColor:C.border, marginTop:4 },
  seg:  { height:'100%' },
});

// ── Food Card ─────────────────────────────────────────────────
const FoodCard = ({ food, selected, onToggle, goal }) => {
  const plan     = goal === 'weight_gain' ? food.gain_plan : food.loss_plan;
  const benefits = getFoodBenefits(food);
  const timingKeys = (food.best_time || []).slice(0, 3);
  const scaleAnim  = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue:0.96, useNativeDriver:true, speed:50 }),
      Animated.spring(scaleAnim, { toValue:1,    useNativeDriver:true, speed:50 }),
    ]).start();
    onToggle(food);
  };

  return (
    <Animated.View style={{ transform:[{ scale:scaleAnim }] }}>
      <TouchableOpacity
        style={[fc.card, selected && fc.cardSelected]}
        onPress={handlePress}
        activeOpacity={0.88}
      >
        {/* TOP ROW: image left + detail box right */}
        <View style={fc.topRow}>

          {/* Left — Food Image */}
          <View style={fc.imgWrap}>
            <Image
              source={{ uri: food.image }}
              style={fc.img}
              resizeMode="cover"
              onError={() => {}}
              defaultSource={{ uri: 'https://placehold.co/200x200/111118/C8F135.png?text=' + encodeURIComponent(food.name) }}
            />
            {selected && (
              <View style={fc.tick}>
                <Text style={{ fontSize:11, color:'#0A0A0F', fontWeight:'900' }}>✓</Text>
              </View>
            )}
            <View style={fc.catIcon}>
              <Text style={{ fontSize:11 }}>{CAT_ICONS[food.category]||'🍽️'}</Text>
            </View>
          </View>

          {/* Right — Detail Box */}
          <View style={fc.detailBox}>
            {/* Name + calorie pill */}
            <View style={fc.nameRow}>
              <Text style={fc.name} numberOfLines={2}>{food.name}</Text>
              <View style={fc.calPill}>
                <Text style={fc.calNum}>{food.calories}</Text>
                <Text style={fc.calUnit}>kcal</Text>
              </View>
            </View>
            <Text style={fc.serving}>{food.serving_size_g}g per serving</Text>

            <View style={fc.divider} />

            {/* Benefits */}
            <View style={fc.benefitsBox}>
              {benefits.map((b, i) => (
                <View key={i} style={fc.benefitRow}>
                  <Text style={fc.benefitDot}>◆</Text>
                  <Text style={fc.benefitTxt} numberOfLines={1}>{b}</Text>
                </View>
              ))}
            </View>

            <View style={fc.divider} />

            {/* When to eat */}
            <View style={fc.timingRow}>
              {timingKeys.map(t => (
                <View key={t} style={[fc.timeChip, { backgroundColor:`${MEAL_TIMES[t]?.color||C.accent}25` }]}>
                  <Text style={{ fontSize:8 }}>{MEAL_TIMES[t]?.icon}</Text>
                  <Text style={[fc.timeChipTxt, { color:MEAL_TIMES[t]?.color||C.accent }]}>
                    {MEAL_TIMES[t]?.label||t}
                  </Text>
                </View>
              ))}
            </View>

            {/* Why to eat */}
            {plan && (
              <View style={fc.whyRow}>
                <Text style={fc.whyIcon}>{goal === 'weight_gain' ? '📈' : '📉'}</Text>
                <Text style={fc.whyTxt} numberOfLines={2}>{plan.reason}</Text>
              </View>
            )}
          </View>
        </View>

        {/* BOTTOM: macros + plan kcal + tip */}
        <View style={fc.bottom}>
          <MacroMini p={food.protein_g} c={food.carbs_g} f={food.fat_g} />
          <View style={fc.macroRow}>
            <Text style={[fc.macroLbl, { color:C.blue   }]}>P {food.protein_g}g</Text>
            <Text style={[fc.macroLbl, { color:C.orange }]}>C {food.carbs_g}g</Text>
            <Text style={[fc.macroLbl, { color:C.purple }]}>F {food.fat_g}g</Text>
            {plan && (
              <Text style={fc.planPill}>
                {plan.servings}x/day · <Text style={{ color:C.accent }}>{plan.total_cal} kcal</Text>
              </Text>
            )}
          </View>
          {food.tip && (
            <Text style={fc.tip} numberOfLines={2}>💡 {food.tip}</Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};
const fc = StyleSheet.create({
  card:         { backgroundColor:C.card, borderRadius:16, borderWidth:1, borderColor:C.border,
                  marginBottom:12, overflow:'hidden' },
  cardSelected: { borderColor:C.accent, borderWidth:2, backgroundColor:'rgba(200,241,53,0.04)' },

  // TOP row
  topRow:       { flexDirection:'row', minHeight:160 },

  // Image (left side ~42%)
  imgWrap:      { width:'42%', position:'relative' },
  img:          { width:'100%', height:'100%' },
  tick:         { position:'absolute', top:8, left:8, backgroundColor:C.accent,
                  borderRadius:10, width:22, height:22, alignItems:'center', justifyContent:'center' },
  catIcon:      { position:'absolute', bottom:8, left:8, backgroundColor:'rgba(0,0,0,0.65)',
                  borderRadius:7, width:24, height:24, alignItems:'center', justifyContent:'center' },

  // Detail box (right side ~58%)
  detailBox:    { flex:1, padding:10, justifyContent:'space-between',
                  borderLeftWidth:1, borderLeftColor:C.border },
  nameRow:      { flexDirection:'row', alignItems:'flex-start', gap:6 },
  name:         { color:C.text, fontSize:13, fontWeight:'800', flex:1, lineHeight:17 },
  calPill:      { backgroundColor:'rgba(200,241,53,0.15)', borderRadius:8,
                  paddingHorizontal:6, paddingVertical:3, alignItems:'center',
                  borderWidth:1, borderColor:'rgba(200,241,53,0.3)', minWidth:42 },
  calNum:       { color:C.accent, fontSize:14, fontWeight:'900', lineHeight:16 },
  calUnit:      { color:C.muted, fontSize:7, fontWeight:'700', letterSpacing:0.5 },
  serving:      { color:C.dim, fontSize:10, marginTop:2 },
  divider:      { height:1, backgroundColor:C.border, marginVertical:6 },

  // Benefits
  benefitsBox:  { gap:4 },
  benefitRow:   { flexDirection:'row', alignItems:'center', gap:5 },
  benefitDot:   { color:C.accent, fontSize:5 },
  benefitTxt:   { color:C.muted, fontSize:10, fontWeight:'600', flex:1, lineHeight:13 },

  // Timing
  timingRow:    { flexDirection:'row', flexWrap:'wrap', gap:3 },
  timeChip:     { flexDirection:'row', alignItems:'center', gap:2, borderRadius:6,
                  paddingHorizontal:5, paddingVertical:2 },
  timeChipTxt:  { fontSize:8, fontWeight:'700' },

  // Why to eat
  whyRow:       { flexDirection:'row', alignItems:'flex-start', gap:4, marginTop:3 },
  whyIcon:      { fontSize:10, lineHeight:14 },
  whyTxt:       { color:C.dim, fontSize:9, lineHeight:13, flex:1, fontStyle:'italic' },

  // BOTTOM bar
  bottom:       { paddingHorizontal:12, paddingBottom:10, paddingTop:8,
                  borderTopWidth:1, borderTopColor:C.border },
  macroRow:     { flexDirection:'row', gap:8, marginTop:5, alignItems:'center' },
  macroLbl:     { fontSize:10, fontWeight:'700' },
  planPill:     { marginLeft:'auto', color:C.muted, fontSize:10, fontWeight:'700' },
  tip:          { color:C.dim, fontSize:10, marginTop:5, lineHeight:14 },
});

// ── Meal Plan Row ─────────────────────────────────────────────
const MealPlanRow = ({ mealKey, foods }) => {
  const mt = MEAL_TIMES[mealKey];
  if (!mt || foods.length === 0) return null;
  const totalCal = foods.reduce((s,f) => s + (f.calories||0), 0);
  return (
    <View style={mp.row}>
      <View style={[mp.timeCol, { borderColor:mt.color }]}>
        <Text style={{ fontSize:18 }}>{mt.icon}</Text>
        <Text style={[mp.timeLabel, { color:mt.color }]}>{mt.label}</Text>
        <Text style={mp.timeSub}>{mt.time}</Text>
      </View>
      <View style={{ flex:1 }}>
        {foods.map(f => (
          <View key={f.id} style={mp.foodItem}>
            <Text style={mp.foodName}>{f.name}</Text>
            <Text style={[mp.foodCal, { color:mt.color }]}>{f.calories} kcal</Text>
          </View>
        ))}
        <Text style={mp.mealTotal}>Meal total: {totalCal} kcal</Text>
      </View>
    </View>
  );
};
const mp = StyleSheet.create({
  row:       { flexDirection:'row', gap:12, marginBottom:14,
               backgroundColor:C.card, borderRadius:14, borderWidth:1, borderColor:C.border, padding:12 },
  timeCol:   { width:70, alignItems:'center', borderRightWidth:2, paddingRight:10 },
  timeLabel: { fontSize:11, fontWeight:'800', marginTop:4, textAlign:'center' },
  timeSub:   { fontSize:9,  color:C.dim, textAlign:'center', marginTop:2 },
  foodItem:  { flexDirection:'row', justifyContent:'space-between', marginBottom:4 },
  foodName:  { color:C.text, fontSize:12, fontWeight:'600', flex:1 },
  foodCal:   { fontSize:12, fontWeight:'800', marginLeft:8 },
  mealTotal: { color:C.muted, fontSize:10, marginTop:4, fontWeight:'600' },
});

// ── MAIN SCREEN ───────────────────────────────────────────────
export default function NutritionScreen({ navigation }) {
  const user = useAuthStore(s => s.user);
  const [activeGoal,    setActiveGoal]    = useState('weight_gain');
  const [allFoods,      setAllFoods]      = useState([]);
  const [daily,         setDaily]         = useState(null);
  const [selected,      setSelected]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refresh,       setRefresh]       = useState(false);
  const [activeTab,     setActiveTab]     = useState('plan');   // plan | log | search
  const [searchQ,       setSearchQ]       = useState('');
  const [catFilter,     setCatFilter]     = useState('All');
  const [showLogModal,  setShowLogModal]  = useState(false);
  const [logFood,       setLogFood]       = useState(null);
  const [logQty,        setLogQty]        = useState('100');
  const [logMealType,   setLogMealType]   = useState('lunch');
  const [logging,       setLogging]       = useState(false);
  const [userGoals,     setUserGoals]     = useState([]);
  const [showSummary,   setShowSummary]   = useState(false);

  // AI Scanner States
  const [aiImage,       setAiImage]       = useState(null);
  const [aiMarker,      setAiMarker]      = useState(null);
  const [aiResult,      setAiResult]      = useState(null);
  const [aiLoading,     setAiLoading]     = useState(false);

  const load = useCallback(async () => {
    try {
      const [foodRes, dailyRes, goalRes] = await Promise.all([
        nutritionAPI.searchFoods(''),
        nutritionAPI.getDailyStats(),
        goalsAPI.getAll('active'),
      ]);
      setAllFoods(foodRes.data.data || []);
      setDaily(dailyRes.data.data);
      setUserGoals(goalRes.data.data || []);

      // Auto-detect goal from user goals
      const g = goalRes.data.data?.[0]?.type;
      if (g === 'weight_loss') setActiveGoal('weight_loss');
      else setActiveGoal('weight_gain');
    } catch {
      Alert.alert('Error', 'Could not load nutrition data. Check your connection.');
    } finally {
      setLoading(false);
      setRefresh(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleFood = (food) => {
    setSelected(prev =>
      prev.find(f => f.id === food.id)
        ? prev.filter(f => f.id !== food.id)
        : [...prev, food]
    );
  };

  const handleLogFood = async () => {
    if (!logFood) return;
    setLogging(true);
    try {
      await nutritionAPI.logMeal({
        food_id:    logFood.id,
        meal_type:  logMealType,
        quantity_g: +logQty,
        // inline nutrition so AI/custom foods (not in the catalog) log correctly
        food_name:      logFood.name,
        calories:       logFood.calories,
        protein_g:      logFood.protein_g,
        carbs_g:        logFood.carbs_g,
        fat_g:          logFood.fat_g,
        serving_size_g: logFood.serving_size_g,
      });
      setShowLogModal(false);
      load();
      Alert.alert('✅ Logged!', `${logFood.name} added to ${logMealType}`);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Could not log');
    } finally {
      setLogging(false);
    }
  };

  // ── AI SCANNER LOGIC ──────────────────────────────────────────
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled) {
      setAiImage(result.assets[0]);
      setAiMarker(null);
      setAiResult(null);
    }
  };

  const handleImageTap = (e) => {
    const { locationX, locationY } = e.nativeEvent;
    setAiMarker({ x: locationX, y: locationY });
  };

  const analyzeFood = async () => {
    if (!aiImage || !aiMarker) return;
    setAiLoading(true);
    try {
      const res = await nutritionAPI.analyzeImage({
        imageBase64: aiImage.base64,
        x: Math.round(aiMarker.x),
        y: Math.round(aiMarker.y)
      });
      setAiResult(res.data.data);
    } catch (e) {
      Alert.alert('AI Error', e.response?.data?.message || 'Could not analyze image');
    } finally {
      setAiLoading(false);
    }
  };

  const logAiFood = () => {
    if (!aiResult) return;
    setLogFood({
      id: 'ai-custom',
      name: aiResult.name,
      calories: aiResult.calories,
      protein_g: aiResult.protein_g,
      carbs_g: aiResult.carbs_g,
      fat_g: aiResult.fat_g,
      serving_size_g: 100,
    });
    setLogQty('100');
    setShowLogModal(true);
  };

  // Plan calculations
  const planFoods = allFoods.filter(f =>
    activeGoal === 'weight_gain'
      ? (f.goal||[]).includes('weight_gain')
      : (f.goal||[]).includes('weight_loss')
  );

  const filteredFoods = (activeTab === 'search' ? allFoods : planFoods).filter(f => {
    const matchQ   = f.name.toLowerCase().includes(searchQ.toLowerCase());
    const matchCat = catFilter === 'All' || f.category === catFilter;
    return matchQ && matchCat;
  });

  const selectedCals = selected.reduce((s,f) => {
    const plan = activeGoal === 'weight_gain' ? f.gain_plan : f.loss_plan;
    return s + (plan?.total_cal || f.calories);
  }, 0);

  const selectedProtein = selected.reduce((s,f) => {
    const plan = activeGoal === 'weight_gain' ? f.gain_plan : f.loss_plan;
    return s + (f.protein_g * (plan?.servings||1));
  }, 0);

  // Build meal plan from selected
  const mealPlan = {};
  selected.forEach(food => {
    (food.best_time||['lunch']).forEach(t => {
      if (!mealPlan[t]) mealPlan[t] = [];
      if (!mealPlan[t].find(f => f.id === food.id)) mealPlan[t].push(food);
    });
  });

  const categories = ['All', ...new Set(allFoods.map(f => f.category))];

  const con = daily?.consumed || {};
  const tar = daily?.targets  || { calories:2200 };

  const TABS = [
    { key:'plan',   label:'Smart Plan', icon:'🧠' },
    { key:'log',    label:'Log Today',  icon:'📝' },
    { key:'ai',     label:'AI Scanner✨',icon:'📸' },
    { key:'search', label:'All Foods',  icon:'🔍' },
  ];

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={C.accent} />
      <Text style={s.loadTxt}>Loading nutrition AI...</Text>
    </View>
  );

  return (
    <View style={s.root}>
      {/* ── TOP HEADER ─────────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.secLabel}>TRACK</Text>
          <Text style={s.title}>Nutrition 🥗</Text>
        </View>
        <View style={s.calBubble}>
          <Text style={s.calBubbleNum}>{Math.round(con.calories||0)}</Text>
          <Text style={s.calBubbleSub}>/ {tar.calories} kcal</Text>
        </View>
      </View>

      {/* ── GOAL TOGGLE ─────────────────────────────────── */}
      <View style={s.goalToggle}>
        <TouchableOpacity
          style={[s.goalBtn, activeGoal==='weight_gain' && s.goalBtnGain]}
          onPress={() => { setActiveGoal('weight_gain'); setSelected([]); }}
        >
          <Text style={s.goalBtnIcon}>📈</Text>
          <Text style={[s.goalBtnTxt, activeGoal==='weight_gain' && { color:'#0A0A0F' }]}>
            Weight Gain
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.goalBtn, activeGoal==='weight_loss' && s.goalBtnLoss]}
          onPress={() => { setActiveGoal('weight_loss'); setSelected([]); }}
        >
          <Text style={s.goalBtnIcon}>📉</Text>
          <Text style={[s.goalBtnTxt, activeGoal==='weight_loss' && { color:'#0A0A0F' }]}>
            Weight Loss
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── TABS ────────────────────────────────────────── */}
      <View style={s.tabs}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} style={[s.tab, activeTab===t.key && s.tabActive]}
            onPress={() => setActiveTab(t.key)}>
            <Text style={{ fontSize:14 }}>{t.icon}</Text>
            <Text style={[s.tabTxt, activeTab===t.key && s.tabTxtActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{ flex:1 }}
        contentContainerStyle={{ padding:16, paddingBottom:100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refresh}
          onRefresh={() => { setRefresh(true); load(); }} tintColor={C.accent} />}
      >

        {/* ═══════════════════════════════════════════════
            TAB: SMART PLAN
        ═══════════════════════════════════════════════ */}
        {activeTab === 'plan' && (
          <>
            {/* Goal summary card */}
            <View style={[s.goalCard, { borderColor: activeGoal==='weight_gain' ? C.accent : C.teal }]}>
              <Text style={s.goalCardTitle}>
                {activeGoal === 'weight_gain'
                  ? '📈 Muscle & Weight Gain Plan'
                  : '📉 Fat Loss & Lean Plan'}
              </Text>
              <Text style={s.goalCardSub}>
                {activeGoal === 'weight_gain'
                  ? `Target: +${Math.round(selectedCals||3200)} kcal/day • ~0.5kg gain/week`
                  : `Target: ${Math.round(tar.calories - (selectedCals||1600))} kcal deficit • ~0.5kg loss/week`}
              </Text>
              {userGoals.length > 0 && (
                <View style={s.goalPill}>
                  <Text style={s.goalPillTxt}>
                    🎯 Matching your goal: {userGoals[0].title}
                  </Text>
                </View>
              )}
            </View>

            {/* Instructions */}
            <View style={s.infoCard}>
              <Text style={s.infoTitle}>
                {activeGoal === 'weight_gain' ? '💪 How to Gain Weight Fast' : '🔥 How to Lose Fat Effectively'}
              </Text>
              {(activeGoal === 'weight_gain'
                ? ['Eat 300–500 kcal ABOVE your maintenance','Consume 1.6–2.2g protein per kg bodyweight','Eat every 3 hours — 5-6 meals/day','Never skip breakfast or post-workout meal','Prioritize compound exercises (squat, deadlift, bench)']
                : ['Eat 300–500 kcal BELOW your maintenance','Keep protein HIGH to preserve muscle','Eat more vegetables — fills you up, less calories','Drink 3L water daily to boost metabolism','Do cardio 3–4x per week + strength training']
              ).map((tip,i) => (
                <View key={i} style={s.infoRow}>
                  <View style={s.infoBullet}><Text style={{ color:'#000', fontSize:9, fontWeight:'900' }}>{i+1}</Text></View>
                  <Text style={s.infoTxt}>{tip}</Text>
                </View>
              ))}
            </View>

            {/* Select foods */}
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>
                {activeGoal==='weight_gain' ? '🍗 Best Foods to Gain Weight' : '🥗 Best Foods to Lose Weight'}
              </Text>
              <Text style={s.secLabel}>{planFoods.length} foods</Text>
            </View>
            <Text style={s.selectHint}>Tap to select foods for your daily plan</Text>

            {planFoods.map(food => (
              <FoodCard
                key={food.id}
                food={food}
                selected={!!selected.find(f => f.id === food.id)}
                onToggle={toggleFood}
                goal={activeGoal}
              />
            ))}
          </>
        )}

        {/* ═══════════════════════════════════════════════
            TAB: LOG TODAY
        ═══════════════════════════════════════════════ */}
        {activeTab === 'log' && (
          <>
            {/* Today summary */}
            <View style={s.todayCard}>
              <Text style={s.cardTitle}>Today's Summary</Text>
              <View style={s.todayMacros}>
                {[
                  { label:'Calories', val:Math.round(con.calories||0), max:tar.calories||2200, color:C.accent, unit:'kcal' },
                  { label:'Protein',  val:Math.round(con.protein_g||0),  max:tar.protein_g||150, color:C.blue, unit:'g' },
                  { label:'Carbs',    val:Math.round(con.carbs_g||0),    max:tar.carbs_g||220, color:C.orange, unit:'g' },
                  { label:'Fat',      val:Math.round(con.fat_g||0),      max:tar.fat_g||70, color:C.purple, unit:'g' },
                ].map(m => (
                  <View key={m.label} style={s.macroBox}>
                    <Text style={[s.macroVal, { color:m.color }]}>{m.val}</Text>
                    <Text style={s.macroUnit}>{m.unit}</Text>
                    <View style={s.macroBarBg}>
                      <View style={[s.macroBarFill, { width:`${Math.min((m.val/m.max)*100,100)}%`, backgroundColor:m.color }]} />
                    </View>
                    <Text style={s.macroLabel}>{m.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Meals logged today */}
            <Text style={s.sectionTitle}>Meals Today</Text>
            {Object.entries(MEAL_TIMES).map(([key, mt]) => {
              const meals = (daily?.meals?.[key] || []);
              if (meals.length === 0) return (
                <TouchableOpacity key={key} style={s.emptyMealRow}
                  onPress={() => { setLogMealType(key); setShowLogModal(true); }}>
                  <View style={[s.mealTimeIcon, { backgroundColor:`${mt.color}18` }]}>
                    <Text style={{ fontSize:18 }}>{mt.icon}</Text>
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={s.mealTimeLabel}>{mt.label}</Text>
                    <Text style={s.mealTimeSub}>{mt.time}</Text>
                  </View>
                  <Text style={[s.addMealBtn, { color:mt.color }]}>+ Add</Text>
                </TouchableOpacity>
              );
              return (
                <View key={key}>
                  <TouchableOpacity style={[s.mealRowHeader, { borderLeftColor:mt.color }]}
                    onPress={() => { setLogMealType(key); setShowLogModal(true); }}>
                    <Text style={{ fontSize:18 }}>{mt.icon}</Text>
                    <Text style={[s.mealTimeLabel, { flex:1 }]}>{mt.label}</Text>
                    <Text style={[s.mealTimeCal, { color:mt.color }]}>
                      {meals.reduce((s,m)=>s+(m.calories||0),0).toFixed(0)} kcal
                    </Text>
                    <Text style={[s.addMealBtn, { color:mt.color }]}>+ Add</Text>
                  </TouchableOpacity>
                  {meals.map(m => (
                    <View key={m.id} style={s.loggedItem}>
                      <Text style={s.loggedName}>{m.food_name}</Text>
                      <Text style={s.loggedMeta}>{m.quantity_g}g • {(m.calories||0).toFixed(0)} kcal</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </>
        )}

        {/* ═══════════════════════════════════════════════
            TAB: AI SCANNER
        ═══════════════════════════════════════════════ */}
        {activeTab === 'ai' && (
          <View style={{ flex:1 }}>
            <View style={[s.goalCard, { borderColor: C.accent }]}>
              <Text style={s.goalCardTitle}>📸 AI Food Scanner</Text>
              <Text style={s.goalCardSub}>Take a photo or upload an image. Tap on any food item to let our AI scan and detect its macros and calories!</Text>
            </View>

            {!aiImage ? (
              <TouchableOpacity style={aiStyles.uploadBtn} onPress={pickImage}>
                <Text style={{ fontSize:40, marginBottom:10 }}>🖼️</Text>
                <Text style={aiStyles.uploadBtnTxt}>Tap to Choose Image</Text>
              </TouchableOpacity>
            ) : (
              <View>
                <Pressable onPress={handleImageTap} style={aiStyles.imgContainer}>
                  <Image source={{ uri: aiImage.uri }} style={aiStyles.previewImg} resizeMode="contain" />
                  {aiMarker && (
                    <View style={[aiStyles.marker, { left: aiMarker.x - 15, top: aiMarker.y - 15 }]}>
                      <View style={aiStyles.markerDot} />
                    </View>
                  )}
                </Pressable>

                <View style={aiStyles.controls}>
                  <TouchableOpacity style={aiStyles.retakeBtn} onPress={pickImage}>
                    <Text style={aiStyles.retakeBtnTxt}>Retake</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[aiStyles.analyzeBtn, (!aiMarker || aiLoading) && aiStyles.analyzeBtnDisabled]}
                    onPress={analyzeFood}
                    disabled={!aiMarker || aiLoading}
                  >
                    {aiLoading ? <ActivityIndicator color="#0A0A0F" /> : <Text style={aiStyles.analyzeBtnTxt}>✨ Analyze Food</Text>}
                  </TouchableOpacity>
                </View>

                {aiResult && (
                  <View style={aiStyles.resultCard}>
                    <Text style={aiStyles.resName}>{aiResult.name}</Text>
                    <View style={fc.macroRow}>
                      <Text style={[fc.macroLbl, { color:C.accent }]}>Cal {aiResult.calories}kcal</Text>
                      <Text style={[fc.macroLbl, { color:C.blue   }]}>P {aiResult.protein_g}g</Text>
                      <Text style={[fc.macroLbl, { color:C.orange }]}>C {aiResult.carbs_g}g</Text>
                      <Text style={[fc.macroLbl, { color:C.purple }]}>F {aiResult.fat_g}g</Text>
                    </View>
                    <TouchableOpacity style={aiStyles.logResBtn} onPress={logAiFood}>
                      <Text style={aiStyles.logResBtnTxt}>+ Log this Food</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* ═══════════════════════════════════════════════
            TAB: ALL FOODS SEARCH
        ═══════════════════════════════════════════════ */}
        {activeTab === 'search' && (
          <>
            <TextInput
              style={s.searchBox}
              placeholder="Search foods..."
              placeholderTextColor={C.dim}
              value={searchQ}
              onChangeText={setSearchQ}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={{ marginBottom:12 }} contentContainerStyle={{ gap:8 }}>
              {categories.map(c => (
                <TouchableOpacity key={c}
                  style={[s.pill, catFilter===c && s.pillOn]}
                  onPress={() => setCatFilter(c)}>
                  <Text style={[s.pillTxt, catFilter===c && s.pillTxtOn]}>
                    {CAT_ICONS[c]||''} {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {filteredFoods.map(food => (
              <FoodCard key={food.id} food={food}
                selected={!!selected.find(f=>f.id===food.id)}
                onToggle={toggleFood} goal={activeGoal} />
            ))}
          </>
        )}

      </ScrollView>

      {/* ── FLOATING PLAN SUMMARY ──────────────────────── */}
      {selected.length > 0 && (
        <TouchableOpacity style={s.floatBtn} onPress={() => setShowSummary(true)}>
          <Text style={s.floatBtnIcon}>🧠</Text>
          <View style={{ flex:1 }}>
            <Text style={s.floatBtnTitle}>{selected.length} foods selected</Text>
            <Text style={s.floatBtnSub}>{selectedCals} kcal • {Math.round(selectedProtein)}g protein</Text>
          </View>
          <Text style={s.floatBtnArrow}>View Plan ›</Text>
        </TouchableOpacity>
      )}

      {/* ── LOG MEAL MODAL ────────────────────────────── */}
      <Modal visible={showLogModal} animationType="slide" transparent>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Log a Meal 📝</Text>

            <TextInput
              style={s.input}
              placeholder="Search food..."
              placeholderTextColor={C.dim}
              value={searchQ}
              onChangeText={v => { setSearchQ(v); setLogFood(null); }}
            />

            {allFoods.filter(f => f.name.toLowerCase().includes(searchQ.toLowerCase())).slice(0,5).map(f => (
              <TouchableOpacity key={f.id}
                style={[s.foodPickRow, logFood?.id===f.id && s.foodPickRowSel]}
                onPress={() => { setLogFood(f); setLogQty(String(f.serving_size_g)); }}>
                <Image source={{ uri:f.image }} style={s.foodPickImg} onError={()=>{}} />
                <View style={{ flex:1 }}>
                  <Text style={s.foodPickName}>{f.name}</Text>
                  <Text style={s.foodPickMeta}>{f.calories} kcal / {f.serving_size_g}g</Text>
                </View>
                {logFood?.id===f.id && <Text style={{ color:C.accent, fontSize:18 }}>✓</Text>}
              </TouchableOpacity>
            ))}

            {logFood && (
              <>
                <View style={s.rowInputs}>
                  <View style={{ flex:1 }}>
                    <Text style={s.inputLabel}>Quantity (g)</Text>
                    <TextInput style={s.input} value={logQty}
                      onChangeText={setLogQty} keyboardType="numeric" />
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={s.inputLabel}>Meal Type</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {Object.entries(MEAL_TIMES).map(([k,v]) => (
                        <TouchableOpacity key={k}
                          style={[s.mealPill, logMealType===k && { backgroundColor:`${v.color}30`, borderColor:v.color }]}
                          onPress={() => setLogMealType(k)}>
                          <Text style={{ fontSize:11 }}>{v.icon}</Text>
                          <Text style={[s.mealPillTxt, logMealType===k && { color:v.color }]}>{v.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
                <View style={s.calcBox}>
                  <Text style={s.calcTxt}>
                    {logFood.name} • {logQty}g = {' '}
                    <Text style={{ color:C.accent, fontWeight:'900' }}>
                      {Math.round((logFood.calories*(+logQty))/(logFood.serving_size_g||100))} kcal
                    </Text>
                  </Text>
                </View>
              </>
            )}

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setShowLogModal(false); setLogFood(null); setSearchQ(''); }}>
                <Text style={s.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.confirmBtn, !logFood && { opacity:0.4 }]}
                onPress={handleLogFood} disabled={!logFood || logging}>
                {logging
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={s.confirmTxt}>Log Meal</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── PLAN SUMMARY MODAL ───────────────────────── */}
      <Modal visible={showSummary} animationType="slide" transparent>
        <View style={s.modalBg}>
          <ScrollView>
            <View style={[s.modalCard, { paddingBottom:40 }]}>
              <Text style={s.modalTitle}>
                {activeGoal==='weight_gain' ? '📈 Your Gain Plan' : '📉 Your Loss Plan'}
              </Text>

              {/* Calorie summary */}
              <View style={s.summaryBox}>
                <View style={s.summaryRow}>
                  <Text style={s.summaryKey}>Total Daily Calories</Text>
                  <Text style={[s.summaryVal, { color:C.accent }]}>{selectedCals} kcal</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryKey}>Daily Protein</Text>
                  <Text style={[s.summaryVal, { color:C.blue }]}>{Math.round(selectedProtein)}g</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryKey}>Weekly weight change</Text>
                  <Text style={[s.summaryVal, { color:activeGoal==='weight_gain'?C.teal:C.orange }]}>
                    {activeGoal==='weight_gain' ? '+' : '-'}~0.5 kg/week
                  </Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryKey}>Monthly projection</Text>
                  <Text style={[s.summaryVal, { color:activeGoal==='weight_gain'?C.teal:C.orange }]}>
                    {activeGoal==='weight_gain' ? '+' : '-'}~2 kg/month
                  </Text>
                </View>
              </View>

              {/* Meal-by-meal plan */}
              <Text style={[s.sectionTitle, { marginBottom:12 }]}>📅 Daily Meal Schedule</Text>
              {Object.entries(MEAL_TIMES).map(([key]) => (
                <MealPlanRow key={key} mealKey={key} foods={mealPlan[key]||[]} />
              ))}

              {/* Selected foods */}
              <Text style={[s.sectionTitle, { marginBottom:12, marginTop:8 }]}>🛒 Shopping List</Text>
              {selected.map(f => (
                <View key={f.id} style={s.shopItem}>
                  <Text style={{ fontSize:14 }}>{CAT_ICONS[f.category]||'🍽️'}</Text>
                  <Text style={s.shopName}>{f.name}</Text>
                  <Text style={s.shopCal}>{f.calories} kcal/{f.serving_size_g}g</Text>
                </View>
              ))}

              <TouchableOpacity style={s.confirmBtn} onPress={() => setShowSummary(false)}>
                <Text style={s.confirmTxt}>Got It! Start Plan 💪</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const aiStyles = StyleSheet.create({
  uploadBtn: { height: 200, backgroundColor: 'rgba(200,241,53,0.05)', borderRadius: 16, borderWidth: 2, borderColor: 'rgba(200,241,53,0.2)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginVertical: 20 },
  uploadBtnTxt: { color: C.accent, fontSize: 16, fontWeight: '700' },
  imgContainer: { width: '100%', height: 300, borderRadius: 16, overflow: 'hidden', backgroundColor: '#000', marginVertical: 20, position: 'relative' },
  previewImg: { width: '100%', height: '100%' },
  marker: { position: 'absolute', width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(200,241,53,0.3)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.accent },
  markerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent },
  controls: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  retakeBtn: { flex: 1, backgroundColor: C.card, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  retakeBtnTxt: { color: C.text, fontWeight: '700' },
  analyzeBtn: { flex: 2, backgroundColor: C.accent, padding: 14, borderRadius: 12, alignItems: 'center' },
  analyzeBtnDisabled: { opacity: 0.5 },
  analyzeBtnTxt: { color: '#0A0A0F', fontWeight: '800', fontSize: 15 },
  resultCard: { backgroundColor: 'rgba(200,241,53,0.08)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(200,241,53,0.3)' },
  resName: { color: C.text, fontSize: 18, fontWeight: '800', marginBottom: 10 },
  logResBtn: { backgroundColor: C.accent, padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 16 },
  logResBtnTxt: { color: '#0A0A0F', fontWeight: '800' }
});

const s = StyleSheet.create({
  root:           { flex:1, backgroundColor:C.bg },
  center:         { flex:1, backgroundColor:C.bg, alignItems:'center', justifyContent:'center' },
  loadTxt:        { color:C.muted, marginTop:12 },
  // Header
  header:         { flexDirection:'row', justifyContent:'space-between', alignItems:'center',
                    paddingHorizontal:16, paddingTop:16, marginBottom:10 },
  secLabel:       { color:C.muted, fontSize:10, fontWeight:'700', letterSpacing:1.2, textTransform:'uppercase' },
  title:          { color:C.text, fontSize:24, fontWeight:'900' },
  calBubble:      { backgroundColor:C.card, borderRadius:12, borderWidth:1, borderColor:C.border,
                    paddingHorizontal:12, paddingVertical:6, alignItems:'center' },
  calBubbleNum:   { color:C.accent, fontSize:16, fontWeight:'900' },
  calBubbleSub:   { color:C.muted, fontSize:10 },
  // Goal toggle
  goalToggle:     { flexDirection:'row', gap:8, paddingHorizontal:16, marginBottom:10 },
  goalBtn:        { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center',
                    gap:6, borderRadius:12, borderWidth:1, borderColor:C.border,
                    paddingVertical:10, backgroundColor:C.card },
  goalBtnGain:    { backgroundColor:C.accent, borderColor:C.accent },
  goalBtnLoss:    { backgroundColor:C.teal, borderColor:C.teal },
  goalBtnIcon:    { fontSize:16 },
  goalBtnTxt:     { color:C.muted, fontSize:13, fontWeight:'800' },
  // Tabs
  tabs:           { flexDirection:'row', paddingHorizontal:16, gap:6, marginBottom:8 },
  tab:            { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center',
                    gap:4, borderRadius:10, borderWidth:1, borderColor:C.border,
                    paddingVertical:8, backgroundColor:C.card },
  tabActive:      { backgroundColor:'rgba(200,241,53,0.12)', borderColor:C.accent },
  tabTxt:         { color:C.muted, fontSize:10, fontWeight:'700' },
  tabTxtActive:   { color:C.accent },
  // Goal card
  goalCard:       { borderRadius:16, borderWidth:1.5, padding:14, marginBottom:12,
                    backgroundColor:'rgba(200,241,53,0.05)' },
  goalCardTitle:  { color:C.text, fontSize:15, fontWeight:'800', marginBottom:4 },
  goalCardSub:    { color:C.muted, fontSize:12, marginBottom:8 },
  goalPill:       { backgroundColor:'rgba(200,241,53,0.12)', borderRadius:8,
                    paddingHorizontal:10, paddingVertical:4 },
  goalPillTxt:    { color:C.accent, fontSize:11, fontWeight:'700' },
  // Info card
  infoCard:       { backgroundColor:C.card, borderRadius:16, borderWidth:1, borderColor:C.border,
                    padding:14, marginBottom:14 },
  infoTitle:      { color:C.text, fontSize:14, fontWeight:'800', marginBottom:12 },
  infoRow:        { flexDirection:'row', alignItems:'flex-start', gap:10, marginBottom:8 },
  infoBullet:     { width:20, height:20, borderRadius:10, backgroundColor:C.accent,
                    alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 },
  infoTxt:        { color:C.muted, fontSize:13, flex:1, lineHeight:18 },
  // Section
  sectionHeader:  { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:6 },
  sectionTitle:   { color:C.text, fontSize:14, fontWeight:'700' },
  selectHint:     { color:C.dim, fontSize:11, marginBottom:12 },
  // Today log tab
  todayCard:      { backgroundColor:C.card, borderRadius:18, borderWidth:1, borderColor:C.border,
                    padding:16, marginBottom:16 },
  cardTitle:      { color:C.text, fontSize:14, fontWeight:'700', marginBottom:12 },
  todayMacros:    { flexDirection:'row', gap:8 },
  macroBox:       { flex:1, alignItems:'center' },
  macroVal:       { fontSize:18, fontWeight:'900' },
  macroUnit:      { color:C.muted, fontSize:9 },
  macroBarBg:     { width:'100%', height:4, backgroundColor:C.border, borderRadius:2, marginVertical:4, overflow:'hidden' },
  macroBarFill:   { height:'100%', borderRadius:2 },
  macroLabel:     { color:C.muted, fontSize:9, textAlign:'center' },
  emptyMealRow:   { flexDirection:'row', alignItems:'center', gap:10, backgroundColor:C.card,
                    borderRadius:12, borderWidth:1, borderColor:C.border, padding:12, marginBottom:8 },
  mealTimeIcon:   { width:40, height:40, borderRadius:12, alignItems:'center', justifyContent:'center' },
  mealTimeLabel:  { color:C.text, fontSize:13, fontWeight:'700' },
  mealTimeSub:    { color:C.muted, fontSize:11 },
  mealTimeCal:    { fontSize:13, fontWeight:'800', marginRight:4 },
  addMealBtn:     { fontSize:13, fontWeight:'800' },
  mealRowHeader:  { flexDirection:'row', alignItems:'center', gap:10, backgroundColor:C.card2,
                    borderRadius:12, borderWidth:1, borderColor:C.border, padding:12,
                    marginBottom:4, borderLeftWidth:3 },
  loggedItem:     { flexDirection:'row', justifyContent:'space-between',
                    paddingHorizontal:16, paddingVertical:6,
                    borderBottomWidth:0.5, borderColor:C.border },
  loggedName:     { color:C.text, fontSize:13, fontWeight:'600' },
  loggedMeta:     { color:C.muted, fontSize:12 },
  // Search tab
  searchBox:      { backgroundColor:C.card, borderRadius:12, borderWidth:1, borderColor:C.border,
                    padding:12, color:C.text, fontSize:14, marginBottom:10 },
  pill:           { borderRadius:20, borderWidth:1, borderColor:C.border, paddingHorizontal:12,
                    paddingVertical:5, backgroundColor:C.card },
  pillOn:         { backgroundColor:C.accent, borderColor:C.accent },
  pillTxt:        { color:C.muted, fontSize:11, fontWeight:'700' },
  pillTxtOn:      { color:'#0A0A0F' },
  // Float button
  floatBtn:       { position:'absolute', bottom:88, left:16, right:16, backgroundColor:C.card2,
                    borderRadius:16, borderWidth:1.5, borderColor:C.accent, padding:14,
                    flexDirection:'row', alignItems:'center', gap:10,
                    shadowColor:'#C8F135', shadowOpacity:0.3, shadowRadius:12, elevation:8 },
  floatBtnIcon:   { fontSize:22 },
  floatBtnTitle:  { color:C.text, fontSize:13, fontWeight:'800' },
  floatBtnSub:    { color:C.muted, fontSize:11 },
  floatBtnArrow:  { color:C.accent, fontSize:13, fontWeight:'800' },
  // Modal
  modalBg:        { flex:1, backgroundColor:'rgba(0,0,0,0.78)', justifyContent:'flex-end' },
  modalCard:      { backgroundColor:C.card2, borderTopLeftRadius:24, borderTopRightRadius:24,
                    padding:24, borderTopWidth:1, borderColor:C.border },
  modalTitle:     { color:C.text, fontSize:18, fontWeight:'900', marginBottom:16 },
  input:          { backgroundColor:C.bg, borderRadius:12, borderWidth:1, borderColor:C.border,
                    padding:12, color:C.text, fontSize:14, marginBottom:10 },
  inputLabel:     { color:C.muted, fontSize:10, fontWeight:'700', marginBottom:5,
                    textTransform:'uppercase', letterSpacing:0.5 },
  foodPickRow:    { flexDirection:'row', alignItems:'center', gap:10, padding:8,
                    borderRadius:10, borderWidth:1, borderColor:C.border, marginBottom:6 },
  foodPickRowSel: { borderColor:C.accent, backgroundColor:'rgba(200,241,53,0.08)' },
  foodPickImg:    { width:44, height:44, borderRadius:8 },
  foodPickName:   { color:C.text, fontSize:13, fontWeight:'700' },
  foodPickMeta:   { color:C.muted, fontSize:11 },
  rowInputs:      { flexDirection:'row', gap:12 },
  mealPill:       { flexDirection:'row', alignItems:'center', gap:3, borderRadius:10,
                    borderWidth:1, borderColor:C.border, paddingHorizontal:8, paddingVertical:5,
                    marginRight:6, backgroundColor:C.bg },
  mealPillTxt:    { color:C.muted, fontSize:10, fontWeight:'700' },
  calcBox:        { backgroundColor:'rgba(200,241,53,0.08)', borderRadius:10, padding:10,
                    borderWidth:1, borderColor:'rgba(200,241,53,0.25)', marginBottom:8 },
  calcTxt:        { color:C.text, fontSize:13, fontWeight:'600' },
  modalBtns:      { flexDirection:'row', gap:10, marginTop:8 },
  cancelBtn:      { flex:1, backgroundColor:C.border, borderRadius:12, paddingVertical:13, alignItems:'center' },
  cancelTxt:      { color:C.text, fontWeight:'700' },
  confirmBtn:     { flex:2, backgroundColor:C.accent, borderRadius:12, paddingVertical:13, alignItems:'center' },
  confirmTxt:     { color:'#000', fontWeight:'900', fontSize:15 },
  // Summary modal
  summaryBox:     { backgroundColor:C.bg, borderRadius:14, padding:14, marginBottom:16 },
  summaryRow:     { flexDirection:'row', justifyContent:'space-between', paddingVertical:8,
                    borderBottomWidth:0.5, borderColor:C.border },
  summaryKey:     { color:C.muted, fontSize:13 },
  summaryVal:     { fontSize:14, fontWeight:'900' },
  shopItem:       { flexDirection:'row', alignItems:'center', gap:10, paddingVertical:8,
                    borderBottomWidth:0.5, borderColor:C.border },
  shopName:       { color:C.text, fontSize:13, fontWeight:'600', flex:1 },
  shopCal:        { color:C.muted, fontSize:12 },
});
