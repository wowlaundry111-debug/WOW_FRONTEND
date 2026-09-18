import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { ArrowLeft, Trash2, Truck, User, Sparkles, Plus, ShieldCheck } from 'lucide-react-native';
import { COLORS, SPACING, RADIUS, TYPO, NEO_SHADOW } from '../../components/Theme';
import { useAppStore } from '../../store/useAppStore';

interface Props {
  shopId: string;
  onBack: () => void;
}

export const SuperAdminShopDetail: React.FC<Props> = ({ shopId, onBack }) => {
  const { shops, users, orders, updateShop, deleteUser, addDeliveryBoy, addOperator } = useAppStore();
  const shop = shops.find((s) => s._id === shopId);

  const [activeTab, setActiveTab] = useState<'details' | 'staff' | 'orders'>('details');

  // Edit Shop State
  const [shopName, setShopName] = useState(shop?.name || '');
  const [branchStr, setBranchStr] = useState(shop?.branches?.join(', ') || '');
  const [upiId, setUpiId] = useState(shop?.paymentInfo?.upiId || '');
  const [bankName, setBankName] = useState(shop?.paymentInfo?.bankName || '');
  const [accountNo, setAccountNo] = useState(shop?.paymentInfo?.accountNo || '');

  // Add Branch Staff State (No password required)
  const [newStaffRole, setNewStaffRole] = useState<'Operator' | 'Delivery'>('Operator');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [isAddingStaff, setIsAddingStaff] = useState(false);

  if (!shop) return null;

  const shopOrders = orders.filter((o) => o.shopId === shopId);
  const shopStaff = users.filter(
    (u) => u.shopId === shopId && ['ShopAdmin', 'Delivery', 'Operator'].includes(u.role)
  );

  const handleAddBranchStaff = async () => {
    if (!newStaffEmail || !newStaffEmail.includes('@')) {
      Alert.alert('Required', 'Please enter a valid email address');
      return;
    }
    setIsAddingStaff(true);
    try {
      if (newStaffRole === 'Operator') {
        await addOperator(newStaffEmail.trim(), shopId, newStaffName.trim(), newStaffPhone.trim());
        Alert.alert('Success', 'Wash Operator added to branch successfully!');
      } else {
        await addDeliveryBoy(newStaffEmail.trim(), shopId, newStaffName.trim(), newStaffPhone.trim());
        Alert.alert('Success', 'Delivery staff added to branch successfully!');
      }
      setNewStaffName('');
      setNewStaffPhone('');
      setNewStaffEmail('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add staff member');
    } finally {
      setIsAddingStaff(false);
    }
  };

  const handleSaveShop = async () => {
    try {
      await updateShop(shopId, {
        name: shopName,
        branches: branchStr.split(',').map((s) => s.trim()).filter(Boolean),
        paymentInfo: {
          upiId,
          bankName,
          accountNo,
          qrValue: upiId ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(shopName)}&cu=INR` : '',
        },
      });
      Alert.alert('Success', 'Shop details updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update shop');
    }
  };

  const handleDeleteStaff = (userId: string, name: string) => {
    Alert.alert('Delete Staff', `Remove ${name} from this shop?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteUser(userId) },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.8}>
          <ArrowLeft size={20} color={COLORS.black} strokeWidth={3} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>{shop.name}</Text>
          <Text style={styles.headerSubtitle}>ID: {shop._id}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['details', 'staff', 'orders'] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, isActive && { color: COLORS.black }]}>
                {tab.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'details' && (
          <View style={styles.card}>
            <Text style={styles.cardHeading}>EDIT BRANCH PROFILE</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>SHOP NAME</Text>
              <TextInput style={styles.input} value={shopName} onChangeText={setShopName} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>BRANCHES (COMMA SEPARATED)</Text>
              <TextInput style={styles.input} value={branchStr} onChangeText={setBranchStr} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>UPI ID</Text>
              <TextInput style={styles.input} value={upiId} onChangeText={setUpiId} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>BANK NAME</Text>
              <TextInput style={styles.input} value={bankName} onChangeText={setBankName} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ACCOUNT NUMBER</Text>
              <TextInput style={styles.input} value={accountNo} onChangeText={setAccountNo} />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveShop} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>SAVE BRANCH CHANGES</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'staff' && (
          <View style={{ gap: SPACING.md }}>
            {/* Add Staff Card */}
            <View style={styles.card}>
              <Text style={styles.cardHeading}>+ ADD BRANCH STAFF</Text>

              {/* Role Toggle */}
              <View style={styles.roleToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.roleToggleBtn,
                    newStaffRole === 'Operator' && styles.roleToggleBtnActiveOperator,
                  ]}
                  onPress={() => setNewStaffRole('Operator')}
                  activeOpacity={0.85}
                >
                  <Sparkles
                    size={14}
                    color={newStaffRole === 'Operator' ? COLORS.white : COLORS.black}
                    strokeWidth={2.5}
                  />
                  <Text
                    style={[
                      styles.roleToggleBtnText,
                      newStaffRole === 'Operator' && styles.roleToggleBtnTextActive,
                    ]}
                  >
                    WASH OPERATOR
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleToggleBtn,
                    newStaffRole === 'Delivery' && styles.roleToggleBtnActiveDelivery,
                  ]}
                  onPress={() => setNewStaffRole('Delivery')}
                  activeOpacity={0.85}
                >
                  <Truck
                    size={14}
                    color={newStaffRole === 'Delivery' ? COLORS.white : COLORS.black}
                    strokeWidth={2.5}
                  />
                  <Text
                    style={[
                      styles.roleToggleBtnText,
                      newStaffRole === 'Delivery' && styles.roleToggleBtnTextActive,
                    ]}
                  >
                    DELIVERY FLEET
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.staffNoteBox, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                <ShieldCheck size={14} color="#0D8DE3" strokeWidth={2.5} />
                <Text style={styles.staffNoteText}>
                  No password needed. Staff members sign in passwordless via email/phone OTP.
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>STAFF NAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder={newStaffRole === 'Operator' ? 'e.g. Ramesh Kumar' : 'e.g. Rahul Sharma'}
                  placeholderTextColor="#9CA3AF"
                  value={newStaffName}
                  onChangeText={setNewStaffName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PHONE NUMBER</Text>
                <TextInput
                  style={styles.input}
                  placeholder="9876543210"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  value={newStaffPhone}
                  onChangeText={setNewStaffPhone}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                <TextInput
                  style={styles.input}
                  placeholder="staff@wow.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={newStaffEmail}
                  onChangeText={setNewStaffEmail}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.addStaffBtn,
                  newStaffRole === 'Operator' && { backgroundColor: '#8B5CF6' },
                ]}
                onPress={handleAddBranchStaff}
                activeOpacity={0.85}
                disabled={isAddingStaff}
              >
                <Plus
                  size={16}
                  color={newStaffRole === 'Operator' ? COLORS.white : COLORS.black}
                  strokeWidth={3}
                />
                <Text
                  style={[
                    styles.addStaffBtnText,
                    newStaffRole === 'Operator' && { color: COLORS.white },
                  ]}
                >
                  {isAddingStaff
                    ? 'ADDING...'
                    : newStaffRole === 'Operator'
                    ? 'ADD WASH OPERATOR'
                    : 'ADD DELIVERY FLEET'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Staff List Card */}
            <View style={styles.card}>
              <Text style={styles.cardHeading}>BRANCH STAFF ({shopStaff.length})</Text>

              {shopStaff.map((st) => (
                <View key={st._id} style={styles.staffRow}>
                  <View
                    style={[
                      styles.staffAvatar,
                      st.role === 'Operator' && { backgroundColor: '#EDE9FE' },
                      st.role === 'Delivery' && { backgroundColor: '#FFEDD5' },
                    ]}
                  >
                    {st.role === 'Delivery' ? (
                      <Truck size={18} color="#C2410C" strokeWidth={2.5} />
                    ) : st.role === 'Operator' ? (
                      <Sparkles size={18} color="#7C3AED" strokeWidth={2.5} />
                    ) : (
                      <User size={18} color={COLORS.black} strokeWidth={2.5} />
                    )}
                  </View>

                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.staffName}>{st.name}</Text>
                      <View
                        style={[
                          styles.roleBadge,
                          st.role === 'Operator' && { backgroundColor: '#EDE9FE', borderColor: '#7C3AED' },
                          st.role === 'Delivery' && { backgroundColor: '#FFEDD5', borderColor: '#EA580C' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleBadgeText,
                            st.role === 'Operator' && { color: '#6D28D9' },
                            st.role === 'Delivery' && { color: '#C2410C' },
                          ]}
                        >
                          {st.role.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.staffRole}>
                      {st.phone || st.email}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.deleteStaffBtn}
                    onPress={() => handleDeleteStaff(st._id, st.name)}
                  >
                    <Trash2 size={16} color="#DC2626" strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              ))}

              {shopStaff.length === 0 && (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>No staff registered under this branch.</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {activeTab === 'orders' && (
          <View style={styles.card}>
            <Text style={styles.cardHeading}>BRANCH ORDERS ({shopOrders.length})</Text>

            {shopOrders.map((o) => (
              <View key={o._id} style={styles.orderRow}>
                <View>
                  <Text style={styles.orderRowId}>#{o._id.slice(-6).toUpperCase()}</Text>
                  <Text style={styles.orderRowDate}>
                    {new Date(o.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.orderRowAmount}>₹{o.totalAmount || 0}</Text>
                  <Text style={styles.orderRowStatus}>{o.status}</Text>
                </View>
              </View>
            ))}

            {shopOrders.length === 0 && (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No orders recorded for this branch yet.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.mobile,
    paddingVertical: SPACING.md,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.black,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
    ...NEO_SHADOW.box2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  tabBar: {
    flexDirection: 'row',
    padding: SPACING.mobile,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: RADIUS.md,
  },
  tabBtnActive: {
    backgroundColor: COLORS.secondary,
    ...NEO_SHADOW.box2,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: '#4B5563',
  },
  scrollContent: {
    padding: SPACING.mobile,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    ...NEO_SHADOW.box6,
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    marginBottom: SPACING.md,
  },
  inputGroup: {
    marginBottom: SPACING.sm,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: COLORS.black,
    borderRadius: RADIUS.md,
    padding: 10,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.black,
  },
  saveBtn: {
    backgroundColor: COLORS.black,
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: RADIUS.xl,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: SPACING.sm,
    ...NEO_SHADOW.box4,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.white,
    letterSpacing: 0.8,
  },
  roleToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8,
  },
  roleToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.black,
    backgroundColor: '#F8FAFC',
  },
  roleToggleBtnActiveOperator: {
    backgroundColor: '#8B5CF6',
    ...NEO_SHADOW.box2,
  },
  roleToggleBtnActiveDelivery: {
    backgroundColor: '#FB923C',
    ...NEO_SHADOW.box2,
  },
  roleToggleBtnText: {
    fontSize: 10,
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    letterSpacing: 0.3,
  },
  roleToggleBtnTextActive: {
    color: COLORS.white,
  },
  staffNoteBox: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  staffNoteText: {
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
    color: '#0369A1',
    lineHeight: 14,
  },
  addStaffBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.secondary,
    borderWidth: 1.5,
    borderColor: COLORS.black,
    borderRadius: RADIUS.md,
    paddingVertical: 11,
    marginTop: 4,
    ...NEO_SHADOW.box2,
  },
  addStaffBtnText: {
    fontSize: 11,
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
    letterSpacing: 0.3,
  },
  roleBadge: {
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  roleBadgeText: {
    fontSize: 9,
    fontFamily: 'Outfit_800ExtraBold',
    letterSpacing: 0.3,
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: COLORS.black,
    borderRadius: RADIUS.md,
    padding: 10,
    marginBottom: 8,
  },
  staffAvatar: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.secondary,
    borderWidth: 1.5,
    borderColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffName: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
  },
  staffRole: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  deleteStaffBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: '#E5E7EB',
  },
  orderRowId: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'Outfit_800ExtraBold',
    color: COLORS.black,
  },
  orderRowDate: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  orderRowAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.primary,
  },
  orderRowStatus: {
    fontSize: 10,
    fontWeight: '800',
    color: '#374151',
  },
  emptyWrap: {
    padding: SPACING.md,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
});
