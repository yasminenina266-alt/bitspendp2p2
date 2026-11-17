import { useCallback, useEffect, useRef, useState } from 'react';
import { getToken } from '../api';
import type { AppNotification, TradeMessage, TradeOrder, UserAccount } from '../types';

export interface RealtimeHandlers {
  onConnected?: (onlineUsers: string[]) => void;
  onPresenceUpdate?: (onlineUsers: string[]) => void;
  onTradeCreated?: (trade: TradeOrder) => void;
  onTradeMessage?: (payload: { tradeId: string; message: TradeMessage; trade: TradeOrder }) => void;
  onTradeUpdated?: (trade: TradeOrder) => void;
  onTradeTyping?: (payload: { tradeId: string; username: string; isTyping: boolean }) => void;
  onUserUpdated?: (user: UserAccount) => void;
  onNotificationNew?: (payload: { notification: AppNotification; unreadCount: number }) => void;
}

export function useRealtime(enabled: boolean, handlers: RealtimeHandlers) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!enabled || !token || typeof window === 'undefined') {
      setOnlineUsers([]);
      setWsConnected(false);
      return;
    }

    let closedByUser = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;

    const connect = () => {
      if (closedByUser) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch {
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25_000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(String(event.data)) as {
            type?: string;
            onlineUsers?: string[];
            trade?: TradeOrder;
            tradeId?: string;
            message?: TradeMessage;
            username?: string;
            isTyping?: boolean;
            user?: UserAccount;
            notification?: AppNotification;
            unreadCount?: number;
          };
          if (data.type === 'connected' && Array.isArray(data.onlineUsers)) {
            setOnlineUsers(data.onlineUsers);
            handlersRef.current.onConnected?.(data.onlineUsers);
          } else if (data.type === 'presence:update' && Array.isArray(data.onlineUsers)) {
            setOnlineUsers(data.onlineUsers);
            handlersRef.current.onPresenceUpdate?.(data.onlineUsers);
          } else if (data.type === 'trade:created' && data.trade) {
            handlersRef.current.onTradeCreated?.(data.trade);
          } else if (data.type === 'trade:message' && data.trade && data.message && data.tradeId) {
            handlersRef.current.onTradeMessage?.({
              tradeId: data.tradeId,
              message: data.message,
              trade: data.trade,
            });
          } else if (data.type === 'trade:updated' && data.trade) {
            handlersRef.current.onTradeUpdated?.(data.trade);
          } else if (data.type === 'trade:typing' && data.tradeId && data.username) {
            handlersRef.current.onTradeTyping?.({
              tradeId: data.tradeId,
              username: data.username,
              isTyping: Boolean(data.isTyping),
            });
          } else if (data.type === 'user:updated' && data.user) {
            handlersRef.current.onUserUpdated?.(data.user);
          } else if (data.type === 'notification:new' && data.notification) {
            handlersRef.current.onNotificationNew?.({
              notification: data.notification,
              unreadCount: Number(data.unreadCount ?? 0),
            });
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (pingTimer) clearInterval(pingTimer);
        if (!closedByUser) {
          reconnectTimer = setTimeout(connect, 2500);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      closedByUser = true;
      if (pingTimer) clearInterval(pingTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) {
        wsRef.current.close();
      }
      wsRef.current = null;
    };
  }, [enabled]);

  const sendTyping = useCallback((tradeId: string, isTyping: boolean) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'typing', tradeId, isTyping }));
    }
  }, []);

  const sendTradeRead = useCallback((tradeId: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'trade:read', tradeId }));
    }
  }, []);

  return {
    onlineUsers,
    wsConnected,
    sendTyping,
    sendTradeRead,
  };
}
