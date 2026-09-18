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
  Linking,
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
import { ShieldAlert, LogOut, Download, ArrowRight, Store } from 'lucide-react-native';

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
  const [allowCustomerMode, setAllowCustomerMode] = useState(false);
  const { currentUser, currentRole, initializeAppData, setCurrentUser, isLoading, shops } = useAppStore();

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
  const isStaffAccount = currentUser && ['ShopAdmin', 'SuperAdmin', 'Delivery', 'Operator'].includes(currentUser.role) && !allowCustomerMode;

  const handleOpenPartnerApp = async () => {
    // Attempt to open native partner app scheme or direct APK download
    const activeShop = shops.find((s) => s.androidAppUrl) || shops[0];
    const downloadUrl = activeShop?.androidAppUrl || 'https://wowlaundry.in';
    try {
      const canOpen = await Linking.canOpenURL('wowlaundrypartner://');
      if (canOpen) {
        await Linking.openURL('wowlaundrypartner://');
      } else {
        await Linking.openURL(downloadUrl);
      }
    } catch {
      Linking.openURL(downloadUrl);
    }
  };

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
                You are currently signed in as a <Text style={{ fontWeight: '800', color: COLORS.black }}>{currentUser.role}</Text>.
                {'\n\n'}
                This application is the <Text style={{ fontWeight: '800' }}>WoW Laundry Customer App</Text>. For managing orders, wash floors, catalog, and deliveries, please use the dedicated <Text style={{ fontWeight: '800', color: COLORS.primary }}>WoW Partner App</Text>.
              </Text>

              <View style={styles.actionButtonGroup}>
                <TouchableOpacity
                  style={styles.downloadPartnerBtn}
                  onPress={handleOpenPartnerApp}
                  activeOpacity={0.85}
                >
                  <Store size={18} color={COLORS.black} />
                  <Text style={styles.downloadPartnerBtnText}>OPEN / GET PARTNER APP</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.continueCustomerBtn}
                  onPress={() => setAllowCustomerMode(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.continueCustomerBtnText}>Continue as Customer</Text>
                  <ArrowRight size={16} color={COLORS.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.logoutBtn}
                  onPress={() => {
                    setAllowCustomerMode(false);
                    setCurrentUser(null);
                  }}
                  activeOpacity={0.85}
                >
                  <LogOut size={16} color={COLORS.white} />
                  <Text style={styles.logoutBtnText}>LOG OUT & SWITCH</Text>
                </TouchableOpacity>
              </View>
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
    marginBottom: SPACING.lg,
  },
  actionButtonGroup: {
    width: '100%',
    gap: 10,
    alignItems: 'center',
  },
  downloadPartnerBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.secondary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.black,
    ...NEO_SHADOW.box4,
  },
  downloadPartnerBtnText: {
    color: COLORS.black,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  continueCustomerBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },
  continueCustomerBtnText: {
    color: COLORS.black,
    fontWeight: '700',
    fontFamily: 'Outfit_700Bold',
    fontSize: 13,
  },
  logoutBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.black,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.black,
    ...NEO_SHADOW.box2,
  },
  logoutBtnText: {
    color: COLORS.white,
    fontWeight: '800',
    fontFamily: 'Outfit_800ExtraBold',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
