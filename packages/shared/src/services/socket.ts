import { io, Socket } from 'socket.io-client';
import { BASE_URL } from './api';

const socketUrl = BASE_URL.replace('/api', '');

export const socket: Socket = io(socketUrl, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

export const connectSocket = (user?: { _id?: string; shopId?: string; role?: string } | null) => {
  if (user) {
    const userQuery: Record<string, string> = {
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
    socket.emit('join', {
      userId: user._id,
      shopId: user.shopId,
      role: user.role,
    });
  }
};

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
    // Guard against circular dependency during early initialization
  }
});

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};
