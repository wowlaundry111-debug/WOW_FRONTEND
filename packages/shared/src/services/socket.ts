import { io, Socket } from 'socket.io-client';
import { BASE_URL } from './api';
import { useAppStore } from '../store/useAppStore';

const socketUrl = BASE_URL.replace('/api', '');

export const socket: Socket = io(socketUrl, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

export const connectSocket = (user?: { _id?: string; shopId?: string; role?: string } | null) => {
  if (user) {
    const userQuery = {
      userId: user._id || '',
      shopId: user.shopId || '',
      role: user.role || '',
    };
    (socket as any).auth = userQuery;
    if (socket.io && socket.io.opts) {
      socket.io.opts.query = userQuery;
    }
  }

  if (!socket.connected) {
    socket.connect();
  } else if (user) {
    // If already connected, emit join event to subscribe to updated rooms
    socket.emit('join', {
      userId: user._id,
      shopId: user.shopId,
      role: user.role,
    });
  }
};

// Auto re-join rooms on reconnect
socket.on('connect', () => {
  try {
    const user = useAppStore.getState().currentUser;
    if (user) {
      socket.emit('join', {
        userId: user._id,
        shopId: user.shopId,
        role: user.role,
      });
    }
  } catch (e) {
    // Avoid circular dependency or storage delay during early initialization
  }
});

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};
