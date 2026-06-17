import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import Svg, {
  Polyline, Rect, Path,
  Circle as SvgCircle,
  Line as SvgLine,
  Text as SvgText,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { progressAPI, goalsAPI } from '../api/services';
import { useAuthStore } from '../store/authStore';
import { useC } from '../utils/theme';
import { rf, rs } from '../utils/responsive';

const { width: SW } = Dimensions.get('window');

const MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_ABBR = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const fmtDate  = (iso) => { if (!iso) return ''; const d = new Date(iso); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
const fmtDay   = (iso) => { if (!iso) return ''; const d = new Date(iso); return DAY_ABBR[d.getDay()].slice(0,2).toUpperCase(); };

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

const HABIT_DEFS = [
  { key:'workout',  label:'Workout',  icon:'barbell-outline',    pts:20 },
  { key:'sleep',    label:'7h Sleep', icon:'moon-outline',        pts:20 },
  { key:'protein',  label:'Protein',  icon:'nutrition-outline',   pts:20 },
  { key:'calories', label:'Calories', icon:'flame-outline',       pts:20 },
  { key:'meals',    label:'Meals',    icon:'restaurant-outline',  pts:20 },
];

// ── Metric definitions for the trend graph ────────────────────────
const METRICS = {
  weight_kg:      { key:'weight_kg',      label:'Weight',   unit:'kg', color:'#C8F135', dec:1 },
  body_fat_pct:   { key:'body_fat_pct',   label:'Body Fat', unit:'%',  color:'#FF9F0A', dec:1 },
  muscle_mass_kg: { key:'muscle_mass_kg', label:'Muscle',   unit:'kg', color:'#4D8DFF', dec:1 },
};
const RANGES = [
  { key:'1W', label:'1W', days:7   },
  { key:'1M', label:'1M', days:31  },
  { key:'3M', label:'3M', days:93  },
  { key:'all',label:'All',days:null},
];

// ── Generic Metric Line Graph ─────────────────────────────────────
function MetricGraph({ data, metricKey, rangeDays, C }) {
  const GW = SW - 64, GH = 120;
  const PL = 36, PR = 8, PT = 10, PB = 22;
  const m  = METRICS[metricKey] || METRICS.weight_kg;
  const lineColor = m.color;

  const pts = useMemo(() => {
    const cutoff = rangeDays ? Date.now() - rangeDays * 86400000 : 0;
    return [...(data || [])]
      .filter(d => d[metricKey] != null && new Date(d.measured_at).getTime() >= cutoff)
      .sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at));
  }, [data, metricKey, rangeDays]);

  if (pts.length < 2) return (
    <View style={{ height: GH, alignItems:'center', justifyContent:'center' }}>
      <Ionicons name="analytics-outline" size={28} color={C.border} />
      <Text style={{ color:C.muted, fontSize:11, marginTop:6, textAlign:'center' }}>
        Log 2+ {m.label.toLowerCase()} entries in this range to see your graph
      </Text>
    </View>
  );

  const vals = pts.map(d => d[metricKey]);
  const minV = Math.min(...vals) - 0.5;
  const maxV = Math.max(...vals) + 0.5;
  const rng  = maxV - minV || 1;
  const cW   = GW - PL - PR;
  const cH   = GH - PT - PB;
  const px   = (i) => PL + (i / Math.max(pts.length - 1, 1)) * cW;
  const py   = (w) => PT + cH - ((w - minV) / rng) * cH;

  const linePts = pts.map((d, i) => `${px(i).toFixed(1)},${py(d[metricKey]).toFixed(1)}`).join(' ');
  const fillD   = `M${px(0).toFixed(1)},${(PT + cH).toFixed(1)} ` +
                  pts.map((d, i) => `L${px(i).toFixed(1)},${py(d[metricKey]).toFixed(1)}`).join(' ') +
                  ` L${px(pts.length - 1).toFixed(1)},${(PT + cH).toFixed(1)} Z`;
  const yMarks = [minV + 0.5, (minV + maxV) / 2, maxV - 0.5];

  return (
    <Svg width={GW} height={GH}>
      {yMarks.map((w, i) => (
        <SvgLine key={i} x1={PL} y1={py(w)} x2={GW - PR} y2={py(w)}
          stroke={C.border} strokeWidth={1} strokeDasharray="4 4" />
      ))}
      {yMarks.map((w, i) => (
        <SvgText key={`y${i}`} x={PL - 4} y={py(w) + 3} textAnchor="end"
          fill={C.muted} fontSize={8} fontWeight="600">{w.toFixed(0)}</SvgText>
      ))}
      <Path d={fillD} fill={`${lineColor}18`} />
      <Polyline points={linePts} fill="none" stroke={lineColor} strokeWidth={2.5}
        strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((d, i) => (
        <SvgCircle key={i} cx={px(i)} cy={py(d[metricKey])}
          r={i === pts.length - 1 ? 5 : 3}
          fill={i === pts.length - 1 ? lineColor : C.bg}
          stroke={lineColor} strokeWidth={2} />
      ))}
      <SvgText x={px(0)} y={GH - 2} textAnchor="middle" fill={C.dim} fontSize={8}>
        {fmtDate(pts[0].measured_at)}
      </SvgText>
      <SvgText x={px(pts.length - 1)} y={GH - 2} textAnchor="middle"
        fill={lineColor} fontSize={8} fontWeight="700">
        {fmtDate(pts[pts.length - 1].measured_at)}
      </SvgText>
    </Svg>
  );
}

// ── Goal Progress Card ────────────────────────────────────────────
function GoalProgressCard({ goal, meas, goalType, C, s, onSetGoal }) {
  // Build progress from a weight-type goal + measurement history
  const weighed = useMemo(() =>
    [...(meas || [])].filter(d => d.weight_kg).sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at))
  , [meas]);

  if (!goal?.target_value || weighed.length === 0) {
    return (
      <TouchableOpacity style={[s.card, { alignItems:'center', paddingVertical:22 }]} onPress={onSetGoal}>
        <Ionicons name="flag-outline" size={30} color={C.accent} />
        <Text style={{ color:C.text, fontSize:14, fontWeight:'800', marginTop:8 }}>Set a Weight Goal</Text>
        <Text style={{ color:C.muted, fontSize:11, marginTop:4, textAlign:'center' }}>
          Add a target weight to track your progress with a live progress bar & ETA
        </Text>
        <View style={{ flexDirection:'row', alignItems:'center', gap:4, marginTop:10 }}>
          <Text style={{ color:C.accent, fontSize:12, fontWeight:'800' }}>Go to Goals</Text>
          <Ionicons name="arrow-forward" size={13} color={C.accent} />
        </View>
      </TouchableOpacity>
    );
  }

  const isLoss   = goalType === 'weight_loss';
  const start    = weighed[0].weight_kg;
  const current  = weighed[weighed.length - 1].weight_kg;
  const target   = goal.target_value;
  const totalSpan = Math.abs(target - start) || 1;
  const doneSpan  = isLoss ? (start - current) : (current - start);
  const pct       = Math.max(0, Math.min(100, (doneSpan / totalSpan) * 100));
  const remaining = +Math.abs(target - current).toFixed(1);
  const reached   = isLoss ? current <= target : current >= target;

  // ETA — based on rate over the last ~30 days of weigh-ins
  let eta = null;
  if (!reached && weighed.length >= 2) {
    const last  = weighed[weighed.length - 1];
    const first = weighed.find(d => new Date(last.measured_at) - new Date(d.measured_at) <= 31 * 86400000) || weighed[0];
    const days  = Math.max(1, (new Date(last.measured_at) - new Date(first.measured_at)) / 86400000);
    const ratePerWeek = ((last.weight_kg - first.weight_kg) / days) * 7;
    const helpful = isLoss ? ratePerWeek < -0.05 : ratePerWeek > 0.05;
    if (helpful) {
      const weeksLeft = Math.ceil(remaining / Math.abs(ratePerWeek));
      eta = { weeks: weeksLeft, rate: Math.abs(ratePerWeek).toFixed(2) };
    }
  }

  const barColor = reached ? C.accent : isLoss ? C.orange : C.teal;

  return (
    <View style={[s.card, { borderColor: reached ? C.accent : C.border, borderWidth: reached ? 1.5 : 1 }]}>
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <View style={{ flexDirection:'row', alignItems:'center', gap:7 }}>
          <Ionicons name="flag" size={15} color={barColor} />
          <Text style={s.cardTitle}>{isLoss ? 'Weight Loss Goal' : 'Weight Gain Goal'}</Text>
        </View>
        {reached
          ? <View style={{ flexDirection:'row', alignItems:'center', gap:4, backgroundColor:`${C.accent}22`, borderRadius:8, paddingHorizontal:8, paddingVertical:3 }}>
              <Text style={{ color:C.accent, fontSize:10, fontWeight:'900' }}>🎉 REACHED</Text>
            </View>
          : <Text style={{ color:barColor, fontSize:13, fontWeight:'900' }}>{pct.toFixed(0)}%</Text>
        }
      </View>

      {/* Start → Current → Target */}
      <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:8 }}>
        {[
          { lbl:'START',   val:start,   c:C.muted },
          { lbl:'CURRENT', val:current, c:C.text  },
          { lbl:'TARGET',  val:target,  c:barColor },
        ].map(item => (
          <View key={item.lbl} style={{ alignItems: item.lbl==='START'?'flex-start':item.lbl==='TARGET'?'flex-end':'center' }}>
            <Text style={{ color:C.muted, fontSize:9, fontWeight:'800', letterSpacing:0.5 }}>{item.lbl}</Text>
            <Text style={{ color:item.c, fontSize:16, fontWeight:'900' }}>{item.val}<Text style={{ fontSize:10 }}> kg</Text></Text>
          </View>
        ))}
      </View>

      {/* Progress bar */}
      <View style={{ height:10, borderRadius:5, backgroundColor:C.border, overflow:'hidden' }}>
        <View style={{ height:'100%', borderRadius:5, width:`${pct}%`, backgroundColor:barColor }} />
      </View>

      {/* Footer: remaining + ETA */}
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:10 }}>
        <Text style={{ color:C.text, fontSize:12, fontWeight:'700' }}>
          {reached ? 'Goal achieved — great work!' : `${remaining} kg to go`}
        </Text>
        {eta && (
          <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
            <Ionicons name="time-outline" size={12} color={C.muted} />
            <Text style={{ color:C.muted, fontSize:11, fontWeight:'700' }}>
              ~{eta.weeks}w left · {eta.rate} kg/wk
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Smart Insights ────────────────────────────────────────────────
function buildInsights({ meas, prs, habits, goalType, C }) {
  const out = [];
  const weighed = [...(meas || [])].filter(d => d.weight_kg)
    .sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at));

  // 1. Total change since start
  if (weighed.length >= 2) {
    const start = weighed[0];
    const last  = weighed[weighed.length - 1];
    const diff  = +(last.weight_kg - start.weight_kg).toFixed(1);
    const weeks = Math.max(1, Math.round((new Date(last.measured_at) - new Date(start.measured_at)) / (7 * 86400000)));
    const good  = goalType === 'weight_loss' ? diff < 0 : diff > 0;
    if (diff !== 0) out.push({
      icon: diff < 0 ? 'trending-down' : 'trending-up',
      color: good ? C.accent : '#FF453A',
      title: `${diff > 0 ? '+' : ''}${diff} kg in ${weeks} week${weeks > 1 ? 's' : ''}`,
      body: good ? 'You are moving toward your goal — keep it up!' : 'Trending away from your goal. Review your plan.',
    });

    // 2. Average rate
    const days = Math.max(1, (new Date(last.measured_at) - new Date(start.measured_at)) / 86400000);
    const ratePerWeek = +(((last.weight_kg - start.weight_kg) / days) * 7).toFixed(2);
    if (Math.abs(ratePerWeek) >= 0.05) out.push({
      icon: 'speedometer-outline', color: C.blue,
      title: `Averaging ${ratePerWeek > 0 ? '+' : ''}${ratePerWeek} kg/week`,
      body: 'A steady 0.25–0.5 kg/week is the sustainable sweet spot.',
    });

    // 3. Plateau detection — last 3 within 0.3kg
    const last3 = weighed.slice(-3).map(d => d.weight_kg);
    if (last3.length === 3 && (Math.max(...last3) - Math.min(...last3)) <= 0.3) out.push({
      icon: 'warning-outline', color: '#FF9F0A',
      title: 'Possible plateau',
      body: 'Weight has barely moved in your last 3 entries. Consider adjusting calories or training intensity.',
    });
  }

  // 4. Body fat trend
  const bf = [...(meas || [])].filter(d => d.body_fat_pct)
    .sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at));
  if (bf.length >= 2) {
    const d = +(bf[bf.length - 1].body_fat_pct - bf[0].body_fat_pct).toFixed(1);
    if (Math.abs(d) >= 0.5) out.push({
      icon: 'flame-outline', color: d < 0 ? C.accent : '#FF9F0A',
      title: `Body fat ${d > 0 ? '+' : ''}${d}%`,
      body: d < 0 ? 'Body fat is dropping — your composition is improving.' : 'Body fat is up. Check nutrition consistency.',
    });
  }

  // 5. PRs this week
  const newPRs = (prs || []).filter(p => p.is_new_pr).length;
  if (newPRs > 0) out.push({
    icon: 'trophy-outline', color: C.accent,
    title: `${newPRs} new PR${newPRs > 1 ? 's' : ''} this week`,
    body: 'Your strength is climbing. Progressive overload is working.',
  });

  // 6. Streak insight
  if ((habits?.streak ?? 0) >= 3) out.push({
    icon: 'flame', color: '#FF9F0A',
    title: `${habits.streak}-day streak 🔥`,
    body: `Best ever is ${habits.longest || habits.streak} days. Don't break the chain!`,
  });

  // 7. Consistency / logging nudge
  if (weighed.length >= 1) {
    const daysSince = Math.floor((Date.now() - new Date(weighed[weighed.length - 1].measured_at)) / 86400000);
    if (daysSince >= 4) out.push({
      icon: 'calendar-outline', color: C.muted,
      title: `Last logged ${daysSince} days ago`,
      body: 'Weigh in weekly (same time of day) for the most accurate trend.',
    });
  }

  return out;
}

// ── PR Spark Bar (mini bar chart) ─────────────────────────────────
function PRSparkBar({ spark, C }) {
  if (!spark || spark.length < 1) return null;
  const W = 76, H = 28, n = spark.length;
  const max = Math.max(...spark, 1);
  const bW  = Math.floor((W - (n - 1) * 2) / n);
  return (
    <Svg width={W} height={H}>
      {spark.map((v, i) => {
        const bH = Math.max(3, (v / max) * (H - 2));
        return (
          <Rect key={i} x={i * (bW + 2)} y={H - bH} width={bW} height={bH} rx={2}
            fill={i === n - 1 ? C.accent : `${C.accent}55`} />
        );
      })}
    </Svg>
  );
}

// ── Score Arc ─────────────────────────────────────────────────────
function ScoreArc({ score, C }) {
  const SIZE = 130, R = 50, STROKE = 10;
  const CX   = SIZE / 2, CY = SIZE / 2;
  const circ = 2 * Math.PI * R;
  const fill = (Math.min(Math.max(score, 0), 100) / 100) * circ;
  const color = score >= 80 ? C.accent : score >= 60 ? '#FF9F0A' : score >= 40 ? C.blue : C.muted;
  const grade = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Average' : 'Keep going';

  return (
    <View style={{ alignItems:'center' }}>
      <Svg width={SIZE} height={SIZE}>
        <SvgCircle cx={CX} cy={CY} r={R} fill="none" stroke={C.border} strokeWidth={STROKE} />
        <SvgCircle cx={CX} cy={CY} r={R} fill="none" stroke={color} strokeWidth={STROKE}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${CX} ${CY})`} />
        <SvgText x={CX} y={CY - 6} textAnchor="middle" fill={color} fontSize={30} fontWeight="900">
          {score}
        </SvgText>
        <SvgText x={CX} y={CY + 14} textAnchor="middle" fill={C.muted} fontSize={10} fontWeight="700">
          OUT OF 100
        </SvgText>
      </Svg>
      <Text style={{ color, fontSize:13, fontWeight:'800', marginTop:-12 }}>{grade}</Text>
    </View>
  );
}

// ── 7-Day Habit Matrix ────────────────────────────────────────────
function HabitGrid({ week, C }) {
  const CELL = 26, GAP = 3, LABEL_W = 72;
  return (
    <View>
      <View style={{ flexDirection:'row', marginLeft: LABEL_W }}>
        {(week || []).map((d, i) => (
          <View key={i} style={{ width:CELL, alignItems:'center', marginRight:GAP }}>
            <Text style={{ color: d.is_future ? C.border : C.muted, fontSize:9, fontWeight:'800' }}>
              {fmtDay(d.date)}
            </Text>
          </View>
        ))}
      </View>
      {HABIT_DEFS.map(h => (
        <View key={h.key} style={{ flexDirection:'row', alignItems:'center', marginTop: GAP + 2 }}>
          <View style={{ width:LABEL_W, flexDirection:'row', alignItems:'center', gap:4 }}>
            <Ionicons name={h.icon} size={11} color={C.muted} />
            <Text style={{ color:C.muted, fontSize:9, fontWeight:'700' }} numberOfLines={1}>
              {h.label.toUpperCase()}
            </Text>
          </View>
          {(week || []).map((d, i) => {
            const done   = d.habits?.[h.key];
            const future = d.is_future;
            return (
              <View key={i} style={{
                width:CELL, height:CELL, borderRadius:7, marginRight:GAP,
                backgroundColor: future ? 'transparent' : done ? C.accent : `${C.muted}22`,
                borderWidth: future ? 1 : 0, borderColor: C.border,
                alignItems:'center', justifyContent:'center',
              }}>
                {!future && (
                  <Ionicons name={done ? 'checkmark' : 'close'} size={12}
                    color={done ? '#0A0A0F' : C.dim} />
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────────
export default function FitnessTrackerScreen({ navigation }) {
  const C      = useC();
  const s      = useMemo(() => makeStyles(C), [C]);
  const insets = useSafeAreaInsets();
  const user   = useAuthStore(st => st.user);
  const queryClient = useQueryClient();

  const [tab, setTab]     = useState('body');
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);          // null = creating, id = editing
  const [metric, setMetric] = useState('weight_kg');   // trend graph metric
  const [range, setRange]   = useState('all');         // trend graph time range
  const [form, setForm]   = useState({
    weight_kg:'', body_fat_pct:'', muscle_mass_kg:'',
    chest_cm:'', waist_cm:'', hips_cm:'', notes:'',
  });
  const emptyForm = { weight_kg:'', body_fat_pct:'', muscle_mass_kg:'', chest_cm:'', waist_cm:'', hips_cm:'', notes:'' };

  const { data: meas = [], isLoading: measL, isRefetching: measR, refetch: rMeas } = useQuery({
    queryKey: ['measurements'],
    queryFn:  () => progressAPI.getMeasurements().then(r => r.data.data || []),
  });
  const { data: prs = [], isLoading: prsL, isRefetching: prsR, refetch: rPRs } = useQuery({
    queryKey: ['prs'],
    queryFn:  () => progressAPI.getPRs().then(r => r.data.data || []),
  });
  const { data: habits, isLoading: habL, isRefetching: habR, refetch: rHab } = useQuery({
    queryKey: ['habits'],
    queryFn:  () => progressAPI.getHabits().then(r => r.data.data),
  });
  const { data: goals = [] } = useQuery({
    queryKey: ['goals', 'active'],
    queryFn:  () => goalsAPI.getAll('active').then(r => r.data.data || []),
  });

  const { mutateAsync: saveMeas } = useMutation({
    mutationFn: (p) => progressAPI.addMeasurement(p),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['measurements'] }),
  });
  const { mutateAsync: editMeas } = useMutation({
    mutationFn: ({ id, payload }) => progressAPI.updateMeasurement(id, payload),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['measurements'] }),
  });
  const { mutateAsync: delMeas } = useMutation({
    mutationFn: (id) => progressAPI.deleteMeasurement(id),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['measurements'] }),
  });

  const loading  = (tab === 'body' && measL) || (tab === 'strength' && prsL) || (tab === 'habits' && habL);
  const refresh  = measR || prsR || habR;
  const onRefresh = () => { rMeas(); rPRs(); rHab(); };

  const latest    = meas[0] || null;
  const prev      = meas[1] || null;
  const wDiff     = (latest?.weight_kg && prev?.weight_kg) ? +(latest.weight_kg - prev.weight_kg).toFixed(1) : null;
  const weightGoal = useMemo(() =>
    (goals || []).find(g => (g.type === 'weight_loss' || g.type === 'weight_gain') && g.target_value) || null
  , [goals]);
  const goalType  = (weightGoal?.type || goals[0]?.type) === 'weight_loss' ? 'weight_loss' : 'weight_gain';
  const gKey      = user?.gender === 'female' ? 'female' : 'male';
  const shapeImgs = SHAPE_IMAGES[goalType]?.[gKey];
  const score     = habits?.today?.score ?? 0;
  const insights  = useMemo(() => buildInsights({ meas, prs, habits, goalType, C }), [meas, prs, habits, goalType, C]);

  const rangeDays = RANGES.find(r => r.key === range)?.days ?? null;

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setModal(true);
  };
  const openEdit = (m) => {
    setEditId(m.id);
    setForm({
      weight_kg:      m.weight_kg      != null ? String(m.weight_kg)      : '',
      body_fat_pct:   m.body_fat_pct   != null ? String(m.body_fat_pct)   : '',
      muscle_mass_kg: m.muscle_mass_kg != null ? String(m.muscle_mass_kg) : '',
      chest_cm:       m.chest_cm       != null ? String(m.chest_cm)       : '',
      waist_cm:       m.waist_cm       != null ? String(m.waist_cm)       : '',
      hips_cm:        m.hips_cm        != null ? String(m.hips_cm)        : '',
      notes:          m.notes || '',
    });
    setModal(true);
  };
  const confirmDelete = (m) => {
    Alert.alert('Delete entry?', `Remove the measurement from ${fmtDate(m.measured_at)}? This cannot be undone.`, [
      { text:'Cancel', style:'cancel' },
      { text:'Delete', style:'destructive', onPress: async () => {
        try { await delMeas(m.id); } catch (e) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const handleSave = async () => {
    const payload = {};
    Object.entries(form).forEach(([k, v]) => {
      if (v && k !== 'notes') payload[k] = parseFloat(v);
    });
    if (form.notes) payload.notes = form.notes;
    if (!Object.keys(payload).length) { Alert.alert('Enter at least one value'); return; }
    setSaving(true);
    try {
      if (editId) await editMeas({ id: editId, payload });
      else        await saveMeas(payload);
      setModal(false);
      setEditId(null);
      setForm(emptyForm);
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={rf(22)} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex:1, marginLeft:4 }}>
          <Text style={s.headerSub}>PROGRESS</Text>
          <Text style={s.headerTitle}>Fitness Tracker</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {[
          { key:'body',     label:'Body',     icon:'body-outline'           },
          { key:'strength', label:'Strength', icon:'barbell-outline'        },
          { key:'habits',   label:'Habits',   icon:'checkmark-done-outline' },
        ].map(t => (
          <TouchableOpacity key={t.key} style={[s.tab, tab === t.key && s.tabOn]}
            onPress={() => setTab(t.key)}>
            <Ionicons name={t.icon} size={rf(13)} color={tab === t.key ? C.accent : C.muted} />
            <Text style={[s.tabTxt, tab === t.key && { color:C.accent }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={C.accent} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding:16, paddingBottom:110 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refresh} onRefresh={onRefresh} tintColor={C.accent} />}>

          {/* ═══ BODY TAB ══════════════════════════════════════ */}
          {tab === 'body' && (
            <>
              {/* Hero weight card */}
              <View style={s.heroCard}>
                <View style={{ flex:1 }}>
                  <Text style={s.heroLabel}>CURRENT WEIGHT</Text>
                  <View style={{ flexDirection:'row', alignItems:'flex-end', gap:5 }}>
                    <Text style={s.heroNum}>{latest?.weight_kg?.toFixed(1) ?? '—'}</Text>
                    <Text style={s.heroUnit}>kg</Text>
                  </View>
                  {wDiff !== null && (
                    <View style={{ flexDirection:'row', alignItems:'center', gap:4, marginTop:5 }}>
                      <Ionicons
                        name={wDiff > 0 ? 'trending-up' : wDiff < 0 ? 'trending-down' : 'remove'}
                        size={13}
                        color={(goalType === 'weight_gain' ? wDiff > 0 : wDiff < 0) ? C.accent : '#FF453A'}
                      />
                      <Text style={{
                        fontSize:12, fontWeight:'700',
                        color:(goalType === 'weight_gain' ? wDiff > 0 : wDiff < 0) ? C.accent : '#FF453A',
                      }}>
                        {wDiff > 0 ? '+' : ''}{wDiff} kg from last entry
                      </Text>
                    </View>
                  )}
                  <View style={{ flexDirection:'row', gap:14, marginTop:10 }}>
                    {[
                      { label:'BMI',      val:latest?.bmi          },
                      { label:'Body Fat', val:latest?.body_fat_pct, unit:'%' },
                      { label:'Muscle',   val:latest?.muscle_mass_kg, unit:'kg' },
                    ].filter(s => s.val).map(item => (
                      <View key={item.label}>
                        <Text style={{ color:C.muted, fontSize:9, fontWeight:'700' }}>{item.label}</Text>
                        <Text style={{ color:C.text, fontSize:14, fontWeight:'900' }}>
                          {item.val}{item.unit || ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={{ alignItems:'center', gap:4 }}>
                  <Text style={{ color:C.accent, fontSize:9, fontWeight:'800', letterSpacing:1 }}>GOAL</Text>
                  <Image source={shapeImgs?.after} style={{ width:65, height:118 }} contentFit="contain" />
                  <Text style={{ color:C.muted, fontSize:9 }}>
                    {goalType === 'weight_gain' ? 'Toned' : 'Lean'}
                  </Text>
                </View>
              </View>

              {/* Goal progress */}
              <GoalProgressCard
                goal={weightGoal} meas={meas} goalType={goalType}
                C={C} s={s} onSetGoal={() => navigation.navigate('Goals')}
              />

              {/* Smart insights */}
              {insights.length > 0 && (
                <View style={{ marginBottom:12 }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:10 }}>
                    <Ionicons name="sparkles" size={14} color={C.accent} />
                    <Text style={[s.cardTitle, { fontSize:15 }]}>Smart Insights</Text>
                  </View>
                  {insights.map((ins, i) => (
                    <View key={i} style={[s.insightCard, { borderLeftColor: ins.color }]}>
                      <View style={[s.insightIcon, { backgroundColor:`${ins.color}1F` }]}>
                        <Ionicons name={ins.icon} size={16} color={ins.color} />
                      </View>
                      <View style={{ flex:1 }}>
                        <Text style={s.insightTitle}>{ins.title}</Text>
                        <Text style={s.insightBody}>{ins.body}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Trend graph — metric + range switchers */}
              <View style={s.card}>
                <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                  <Text style={s.cardTitle}>Trends</Text>
                  {/* Range filter */}
                  <View style={{ flexDirection:'row', gap:4 }}>
                    {RANGES.map(r => (
                      <TouchableOpacity key={r.key} onPress={() => setRange(r.key)}
                        style={[s.rangeChip, range === r.key && s.rangeChipOn]}>
                        <Text style={[s.rangeChipTxt, range === r.key && { color:'#0A0A0F' }]}>{r.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Metric switcher */}
                <View style={{ flexDirection:'row', gap:6, marginTop:10 }}>
                  {Object.values(METRICS).map(mt => (
                    <TouchableOpacity key={mt.key} onPress={() => setMetric(mt.key)}
                      style={[s.metricChip, metric === mt.key && { borderColor:mt.color, backgroundColor:`${mt.color}18` }]}>
                      <View style={{ width:8, height:8, borderRadius:4, backgroundColor:mt.color }} />
                      <Text style={[s.metricChipTxt, metric === mt.key && { color:C.text }]}>{mt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={{ marginTop:10 }}>
                  <MetricGraph data={meas} metricKey={metric} rangeDays={rangeDays} C={C} />
                </View>
              </View>

              {/* Measurements grid */}
              {latest && (
                <View style={s.card}>
                  <Text style={s.cardTitle}>Body Measurements</Text>
                  <View style={s.measGrid}>
                    {[
                      { label:'Chest',    val:latest.chest_cm,        unit:'cm' },
                      { label:'Waist',    val:latest.waist_cm,        unit:'cm' },
                      { label:'Hips',     val:latest.hips_cm,         unit:'cm' },
                      { label:'Body Fat', val:latest.body_fat_pct,    unit:'%'  },
                      { label:'Muscle',   val:latest.muscle_mass_kg,  unit:'kg' },
                      { label:'BMI',      val:latest.bmi,             unit:''   },
                    ].filter(m => m.val).map(m => (
                      <View key={m.label} style={s.measBox}>
                        <Text style={s.measLabel}>{m.label}</Text>
                        <Text style={s.measVal}>{m.val}<Text style={s.measUnit}> {m.unit}</Text></Text>
                      </View>
                    ))}
                  </View>
                  {latest.notes && (
                    <Text style={{ color:C.dim, fontSize:11, marginTop:10, fontStyle:'italic' }}>
                      "{latest.notes}"
                    </Text>
                  )}
                  <Text style={{ color:C.muted, fontSize:10, marginTop:6 }}>
                    Last entry: {fmtDate(latest.measured_at)}
                  </Text>
                </View>
              )}

              {/* Measurement history */}
              {meas.length > 0 && (
                <View style={s.card}>
                  <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                    <Text style={s.cardTitle}>History</Text>
                    <Text style={{ color:C.dim, fontSize:10 }}>Tap an entry to edit</Text>
                  </View>
                  {meas.slice(0, 12).map((m, i) => {
                    const p    = meas[i + 1];
                    const diff = (m.weight_kg && p?.weight_kg) ? +(m.weight_kg - p.weight_kg).toFixed(1) : null;
                    return (
                      <TouchableOpacity key={m.id} activeOpacity={0.7}
                        onPress={() => openEdit(m)} onLongPress={() => confirmDelete(m)}
                        style={[s.histRow, i === 0 && { borderTopWidth:0 }]}>
                        <View style={{ flex:1 }}>
                          <Text style={s.histDate}>{fmtDate(m.measured_at)}</Text>
                          {m.body_fat_pct && <Text style={s.histMeta}>BF {m.body_fat_pct}%  Muscle {m.muscle_mass_kg ?? '—'}kg</Text>}
                        </View>
                        <View style={{ alignItems:'flex-end' }}>
                          <Text style={s.histWeight}>{m.weight_kg ? `${m.weight_kg} kg` : '—'}</Text>
                          {diff !== null && (
                            <Text style={{ color: diff > 0 ? C.teal : C.orange, fontSize:10, fontWeight:'700' }}>
                              {diff > 0 ? '+' : ''}{diff} kg
                            </Text>
                          )}
                        </View>
                        <View style={{ flexDirection:'row', gap:2, marginLeft:10 }}>
                          <TouchableOpacity hitSlop={{top:8,bottom:8,left:8,right:8}} onPress={() => openEdit(m)} style={s.rowIconBtn}>
                            <Ionicons name="create-outline" size={16} color={C.muted} />
                          </TouchableOpacity>
                          <TouchableOpacity hitSlop={{top:8,bottom:8,left:8,right:8}} onPress={() => confirmDelete(m)} style={s.rowIconBtn}>
                            <Ionicons name="trash-outline" size={16} color="#FF453A" />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <TouchableOpacity style={s.logBtn} onPress={openCreate}>
                <Ionicons name="add-circle" size={rf(18)} color="#0A0A0F" />
                <Text style={s.logBtnTxt}>Log Today's Measurements</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ═══ STRENGTH TAB ══════════════════════════════════ */}
          {tab === 'strength' && (
            <>
              <View style={s.summaryRow}>
                {[
                  { num: prs.length,                                    label:'Exercises\nTracked' },
                  { num: prs.filter(p => p.is_new_pr).length,          label:'New PRs\nThis Week' },
                  { num: prs.reduce((s, p) => s + p.total_sets, 0),    label:'Total Sets\nLogged'  },
                ].map((item, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <View style={s.summaryDivider} />}
                    <View style={s.summaryItem}>
                      <Text style={s.summaryNum}>{item.num}</Text>
                      <Text style={s.summaryLabel}>{item.label}</Text>
                    </View>
                  </React.Fragment>
                ))}
              </View>

              {prs.length === 0 ? (
                <View style={s.emptyState}>
                  <Ionicons name="barbell-outline" size={52} color={C.border} />
                  <Text style={s.emptyTitle}>No Sets Logged Yet</Text>
                  <Text style={s.emptyBody}>
                    Complete a workout and log your sets. Your Personal Records will appear here with progress charts.
                  </Text>
                  <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('Workouts')}>
                    <Text style={s.emptyBtnTxt}>Go to Workouts →</Text>
                  </TouchableOpacity>
                </View>
              ) : prs.map(pr => {
                const mIcon  = pr.momentum === 'up' ? 'trending-up' : pr.momentum === 'down' ? 'trending-down' : 'remove-outline';
                const mColor = pr.momentum === 'up' ? C.accent : pr.momentum === 'down' ? '#FF453A' : C.muted;
                return (
                  <View key={pr.exercise_id} style={s.prCard}>
                    <View style={{ flexDirection:'row', alignItems:'flex-start', gap:8 }}>
                      <View style={{ flex:1 }}>
                        <View style={{ flexDirection:'row', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                          <Text style={s.prName} numberOfLines={1}>{pr.exercise_name}</Text>
                          {pr.is_new_pr && (
                            <View style={s.prBadge}><Text style={s.prBadgeTxt}>🏆 NEW PR</Text></View>
                          )}
                        </View>
                        <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginTop:5 }}>
                          <Text style={s.prWeight}>{pr.pr_weight} kg</Text>
                          <Text style={s.prReps}>× {pr.pr_reps} reps</Text>
                          <Ionicons name={mIcon} size={14} color={mColor} />
                        </View>
                      </View>
                      <PRSparkBar spark={pr.spark} C={C} />
                    </View>

                    {pr.prev_weight !== null && pr.improvement !== null && (
                      <View style={{ marginTop:10 }}>
                        <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:5 }}>
                          <Text style={{ color:C.muted, fontSize:10 }}>Previous best: {pr.prev_weight} kg</Text>
                          <Text style={{ color:C.accent, fontSize:10, fontWeight:'800' }}>
                            +{pr.improvement} kg gained
                          </Text>
                        </View>
                        <View style={s.prBarBg}>
                          <View style={[s.prBarFill, {
                            width:`${Math.min(((pr.prev_weight / pr.pr_weight) * 100), 92)}%`,
                            backgroundColor: `${C.accent}55`,
                          }]} />
                          <View style={[s.prBarFill, { position:'absolute', left:0,
                            width:'100%', backgroundColor:`${C.accent}22`,
                          }]} />
                        </View>
                      </View>
                    )}

                    <Text style={{ color:C.dim, fontSize:10, marginTop:8 }}>
                      PR set {fmtDate(pr.pr_date)} • {pr.total_sets} total sets
                    </Text>
                  </View>
                );
              })}
            </>
          )}

          {/* ═══ HABITS TAB ════════════════════════════════════ */}
          {tab === 'habits' && (
            <>
              {/* Score + streaks */}
              <View style={s.habitHero}>
                <ScoreArc score={score} C={C} />
                <View style={{ flex:1, gap:8 }}>
                  {[
                    { icon:'flame',  color:'#FF9F0A', num: habits?.streak  ?? 0, label:'Day Streak'  },
                    { icon:'trophy', color:C.accent,  num: habits?.longest ?? 0, label:'Best Streak' },
                  ].map(item => (
                    <View key={item.label} style={s.streakBox}>
                      <Ionicons name={item.icon} size={rf(18)} color={item.color} />
                      <View>
                        <Text style={s.streakNum}>{item.num}</Text>
                        <Text style={s.streakLabel}>{item.label}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* Today's habit checklist */}
              <View style={s.card}>
                <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <Text style={s.cardTitle}>Today's Habits</Text>
                  <Text style={{ color:C.accent, fontSize:12, fontWeight:'800' }}>{score}/100 pts</Text>
                </View>
                {HABIT_DEFS.map(h => {
                  const done = habits?.today?.habits?.[h.key];
                  return (
                    <View key={h.key} style={s.habitRow}>
                      <View style={[s.habitDot, { backgroundColor: done ? C.accent : C.border }]}>
                        <Ionicons name={h.icon} size={13} color={done ? '#0A0A0F' : C.muted} />
                      </View>
                      <Text style={[s.habitLabel, done && { color:C.text, textDecorationLine:'none' }]}>
                        {h.label}
                      </Text>
                      <View style={{ flex:1 }} />
                      {done
                        ? <View style={s.doneChip}><Ionicons name="checkmark" size={13} color="#0A0A0F" /></View>
                        : <Text style={s.ptsTxt}>+{h.pts} pts</Text>
                      }
                    </View>
                  );
                })}
              </View>

              {/* 7-day habit matrix */}
              <View style={s.card}>
                <Text style={s.cardTitle}>This Week</Text>
                <Text style={{ color:C.muted, fontSize:11, marginBottom:14 }}>Daily habit completion</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <HabitGrid week={habits?.week || []} C={C} />
                </ScrollView>
              </View>

              {/* Week score bars */}
              <View style={s.card}>
                <Text style={s.cardTitle}>Daily Scores</Text>
                {(habits?.week || []).filter(d => !d.is_future).map((d, i) => {
                  const sc    = d.score || 0;
                  const color = sc >= 80 ? C.accent : sc >= 60 ? '#FF9F0A' : C.blue;
                  return (
                    <View key={i} style={s.scoreBarRow}>
                      <Text style={s.scoreBarDay}>{fmtDay(d.date)}</Text>
                      <View style={s.scoreBarBg}>
                        <View style={[s.scoreBarFill, { width:`${sc}%`, backgroundColor:color }]} />
                      </View>
                      <Text style={{ color:C.text, fontSize:11, fontWeight:'800', width:30, textAlign:'right' }}>
                        {sc}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* ── Log Measurement Modal ─────────────────────── */}
      <Modal visible={modal} animationType="slide" transparent>
        <View style={s.modalBg}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>{editId ? 'Edit Measurement' : 'Log Measurements'}</Text>
              <Text style={{ color:C.muted, fontSize:12, marginBottom:16 }}>
                {editId ? 'Update any field below' : 'All fields optional — enter any you have'}
              </Text>
              {[
                { key:'weight_kg',      label:'Weight',       placeholder:'75.5 kg',  kb:'decimal-pad' },
                { key:'body_fat_pct',   label:'Body Fat %',   placeholder:'18.0',     kb:'decimal-pad' },
                { key:'muscle_mass_kg', label:'Muscle Mass',  placeholder:'60.0 kg',  kb:'decimal-pad' },
                { key:'chest_cm',       label:'Chest',        placeholder:'95 cm',    kb:'decimal-pad' },
                { key:'waist_cm',       label:'Waist',        placeholder:'80 cm',    kb:'decimal-pad' },
                { key:'hips_cm',        label:'Hips',         placeholder:'90 cm',    kb:'decimal-pad' },
                { key:'notes',          label:'Notes',        placeholder:'How are you feeling...', kb:'default' },
              ].map(f => (
                <View key={f.key} style={{ marginBottom:10 }}>
                  <Text style={s.inputLabel}>{f.label}</Text>
                  <TextInput style={s.input} placeholder={f.placeholder} placeholderTextColor={C.dim}
                    keyboardType={f.kb} value={form[f.key]}
                    onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))} />
                </View>
              ))}
              <View style={{ flexDirection:'row', gap:10, marginTop:8 }}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => { setModal(false); setEditId(null); }}>
                  <Text style={s.cancelTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.confirmBtn} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#000" size="small" />
                          : <Text style={s.confirmTxt}>{editId ? 'Update' : 'Save'}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  root:         { flex:1, backgroundColor:C.bg },
  center:       { flex:1, alignItems:'center', justifyContent:'center' },
  header:       { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingTop:8, paddingBottom:10 },
  backBtn:      { width:rf(34), height:rf(34), alignItems:'center', justifyContent:'center', marginRight:4 },
  headerSub:    { color:C.muted, fontSize:10, fontWeight:'700', letterSpacing:1.2 },
  headerTitle:  { color:C.text, fontSize:22, fontWeight:'900' },
  tabRow:       { flexDirection:'row', paddingHorizontal:16, gap:8, marginBottom:6 },
  tab:          { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center',
                  gap:5, borderRadius:12, borderWidth:1, borderColor:C.border,
                  paddingVertical:9, backgroundColor:C.card },
  tabOn:        { backgroundColor:`${C.accent}18`, borderColor:C.accent },
  tabTxt:       { color:C.muted, fontSize:11, fontWeight:'700' },
  // Body
  heroCard:     { backgroundColor:C.card, borderRadius:18, borderWidth:1, borderColor:C.border,
                  padding:16, marginBottom:12, flexDirection:'row', alignItems:'center', gap:14 },
  heroLabel:    { color:C.muted, fontSize:10, fontWeight:'700', letterSpacing:1, marginBottom:4 },
  heroNum:      { color:C.text, fontSize:40, fontWeight:'900', lineHeight:44 },
  heroUnit:     { color:C.accent, fontSize:16, fontWeight:'700', marginBottom:6 },
  card:         { backgroundColor:C.card, borderRadius:16, borderWidth:1, borderColor:C.border,
                  padding:16, marginBottom:12 },
  cardTitle:    { color:C.text, fontSize:14, fontWeight:'800' },
  // Trend graph chips
  rangeChip:    { borderRadius:8, paddingHorizontal:8, paddingVertical:4,
                  backgroundColor:C.bg, borderWidth:1, borderColor:C.border },
  rangeChipOn:  { backgroundColor:C.accent, borderColor:C.accent },
  rangeChipTxt: { color:C.muted, fontSize:10, fontWeight:'800' },
  metricChip:   { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:5,
                  borderRadius:10, paddingVertical:7, backgroundColor:C.bg,
                  borderWidth:1, borderColor:C.border },
  metricChipTxt:{ color:C.muted, fontSize:11, fontWeight:'800' },
  // Insights
  insightCard:  { flexDirection:'row', alignItems:'center', gap:12, backgroundColor:C.card,
                  borderRadius:14, borderWidth:1, borderColor:C.border, borderLeftWidth:4,
                  padding:12, marginBottom:8 },
  insightIcon:  { width:34, height:34, borderRadius:17, alignItems:'center', justifyContent:'center' },
  insightTitle: { color:C.text, fontSize:13, fontWeight:'900', marginBottom:2 },
  insightBody:  { color:C.muted, fontSize:11, lineHeight:15 },
  rowIconBtn:   { padding:4 },
  measGrid:     { flexDirection:'row', flexWrap:'wrap', gap:8, marginTop:10 },
  measBox:      { width:(SW - 72) / 3, backgroundColor:C.bg, borderRadius:12,
                  borderWidth:1, borderColor:C.border, padding:10 },
  measLabel:    { color:C.muted, fontSize:9, fontWeight:'700', marginBottom:3 },
  measVal:      { color:C.text, fontSize:15, fontWeight:'900' },
  measUnit:     { color:C.muted, fontSize:11 },
  histRow:      { flexDirection:'row', alignItems:'center', paddingVertical:10,
                  borderTopWidth:0.5, borderColor:C.border },
  histDate:     { color:C.text, fontSize:13, fontWeight:'700' },
  histMeta:     { color:C.muted, fontSize:10, marginTop:2 },
  histWeight:   { color:C.accent, fontSize:15, fontWeight:'900' },
  logBtn:       { backgroundColor:C.accent, borderRadius:14, padding:15, flexDirection:'row',
                  alignItems:'center', justifyContent:'center', gap:8, marginBottom:16 },
  logBtnTxt:    { color:'#0A0A0F', fontSize:14, fontWeight:'900' },
  // Strength
  summaryRow:   { backgroundColor:C.card, borderRadius:16, borderWidth:1, borderColor:C.border,
                  padding:16, marginBottom:12, flexDirection:'row', alignItems:'center' },
  summaryItem:  { flex:1, alignItems:'center' },
  summaryNum:   { color:C.accent, fontSize:26, fontWeight:'900' },
  summaryLabel: { color:C.muted, fontSize:9, fontWeight:'700', textAlign:'center', marginTop:3, lineHeight:13 },
  summaryDivider:{ width:1, height:44, backgroundColor:C.border },
  prCard:       { backgroundColor:C.card, borderRadius:16, borderWidth:1, borderColor:C.border,
                  padding:14, marginBottom:10 },
  prName:       { color:C.text, fontSize:15, fontWeight:'800' },
  prWeight:     { color:C.accent, fontSize:20, fontWeight:'900' },
  prReps:       { color:C.muted, fontSize:12, fontWeight:'600' },
  prBadge:      { backgroundColor:`${C.accent}22`, borderRadius:8, paddingHorizontal:8,
                  paddingVertical:3, borderWidth:1, borderColor:`${C.accent}55` },
  prBadgeTxt:   { color:C.accent, fontSize:9, fontWeight:'900' },
  prBarBg:      { height:6, backgroundColor:C.border, borderRadius:3, overflow:'hidden' },
  prBarFill:    { height:'100%', borderRadius:3 },
  emptyState:   { alignItems:'center', paddingVertical:52, paddingHorizontal:24 },
  emptyTitle:   { color:C.text, fontSize:18, fontWeight:'800', marginTop:16, marginBottom:8 },
  emptyBody:    { color:C.muted, fontSize:13, textAlign:'center', lineHeight:20 },
  emptyBtn:     { backgroundColor:C.accent, borderRadius:12, paddingHorizontal:24,
                  paddingVertical:13, marginTop:20 },
  emptyBtnTxt:  { color:'#0A0A0F', fontWeight:'900', fontSize:14 },
  // Habits
  habitHero:    { flexDirection:'row', alignItems:'center', gap:12, marginBottom:12 },
  streakBox:    { backgroundColor:C.card, borderRadius:14, borderWidth:1, borderColor:C.border,
                  padding:12, flexDirection:'row', alignItems:'center', gap:10, flex:1 },
  streakNum:    { color:C.text, fontSize:18, fontWeight:'900' },
  streakLabel:  { color:C.muted, fontSize:10, fontWeight:'700' },
  habitRow:     { flexDirection:'row', alignItems:'center', gap:10, paddingVertical:10,
                  borderBottomWidth:0.5, borderColor:C.border },
  habitDot:     { width:32, height:32, borderRadius:16, alignItems:'center', justifyContent:'center' },
  habitLabel:   { color:C.muted, fontSize:13, fontWeight:'600' },
  doneChip:     { backgroundColor:C.accent, borderRadius:12, width:26, height:26,
                  alignItems:'center', justifyContent:'center' },
  ptsTxt:       { color:C.dim, fontSize:11, fontWeight:'700' },
  scoreBarRow:  { flexDirection:'row', alignItems:'center', gap:10, marginBottom:7 },
  scoreBarDay:  { color:C.muted, fontSize:11, fontWeight:'700', width:26 },
  scoreBarBg:   { flex:1, height:8, backgroundColor:C.border, borderRadius:4, overflow:'hidden' },
  scoreBarFill: { height:'100%', borderRadius:4 },
  // Modal
  modalBg:      { flex:1, backgroundColor:'rgba(0,0,0,0.8)', justifyContent:'flex-end' },
  modalCard:    { backgroundColor:C.card2, borderTopLeftRadius:24, borderTopRightRadius:24,
                  padding:24, borderTopWidth:1, borderColor:C.border },
  modalTitle:   { color:C.text, fontSize:20, fontWeight:'900', marginBottom:4 },
  inputLabel:   { color:C.muted, fontSize:10, fontWeight:'700', marginBottom:5, letterSpacing:0.5 },
  input:        { backgroundColor:C.bg, borderRadius:12, borderWidth:1, borderColor:C.border,
                  padding:12, color:C.text, fontSize:14 },
  cancelBtn:    { flex:1, backgroundColor:C.border, borderRadius:12, paddingVertical:13, alignItems:'center' },
  cancelTxt:    { color:C.text, fontWeight:'700' },
  confirmBtn:   { flex:2, backgroundColor:C.accent, borderRadius:12, paddingVertical:13, alignItems:'center' },
  confirmTxt:   { color:'#000', fontWeight:'900', fontSize:15 },
});
