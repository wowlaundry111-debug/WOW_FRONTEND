import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, Mail, Lock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS, NEO_SHADOW } from '../../components/Theme';
import { useAppStore } from '../../store/useAppStore';
import { RegisterScreen } from './RegisterScreen';
import { WowLogo } from '../../components/WowLogo';

// ─── Main Auth Screen ─────────────────────────────────────────────────────────
export const AuthScreen = () => {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAppStore();

  const handleLogin = async () => {
    if (!identifier || identifier.trim().length < 2) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    const res = await login(identifier.trim(), password ? password.trim() : undefined);
    setLoading(false);

    if (!res.success) {
      alert(res.message);
    }
  };

  const isFormValid = identifier.trim().length >= 2;

  if (screen === 'REGISTER') {
    return (
      <RegisterScreen
        onBack={() => setScreen('LOGIN')}
        onRegisterSuccess={() => {
          // Registration already signs in directly and updates store state
        }}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: (insets.top > 0 ? insets.top : 44) + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <WowLogo width={260} height={95} />
        </View>

        {/* Neo-Brutalist Login Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>SIGN IN</Text>
          <Text style={styles.cardSubtitle}>Enter your email or mobile number to sign in</Text>

          {/* Identifier Input */}
          <Text style={styles.fieldLabel}>EMAIL OR MOBILE NUMBER</Text>
          <View style={styles.inputWrap}>
            <Mail size={20} color={COLORS.black} strokeWidth={2.5} />
            <TextInput
              style={styles.input}
              placeholder="name@example.com or 9876543210"
              placeholderTextColor="#6B7280"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
              selectionColor={COLORS.black}
            />
          </View>

          {/* Password Input (Optional) */}
          <Text style={styles.fieldLabel}>PASSWORD (OPTIONAL)</Text>
          <View style={styles.inputWrap}>
            <Lock size={20} color={COLORS.black} strokeWidth={2.5} />
            <TextInput
              style={styles.input}
              placeholder="Enter password (optional)"
              placeholderTextColor="#6B7280"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              selectionColor={COLORS.black}
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, !isFormValid && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={!isFormValid || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.black} />
            ) : (
              <View style={styles.btnContent}>
                <Text style={styles.btnText}>SIGN IN</Text>
                <ArrowRight size={18} color={COLORS.black} strokeWidth={3} />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => setScreen('REGISTER')}>
              <Text style={styles.registerLink}> REGISTER</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  kav: {
    flex: 1,
    backgroundColor: '#F0FDF4',
  },
  scrollContent: {
    padding: SPACING.mobile,
    alignItems: 'center',
    paddingBottom: 40,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...NEO_SHADOW.box8,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
    marginTop: 4,
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: SPACING.md,
    ...NEO_SHADOW.box4,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
  },
  btn: {
    backgroundColor: COLORS.secondary,
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: RADIUS.xl,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    ...NEO_SHADOW.box6,
  },
  btnDisabled: {
    backgroundColor: '#E5E7EB',
    borderColor: '#9CA3AF',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    letterSpacing: 0.8,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  registerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  registerLink: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
});
