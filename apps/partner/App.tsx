/**
 * WOW Laundry — Partner & Operations Mobile App
 * Unified operations portal for:
 * - Shop Admins (Catalog, Orders, Shop Settings, KPIs)
 * - Super Admins (Multi-branch oversight, Tenant switcher)
 * - Delivery Partners (Active pickup/delivery tasks, GPS, calls)
 * - Wash Floor Operators (Machine queue, washing, ironing, ready, weighing)
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
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
import { Store, ShieldCheck, Truck, Sparkles, LogOut, ShieldAlert } from 'lucide-react-native';

import { useAppStore } from './src/store/useAppStore';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import { useNotificationStore } from './src/store/useNotificationStore';
import { sortShopsWithLpuFirst } from './src/utils/branchHelper';
import { SocketManager } from './src/components/SocketManager';
import { AdminPortal } from './src/screens/admin/AdminPortal';
import { DeliveryPortal } from './src/screens/delivery/DeliveryPortal';
import { OperatorPortal } from './src/screens/operator/OperatorPortal';
import { PartnerAuthScreen } from './src/screens/auth/PartnerAuthScreen';
import { SplashScreen } from './src/screens/auth/SplashScreen';
import { COLORS, SPACING, RADIUS, TYPO, NEO_SHADOW, Role } from './src/components/Theme';

// ─── Operational Roles Config ──────────────────────────────────────────────────
const PARTNER_ROLES: { key: Role; label: string; desc: string; color: string; icon: any }[] = [
  { key: 'ShopAdmin',  label: 'Shop Admin',    desc: 'Manage branch catalog & orders',  color: COLORS.primary, icon: Store },
  { key: 'SuperAdmin', label: 'Super Admin',   desc: 'Platform oversight & all shops',  color: '#F59E0B',      icon: ShieldCheck },
  { key: 'Delivery',   label: 'Delivery Boy',  desc: 'Pickups & drop-offs',             color: '#10B981',      icon: Truck },
  { key: 'Operator',   label: 'Wash Operator', desc: 'Wash floor machines & pressing',  color: '#8B5CF6',      icon: Sparkles },
];

// ─── Switcher Modal for Development / SuperAdmin ───────────────────────────────
interface SwitcherModalProps {
  visible: boolean;
  onClose: () => void;
}

const SwitcherModal: React.FC<SwitcherModalProps> = ({ visible, onClose }) => {
  const { currentRole, currentTenantId, setCurrentRole, setCurrentTenantId, shops } = useAppStore();

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.switcherOverlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.switcherSheet}>
        <View style={styles.sheetHandle} />
        <Text style={[TYPO.headlineMd, { color: COLORS.onSurface, marginBottom: 4 }]}>
          Operations Context Switcher
        </Text>
        <Text style={[TYPO.bodyMd, { color: COLORS.onSurfaceVariant, marginBottom: SPACING.lg }]}>
          Preview dashboard for any operational staff role or branch
        </Text>

        {/* Roles */}
        <Text style={[TYPO.labelSm, { color: COLORS.outline, textTransform: 'uppercase', marginBottom: SPACING.sm }]}>
          Operational Role
        </Text>
        {PARTNER_ROLES.map((r) => {
          const Icon = r.icon;
          const isActive = currentRole === r.key;
          return (
            <TouchableOpacity
              key={r.key}
              style={[styles.switcherRow, isActive && { backgroundColor: `${r.color}18` }]}
              onPress={() => {
                setCurrentRole(r.key);
              }}
              activeOpacity={0.8}
            >
              <Icon size={20} color={isActive ? r.color : '#64748B'} />
              <View style={{ flex: 1 }}>
                <Text style={[TYPO.labelLg, { color: COLORS.onSurface }]}>{r.label}</Text>
                <Text style={[TYPO.bodyMd, { color: COLORS.onSurfaceVariant }]}>{r.desc}</Text>
              </View>
              {isActive && <View style={[styles.activeDot, { backgroundColor: r.color }]} />}
            </TouchableOpacity>
          );
        })}

        {/* Branches */}
        <Text style={[TYPO.labelSm, { color: COLORS.outline, textTransform: 'uppercase', marginTop: SPACING.md, marginBottom: SPACING.sm }]}>
          Active Branch (Shop)
        </Text>
        {sortShopsWithLpuFirst(shops).map((s) => (
          <TouchableOpacity
            key={s._id}
            style={[styles.switcherRow, currentTenantId === s._id && { backgroundColor: `${COLORS.primary}12` }]}
            onPress={() => setCurrentTenantId(s._id)}
            activeOpacity={0.8}
          >
            <Text style={[TYPO.labelLg, { color: COLORS.onSurface, flex: 1 }]}>{s.name}</Text>
            {currentTenantId === s._id && (
              <View style={[styles.activeDot, { backgroundColor: COLORS.primary }]} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </Modal>
  );
};

// ─── Main Partner App Entry ────────────────────────────────────────────────────
export default function App() {
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const { currentRole, currentUser, initializeAppData, setCurrentUser } = useAppStore();

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

  // Route staff to their respective portal
  const renderCurrentPortal = () => {
    if (!currentUser) {
      return <PartnerAuthScreen />;
    }

    if (currentUser.role === 'Customer') {
      return (
        <View style={styles.customerNoticeContainer}>
          <View style={styles.customerNoticeCard}>
            <View style={styles.iconCircle}>
              <ShieldAlert size={36} color="#B45309" />
            </View>
            <Text style={styles.customerNoticeTitle}>CUSTOMER ACCOUNT</Text>
            <Text style={styles.customerNoticeSubtitle}>
              You are signed in with a Customer account. This app is strictly for Laundry Staff, Admins, Delivery Drivers, and Operators.
              {'\n\n'}
              Please use the <Text style={{ fontWeight: '800', color: COLORS.primary }}>WoW Laundry Customer App</Text> to place and track orders.
            </Text>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => setCurrentUser(null)}
              activeOpacity={0.85}
            >
              <LogOut size={20} color={COLORS.white} />
              <Text style={styles.logoutBtnText}>LOG OUT</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    switch (currentRole) {
      case 'ShopAdmin':
      case 'SuperAdmin':
        return <AdminPortal />;
      case 'Delivery':
        return <DeliveryPortal />;
      case 'Operator':
        return <OperatorPortal />;
      default:
        return <AdminPortal />;
    }
  };

  const isSuperAdminOrDev = __DEV__ || currentUser?.role === 'SuperAdmin';

  return (
    <SafeAreaProvider>
      <SocketManager />
      <View style={styles.root}>
        <ExpoStatusBar style="dark" />
        {renderCurrentPortal()}

        {/* Operational Role Switcher FAB in Development or for SuperAdmin */}
        {isSuperAdminOrDev && currentUser && currentUser.role !== 'Customer' && (
          <>
            <TouchableOpacity style={styles.devFab} onPress={() => setSwitcherOpen(true)} activeOpacity={0.85}>
              <Text style={styles.devFabText}>⇄</Text>
            </TouchableOpacity>
            <SwitcherModal visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
          </>
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
  devFab: {
    position: 'absolute',
    bottom: 88,
    left: SPACING.mobile,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.secondary,
    ...NEO_SHADOW.box4,
  },
  devFabText: {
    fontSize: 22,
    color: COLORS.secondary,
    fontWeight: '900',
  },
  switcherOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  switcherSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    borderTopWidth: 2,
    borderColor: COLORS.black,
    padding: SPACING.lg,
    paddingBottom: 48,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  switcherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADIUS.lg,
    marginBottom: 4,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  customerNoticeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: '#FEF3C7',
  },
  customerNoticeCard: {
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
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.black,
  },
  customerNoticeTitle: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    marginBottom: SPACING.sm,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  customerNoticeSubtitle: {
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
