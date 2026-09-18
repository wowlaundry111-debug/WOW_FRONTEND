/**
 * WOW Laundry — Mobile Wash Floor Operator Portal
 * Real-time wash floor queue, machine status progression, weighing, and dispatch readiness.
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TextInput,
  Modal,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Shirt,
  Sparkles,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Scale,
  X,
  ChevronRight,
  Truck,
  Layers,
  ArrowRight,
  Filter,
  LogOut,
  Phone,
  FileText,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useAppStore } from '../../store/useAppStore';
import { COLORS, SPACING, RADIUS, TYPO, NEO_SHADOW } from '../../components/Theme';
import { Order, OrderStatus } from '../../types';
import { sortShopsWithLpuFirst } from '../../utils/branchHelper';

type FilterTab = 'ALL' | 'PICKED_UP' | 'WASHING' | 'IRONING' | 'OUT_FOR_DELIVERY';

export const OperatorPortal: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    currentUser,
    setCurrentUser,
    orders,
    shops,
    updateOrderStatus,
    updateKgWeight,
    fetchOrders,
    currentTenantId,
    setCurrentTenantId,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [weightModalOrder, setWeightModalOrder] = useState<Order | null>(null);
  const [inputWeight, setInputWeight] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showShopSwitcher, setShowShopSwitcher] = useState(false);

  const isSuperAdmin = currentUser?.role === 'SuperAdmin';
  const effectiveShopId = isSuperAdmin ? currentTenantId : (currentUser?.shopId || currentTenantId || shops[0]?._id);
  const currentShop = shops.find(s => s._id === effectiveShopId) || shops[0];

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Are you sure you want to log out of the operator console?')) {
        setCurrentUser(null);
      }
    } else {
      Alert.alert('Operator Logout', 'Are you sure you want to log out of the operator console?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => setCurrentUser(null),
        },
      ]);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders(1);
    setRefreshing(false);
  }, [fetchOrders]);

  // Orders on wash floor (Picked up, Washing, Ironing, Out for delivery/Ready)
  const floorOrders = useMemo(() => {
    return (orders || []).filter(o => {
      if (!o || !o._id) return false;
      if (effectiveShopId && o.shopId !== effectiveShopId) return false;
      return ['PICKED_UP', 'WASHING', 'IRONING', 'OUT_FOR_DELIVERY'].includes(o.status);
    });
  }, [orders, effectiveShopId]);

  // Floor counts
  const counts = useMemo(() => {
    return {
      all: floorOrders.length,
      pickedUp: floorOrders.filter(o => o.status === 'PICKED_UP').length,
      washing: floorOrders.filter(o => o.status === 'WASHING').length,
      ironing: floorOrders.filter(o => o.status === 'IRONING').length,
      ready: floorOrders.filter(o => o.status === 'OUT_FOR_DELIVERY').length,
    };
  }, [floorOrders]);

  // Filtered list
  const filteredOrders = useMemo(() => {
    let list = floorOrders;
    if (activeTab !== 'ALL') {
      list = list.filter(o => o.status === activeTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(o =>
        (o._id && o._id.toLowerCase().includes(q)) ||
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        (o.customerPhone && o.customerPhone.includes(q))
      );
    }
    return list;
  }, [floorOrders, activeTab, searchQuery]);

  // Quick Advance Status Handler
  const handleAdvanceStatus = async (order: Order) => {
    let nextStatus: OrderStatus | null = null;
    let confirmMsg = '';

    if (order.status === 'PICKED_UP') {
      nextStatus = 'WASHING';
      confirmMsg = `Start wash cycle for Order #${order._id.slice(-5)}?`;
    } else if (order.status === 'WASHING') {
      nextStatus = 'IRONING';
      confirmMsg = `Move Order #${order._id.slice(-5)} to Ironing & Steam Press?`;
    } else if (order.status === 'IRONING') {
      nextStatus = 'OUT_FOR_DELIVERY';
      confirmMsg = `Mark Order #${order._id.slice(-5)} as Ready for Dispatch?`;
    }

    if (!nextStatus) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const performUpdate = async () => {
      try {
        setUpdatingId(order._id);
        await updateOrderStatus(order._id, nextStatus as OrderStatus);
        setUpdatingId(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (selectedOrder?._id === order._id) {
          setSelectedOrder(prev => prev ? { ...prev, status: nextStatus as OrderStatus } : null);
        }
      } catch (err) {
        setUpdatingId(null);
        Alert.alert('Error', 'Failed to advance status');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) {
        await performUpdate();
      }
    } else {
      Alert.alert('Advance Status', confirmMsg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Advance', style: 'default', onPress: performUpdate },
      ]);
    }
  };

  // KG Weight Submission Handler
  const handleSaveWeight = async () => {
    if (!weightModalOrder) return;
    const wt = parseFloat(inputWeight);
    if (isNaN(wt) || wt <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight in kilograms');
      return;
    }

    try {
      setUpdatingId(weightModalOrder._id);
      const itemsPayload = (weightModalOrder.items || [])
        .filter(i => i.unit === 'KG')
        .map(i => ({ itemId: i.itemId, kgWeight: wt }));
      const payload = itemsPayload.length > 0 ? itemsPayload : [{ itemId: weightModalOrder.items[0]?.itemId || '', kgWeight: wt }];
      const res = await updateKgWeight(weightModalOrder._id, payload);
      setUpdatingId(null);
      if (res.success) {
        setWeightModalOrder(null);
        setInputWeight('');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Failed', res.message || 'Could not update weight');
      }
    } catch {
      setUpdatingId(null);
      Alert.alert('Error', 'Failed to update weight');
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'PICKED_UP':
        return { label: 'PICKED UP', bg: '#FEF3C7', color: '#B45309' };
      case 'WASHING':
        return { label: 'IN WASH', bg: '#DBEAFE', color: '#1D4ED8' };
      case 'IRONING':
        return { label: 'IRONING', bg: '#EDE9FE', color: '#6D28D9' };
      case 'OUT_FOR_DELIVERY':
        return { label: 'READY', bg: '#D1FAE5', color: '#047857' };
      default:
        return { label: status, bg: '#F3F4F6', color: '#374151' };
    }
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    const badge = getStatusBadge(item.status);
    const hasKgItems = item.items?.some(i => i.unit === 'KG');
    const isUpdating = updatingId === item._id;

    return (
      <TouchableOpacity
        style={styles.orderCard}
        activeOpacity={0.9}
        onPress={() => setSelectedOrder(item)}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.tokenPill}>
            <Text style={styles.tokenText}>#{item._id.slice(-5).toUpperCase()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>

        {/* Customer & Info */}
        <View style={styles.cardBody}>
          <Text style={styles.customerName}>{item.customerName || 'Customer'}</Text>
          <Text style={styles.itemsSummary} numberOfLines={2}>
            {item.items?.map(i => `${i.quantity}x ${i.name}`).join(' • ') || 'Laundry items'}
          </Text>

          {hasKgItems && (
            <View style={styles.kgRow}>
              <Scale size={14} color="#0284C7" />
              <Text style={styles.kgRowText}>
                {item.kgPriceUpdated ? 'Weighed & Priced' : 'Weight verification needed'}
              </Text>
              {!item.kgPriceUpdated && (
                <TouchableOpacity
                  style={styles.weighBtn}
                  onPress={() => {
                    setWeightModalOrder(item);
                    setInputWeight('');
                  }}
                >
                  <Text style={styles.weighBtnText}>Weigh Now</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {Boolean(item.instructions || item.adminNotes || (item.washPreferences && item.washPreferences.length > 0)) && (
            <View style={styles.cardNoticeRow}>
              <Sparkles size={12} color="#7C3AED" />
              <Text style={styles.cardNoticeText} numberOfLines={1}>
                {(item.instructions || item.adminNotes)
                  ? `Note: ${item.instructions || item.adminNotes}`
                  : `${item.washPreferences?.length} wash preference${(item.washPreferences?.length || 0) > 1 ? 's' : ''}`}
              </Text>
            </View>
          )}
        </View>

        {/* Action Progression Button */}
        <View style={styles.cardFooter}>
          {item.status === 'PICKED_UP' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]}
              disabled={isUpdating}
              onPress={() => handleAdvanceStatus(item)}
            >
              {isUpdating ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <Sparkles size={16} color={COLORS.white} />
                  <Text style={styles.actionBtnText}>START WASHING</Text>
                  <ArrowRight size={16} color={COLORS.white} />
                </>
              )}
            </TouchableOpacity>
          )}

          {item.status === 'WASHING' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#8B5CF6' }]}
              disabled={isUpdating}
              onPress={() => handleAdvanceStatus(item)}
            >
              {isUpdating ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <Shirt size={16} color={COLORS.white} />
                  <Text style={styles.actionBtnText}>MOVE TO IRONING</Text>
                  <ArrowRight size={16} color={COLORS.white} />
                </>
              )}
            </TouchableOpacity>
          )}

          {item.status === 'IRONING' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
              disabled={isUpdating}
              onPress={() => handleAdvanceStatus(item)}
            >
              {isUpdating ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <CheckCircle2 size={16} color={COLORS.white} />
                  <Text style={styles.actionBtnText}>MARK AS READY</Text>
                  <ArrowRight size={16} color={COLORS.white} />
                </>
              )}
            </TouchableOpacity>
          )}

          {item.status === 'OUT_FOR_DELIVERY' && (
            <View style={styles.readyBadgeContainer}>
              <CheckCircle2 size={16} color="#059669" />
              <Text style={styles.readyBadgeText}>READY FOR DISPATCH / DRIVER</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <Text style={styles.topBarSub}>WASH FLOOR CONSOLE</Text>
            {Boolean(currentUser?.name) && (
              <View style={styles.operatorPill}>
                <Sparkles size={10} color="#7C3AED" strokeWidth={2.5} />
                <Text style={styles.operatorPillText} numberOfLines={1}>
                  {currentUser?.name}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => (isSuperAdmin ? setShowShopSwitcher(true) : null)}
            activeOpacity={isSuperAdmin ? 0.7 : 1}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Text style={styles.topBarTitle} numberOfLines={1}>
              {currentShop?.name || 'WOW Laundry'}
            </Text>
            {isSuperAdmin && <Text style={{ fontSize: 11, color: COLORS.primary }}>[Switch]</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.topBarActions}>
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.8}>
            <RefreshCw size={17} color={COLORS.black} strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutTopBtn} onPress={handleLogout} activeOpacity={0.8}>
            <LogOut size={16} color="#DC2626" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrap}>
        <Search size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by token, order ID, or customer..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={16} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Metric / Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsScroll}
      >
        <TouchableOpacity
          style={[styles.filterPill, activeTab === 'ALL' && styles.filterPillActive]}
          onPress={() => setActiveTab('ALL')}
        >
          <Text style={[styles.filterPillText, activeTab === 'ALL' && styles.filterPillTextActive]}>
            ALL ({counts.all})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterPill, activeTab === 'PICKED_UP' && styles.filterPillActive]}
          onPress={() => setActiveTab('PICKED_UP')}
        >
          <Text style={[styles.filterPillText, activeTab === 'PICKED_UP' && styles.filterPillTextActive]}>
            PICKED UP ({counts.pickedUp})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterPill, activeTab === 'WASHING' && styles.filterPillActive]}
          onPress={() => setActiveTab('WASHING')}
        >
          <Text style={[styles.filterPillText, activeTab === 'WASHING' && styles.filterPillTextActive]}>
            WASHING ({counts.washing})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterPill, activeTab === 'IRONING' && styles.filterPillActive]}
          onPress={() => setActiveTab('IRONING')}
        >
          <Text style={[styles.filterPillText, activeTab === 'IRONING' && styles.filterPillTextActive]}>
            IRONING ({counts.ironing})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterPill, activeTab === 'OUT_FOR_DELIVERY' && styles.filterPillActive]}
          onPress={() => setActiveTab('OUT_FOR_DELIVERY')}
        >
          <Text style={[styles.filterPillText, activeTab === 'OUT_FOR_DELIVERY' && styles.filterPillTextActive]}>
            READY ({counts.ready})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        keyExtractor={item => item._id}
        renderItem={renderOrderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Layers size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Orders on Wash Floor</Text>
            <Text style={styles.emptySub}>
              {activeTab === 'ALL'
                ? 'All laundry batches are processed or out for delivery.'
                : `No orders in ${activeTab.replace('_', ' ')} queue.`}
            </Text>
          </View>
        }
      />

      {/* Order Detail Modal */}
      <Modal visible={!!selectedOrder} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalToken}>ORDER #{selectedOrder?._id.slice(-5).toUpperCase()}</Text>
                <Text style={styles.modalCust}>{selectedOrder?.customerName}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedOrder(null)} style={styles.closeBtn}>
                <X size={20} color={COLORS.black} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Customer Contact & Pickup Slot */}
              <View style={styles.modalMetaRow}>
                {Boolean(selectedOrder?.customerPhone) && (
                  <View style={styles.modalMetaPill}>
                    <Phone size={12} color="#475569" strokeWidth={2.5} />
                    <Text style={styles.modalMetaPillText}>{selectedOrder?.customerPhone}</Text>
                  </View>
                )}
                {Boolean(selectedOrder?.pickupTime) && (
                  <View style={styles.modalMetaPill}>
                    <Clock size={12} color="#475569" strokeWidth={2.5} />
                    <Text style={styles.modalMetaPillText}>{selectedOrder?.pickupTime}</Text>
                  </View>
                )}
              </View>

              {/* Customer Wash Instructions */}
              {Boolean(selectedOrder?.instructions || selectedOrder?.adminNotes) && (
                <View style={styles.instructionCard}>
                  <View style={styles.instructionCardHeader}>
                    <FileText size={14} color="#B45309" strokeWidth={2.5} />
                    <Text style={styles.instructionCardTitle}>CUSTOMER SPECIAL INSTRUCTIONS</Text>
                  </View>
                  <Text style={styles.instructionCardText}>
                    {selectedOrder?.instructions || selectedOrder?.adminNotes}
                  </Text>
                </View>
              )}

              <Text style={styles.modalSecTitle}>ITEMS LIST</Text>
              {selectedOrder?.items?.map((item, idx) => (
                <View key={idx} style={styles.modalItemRow}>
                  <Text style={styles.modalItemQty}>{item.quantity}x</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalItemName}>{item.name}</Text>
                    {item.unit === 'KG' && (
                      <Text style={styles.modalItemSub}>
                        {item.kgWeight ? `${item.kgWeight} KG weighed` : 'Per-KG item (requires weighing)'}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.modalItemPrice}>₹{item.price * item.quantity}</Text>
                </View>
              ))}

              {selectedOrder?.washPreferences && selectedOrder.washPreferences.length > 0 && (
                <>
                  <Text style={[styles.modalSecTitle, { marginTop: SPACING.lg }]}>SPECIAL PREFERENCES</Text>
                  {selectedOrder.washPreferences.map((p, idx) => (
                    <View key={idx} style={styles.prefRow}>
                      <Sparkles size={14} color={COLORS.primary} />
                      <Text style={styles.prefText}>{p.name}</Text>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              {selectedOrder?.items?.some(i => i.unit === 'KG') && !selectedOrder?.kgPriceUpdated && (
                <TouchableOpacity
                  style={styles.modalWeighBtn}
                  onPress={() => {
                    const o = selectedOrder;
                    setSelectedOrder(null);
                    setWeightModalOrder(o);
                    setInputWeight('');
                  }}
                  activeOpacity={0.85}
                >
                  <Scale size={16} color={COLORS.black} strokeWidth={2.5} />
                  <Text style={styles.modalWeighBtnText}>WEIGH ORDER (KG)</Text>
                </TouchableOpacity>
              )}

              {selectedOrder && ['PICKED_UP', 'WASHING', 'IRONING'].includes(selectedOrder.status) && (
                <TouchableOpacity
                  style={[styles.modalActionBtn, { backgroundColor: COLORS.black }]}
                  onPress={() => {
                    const orderToAdvance = selectedOrder;
                    handleAdvanceStatus(orderToAdvance);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalActionBtnText}>ADVANCE WASH STATUS</Text>
                  <ArrowRight size={18} color={COLORS.white} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Weigh KG Modal */}
      <Modal visible={!!weightModalOrder} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.weighModalContent}>
            <Scale size={32} color={COLORS.primary} style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={styles.weighModalTitle}>ENTER CLOTH WEIGHT</Text>
            <Text style={styles.weighModalSub}>
              Order #{weightModalOrder?._id.slice(-5).toUpperCase()} - {weightModalOrder?.customerName}
            </Text>

            <View style={styles.weightInputWrap}>
              <TextInput
                style={styles.weightInput}
                placeholder="0.0"
                keyboardType="decimal-pad"
                value={inputWeight}
                onChangeText={setInputWeight}
                autoFocus
              />
              <Text style={styles.weightUnit}>KG</Text>
            </View>

            <View style={styles.weighBtnRow}>
              <TouchableOpacity
                style={styles.cancelWeighBtn}
                onPress={() => setWeightModalOrder(null)}
              >
                <Text style={styles.cancelWeighText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmWeighBtn}
                onPress={handleSaveWeight}
                disabled={updatingId === weightModalOrder?._id}
              >
                {updatingId === weightModalOrder?._id ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.confirmWeighText}>CONFIRM & SAVE</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Shop Switcher Modal for SuperAdmin */}
      {showShopSwitcher && (
        <View style={styles.modalOverlay}>
          <View style={styles.shopSwitcherCard}>
            <Text style={[TYPO.headlineMd, { marginBottom: SPACING.md }]}>Select Branch</Text>
            {sortShopsWithLpuFirst(shops).map(s => (
              <TouchableOpacity
                key={s._id}
                style={[styles.shopSelectBtn, s._id === effectiveShopId && styles.shopSelectBtnActive]}
                onPress={() => {
                  setCurrentTenantId(s._id);
                  setShowShopSwitcher(false);
                }}
              >
                <Text style={[TYPO.labelLg, s._id === effectiveShopId && { color: COLORS.primary }]}>
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.shopSelectBtn, { marginTop: SPACING.sm, alignItems: 'center' }]}
              onPress={() => setShowShopSwitcher(false)}
            >
              <Text style={TYPO.labelLg}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.black,
  },
  topBarSub: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'Outfit_800ExtraBold',
    letterSpacing: 1,
    color: '#64748B',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
  },
  operatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#7C3AED',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.sm,
  },
  operatorPillText: {
    fontSize: 9,
    fontFamily: 'Outfit_800ExtraBold',
    color: '#6D28D9',
    letterSpacing: 0.3,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.black,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...NEO_SHADOW.box2,
  },
  logoutTopBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.black,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    ...NEO_SHADOW.box2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.black,
    ...NEO_SHADOW.box2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.black,
    padding: 0,
  },
  tabsScroll: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    borderColor: COLORS.black,
    backgroundColor: COLORS.white,
  },
  filterPillActive: {
    backgroundColor: COLORS.black,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    letterSpacing: 0.5,
  },
  filterPillTextActive: {
    color: COLORS.white,
  },
  listContent: {
    padding: SPACING.md,
    gap: 12,
  },
  orderCard: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...NEO_SHADOW.box4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tokenPill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.md,
  },
  tokenText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'Outfit_800ExtraBold',
    letterSpacing: 0.5,
  },
  cardBody: {
    marginBottom: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    marginBottom: 4,
  },
  itemsSummary: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    color: '#64748B',
    lineHeight: 18,
  },
  kgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    marginTop: 8,
  },
  kgRowText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Outfit_600SemiBold',
    color: '#0369A1',
    flex: 1,
  },
  weighBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  weighBtnText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'Outfit_800ExtraBold',
  },
  cardNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: RADIUS.md,
    marginTop: 6,
  },
  cardNoticeText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    color: '#7C3AED',
    flex: 1,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.black,
    ...NEO_SHADOW.box2,
  },
  actionBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    letterSpacing: 0.5,
  },
  readyBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: '#ECFDF5',
    borderRadius: RADIUS.md,
  },
  readyBadgeText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'Outfit_800ExtraBold',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    color: '#64748B',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: COLORS.black,
    maxHeight: '80%',
    padding: SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalToken: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.primary,
  },
  modalCust: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    marginVertical: SPACING.md,
  },
  modalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  modalMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  modalMetaPillText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    color: '#475569',
  },
  instructionCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: RADIUS.md,
    padding: 10,
    marginBottom: 14,
  },
  instructionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  instructionCardTitle: {
    fontSize: 10,
    fontFamily: 'Outfit_800ExtraBold',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  instructionCardText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    color: '#92400E',
    lineHeight: 18,
  },
  modalSecTitle: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'Outfit_800ExtraBold',
    letterSpacing: 1,
    color: '#64748B',
    marginBottom: 8,
  },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalItemQty: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    width: 32,
  },
  modalItemName: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.black,
  },
  modalItemSub: {
    fontSize: 11,
    color: '#64748B',
  },
  modalItemPrice: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  prefText: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    color: COLORS.black,
  },
  modalFooter: {
    paddingTop: SPACING.md,
  },
  modalWeighBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.black,
    backgroundColor: COLORS.secondary,
    marginBottom: 8,
    ...NEO_SHADOW.box2,
  },
  modalWeighBtnText: {
    color: COLORS.black,
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    letterSpacing: 0.5,
  },
  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.black,
    ...NEO_SHADOW.box2,
  },
  modalActionBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    letterSpacing: 0.5,
  },
  weighModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    borderColor: COLORS.black,
    padding: SPACING.xl,
    margin: SPACING.xl,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 380,
    ...NEO_SHADOW.box4,
  },
  weighModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    textAlign: 'center',
    color: COLORS.black,
    letterSpacing: 0.5,
  },
  weighModalSub: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 16,
  },
  weightInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 20,
    backgroundColor: '#F8FAFC',
  },
  weightInput: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    minWidth: 80,
    textAlign: 'center',
  },
  weightUnit: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: '#64748B',
  },
  weighBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelWeighBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.black,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelWeighText: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
  },
  confirmWeighBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.black,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    ...NEO_SHADOW.box2,
  },
  confirmWeighText: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.white,
  },
  shopSwitcherCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    borderColor: COLORS.black,
    width: '90%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  shopSelectBtn: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  shopSelectBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(13, 141, 227, 0.08)',
  },
});
