import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  Linking,
  TextInput,
  RefreshControl,
  Alert,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import {
  User,
  Clock,
  ChevronRight,
  Truck,
  MapPin,
  X,
  Phone,
  MessageCircle,
  Download,
  CheckCircle,
  ClipboardList,
  Filter,
  CreditCard,
  Sparkles,
  Package,
  Scale,
  Trash2,
  Banknote,
  Smartphone,
  AlertTriangle,
  Wifi,
} from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS, TYPO, NEO_SHADOW } from '../../components/Theme';
import { StatusBadge } from '../../components/UIPack';
import { useAppStore } from '../../store/useAppStore';
import { downloadOrdersCsv } from '../../utils/exportCsv';
import type { Order, OrderStatus } from '../../types';

const formatCatTitle = (it: any) => {
  const cat = (it?.categoryName || '').trim();
  const sub = (it?.subCategoryName || '').trim();
  if (cat && sub && cat.toLowerCase() !== sub.toLowerCase()) {
    return `${cat.toUpperCase()} › ${sub.toUpperCase()}`;
  }
  if (cat) return cat.toUpperCase();
  if (sub) return sub.toUpperCase();
  return 'GENERAL LAUNDRY';
};

const FILTERS: {
  key: 'new' | 'washing' | 'delivery' | 'history';
  label: string;
  statuses: OrderStatus[];
}[] = [
  { key: 'new', label: 'New Orders', statuses: ['PLACED', 'ACCEPTED', 'PICKUP_ASSIGNED'] },
  { key: 'washing', label: 'In Wash Cycle', statuses: ['PICKED_UP', 'WASHING', 'IRONING'] },
  {
    key: 'delivery',
    label: 'Out for Delivery',
    statuses: ['OUT_FOR_DELIVERY'],
  },
  { key: 'history', label: 'History', statuses: ['DELIVERED'] },
];

const isKgCheck = (it: any) =>
  it?.unit === 'KG' ||
  (typeof it?.name === 'string' && (it.name.toLowerCase().includes('per kg') || it.name.toLowerCase().includes('/ kg'))) ||
  Boolean(it?.kgWeight && it.kgWeight > 0);

interface WeighKgModalProps {
  visible: boolean;
  order: Order | null;
  catalogItems: any[];
  shops: any[];
  onClose: () => void;
  onConfirm: (weights: { itemId: string; kgWeight: number }[], markPickedUp?: boolean) => Promise<void>;
}

const WeighKgModal: React.FC<WeighKgModalProps> = ({
  visible,
  order,
  catalogItems,
  shops,
  onClose,
  onConfirm,
}) => {
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (order) {
      const initial: Record<string, string> = {};
      (order.items || []).forEach((it) => {
        if (isKgCheck(it)) {
          initial[it.itemId] = (it.kgWeight !== undefined && it.kgWeight !== null && it.kgWeight > 0) ? String(it.kgWeight) : '1.0';
        }
      });
      setWeights(initial);
    }
  }, [order]);

  if (!order || !visible) return null;

  const kgItems = (order.items || []).filter(isKgCheck);

  const calculateLiveTotal = () => {
    let sum = 0;
    kgItems.forEach((it) => {
      const catItem = (catalogItems || []).find((c) => String(c._id) === String(it.itemId) || c.name === it.name);
      const rate = catItem?.pricePerKg || (it.unit === 'KG' && it.price > 0 && !it.kgWeight ? it.price : 0) || 60;
      const w = parseFloat(weights[it.itemId] || '0') || 0;
      sum += w * rate;
    });
    return sum;
  };

  const handleSave = async (andConfirmPickup = false) => {
    setSubmitting(true);
    const payload = kgItems.map((it) => ({
      itemId: it.itemId,
      kgWeight: parseFloat(weights[it.itemId] || '0') || 0,
    }));
    await onConfirm(payload, andConfirmPickup);
    setSubmitting(false);
    onClose();
  };

  const shop = (shops || []).find((s) => s._id === order.shopId);
  const kgTotal = calculateLiveTotal();
  const perItemSubtotal = (order.items || [])
    .filter((it) => !isKgCheck(it))
    .reduce((s, it) => s + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
  const itemSubtotal = kgTotal + perItemSubtotal;

  let liveDiscount = Number(order.discountAmount) || 0;
  if (order.couponCode) {
    const discountPercent = Number(order.couponDiscountPercent) || (shop?.promoCode?.code?.toUpperCase() === order.couponCode?.toUpperCase() ? Number(shop.promoCode.discountPercent) : 0);
    const maxDiscount = order.couponMaxDiscount !== undefined ? Number(order.couponMaxDiscount) : (shop?.promoCode?.maxDiscount !== undefined ? Number(shop.promoCode.maxDiscount) : Infinity);
    const minOrder = Number(order.couponMinOrderValue) || Number(shop?.promoCode?.minOrderValue) || 0;

    if (discountPercent > 0) {
      if (itemSubtotal >= minOrder) {
        liveDiscount = Math.min((itemSubtotal * discountPercent) / 100, maxDiscount);
        liveDiscount = Math.round(liveDiscount * 100) / 100;
      } else {
        liveDiscount = 0;
      }
    }
  }

  const prefsTotal = (order.washPreferences && order.washPreferences.length > 0)
    ? order.washPreferences.reduce((sum: number, p: any) => sum + (p.price || 0), 0)
    : 0;
  const taxPercent = shop?.taxPercent !== undefined ? Number(shop.taxPercent) : 0;
  const taxAmt = Math.round((itemSubtotal * taxPercent / 100) * 100) / 100;
  const deliveryAmt = order.deliveryFee !== undefined ? Number(order.deliveryFee) : Number(shop?.deliveryFee || 0);
  const grandTotal = Math.max(0, Math.round((itemSubtotal + taxAmt + deliveryAmt - liveDiscount + prefsTotal) * 100) / 100);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.modalContent, { maxHeight: '90%' }]}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalPreHeading}>ADMIN PICKUP & SCALE</Text>
                <Text style={styles.modalHeading}>WEIGH & CALCULATE PRICE</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
                <X size={22} color={COLORS.black} strokeWidth={3} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: '#4B5563', marginBottom: 12, fontWeight: '700' }}>
              Enter physical scale weight. Prices and totals recalculate live on your screen.
            </Text>

            {kgItems.map((it) => {
              const catItem = (catalogItems || []).find((c) => String(c._id) === String(it.itemId) || c.name === it.name);
              const rate = catItem?.pricePerKg || (it.unit === 'KG' && it.price > 0 && !it.kgWeight ? it.price : 0) || 60;
              const w = parseFloat(weights[it.itemId] || '0') || 0;
              const lineTotal = Math.round(w * rate * 100) / 100;

              return (
                <View key={it.itemId} style={styles.weighRowCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: COLORS.black }}>{it.name}</Text>
                      {(it.categoryName || it.subCategoryName) && (
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B', marginTop: 1 }}>
                          {it.categoryName}{it.subCategoryName ? ` › ${it.subCategoryName}` : ''}{it.isBucket ? ' • Bucket' : ''}
                        </Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '900', color: '#0369A1' }}>₹{rate}/KG</Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
                    <View style={styles.weighStepperWrap}>
                      <TouchableOpacity
                        onPress={() => {
                          const curr = parseFloat(weights[it.itemId] || '0') || 0;
                          const next = Math.max(0, Math.round((curr - 0.5) * 10) / 10);
                          setWeights((p) => ({ ...p, [it.itemId]: next.toFixed(1) }));
                        }}
                        style={styles.weighStepperBtn}
                      >
                        <Text style={styles.weighStepperBtnText}>-0.5</Text>
                      </TouchableOpacity>
                      <TextInput
                        keyboardType="decimal-pad"
                        style={styles.weighInput}
                        value={weights[it.itemId] || '1.0'}
                        onChangeText={(t) => setWeights((p) => ({ ...p, [it.itemId]: t }))}
                      />
                      <Text style={{ fontWeight: '800', fontSize: 12, color: '#6B7280' }}>KG</Text>
                      <TouchableOpacity
                        onPress={() => {
                          const curr = parseFloat(weights[it.itemId] || '0') || 0;
                          const next = Math.round((curr + 0.5) * 10) / 10;
                          setWeights((p) => ({ ...p, [it.itemId]: next.toFixed(1) }));
                        }}
                        style={styles.weighStepperBtn}
                      >
                        <Text style={styles.weighStepperBtnText}>+0.5</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={{ fontSize: 15, fontWeight: '900', color: COLORS.black, marginLeft: 'auto' }}>
                      = ₹{lineTotal}
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Live Recalculation Preview Card */}
            <View style={styles.weighLiveCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#166534' }}>Weighed KG Subtotal:</Text>
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#166534' }}>+₹{Math.round(kgTotal * 100) / 100}</Text>
              </View>
              {perItemSubtotal > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#374151' }}>Piece Items:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#374151' }}>₹{perItemSubtotal}</Text>
                </View>
              )}
              {liveDiscount > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803D' }}>
                    Promo ({order.couponCode || 'Coupon'}):
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '900', color: '#15803D' }}>-₹{liveDiscount}</Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTopWidth: 1, borderColor: '#BBF7D0' }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: COLORS.black }}>New Grand Total:</Text>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0369A1' }}>₹{grandTotal}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity style={[styles.weighBtn, { backgroundColor: '#F3F4F6' }]} onPress={onClose} disabled={submitting}>
                <Text style={[styles.weighBtnText, { color: COLORS.black }]}>SAVE WEIGHT</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.weighBtn, { backgroundColor: '#B0FF49', flex: 1.6 }]}
                onPress={() => handleSave(true)}
                disabled={submitting}
              >
                <Text style={[styles.weighBtnText, { color: COLORS.black }]}>
                  {submitting ? 'SAVING...' : 'SAVE & MARK PICKED UP'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

interface AdminPaymentModalProps {
  visible: boolean;
  order: Order | null;
  qrValue: string | null;
  onClose: () => void;
  onPay: (mode: 'UPI' | 'COD') => Promise<void>;
}

const AdminPaymentModal: React.FC<AdminPaymentModalProps> = ({
  visible,
  order,
  qrValue,
  onClose,
  onPay,
}) => {
  const [paying, setPaying] = useState(false);

  if (!order || !visible) return null;

  const dynamicQr = qrValue
    ? (qrValue.includes('&am=') ? qrValue : `${qrValue}&am=${order.totalAmount.toFixed(2)}&tn=LaundryPayment`)
    : null;

  const handlePay = async (mode: 'UPI' | 'COD') => {
    setPaying(true);
    await onPay(mode);
    setPaying(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.modalContent, { maxHeight: '90%', paddingBottom: 24 }]}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={styles.payModalHeader}>
              <View>
                <Text style={styles.modalPreHeading}>ADMIN CHECKOUT</Text>
                <Text style={styles.modalHeading}>COLLECT PAYMENT</Text>
                <Text style={styles.payOrderId}>
                  Order #{order._id.slice(-6).toUpperCase()} · {order.customerName}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn} disabled={paying}>
                <X size={20} color={COLORS.black} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Amount Badge */}
            <View style={styles.amountBadge}>
              <Text style={styles.amountLabel}>TOTAL AMOUNT DUE</Text>
              <Text style={styles.amountValue}>₹{order.totalAmount.toFixed(2)}</Text>
            </View>

            {/* QR Code Section */}
            {dynamicQr ? (
              <View style={styles.qrSection}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
                  <Smartphone size={18} color={COLORS.black} strokeWidth={2.5} />
                  <Text style={styles.qrInstruction}>
                    Scan and pay via any UPI app
                  </Text>
                </View>
                <View style={styles.qrBox}>
                  <QRCode
                    value={dynamicQr}
                    size={190}
                    backgroundColor="white"
                    color={COLORS.black}
                  />
                </View>
                <Text style={styles.qrHint}>UPI · Google Pay · PhonePe · Paytm</Text>
              </View>
            ) : (
              <View style={styles.noUpiBox}>
                <AlertTriangle size={24} color={COLORS.black} strokeWidth={2.5} style={{ marginBottom: 4 }} />
                <Text style={styles.noUpiText}>UPI not configured for this branch</Text>
                <Text style={styles.noUpiSub}>Collect cash from customer or set UPI ID in Shop Settings</Text>
              </View>
            )}

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>SELECT PAYMENT MODE</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Payment Action Buttons */}
            <View style={styles.payBtnsRow}>
              {/* Cash */}
              <TouchableOpacity
                style={[styles.payBtn, styles.payBtnCash]}
                onPress={() => handlePay('COD')}
                disabled={paying}
              >
                {paying ? (
                  <ActivityIndicator color={COLORS.black} size="small" />
                ) : (
                  <>
                    <Banknote size={22} color={COLORS.black} strokeWidth={2.5} />
                    <Text style={[styles.payBtnText, { color: COLORS.black }]}>
                      CASH{'\n'}COLLECTED
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Online / UPI */}
              <TouchableOpacity
                style={[styles.payBtn, styles.payBtnOnline]}
                onPress={() => handlePay('UPI')}
                disabled={paying}
              >
                {paying ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <>
                    <Wifi size={22} color={COLORS.white} strokeWidth={2.5} />
                    <Text style={[styles.payBtnText, { color: COLORS.white }]}>
                      ONLINE{'\n'}PAID
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export const AdminOrdersScreen: React.FC = () => {
  const {
    orders,
    users,
    shops,
    items,
    currentTenantId,
    currentUser,
    updateOrderStatus,
    assignDeliveryBoy,
    updateOrderAdminDetails,
    updateKgWeight,
    deleteOrder,
    fetchOrders,
  } = useAppStore();

  const [activeFilter, setActiveFilter] = useState<'new' | 'washing' | 'delivery' | 'history'>('new');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [assignModalOrder, setAssignModalOrder] = useState<Order | null>(null);
  const [weighModalOrder, setWeighModalOrder] = useState<Order | null>(null);
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);

  const handlePaymentConfirm = async (mode: 'UPI' | 'COD') => {
    if (!paymentModalOrder) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await updateOrderStatus(paymentModalOrder._id, 'DELIVERED', mode, 'SUCCESS');
      if (selectedOrder && selectedOrder._id === paymentModalOrder._id) {
        setSelectedOrder(null);
      }
      setPaymentModalOrder(null);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to complete payment and delivery');
    }
  };

  const [editPrice, setEditPrice] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const modalCustomer = selectedOrder ? users.find((u) => u._id === selectedOrder.customerId) : null;
  const modalCustomerName = modalCustomer?.name || selectedOrder?.customerName || 'Customer';
  const modalCustomerPhone = modalCustomer?.phone || selectedOrder?.customerPhone || '';

  const itemsByCat = useMemo(() => {
    if (!selectedOrder?.items) return {};
    return selectedOrder.items.reduce((acc: Record<string, any[]>, it: any) => {
      const title = formatCatTitle(it);
      if (!acc[title]) acc[title] = [];
      acc[title].push(it);
      return acc;
    }, {});
  }, [selectedOrder]);

  const activeShopId = currentTenantId || currentUser?.shopId || '';
  const rawTenantOrders = activeShopId
    ? orders.filter((o) => o.shopId === activeShopId)
    : orders;

  const tenantOrders = useMemo(() => {
    const seen = new Set<string>();
    return (rawTenantOrders || []).filter((o) => {
      if (!o || !o._id || seen.has(o._id)) return false;
      seen.add(o._id);
      return true;
    });
  }, [rawTenantOrders]);

  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price_high' | 'price_low' | 'customer'>('newest');

  const currentFilterConfig = FILTERS.find((f) => f.key === activeFilter) || FILTERS[0];
  const filteredOrders = tenantOrders.filter((o) =>
    currentFilterConfig.statuses.includes(o.status)
  );

  const sortedOrders = useMemo(() => {
    const list = [...filteredOrders];
    if (sortBy === 'newest') {
      return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }
    if (sortBy === 'oldest') {
      return list.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    }
    if (sortBy === 'price_high') {
      return list.sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0));
    }
    if (sortBy === 'price_low') {
      return list.sort((a, b) => (a.totalAmount || 0) - (b.totalAmount || 0));
    }
    if (sortBy === 'customer') {
      return list.sort((a, b) => {
        const nameA = (users.find(u => u._id === a.customerId)?.name || a.customerName || '').toLowerCase();
        const nameB = (users.find(u => u._id === b.customerId)?.name || b.customerName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }
    return list;
  }, [filteredOrders, sortBy, users]);

  const deliveryBoys = users.filter(
    (u) => u.role === 'Delivery' && (!activeShopId || !u.shopId || u.shopId === activeShopId)
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchOrders(1);
    setRefreshing(false);
  }, [fetchOrders]);

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await updateOrderStatus(orderId, status);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update order status');
    }
  };

  const handleOpenOrderModal = (order: Order) => {
    setSelectedOrder(order);
    setEditPrice(order.totalAmount ? String(order.totalAmount) : '');
    setEditNotes(order.adminNotes || '');
  };

  const handleSaveDetails = async () => {
    if (!selectedOrder) return;
    const priceNum = parseFloat(editPrice);
    await updateOrderAdminDetails(selectedOrder._id, {
      totalAmount: isNaN(priceNum) ? undefined : priceNum,
      adminNotes: editNotes,
    });
    setSelectedOrder(null);
  };

  const handleAssignBoy = async (orderId: string, boyId: string) => {
    try {
      await assignDeliveryBoy(orderId, boyId);
      setAssignModalOrder(null);
      Alert.alert('Assigned', 'Delivery staff assigned successfully!');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to assign delivery staff');
    }
  };

  const handleDeleteOrder = (order: Order | null) => {
    if (!order) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const orderNum = order._id.slice(-6).toUpperCase();
    Alert.alert(
      'Delete Order Permanently',
      `Are you sure you want to permanently delete order #${orderNum} from the system?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Order',
          style: 'destructive',
          onPress: async () => {
            setIsDeletingOrder(true);
            try {
              const res = await deleteOrder(order._id);
              if (res.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                if (selectedOrder && selectedOrder._id === order._id) {
                  setSelectedOrder(null);
                }
                Alert.alert('Order Deleted', `Order #${orderNum} has been permanently deleted from the system.`);
              } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('Error', res.message || 'Failed to delete order.');
              }
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete order.');
            } finally {
              setIsDeletingOrder(false);
            }
          },
        },
      ]
    );
  };

  const handleExport = () => {
    downloadOrdersCsv(tenantOrders, 'All_Time', users);
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>ORDER BOARD</Text>
          <Text style={styles.subHeading}>{tenantOrders.length} TOTAL ORDERS</Text>
        </View>

        <TouchableOpacity style={styles.exportBtn} onPress={handleExport} activeOpacity={0.85}>
          <Download size={16} color={COLORS.black} strokeWidth={3} />
          <Text style={styles.exportBtnText}>EXPORT</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabsWrap}
        >
          {FILTERS.map((f) => {
            const count = tenantOrders.filter((o) => f.statuses.includes(o.status)).length;
            const isActive = activeFilter === f.key;

            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                activeOpacity={0.8}
                onPress={() => setActiveFilter(f.key)}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {f.label}
                </Text>
                <View style={[styles.filterCountBadge, isActive && styles.filterCountBadgeActive]}>
                  <Text style={[styles.filterCountText, isActive && styles.filterCountTextActive]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Sort Pills Selector Bar (Only shown in History panel) */}
      {activeFilter === 'history' && (
        <View style={styles.sortBarContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sortBarContent}
          >
            <View style={styles.sortLabelBox}>
              <Filter size={13} color={COLORS.black} strokeWidth={2.5} />
              <Text style={styles.sortLabelText}>SORT BY:</Text>
            </View>
            {[
              { id: 'newest', label: 'Latest' },
              { id: 'oldest', label: 'Oldest' },
              { id: 'price_high', label: 'Price High' },
              { id: 'price_low', label: 'Price Low' },
              { id: 'customer', label: 'Customer A-Z' },
            ].map((s) => {
              const isActive = sortBy === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSortBy(s.id as any);
                  }}
                  activeOpacity={0.8}
                  style={[styles.sortPill, isActive && styles.sortPillActive]}
                >
                  <Text style={[styles.sortPillText, isActive && styles.sortPillTextActive]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Orders List */}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {sortedOrders.map((order) => {
          const customer = users.find((u) => u._id === order.customerId);
          const customerName = customer?.name || order.customerName || 'Customer';
          const customerPhone = customer?.phone || order.customerPhone || '';
          const assignedBoy = users.find((u) => u._id === order.deliveryBoyId);

          return (
            <TouchableOpacity
              key={order._id}
              style={styles.orderCard}
              activeOpacity={0.9}
              onPress={() => handleOpenOrderModal(order)}
            >
              {/* Top Row: Order ID + Status & Delete */}
              <View style={styles.orderCardTop}>
                <View style={styles.orderIdBadge}>
                  <Text style={styles.orderIdText}>
                    #{order._id.slice(-6).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <StatusBadge status={order.status} />
                  <TouchableOpacity
                    onPress={() => handleDeleteOrder(order)}
                    style={styles.cardDeleteBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={13} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Customer Row */}
              <View style={styles.customerRow}>
                <View style={styles.customerAvatar}>
                  <Text style={styles.customerAvatarText}>
                    {customerName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.customerName}>{customerName}</Text>
                  {customerPhone ? (
                    <Text style={styles.customerPhone}>+91 {customerPhone}</Text>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.orderTotal}>₹{order.totalAmount || 0}</Text>
                  {(() => {
                    const isKgCheck = (it: any) => it.unit === 'KG' || (typeof it.name === 'string' && (it.name.toLowerCase().includes('per kg') || it.name.toLowerCase().includes('/ kg'))) || Boolean(it.kgWeight && it.kgWeight > 0);
                    const hasKg = order.items?.some(isKgCheck);
                    if (!hasKg) return null;
                    return (
                      <View style={{ backgroundColor: order.kgPriceUpdated ? '#DCFCE7' : '#FEF08A', borderWidth: 1, borderColor: COLORS.black, paddingHorizontal: 4, paddingVertical: 1, borderRadius: RADIUS.sm, marginTop: 2 }}>
                        <Text style={{ fontSize: 8, fontWeight: '900', color: COLORS.black }}>
                          {order.kgPriceUpdated ? 'KG WEIGHED' : '+ KG PENDING'}
                        </Text>
                      </View>
                    );
                  })()}
                  {order.paymentMode ? (
                    <View style={{ backgroundColor: order.paymentMode === 'COD' ? COLORS.secondary : COLORS.primary, borderWidth: 1, borderColor: COLORS.black, paddingHorizontal: 5, paddingVertical: 1, borderRadius: RADIUS.sm, marginTop: 2 }}>
                      <Text style={{ fontSize: 9, fontWeight: '900', color: COLORS.black }}>
                        {order.paymentMode === 'COD' ? 'CASH' : order.paymentMode === 'UPI' ? 'UPI' : order.paymentMode}
                      </Text>
                    </View>
                  ) : null}
                </View>

              </View>

              {/* Category & Items Section on Outer Card */}
              {(() => {
                const itemsByCatOrder = (order.items || []).reduce((acc: Record<string, any[]>, it: any) => {
                  const title = formatCatTitle(it);
                  if (!acc[title]) acc[title] = [];
                  acc[title].push(it);
                  return acc;
                }, {});

                return (
                  <View style={{ gap: 8, marginVertical: 8 }}>
                    {(Object.entries(itemsByCatOrder) as [string, any[]][]).map(([catTitle, catItems], groupIdx) => (
                      <View key={groupIdx} style={styles.catGroupCard}>
                        {/* Big Words Category Header Banner */}
                        <View style={styles.catHeaderBanner}>
                          <View style={styles.catBadge}>
                            <Text style={styles.catBadgeText}>CATEGORY</Text>
                          </View>
                          <Text style={styles.catBannerTitle} numberOfLines={1}>
                            {catTitle}
                          </Text>
                          <View style={styles.catCountBadge}>
                            <Text style={styles.catCountBadgeText}>
                              {catItems.length} {catItems.length === 1 ? 'ITEM' : 'ITEMS'}
                            </Text>
                          </View>
                        </View>

                        {/* Items in this Category */}
                        <View style={styles.catItemsList}>
                          {catItems.map((it: any, idx: number) => {
                            const isKg = it.unit === 'KG' || (typeof it.name === 'string' && (it.name.toLowerCase().includes('per kg') || it.name.toLowerCase().includes('/ kg'))) || Boolean(it.kgWeight && it.kgWeight > 0);
                            const linePrice = (it.price || 0) * (isKg ? (it.kgWeight || 1) : it.quantity);
                            return (
                              <View key={`${it.itemId || idx}-${idx}`} style={[styles.catItemRow, idx > 0 && styles.catItemDivider]}>
                                <View style={{ flex: 1, paddingRight: 8 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                    <Text style={styles.catItemName}>
                                      {it.quantity}x {it.name}
                                    </Text>
                                    {it.isBucket && (
                                      <View style={styles.bucketBadge}>
                                        <Text style={styles.bucketBadgeText}>BUCKET (PER KG)</Text>
                                      </View>
                                    )}
                                  </View>

                                  {isKg ? (
                                    <View style={{ marginTop: 3 }}>
                                      <Text style={styles.catItemSubtext}>
                                        {it.kgWeight ? `MEASURED WEIGHT: ${it.kgWeight} KG` : 'AWAITING AGENT WEIGHT ENTRY'}
                                      </Text>
                                      {it.isBucket && (
                                        <Text style={styles.catItemCountText}>
                                          CLOTHES COUNT: {it.quantity}
                                        </Text>
                                      )}
                                    </View>
                                  ) : (
                                    <Text style={styles.catItemPriceUnit}>
                                      ₹{it.price} / ITEM
                                    </Text>
                                  )}
                                </View>

                                <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                                  {isKg ? (
                                    order.kgPriceUpdated && it.price > 0 ? (
                                      <View style={styles.itemPriceBadge}>
                                        <Text style={styles.itemPriceBadgeText}>₹{linePrice}</Text>
                                      </View>
                                    ) : (
                                      <View style={styles.itemPendingBadge}>
                                        <Text style={styles.itemPendingBadgeText}>PENDING</Text>
                                      </View>
                                    )
                                  ) : (
                                    <View style={styles.itemPriceBadge}>
                                      <Text style={styles.itemPriceBadgeText}>₹{linePrice}</Text>
                                    </View>
                                  )}
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    ))}

                    {/* Wash Preferences if any */}
                    {order.washPreferences && order.washPreferences.length > 0 && (
                      <View style={styles.addonsCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <Sparkles size={12} color="#0D8DE3" strokeWidth={2.5} />
                          <Text style={[styles.addonsHeader, { fontSize: 9 }]}>WASH ADD-ONS & PREFERENCES</Text>
                        </View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                          {order.washPreferences.map((pref: any, idx: number) => (
                            <View key={idx} style={styles.addonChip}>
                              <Text style={styles.addonChipName}>{pref.name}</Text>
                              <Text style={styles.addonChipPrice}>+₹{pref.price}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })()}

              {/* Action Buttons Row */}
              <View style={styles.cardActionsRow}>
                {order.status === 'PLACED' && (
                  <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: COLORS.secondary, flex: 1 }]}
                      onPress={() => handleStatusChange(order._id, 'ACCEPTED')}
                    >
                      <Text style={styles.actionBtnText}>ACCEPT ORDER</Text>
                    </TouchableOpacity>
                    {order.items?.some(isKgCheck) && (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#B0FF49', flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }]}
                        onPress={() => setWeighModalOrder(order)}
                      >
                        <Scale size={14} color={COLORS.black} />
                        <Text style={[styles.actionBtnText, { color: COLORS.black }]}>WEIGH & PICK UP</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {order.status === 'ACCEPTED' && (
                  <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
                    {order.items?.some(isKgCheck) && (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#B0FF49', flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }]}
                        onPress={() => setWeighModalOrder(order)}
                      >
                        <Scale size={14} color={COLORS.black} />
                        <Text style={[styles.actionBtnText, { color: COLORS.black }]}>WEIGH & PICK UP</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: COLORS.primary, flex: 1 }]}
                      onPress={() => setAssignModalOrder(order)}
                    >
                      <Text style={[styles.actionBtnText, { color: COLORS.white }]}>
                        {assignedBoy ? `REASSIGN (${assignedBoy.name.split(' ')[0]})` : 'ASSIGN PICKUP'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {order.status === 'PICKUP_ASSIGNED' && (
                  <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
                    {order.items?.some(isKgCheck) && !order.kgPriceUpdated ? (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#B0FF49', flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }]}
                        onPress={() => setWeighModalOrder(order)}
                      >
                        <Scale size={14} color={COLORS.black} />
                        <Text style={[styles.actionBtnText, { color: COLORS.black }]}>
                          WEIGH & PICK UP
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#10B981', flex: 1 }]}
                        onPress={() => handleStatusChange(order._id, 'PICKED_UP')}
                      >
                        <Text style={[styles.actionBtnText, { color: COLORS.white }]}>
                          MARK PICKED UP
                        </Text>
                      </TouchableOpacity>
                    )}
                    {order.items?.some(isKgCheck) && (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#FEF08A', paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' }]}
                        onPress={() => setWeighModalOrder(order)}
                      >
                        <Scale size={14} color={COLORS.black} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: COLORS.primary, flex: 1 }]}
                      onPress={() => setAssignModalOrder(order)}
                    >
                      <Text style={[styles.actionBtnText, { color: COLORS.white }]}>
                        {assignedBoy ? `REASSIGN (${assignedBoy.name.split(' ')[0]})` : 'REASSIGN'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {order.status === 'PICKED_UP' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#FDE047' }]}
                    onPress={() => handleStatusChange(order._id, 'WASHING')}
                  >
                    <Text style={styles.actionBtnText}>START WASHING</Text>
                  </TouchableOpacity>
                )}

                {order.status === 'WASHING' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#BAE6FD' }]}
                    onPress={() => handleStatusChange(order._id, 'IRONING')}
                  >
                    <Text style={styles.actionBtnText}>PRESSING / IRON</Text>
                  </TouchableOpacity>
                )}

                {order.status === 'IRONING' && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: COLORS.secondary, flex: 1 }]}
                      onPress={() => handleStatusChange(order._id, 'OUT_FOR_DELIVERY')}
                    >
                      <Text style={styles.actionBtnText}>OUT FOR DELIVERY</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: COLORS.primary, flex: 1 }]}
                      onPress={() => setAssignModalOrder(order)}
                    >
                      <Text style={[styles.actionBtnText, { color: COLORS.white }]}>
                        {assignedBoy ? `REASSIGN (${assignedBoy.name.split(' ')[0]})` : 'ASSIGN STAFF'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {order.status === 'OUT_FOR_DELIVERY' && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#10B981', flex: 1 }]}
                      onPress={() => setPaymentModalOrder(order)}
                    >
                      <Text style={[styles.actionBtnText, { color: COLORS.white }]}>
                        MARK DELIVERED
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: COLORS.primary, flex: 1 }]}
                      onPress={() => setAssignModalOrder(order)}
                    >
                      <Text style={[styles.actionBtnText, { color: COLORS.white }]}>
                        {assignedBoy ? `REASSIGN (${assignedBoy.name.split(' ')[0]})` : 'REASSIGN'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {order.status === 'DELIVERED' && (
                  <View style={styles.deliveredTag}>
                    <CheckCircle size={16} color="#10B981" strokeWidth={3} />
                    <Text style={styles.deliveredTagText}>COMPLETED</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        {filteredOrders.length === 0 && (
          <View style={styles.emptyWrap}>
            <ClipboardList size={40} color={COLORS.black} strokeWidth={2} style={{ marginBottom: 8 }} />
            <Text style={styles.emptyTitle}>NO ORDERS IN THIS STAGE</Text>
            <Text style={styles.emptySub}>All orders in this tab have been processed.</Text>
          </View>
        )}
      </ScrollView>

      {/* Order Details & Edit Modal */}
      <Modal visible={!!selectedOrder} transparent animationType="slide" onRequestClose={() => setSelectedOrder(null)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalPreHeading}>ORDER DETAILS</Text>
                <Text style={styles.modalHeading}>
                  #{selectedOrder?._id.slice(-6).toUpperCase()}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => handleDeleteOrder(selectedOrder)}
                  style={[styles.modalCloseBtn, { backgroundColor: '#FEE2E2', borderColor: '#DC2626' }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Trash2 size={18} color="#DC2626" strokeWidth={2.5} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSelectedOrder(null)} style={styles.modalCloseBtn}>
                  <X size={22} color={COLORS.black} strokeWidth={3} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView 
              style={{ maxHeight: Math.min(540, Dimensions.get('window').height * 0.72) }} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {selectedOrder && (
                <View style={{ gap: 14, paddingBottom: 10 }}>
                  {/* ─── 1. ORDER ITEMS SECTION (UP) ─────────────────────── */}
                  <View style={styles.orderSectionCard}>
                    <View style={styles.orderSectionHeader}>
                      <View>
                        <Text style={styles.sectionSuperHeader}>ORDER PROCESSING</Text>
                        <Text style={styles.sectionMainHeader}>
                          ITEMS TO PROCESS ({selectedOrder.items?.length || 0})
                        </Text>
                      </View>
                      {selectedOrder.items?.some((it: any) => isKgCheck(it)) && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={[styles.kgStatusPill, { backgroundColor: selectedOrder.kgPriceUpdated ? '#9AE600' : '#FEF08A' }]}>
                            <Text style={styles.kgStatusPillText}>
                              {selectedOrder.kgPriceUpdated ? 'KG WEIGHED' : 'KG PENDING'}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => setWeighModalOrder(selectedOrder)}
                            style={{ backgroundColor: '#9AE600', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: COLORS.black, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                          >
                            <Scale size={11} color={COLORS.black} />
                            <Text style={{ fontSize: 9, fontWeight: '900', color: COLORS.black }}>
                              {selectedOrder.kgPriceUpdated ? 'EDIT' : 'WEIGH'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>

                    <View style={{ padding: 12, gap: 12, backgroundColor: '#FFFFFF' }}>
                      {/* Category Groups with BIG WORDS header */}
                      {(Object.entries(itemsByCat) as [string, any[]][]).map(([catTitle, catItems], groupIdx) => (
                        <View key={groupIdx} style={styles.catGroupCard}>
                          {/* Big Words Category Header Banner */}
                          <View style={styles.catHeaderBanner}>
                            <View style={styles.catBadge}>
                              <Text style={styles.catBadgeText}>CATEGORY</Text>
                            </View>
                            <Text style={styles.catBannerTitle} numberOfLines={1}>
                              {catTitle}
                            </Text>
                            <View style={styles.catCountBadge}>
                              <Text style={styles.catCountBadgeText}>
                                {catItems.length} {catItems.length === 1 ? 'ITEM' : 'ITEMS'}
                              </Text>
                            </View>
                          </View>

                          {/* Items in this Category */}
                          <View style={styles.catItemsList}>
                            {catItems.map((it: any, idx: number) => {
                              const isKg = it.unit === 'KG' || (typeof it.name === 'string' && (it.name.toLowerCase().includes('per kg') || it.name.toLowerCase().includes('/ kg'))) || Boolean(it.kgWeight && it.kgWeight > 0);
                              const linePrice = (it.price || 0) * (isKg ? (it.kgWeight || 1) : it.quantity);
                              return (
                                <View key={`${it.itemId || idx}-${idx}`} style={[styles.catItemRow, idx > 0 && styles.catItemDivider]}>
                                  <View style={{ flex: 1, paddingRight: 8 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                      <Text style={styles.catItemName}>
                                        {it.quantity}x {it.name}
                                      </Text>
                                      {it.isBucket && (
                                        <View style={styles.bucketBadge}>
                                          <Text style={styles.bucketBadgeText}>BUCKET (PER KG)</Text>
                                        </View>
                                      )}
                                    </View>

                                    {isKg ? (
                                      <View style={{ marginTop: 3 }}>
                                        <Text style={styles.catItemSubtext}>
                                          {it.kgWeight ? `MEASURED WEIGHT: ${it.kgWeight} KG` : 'AWAITING AGENT WEIGHT ENTRY'}
                                        </Text>
                                        {it.isBucket && (
                                          <Text style={styles.catItemCountText}>
                                            CLOTHES COUNT: {it.quantity}
                                          </Text>
                                        )}
                                      </View>
                                    ) : (
                                      <Text style={styles.catItemPriceUnit}>
                                        ₹{it.price} / ITEM
                                      </Text>
                                    )}
                                  </View>

                                  <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                                    {isKg ? (
                                      selectedOrder.kgPriceUpdated && it.price > 0 ? (
                                        <View style={styles.itemPriceBadge}>
                                          <Text style={styles.itemPriceBadgeText}>₹{linePrice}</Text>
                                        </View>
                                      ) : (
                                        <View style={styles.itemPendingBadge}>
                                          <Text style={styles.itemPendingBadgeText}>PENDING</Text>
                                        </View>
                                      )
                                    ) : (
                                      <View style={styles.itemPriceBadge}>
                                        <Text style={styles.itemPriceBadgeText}>₹{linePrice}</Text>
                                      </View>
                                    )}
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      ))}

                      {/* Selected Wash Add-ons & Preferences */}
                      {selectedOrder.washPreferences && selectedOrder.washPreferences.length > 0 && (
                        <View style={styles.addonsCard}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                            <Sparkles size={14} color="#0D8DE3" strokeWidth={2.5} />
                            <Text style={styles.addonsHeader}>WASH ADD-ONS & PREFERENCES</Text>
                          </View>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                            {selectedOrder.washPreferences.map((pref: any, idx: number) => (
                              <View key={idx} style={styles.addonChip}>
                                <Text style={styles.addonChipName}>{pref.name}</Text>
                                <Text style={styles.addonChipPrice}>+₹{pref.price}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {/* Financial / Billing Summary Card */}
                      <View style={styles.breakdownCard}>
                        <View style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>Items Subtotal</Text>
                          <Text style={styles.breakdownValue}>
                            ₹{selectedOrder.items
                              ?.filter((it: any) => it.unit !== 'KG')
                              .reduce((s: number, it: any) => s + ((it.price || 0) * it.quantity), 0)}
                            {selectedOrder.items?.some((it: any) => it.unit === 'KG') && (
                              <Text style={{ color: '#0D8DE3', fontSize: 11 }}>
                                {selectedOrder.kgPriceUpdated ? ' (+ KG)' : ' (+ KG Pending)'}
                              </Text>
                            )}
                          </Text>
                        </View>
                        {selectedOrder.washPreferences && selectedOrder.washPreferences.length > 0 && (
                          <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Wash Add-ons</Text>
                            <Text style={styles.breakdownValue}>
                              +₹{selectedOrder.washPreferences.reduce((s: number, p: any) => s + (p.price || 0), 0)}
                            </Text>
                          </View>
                        )}
                        <View style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>Delivery Fee</Text>
                          <Text style={styles.breakdownValue}>₹{selectedOrder.deliveryFee || 0}</Text>
                        </View>
                        <View style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>Tax</Text>
                          <Text style={styles.breakdownValue}>₹{selectedOrder.taxAmount || 0}</Text>
                        </View>
                        {selectedOrder.discountAmount ? (
                          <View style={styles.breakdownRow}>
                            <Text style={[styles.breakdownLabel, { color: '#16A34A' }]}>Discount</Text>
                            <Text style={[styles.breakdownValue, { color: '#16A34A' }]}>-₹{selectedOrder.discountAmount}</Text>
                          </View>
                        ) : null}
                        <View style={[styles.breakdownRow, styles.breakdownTotalRow]}>
                          <Text style={styles.breakdownTotalLabel}>TOTAL AMOUNT</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.breakdownTotalValue}>₹{selectedOrder.totalAmount}</Text>
                            {selectedOrder.items?.some((it: any) => it.unit === 'KG') && !selectedOrder.kgPriceUpdated && (
                              <View style={styles.kgPendingTag}>
                                <Text style={styles.kgPendingTagText}>KG PENDING</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* ─── 2. ADDRESS & CONTACT DETAILS SECTION (DOWN) ─────── */}
                  <View style={styles.addressSectionCard}>
                    <View style={styles.addressSectionHeader}>
                      <Text style={styles.sectionSuperHeader}>CONTACT & LOGISTICS</Text>
                      <Text style={styles.sectionMainHeader}>CUSTOMER & DELIVERY DETAILS</Text>
                    </View>

                    <View style={{ padding: 12, gap: 10 }}>
                      {/* Customer Contact Card */}
                      <View style={styles.detailBox}>
                        <Text style={styles.detailBoxLabel}>CUSTOMER CONTACT</Text>
                        <Text style={styles.customerDetailName}>{modalCustomerName}</Text>
                        <Text style={styles.customerDetailPhone}>
                          {modalCustomerPhone ? `+91 ${modalCustomerPhone}` : 'No phone provided'}
                        </Text>
                        
                        {modalCustomerPhone ? (
                          <View style={styles.contactActionRow}>
                            <TouchableOpacity
                              style={styles.actionCallBtn}
                              onPress={() => Linking.openURL(`tel:${modalCustomerPhone}`)}
                            >
                              <Phone size={14} color={COLORS.black} strokeWidth={2.5} />
                              <Text style={styles.actionBtnTextSmall}>CALL</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.actionWaBtn}
                              onPress={() =>
                                Linking.openURL(
                                  `https://wa.me/${modalCustomerPhone.replace(/[^0-9]/g, '')}`
                                )
                              }
                            >
                              <MessageCircle size={14} color={COLORS.white} strokeWidth={2.5} />
                              <Text style={[styles.actionBtnTextSmall, { color: COLORS.white }]}>
                                WHATSAPP
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </View>

                      {/* Pickup Address Card */}
                      <View style={styles.detailBox}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <MapPin size={15} color="#0D8DE3" strokeWidth={2.5} />
                          <Text style={styles.detailBoxLabel}>PICKUP ADDRESS</Text>
                        </View>
                        <Text style={styles.addressText}>
                          {selectedOrder.pickupAddress || 'Shop Branch'}
                        </Text>
                      </View>

                      {/* Delivery Address Card */}
                      <View style={styles.detailBox}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <MapPin size={15} color="#10B981" strokeWidth={2.5} />
                          <Text style={styles.detailBoxLabel}>DELIVERY ADDRESS</Text>
                        </View>
                        <Text style={styles.addressText}>
                          {selectedOrder.deliveryAddress || 'Customer Address'}
                        </Text>
                      </View>

                      {/* Payment Mode & Status Card */}
                      <View style={styles.detailBox}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View>
                            <Text style={styles.detailBoxLabel}>PAYMENT METHOD</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              <CreditCard size={14} color={COLORS.black} strokeWidth={2.5} />
                              <Text style={styles.paymentMethodText}>
                                {selectedOrder.paymentMode === 'COD'
                                  ? 'Cash on Delivery (COD)'
                                  : selectedOrder.paymentMode
                                  ? `Online (${selectedOrder.paymentMode})`
                                  : 'Pending Payment Mode'}
                              </Text>
                            </View>
                          </View>

                          <View
                            style={[
                              styles.paymentStatusBadge,
                              {
                                backgroundColor:
                                  selectedOrder.paymentStatus === 'SUCCESS' || selectedOrder.status === 'DELIVERED'
                                    ? '#9AE600'
                                    : '#FEF08A',
                              },
                            ]}
                          >
                            <Text style={styles.paymentStatusBadgeText}>
                              {selectedOrder.paymentStatus || (selectedOrder.status === 'DELIVERED' ? 'SUCCESS' : 'PENDING')}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Direct Admin Pickup Quick Action */}
                      {['PLACED', 'ACCEPTED', 'PICKUP_ASSIGNED'].includes(selectedOrder.status) && (
                        <View style={[styles.detailBox, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }]}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <View>
                              <Text style={[styles.detailBoxLabel, { color: '#166534' }]}>SHOP COUNTER PICKUP</Text>
                              <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.black }}>
                                Direct Handover & Pickup
                              </Text>
                            </View>
                          </View>
                          {selectedOrder.items?.some(isKgCheck) ? (
                            <TouchableOpacity
                              style={[styles.actionBtn, { backgroundColor: '#B0FF49', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}
                              onPress={() => {
                                const o = selectedOrder;
                                setSelectedOrder(null);
                                setWeighModalOrder(o);
                              }}
                            >
                              <Scale size={16} color={COLORS.black} />
                              <Text style={[styles.actionBtnText, { color: COLORS.black }]}>
                                WEIGH & MARK PICKED UP
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={[styles.actionBtn, { backgroundColor: '#10B981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}
                              onPress={() => {
                                handleStatusChange(selectedOrder._id, 'PICKED_UP');
                                setSelectedOrder(null);
                              }}
                            >
                              <CheckCircle size={16} color={COLORS.white} />
                              <Text style={[styles.actionBtnText, { color: COLORS.white }]}>
                                MARK PICKED UP (TO WASH)
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}

                      {selectedOrder.status === 'OUT_FOR_DELIVERY' && (
                        <View style={{ marginBottom: 12 }}>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#10B981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}
                            onPress={() => {
                              const o = selectedOrder;
                              setSelectedOrder(null);
                              setPaymentModalOrder(o);
                            }}
                          >
                            <CheckCircle size={16} color={COLORS.white} />
                            <Text style={[styles.actionBtnText, { color: COLORS.white }]}>
                              COLLECT PAYMENT & MARK DELIVERED
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Admin Editable Overrides */}
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>OVERRIDE TOTAL AMOUNT (₹)</Text>
                        <TextInput
                          style={styles.modalInput}
                          value={editPrice}
                          onChangeText={setEditPrice}
                          keyboardType="numeric"
                          placeholder="0"
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>ADMIN NOTES & INSTRUCTIONS</Text>
                        <TextInput
                          style={[styles.modalInput, { height: 65 }]}
                          value={editNotes}
                          onChangeText={setEditNotes}
                          placeholder="Special instructions or notes"
                          multiline
                        />
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.deleteOrderBtn, { flex: 1 }]}
                onPress={() => handleDeleteOrder(selectedOrder)}
                disabled={isDeletingOrder}
                activeOpacity={0.85}
              >
                <Trash2 size={16} color={COLORS.white} />
                <Text style={styles.deleteOrderBtnText}>
                  {isDeletingOrder ? 'DELETING...' : 'DELETE ORDER'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveOrderBtn, { flex: 1.4, marginTop: 0 }]}
                onPress={handleSaveDetails}
                activeOpacity={0.85}
              >
                <Text style={styles.saveOrderBtnText}>SAVE DETAILS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Assign Delivery Boy Modal */}
      <Modal visible={!!assignModalOrder} transparent animationType="slide" onRequestClose={() => setAssignModalOrder(null)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeading}>ASSIGN DELIVERY STAFF</Text>
              <TouchableOpacity onPress={() => setAssignModalOrder(null)}>
                <X size={24} color={COLORS.black} strokeWidth={3} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300 }}>
              {deliveryBoys.map((boy) => (
                <TouchableOpacity
                  key={boy._id}
                  style={styles.boySelectCard}
                  onPress={() => handleAssignBoy(assignModalOrder!._id, boy._id)}
                >
                  <View style={styles.boyAvatar}>
                    <Truck size={18} color={COLORS.black} strokeWidth={2.5} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.boyName}>{boy.name}</Text>
                    <Text style={styles.boyPhone}>{boy.phone || boy.email}</Text>
                  </View>
                  <ChevronRight size={20} color={COLORS.black} strokeWidth={3} />
                </TouchableOpacity>
              ))}

              {deliveryBoys.length === 0 && (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={styles.emptySub}>
                    No delivery personnel added yet. Go to Shop Settings to add delivery staff.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* Weigh KG Modal (Admin Pickup / Scale Measurement) */}
      <WeighKgModal
        visible={!!weighModalOrder}
        order={weighModalOrder}
        catalogItems={items}
        shops={shops}
        onClose={() => setWeighModalOrder(null)}
        onConfirm={async (weights, markPickedUp = false) => {
          if (!weighModalOrder) return;
          const res = await updateKgWeight(weighModalOrder._id, weights, markPickedUp);
          if (res?.success) {
            Alert.alert(
              'Success',
              markPickedUp
                ? 'Garments weighed, final price calculated, and order marked as Picked Up!'
                : 'Garment weights updated and bill recalculated successfully!'
            );
          } else if (res?.message) {
            Alert.alert('Error', res.message);
          }
        }}
      />
      {/* Admin Payment Collection Modal with QR */}
      <AdminPaymentModal
        visible={!!paymentModalOrder}
        order={paymentModalOrder}
        qrValue={(() => {
          if (!paymentModalOrder) return null;
          const orderShop = shops.find((s) => s._id === paymentModalOrder.shopId);
          if (orderShop?.paymentInfo?.qrValue) {
            return orderShop.paymentInfo.qrValue;
          }
          if (orderShop?.paymentInfo?.upiId) {
            return `upi://pay?pa=${orderShop.paymentInfo.upiId}&pn=${encodeURIComponent(orderShop?.name || 'Laundry')}&cu=INR`;
          }
          return null;
        })()}
        onClose={() => setPaymentModalOrder(null)}
        onPay={handlePaymentConfirm}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.mobile,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  heading: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    letterSpacing: 0.5,
  },
  subHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.secondary,
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...NEO_SHADOW.box2,
  },
  exportBtnText: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    letterSpacing: 0.5,
  },
  filterTabsContainer: {
    height: 48,
    marginVertical: 4,
  },
  filterTabsWrap: {
    paddingHorizontal: SPACING.mobile,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 38,
    ...NEO_SHADOW.box2,
  },
  filterPillActive: {
    backgroundColor: COLORS.black,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  filterPillTextActive: {
    color: COLORS.white,
  },
  filterCountBadge: {
    backgroundColor: '#E5E7EB',
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountBadgeActive: {
    backgroundColor: COLORS.secondary,
  },
  filterCountText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
  },
  filterCountTextActive: {
    color: COLORS.black,
  },
  sortBarContainer: {
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1.5,
    borderBottomColor: '#E5E7EB',
  },
  sortBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.mobile,
    gap: 8,
  },
  sortLabelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginRight: 2,
  },
  sortLabelText: {
    fontSize: 11,
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    letterSpacing: 0.3,
  },
  sortPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.black,
    backgroundColor: COLORS.white,
    ...NEO_SHADOW.box2,
  },
  sortPillActive: {
    backgroundColor: COLORS.secondary,
  },
  sortPillText: {
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.black,
  },
  sortPillTextActive: {
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
  },
  scrollContent: {
    padding: SPACING.mobile,
    paddingBottom: 100,
    gap: SPACING.md,
  },
  orderCard: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    ...NEO_SHADOW.box4,
  },
  orderCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  orderIdBadge: {
    backgroundColor: COLORS.secondary,
    borderWidth: 1.5,
    borderColor: COLORS.black,
    borderRadius: RADIUS.xs,
    paddingHorizontal: 8,
    paddingVertical: 2,
    transform: [{ rotate: '-2deg' }],
  },
  orderIdText: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  customerAvatar: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerAvatarText: {
    fontSize: 15,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
  },
  customerPhone: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.primary,
  },
  itemsBox: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: COLORS.black,
    borderRadius: RADIUS.md,
    padding: 8,
    marginBottom: SPACING.sm,
  },
  itemsSummaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  cardActionsRow: {
    marginTop: 4,
  },
  actionBtn: {
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: RADIUS.lg,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...NEO_SHADOW.box2,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    letterSpacing: 0.5,
  },
  deliveredTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  deliveredTagText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  emptyWrap: {
    alignItems: 'center',
    padding: SPACING.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.black,
    borderRadius: RADIUS.xl,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
  },
  emptySub: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    borderTopWidth: 3,
    borderColor: COLORS.black,
    padding: SPACING.lg,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
  },
  modalPreHeading: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  modalCloseBtn: {
    padding: 4,
  },
  orderSectionCard: {
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...NEO_SHADOW.box2,
  },
  orderSectionHeader: {
    backgroundColor: COLORS.black,
    padding: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionSuperHeader: {
    fontSize: 9,
    fontWeight: '900',
    color: '#9AE600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionMainHeader: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  kgStatusPill: {
    borderWidth: 1,
    borderColor: COLORS.black,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  kgStatusPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.black,
  },
  catGroupCard: {
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    ...NEO_SHADOW.box2,
  },
  catHeaderBanner: {
    backgroundColor: '#0D8DE3',
    padding: 9,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderColor: COLORS.black,
  },
  catBadge: {
    backgroundColor: '#9AE600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.black,
    marginRight: 6,
  },
  catBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.black,
    letterSpacing: 0.5,
  },
  catBannerTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  catCountBadge: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.black,
  },
  catCountBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.black,
  },
  catItemsList: {
    padding: 10,
    backgroundColor: '#FAF9F6',
  },
  catItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  catItemDivider: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  catItemName: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.black,
    textTransform: 'uppercase',
  },
  bucketBadge: {
    backgroundColor: '#0D8DE3',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.black,
  },
  bucketBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  catItemSubtext: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
  },
  catItemCountText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0D8DE3',
    textTransform: 'uppercase',
    marginTop: 1,
  },
  catItemPriceUnit: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  itemPriceBadge: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.black,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    ...NEO_SHADOW.box2,
  },
  itemPriceBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.black,
  },
  itemPendingBadge: {
    backgroundColor: '#FEF08A',
    borderWidth: 1.5,
    borderColor: COLORS.black,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  itemPendingBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#854D0E',
  },
  addonsCard: {
    borderWidth: 1.5,
    borderColor: COLORS.black,
    borderRadius: RADIUS.md,
    padding: 10,
    backgroundColor: '#F0FDF4',
  },
  addonsHeader: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.black,
    letterSpacing: 0.5,
  },
  addonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.black,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  addonChipName: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.black,
  },
  addonChipPrice: {
    fontSize: 10,
    fontWeight: '900',
    color: '#16A34A',
  },
  breakdownCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: COLORS.black,
    borderRadius: RADIUS.md,
    padding: 10,
    gap: 5,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  breakdownValue: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.black,
  },
  breakdownTotalRow: {
    borderTopWidth: 1.5,
    borderTopColor: COLORS.black,
    paddingTop: 6,
    marginTop: 3,
  },
  breakdownTotalLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.black,
    letterSpacing: 0.5,
  },
  breakdownTotalValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0D8DE3',
  },
  kgPendingTag: {
    backgroundColor: '#FEF08A',
    borderWidth: 1,
    borderColor: COLORS.black,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  kgPendingTagText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#854D0E',
  },
  addressSectionCard: {
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    ...NEO_SHADOW.box2,
  },
  addressSectionHeader: {
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.black,
    padding: 10,
    paddingHorizontal: 12,
  },
  detailBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: COLORS.black,
    borderRadius: RADIUS.md,
    padding: 10,
  },
  detailBoxLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  customerDetailName: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.black,
    marginTop: 2,
  },
  customerDetailPhone: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 1,
  },
  contactActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.black,
    borderRadius: RADIUS.sm,
    paddingVertical: 7,
    ...NEO_SHADOW.box2,
  },
  actionWaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#25D366',
    borderWidth: 1.5,
    borderColor: COLORS.black,
    borderRadius: RADIUS.sm,
    paddingVertical: 7,
    ...NEO_SHADOW.box2,
  },
  actionBtnTextSmall: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.black,
  },
  addressText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.black,
    lineHeight: 16,
  },
  paymentMethodText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.black,
    textTransform: 'uppercase',
  },
  paymentStatusBadge: {
    borderWidth: 1.5,
    borderColor: COLORS.black,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  paymentStatusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.black,
    textTransform: 'uppercase',
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: RADIUS.md,
    padding: 10,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.black,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.md,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.secondary,
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    ...NEO_SHADOW.box2,
  },
  contactBtnText: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
  },
  saveOrderBtn: {
    backgroundColor: COLORS.black,
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: RADIUS.xl,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    ...NEO_SHADOW.box4,
  },
  saveOrderBtnText: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.white,
    letterSpacing: 0.8,
  },
  deleteOrderBtn: {
    backgroundColor: '#DC2626',
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: RADIUS.xl,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...NEO_SHADOW.box4,
  },
  deleteOrderBtnText: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.white,
    letterSpacing: 0.8,
  },
  cardDeleteBtn: {
    padding: 6,
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: '#DC2626',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boySelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: RADIUS.lg,
    padding: 10,
    marginBottom: 8,
    ...NEO_SHADOW.box2,
  },
  boyAvatar: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.secondary,
    borderWidth: 1.5,
    borderColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boyName: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
  },
  boyPhone: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  weighRowCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.black,
    borderRadius: RADIUS.md,
    padding: 10,
    marginBottom: 8,
  },
  weighStepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.black,
    borderRadius: RADIUS.sm,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  weighStepperBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
  },
  weighStepperBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.black,
  },
  weighInput: {
    width: 48,
    textAlign: 'center',
    fontWeight: '900',
    fontSize: 14,
    color: COLORS.black,
    paddingVertical: 4,
  },
  weighLiveCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: RADIUS.md,
    padding: 10,
    gap: 4,
    marginTop: 8,
  },
  weighBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
    ...NEO_SHADOW.box2,
  },
  weighBtnText: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    letterSpacing: 0.5,
  },
  payModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  payOrderId: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 2,
  },
  amountBadge: {
    backgroundColor: COLORS.black,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.black,
    ...NEO_SHADOW.box4,
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: '#9CA3AF',
    letterSpacing: 1,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.white,
    marginTop: 2,
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  qrInstruction: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  qrBox: {
    backgroundColor: COLORS.white,
    borderWidth: 3,
    borderColor: COLORS.black,
    borderRadius: RADIUS.md,
    padding: 16,
    ...NEO_SHADOW.box4,
    marginBottom: 8,
  },
  qrHint: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  noUpiBox: {
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  noUpiText: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: '#92400E',
  },
  noUpiSub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
    marginTop: 2,
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.md,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  payBtnsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  payBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    borderWidth: 2.5,
    borderColor: COLORS.black,
    borderRadius: RADIUS.md,
    ...NEO_SHADOW.box4,
  },
  payBtnCash: {
    backgroundColor: COLORS.secondary,
  },
  payBtnOnline: {
    backgroundColor: '#0D8DE3',
  },
  payBtnText: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
