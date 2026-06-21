import { useEffect, useRef } from 'react';
import { getSocket } from '../services/socketClient';
import { SocketEvent } from '../types';

type Handler<T = unknown> = (data: T) => void;

export function useSocket<T = unknown>(event: SocketEvent, handler: Handler<T>): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket  = getSocket();
    const wrapped = (data: T) => handlerRef.current(data);
    socket.on(event, wrapped as any);
    return () => { socket.off(event, wrapped as any); };
  }, [event]);
}
