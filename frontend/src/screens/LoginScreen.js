import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { C } from '../utils/theme';

export default function LoginScreen({ navigation }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const login = useAuthStore(s => s.login);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Error', 'Email and password required');
    setLoading(true);
    try {
      await login(email.trim(), password);
      // Navigation handled by RootNavigator watching isLoggedIn
    } catch (e) {
      Alert.alert('Login Failed', e.message || e.response?.data?.message || 'Check your credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">

        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>FC</Text>
          </View>
          <Text style={styles.appName}>FITCORE PRO</Text>
          <Text style={styles.tagline}>Your ultimate fitness companion</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Welcome Back 👋</Text>
          <Text style={styles.formSub}>Log in to continue your fitness journey</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="ahmed@example.com"
              placeholderTextColor={C.dim}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={C.dim}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#000" />
              : <Text style={styles.btnText}>Log In</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.altBtn} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.altBtnText}>
              Don't have an account? <Text style={{ color: C.accent }}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.bg },
  inner:       { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoWrap:    { alignItems: 'center', marginBottom: 40 },
  logoCircle:  { width: 80, height: 80, borderRadius: 40, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoText:    { fontSize: 28, fontWeight: '900', color: '#0A0A0F' },
  appName:     { fontSize: 26, fontWeight: '900', color: C.text, letterSpacing: 3 },
  tagline:     { fontSize: 13, color: C.muted, marginTop: 4 },
  form:        { backgroundColor: C.card, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: C.border },
  formTitle:   { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 4 },
  formSub:     { fontSize: 13, color: C.muted, marginBottom: 24 },
  inputGroup:  { marginBottom: 16 },
  label:       { fontSize: 12, color: C.muted, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:       { backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, paddingVertical: 13, color: C.text, fontSize: 15 },
  btn:         { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8, marginBottom: 16 },
  btnText:     { fontSize: 15, fontWeight: '800', color: '#0A0A0F' },
  altBtn:      { alignItems: 'center' },
  altBtnText:  { fontSize: 14, color: C.muted },
});
