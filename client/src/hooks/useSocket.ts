import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(groupId: string | null | undefined) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!groupId) return;

    const socket = io(window.location.origin, {
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
