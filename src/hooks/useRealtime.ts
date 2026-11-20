import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SEED_OFFERS, SEED_TRADERS } from '../../server/seedData';
import {
  SUPPORT_CHAT_MARKER,
  claimPendingTradeSettlements,
  fetchChatMessages,
  fetchTradeMessages,
  getToken,
  isQuotaExceededError,
  normalizeNotificationDoc,
  normalizeOfferDoc,
  normalizeTradeDoc,
  normalizeTraderDoc,
  normalizeUserDoc,
  tsToIso,
} from '../api';
import { OperationType, db, handleFirestoreError } from '../firebase';
import type {
  AppNotification,
  DirectChat,
  DirectMessage,
  P2POffer,
  TradeMessage,
  TradeOrder,
  TraderProfile,
  UserAccount,
} from '../types';

export interface RealtimeHandlers {
  onConnected?: (onlineUsers: string[]) => void;
  onPresenceUpdate?: (onlineUsers: string[]) => void;
  onOffersSnapshot?: (offers: P2POffer[]) => void;
  onTradersSnapshot?: (traders: Record<string, TraderProfile>) => void;
  onTradesSnapshot?: (trades: TradeOrder[]) => void;
  onActiveTradeMessages?: (tradeId: string, messages: TradeMessage[]) => void;
  onChatsSnapshot?: (chats: DirectChat[]) => void;
  onActiveChatMessages?: (chatId: string, messages: DirectMessage[]) => void;
  onNotificationsSnapshot?: (notifications: AppNotification[]) => void;
  onTradeCreated?: (trade: TradeOrder) => void;
  onTradeMessage?: (payload: { tradeId: string; message: TradeMessage; trade: TradeOrder }) => void;
  onTradeUpdated?: (trade: TradeOrder) => void;
  onTradeTyping?: (payload: { tradeId: string; username: string; isTyping: boolean }) => void;
  onDmMessage?: (payload: { chatId: string; message: DirectMessage; chat: DirectChat }) => void;
  onDmUpdated?: (chat: DirectChat) => void;
  onDmTyping?: (payload: { chatId: string; username: string; isTyping: boolean }) => void;
  onOfferCreated?: (offer: P2POffer) => void;
  onOfferUpdated?: (offer: P2POffer) => void;
  onOfferDeleted?: (offerId: string) => void;
  onTraderUpdated?: (trader: TraderProfile) => void;
  onUserUpdated?: (user: UserAccount) => void;
  onNotificationNew?: (payload: { notification: AppNotification; unreadCount: number }) => void;
  onServerLoadError?: () => void;
}

export interface RealtimeOptions {
  currentUsername?: string;
  activeTradeId?: string;
  activeChatId?: string;
}

export function useRealtime(
  enabled: boolean,
  handlers: RealtimeHandlers,
  options?: RealtimeOptions
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const currentUsername = options?.currentUsername;
  const activeTradeId = options?.activeTradeId;
  const activeChatId = options?.activeChatId;

  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [wsConnected, setWsConnected] = useState(false);

  const latestUserRef = useRef<UserAccount | null>(null);
  const currentUsernameRef = useRef<string | undefined>(currentUsername);
  currentUsernameRef.current = currentUsername;
  const tradeMsgsCacheRef = useRef<Record<string, TradeMessage[]>>({});
  const chatMsgsCacheRef = useRef<Record<string, DirectMessage[]>>({});

  // Public real-time marketplace listeners (offers & traders) — mount once without tearing down on login/logout
  useEffect(() => {
    const unsubOffers = onSnapshot(
      query(collection(db, 'offers'), limit(150)),
      (snap) => {
        const customOffers = snap.docs
          .map((d) => normalizeOfferDoc(d.data()))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const customIds = new Set(customOffers.map((o) => o.id.toLowerCase()));
        const merged = [
          ...customOffers,
          ...SEED_OFFERS.filter((o) => !customIds.has(o.id.toLowerCase())),
        ];
        handlersRef.current.onOffersSnapshot?.(merged);
      },
      (err) => {
        if (isQuotaExceededError(err)) {
          handlersRef.current.onServerLoadError?.();
          return;
        }
        if ((err as { code?: string })?.code === 'permission-denied') {
          handleFirestoreError(err, OperationType.LIST, 'offers');
        }
      }
    );

    const unsubTraders = onSnapshot(
      query(collection(db, 'traders'), limit(150)),
      (snap) => {
        const merged: Record<string, TraderProfile> = { ...SEED_TRADERS };
        const activeList: string[] = [];
        for (const d of snap.docs) {
          const raw = d.data();
          if (raw.tagline === '__REMOVED__') continue;
          const t = normalizeTraderDoc(raw);
          if (t.username) {
            merged[t.username] = t;
            if (t.lastSeenMinutes === 0) {
              activeList.push(t.username);
            }
          }
        }
        const curName = currentUsernameRef.current;
        if (curName && !activeList.includes(curName)) {
          activeList.push(curName);
        }
        setOnlineUsers(activeList);
        handlersRef.current.onPresenceUpdate?.(activeList);
        handlersRef.current.onTradersSnapshot?.(merged);
      },
      (err) => {
        if (isQuotaExceededError(err)) {
          handlersRef.current.onServerLoadError?.();
          return;
        }
        if ((err as { code?: string })?.code === 'permission-denied') {
          handleFirestoreError(err, OperationType.LIST, 'traders');
        }
      }
    );

    return () => {
      unsubOffers();
      unsubTraders();
    };
  }, []);

  // Authenticated private real-time listeners (user wallet, trades, chats, notifications)
  useEffect(() => {
    const token = getToken();
    if (!enabled || !token || !currentUsername) {
      setWsConnected(false);
      latestUserRef.current = null;
      return;
    }

    const uid = currentUsername.trim().toLowerCase();
    let active = true;
    setWsConnected(true);

    const unsubUser = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (!active || !snap.exists()) return;
        const normalized = normalizeUserDoc(snap.data());
        latestUserRef.current = normalized;
        handlersRef.current.onUserUpdated?.(normalized);
      },
      (err) => {
        if (active && getToken()) {
          if (isQuotaExceededError(err)) {
            handlersRef.current.onServerLoadError?.();
            return;
          }
          if ((err as { code?: string })?.code === 'permission-denied') {
            handleFirestoreError(err, OperationType.GET, `users/${uid}`);
          }
        }
      }
    );

    const tradesQuery = query(
      collection(db, 'trades'),
      where('participantUids', 'array-contains', uid),
      limit(30)
    );
    const unsubTrades = onSnapshot(
      tradesQuery,
      async (snap) => {
        if (!active) return;

        let needsClaim = false;
        for (const d of snap.docs) {
          const t = d.data();
          if (
            (t.status === 'completed' &&
              ((t.buyerUid === uid && t.buyerSettled !== true) ||
                (t.sellerUid === uid && t.sellerSettled !== true && t.side === 'swap_crypto'))) ||
            (t.status === 'cancelled' &&
              ((t.sellerUid === uid &&
                t.sellerRefunded !== true &&
                t.lastReadAtBy?.__adminEscrowOverride !== '1' &&
                (t.lastReadAtBy?.__escrowState === 'funded' ||
                  (t.side === 'buy_crypto' &&
                    t.lastReadAtBy?.__escrowState !== 'awaiting_seller'))) ||
                (t.buyerUid === uid && t.buyerRefunded !== true && t.side === 'swap_crypto')))
          ) {
            needsClaim = true;
            break;
          }
        }

        if (needsClaim && latestUserRef.current) {
          try {
            const claimed = await claimPendingTradeSettlements(uid, latestUserRef.current);
            if (active && claimed.updated) {
              latestUserRef.current = claimed.user;
              handlersRef.current.onUserUpdated?.(claimed.user);
            }
          } catch {
            // handled on next sync
          }
        }

        // Only prefetch lightweight previews for open/active trades so closed history doesn't burn startup reads
        const missingIds = snap.docs
          .filter((d) => {
            const st = String(d.data().status ?? '');
            return st === 'escrow_funded' || st === 'payment_sent' || st === 'disputed';
          })
          .map((d) => d.id)
          .filter((id) => !(id in tradeMsgsCacheRef.current))
          .slice(0, 5);
        if (missingIds.length > 0) {
          await Promise.all(
            missingIds.map(async (id) => {
              try {
                tradeMsgsCacheRef.current[id] = await fetchTradeMessages(id, 10);
              } catch {
                tradeMsgsCacheRef.current[id] = [];
              }
            })
          );
        }

        if (!active) return;
        const nextTrades = snap.docs
          .map((d) =>
            normalizeTradeDoc(
              d.data(),
              tradeMsgsCacheRef.current[d.id] ?? [],
              currentUsername
            )
          )
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        handlersRef.current.onTradesSnapshot?.(nextTrades);
      },
      (err) => {
        if (active && getToken()) {
          if (isQuotaExceededError(err)) {
            handlersRef.current.onServerLoadError?.();
            return;
          }
          if ((err as { code?: string })?.code === 'permission-denied') {
            handleFirestoreError(err, OperationType.LIST, 'trades');
          }
        }
      }
    );

    const chatsQuery = query(
      collection(db, 'chats'),
      where('participantUids', 'array-contains', uid),
      limit(30)
    );
    const unsubChats = onSnapshot(
      chatsQuery,
      async (snap) => {
        if (!active) return;
        const visibleDocs = snap.docs
          .filter(
            (d) =>
              d.data().offerId !== SUPPORT_CHAT_MARKER && d.data().offerId !== 'archived_hidden'
          )
          .sort(
            (a, b) =>
              new Date(tsToIso(b.data().updatedAt)).getTime() -
              new Date(tsToIso(a.data().updatedAt)).getTime()
          );
        const missingIds = visibleDocs
          .map((d) => d.id)
          .filter((id) => !(id in chatMsgsCacheRef.current))
          .slice(0, 3);
        if (missingIds.length > 0) {
          await Promise.all(
            missingIds.map(async (id) => {
              try {
                chatMsgsCacheRef.current[id] = await fetchChatMessages(id, 10);
              } catch {
                chatMsgsCacheRef.current[id] = [];
              }
            })
          );
        }

        if (!active) return;
        const nextChats: DirectChat[] = visibleDocs
          .map((d) => {
            const data = d.data();
            return {
              id: String(data.id ?? d.id),
              participants: (data.participants ?? ['', '']) as [string, string],
              offerId: typeof data.offerId === 'string' ? data.offerId : undefined,
              offerSummary:
                typeof data.offerSummary === 'string' ? data.offerSummary : undefined,
              createdAt: tsToIso(data.createdAt),
              updatedAt: tsToIso(data.updatedAt),
              messages: chatMsgsCacheRef.current[d.id] ?? [],
              lastReadAtBy: (data.lastReadAtBy ?? undefined) as
                | Record<string, string>
                | undefined,
            };
          })
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        handlersRef.current.onChatsSnapshot?.(nextChats);
      },
      (err) => {
        if (active && getToken()) {
          if (isQuotaExceededError(err)) {
            handlersRef.current.onServerLoadError?.();
            return;
          }
          if ((err as { code?: string })?.code === 'permission-denied') {
            handleFirestoreError(err, OperationType.LIST, 'chats');
          }
        }
      }
    );

    const notifQuery = query(
      collection(db, 'notifications'),
      where('toUid', '==', uid),
      limit(50)
    );
    const unsubNotifs = onSnapshot(
      notifQuery,
      (snap) => {
        if (!active) return;
        const list = snap.docs
          .map((d) => normalizeNotificationDoc(d.data()))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 60);
        handlersRef.current.onNotificationsSnapshot?.(list);
      },
      (err) => {
        if (active && getToken()) {
          if (isQuotaExceededError(err)) {
            handlersRef.current.onServerLoadError?.();
            return;
          }
          if ((err as { code?: string })?.code === 'permission-denied') {
            handleFirestoreError(err, OperationType.LIST, 'notifications');
          }
        }
      }
    );

    return () => {
      active = false;
      setWsConnected(false);
      unsubUser();
      unsubTrades();
      unsubChats();
      unsubNotifs();
    };
  }, [enabled, currentUsername]);

  // Live subcollection listener for the currently open escrow trade chat room
  useEffect(() => {
    if (!enabled || !getToken() || !activeTradeId) return;

    const msgsQuery = query(
      collection(db, 'trades', activeTradeId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(80)
    );
    const unsub = onSnapshot(
      msgsQuery,
      (snap) => {
        const msgs: TradeMessage[] = snap.docs.reverse().map((d) => {
          const m = d.data();
          return {
            id: String(m.id ?? d.id),
            sender: String(m.sender ?? 'System'),
            text: String(m.text ?? ''),
            timestamp: tsToIso(m.createdAt),
            isSystem: typeof m.isSystem === 'boolean' ? m.isSystem : undefined,
          };
        });
        tradeMsgsCacheRef.current[activeTradeId] = msgs;
        handlersRef.current.onActiveTradeMessages?.(activeTradeId, msgs);
      },
      (err) => {
        if (getToken() && (err as { code?: string })?.code === 'permission-denied') {
          handleFirestoreError(err, OperationType.LIST, `trades/${activeTradeId}/messages`);
        }
      }
    );

    return () => unsub();
  }, [enabled, activeTradeId]);

  // Live subcollection listener for the currently open direct chat modal
  useEffect(() => {
    if (!enabled || !getToken() || !activeChatId) return;

    const msgsQuery = query(
      collection(db, 'chats', activeChatId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(80)
    );
    const unsub = onSnapshot(
      msgsQuery,
      (snap) => {
        const msgs: DirectMessage[] = snap.docs.reverse().map((d) => {
          const m = d.data();
          return {
            id: String(m.id ?? d.id),
            sender: String(m.sender ?? ''),
            text: String(m.text ?? ''),
            timestamp: tsToIso(m.createdAt),
            offerId: typeof m.offerId === 'string' ? m.offerId : undefined,
          };
        });
        chatMsgsCacheRef.current[activeChatId] = msgs;
        handlersRef.current.onActiveChatMessages?.(activeChatId, msgs);
      },
      (err) => {
        if (getToken() && (err as { code?: string })?.code === 'permission-denied') {
          handleFirestoreError(err, OperationType.LIST, `chats/${activeChatId}/messages`);
        }
      }
    );

    return () => unsub();
  }, [enabled, activeChatId]);

  // Preserved method signatures for child modal components
  const sendTyping = useCallback((_tradeId: string, _isTyping: boolean) => {
    // Ephemeral typing indicator no-op in serverless Firestore mode
  }, []);

  const sendTradeRead = useCallback((_tradeId: string) => {
    // Read receipts are persisted via api.markTradeRead
  }, []);

  const sendDmTyping = useCallback((_chatId: string, _isTyping: boolean) => {
    // Ephemeral typing indicator no-op in serverless Firestore mode
  }, []);

  const sendDmRead = useCallback((_chatId: string) => {
    // Read receipts are persisted via api.markDirectChatRead
  }, []);

  return {
    onlineUsers,
    wsConnected,
    sendTyping,
    sendTradeRead,
    sendDmTyping,
    sendDmRead,
  };
}
