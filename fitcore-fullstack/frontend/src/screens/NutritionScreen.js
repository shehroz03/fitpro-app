import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { View, Text, ScrollView, TouchableOpacity, Modal,
  TextInput, StyleSheet, Alert, ActivityIndicator,
  RefreshControl,  FlatList, Animated, Dimensions, PanResponder } from 'react-native';
import Svg, { Polyline, Rect } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { nutritionAPI, goalsAPI } from '../api/services';
import { useAuthStore } from '../store/authStore';
import { useC } from '../utils/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SW, height: SH } = Dimensions.get('window');

// ── Meal timing rules ─────────────────────────────────────────
const MEAL_TIMES = {
  breakfast:    { label:'Breakfast',    ion:'weather-sunset-up',  time:'7:00 – 9:00 AM',  color:'#C8F135' },
  pre_workout:  { label:'Pre-Workout',  ion:'lightning-bolt',     time:'60 min before',   color:'#C8F135' },
  lunch:        { label:'Lunch',        ion:'white-balance-sunny',time:'12:00 – 2:00 PM', color:'#C8F135' },
  snack:        { label:'Snack',        ion:'food-apple-outline', time:'4:00 – 5:00 PM',  color:'#C8F135' },
  post_workout: { label:'Post-Workout', ion:'arm-flex-outline',   time:'Within 30 min',   color:'#C8F135' },
  dinner:       { label:'Dinner',       ion:'weather-night',      time:'7:00 – 9:00 PM',  color:'#C8F135' },
};
const MealIcon = ({ mealKey, size = 14, color }) => (
  <MaterialCommunityIcons
    name={MEAL_TIMES[mealKey]?.ion || 'silverware-fork-knife'}
    size={size}
    color={color || MEAL_TIMES[mealKey]?.color || '#888'}
  />
);

const CAT_MC = {
  protein:'food-steak', carbs:'rice', fats:'fruit-cherries', dairy:'cup',
  fruits:'food-apple', vegetables:'carrot', supplements:'pill', nuts:'peanut',
  drinks:'tea', meals:'silverware-fork-knife',
};
const FoodCatIcon = ({ category, size = 14, color = '#fff' }) => (
  <MaterialCommunityIcons name={CAT_MC[category] || 'silverware-fork-knife'} size={size} color={color} />
);

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

// ── Ingredient generator ───────────────────────────────────────

const getIngredients = (food) => {
  const n = food.name.toLowerCase();
  const s = food.serving_size_g;
  if (n.includes('chicken breast') && !n.includes('salad') && !n.includes('tikka') && !n.includes('soup'))
    return [{n:'Chicken Breast',g:Math.round(s*0.88)},{n:'Olive Oil',g:5},{n:'Garlic',g:3},{n:'Salt & Herbs',g:2}];
  if (n.includes('tikka'))
    return [{n:'Chicken',g:Math.round(s*0.85)},{n:'Yogurt Marinade',g:30},{n:'Tikka Spices',g:8},{n:'Lemon Juice',g:5}];
  if (n.includes('chicken soup'))
    return [{n:'Chicken',g:Math.round(s*0.2)},{n:'Broth/Water',g:Math.round(s*0.65)},{n:'Vegetables',g:Math.round(s*0.1)},{n:'Spices',g:5}];
  if (n.includes('chicken salad'))
    return [{n:'Grilled Chicken',g:60},{n:'Mixed Greens',g:100},{n:'Cherry Tomatoes',g:50},{n:'Vinaigrette',g:15}];
  if (n.includes('grilled fish') || n.includes('tilapia'))
    return [{n:'Tilapia Fillet',g:Math.round(s*0.9)},{n:'Lemon Juice',g:8},{n:'Garlic',g:5},{n:'Spices',g:3}];
  if (n.includes('salmon'))
    return [{n:'Salmon Fillet',g:Math.round(s*0.9)},{n:'Lemon',g:10},{n:'Olive Oil',g:8},{n:'Dill',g:3}];
  if (n.includes('tuna'))
    return [{n:'Tuna (in water)',g:Math.round(s*0.88)},{n:'Water',g:Math.round(s*0.1)},{n:'Salt',g:2}];
  if (n.includes('sardine'))
    return [{n:'Sardines',g:Math.round(s*0.85)},{n:'Olive Oil',g:Math.round(s*0.12)},{n:'Salt',g:2}];
  if (n.includes('steak'))
    return [{n:'Lean Beef Steak',g:Math.round(s*0.92)},{n:'Salt & Pepper',g:3},{n:'Garlic',g:3},{n:'Oil',g:5}];
  if (n.includes('beef mince') || n.includes('qeema'))
    return [{n:'Lean Beef Mince',g:Math.round(s*0.9)},{n:'Onion',g:20},{n:'Spices',g:8},{n:'Oil',g:5}];
  if (n.includes('mutton') || n.includes('gosht'))
    return [{n:'Mutton (bone-in)',g:Math.round(s*0.88)},{n:'Onion & Tomato',g:20},{n:'Spices',g:8},{n:'Oil',g:7}];
  if (n.includes('turkey'))
    return [{n:'Turkey Breast',g:Math.round(s*0.93)},{n:'Salt & Herbs',g:3},{n:'Oil',g:5}];
  if (n.includes('boiled egg'))
    return [{n:'Whole Eggs (x2)',g:Math.round(s*0.97)},{n:'Salt',g:1}];
  if (n.includes('egg white'))
    return [{n:'Egg Whites',g:Math.round(s*0.97)},{n:'Salt',g:1}];
  if (n.includes('whole egg'))
    return [{n:'Whole Eggs',g:Math.round(s*0.97)},{n:'Salt',g:1}];
  if (n.includes('whole milk'))
    return [{n:'Full Cream Milk',g:s}];
  if (n.includes('skim milk'))
    return [{n:'Skimmed Milk',g:s}];
  if (n.includes('greek yogurt'))
    return [{n:'Strained Yogurt',g:Math.round(s*0.95)},{n:'Live Cultures',g:5}];
  if (n.includes('low fat dahi') || (n.includes('dahi') && !n.includes('lassi') && !n.includes('berry')))
    return [{n:'Low Fat Milk',g:Math.round(s*0.88)},{n:'Yogurt Starter',g:5},{n:'Water',g:Math.round(s*0.1)}];
  if (n.includes('cottage cheese'))
    return [{n:'Curd (Low Fat)',g:Math.round(s*0.88)},{n:'Salt',g:3},{n:'Cream',g:12}];
  if (n.includes('paneer'))
    return [{n:'Whole Milk',g:Math.round(s*4)},{n:'Lemon Juice',g:15},{n:'Salt',g:2}];
  if (n.includes('cheddar'))
    return [{n:'Aged Cheddar',g:s}];
  if (n.includes('sweet lassi'))
    return [{n:'Full Fat Yogurt',g:Math.round(s*0.6)},{n:'Water',g:Math.round(s*0.3)},{n:'Sugar',g:20},{n:'Rose Water',g:5}];
  if (n.includes('brown rice'))
    return [{n:'Brown Rice',g:Math.round(s*0.95)},{n:'Water',g:5},{n:'Salt',g:1}];
  if (n.includes('basmati rice'))
    return [{n:'Basmati Rice',g:Math.round(s*0.95)},{n:'Water',g:5},{n:'Salt',g:1}];
  if (n.includes('oatmeal') || n.includes('oats') || n.includes('oat'))
    return [{n:'Rolled Oats',g:Math.round(s*0.7)},{n:'Water/Milk',g:Math.round(s*0.27)},{n:'Salt',g:1}];
  if (n.includes('roti') || n.includes('chapati'))
    return [{n:'Whole Wheat Flour',g:Math.round(s*0.72)},{n:'Water',g:Math.round(s*0.24)},{n:'Oil',g:Math.round(s*0.03)},{n:'Salt',g:1}];
  if (n.includes('pasta'))
    return [{n:'Whole Wheat Pasta',g:Math.round(s*0.88)},{n:'Water',g:Math.round(s*0.1)},{n:'Salt',g:2}];
  if (n.includes('bread'))
    return [{n:'Wheat Flour',g:Math.round(s*0.6)},{n:'Yeast',g:3},{n:'Water',g:Math.round(s*0.3)},{n:'Salt',g:2}];
  if (n.includes('sweet potato'))
    return [{n:'Sweet Potato',g:Math.round(s*0.97)},{n:'Salt',g:1}];
  if (n.includes('quinoa'))
    return [{n:'Quinoa',g:Math.round(s*0.88)},{n:'Water',g:Math.round(s*0.1)},{n:'Salt',g:1}];
  if (n.includes('granola'))
    return [{n:'Rolled Oats',g:Math.round(s*0.45)},{n:'Honey',g:20},{n:'Nuts & Seeds',g:25},{n:'Oil',g:10}];
  if (n.includes('popcorn'))
    return [{n:'Corn Kernels',g:Math.round(s*0.95)},{n:'Salt',g:2}];
  if (n.includes('peanut butter'))
    return [{n:'Dry Roasted Peanuts',g:Math.round(s*0.85)},{n:'Salt',g:1},{n:'Oil',g:3}];
  if (n.includes('almond'))
    return [{n:'Raw Almonds',g:s}];
  if (n.includes('cashew') || n.includes('kaju'))
    return [{n:'Raw Cashews',g:s}];
  if (n.includes('peanut') || n.includes('moong phali'))
    return [{n:'Roasted Peanuts',g:Math.round(s*0.97)},{n:'Salt',g:1}];
  if (n.includes('chia'))
    return [{n:'Chia Seeds',g:s}];
  if (n.includes('dark chocolate'))
    return [{n:'Cocoa Mass',g:Math.round(s*0.52)},{n:'Cocoa Butter',g:Math.round(s*0.28)},{n:'Sugar',g:Math.round(s*0.15)},{n:'Vanilla',g:1}];
  if (n.includes('olive oil'))
    return [{n:'Extra Virgin Olive Oil',g:s}];
  if (n.includes('avocado') && !n.includes('shake'))
    return [{n:'Avocado (flesh)',g:Math.round(s*0.72)},{n:'Lime Juice',g:5},{n:'Salt',g:1}];
  if (n.includes('banana') && !n.includes('shake'))
    return [{n:'Banana (peeled)',g:Math.round(s*0.75)}];
  if (n.includes('mango') && !n.includes('lassi') && !n.includes('shake'))
    return [{n:'Mango (flesh)',g:Math.round(s*0.82)}];
  if (n.includes('apple'))
    return [{n:'Apple (fresh)',g:s}];
  if (n.includes('orange') || n.includes('narangi'))
    return [{n:'Orange (peeled)',g:s}];
  if (n.includes('strawberr'))
    return [{n:'Fresh Strawberries',g:s}];
  if (n.includes('watermelon') && !n.includes('shake') && !n.includes('cooler'))
    return [{n:'Watermelon (flesh)',g:Math.round(s*0.92)}];
  if (n.includes('date') || n.includes('khajoor'))
    return [{n:'Medjool Dates (pitted)',g:s}];
  if (n.includes('spinach'))  return [{n:'Fresh Spinach',g:s}];
  if (n.includes('broccoli')) return [{n:'Broccoli Florets',g:Math.round(s*0.95)},{n:'Water (steamed)',g:5}];
  if (n.includes('cauliflower') || n.includes('gobhi')) return [{n:'Cauliflower Florets',g:Math.round(s*0.95)},{n:'Water (steamed)',g:5}];
  if (n.includes('cucumber') || n.includes('kheera')) return [{n:'Fresh Cucumber',g:s}];
  if (n.includes('carrot') || n.includes('gajar'))    return [{n:'Fresh Carrot',g:s}];
  if (n.includes('celery'))   return [{n:'Celery Stalk',g:s}];
  if (n.includes('sprout'))   return [{n:'Mung Beans',g:Math.round(s*0.9)},{n:'Water',g:Math.round(s*0.1)}];
  if (n.includes('salad') && !n.includes('chicken'))
    return [{n:'Mixed Greens',g:Math.round(s*0.5)},{n:'Cucumber',g:Math.round(s*0.2)},{n:'Tomato',g:Math.round(s*0.2)},{n:'Lemon Juice',g:10}];
  if (n.includes('whey protein'))
    return [{n:'Whey Protein Isolate',g:Math.round(s*0.8)},{n:'Water/Milk',g:Math.round(s*0.15)},{n:'Flavouring',g:3}];
  if (n.includes('mass gainer'))
    return [{n:'Maltodextrin',g:Math.round(s*0.55)},{n:'Whey Protein',g:Math.round(s*0.15)},{n:'Oat Flour',g:Math.round(s*0.15)},{n:'Milk',g:Math.round(s*0.12)}];
  if (n.includes('protein bar'))
    return [{n:'Whey Protein',g:20},{n:'Almonds',g:10},{n:'Cocoa',g:8},{n:'Oats',g:12},{n:'Sweetener',g:5}];
  if (n.includes('meal replacement'))
    return [{n:'Protein Blend',g:18},{n:'Oat Fiber',g:12},{n:'Vitamins Mix',g:5},{n:'Milk Powder',g:10}];
  if (n.includes('green tea'))   return [{n:'Water',g:Math.round(s*0.99)},{n:'Green Tea Leaves',g:2}];
  if (n.includes('black coffee'))return [{n:'Water',g:Math.round(s*0.99)},{n:'Coffee',g:8}];
  if (n.includes('lemon water')) return [{n:'Water',g:Math.round(s*0.96)},{n:'Lemon Juice',g:Math.round(s*0.04)}];
  if (n.includes('dal mash'))
    return [{n:'Urad Dal',g:Math.round(s*0.55)},{n:'Water',g:Math.round(s*0.3)},{n:'Onion & Tomato',g:20},{n:'Spices',g:8}];
  if (n.includes('masoor dal') || n.includes('red lentil'))
    return [{n:'Red Lentils',g:Math.round(s*0.55)},{n:'Water',g:Math.round(s*0.3)},{n:'Onion & Tomato',g:20},{n:'Spices',g:8}];
  if (n.includes('chickpea') || n.includes('chana'))
    return [{n:'Chickpeas (boiled)',g:Math.round(s*0.92)},{n:'Salt & Spices',g:5}];
  // Shakes
  if (n.includes('peanut butter banana')) return [{n:'Banana',g:120},{n:'Peanut Butter',g:32},{n:'Whey Protein',g:30},{n:'Whole Milk',g:250}];
  if (n.includes('chocolate mass'))        return [{n:'Chocolate Whey',g:30},{n:'Rolled Oats',g:50},{n:'Peanut Butter',g:16},{n:'Whole Milk',g:250}];
  if (n.includes('mango lassi'))           return [{n:'Fresh Mango',g:200},{n:'Full Fat Yogurt',g:200},{n:'Whole Milk',g:150},{n:'Sugar',g:10}];
  if (n.includes('khajoor shake') || n.includes('date milk')) return [{n:'Medjool Dates',g:100},{n:'Whole Milk',g:300},{n:'Vanilla',g:1}];
  if (n.includes('avocado banana'))        return [{n:'Avocado',g:100},{n:'Banana',g:120},{n:'Whole Milk',g:200},{n:'Honey',g:15}];
  if (n.includes('egg + milk') || n.includes('egg milk')) return [{n:'Whole Eggs (x3)',g:150},{n:'Whole Milk',g:300},{n:'Honey',g:15}];
  if (n.includes('oats + whey') || n.includes('oats whey')) return [{n:'Rolled Oats',g:50},{n:'Whey Protein',g:30},{n:'Whole Milk',g:250},{n:'Honey',g:20}];
  if (n.includes('green protein'))   return [{n:'Whey Protein',g:30},{n:'Spinach',g:50},{n:'Almond Milk',g:250},{n:'Ice',g:50}];
  if (n.includes('strawberry protein')) return [{n:'Whey Protein',g:30},{n:'Strawberries',g:100},{n:'Skim Milk',g:250},{n:'Ice',g:30}];
  if (n.includes('chocolate cutting')) return [{n:'Chocolate Whey',g:30},{n:'Water',g:250},{n:'Cocoa Powder',g:5},{n:'Ice',g:30}];
  if (n.includes('dahi berry'))      return [{n:'Low Fat Dahi',g:200},{n:'Mixed Berries',g:100},{n:'Stevia',g:2},{n:'Ice',g:30}];
  if (n.includes('cucumber detox'))  return [{n:'Cucumber',g:200},{n:'Mint Leaves',g:5},{n:'Lemon Juice',g:15},{n:'Water',g:180}];
  if (n.includes('watermelon mint')) return [{n:'Watermelon',g:300},{n:'Mint Leaves',g:5},{n:'Lime Juice',g:10},{n:'Water',g:100}];
  if (n.includes('iced mocha'))      return [{n:'Chocolate Whey',g:30},{n:'Black Coffee',g:100},{n:'Skim Milk',g:200},{n:'Ice',g:50}];
  // Generic fallback by category
  const { category } = food;
  if (category === 'protein')    return [{n:food.name,g:Math.round(s*0.92)},{n:'Seasoning',g:3}];
  if (category === 'carbs')      return [{n:food.name,g:Math.round(s*0.9)},{n:'Water',g:Math.round(s*0.08)},{n:'Salt',g:1}];
  if (category === 'fats')       return [{n:food.name,g:s}];
  if (category === 'dairy')      return [{n:food.name,g:s}];
  if (category === 'fruits')     return [{n:food.name+' (fresh)',g:s}];
  if (category === 'vegetables') return [{n:food.name+' (fresh)',g:s}];
  if (category === 'shakes')     return [{n:food.name,g:s}];
  return [{n:food.name,g:s}];
};

// ── Macro bar mini ─────────────────────────────────────────────
const makeMm = (C) => StyleSheet.create({
  wrap: { height:4, borderRadius:2, overflow:'hidden', flexDirection:'row', backgroundColor:C.border, marginTop:4 },
  seg:  { height:'100%' },
});
const MacroMini = ({ p, c, f }) => {
  const C = useC();
  const mm = useMemo(() => makeMm(C), [C]);
  const tot = p + c + f || 1;
  return (
    <View style={mm.wrap}>
      <View style={[mm.seg, { width:`${(p/tot)*100}%`, backgroundColor:C.accent    }]} />
      <View style={[mm.seg, { width:`${(c/tot)*100}%`, backgroundColor:C.accent  }]} />
      <View style={[mm.seg, { width:`${(f/tot)*100}%`, backgroundColor:C.accent  }]} />
    </View>
  );
};

// ── Food Card ─────────────────────────────────────────────────
const makeFc = (C) => StyleSheet.create({
  card:         { backgroundColor:C.card, borderRadius:16, borderWidth:1, borderColor:C.border,
                  marginBottom:12, overflow:'hidden' },
  cardSelected: { borderColor:C.accent, borderWidth:2, backgroundColor:`${C.accent}0A` },
  imgWrap:      { height:160, position:'relative', overflow:'hidden' },
  img:          { width:'100%', height:'100%' },
  calBadge:     { position:'absolute', top:10, left:10, backgroundColor:'rgba(0,0,0,0.75)',
                  borderRadius:10, paddingHorizontal:8, paddingVertical:4, alignItems:'center',
                  borderWidth:1, borderColor:'rgba(200,241,53,0.5)' },
  calBadgeTxt:  { color:C.accent, fontSize:16, fontWeight:'900', lineHeight:18 },
  calBadgeSub:  { color:C.muted,  fontSize:8,  fontWeight:'600' },
  tick:         { position:'absolute', top:10, right:10, backgroundColor:C.accent,
                  borderRadius:12, width:26, height:26, alignItems:'center', justifyContent:'center' },
  catIcon:      { position:'absolute', bottom:10, left:10, backgroundColor:'rgba(0,0,0,0.6)',
                  borderRadius:8, width:28, height:28, alignItems:'center', justifyContent:'center' },
  detailOverlay:{ position:'absolute', right:0, top:0, bottom:0, width:'46%',
                  backgroundColor:'rgba(8,8,14,0.88)', padding:8,
                  borderLeftWidth:1, borderLeftColor:'rgba(200,241,53,0.25)',
                  justifyContent:'center', gap:2 },
  ovCalLbl:     { color:C.accent, fontSize:7, fontWeight:'900', letterSpacing:1 },
  ovDivider:    { height:1, backgroundColor:'rgba(255,255,255,0.1)', marginVertical:4 },
  ovBenRow:     { flexDirection:'row', alignItems:'flex-start', gap:4 },
  ovDot:        { color:C.accent, fontSize:5, marginTop:2 },
  ovBenTxt:     { color:'#ddd', fontSize:9, fontWeight:'600', flex:1, lineHeight:12 },
  ovSectionLbl: { color:C.muted, fontSize:7, fontWeight:'900', letterSpacing:0.8, marginBottom:2 },
  ovTimingRow:  { flexDirection:'row', flexWrap:'wrap', gap:3 },
  ovChip:       { flexDirection:'row', alignItems:'center', gap:2, borderRadius:5,
                  paddingHorizontal:4, paddingVertical:2 },
  ovChipTxt:    { fontSize:7, fontWeight:'800' },
  ovWhyTxt:     { color:'#aaa', fontSize:8, lineHeight:12, fontStyle:'italic' },
  info:         { padding:12 },
  name:         { color:C.text, fontSize:15, fontWeight:'800', marginBottom:2 },
  serving:      { color:C.dim,  fontSize:11, marginBottom:2 },
  macroRow:     { flexDirection:'row', gap:8, marginTop:4 },
  macroLbl:     { fontSize:10, fontWeight:'700' },
  timeChip:     { flexDirection:'row', alignItems:'center', gap:3, borderRadius:8,
                  paddingHorizontal:7, paddingVertical:3, marginRight:5 },
  timeChipTxt:  { fontSize:9, fontWeight:'700' },
  planBox:      { backgroundColor:`${C.accent}14`, borderRadius:8, padding:8,
                  marginTop:8, borderWidth:1, borderColor:`${C.accent}33` },
  planTxt:      { color:C.text, fontSize:12, fontWeight:'700', marginBottom:2 },
  planReason:   { color:C.muted, fontSize:11, lineHeight:15 },
  tip:          { color:C.dim, fontSize:11, marginTop:6, lineHeight:15 },
});
const FoodCard = ({ food, selected, onToggle, onDetail, goal }) => {
  const C = useC();
  const fc = useMemo(() => makeFc(C), [C]);
  const plan     = goal === 'weight_gain' ? food.gain_plan : food.loss_plan;
  const benefits = getFoodBenefits(food);
  const timingKeys = (food.best_time || []).slice(0, 2);
  const scaleAnim  = useRef(new Animated.Value(1)).current;

  const handleToggle = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue:0.94, useNativeDriver:true, speed:50 }),
      Animated.spring(scaleAnim, { toValue:1,    useNativeDriver:true, speed:50 }),
    ]).start();
    onToggle(food);
  };

  return (
    <Animated.View style={[{ transform:[{ scale:scaleAnim }] }, fc.card, selected && fc.cardSelected]}>

      {/* ── IMAGE AREA — tap opens food detail page ── */}
      <TouchableOpacity onPress={() => onDetail?.(food)} activeOpacity={0.88}>
        <View style={fc.imgWrap}>
          <Image
            source={{ uri: food.image }}
            style={fc.img}
            contentFit="cover"
            onError={() => {}}
            defaultSource={{ uri: 'https://placehold.co/400x200/111118/C8F135.png?text=' + encodeURIComponent(food.name) }}
          />

          {/* Calorie Badge — top left */}
          <View style={fc.calBadge}>
            <Text style={fc.calBadgeTxt}>{food.calories}</Text>
            <Text style={fc.calBadgeSub}>kcal</Text>
          </View>

          {/* Selected tick */}
          {selected && (
            <View style={fc.tick}>
              <Ionicons name="checkmark" size={15} color="#0A0A0F" />
            </View>
          )}

          {/* Category icon — bottom left */}
          <View style={fc.catIcon}>
            <FoodCatIcon category={food.category} size={14} color={C.accent} />
          </View>

          {/* ── DETAIL OVERLAY — right side of image ── */}
          <View style={fc.detailOverlay}>
            <Text style={fc.ovCalLbl}>NUTRIENTS</Text>
            <View style={fc.ovDivider} />
            {benefits.map((b, i) => (
              <View key={i} style={fc.ovBenRow}>
                <Text style={fc.ovDot}>◆</Text>
                <Text style={fc.ovBenTxt}>{b}</Text>
              </View>
            ))}
            <View style={fc.ovDivider} />
            <Text style={fc.ovSectionLbl}>BEST TIME</Text>
            <View style={fc.ovTimingRow}>
              {timingKeys.map(t => (
                <View key={t} style={[fc.ovChip, { backgroundColor:`${MEAL_TIMES[t]?.color||C.accent}30` }]}>
                  <MealIcon mealKey={t} size={8} />
                  <Text style={[fc.ovChipTxt, { color:MEAL_TIMES[t]?.color||C.accent }]}>
                    {MEAL_TIMES[t]?.label||t}
                  </Text>
                </View>
              ))}
            </View>
            {plan && (
              <>
                <View style={fc.ovDivider} />
                <Text style={fc.ovSectionLbl}>WHY EAT</Text>
                <Text style={fc.ovWhyTxt} numberOfLines={3}>{plan.reason}</Text>
              </>
            )}
          </View>

          {/* "View Details" hint — bottom right of image */}
          <View style={{ position:'absolute', bottom:10, right:10, backgroundColor:'rgba(0,0,0,0.60)',
            borderRadius:8, paddingHorizontal:7, paddingVertical:4,
            flexDirection:'row', alignItems:'center', gap:3 }}>
            <Ionicons name="expand-outline" size={10} color="#fff" />
            <Text style={{ color:'#fff', fontSize:9, fontWeight:'800' }}>View Details</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* ── INFO AREA — tap toggles selection ── */}
      <TouchableOpacity onPress={handleToggle} activeOpacity={0.88}>
        <View style={fc.info}>
          <Text style={fc.name} numberOfLines={1}>{food.name}</Text>
          <Text style={fc.serving}>{food.serving_size_g}g serving</Text>
          <MacroMini p={food.protein_g} c={food.carbs_g} f={food.fat_g} />
          <View style={fc.macroRow}>
            <Text style={[fc.macroLbl, { color:C.accent   }]}>P {food.protein_g}g</Text>
            <Text style={[fc.macroLbl, { color:C.accent }]}>C {food.carbs_g}g</Text>
            <Text style={[fc.macroLbl, { color:C.accent }]}>F {food.fat_g}g</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop:6 }}>
            {(food.best_time||[]).map(t => (
              <View key={t} style={[fc.timeChip, { backgroundColor:`${MEAL_TIMES[t]?.color||C.accent}22` }]}>
                <MealIcon mealKey={t} size={10} />
                <Text style={[fc.timeChipTxt, { color:MEAL_TIMES[t]?.color||C.accent }]}>
                  {MEAL_TIMES[t]?.label||t}
                </Text>
              </View>
            ))}
          </ScrollView>
          {plan && (
            <View style={fc.planBox}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                <Ionicons name={goal === 'weight_gain' ? 'trending-up' : 'trending-down'} size={12} color={C.accent} />
                <Text style={fc.planTxt}>
                  {plan.servings}x/day = <Text style={{ color:C.accent, fontWeight:'800' }}>{plan.total_cal} kcal</Text>
                </Text>
              </View>
              <Text style={fc.planReason} numberOfLines={2}>{plan.reason}</Text>
            </View>
          )}
          {food.tip && (
            <View style={{ flexDirection:'row', alignItems:'flex-start', gap:4, marginTop:6 }}>
              <Ionicons name="bulb-outline" size={11} color={C.dim} style={{ marginTop:2 }} />
              <Text style={[fc.tip, { marginTop:0, flex:1 }]} numberOfLines={2}>{food.tip}</Text>
            </View>
          )}
          {/* Tap to select hint */}
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:4, marginTop:8,
            paddingTop:8, borderTopWidth:0.5, borderColor:C.border }}>
            {selected
              ? <><Ionicons name="checkmark-circle" size={13} color={C.accent} /><Text style={{ color:C.accent, fontSize:11, fontWeight:'800' }}>Selected for plan</Text></>
              : <><Ionicons name="add-circle-outline" size={13} color={C.dim} /><Text style={{ color:C.dim, fontSize:11, fontWeight:'600' }}>Tap to add to plan</Text></>
            }
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── Meal Plan Row ─────────────────────────────────────────────
const makeMp = (C) => StyleSheet.create({
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
const MealPlanRow = ({ mealKey, foods }) => {
  const C = useC();
  const mp = useMemo(() => makeMp(C), [C]);
  const mt = MEAL_TIMES[mealKey];
  if (!mt || foods.length === 0) return null;
  const totalCal = foods.reduce((s,f) => s + (f.calories||0), 0);
  return (
    <View style={mp.row}>
      <View style={[mp.timeCol, { borderColor:mt.color }]}>
        <MealIcon mealKey={mealKey} size={20} />
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

// ── Body transformation images ─────────────────────────────────
const SHAPE_IMAGES = {
  weight_gain: {
    male:   { before: require('../../assets/shapes/male_skinny.png'),   after: require('../../assets/shapes/male_toned.png')   },
    female: { before: require('../../assets/shapes/female_skinny.png'), after: require('../../assets/shapes/female_toned.png') },
  },
  weight_loss: {
    male:   { before: require('../../assets/shapes/male_flabby.png'),   after: require('../../assets/shapes/male_medium.png')  },
    female: { before: require('../../assets/shapes/female_flabby.png'), after: require('../../assets/shapes/female_medium.png')},
  },
};

function GoalBanner({ goal, gender, C }) {
  const gKey   = gender === 'female' ? 'female' : 'male';
  const imgs   = SHAPE_IMAGES[goal]?.[gKey] ?? SHAPE_IMAGES.weight_gain.male;
  const isGain = goal === 'weight_gain';
  const ac     = isGain ? C.accent : C.accent;

  return (
    <View style={{
      flexDirection:'row', alignItems:'center',
      backgroundColor:C.card, borderRadius:18,
      borderWidth:1.5, borderColor:`${ac}44`,
      paddingVertical:16, paddingHorizontal:12,
      marginBottom:14, gap:8,
    }}>
      {/* BEFORE */}
      <View style={{ alignItems:'center', flex:1 }}>
        <Text style={{ color:C.muted, fontSize:9, fontWeight:'800', letterSpacing:1.5, marginBottom:8 }}>
          BEFORE
        </Text>
        <Image source={imgs.before} style={{ width:80, height:140 }} contentFit="contain" />
        <View style={{ marginTop:8, backgroundColor:`${C.border}99`, borderRadius:8, paddingHorizontal:10, paddingVertical:3 }}>
          <Text style={{ color:C.muted, fontSize:10, fontWeight:'700' }}>
            {isGain ? 'Underweight' : 'Overweight'}
          </Text>
        </View>
      </View>

      {/* ARROW */}
      <View style={{ alignItems:'center', gap:6 }}>
        <Ionicons name={isGain ? 'trending-up' : 'trending-down'} size={32} color={ac} />
        <Text style={{ color:ac, fontSize:9, fontWeight:'900', letterSpacing:1.2, textAlign:'center', lineHeight:14 }}>
          {isGain ? '+MUSCLE\n+WEIGHT' : '-FAT\n-WEIGHT'}
        </Text>
        <Text style={{ color:C.dim, fontSize:8, textAlign:'center' }}>~0.5kg/week</Text>
      </View>

      {/* AFTER */}
      <View style={{ alignItems:'center', flex:1 }}>
        <Text style={{ color:ac, fontSize:9, fontWeight:'800', letterSpacing:1.5, marginBottom:8 }}>
          AFTER
        </Text>
        <Image source={imgs.after} style={{ width:80, height:140 }} contentFit="contain" />
        <View style={{ marginTop:8, backgroundColor:`${ac}22`, borderRadius:8, paddingHorizontal:10, paddingVertical:3 }}>
          <Text style={{ color:ac, fontSize:10, fontWeight:'700' }}>
            {isGain ? 'Toned & Strong' : 'Lean & Fit'}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Food Detail Modal ──────────────────────────────────────────
const FoodDetailModal = ({ food, goal, visible, onClose, onLogPress }) => {
  const C = useC();
  if (!food) return null;
  const plan       = goal === 'weight_gain' ? food.gain_plan : food.loss_plan;
  const ingredients = getIngredients(food);
  const benefits    = getFoodBenefits(food);
  const tot         = (food.protein_g || 0) + (food.carbs_g || 0) + (food.fat_g || 0) || 1;
  const IMG_H       = Math.round(SH * 0.42);
  const isGain      = goal === 'weight_gain';

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={{ flex:1, backgroundColor:C.bg }}>
        <ScrollView showsVerticalScrollIndicator={false} bounces>

          {/* ── HERO IMAGE ── */}
          <View style={{ height:IMG_H, position:'relative' }}>
            <Image
              source={{ uri: food.image }}
              style={{ width:'100%', height:'100%' }}
              contentFit="cover"
              onError={() => {}}
            />
            {/* Dark gradient overlay */}
            <View style={{ position:'absolute', bottom:0, left:0, right:0, height:IMG_H * 0.55,
              backgroundColor:'rgba(10,10,15,0.72)' }} />

            {/* Back button */}
            <TouchableOpacity onPress={onClose}
              style={{ position:'absolute', top:48, left:16,
                backgroundColor:'rgba(0,0,0,0.6)', borderRadius:20,
                width:40, height:40, alignItems:'center', justifyContent:'center',
                borderWidth:1, borderColor:'rgba(255,255,255,0.15)' }}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>

            {/* Category badge — top right */}
            <View style={{ position:'absolute', top:52, right:16,
              backgroundColor:'rgba(0,0,0,0.65)', borderRadius:10,
              paddingHorizontal:10, paddingVertical:5,
              flexDirection:'row', alignItems:'center', gap:5,
              borderWidth:1, borderColor:`${C.accent}44` }}>
              <FoodCatIcon category={food.category} size={13} color={C.accent} />
              <Text style={{ color:C.accent, fontSize:11, fontWeight:'800', textTransform:'uppercase' }}>
                {food.category}
              </Text>
            </View>

            {/* Calorie block — bottom of image */}
            <View style={{ position:'absolute', bottom:16, left:16, right:16,
              flexDirection:'row', alignItems:'flex-end', justifyContent:'space-between' }}>
              <View>
                <Text style={{ color:'#fff', fontSize:22, fontWeight:'900', lineHeight:26 }}>
                  {food.name}
                </Text>
                <Text style={{ color:'rgba(255,255,255,0.65)', fontSize:13, marginTop:2 }}>
                  per {food.serving_size_g}g serving
                </Text>
              </View>
              <View style={{ alignItems:'center',
                backgroundColor:C.accent, borderRadius:12,
                paddingHorizontal:12, paddingVertical:6 }}>
                <Text style={{ color:C.accentText, fontSize:22, fontWeight:'900', lineHeight:24 }}>
                  {food.calories}
                </Text>
                <Text style={{ color:C.accentText, fontSize:9, fontWeight:'800' }}>KCAL</Text>
              </View>
            </View>
          </View>

          {/* ── BODY ── */}
          <View style={{ padding:16, gap:16 }}>

            {/* Macro 3-column row */}
            <View style={{ flexDirection:'row', gap:8 }}>
              {[
                { label:'Protein', val:food.protein_g, color:C.accent,   icon:'arm-flex-outline' },
                { label:'Carbs',   val:food.carbs_g,   color:C.accent, icon:'lightning-bolt' },
                { label:'Fats',    val:food.fat_g,     color:C.accent, icon:'water' },
              ].map(m => (
                <View key={m.label} style={{ flex:1, backgroundColor:C.card, borderRadius:14,
                  borderWidth:1, borderColor:`${m.color}33`, padding:12, alignItems:'center', gap:6 }}>
                  <View style={{ backgroundColor:`${m.color}18`, borderRadius:20,
                    width:36, height:36, alignItems:'center', justifyContent:'center' }}>
                    <MaterialCommunityIcons name={m.icon} size={18} color={m.color} />
                  </View>
                  <Text style={{ color:m.color, fontSize:20, fontWeight:'900' }}>{m.val}g</Text>
                  <Text style={{ color:C.muted, fontSize:11, fontWeight:'700' }}>{m.label}</Text>
                  {/* Mini % bar */}
                  <View style={{ height:3, width:'100%', borderRadius:2, backgroundColor:C.border }}>
                    <View style={{ height:'100%', borderRadius:2, backgroundColor:m.color,
                      width:`${Math.min(100, (m.val/tot)*100)}%` }} />
                  </View>
                  <Text style={{ color:C.dim, fontSize:9 }}>{Math.round((m.val/tot)*100)}%</Text>
                </View>
              ))}
            </View>

            {/* Ingredients */}
            <View style={{ backgroundColor:C.card, borderRadius:16, borderWidth:1, borderColor:C.border, padding:14 }}>
              <Text style={{ color:C.text, fontSize:14, fontWeight:'900', marginBottom:12, letterSpacing:0.5 }}>
                INGREDIENTS
              </Text>
              {ingredients.map((ing, i) => (
                <View key={i} style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between',
                  paddingVertical:7, borderBottomWidth: i < ingredients.length-1 ? 0.5 : 0, borderColor:C.border }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
                    <View style={{ width:10, height:10, borderRadius:5, backgroundColor:C.accent }} />
                    <Text style={{ color:C.text, fontSize:13, fontWeight:'600' }}>{ing.n}</Text>
                  </View>
                  <Text style={{ color:C.accent, fontSize:13, fontWeight:'800' }}>
                    {ing.g}g
                  </Text>
                </View>
              ))}
            </View>

            {/* Benefits */}
            <View style={{ backgroundColor:C.card, borderRadius:16, borderWidth:1, borderColor:C.border, padding:14 }}>
              <Text style={{ color:C.text, fontSize:14, fontWeight:'900', marginBottom:10, letterSpacing:0.5 }}>
                BENEFITS
              </Text>
              {benefits.map((b, i) => (
                <View key={i} style={{ flexDirection:'row', alignItems:'flex-start', gap:10, marginBottom:8 }}>
                  <View style={{ backgroundColor:`${C.accent}20`, borderRadius:12, padding:5, marginTop:1 }}>
                    <Ionicons name="checkmark" size={12} color={C.accent} />
                  </View>
                  <Text style={{ color:C.text, fontSize:13, fontWeight:'600', flex:1, lineHeight:18 }}>{b}</Text>
                </View>
              ))}
            </View>

            {/* Best Time chips */}
            <View style={{ backgroundColor:C.card, borderRadius:16, borderWidth:1, borderColor:C.border, padding:14 }}>
              <Text style={{ color:C.text, fontSize:14, fontWeight:'900', marginBottom:12, letterSpacing:0.5 }}>
                BEST TIME TO EAT
              </Text>
              <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
                {(food.best_time || []).map(t => {
                  const mt = MEAL_TIMES[t];
                  if (!mt) return null;
                  return (
                    <View key={t} style={{ flexDirection:'row', alignItems:'center', gap:6,
                      backgroundColor:`${mt.color}18`, borderRadius:20,
                      paddingHorizontal:12, paddingVertical:6,
                      borderWidth:1, borderColor:`${mt.color}44` }}>
                      <MealIcon mealKey={t} size={14} color={mt.color} />
                      <View>
                        <Text style={{ color:mt.color, fontSize:12, fontWeight:'800' }}>{mt.label}</Text>
                        <Text style={{ color:C.dim, fontSize:10 }}>{mt.time}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Plan recommendation */}
            {plan && (
              <View style={{ backgroundColor:`${isGain ? C.accent : C.accent}12`, borderRadius:16,
                borderWidth:1, borderColor:`${isGain ? C.accent : C.accent}33`, padding:14 }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:10 }}>
                  <View style={{ backgroundColor:`${isGain ? C.accent : C.accent}20`, borderRadius:20, padding:6 }}>
                    <Ionicons name={isGain ? 'trending-up' : 'trending-down'} size={16}
                      color={isGain ? C.accent : C.accent} />
                  </View>
                  <Text style={{ color:C.text, fontSize:14, fontWeight:'900' }}>
                    {isGain ? 'GAIN PLAN' : 'LOSS PLAN'}
                  </Text>
                </View>
                <View style={{ flexDirection:'row', gap:10, marginBottom:10 }}>
                  <View style={{ flex:1, backgroundColor:C.bg, borderRadius:10, padding:10, alignItems:'center' }}>
                    <Text style={{ color:isGain ? C.accent : C.accent, fontSize:20, fontWeight:'900' }}>
                      {plan.servings}x
                    </Text>
                    <Text style={{ color:C.muted, fontSize:11, fontWeight:'600' }}>Per Day</Text>
                  </View>
                  <View style={{ flex:1, backgroundColor:C.bg, borderRadius:10, padding:10, alignItems:'center' }}>
                    <Text style={{ color:isGain ? C.accent : C.accent, fontSize:20, fontWeight:'900' }}>
                      {plan.total_cal}
                    </Text>
                    <Text style={{ color:C.muted, fontSize:11, fontWeight:'600' }}>Total kcal</Text>
                  </View>
                </View>
                <Text style={{ color:C.text, fontSize:13, lineHeight:19 }}>{plan.reason}</Text>
              </View>
            )}

            {/* Tip */}
            {food.tip && (
              <View style={{ backgroundColor:C.card, borderRadius:16, borderWidth:1, borderColor:C.border, padding:14,
                flexDirection:'row', gap:10 }}>
                <View style={{ backgroundColor:`${C.accent}20`, borderRadius:20, padding:7, alignSelf:'flex-start' }}>
                  <Ionicons name="bulb-outline" size={16} color={C.accent} />
                </View>
                <View style={{ flex:1 }}>
                  <Text style={{ color:C.text, fontSize:13, fontWeight:'900', marginBottom:4 }}>PRO TIP</Text>
                  <Text style={{ color:C.muted, fontSize:13, lineHeight:19 }}>{food.tip}</Text>
                </View>
              </View>
            )}

            {/* Action buttons */}
            <View style={{ flexDirection:'row', gap:10, marginTop:4, marginBottom:24 }}>
              <TouchableOpacity
                onPress={() => { onClose(); }}
                style={{ flex:1, height:52, borderRadius:14, borderWidth:2, borderColor:C.accent,
                  alignItems:'center', justifyContent:'center' }}>
                <Text style={{ color:C.accent, fontSize:15, fontWeight:'800' }}>Replace Meal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { onLogPress(food); onClose(); }}
                style={{ flex:1, height:52, borderRadius:14, backgroundColor:C.accent,
                  alignItems:'center', justifyContent:'center' }}>
                <Text style={{ color:C.accentText, fontSize:15, fontWeight:'900' }}>Log Meal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

// ── MAIN SCREEN ───────────────────────────────────────────────
export default function NutritionScreen({ navigation }) {
  const C = useC();
  const insets = useSafeAreaInsets();
  const aiStyles = useMemo(() => makeAiStyles(C), [C]);
  const s        = useMemo(() => makeS(C), [C]);
  const user = useAuthStore(st => st.user);
  const queryClient = useQueryClient();
  const [selected,      setSelected]      = useState([]);
  const [activeTab,     setActiveTab]     = useState('plan');   // plan | log | search
  const [searchQ,       setSearchQ]       = useState('');
  const [catFilter,     setCatFilter]     = useState('All');
  const [showLogModal,  setShowLogModal]  = useState(false);
  const [logFood,       setLogFood]       = useState(null);
  const [logQty,        setLogQty]        = useState('100');
  const [showFoodDetail, setShowFoodDetail] = useState(false);
  const [detailFood,     setDetailFood]     = useState(null);
  const [logMealType,   setLogMealType]   = useState('lunch');
  const [logging,       setLogging]       = useState(false);
  const [showSummary,   setShowSummary]   = useState(false);

  // AI Scanner States
  const [aiImage,       setAiImage]       = useState(null);
  const [aiPath,        setAiPath]        = useState([]);
  const [aiBox,         setAiBox]         = useState(null);
  const [aiResult,      setAiResult]      = useState(null);
  const [aiLoading,     setAiLoading]     = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  // Multi-item scan
  const [scanMode,      setScanMode]      = useState('single');  // 'single' | 'scan_all'
  const [aiItems,       setAiItems]       = useState([]);        // scan_all results
  const [checkedItems,  setCheckedItems]  = useState({});        // which items selected for log
  // Favorites
  const [favorites,     setFavorites]     = useState([]);

  const FAVES_KEY = '@fitcore_ai_faves';

  const loadFavorites = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(FAVES_KEY);
      if (raw) setFavorites(JSON.parse(raw));
    } catch {}
  }, []);

  const saveFavorite = useCallback(async (food) => {
    try {
      const raw = await AsyncStorage.getItem(FAVES_KEY);
      const faves = raw ? JSON.parse(raw) : [];
      const idx = faves.findIndex(f => f.name.toLowerCase() === food.name.toLowerCase());
      if (idx >= 0) {
        faves[idx].count = (faves[idx].count || 0) + 1;
        faves[idx].lastUsed = Date.now();
      } else {
        faves.unshift({ name: food.name, calories: food.calories, protein_g: food.protein_g,
          carbs_g: food.carbs_g, fat_g: food.fat_g, serving_size_g: food.serving_size_g || 100,
          count: 1, lastUsed: Date.now() });
      }
      faves.sort((a, b) => (b.count - a.count));
      const top = faves.slice(0, 12);
      await AsyncStorage.setItem(FAVES_KEY, JSON.stringify(top));
      setFavorites(top);
    } catch {}
  }, []);

  useEffect(() => { loadFavorites(); }, [loadFavorites]);

  // refs for the circle-to-select gesture (read inside PanResponder closures)
  const imgLayout  = useRef({ width: 1, height: 1 });   // rendered container size
  const imgNatural = useRef({ width: 1, height: 1 });   // source image size
  const pathPoints = useRef([]);

  const aiPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder:        () => true,
      onMoveShouldSetPanResponder:         () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture:  () => true,
      onPanResponderGrant: (e) => {
        setScrollEnabled(false);
        pathPoints.current = [{ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY }];
        setAiPath([...pathPoints.current]);
        setAiBox(null);
      },
      onPanResponderMove: (e) => {
        pathPoints.current.push({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
        setAiPath([...pathPoints.current]);
      },
      onPanResponderRelease: () => {
        setScrollEnabled(true);
        const pts = pathPoints.current;
        if (pts.length < 3) { setAiBox(null); return; }
        const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);

        // map container px → normalized image coords (contentFit="contain")
        const { width: cW, height: cH } = imgLayout.current;
        const { width: iw, height: ih } = imgNatural.current;
        const scale = Math.min(cW / iw, cH / ih);
        const dw = iw * scale, dh = ih * scale;
        const offX = (cW - dw) / 2, offY = (cH - dh) / 2;
        const norm = (v, off, d) => Math.max(0, Math.min(1, (v - off) / d));
        const nx1 = norm(minX, offX, dw), nx2 = norm(maxX, offX, dw);
        const ny1 = norm(minY, offY, dh), ny2 = norm(maxY, offY, dh);

        setAiBox({
          x: nx1, y: ny1,
          w: Math.max(0.02, nx2 - nx1),
          h: Math.max(0.02, ny2 - ny1),
          px: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
        });
      },
      onPanResponderTerminate: () => {
        setScrollEnabled(true);
      },
    })
  ).current;

  const { data: allFoods = [], isLoading: foodsLoading } = useQuery({
    queryKey: ['allFoods'],
    queryFn: () => nutritionAPI.searchFoods('').then(r => r.data.data || []),
    staleTime: 5 * 60_000,
  });

  const { data: daily, isLoading: dailyLoading, isRefetching: dailyRefreshing, refetch: refetchDaily } = useQuery({
    queryKey: ['dailyNutrition'],
    queryFn: () => nutritionAPI.getDailyStats().then(r => r.data.data),
  });

  const { data: userGoals = [], isLoading: goalsLoading, isRefetching: goalsRefreshing, refetch: refetchGoals } = useQuery({
    queryKey: ['goals', 'active'],
    queryFn: () => goalsAPI.getAll('active').then(r => r.data.data || []),
  });

  const loading = foodsLoading || dailyLoading || goalsLoading;
  const refresh = dailyRefreshing || goalsRefreshing;

  // User can manually toggle; auto-detect from DB on first load
  const [activeGoalOverride, setActiveGoalOverride] = useState(null);
  const goalFromDB  = userGoals[0]?.type === 'weight_loss' ? 'weight_loss' : 'weight_gain';
  const activeGoal  = activeGoalOverride ?? goalFromDB;
  const setActiveGoal = (g) => setActiveGoalOverride(g);

  const toggleFood = (food) => {
    setSelected(prev =>
      prev.find(f => f.id === food.id)
        ? prev.filter(f => f.id !== food.id)
        : [...prev, food]
    );
  };

  const { mutateAsync: logMealMutation } = useMutation({
    mutationFn: (payload) => nutritionAPI.logMeal(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dailyNutrition'] }),
  });

  const handleLogFood = async () => {
    if (!logFood) return;
    setLogging(true);
    try {
      await logMealMutation({
        food_id:    logFood.id,
        meal_type:  logMealType,
        quantity_g: +logQty,
        food_name:      logFood.name,
        calories:       logFood.calories,
        protein_g:      logFood.protein_g,
        carbs_g:        logFood.carbs_g,
        fat_g:          logFood.fat_g,
        serving_size_g: logFood.serving_size_g,
      });
      setShowLogModal(false);
      Alert.alert('Logged', `${logFood.name} added to ${logMealType}.`);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Could not log');
    } finally {
      setLogging(false);
    }
  };

  // ── AI SCANNER LOGIC ──────────────────────────────────────────
  const resetAiGesture = () => {
    pathPoints.current = [];
    setAiPath([]);
    setAiBox(null);
    setAiResult(null);
    setAiItems([]);
    setCheckedItems({});
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.45,
      base64: true,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setAiImage(asset);
      imgNatural.current = { width: asset.width || 1, height: asset.height || 1 };
      resetAiGesture();
    }
  };

  const analyzeFood = async () => {
    if (!aiImage) return;
    setAiLoading(true);
    try {
      const res = await nutritionAPI.analyzeImage({
        imageBase64: aiImage.base64,
        region: aiBox ? { x: aiBox.x, y: aiBox.y, w: aiBox.w, h: aiBox.h } : null,
        mimeType: aiImage.mimeType || 'image/jpeg',
        mode: 'single',
      });
      setAiResult(res.data.data || res.data);
      setAiItems([]);
    } catch (e) {
      Alert.alert('AI Error', e.message || 'Could not analyze image');
    } finally {
      setAiLoading(false);
    }
  };

  const analyzeFoodFullPlate = async () => {
    if (!aiImage) return;
    setAiLoading(true);
    try {
      const res = await nutritionAPI.analyzeImage({
        imageBase64: aiImage.base64,
        mimeType: aiImage.mimeType || 'image/jpeg',
        mode: 'scan_all',
      });
      const result = res.data.data || res.data;
      const items = result.items || [];
      setAiItems(items);
      setAiResult(null);
      // pre-check all items
      const checked = {};
      items.forEach((_, i) => { checked[i] = true; });
      setCheckedItems(checked);
    } catch (e) {
      Alert.alert('AI Error', e.message || 'Could not scan plate');
    } finally {
      setAiLoading(false);
    }
  };

  const logAiFood = () => {
    if (!aiResult) return;
    const grams = aiResult.serving_size_g || 100;
    saveFavorite(aiResult);
    setLogFood({
      id: 'ai-custom',
      name: aiResult.name,
      calories: aiResult.calories,
      protein_g: aiResult.protein_g,
      carbs_g: aiResult.carbs_g,
      fat_g: aiResult.fat_g,
      serving_size_g: grams,
    });
    setLogQty(String(grams));
    setShowLogModal(true);
  };

  const logFavoriteQuick = (fav) => {
    saveFavorite(fav);
    setLogFood({ id: 'ai-fav', name: fav.name, calories: fav.calories,
      protein_g: fav.protein_g, carbs_g: fav.carbs_g, fat_g: fav.fat_g,
      serving_size_g: fav.serving_size_g || 100 });
    setLogQty(String(fav.serving_size_g || 100));
    setShowLogModal(true);
  };

  const logCheckedItems = () => {
    const selected = aiItems.filter((_, i) => checkedItems[i]);
    if (!selected.length) return;
    // log first selected — for simplicity, open log modal per item sequentially
    // Here we log first one; user logs all by tapping each
    const first = selected[0];
    saveFavorite(first);
    setLogFood({ id: 'ai-custom', name: first.name, calories: first.calories,
      protein_g: first.protein_g, carbs_g: first.carbs_g, fat_g: first.fat_g,
      serving_size_g: first.serving_size_g || 100 });
    setLogQty(String(first.serving_size_g || 100));
    setShowLogModal(true);
  };

  const logSingleItem = (item) => {
    saveFavorite(item);
    setLogFood({ id: 'ai-custom', name: item.name, calories: item.calories,
      protein_g: item.protein_g, carbs_g: item.carbs_g, fat_g: item.fat_g,
      serving_size_g: item.serving_size_g || 100 });
    setLogQty(String(item.serving_size_g || 100));
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
    { key:'plan',   label:'Smart Plan', ion:'bulb-outline'    },
    { key:'log',    label:'Log Today',  ion:'create-outline'  },
    { key:'ai',     label:'AI Scanner', ion:'camera-outline'  },
    { key:'search', label:'All Foods',  ion:'search-outline'  },
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
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={s.secLabel}>TRACK</Text>
          <Text style={s.title}>Nutrition</Text>
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
          <Ionicons name="trending-up" size={16}
            color={activeGoal==='weight_gain' ? C.accentText : C.muted} />
          <Text style={[s.goalBtnTxt, activeGoal==='weight_gain' && { color:C.accentText }]}>
            Weight Gain
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.goalBtn, activeGoal==='weight_loss' && s.goalBtnLoss]}
          onPress={() => { setActiveGoal('weight_loss'); setSelected([]); }}
        >
          <Ionicons name="trending-down" size={16}
            color={activeGoal==='weight_loss' ? C.accentText : C.muted} />
          <Text style={[s.goalBtnTxt, activeGoal==='weight_loss' && { color:C.accentText }]}>
            Weight Loss
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── TABS ────────────────────────────────────────── */}
      <View style={s.tabs}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} style={[s.tab, activeTab===t.key && s.tabActive]}
            onPress={() => setActiveTab(t.key)}>
            <Ionicons name={t.ion} size={13} color={activeTab===t.key ? C.accent : C.muted} />
            <Text style={[s.tabTxt, activeTab===t.key && s.tabTxtActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{ flex:1 }}
        contentContainerStyle={{ padding:16, paddingBottom:100 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        refreshControl={<RefreshControl refreshing={refresh}
          onRefresh={() => { refetchDaily(); refetchGoals(); }} tintColor={C.accent} />}
      >

        {/* ═══════════════════════════════════════════════
            TAB: SMART PLAN
        ═══════════════════════════════════════════════ */}
        {activeTab === 'plan' && (
          <>
            {/* Body transformation banner */}
            <GoalBanner goal={activeGoal} gender={user?.gender} C={C} />

            {/* Goal summary card */}
            <View style={[s.goalCard, { borderColor: activeGoal==='weight_gain' ? C.accent : C.accent }]}>
              <Text style={s.goalCardTitle}>
                {activeGoal === 'weight_gain'
                  ? 'Muscle & Weight Gain Plan'
                  : 'Fat Loss & Lean Plan'}
              </Text>
              <Text style={s.goalCardSub}>
                {activeGoal === 'weight_gain'
                  ? `Target: +${Math.round(selectedCals||3200)} kcal/day • ~0.5kg gain/week`
                  : `Target: ${Math.round(tar.calories - (selectedCals||1600))} kcal deficit • ~0.5kg loss/week`}
              </Text>
              {userGoals.length > 0 && (
                <View style={[s.goalPill, { flexDirection:'row', alignItems:'center', gap:5 }]}>
                  <Ionicons name="flag" size={11} color={C.accent} />
                  <Text style={s.goalPillTxt}>
                    Matching your goal: {userGoals[0].title}
                  </Text>
                </View>
              )}
            </View>

            {/* Instructions */}
            <View style={s.infoCard}>
              <Text style={s.infoTitle}>
                {activeGoal === 'weight_gain' ? '5 Rules to Gain Weight' : '5 Rules to Lose Fat'}
              </Text>
              {(activeGoal === 'weight_gain' ? [
                { ion:'flame-outline',         txt:'Eat 300–500 kcal above your daily maintenance' },
                { ion:'barbell-outline',       txt:'1.6–2.2g protein per kg of bodyweight daily' },
                { ion:'time-outline',          txt:'Eat every 3 hours — aim for 5–6 meals/day' },
                { ion:'alert-circle-outline',  txt:'Never skip breakfast or your post-workout meal' },
                { ion:'trending-up-outline',   txt:'Focus on compound lifts: squat, deadlift, bench' },
              ] : [
                { ion:'trending-down-outline', txt:'Eat 300–500 kcal below your daily maintenance' },
                { ion:'barbell-outline',       txt:'Keep protein high (1.6g/kg) to preserve muscle' },
                { ion:'leaf-outline',          txt:'More vegetables — filling, low calorie, high fiber' },
                { ion:'water-outline',         txt:'Drink 3L water daily to boost your metabolism' },
                { ion:'walk-outline',          txt:'Cardio 3–4x per week + strength training 3x' },
              ]).map(({ ion, txt }, i) => (
                <View key={i} style={s.infoRow}>
                  <View style={s.infoBullet}>
                    <Ionicons name={ion} size={12} color="#000" />
                  </View>
                  <Text style={s.infoTxt}>{txt}</Text>
                </View>
              ))}
            </View>

            {/* Select foods */}
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>
                {activeGoal==='weight_gain' ? 'Best Foods to Gain Weight' : 'Best Foods to Lose Weight'}
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
                onDetail={(f) => { setDetailFood(f); setShowFoodDetail(true); }}
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
                  { label:'Protein',  val:Math.round(con.protein_g||0),  max:tar.protein_g||150, color:C.accent, unit:'g' },
                  { label:'Carbs',    val:Math.round(con.carbs_g||0),    max:tar.carbs_g||220, color:C.accent, unit:'g' },
                  { label:'Fat',      val:Math.round(con.fat_g||0),      max:tar.fat_g||70, color:C.accent, unit:'g' },
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
                    <MealIcon mealKey={key} size={18} />
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
                    <MealIcon mealKey={key} size={18} />
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

            {/* ── DIET DOCTOR BANNER ── */}
            <TouchableOpacity
              style={aiStyles.doctorBanner}
              onPress={() => navigation.navigate('DietDoctor')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#0D1A14', '#111122']}
                style={aiStyles.doctorBannerGrad}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Text style={{ fontSize: 28 }}>
                  {(user?.gender === 'female') ? '👩‍⚕️' : '👨‍⚕️'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#C8F135', fontWeight: '800', fontSize: 13 }}>
                    AI Diet Doctor
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 1 }}>
                    Personalized diet plan — answers your questions first
                  </Text>
                </View>
                <View style={aiStyles.doctorBannerArrow}>
                  <Ionicons name="chevron-forward" size={16} color="#C8F135" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* ── MODE TOGGLE ── */}
            <View style={aiStyles.modeRow}>
              <TouchableOpacity
                style={[aiStyles.modeBtn, scanMode === 'single' && aiStyles.modeBtnOn]}
                onPress={() => { setScanMode('single'); resetAiGesture(); }}
              >
                <Ionicons name="scan-outline" size={14} color={scanMode === 'single' ? '#0A0A0F' : C.dim} />
                <Text style={[aiStyles.modeTxt, scanMode === 'single' && aiStyles.modeTxtOn]}>Single Item</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[aiStyles.modeBtn, scanMode === 'scan_all' && aiStyles.modeBtnOn]}
                onPress={() => { setScanMode('scan_all'); resetAiGesture(); }}
              >
                <Ionicons name="grid-outline" size={14} color={scanMode === 'scan_all' ? '#0A0A0F' : C.dim} />
                <Text style={[aiStyles.modeTxt, scanMode === 'scan_all' && aiStyles.modeTxtOn]}>Full Plate</Text>
              </TouchableOpacity>
            </View>

            {/* ── MODE HINT ── */}
            <View style={[s.goalCard, { borderColor: C.accent, marginBottom: 10 }]}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:4 }}>
                <Ionicons name={scanMode === 'scan_all' ? 'grid' : 'camera'} size={15} color={C.accent} />
                <Text style={[s.goalCardTitle, { marginBottom:0 }]}>
                  {scanMode === 'scan_all' ? 'Full Plate Scanner' : 'AI Food Scanner'}
                </Text>
              </View>
              <Text style={s.goalCardSub}>
                {scanMode === 'scan_all'
                  ? 'Upload a photo and AI will detect ALL food items on your plate at once — calories, macros for each.'
                  : 'Upload a photo, then draw a circle around one item. AI identifies it with 90%+ accuracy.'}
              </Text>
            </View>

            {/* ── FAVORITES STRIP ── */}
            {favorites.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={[s.secLabel, { marginBottom: 7 }]}>YOUR FAVORITES</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}>
                  {favorites.slice(0, 8).map((fav, i) => (
                    <TouchableOpacity key={i} style={aiStyles.favChip} onPress={() => logFavoriteQuick(fav)}>
                      <Text style={aiStyles.favChipName} numberOfLines={1}>{fav.name}</Text>
                      <Text style={aiStyles.favChipCal}>{fav.calories} kcal</Text>
                      {fav.count > 1 && (
                        <View style={aiStyles.favCount}>
                          <Text style={{ color: '#0A0A0F', fontSize: 8, fontWeight: '800' }}>{fav.count}x</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ── IMAGE AREA ── */}
            {!aiImage ? (
              <TouchableOpacity style={aiStyles.uploadBtn} onPress={pickImage}>
                <Ionicons name="image-outline" size={42} color={C.accent} style={{ marginBottom:10 }} />
                <Text style={aiStyles.uploadBtnTxt}>Tap to Choose Photo</Text>
                <Text style={{ color: C.dim, fontSize: 11, marginTop: 4 }}>
                  {scanMode === 'scan_all' ? 'AI will scan the entire plate' : 'Then circle one food item'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View>
                <View
                  style={aiStyles.imgContainer}
                  onLayout={(e) => {
                    const { width, height } = e.nativeEvent.layout;
                    imgLayout.current = { width, height };
                  }}
                  {...(scanMode === 'single' ? aiPan.panHandlers : {})}
                >
                  <Image source={{ uri: aiImage.uri }} style={aiStyles.previewImg} contentFit="contain" />

                  {scanMode === 'single' && (
                    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
                      {aiPath.length > 1 && (
                        <Polyline
                          points={aiPath.map(p => `${p.x},${p.y}`).join(' ')}
                          fill="none" stroke={C.accent} strokeWidth={3}
                          strokeLinejoin="round" strokeLinecap="round"
                          opacity={aiBox ? 0.3 : 0.95}
                        />
                      )}
                      {aiBox?.px && (
                        <Rect
                          x={aiBox.px.x} y={aiBox.px.y}
                          width={aiBox.px.w} height={aiBox.px.h}
                          rx={14} ry={14}
                          fill="rgba(200,241,53,0.10)"
                          stroke={C.accent} strokeWidth={2.5} strokeDasharray="9 5"
                        />
                      )}
                    </Svg>
                  )}

                  {scanMode === 'single' && aiPath.length === 0 && !aiResult && (
                    <View style={[aiStyles.hintBadge, { flexDirection:'row', alignItems:'center', gap:5 }]}>
                      <Ionicons name="finger-print-outline" size={13} color={C.accent} />
                      <Text style={aiStyles.hintTxt}>Circle a food item</Text>
                    </View>
                  )}
                  {scanMode === 'scan_all' && !aiLoading && aiItems.length === 0 && (
                    <View style={[aiStyles.hintBadge, { flexDirection:'row', alignItems:'center', gap:5 }]}>
                      <Ionicons name="grid-outline" size={13} color={C.accent} />
                      <Text style={aiStyles.hintTxt}>Tap Scan Full Plate</Text>
                    </View>
                  )}
                  {aiBox && scanMode === 'single' && (
                    <View style={[aiStyles.selBadge, { flexDirection:'row', alignItems:'center', gap:5 }]}>
                      <Ionicons name="checkmark-circle" size={13} color="#0A0A0F" />
                      <Text style={aiStyles.selTxt}>Item selected</Text>
                    </View>
                  )}
                </View>

                {/* controls */}
                <View style={aiStyles.controls}>
                  <TouchableOpacity style={aiStyles.retakeBtn} onPress={pickImage}>
                    <Text style={aiStyles.retakeBtnTxt}>Retake</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[aiStyles.analyzeBtn, aiLoading && aiStyles.analyzeBtnDisabled]}
                    onPress={scanMode === 'scan_all' ? analyzeFoodFullPlate : analyzeFood}
                    disabled={aiLoading}
                  >
                    {aiLoading
                      ? <ActivityIndicator color="#0A0A0F" />
                      : (
                        <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                          <Ionicons name="sparkles" size={15} color="#0A0A0F" />
                          <Text style={aiStyles.analyzeBtnTxt}>
                            {scanMode === 'scan_all' ? 'Scan Full Plate' : aiBox ? 'Analyze Selected' : 'Analyze Item'}
                          </Text>
                        </View>
                      )}
                  </TouchableOpacity>
                </View>

                {aiBox && !aiResult && scanMode === 'single' && (
                  <TouchableOpacity onPress={resetAiGesture} style={aiStyles.clearBtn}>
                    <Text style={aiStyles.clearTxt}>Clear selection & circle again</Text>
                  </TouchableOpacity>
                )}

                {/* ── SINGLE RESULT ── */}
                {aiResult && scanMode === 'single' && (
                  <View style={aiStyles.resultCard}>
                    <View style={aiStyles.resHead}>
                      <Text style={aiStyles.resName} numberOfLines={2}>{aiResult.name}</Text>
                      {!!aiResult.confidence && (
                        <View style={aiStyles.confPill}>
                          <Text style={aiStyles.confTxt}>{aiResult.confidence}% sure</Text>
                        </View>
                      )}
                    </View>
                    {!!aiResult.quantity && (
                      <Text style={aiStyles.resQty}>Portion: {aiResult.quantity}</Text>
                    )}
                    <View style={aiStyles.resMacroRow}>
                      {[['kcal', aiResult.calories, C.accent], ['protein', `${aiResult.protein_g}g`, '#4ECDC4'],
                        ['carbs', `${aiResult.carbs_g}g`, '#F59E0B'], ['fat', `${aiResult.fat_g}g`, '#FF6B6B']].map(([lbl, val, col]) => (
                        <View key={lbl} style={aiStyles.resMacroBox}>
                          <Text style={[aiStyles.resMacroVal, { color: col }]}>{val}</Text>
                          <Text style={aiStyles.resMacroLbl}>{lbl}</Text>
                        </View>
                      ))}
                    </View>
                    {!!aiResult.note && <Text style={aiStyles.resNote}>{aiResult.note}</Text>}
                    <TouchableOpacity style={aiStyles.logResBtn} onPress={logAiFood}>
                      <Ionicons name="add-circle" size={16} color="#0A0A0F" />
                      <Text style={aiStyles.logResBtnTxt}>Log this Food</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* ── MULTI-ITEM RESULTS ── */}
                {aiItems.length > 0 && scanMode === 'scan_all' && (
                  <View style={aiStyles.resultCard}>
                    {/* header */}
                    <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom: 12 }}>
                      <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                        <Ionicons name="grid" size={16} color={C.accent} />
                        <Text style={{ color: C.text, fontWeight:'800', fontSize: 15 }}>
                          {aiItems.length} Items Detected
                        </Text>
                      </View>
                      <View style={aiStyles.confPill}>
                        <Text style={aiStyles.confTxt}>
                          {aiItems.filter((_, i) => checkedItems[i]).reduce((s, it) => s + it.calories, 0)} kcal selected
                        </Text>
                      </View>
                    </View>

                    {/* items list */}
                    {aiItems.map((item, i) => (
                      <View key={i} style={aiStyles.multiItem}>
                        <TouchableOpacity
                          style={[aiStyles.checkbox, checkedItems[i] && aiStyles.checkboxOn]}
                          onPress={() => setCheckedItems(p => ({ ...p, [i]: !p[i] }))}
                        >
                          {checkedItems[i] && <Ionicons name="checkmark" size={12} color="#0A0A0F" />}
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: C.text, fontWeight:'700', fontSize: 13 }}>{item.name}</Text>
                          <Text style={{ color: C.dim, fontSize: 11, marginTop: 2 }}>{item.quantity}</Text>
                          <View style={{ flexDirection:'row', gap: 10, marginTop: 4 }}>
                            <Text style={{ color: C.accent, fontSize: 11, fontWeight:'800' }}>{item.calories} kcal</Text>
                            <Text style={{ color: '#4ECDC4', fontSize: 11 }}>P {item.protein_g}g</Text>
                            <Text style={{ color: '#F59E0B', fontSize: 11 }}>C {item.carbs_g}g</Text>
                            <Text style={{ color: '#FF6B6B', fontSize: 11 }}>F {item.fat_g}g</Text>
                          </View>
                        </View>
                        <TouchableOpacity onPress={() => logSingleItem(item)} style={aiStyles.itemLogBtn}>
                          <Ionicons name="add" size={16} color={C.accent} />
                        </TouchableOpacity>
                      </View>
                    ))}

                    {/* total row */}
                    <View style={aiStyles.multiTotal}>
                      <Text style={{ color: C.dim, fontSize: 12 }}>
                        {aiItems.filter((_, i) => checkedItems[i]).length} of {aiItems.length} selected
                      </Text>
                      <Text style={{ color: C.accent, fontWeight:'800', fontSize: 14 }}>
                        Total: {aiItems.filter((_, i) => checkedItems[i]).reduce((s, it) => s + it.calories, 0)} kcal
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[aiStyles.logResBtn, { opacity: Object.values(checkedItems).some(Boolean) ? 1 : 0.4 }]}
                      onPress={logCheckedItems}
                      disabled={!Object.values(checkedItems).some(Boolean)}
                    >
                      <Ionicons name="add-circle" size={16} color="#0A0A0F" />
                      <Text style={aiStyles.logResBtnTxt}>
                        Log First Selected Item
                      </Text>
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
                  style={[s.pill, catFilter===c && s.pillOn, { flexDirection:'row', alignItems:'center', gap:4 }]}
                  onPress={() => setCatFilter(c)}>
                  {c !== 'All' && (
                    <FoodCatIcon category={c} size={11} color={catFilter===c ? C.accentText : C.muted} />
                  )}
                  <Text style={[s.pillTxt, catFilter===c && s.pillTxtOn, { textTransform:'capitalize' }]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {filteredFoods.map(food => (
              <FoodCard key={food.id} food={food}
                selected={!!selected.find(f=>f.id===food.id)}
                onToggle={toggleFood}
                onDetail={(f) => { setDetailFood(f); setShowFoodDetail(true); }}
                goal={activeGoal} />
            ))}
          </>
        )}

      </ScrollView>

      {/* ── FLOATING PLAN SUMMARY ──────────────────────── */}
      {selected.length > 0 && (
        <TouchableOpacity style={s.floatBtn} onPress={() => setShowSummary(true)}>
          <Ionicons name="clipboard-outline" size={22} color={C.accent} />
          <View style={{ flex:1 }}>
            <Text style={s.floatBtnTitle}>{selected.length} foods selected</Text>
            <Text style={s.floatBtnSub}>{selectedCals} kcal • {Math.round(selectedProtein)}g protein</Text>
          </View>
          <Text style={s.floatBtnArrow}>View Plan ›</Text>
        </TouchableOpacity>
      )}

      {/* ── FOOD DETAIL MODAL ───────────────────────── */}
      <FoodDetailModal
        food={detailFood}
        goal={activeGoal}
        visible={showFoodDetail}
        onClose={() => setShowFoodDetail(false)}
        onLogPress={(f) => {
          setLogFood(f);
          setLogQty(String(f.serving_size_g));
          setShowLogModal(true);
        }}
      />

      {/* ── LOG MEAL MODAL ────────────────────────────── */}
      <Modal visible={showLogModal} animationType="slide" transparent>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Log a Meal</Text>

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
                {logFood?.id===f.id && <Ionicons name="checkmark-circle" size={20} color={C.accent} />}
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
                          style={[s.mealPill, logMealType===k && { backgroundColor:C.accentDim, borderColor:C.accent }]}
                          onPress={() => setLogMealType(k)}>
                          <MealIcon mealKey={k} size={11} />
                          <Text style={[s.mealPillTxt, logMealType===k && { color:C.accent }]}>{v.label}</Text>
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
                {activeGoal==='weight_gain' ? 'Your Gain Plan' : 'Your Loss Plan'}
              </Text>

              {/* Calorie summary */}
              <View style={s.summaryBox}>
                <View style={s.summaryRow}>
                  <Text style={s.summaryKey}>Total Daily Calories</Text>
                  <Text style={[s.summaryVal, { color:C.accent }]}>{selectedCals} kcal</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryKey}>Daily Protein</Text>
                  <Text style={[s.summaryVal, { color:C.accent }]}>{Math.round(selectedProtein)}g</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryKey}>Weekly weight change</Text>
                  <Text style={[s.summaryVal, { color:C.accent }]}>
                    {activeGoal==='weight_gain' ? '+' : '-'}~0.5 kg/week
                  </Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryKey}>Monthly projection</Text>
                  <Text style={[s.summaryVal, { color:C.accent }]}>
                    {activeGoal==='weight_gain' ? '+' : '-'}~2 kg/month
                  </Text>
                </View>
              </View>

              {/* Meal-by-meal plan */}
              <Text style={[s.sectionTitle, { marginBottom:12 }]}>Daily Meal Schedule</Text>
              {Object.entries(MEAL_TIMES).map(([key]) => (
                <MealPlanRow key={key} mealKey={key} foods={mealPlan[key]||[]} />
              ))}

              {/* Selected foods */}
              <Text style={[s.sectionTitle, { marginBottom:12, marginTop:8 }]}>Shopping List</Text>
              {selected.map(f => (
                <View key={f.id} style={s.shopItem}>
                  <FoodCatIcon category={f.category} size={15} color={C.muted} />
                  <Text style={s.shopName}>{f.name}</Text>
                  <Text style={s.shopCal}>{f.calories} kcal/{f.serving_size_g}g</Text>
                </View>
              ))}

              <TouchableOpacity style={s.confirmBtn} onPress={() => setShowSummary(false)}>
                <Text style={s.confirmTxt}>Got It — Start Plan</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const makeAiStyles = (C) => StyleSheet.create({
  uploadBtn: { height: 200, backgroundColor: `${C.accent}0D`, borderRadius: 16, borderWidth: 2, borderColor: `${C.accent}33`, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginVertical: 20 },
  uploadBtnTxt: { color: C.accent, fontSize: 16, fontWeight: '700' },
  imgContainer: { width: '100%', height: 300, borderRadius: 16, overflow: 'hidden', backgroundColor: '#000', marginVertical: 20, position: 'relative' },
  previewImg: { width: '100%', height: '100%' },
  hintBadge: { position: 'absolute', alignSelf: 'center', top: 14, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(200,241,53,0.4)' },
  hintTxt: { color: C.accent, fontSize: 12, fontWeight: '700' },
  selBadge: { position: 'absolute', alignSelf: 'center', bottom: 14, backgroundColor: C.accent, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  selTxt: { color: C.accentText, fontSize: 12, fontWeight: '800' },
  controls: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  retakeBtn: { flex: 1, backgroundColor: C.card, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  retakeBtnTxt: { color: C.text, fontWeight: '700' },
  analyzeBtn: { flex: 2, backgroundColor: C.accent, padding: 14, borderRadius: 12, alignItems: 'center' },
  analyzeBtnDisabled: { opacity: 0.5 },
  analyzeBtnTxt: { color: C.accentText, fontWeight: '800', fontSize: 15 },
  clearBtn: { alignItems: 'center', paddingVertical: 8, marginBottom: 12 },
  clearTxt: { color: C.muted, fontSize: 12, fontWeight: '600' },
  resultCard: { backgroundColor: `${C.accent}14`, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: `${C.accent}4D`, marginBottom: 20 },
  resHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  resName: { color: C.text, fontSize: 18, fontWeight: '800', flex: 1 },
  confPill: { backgroundColor: `${C.accent}2E`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: `${C.accent}59` },
  confTxt: { color: C.accent, fontSize: 10, fontWeight: '800' },
  resQty: { color: C.text, fontSize: 13, fontWeight: '600', marginBottom: 12 },
  resMacroRow: { flexDirection: 'row', gap: 8 },
  resMacroBox: { flex: 1, backgroundColor: C.card2, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  resMacroVal: { fontSize: 16, fontWeight: '900' },
  resMacroLbl: { color: C.muted, fontSize: 9, fontWeight: '600', marginTop: 2 },
  resNote: { color: C.muted, fontSize: 12, lineHeight: 16, marginTop: 12, fontStyle: 'italic' },
  logResBtn: { backgroundColor: C.accent, padding: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 },
  logResBtnTxt: { color: C.accentText, fontWeight: '800' },
  // Mode toggle
  modeRow: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 12, padding: 4, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 9, paddingVertical: 9 },
  modeBtnOn: { backgroundColor: C.accent },
  modeTxt: { color: C.dim, fontSize: 12, fontWeight: '700' },
  modeTxtOn: { color: '#0A0A0F' },
  // Favorites
  favChip: { backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: C.border, minWidth: 90, position: 'relative' },
  favChipName: { color: C.text, fontSize: 12, fontWeight: '700', marginBottom: 2, maxWidth: 100 },
  favChipCal: { color: C.accent, fontSize: 10, fontWeight: '700' },
  favCount: { position: 'absolute', top: -4, right: -4, backgroundColor: C.accent, borderRadius: 8, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  // Multi-item
  multiItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: `${C.accent}1A` },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: C.accent },
  itemLogBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  multiTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, marginTop: 4 },
  // Diet Doctor banner
  doctorBanner: { borderRadius: 16, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(200,241,53,0.2)' },
  doctorBannerGrad: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  doctorBannerArrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(200,241,53,0.15)', alignItems: 'center', justifyContent: 'center' },
});

const makeS = (C) => StyleSheet.create({
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
  goalBtnLoss:    { backgroundColor:C.accentDim, borderColor:C.accent },
  goalBtnIcon:    { fontSize:16 },
  goalBtnTxt:     { color:C.muted, fontSize:13, fontWeight:'800' },
  // Tabs
  tabs:           { flexDirection:'row', paddingHorizontal:16, gap:6, marginBottom:8 },
  tab:            { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center',
                    gap:4, borderRadius:10, borderWidth:1, borderColor:C.border,
                    paddingVertical:8, backgroundColor:C.card },
  tabActive:      { backgroundColor:C.accentDim, borderColor:C.accent },
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
  infoTitle:      { color:C.text, fontSize:15, fontWeight:'900', marginBottom:14 },
  infoRow:        { flexDirection:'row', alignItems:'flex-start', gap:12, marginBottom:10 },
  infoBullet:     { width:24, height:24, borderRadius:12, backgroundColor:C.accent,
                    alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 },
  infoTxt:        { color:C.text, fontSize:13, flex:1, lineHeight:20 },
  // Section
  sectionHeader:  { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:6 },
  sectionTitle:   { color:C.text, fontSize:14, fontWeight:'700' },
  selectHint:     { color:C.dim, fontSize:11, marginBottom:12 },
  // Today log tab
  todayCard:      { backgroundColor:C.card, borderRadius:18, borderWidth:1, borderColor:C.border,
                    padding:16, marginBottom:16 },
  cardTitle:      { color:C.text, fontSize:14, fontWeight:'700', marginBottom:12 },
  todayMacros:    { flexDirection:'row', gap:8 },
  macroBox:       { flex:1, alignItems:'center', backgroundColor:C.bg, borderRadius:14,
                    paddingVertical:12, paddingHorizontal:4, borderWidth:1, borderColor:C.border },
  macroVal:       { fontSize:20, fontWeight:'900' },
  macroUnit:      { color:C.muted, fontSize:9, marginTop:1 },
  macroBarBg:     { width:'80%', height:5, backgroundColor:C.border, borderRadius:3, marginVertical:6, overflow:'hidden' },
  macroBarFill:   { height:'100%', borderRadius:3 },
  macroLabel:     { color:C.muted, fontSize:10, textAlign:'center', fontWeight:'700' },
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
  pillTxtOn:      { color:C.accentText },
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
