import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { socket, connectSocket, disconnectSocket } from '../services/socket';
import { useAppStore } from '../store/useAppStore';
import { useNotificationStore } from '../store/useNotificationStore';

const triggerLocalAlert = (title: string, body: string, data?: any) => {
  try {
    if (Platform.OS !== 'web') {
      Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          data: data || {},
        },
        trigger: null,
      }).catch(() => {});
    } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/assets/iconic.png',
      });
    }
  } catch (err) {
    // Non-blocking
  }
};

export const SocketManager: React.FC = () => {
  const currentUser = useAppStore((state) => state.currentUser);

  useEffect(() => {
    if (currentUser) {
      connectSocket(currentUser);

      // ── Order Events ─────────────────────────────────────────────────────────────
      const onOrderCreated = (order: any) => {
        const isCustomer = currentUser.role === 'Customer' && String(currentUser._id) === String(order.customerId);
        const isShopStaff = (currentUser.role === 'ShopAdmin' || currentUser.role === 'Operator') && String(currentUser.shopId) === String(order.shopId);
        const isSuperAdmin = currentUser.role === 'SuperAdmin';

        if (isSuperAdmin || isShopStaff || isCustomer) {
          useAppStore.setState((state) => ({
            orders: state.orders.some((o) => o._id === order._id) ? state.orders : [order, ...state.orders]
          }));

          const orderNumber = String(order._id).slice(-6).toUpperCase();
          let title = 'New Order Placed';
          let body = `Order #${orderNumber} of ₹${order.totalAmount} has been placed.`;

          if (isCustomer) {
            title = 'Order Placed Successfully';
            body = `Your order #${orderNumber} of ₹${order.totalAmount} is confirmed. We will pick up your laundry soon!`;
          } else if (isShopStaff || isSuperAdmin) {
            title = 'New Order Received';
            body = `Order #${orderNumber} received for ₹${order.totalAmount} (${order.customerName || 'Customer'}).`;
          }

          useNotificationStore.getState().addNotification({
            title,
            body,
            data: { orderId: order._id, status: order.status },
          });

          triggerLocalAlert(title, body, { orderId: order._id, status: order.status });
        }
      };

      const onOrderUpdated = (order: any) => {
        const isCustomer = currentUser.role === 'Customer' && String(currentUser._id) === String(order.customerId);
        const isShopStaff = (currentUser.role === 'ShopAdmin' || currentUser.role === 'Operator') && String(currentUser.shopId) === String(order.shopId);
        const isDelivery = currentUser.role === 'Delivery' && String(currentUser._id) === String(order.deliveryBoyId);
        const isSuperAdmin = currentUser.role === 'SuperAdmin';

        if (isSuperAdmin || isShopStaff || isCustomer || isDelivery) {
          useAppStore.setState((state) => ({
            orders: state.orders.map((o) => (o._id === order._id ? order : o))
          }));

          const orderNumber = String(order._id).slice(-6).toUpperCase();
          const formattedStatus = (order.status || '').replace(/_/g, ' ');
          let title = `Order #${orderNumber} Updated`;
          let body = `Status is now: ${formattedStatus}`;

          if (isCustomer) {
            if (order.status === 'DELIVERED') {
              title = 'Order Delivered! 🎉';
              body = `Your laundry has been delivered successfully. Thank you for choosing WoW Laundry!`;
            } else if (order.status === 'OUT_FOR_DELIVERY') {
              title = 'Out for Delivery 🛵';
              body = `Your laundry is out for delivery with our rider.`;
            } else if (order.status === 'READY_FOR_DELIVERY') {
              title = 'Clothes Clean & Ready ✨';
              body = `Your laundry is cleaned and packed, ready for delivery.`;
            } else if (order.status === 'PICKED_UP') {
              title = 'Laundry Picked Up 🧺';
              body = `Your laundry has been collected and is on its way to our wash unit.`;
            } else if (order.status === 'CANCELLED') {
              title = 'Order Cancelled';
              body = `Order #${orderNumber} was cancelled.`;
            } else if (order.status === 'PICKUP_ASSIGNED') {
              title = 'Driver Assigned 🛵';
              body = `${order.deliveryBoyName || 'A driver'} has been assigned to pick up your laundry.`;
            }
          } else if (isDelivery) {
            if (order.status === 'READY_FOR_DELIVERY') {
              title = 'Order Ready for Delivery 🛵';
              body = `Order #${orderNumber} for ${order.customerName || 'Customer'} is packed and ready for dispatch.`;
            } else if (order.status === 'PICKUP_ASSIGNED') {
              title = 'New Pickup Assigned 📦';
              body = `You have been assigned a new pickup for Order #${orderNumber}.`;
            }
          } else if (isShopStaff || isSuperAdmin) {
            title = `Order #${orderNumber}: ${formattedStatus}`;
            body = `Order for ${order.customerName || 'Customer'} updated to ${formattedStatus}.`;
          }

          useNotificationStore.getState().addNotification({
            title,
            body,
            data: { orderId: order._id, status: order.status },
          });

          triggerLocalAlert(title, body, { orderId: order._id, status: order.status });
        }
      };

      const onOrderDeleted = ({ orderId }: { orderId: string }) => {
        useAppStore.setState((state) => ({
          orders: state.orders.filter((o) => String(o._id) !== String(orderId)),
          orderTotal: Math.max(0, (state.orderTotal || state.orders.length) - 1),
        }));
      };

      // ── Shop Events ──────────────────────────────────────────────────────────────
      const onShopCreated = (shop: any) => {
        useAppStore.setState((state) => ({
          shops: state.shops.some((s) => s._id === shop._id) ? state.shops : [...state.shops, shop]
        }));
      };

      const onShopUpdated = (shop: any) => {
        useAppStore.setState((state) => ({
          shops: state.shops.map((s) => (s._id === shop._id ? shop : s))
        }));
      };

      const onShopDeleted = ({ shopId }: { shopId: string }) => {
        useAppStore.setState((state) => ({
          shops: state.shops.filter((s) => s._id !== shopId)
        }));
      };

      // ── Category Events ──────────────────────────────────────────────────────────
      const onCategoryCreated = (category: any) => {
        useAppStore.setState((state) => ({
          categories: state.categories.some((c) => c._id === category._id) ? state.categories : [...state.categories, category]
        }));
      };

      const onCategoryUpdated = (category: any) => {
        useAppStore.setState((state) => ({
          categories: state.categories.map((c) => (c._id === category._id ? category : c))
        }));
      };

      const onCategoryDeleted = ({ categoryId }: { categoryId: string }) => {
        useAppStore.setState((state) => ({
          categories: state.categories.filter((c) => c._id !== categoryId)
        }));
      };

      // ── Item Events ──────────────────────────────────────────────────────────────
      const onItemCreated = (item: any) => {
        useAppStore.setState((state) => ({
          items: state.items.some((i) => i._id === item._id) ? state.items : [...state.items, item]
        }));
      };

      const onItemUpdated = (item: any) => {
        useAppStore.setState((state) => ({
          items: state.items.map((i) => (i._id === item._id ? item : i))
        }));
      };

      const onItemDeleted = ({ itemId }: { itemId: string }) => {
        useAppStore.setState((state) => ({
          items: state.items.filter((i) => i._id !== itemId)
        }));
      };

      // ── Offer Events ─────────────────────────────────────────────────────────────
      const onOfferCreated = (offer: any) => {
        useAppStore.setState((state) => ({
          offers: state.offers.some((o) => o._id === offer._id) ? state.offers : [...state.offers, offer]
        }));
      };

      const onOfferUpdated = (offer: any) => {
        useAppStore.setState((state) => ({
          offers: state.offers.map((o) => (o._id === offer._id ? offer : o))
        }));
      };

      const onOfferDeleted = ({ offerId }: { offerId: string }) => {
        useAppStore.setState((state) => ({
          offers: state.offers.filter((o) => o._id !== offerId)
        }));
      };

      // ── User Events ──────────────────────────────────────────────────────────────
      const onUserCreated = (user: any) => {
        useAppStore.setState((state) => ({
          users: state.users.some((u) => u._id === user._id) ? state.users : [...state.users, user]
        }));
      };

      const onUserUpdated = (user: any) => {
        useAppStore.setState((state) => ({
          users: state.users.map((u) => (u._id === user._id ? user : u))
        }));
      };

      const onUserDeleted = ({ userId }: { userId: string }) => {
        useAppStore.setState((state) => ({
          users: state.users.filter((u) => u._id !== userId)
        }));
      };

      // Register listeners
      socket.on('order_created', onOrderCreated);
      socket.on('order_updated', onOrderUpdated);
      socket.on('order_deleted', onOrderDeleted);
      socket.on('shop_created', onShopCreated);
      socket.on('shop_updated', onShopUpdated);
      socket.on('shop_deleted', onShopDeleted);
      socket.on('category_created', onCategoryCreated);
      socket.on('category_updated', onCategoryUpdated);
      socket.on('category_deleted', onCategoryDeleted);
      socket.on('item_created', onItemCreated);
      socket.on('item_updated', onItemUpdated);
      socket.on('item_deleted', onItemDeleted);
      socket.on('offer_created', onOfferCreated);
      socket.on('offer_updated', onOfferUpdated);
      socket.on('offer_deleted', onOfferDeleted);
      socket.on('user_created', onUserCreated);
      socket.on('user_updated', onUserUpdated);
      socket.on('user_deleted', onUserDeleted);

      return () => {
        socket.off('order_created', onOrderCreated);
        socket.off('order_updated', onOrderUpdated);
        socket.off('order_deleted', onOrderDeleted);
        socket.off('shop_created', onShopCreated);
        socket.off('shop_updated', onShopUpdated);
        socket.off('shop_deleted', onShopDeleted);
        socket.off('category_created', onCategoryCreated);
        socket.off('category_updated', onCategoryUpdated);
        socket.off('category_deleted', onCategoryDeleted);
        socket.off('item_created', onItemCreated);
        socket.off('item_updated', onItemUpdated);
        socket.off('item_deleted', onItemDeleted);
        socket.off('offer_created', onOfferCreated);
        socket.off('offer_updated', onOfferUpdated);
        socket.off('offer_deleted', onOfferDeleted);
        socket.off('user_created', onUserCreated);
        socket.off('user_updated', onUserUpdated);
        socket.off('user_deleted', onUserDeleted);
      };
    } else {
      disconnectSocket();
    }
  }, [currentUser]);

  return null;
};
