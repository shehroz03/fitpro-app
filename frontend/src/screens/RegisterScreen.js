import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { C } from '../utils/theme';

const Field = ({ label, field, form, set, ...props }) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      placeholderTextColor={C.dim}
      value={form[field]}
      onChangeText={v => set(field, v)}
      {...props}
    />
  </View>
);

export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const register = useAuthStore(s => s.register);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleRegister = async () => {
    if (!form.full_name || !form.email || !form.password)
      return Alert.alert('Error', 'All fields are required');
    if (form.password.length < 6)
      return Alert.alert('Error', 'Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(form);
    } catch (e) {
      Alert.alert('Registration Failed', e.message || e.response?.data?.message || 'Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <View style={styles.logoCircle}><Text style={styles.logoText}>FC</Text></View>
          <Text style={styles.appName}>FITCORE PRO</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Create Account 🚀</Text>
          <Text style={styles.formSub}>Join thousands crushing their fitness goals</Text>

          <Field label="Full Name"    field="full_name" form={form} set={set} placeholder="Ahmed Raza"          autoCapitalize="words" />
          <Field label="Email"        field="email"     form={form} set={set} placeholder="ahmed@example.com"   keyboardType="email-address" autoCapitalize="none" />
          <Field label="Password"     field="password"  form={form} set={set} placeholder="Min 6 characters"    secureTextEntry />

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

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: C.bg },
  inner:      { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header:     { alignItems: 'center', marginBottom: 32 },
  logoCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  logoText:   { fontSize: 24, fontWeight: '900', color: '#0A0A0F' },
  appName:    { fontSize: 22, fontWeight: '900', color: C.text, letterSpacing: 3 },
  form:       { backgroundColor: C.card, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: C.border },
  formTitle:  { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 4 },
  formSub:    { fontSize: 13, color: C.muted, marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  label:      { fontSize: 11, color: C.muted, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:      { backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, paddingVertical: 13, color: C.text, fontSize: 15 },
  btn:        { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8, marginBottom: 16 },
  btnText:    { fontSize: 15, fontWeight: '800', color: '#0A0A0F' },
  altBtn:     { alignItems: 'center' },
  altBtnText: { fontSize: 14, color: C.muted },
});
