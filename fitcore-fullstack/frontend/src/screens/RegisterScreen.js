import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useC } from '../utils/theme';

const { width: SW, height: SH } = Dimensions.get('window');

const GENDERS = [
  {
    key: 'male',
    label: 'Male',
    emoji: '♂',
    image: require('../../assets/gender/male.png'),
    color: '#4D8DFF',
    desc: 'Muscle gain, strength & performance plans',
  },
  {
    key: 'female',
    label: 'Female',
    emoji: '♀',
    image: require('../../assets/gender/female.png'),
    color: '#FF6B9D',
    desc: 'Toning, fat loss & body shaping plans',
  },
];

const Field = ({ label, field, form, set, inputStyle, labelStyle, dimColor, ...props }) => (
  <View style={{ marginBottom: 16 }}>
    <Text style={labelStyle}>{label}</Text>
    <TextInput
      style={inputStyle}
      placeholderTextColor={dimColor}
      value={form[field]}
      onChangeText={v => set(field, v)}
      {...props}
    />
  </View>
);

export default function RegisterScreen({ navigation }) {
  const C = useC();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [step, setStep] = useState(1);                          // 1 = gender, 2 = form
  const [gender, setGender] = useState(null);
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const register = useAuthStore(s => s.register);

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleGenderSelect = (g) => {
    setGender(g);
    setTimeout(() => setStep(2), 320);
  };

  const handleRegister = async () => {
    if (!form.full_name || !form.email || !form.password)
      return Alert.alert('Error', 'All fields are required');
    if (form.password.length < 6)
      return Alert.alert('Error', 'Password must be at least 6 characters');
    setLoading(true);
    try {
      await register({ ...form, gender });
    } catch (e) {
      Alert.alert('Registration Failed', e.message || e.response?.data?.message || 'Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 1 — Gender selection ────────────────────────────────
  if (step === 1) {
    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.genderInner} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.genderHeader}>
            <View style={styles.logoCircle}><Text style={styles.logoText}>FC</Text></View>
            <Text style={styles.appName}>FITCORE PRO</Text>
            <Text style={styles.genderTitle}>What is your gender?</Text>
            <Text style={styles.genderSub}>
              We'll personalise your workouts,{'\n'}nutrition & body images just for you
            </Text>
          </View>

          {/* Gender cards */}
          <View style={styles.genderCards}>
            {GENDERS.map(g => {
              const selected = gender === g.key;
              return (
                <TouchableOpacity
                  key={g.key}
                  style={[styles.genderCard, {
                    borderColor: selected ? g.color : C.border,
                    backgroundColor: selected ? `${g.color}14` : C.card,
                  }]}
                  onPress={() => handleGenderSelect(g.key)}
                  activeOpacity={0.88}
                >
                  {/* Image */}
                  <View style={[styles.genderImgWrap, { backgroundColor: `${g.color}10` }]}>
                    <Image
                      source={g.image}
                      style={styles.genderImg}
                      contentFit="contain"
                    />
                  </View>

                  {/* Label + desc */}
                  <View style={styles.genderInfo}>
                    <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                      <View style={[styles.genderDot, { backgroundColor: g.color }]} />
                      <Text style={[styles.genderLabel, { color: selected ? g.color : C.text }]}>
                        {g.label}
                      </Text>
                    </View>
                    <Text style={styles.genderDesc}>{g.desc}</Text>
                  </View>

                  {/* Selection ring */}
                  <View style={[styles.genderRadio, {
                    borderColor: selected ? g.color : C.dim,
                    backgroundColor: selected ? g.color : 'transparent',
                  }]}>
                    {selected && <Ionicons name="checkmark" size={14} color="#0A0A0F" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Back to login */}
          <TouchableOpacity style={styles.altBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.altBtnText}>
              Already have an account? <Text style={{ color: C.accent }}>Log In</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── STEP 2 — Name / Email / Password ───────────────────────
  const selectedG = GENDERS.find(g => g.key === gender);
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">

        {/* Back to gender step */}
        <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
          <Text style={{ color: C.muted, fontSize: 13, fontWeight:'700' }}>Change gender</Text>
        </TouchableOpacity>

        {/* Gender indicator */}
        {selectedG && (
          <View style={[styles.genderChip, { borderColor: selectedG.color, backgroundColor: `${selectedG.color}14` }]}>
            <View style={[styles.genderDot, { backgroundColor: selectedG.color }]} />
            <Text style={[styles.genderChipTxt, { color: selectedG.color }]}>{selectedG.label}</Text>
            <Ionicons name="checkmark-circle" size={15} color={selectedG.color} />
          </View>
        )}

        <View style={styles.header}>
          <View style={styles.logoCircle}><Text style={styles.logoText}>FC</Text></View>
          <Text style={styles.appName}>FITCORE PRO</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Create Account</Text>
          <Text style={styles.formSub}>Join thousands crushing their fitness goals</Text>

          <Field label="Full Name" field="full_name" form={form} set={setField}
            inputStyle={styles.input} labelStyle={styles.label} dimColor={C.dim}
            placeholder="Ahmed Raza" autoCapitalize="words" />
          <Field label="Email" field="email" form={form} set={setField}
            inputStyle={styles.input} labelStyle={styles.label} dimColor={C.dim}
            placeholder="ahmed@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Field label="Password" field="password" form={form} set={setField}
            inputStyle={styles.input} labelStyle={styles.label} dimColor={C.dim}
            placeholder="Min 6 characters" secureTextEntry />

          <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#000" />
              : <Text style={styles.btnText}>Create Account</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.altBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.altBtnText}>
              Already have an account? <Text style={{ color: C.accent }}>Log In</Text>
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.bg },
  inner:        { flexGrow: 1, justifyContent: 'center', padding: 24 },
  genderInner:  { flexGrow: 1, padding: 24, paddingTop: 16 },
  // Gender step
  genderHeader: { alignItems: 'center', marginBottom: 28 },
  genderTitle:  { fontSize: 26, fontWeight: '900', color: C.text, textAlign: 'center', marginTop: 16, marginBottom: 6 },
  genderSub:    { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20 },
  genderCards:  { gap: 14, marginBottom: 28 },
  genderCard:   { borderWidth: 2, borderRadius: 20, overflow: 'hidden', flexDirection: 'row',
                  alignItems: 'center', padding: 14, gap: 14 },
  genderImgWrap:{ width: 80, height: 80, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  genderImg:    { width: 72, height: 72 },
  genderInfo:   { flex: 1, gap: 5 },
  genderLabel:  { fontSize: 18, fontWeight: '900' },
  genderDesc:   { fontSize: 11, color: C.muted, lineHeight: 16 },
  genderDot:    { width: 10, height: 10, borderRadius: 5 },
  genderRadio:  { width: 26, height: 26, borderRadius: 13, borderWidth: 2,
                  alignItems: 'center', justifyContent: 'center' },
  // Step 2
  backBtn:      { flexDirection:'row', alignItems:'center', gap:4, marginBottom:12, paddingVertical:4 },
  genderChip:   { flexDirection:'row', alignItems:'center', gap:6, borderWidth:1, borderRadius:20,
                  paddingHorizontal:12, paddingVertical:6, alignSelf:'center', marginBottom:16 },
  genderChipTxt:{ fontSize:13, fontWeight:'800' },
  header:       { alignItems: 'center', marginBottom: 24 },
  logoCircle:   { width: 60, height: 60, borderRadius: 30, backgroundColor: C.accent,
                  alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  logoText:     { fontSize: 22, fontWeight: '900', color: '#0A0A0F' },
  appName:      { fontSize: 20, fontWeight: '900', color: C.text, letterSpacing: 3 },
  form:         { backgroundColor: C.card, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: C.border },
  formTitle:    { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 4 },
  formSub:      { fontSize: 13, color: C.muted, marginBottom: 24 },
  label:        { fontSize: 11, color: C.muted, fontWeight: '700', marginBottom: 6,
                  textTransform: 'uppercase', letterSpacing: 0.5 },
  input:        { backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border,
                  paddingHorizontal: 16, paddingVertical: 13, color: C.text, fontSize: 15 },
  btn:          { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 15,
                  alignItems: 'center', marginTop: 8, marginBottom: 16 },
  btnText:      { fontSize: 15, fontWeight: '800', color: '#0A0A0F' },
  altBtn:       { alignItems: 'center' },
  altBtnText:   { fontSize: 14, color: C.muted },
});
