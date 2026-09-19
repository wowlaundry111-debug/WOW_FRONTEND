import { useState, useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { useNotificationStore } from '../store/useNotificationStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let cachedPushToken: string | undefined = undefined;

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>(cachedPushToken);
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  
  const currentUser = useAppStore((state: any) => state.currentUser);

  // Sync token whenever currentUser becomes available or changes
  useEffect(() => {
    if (cachedPushToken && currentUser?._id) {
      saveTokenToBackend(cachedPushToken);
    }
  }, [currentUser]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // On Web, request standard browser Notification permission if available
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
      return;
    }

    registerForPushNotificationsAsync().then(pushToken => {
      if (pushToken) {
        cachedPushToken = pushToken;
        setExpoPushToken(pushToken);
        if (currentUser?._id) {
          saveTokenToBackend(pushToken);
        }
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
      // Add incoming foreground notification to persistent store
      const content = notification.request?.content;
      if (content) {
        useNotificationStore.getState().addNotification({
          title: content.title || 'New Notification',
          body: content.body || '',
          data: content.data,
        });
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response received:', response);
      const content = response.notification?.request?.content;
      if (content) {
        useNotificationStore.getState().addNotification({
          title: content.title || 'New Notification',
          body: content.body || '',
          data: content.data,
        });
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  async function saveTokenToBackend(pushToken: string) {
    try {
      await api.put('/auth/users/push-token', { expoPushToken: pushToken });
      console.log('Successfully registered push token with backend:', pushToken);
    } catch (error) {
      console.error('Failed to save push token to backend:', error);
    }
  }

  return {
    expoPushToken,
    notification,
  };
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'web') {
    return undefined;
  }

  if (Platform.OS === 'android') {
    // Primary branded channel for WoW Laundry
    await Notifications.setNotificationChannelAsync('wow_laundry_channel', {
      name: 'WoW Laundry',
      description: 'Official order status and delivery updates from WoW Laundry',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#002B2E',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    // Also configure default channel
    await Notifications.setNotificationChannelAsync('default', {
      name: 'WoW Laundry',
      description: 'WoW Laundry notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#002B2E',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Push notification permission was not granted');
      return undefined;
    }
    
    // Determine project ID with known fallbacks
    const bundleId = Constants?.expoConfig?.ios?.bundleIdentifier || Constants?.expoConfig?.android?.package || '';
    const isPartner = bundleId.includes('partner') || Constants?.expoConfig?.slug === 'wow-partner';
    const fallbackProjectId = isPartner
      ? 'baf0aeae-04f2-4eed-9265-1d887e62f906'
      : '8813961e-0829-4933-bbec-4f1d58b2f52c';

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId ??
      fallbackProjectId;

    try {
      token = (await Notifications.getExpoPushTokenAsync({
        projectId,
      })).data;
      console.log('Expo Push Token registered:', token);
    } catch (e) {
      console.error('Error fetching Expo Push Token:', e);
    }
  } else {
    console.log('Push notifications require a physical device; running in simulator/emulator environment');
  }

  return token;
}
