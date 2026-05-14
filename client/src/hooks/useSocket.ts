import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getSocketUrl } from '@/lib/config';

export function useSocket(groupId: string | null | undefined) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!groupId) return;

    const socketUrl = getSocketUrl();
    if (!socketUrl) return;

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      socket.emit('join-group', { groupId });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [groupId]);

  return socketRef;
}
