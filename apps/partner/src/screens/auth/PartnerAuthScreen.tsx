/**
 * WOW Laundry — Partner & Staff Authentication
 * Clean authentication screen for Shop Admins, Super Admins, Delivery Boys, and Operators.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Lock, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useAppStore } from '../../store/useAppStore';
import { COLORS, SPACING, RADIUS, NEO_SHADOW } from '../../components/Theme';
import { WowLogo } from '../../components/WowLogo';

export const PartnerAuthScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { sendLoginOtp } = useAppStore();

  const handleLogin = async () => {
    if (!identifier.trim()) {
      Alert.alert('Required', 'Please enter your staff email or phone number');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    const res = await sendLoginOtp(identifier.trim(), password.trim() || undefined);
    setLoading(false);

    if (!res.success) {
      if (Platform.OS === 'web') {
        alert(res.message || 'Staff login failed');
      } else {
        Alert.alert('Sign In Failed', res.message || 'Could not sign in as staff');
      }
      return;
    }

    const state = useAppStore.getState();
    if (state.currentUser?.role === 'Customer') {
      Alert.alert(
        'Customer Account',
        'This account is registered as a Customer. Please use the WoW Laundry Customer App.'
      );
      state.setCurrentUser(null);
    }
  };



  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoWrap}>
          <WowLogo width={240} height={85} />
          <View style={styles.partnerBadge}>
            <Text style={styles.partnerBadgeText}>OPERATIONS & STAFF</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>STAFF PORTAL</Text>
          <Text style={styles.subtitle}>
            Sign in to access Shop Management, Delivery Tasks, and Wash Floor Console.
          </Text>

          {/* Email / Username */}
          <Text style={styles.label}>EMAIL OR PHONE</Text>
          <View style={styles.inputWrap}>
            <Mail size={18} color={COLORS.black} strokeWidth={2.5} />
            <TextInput
              style={styles.input}
              placeholder="staff@wowlaundry.com"
              placeholderTextColor="#9CA3AF"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Password */}
          <Text style={[styles.label, { marginTop: SPACING.md }]}>PASSWORD</Text>
          <View style={styles.inputWrap}>
            <Lock size={18} color={COLORS.black} strokeWidth={2.5} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, (!identifier.trim() || loading) && styles.btnDisabled]}
            disabled={!identifier.trim() || loading}
            onPress={handleLogin}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.black} />
            ) : (
              <View style={styles.btnContent}>
                <Text style={styles.btnText}>ACCESS DASHBOARD</Text>
                <ArrowRight size={18} color={COLORS.black} strokeWidth={3} />
              </View>
            )}
          </TouchableOpacity>
        </View>


      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#002B2E',
  },
  scroll: {
    padding: SPACING.lg,
    alignItems: 'center',
    paddingBottom: 40,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  partnerBadge: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    borderColor: COLORS.black,
    marginTop: 8,
    ...NEO_SHADOW.box2,
  },
  partnerBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    letterSpacing: 1,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    borderColor: COLORS.black,
    padding: SPACING.xl,
    ...NEO_SHADOW.box4,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    color: '#64748B',
    lineHeight: 18,
    marginTop: 4,
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'Outfit_800ExtraBold',
    letterSpacing: 0.5,
    color: COLORS.black,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.black,
    padding: 0,
  },
  btn: {
    backgroundColor: COLORS.secondary,
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xl,
    ...NEO_SHADOW.box4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnText: {
    color: COLORS.black,
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    letterSpacing: 0.5,
  },

});
