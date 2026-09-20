import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Dimensions,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import {
  ArrowLeft,
  Trash2,
  MapPin,
  Clock,
  Navigation,
  CheckCircle2,
  Tag,
  AlertTriangle,
  Home,
  Briefcase,
  Sparkles,
  ShieldCheck,
  Plus,
  Minus,
  Check,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Store,
  Truck,
  Scale,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { COLORS, SPACING, RADIUS, TYPO, NEO_SHADOW } from '../../components/Theme';
import { useAppStore } from '../../store/useAppStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedView = Animated.View as any;

/**
 * Blinkit / iOS Style Bouncy Interactive Pressable with Spring Animation
 */
const BouncyCard: React.FC<{
  onPress?: () => void;
  style?: any;
  contentStyle?: any;
  children: React.ReactNode;
  activeScale?: number;
  disabled?: boolean;
}> = ({ onPress, style, contentStyle, children, activeScale = 0.96, disabled = false }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scale, {
      toValue: activeScale,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 8,
    }).start();
  };

  return (
    <AnimatedView style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        disabled={disabled}
        style={contentStyle}
      >
        {children}
      </TouchableOpacity>
    </AnimatedView>
  );
};

/**
 * Subtle Ambient Background Floating Bubble
 */
const AmbientBubble: React.FC<{
  size: number;
  startX: number;
  startY: number;
  duration?: number;
  delay?: number;
}> = ({ size, startX, startY, duration = 4500, delay = 0 }) => {
  const animY = useRef(new Animated.Value(0)).current;
  const animX = useRef(new Animated.Value(0)).current;
  const animScale = useRef(new Animated.Value(0.9)).current;
  const animOpacity = useRef(new Animated.Value(0.12)).current;

  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(animY, {
            toValue: -16,
            duration: duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
            delay,
          }),
          Animated.timing(animX, {
            toValue: 6,
            duration: duration * 0.5,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
            delay,
          }),
          Animated.timing(animScale, {
            toValue: 1.1,
            duration: duration * 0.5,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(animOpacity, {
            toValue: 0.22,
            duration: duration * 0.5,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(animY, {
            toValue: 0,
            duration: duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(animX, {
            toValue: 0,
            duration: duration * 0.5,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(animScale, {
            toValue: 0.9,
            duration: duration * 0.5,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(animOpacity, {
            toValue: 0.12,
            duration: duration * 0.5,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    floatLoop.start();
    return () => floatLoop.stop();
  }, [animY, animX, animScale, animOpacity, duration, delay]);

  return (
    <AnimatedView
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: startX,
        top: startY,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.35)',
        transform: [{ translateY: animY }, { translateX: animX }, { scale: animScale }],
        opacity: animOpacity,
        zIndex: 0,
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: size * 0.18,
          left: size * 0.18,
          width: size * 0.26,
          height: size * 0.26,
          borderRadius: size * 0.13,
          backgroundColor: 'rgba(255, 255, 255, 0.65)',
        }}
      />
    </AnimatedView>
  );
};

interface CustomerCartProps {
  onBack: () => void;
  onCheckoutSuccess: () => void;
}

export const CustomerCartScreen: React.FC<CustomerCartProps> = ({ onBack, onCheckoutSuccess }) => {
  const insets = useSafeAreaInsets();
  const {
    cart,
    addToCart,
    setCartItemWeight,
    clearCart,
    placeOrder,
    currentUser,
    currentTenantId,
    shops,
    activeCoupon,
    applyCoupon,
    removeCoupon,
    initializeAppData,
  } = useAppStore();

  const shop = shops.find((s) => s._id === currentTenantId);
  const isClosed = shop?.isOpen === false;

  useEffect(() => {
    initializeAppData(true);
  }, [initializeAppData]);

  const [selectedPrefs, setSelectedPrefs] = useState<string[]>([]);
  
  const defaultWashPrefs = [
    { id: 'extra_softener', name: 'Extra Fabric Softener', description: 'Delicate lavender scent & plush softness', price: 20, enabled: true },
    { id: 'anti_bacterial', name: 'Anti-Bacterial Sanitization', description: 'Deep hygiene rinse eliminating 99.9% germs', price: 30, enabled: true },
    { id: 'stain_booster', name: 'Stain Remover Booster', description: 'Spot treatment for tough grease & collar marks', price: 40, enabled: true }
  ];
  const availableWashPrefs = (shop?.washPreferences && shop.washPreferences.length > 0 ? shop.washPreferences : defaultWashPrefs).filter(p => p.enabled !== false);
  const activeWashPreferences = availableWashPrefs.filter((wp) => selectedPrefs.includes(wp.id));
  const washPrefsCost = activeWashPreferences.reduce((sum, wp) => sum + wp.price, 0);

  const isKgItem = (c: any) => 
    c.unit === 'KG' || 
    (typeof c.name === 'string' && (c.name.toLowerCase().includes('per kg') || c.name.toLowerCase().includes('/ kg') || c.name.toLowerCase().includes('per-kg'))) || 
    Boolean(c.pricePerKg && c.pricePerKg > 0);

  const isStaffOrBranchAdmin =
    currentUser?.email?.toLowerCase().trim() === 'wowlaundry111@gmail.com' ||
    currentUser?.role === 'SuperAdmin' ||
    currentUser?.role === 'ShopAdmin' ||
    currentUser?.role === 'Operator';

  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInMode, setWalkInMode] = useState<'BRANCH_PICKUP' | 'HOME_DELIVERY'>('BRANCH_PICKUP');
  const [weightInputs, setWeightInputs] = useState<Record<string, string>>({});

  const calculateItemPrice = (c: any) => {
    if (isKgItem(c)) {
      if (c.kgWeight && Number(c.kgWeight) > 0) {
        const rate = Number(c.pricePerKg) || Number(c.price) || 0;
        return Math.round(Number(c.kgWeight) * rate * 100) / 100;
      }
      return 0;
    }
    return (c.price || 0) * (c.quantity || 1);
  };

  const hasKgItems = cart.some(isKgItem);
  const hasUnweighedKgItems = cart.some(c => isKgItem(c) && (!c.kgWeight || Number(c.kgWeight) <= 0));
  const perItemSubtotal = cart.filter(c => !isKgItem(c)).reduce((sum, c) => sum + (c.price || 0) * c.quantity, 0);
  const subtotal = cart.reduce((sum, c) => sum + calculateItemPrice(c), 0);
  const taxPercent = shop?.taxPercent !== undefined ? Number(shop.taxPercent) : 5;
  const shopDeliveryFee = (shop?.deliveryFee !== undefined && shop?.deliveryFee !== null) ? Number(shop.deliveryFee) : 0;
  const isWalkIn = isStaffOrBranchAdmin && walkInMode === 'BRANCH_PICKUP';
  const deliveryFee = isWalkIn ? 0 : (hasUnweighedKgItems ? shopDeliveryFee : (subtotal > 500 ? 0 : shopDeliveryFee));
  const tax = (subtotal * taxPercent) / 100;
  const discount = activeCoupon
    ? Math.min((subtotal * activeCoupon.discountPercent) / 100, activeCoupon.maxDiscount)
    : 0;
  const total = Math.max(0, subtotal + tax + deliveryFee + washPrefsCost - discount);


  // Structured Precise Delivery Address
  const [addrTag, setAddrTag] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [flatNo, setFlatNo] = useState('');
  const [area, setArea] = useState('');
  const [isDetectingLoc, setIsDetectingLoc] = useState(false);

  useEffect(() => {
    if (currentUser?.address) {
      const raw = currentUser.address;
      if (raw.includes('(Work)')) setAddrTag('Work');
      else if (raw.includes('(Other)')) setAddrTag('Other');
      else setAddrTag('Home');

      const clean = raw.replace(/\((Home|Work|Other)\)/, '').trim();
      const parts = clean.split(',').map((p) => p.trim());
      if (parts.length >= 2) {
        setFlatNo(parts[0].replace(/^(Flat|House|Flat\/House|House\/Flat)\s*:?/i, '').trim());
        setArea(parts.slice(1).join(', '));
      } else {
        setArea(clean);
      }
    }
  }, [currentUser]);

  const getComputedAddress = () => {
    if (isStaffOrBranchAdmin && walkInMode === 'BRANCH_PICKUP') {
      return `In-Store Branch Drop-off / Walk-in Counter (${shop?.name || 'Shop Branch'})`;
    }
    const parts = [
      flatNo.trim() ? (flatNo.trim().toLowerCase().startsWith('flat') || flatNo.trim().toLowerCase().startsWith('house') ? flatNo.trim() : `Flat/House: ${flatNo.trim()}`) : '',
      area.trim() ? area.trim() : '',
    ].filter(Boolean);

    if (parts.length === 0) return '';
    return `${parts.join(', ')} (${addrTag})`;
  };

  const [selectedDay, setSelectedDay] = useState('Today');
  const TIME_SLOTS =
    shop?.pickupTimings && shop.pickupTimings.length > 0
      ? shop.pickupTimings
      : ['08:00 AM - 10:00 AM', '10:00 AM - 12:00 PM', '02:00 PM - 04:00 PM', '06:00 PM - 08:00 PM'];
  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[0] || '08:00 AM - 10:00 AM');
  const [isPickupExpanded, setIsPickupExpanded] = useState(false);
  const [isAddonsExpanded, setIsAddonsExpanded] = useState(false);
  const [isItemsExpanded, setIsItemsExpanded] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ type: string; text: string }>({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const cartScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    cartScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  const handleAutoDetect = async () => {
    setIsDetectingLoc(true);
    try {
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          Alert.alert('Unsupported', 'Geolocation is not supported by your browser');
          setIsDetectingLoc(false);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;
              const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
                { headers: { 'User-Agent': 'WoWLaundryApp/1.0' } }
              );
              const data = await res.json();
              if (data && data.address) {
                const addr = data.address;
                const detectedArea = [
                  addr.suburb || addr.neighbourhood || addr.residential || addr.road,
                  addr.city || addr.town || addr.village || addr.county,
                  addr.postcode,
                ].filter(Boolean).join(', ');
                setArea(detectedArea || data.display_name.slice(0, 50));
                if (addr.house_number && !flatNo) {
                  setFlatNo(`House ${addr.house_number}`);
                }
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } else if (data && data.display_name) {
                setArea(data.display_name.slice(0, 60));
              }
            } catch {
              Alert.alert('GPS Notice', 'Failed to resolve address name. Please enter details manually.');
            } finally {
              setIsDetectingLoc(false);
            }
          },
          () => {
            setIsDetectingLoc(false);
            Alert.alert('Permission Denied', 'Location permission was denied in your browser settings.');
          },
          { timeout: 10000, enableHighAccuracy: true }
        );
        return;
      }

      // 1. Check if device location services are enabled
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        Alert.alert(
          'Location Disabled',
          'GPS / Location service is turned off on your device. Please turn it on in your device quick settings to auto-detect your address.',
          [{ text: 'OK' }]
        );
        setIsDetectingLoc(false);
        return;
      }

      // 2. Request permission
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }

      if (status !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'WoW Laundry needs location access to automatically detect your delivery address. Please allow location access in your app settings.'
        );
        setIsDetectingLoc(false);
        return;
      }

      // 3. Obtain Coordinates with timeout & fallback to last known
      let coords: { latitude: number; longitude: number } | null = null;
      try {
        const loc = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
        ]);
        if (loc) {
          coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        }
      } catch {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown) {
          coords = { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude };
        }
      }

      if (!coords) {
        try {
          const fallbackLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
          coords = { latitude: fallbackLoc.coords.latitude, longitude: fallbackLoc.coords.longitude };
        } catch {
          // If lowest accuracy also fails
        }
      }

      if (!coords) {
        throw new Error('Unable to obtain GPS coordinates');
      }

      // 4. Reverse geocode: Dual Strategy (Expo first, Nominatim fallback)
      let resolvedAddress = '';
      try {
        const [geo] = await Location.reverseGeocodeAsync(coords);
        if (geo) {
          const parts = [
            geo.name && geo.name !== geo.street ? geo.name : null,
            geo.street,
            geo.district || geo.subregion,
            geo.city,
            geo.postalCode,
          ].filter(Boolean);
          if (parts.length > 0) {
            resolvedAddress = parts.join(', ');
          }
        }
      } catch (geoErr) {
        console.warn('Expo reverse geocode failed, falling back to OSM:', geoErr);
      }

      if (!resolvedAddress) {
        try {
          const osmRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`,
            { headers: { 'User-Agent': 'WoWLaundryApp/1.0' } }
          );
          const osmData = await osmRes.json();
          if (osmData && osmData.address) {
            const a = osmData.address;
            const parts = [
              a.suburb || a.neighbourhood || a.road || a.residential,
              a.city || a.town || a.village || a.county,
              a.postcode,
            ].filter(Boolean);
            resolvedAddress = parts.join(', ') || osmData.display_name.slice(0, 60);
            if (a.house_number && !flatNo) {
              setFlatNo(`House ${a.house_number}`);
            }
          } else if (osmData && osmData.display_name) {
            resolvedAddress = osmData.display_name.slice(0, 60);
          }
        } catch (osmErr) {
          console.warn('Nominatim reverse geocode failed:', osmErr);
        }
      }

      if (resolvedAddress) {
        setArea(resolvedAddress);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('GPS Located', `Address detected: ${resolvedAddress}`);
      } else {
        setArea(`Location: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
        Alert.alert('GPS Located', 'Coordinates captured! Please complete your street/flat details.');
      }
    } catch (err: any) {
      console.error('GPS detection error:', err);
      Alert.alert(
        'GPS Notice',
        'Could not auto-detect location. Please verify device GPS is enabled, or type your address manually.'
      );
    } finally {
      setIsDetectingLoc(false);
    }
  };

  const handleApplyCoupon = (overrideCode?: string) => {
    const codeToApply = (overrideCode || couponCode || (shop?.promoCode?.isActive ? shop.promoCode.code : '')).trim().toUpperCase();
    if (!codeToApply) {
      setCouponMsg({ type: 'error', text: 'Please enter a promo code' });
      return;
    }
    const res = applyCoupon(codeToApply);
    if (res.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCouponMsg({ type: 'success', text: res.message });
      setCouponCode('');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setCouponMsg({ type: 'error', text: res.message });
    }
  };

  const togglePreference = (prefId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPrefs((prev) =>
      prev.includes(prefId) ? prev.filter((p) => p !== prefId) : [...prev, prefId]
    );
  };

  const handlePlaceOrder = async () => {
    if (isClosed) {
      if (Platform.OS === 'web') alert('This laundry branch is currently closed and not accepting new orders.');
      else Alert.alert('Branch Closed', 'This laundry branch is currently closed and not accepting new orders.');
      return;
    }

    if (isStaffOrBranchAdmin) {
      if (!walkInName.trim()) {
        if (Platform.OS === 'web') alert('Please enter walk-in customer name.');
        else Alert.alert('Missing Name', 'Please enter the walk-in customer\'s full name.');
        return;
      }
      const cleanPhone = walkInPhone.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        if (Platform.OS === 'web') alert('Please enter a valid 10-digit mobile number for the customer.');
        else Alert.alert('Invalid Mobile', 'Please enter a valid 10-digit mobile number for the customer.');
        return;
      }
    }

    const finalAddress = getComputedAddress();
    if (!finalAddress.trim()) {
      if (Platform.OS === 'web') alert('Please enter customer address before proceeding.');
      else Alert.alert('Missing Address', 'Please enter customer address before proceeding.');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const mappedPrefs = activeWashPreferences.map((wp) => ({ name: wp.name, price: wp.price }));
    const pickupSlot = `${selectedDay} | ${selectedSlot}`;
    const result = await placeOrder(
      finalAddress,
      pickupSlot,
      mappedPrefs,
      isStaffOrBranchAdmin ? {
        name: walkInName.trim(),
        phone: walkInPhone.replace(/\D/g, ''),
        address: finalAddress,
        isWalkIn: true,
      } : undefined
    );
    setLoading(false);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onCheckoutSuccess();
    } else {
      if (Platform.OS === 'web') alert(result.message || 'Checkout failed');
      else Alert.alert('Checkout Failed', result.message || 'Checkout failed');
    }
  };

  // ─── Empty Cart Screen ───────────────────────────────────────────────────
  if (cart.length === 0) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" backgroundColor="#061E38" translucent />
        <LinearGradient
          colors={['#061E38', '#0A2B4C', '#0E3A66', '#082340']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerHero, { paddingTop: (insets.top > 0 ? insets.top : 44) + 6 }]}
        >
          <View style={styles.headerTopRow}>
            <BouncyCard onPress={onBack} contentStyle={styles.backBtn}>
              <ArrowLeft size={20} color={COLORS.black} strokeWidth={3} />
            </BouncyCard>
            <Text style={styles.headerTitleText}>CHECKOUT</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Trash2 size={48} color={COLORS.black} strokeWidth={2.5} />
          </View>
          <Text style={styles.emptyTitle}>YOUR CART IS EMPTY</Text>
          <Text style={styles.emptySub}>
            Looks like you haven't added any laundry items to your cart yet.
          </Text>
          <BouncyCard onPress={onBack} contentStyle={styles.startShoppingBtn}>
            <Text style={styles.startShoppingBtnText}>START SHOPPING</Text>
          </BouncyCard>
        </View>
      </View>
    );
  }

  // ─── Filled Cart / Checkout Screen ───────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" backgroundColor="#061E38" translucent />

      {/* Top Overscroll Blue Background Filler */}
      <View style={styles.topOverscrollFiller} />

      <ScrollView
        ref={cartScrollRef}
        keyboardShouldPersistTaps="handled"
        style={styles.scrollArea}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Hero Royal Blue Header with Ambient Bubbles & Wave Curve ─── */}
        <LinearGradient
          colors={['#061E38', '#0A2B4C', '#0E3A66', '#082340']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerHero, { paddingTop: (insets.top > 0 ? insets.top : 44) + 6 }]}
        >
          <AmbientBubble size={16} startX={26} startY={22} duration={4200} delay={0} />
          <AmbientBubble size={22} startX={SCREEN_WIDTH - 60} startY={38} duration={4800} delay={600} />

          <View style={styles.headerTopRow}>
            <BouncyCard onPress={onBack} contentStyle={styles.backBtn}>
              <ArrowLeft size={20} color={COLORS.black} strokeWidth={3} />
            </BouncyCard>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.greetingText}>ORDER REVIEW</Text>
              <Text style={styles.headerTitleText}>Checkout</Text>
            </View>

            <BouncyCard onPress={clearCart} contentStyle={styles.clearBtn}>
              <Text style={styles.clearBtnText}>CLEAR ALL</Text>
            </BouncyCard>
          </View>

          {/* ─── Wave Partition with 2.5px Dark Border ─── */}
          <View style={styles.wavePartitionWrap}>
            <Svg
              width={SCREEN_WIDTH}
              height={32}
              viewBox={`0 0 ${SCREEN_WIDTH} 32`}
              preserveAspectRatio="none"
            >
              <Path
                d={`M 0,0 Q ${SCREEN_WIDTH * 0.5} 32, ${SCREEN_WIDTH} 0 L ${SCREEN_WIDTH} 32 L 0 32 Z`}
                fill="#F8FAFC"
              />
              <Path
                d={`M 0,0 Q ${SCREEN_WIDTH * 0.5} 32, ${SCREEN_WIDTH} 0`}
                stroke="#000000"
                strokeWidth={2.5}
                fill="none"
              />
            </Svg>
          </View>
        </LinearGradient>

        {/* ─── Body Content ─── */}
        <View style={styles.bodyContent}>
          {isClosed && (
            <View style={styles.closedCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <AlertTriangle size={20} color={COLORS.black} strokeWidth={2.5} />
                <Text style={styles.closedCardTitle}>BRANCH CLOSED</Text>
              </View>
              <Text style={styles.closedCardSub}>
                This branch ("{shop?.name || 'WOW Express'}") is currently closed. New orders cannot be placed.
              </Text>
            </View>
          )}

          {/* Staff Walk-In Order Details */}
          {isStaffOrBranchAdmin && (
            <View style={[styles.sectionCard, { backgroundColor: '#FEF08A', borderColor: COLORS.black, borderWidth: 3 }]}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Store size={18} color={COLORS.black} strokeWidth={2.5} />
                  <Text style={[styles.cardHeading, { color: COLORS.black }]}>WALK-IN CUSTOMER DETAILS</Text>
                </View>
                <View style={{ backgroundColor: COLORS.black, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                  <Text style={{ color: '#FEF08A', fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>BRANCH POS</Text>
                </View>
              </View>

              {/* Customer Name */}
              <View style={styles.cartInputGroup}>
                <Text style={styles.cartInputLabel}>CUSTOMER FULL NAME *</Text>
                <TextInput
                  style={[styles.cartInput, { backgroundColor: COLORS.white }]}
                  placeholder="e.g. Ramesh Kumar"
                  placeholderTextColor="#9CA3AF"
                  value={walkInName}
                  onChangeText={setWalkInName}
                />
              </View>

              {/* Customer Phone */}
              <View style={styles.cartInputGroup}>
                <Text style={styles.cartInputLabel}>CUSTOMER PHONE NUMBER (10 DIGITS) *</Text>
                <TextInput
                  style={[styles.cartInput, { backgroundColor: COLORS.white }]}
                  placeholder="e.g. 9876543210"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={walkInPhone}
                  onChangeText={(val) => setWalkInPhone(val.replace(/\D/g, ''))}
                />
              </View>

              {/* Order Mode Switcher */}
              <View style={{ marginTop: 4 }}>
                <Text style={styles.cartInputLabel}>ORDER MODE</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <TouchableOpacity
                    style={[
                      styles.tagPill,
                      { flex: 1, height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
                      walkInMode === 'BRANCH_PICKUP' && styles.tagPillActive,
                    ]}
                    onPress={() => setWalkInMode('BRANCH_PICKUP')}
                    activeOpacity={0.8}
                  >
                    <Store size={14} color={walkInMode === 'BRANCH_PICKUP' ? COLORS.black : '#64748B'} strokeWidth={2.5} />
                    <Text style={[styles.tagPillText, walkInMode === 'BRANCH_PICKUP' && styles.tagPillTextActive]}>
                      IN-STORE (₹0)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.tagPill,
                      { flex: 1, height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
                      walkInMode === 'HOME_DELIVERY' && styles.tagPillActive,
                    ]}
                    onPress={() => setWalkInMode('HOME_DELIVERY')}
                    activeOpacity={0.8}
                  >
                    <Truck size={14} color={walkInMode === 'HOME_DELIVERY' ? COLORS.black : '#64748B'} strokeWidth={2.5} />
                    <Text style={[styles.tagPillText, walkInMode === 'HOME_DELIVERY' && styles.tagPillTextActive]}>
                      HOME DELIVERY
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* 1. Precise Delivery Address Card */}
          <View style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MapPin size={18} color={COLORS.black} strokeWidth={2.5} />
                <Text style={styles.cardHeading}>
                  {isStaffOrBranchAdmin && walkInMode === 'BRANCH_PICKUP' ? 'BRANCH DROP-OFF' : 'DELIVERY ADDRESS'}
                </Text>
              </View>
              {(!isStaffOrBranchAdmin || walkInMode === 'HOME_DELIVERY') && (
                <BouncyCard
                  onPress={handleAutoDetect}
                  disabled={isDetectingLoc}
                  contentStyle={styles.detectBtn}
                >
                  {isDetectingLoc ? (
                    <ActivityIndicator size="small" color={COLORS.black} />
                  ) : (
                    <>
                      <Navigation size={12} color={COLORS.black} strokeWidth={2.5} />
                      <Text style={styles.detectBtnText}>AUTODETECT</Text>
                    </>
                  )}
                </BouncyCard>
              )}
            </View>

            {isStaffOrBranchAdmin && walkInMode === 'BRANCH_PICKUP' ? (
              <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.black }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Store size={15} color="#0D8DE3" strokeWidth={2.5} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.black }}>
                    In-Store Branch Walk-in / Drop-off
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: '#4B5563', marginTop: 4, fontWeight: '700' }}>
                  Order dropped off at {shop?.name || 'the shop branch'}. Customer will collect from branch. No delivery fee applies.
                </Text>
              </View>
            ) : (
              <>
                {/* Address Tag Selector */}
                <View style={styles.tagSelectorRow}>
                  {([
                    { tag: 'Home', label: 'HOME', icon: Home },
                    { tag: 'Work', label: 'WORK', icon: Briefcase },
                    { tag: 'Other', label: 'OTHER', icon: MapPin },
                  ] as const).map(({ tag, label, icon: IconComponent }) => {
                    const isSelected = addrTag === tag;
                    return (
                      <BouncyCard
                        key={tag}
                        style={{ flex: 1 }}
                        contentStyle={[styles.tagPill, isSelected && styles.tagPillActive]}
                        onPress={() => setAddrTag(tag)}
                      >
                        <IconComponent
                          size={12}
                          color={isSelected ? COLORS.black : '#6B7280'}
                          strokeWidth={2.5}
                        />
                        <Text style={[styles.tagPillText, isSelected && styles.tagPillTextActive]}>
                          {label}
                        </Text>
                      </BouncyCard>
                    );
                  })}
                </View>

                {/* Field 1: Flat / House No / Building */}
                <View style={styles.cartInputGroup}>
                  <Text style={styles.cartInputLabel}>HOUSE / FLAT / BUILDING</Text>
                  <TextInput
                    style={styles.cartInput}
                    placeholder="e.g. Flat 402, Palm Heights"
                    placeholderTextColor="#9CA3AF"
                    value={flatNo}
                    onChangeText={setFlatNo}
                  />
                </View>

                {/* Field 2: Area / Street / Landmark */}
                <View style={[styles.cartInputGroup, { marginBottom: 0 }]}>
                  <Text style={styles.cartInputLabel}>AREA, STREET & CITY</Text>
                  <TextInput
                    style={styles.cartInput}
                    placeholder="e.g. 100ft Road, Near Metro, Indiranagar"
                    placeholderTextColor="#9CA3AF"
                    value={area}
                    onChangeText={setArea}
                  />
                </View>
              </>
            )}
          </View>

          {/* 2. Pickup Slot Selector */}
          <View style={styles.sectionCard}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsPickupExpanded(!isPickupExpanded);
              }}
              style={[
                styles.cardHeaderRow,
                { marginBottom: isPickupExpanded ? 10 : 0 },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                <Clock size={18} color={COLORS.black} strokeWidth={2.5} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardHeading}>PICKUP SCHEDULE</Text>
                  <Text style={styles.cardSubheading} numberOfLines={1}>
                    {isPickupExpanded ? 'Tap slot below to confirm' : `${selectedDay} • ${selectedSlot}`}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.selectedSlotBadge, { backgroundColor: isPickupExpanded ? COLORS.black : COLORS.secondary }]}>
                  <Text style={[styles.selectedSlotBadgeText, { color: isPickupExpanded ? COLORS.secondary : COLORS.black }]}>
                    {isPickupExpanded ? 'DONE' : 'CHANGE'}
                  </Text>
                </View>
                {isPickupExpanded ? (
                  <ChevronUp size={16} color={COLORS.black} strokeWidth={3} />
                ) : (
                  <ChevronDown size={16} color={COLORS.black} strokeWidth={3} />
                )}
              </View>
            </TouchableOpacity>

            {/* Collapsible Content */}
            {isPickupExpanded && (
              <View style={{ marginTop: 4, paddingTop: 10, borderTopWidth: 1.5, borderTopColor: '#E5E7EB', borderStyle: 'dashed' }}>
                {/* Day Selector */}
                <View style={styles.daySelectorRow}>
                  {['Today', 'Tomorrow', 'Day After'].map((d) => {
                    const isDaySelected = selectedDay === d;
                    return (
                      <BouncyCard
                        key={d}
                        onPress={() => {
                          setSelectedDay(d);
                          Haptics.selectionAsync();
                        }}
                        contentStyle={[styles.dayPill, isDaySelected && styles.dayPillActive]}
                      >
                        <Text style={[styles.dayPillText, isDaySelected && styles.dayPillTextActive]}>
                          {d}
                        </Text>
                      </BouncyCard>
                    );
                  })}
                </View>

                <View style={styles.timeSlotGrid}>
                  {TIME_SLOTS.map((slot) => {
                    const isSelected = selectedSlot === slot;
                    return (
                      <BouncyCard
                        key={slot}
                        onPress={() => {
                          setSelectedSlot(slot);
                          Haptics.selectionAsync();
                        }}
                        contentStyle={[styles.slotPill, isSelected && styles.slotPillActive]}
                      >
                        <Text style={[styles.slotPillText, isSelected && styles.slotPillTextActive]}>
                          {slot}
                        </Text>
                      </BouncyCard>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* 3. Wash Add-ons & Preferences */}
          {availableWashPrefs.length > 0 && (
            <View style={styles.sectionCard}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsAddonsExpanded(!isAddonsExpanded);
                }}
                style={[
                  styles.cardHeaderRow,
                  { marginBottom: isAddonsExpanded ? 10 : 0 },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Sparkles size={18} color={COLORS.black} strokeWidth={2.5} />
                  <View style={{ flex: 1, paddingRight: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.cardHeading}>WASH ADD-ONS</Text>
                      {selectedPrefs.length > 0 ? (
                        <View style={{ backgroundColor: COLORS.secondary, paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 4, borderWidth: 1, borderColor: COLORS.black }}>
                          <Text style={{ fontSize: 9, fontWeight: '900', color: COLORS.black }}>
                            +{selectedPrefs.length} ACTIVE
                          </Text>
                        </View>
                      ) : (
                        <View style={{ backgroundColor: '#E0F2FE', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 4, borderWidth: 1, borderColor: '#0284C7' }}>
                          <Text style={{ fontSize: 9, fontWeight: '800', color: '#0369A1' }}>OPTIONAL</Text>
                        </View>
                      )}
                    </View>
                    <Text numberOfLines={1} style={styles.cardSubheading}>
                      {selectedPrefs.length > 0
                        ? `${selectedPrefs.length} added (+₹${washPrefsCost}) • Tap to modify`
                        : 'Softener, sanitization & stain treatment'}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {isAddonsExpanded ? (
                    <ChevronUp size={16} color={COLORS.black} strokeWidth={3} />
                  ) : (
                    <ChevronDown size={16} color={COLORS.black} strokeWidth={3} />
                  )}
                </View>
              </TouchableOpacity>

              {isAddonsExpanded && (
                <View style={{ gap: 8, marginTop: 4, paddingTop: 10, borderTopWidth: 1.5, borderTopColor: '#E5E7EB', borderStyle: 'dashed' }}>
                  {availableWashPrefs.map((pref) => {
                    const isSelected = selectedPrefs.includes(pref.id);
                    return (
                      <BouncyCard
                        key={pref.id}
                        onPress={() => togglePreference(pref.id)}
                        contentStyle={[styles.addonRow, isSelected && styles.addonRowActive]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.addonTitle}>{pref.name}</Text>
                          <Text style={styles.addonDesc}>{pref.description}</Text>
                        </View>
                        <View style={[styles.addonPriceBadge, isSelected && styles.addonPriceBadgeActive]}>
                          <Text style={[styles.addonPriceText, isSelected && styles.addonPriceTextActive]}>
                            {isSelected ? 'ADDED' : `+₹${pref.price}`}
                          </Text>
                        </View>
                      </BouncyCard>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* 4. Cart Items Breakdown */}
          <View style={styles.sectionCard}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsItemsExpanded(!isItemsExpanded);
              }}
              style={[
                styles.cardHeaderRow,
                { marginBottom: isItemsExpanded ? 10 : 0 },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.cardHeading}>ORDER ITEMS ({cart.length})</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: COLORS.black, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: '900', color: COLORS.black }}>
                    {isItemsExpanded ? 'HIDE' : 'REVIEW'}
                  </Text>
                </View>
                {isItemsExpanded ? (
                  <ChevronUp size={16} color={COLORS.black} strokeWidth={3} />
                ) : (
                  <ChevronDown size={16} color={COLORS.black} strokeWidth={3} />
                )}
              </View>
            </TouchableOpacity>

            {isItemsExpanded && (
              <View style={{ marginTop: 4, paddingTop: 6, borderTopWidth: 1.5, borderTopColor: '#E5E7EB', borderStyle: 'dashed' }}>
                {cart.map((item, idx) => {
                  const isKg = isKgItem(item);
                  return (
                    <View key={item.itemId}>
                      <View style={styles.cartItemRow}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={styles.cartItemName}>{item.name}</Text>
                          {(item.categoryName || item.subCategoryName) && (
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#64748B', marginTop: 1 }}>
                              {item.categoryName}{item.subCategoryName ? ` › ${item.subCategoryName}` : ''}{item.isBucket ? ' • Bucket' : ''}
                            </Text>
                          )}
                          {item.isBucket && !item.categoryName && (
                            <Text style={{ fontSize: 10, fontWeight: '800', color: COLORS.black, backgroundColor: COLORS.secondary, alignSelf: 'flex-start', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, marginTop: 1 }}>
                              Bucket
                            </Text>
                          )}
                          {isKg ? (
                            <View>
                              <Text style={[styles.cartItemRate, { color: '#0284C7', fontWeight: '800' }]}>
                                {item.pricePerKg ? `₹${item.pricePerKg}/kg · Weighed at delivery` : 'Weighed at delivery'}
                              </Text>
                              {isStaffOrBranchAdmin && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', borderWidth: 1.5, borderColor: COLORS.black, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4, gap: 4, alignSelf: 'flex-start' }}>
                                  <Scale size={11} color={COLORS.black} strokeWidth={2.5} />
                                  <Text style={{ fontSize: 9, fontWeight: '900', color: COLORS.black }}>WT:</Text>
                                  <TextInput
                                    keyboardType="decimal-pad"
                                    placeholder="0.00"
                                    placeholderTextColor="#9CA3AF"
                                    value={weightInputs[item.itemId] !== undefined ? weightInputs[item.itemId] : (item.kgWeight ? String(item.kgWeight) : '')}
                                    onChangeText={(val) => {
                                      const clean = val.replace(/,/g, '.').replace(/[^0-9.]/g, '');
                                      const parts = clean.split('.');
                                      const formatted = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : clean;
                                      setWeightInputs(prev => ({ ...prev, [item.itemId]: formatted }));
                                      const parsed = parseFloat(formatted);
                                      setCartItemWeight(item.itemId, isNaN(parsed) ? 0 : parsed);
                                    }}
                                    style={{ fontSize: 11, fontWeight: '900', color: COLORS.black, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.black, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, minWidth: 44, textAlign: 'center' }}
                                  />
                                  <Text style={{ fontSize: 9, fontWeight: '900', color: COLORS.black }}>KG</Text>
                                </View>
                              )}
                            </View>
                          ) : (
                            <Text style={styles.cartItemRate}>₹{item.price} per unit</Text>
                          )}
                        </View>

                        <View style={styles.cartStepper}>
                          <TouchableOpacity
                            style={styles.cartStepperBtn}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              addToCart(
                                {
                                  _id: item.itemId,
                                  name: item.name,
                                  pricePerItem: item.price,
                                  unit: item.unit,
                                  shopId: currentTenantId || '',
                                  categoryId: '',
                                } as any,
                                -1
                              );
                            }}
                          >
                            <Minus size={12} color={COLORS.black} strokeWidth={3} />
                          </TouchableOpacity>
                          <Text style={styles.cartStepperQty}>{item.quantity}</Text>
                          <TouchableOpacity
                            style={[styles.cartStepperBtn, { backgroundColor: COLORS.secondary }]}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              addToCart(
                                {
                                  _id: item.itemId,
                                  name: item.name,
                                  pricePerItem: item.price,
                                  unit: item.unit,
                                  shopId: currentTenantId || '',
                                  categoryId: '',
                                } as any,
                                1
                              );
                            }}
                          >
                            <Plus size={12} color={COLORS.black} strokeWidth={3} />
                          </TouchableOpacity>
                        </View>

                        <Text style={[styles.cartItemTotal, isKg && { fontSize: 13, color: (item.kgWeight && Number(item.kgWeight) > 0) ? COLORS.black : '#0284C7' }]}>
                          {isKg
                            ? (item.kgWeight && Number(item.kgWeight) > 0
                                ? `₹${Math.round(Number(item.kgWeight) * (Number(item.pricePerKg) || (item as any).baseUnitPrice || Number(item.price) || 0) * 100) / 100}`
                                : (isStaffOrBranchAdmin ? 'Add Wt' : 'Pending'))
                            : `₹${(item.price || 0) * item.quantity}`}
                        </Text>
                      </View>
                      {idx < cart.length - 1 && <View style={styles.itemDivider} />}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* 5. Promo Code & Bill Summary */}
          <View style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Tag size={16} color={COLORS.black} strokeWidth={2.5} />
                <Text style={styles.cardHeading}>PROMO CODE</Text>
              </View>
              {activeCoupon && (
                <View style={{ backgroundColor: COLORS.secondary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: COLORS.black }}>
                  <Text style={{ fontSize: 9, fontWeight: '900', color: COLORS.black }}>ACTIVE</Text>
                </View>
              )}
            </View>

            {activeCoupon ? (
              <View style={styles.activeCouponBanner}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <CheckCircle2 size={16} color={COLORS.black} strokeWidth={3} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activeCouponText}>{activeCoupon.code} APPLIED</Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#1F2937' }}>
                      {activeCoupon.discountPercent}% OFF applied to order
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    removeCoupon();
                    setCouponMsg({ type: '', text: '' });
                  }}
                  style={styles.removeCouponBtn}
                >
                  <Text style={styles.removeCouponBtnText}>REMOVE</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Available Offer Banner (Tap to autofill & apply, NO duplicate button) */}
                {shop?.promoCode?.isActive && shop?.promoCode?.code ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleApplyCoupon(shop.promoCode.code)}
                    style={styles.shopPromoQuickCard}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Tag size={13} color="#0284C7" strokeWidth={3} />
                        <Text style={styles.shopPromoCodeText}>{shop.promoCode.code}</Text>
                        <View style={styles.shopPromoBadge}>
                          <Text style={styles.shopPromoBadgeText}>{shop.promoCode.discountPercent}% OFF</Text>
                        </View>
                      </View>
                      <Text numberOfLines={1} style={styles.shopPromoSubtext}>
                        {shop.promoCode.description || `Min order ₹${shop.promoCode.minOrderValue || 0}, max ₹${shop.promoCode.maxDiscount || 'unlimited'}`}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: COLORS.secondary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: COLORS.black }}>
                      <Text style={{ fontSize: 9, fontWeight: '900', color: COLORS.black }}>TAP TO USE</Text>
                    </View>
                  </TouchableOpacity>
                ) : null}

                {/* Single unified Apply Row */}
                <View style={styles.couponRow}>
                  <TextInput
                    style={styles.couponInput}
                    placeholder={shop?.promoCode?.isActive && shop?.promoCode?.code ? `e.g. ${shop.promoCode.code}` : "ENTER COUPON CODE"}
                    placeholderTextColor="#9CA3AF"
                    value={couponCode}
                    onChangeText={(t) => setCouponCode(t.toUpperCase())}
                    autoCapitalize="characters"
                  />
                  <BouncyCard onPress={() => handleApplyCoupon()} contentStyle={styles.applyCouponBtn}>
                    <Text style={styles.applyCouponText}>APPLY</Text>
                  </BouncyCard>
                </View>
              </>
            )}

            {couponMsg.text ? (
              <Text
                style={[
                  styles.couponFeedback,
                  { color: couponMsg.type === 'success' ? '#16A34A' : '#DC2626' },
                ]}
              >
                {couponMsg.text}
              </Text>
            ) : null}

            <View style={styles.billDivider} />

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Items Subtotal</Text>
              <Text style={styles.billVal}>
                {subtotal > 0 ? `₹${subtotal}` : (hasUnweighedKgItems ? 'Pending Weighing' : '₹0')}
              </Text>
            </View>
            {hasUnweighedKgItems && (
              <View style={[styles.billRow, { backgroundColor: '#EFF6FF', padding: 8, borderRadius: 8, marginTop: 4 }]}>
                <Text style={[styles.billLabel, { color: '#0284C7', fontWeight: '800' }]}>KG Clothes</Text>
                <Text style={[styles.billVal, { color: '#0284C7', fontWeight: '800' }]}>Weighed at delivery</Text>
              </View>
            )}
            {washPrefsCost > 0 && (
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Wash Add-ons</Text>
                <Text style={styles.billVal}>+₹{washPrefsCost}</Text>
              </View>
            )}
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Delivery Fee</Text>
              <Text style={styles.billVal}>
                {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
              </Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Taxes & Fees</Text>
              <Text style={styles.billVal}>₹{tax.toFixed(0)}</Text>
            </View>
            {activeCoupon && (
              <View style={[styles.billRow, { backgroundColor: '#DCFCE7', padding: 6, borderRadius: 6 }]}>
                <Text style={[styles.billLabel, { color: '#16A34A', fontWeight: '800' }]}>Promo ({activeCoupon.code})</Text>
                <Text style={[styles.billVal, { color: '#16A34A', fontWeight: '800' }]}>
                  {discount > 0 ? `-₹${discount.toFixed(0)}` : `${activeCoupon.discountPercent}% OFF (At weighing)`}
                </Text>
              </View>
            )}

            <View style={styles.grandTotalDivider} />

            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>TO PAY</Text>
              <Text style={styles.grandTotalVal}>
                {hasUnweighedKgItems ? 'Pending Calculation' : `₹${total.toFixed(0)}`}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Place Order Action Bar */}
      <View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, 12) + 6 }]}>
        <BouncyCard
          onPress={handlePlaceOrder}
          disabled={loading || isClosed}
          contentStyle={[styles.placeOrderBtn, isClosed && { backgroundColor: '#9CA3AF' }]}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.black} size="small" />
          ) : (
            <>
              <View>
                <Text style={styles.placeOrderMainText}>
                  {isClosed ? 'BRANCH CLOSED' : 'PLACE ORDER'}
                </Text>
                <Text style={styles.placeOrderSubText}>
                  {cart.length} Item{cart.length > 1 ? 's' : ''} · {hasUnweighedKgItems ? 'Pay After Weighing' : 'Standard Delivery'}
                </Text>
              </View>
              <View style={styles.totalPill}>
                <Text style={styles.totalPillText}>
                  {hasUnweighedKgItems ? 'Pay After Weighing →' : `₹${total.toFixed(0)} →`}
                </Text>
              </View>
            </>
          )}
        </BouncyCard>
      </View>

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topOverscrollFiller: {
    position: 'absolute',
    top: -1000,
    left: 0,
    right: 0,
    height: 1000,
    backgroundColor: '#061E38',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  headerHero: {
    paddingHorizontal: SPACING.mobile,
    paddingBottom: 54,
    overflow: 'hidden',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    zIndex: 1,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
    ...NEO_SHADOW.box2,
  },
  greetingText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: '#90CAF9',
    letterSpacing: 0.8,
  },
  headerTitleText: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  clearBtn: {
    backgroundColor: COLORS.secondary,
    borderWidth: 2,
    borderColor: COLORS.black,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    ...NEO_SHADOW.box2,
  },
  clearBtnText: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    letterSpacing: 0.5,
  },
  wavePartitionWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 32,
  },
  bodyContent: {
    paddingHorizontal: SPACING.mobile,
    paddingTop: SPACING.md,
    gap: SPACING.md,
  },
  closedCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#DC2626',
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    ...NEO_SHADOW.box4,
  },
  closedCardTitle: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  closedCardSub: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7F1D1D',
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    ...NEO_SHADOW.box4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeading: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    letterSpacing: 0.6,
  },
  cardSubheading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 2,
  },
  detectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.secondary,
    borderWidth: 1.5,
    borderColor: COLORS.black,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
  },
  detectBtnText: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    letterSpacing: 0.5,
  },
  tagSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  tagPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: COLORS.black,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  tagPillActive: {
    backgroundColor: COLORS.secondary,
    ...NEO_SHADOW.box2,
  },
  tagPillText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: '#6B7280',
  },
  tagPillTextActive: {
    color: COLORS.black,
  },
  cartInputGroup: {
    marginBottom: 10,
  },
  cartInputLabel: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cartInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: COLORS.black,
    borderRadius: RADIUS.md,
    padding: 10,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.black,
  },
  timeSlotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  slotPill: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: COLORS.black,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  slotPillActive: {
    backgroundColor: COLORS.secondary,
    ...NEO_SHADOW.box2,
  },
  slotPillText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'Outfit_800ExtraBold',
    color: '#4B5563',
  },
  slotPillTextActive: {
    color: COLORS.black,
  },
  addonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: RADIUS.lg,
    padding: 10,
  },
  addonRowActive: {
    borderColor: COLORS.black,
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    ...NEO_SHADOW.box2,
  },
  addonTitle: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
  },
  addonDesc: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 2,
  },
  addonPriceBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.black,
  },
  addonPriceBadgeActive: {
    backgroundColor: COLORS.secondary,
  },
  addonPriceText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
  },
  addonPriceTextActive: {
    color: COLORS.black,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
  },
  cartItemRate: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 1,
  },
  cartStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 14,
    borderWidth: 1.5,
    borderColor: COLORS.black,
    borderRadius: RADIUS.sm,
    backgroundColor: '#F3F4F6',
    padding: 2,
  },
  cartStepperBtn: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartStepperQty: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    minWidth: 14,
    textAlign: 'center',
  },
  cartItemTotal: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    minWidth: 45,
    textAlign: 'right',
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  couponRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  couponInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: COLORS.black,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
  },
  applyCouponBtn: {
    backgroundColor: COLORS.secondary,
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...NEO_SHADOW.box2,
  },
  applyCouponText: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
  },
  couponFeedback: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  billDivider: {
    height: 1.5,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  billLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  billVal: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.black,
  },
  grandTotalDivider: {
    height: 2,
    backgroundColor: COLORS.black,
    marginVertical: 8,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    letterSpacing: 0.5,
  },
  grandTotalVal: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopWidth: 2,
    borderTopColor: COLORS.black,
    paddingHorizontal: SPACING.mobile,
    paddingTop: 10,
    zIndex: 100,
  },
  placeOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.black,
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: RADIUS.xl,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    ...NEO_SHADOW.boxLime4,
  },
  placeOrderMainText: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.white,
    letterSpacing: 0.6,
  },
  placeOrderSubText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    marginTop: 2,
  },
  totalPill: {
    backgroundColor: COLORS.secondary,
    borderWidth: 1.5,
    borderColor: COLORS.black,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  totalPillText: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...NEO_SHADOW.box4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  startShoppingBtn: {
    backgroundColor: COLORS.secondary,
    borderWidth: 2,
    borderColor: COLORS.black,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: RADIUS.xl,
    ...NEO_SHADOW.box4,
  },
  startShoppingBtnText: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    letterSpacing: 0.5,
  },
  daySelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  dayPill: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.black,
    borderRadius: RADIUS.md,
  },
  dayPillActive: {
    backgroundColor: COLORS.black,
    ...NEO_SHADOW.box2,
  },
  dayPillText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'Outfit_700Bold',
    color: COLORS.black,
    textTransform: 'uppercase',
  },
  dayPillTextActive: {
    color: '#B0FF49',
  },
  selectedSlotBadge: {
    backgroundColor: COLORS.black,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  selectedSlotBadgeText: {
    fontSize: 10,
    fontFamily: 'Outfit_800ExtraBold',
    color: '#B0FF49',
  },
  shopPromoQuickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: COLORS.black,
    borderRadius: RADIUS.md,
    padding: 10,
    marginTop: 6,
    marginBottom: 8,
    ...NEO_SHADOW.box2,
  },
  shopPromoCodeText: {
    fontSize: 12,
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    letterSpacing: 0.3,
  },
  shopPromoBadge: {
    backgroundColor: '#B0FF49',
    borderWidth: 1,
    borderColor: COLORS.black,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  shopPromoBadgeText: {
    fontSize: 9,
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
  },
  shopPromoSubtext: {
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
    color: '#475569',
    marginTop: 2,
  },
  shopPromoApplyBtn: {
    backgroundColor: COLORS.black,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.black,
  },
  shopPromoApplyBtnText: {
    fontSize: 9,
    fontFamily: 'Outfit_800ExtraBold',
    color: '#B0FF49',
    letterSpacing: 0.3,
  },
  activeCouponBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#DCFCE7',
    borderWidth: 1.5,
    borderColor: COLORS.black,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 8,
    ...NEO_SHADOW.box2,
  },
  activeCouponText: {
    fontSize: 11,
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    letterSpacing: 0.3,
  },
  removeCouponBtn: {
    backgroundColor: COLORS.black,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  removeCouponBtnText: {
    fontSize: 9,
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
});
