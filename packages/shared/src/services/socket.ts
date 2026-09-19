import { io, Socket } from 'socket.io-client';
import { BASE_URL } from './api';

const socketUrl = BASE_URL.replace('/api', '');

export const socket: Socket = io(socketUrl, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

export const connectSocket = (user?: { _id?: string; shopId?: string; role?: string } | null) => {
  if (user) {
    socket.io.opts.query = {
      userId: user._id || '',
      shopId: user.shopId || '',
      role: user.role || '',
    };
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
    const { useAppStore } = require('../store/useAppStore');
    const user = useAppStore.getState().currentUser;
    if (user) {
      socket.emit('join', {
        userId: user._id,
        shopId: user.shopId,
        role: user.role,
      });
    }
  } catch (e) {
    // Avoid circular dependency during early initialization
  }
});

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};
