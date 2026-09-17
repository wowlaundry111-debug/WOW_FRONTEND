/**
 * WOW Laundry — Customer Mobile App
 * Dedicated customer portal for laundry discovery, cart, scheduling, and live tracking.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from '@expo-google-fonts/outfit';
import { ShieldAlert, LogOut } from 'lucide-react-native';

import { useAppStore } from './src/store/useAppStore';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import { useNotificationStore } from './src/store/useNotificationStore';
import { SocketManager } from './src/components/SocketManager';
import { CustomerPortal } from './src/screens/CustomerPortal';
import { AuthScreen } from './src/screens/CustomerAuthScreen';
import { SplashScreen } from './src/screens/SplashScreen';
import { COLORS, SPACING, RADIUS, TYPO, NEO_SHADOW } from './src/components/Theme';

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const { currentUser, currentRole, initializeAppData, setCurrentUser, isLoading } = useAppStore();

  usePushNotifications();

  useEffect(() => {
    initializeAppData();
    useNotificationStore.getState().clearOldNotifications();
  }, [initializeAppData]);

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
  });

  if (!fontsLoaded) return null;

  if (!splashDone) {
    return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }

  // Guard for non-customer accounts logged into the customer app
  const isStaffAccount = currentUser && ['ShopAdmin', 'SuperAdmin', 'Delivery', 'Operator'].includes(currentUser.role);

  return (
    <SafeAreaProvider>
      <SocketManager />
      <View style={styles.root}>
        <ExpoStatusBar style="dark" />

        {!currentUser ? (
          <AuthScreen />
        ) : isStaffAccount ? (
          <View style={styles.staffNoticeContainer}>
            <View style={styles.staffNoticeCard}>
              <View style={styles.iconCircle}>
                <ShieldAlert size={36} color={COLORS.error} />
              </View>
              <Text style={styles.staffNoticeTitle}>STAFF ACCOUNT DETECTED</Text>
              <Text style={styles.staffNoticeSubtitle}>
                You are currently signed in as a <Text style={{ fontWeight: '800' }}>{currentUser.role}</Text>.
                {'\n\n'}
                This application is strictly for Customers. Please use the <Text style={{ fontWeight: '800', color: COLORS.primary }}>WoW Partner App</Text> to manage orders, catalog, deliveries, and wash floors.
              </Text>
              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={() => setCurrentUser(null)}
                activeOpacity={0.85}
              >
                <LogOut size={20} color={COLORS.white} />
                <Text style={styles.logoutBtnText}>LOG OUT & SWITCH</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <CustomerPortal />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
  },
  staffNoticeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: '#F3F4F6',
  },
  staffNoticeCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    ...NEO_SHADOW.box4,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.black,
  },
  staffNoticeTitle: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    marginBottom: SPACING.sm,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  staffNoticeSubtitle: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.black,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.black,
    ...NEO_SHADOW.box2,
  },
  logoutBtnText: {
    color: COLORS.white,
    fontWeight: '800',
    fontFamily: 'Outfit_800ExtraBold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
