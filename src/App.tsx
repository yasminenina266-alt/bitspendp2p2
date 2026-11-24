import { ArrowUpDown, ChevronDown, Lock, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SEED_OFFERS, SEED_TRADERS } from '../server/seedData';
import {
  ApiError,
  api,
  enrichTradeMessages,
  getSupportChatId,
  getToken,
  hasSavedSupportVisitorId,
  isQuotaExceededError,
  setToken,
} from './api';
import { AccountView } from './components/AccountView';
import { AuthModal } from './components/AuthModal';
import { CoinIcon } from './components/CoinIcon';
import { CreateOfferModal } from './components/CreateOfferModal';
import { DirectChatModal } from './components/DirectChatModal';
import { Header, type AppTab } from './components/Header';
import {
  MessagesModal,
  getDirectChatUnreadCount,
  getTradeUnreadCount,
} from './components/MessagesModal';
import { OfferDetailView } from './components/OfferDetailView';
import { OfferFilterBar, type OfferFilters } from './components/OfferFilterBar';
import { OfferRow, getOfferUnitPrice } from './components/OfferRow';
import { ProfileView } from './components/ProfileView';
import { SecretCreditModal } from './components/SecretCreditModal';
import { SupportChatModal } from './components/SupportChatModal';
import { TradeModal } from './components/TradeModal';
import { CRYPTO_ASSETS, DEFAULT_FIAT_RATES } from './constants/market';
import { useRealtime } from './hooks/useRealtime';
import type {
  AppNotification,
  CryptoAsset,
  DirectChat,
  MarketPrices,
  P2POffer,
  TradeOrder,
  TraderProfile,
  UserAccount,
} from './types';
import { notifyDiscordEvent } from './utils/discordWebhook';

type SortOption = 'best' | 'price_asc' | 'price_desc' | 'trades' | 'rating';

const INITIAL_FILTERS: OfferFilters = {
  intent: 'buy',
  crypto: 'ALL',
  paymentMethod: '',
  searchQuery: '',
  fiat: 'ALL',
  country: 'ALL',
  amount: '',
  hideInactive: true,
  verifiedOnly: false,
  minRating: 0,
  selectedTags: [],
};

const FALLBACK_PRICES: MarketPrices = {
  usdPrices: {
    BTC: 91250,
    XMR: 184.6,
    ETH: 3140,
    USDT: 1,
    LTC: 86.4,
    SOL: 214.5,
    USDC: 1,
  },
  fiatRatesFromUsd: { ...DEFAULT_FIAT_RATES },
  changes24h: {
    BTC: 2.1,
    XMR: 3.4,
    ETH: 1.8,
    USDT: 0,
    LTC: 0.9,
    SOL: 4.1,
    USDC: 0,
  },
  source: 'Live Market Rates',
  updatedAt: 0,
};

type RouteMatch =
  | { kind: 'home' }
  | { kind: 'offer'; offerId: string }
  | { kind: 'profile'; username: string };

const RESERVED_ROOT_PATHS = new Set([
  '',
  'api',
  'ws',
  'assets',
  'offer',
  'favicon.svg',
  'og-image.jpg',
  'robots.txt',
  'sitemap.xml',
]);

function parseRoutePath(pathname: string): RouteMatch {
  const trimmed = pathname.replace(/^\/+|\/+$/g, '');
  if (!trimmed) return { kind: 'home' };
  const parts = trimmed.split('/');
  if (parts[0] === 'offer' && parts[1]) {
    try {
      return { kind: 'offer', offerId: decodeURIComponent(parts[1]) };
    } catch {
      return { kind: 'offer', offerId: parts[1] };
    }
  }
  if (parts.length === 1 && !RESERVED_ROOT_PATHS.has(parts[0].toLowerCase())) {
    try {
      return { kind: 'profile', username: decodeURIComponent(parts[0]) };
    } catch {
      return { kind: 'profile', username: parts[0] };
    }
  }
  return { kind: 'home' };
}

function matchesSearchQuery(offer: P2POffer, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  const qClean = q.replace(/^@+/, '');
  return (
    offer.id.toLowerCase().includes(q) ||
    offer.id.toLowerCase().includes(qClean) ||
    offer.traderUsername.toLowerCase().includes(qClean) ||
    offer.paymentMethod.toLowerCase().includes(q) ||
    offer.crypto.toLowerCase().includes(q) ||
    (offer.swapToCrypto ?? '').toLowerCase().includes(q) ||
    offer.fiat.toLowerCase().includes(q) ||
    offer.country.toLowerCase().includes(q) ||
    offer.terms.toLowerCase().includes(q) ||
    offer.tags.some((t) => t.toLowerCase().includes(q))
  );
}

function normalizePrices(raw?: Partial<MarketPrices> | null): MarketPrices {
  if (!raw || typeof raw !== 'object') return FALLBACK_PRICES;
  const rawSource = typeof raw.source === 'string' ? raw.source : '';
  const sanitizedSource =
    rawSource && !/coingecko|cryptocompare|kraken/i.test(rawSource)
      ? rawSource
      : FALLBACK_PRICES.source;
  return {
    usdPrices: {
      ...FALLBACK_PRICES.usdPrices,
      ...(raw.usdPrices && typeof raw.usdPrices === 'object' ? raw.usdPrices : {}),
    },
    fiatRatesFromUsd: {
      ...FALLBACK_PRICES.fiatRatesFromUsd,
      ...(raw.fiatRatesFromUsd && typeof raw.fiatRatesFromUsd === 'object'
        ? raw.fiatRatesFromUsd
        : {}),
    },
    changes24h: {
      ...FALLBACK_PRICES.changes24h,
      ...(raw.changes24h && typeof raw.changes24h === 'object' ? raw.changes24h : {}),
    },
    source: sanitizedSource,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
  };
}

export default function App() {
  const initialRoute = useMemo<RouteMatch>(
    () => (typeof window !== 'undefined' ? parseRoutePath(window.location.pathname) : { kind: 'home' }),
    []
  );

  const [darkMode, setDarkMode] = useState(() => {
    try {
      return (localStorage.getItem('oosab_theme') ?? localStorage.getItem('bitspend_theme')) === 'dark';
    } catch {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState<'offers' | 'account' | 'profile' | 'offer'>(() =>
    initialRoute.kind === 'profile'
      ? 'profile'
      : initialRoute.kind === 'offer'
        ? 'offer'
        : 'offers'
  );
  const [profileUsername, setProfileUsername] = useState<string | null>(() =>
    initialRoute.kind === 'profile' ? initialRoute.username : null
  );
  const [activeOfferId, setActiveOfferId] = useState<string | null>(() =>
    initialRoute.kind === 'offer' ? initialRoute.offerId : null
  );
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);

  const [prices, setPrices] = useState<MarketPrices>(FALLBACK_PRICES);
  const [refreshingPrices, setRefreshingPrices] = useState(false);

  const [offers, setOffers] = useState<P2POffer[]>(SEED_OFFERS);
  const [traders, setTraders] = useState<Record<string, TraderProfile>>(SEED_TRADERS);
  const [loadingOffers, setLoadingOffers] = useState(false);

  const [filters, setFilters] = useState<OfferFilters>(INITIAL_FILTERS);
  const [sortBy, setSortBy] = useState<SortOption>('best');
  const [visibleCount, setVisibleCount] = useState(20);

  // Auth, User, Notifications & Chat State
  const [user, setUser] = useState<UserAccount | null>(null);
  const [trades, setTrades] = useState<TradeOrder[]>([]);
  const [directChats, setDirectChats] = useState<DirectChat[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [typingByTrade, setTypingByTrade] = useState<Record<string, string | null>>({});
  const [dmTypingByChat, setDmTypingByChat] = useState<Record<string, string | null>>({});
  const typingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const dmTypingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingDirectChatRef = useRef<{ targetUsername: string; offer?: P2POffer } | null>(null);
  const tradesRef = useRef<TradeOrder[]>([]);
  tradesRef.current = trades;
  const directChatsRef = useRef<DirectChat[]>([]);
  directChatsRef.current = directChats;
  const lastMarkedTradeStampRef = useRef<Record<string, string>>({});
  const lastMarkedChatStampRef = useRef<Record<string, string>>({});

  // Modals
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null);
  const [createOfferOpen, setCreateOfferOpen] = useState(false);
  const [secretMenuOpen, setSecretMenuOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [supportChatOpen, setSupportChatOpen] = useState(false);
  const [supportUnreadCount, setSupportUnreadCount] = useState(0);
  const [depositNotice, setDepositNotice] = useState<{
    asset: CryptoAsset;
    requiredAmount?: number;
  } | null>(null);
  const [tradeModalState, setTradeModalState] = useState<{
    offer?: P2POffer;
    existingTrade?: TradeOrder;
  } | null>(null);
  const [directChatModalState, setDirectChatModalState] = useState<{
    chat: DirectChat;
  } | null>(null);

  const navigateToPath = useCallback((path: string, replace = false) => {
    if (typeof window === 'undefined') return;
    const target = path.startsWith('/') ? path : `/${path}`;
    if (window.location.pathname !== target) {
      if (replace) window.history.replaceState({}, '', target);
      else window.history.pushState({}, '', target);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    try {
      localStorage.setItem('oosab_theme', darkMode ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [darkMode]);

  useEffect(() => {
    if (!supportChatOpen && !hasSavedSupportVisitorId()) return;
    const chatId = getSupportChatId();
    const unsub = api.subscribeSupportChatDoc(chatId, (docData) => {
      if (!docData) {
        setSupportUnreadCount(0);
        return;
      }
      const lastAdminMsgAt = docData.lastReadAtBy?.lastAdminMsgAt ?? '';
      const lastVisitorRead = docData.lastReadAtBy?.visitor ?? '';
      setSupportUnreadCount(
        lastAdminMsgAt && (!lastVisitorRead || lastAdminMsgAt > lastVisitorRead) ? 1 : 0
      );
    });
    return () => unsub();
  }, [supportChatOpen]);

  useEffect(() => {
    const origin = window.location.origin;
    const currentUrl = origin + window.location.pathname;
    const ogImageUrl = `${origin}/og-image.jpg`;

    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = currentUrl;

    const ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (ogUrl) ogUrl.content = currentUrl;

    const ogImage = document.querySelector<HTMLMetaElement>('meta[property="og:image"]');
    if (ogImage) ogImage.content = ogImageUrl;

    const twitterImage = document.querySelector<HTMLMetaElement>('meta[name="twitter:image"]');
    if (twitterImage) twitterImage.content = ogImageUrl;
  }, [activeTab, profileUsername]);

  useEffect(() => {
    const viewTitle =
      activeTab === 'offer' && activeOfferId
        ? `OOSAB | P2P Offer ${activeOfferId}`
        : activeTab === 'profile' && profileUsername
          ? `OOSAB | ${profileUsername} Profile`
          : activeTab === 'account'
            ? 'OOSAB | Wallet & Escrow Trades'
            : filters.intent === 'swap'
              ? 'OOSAB | P2P Crypto Swap Offers'
              : filters.intent === 'sell'
                ? 'OOSAB | Sell Crypto P2P Marketplace'
                : 'OOSAB | No-KYC P2P Crypto Marketplace';
    document.title = viewTitle;
  }, [activeTab, activeOfferId, profileUsername, filters.intent]);

  const loadPrices = useCallback(async (force = false) => {
    setRefreshingPrices(true);
    try {
      const data = await api.getPrices(force);
      if (data?.usdPrices && typeof data.usdPrices.BTC === 'number') {
        setPrices(normalizePrices(data));
      }
    } catch {
      // keep existing prices
    } finally {
      setRefreshingPrices(false);
    }
  }, []);

  const loadUserWorkspace = useCallback(async () => {
    if (!getToken()) return;
    try {
      const meRes = await api.getMe();
      if (meRes?.user) {
        setUser(meRes.user);
      }
    } catch (err) {
      if (isQuotaExceededError(err) || (err instanceof ApiError && err.code === 'QUOTA_EXCEEDED')) {
        return;
      }
      if (err instanceof ApiError && err.status === 401) {
        setToken(null);
        setUser(null);
        setTrades([]);
        setDirectChats([]);
        setNotifications([]);
      }
    }
  }, []);

  const openOfferById = useCallback(
    (offerId: string, pushUrl = true) => {
      setTradeModalState(null);
      setDirectChatModalState(null);
      setProfileUsername(null);
      setActiveOfferId(offerId);
      setActiveTab('offer');
      if (pushUrl) {
        navigateToPath(`/offer/${encodeURIComponent(offerId)}`);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [navigateToPath]
  );

  useEffect(() => {
    loadPrices(false);
    loadUserWorkspace();
    const priceTimer = setInterval(() => loadPrices(false), 60_000);
    const onFocus = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        void loadPrices(false);
      }
    };
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(priceTimer);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadPrices, loadUserWorkspace]);

  useEffect(() => {
    const onPopState = () => {
      const route = parseRoutePath(window.location.pathname);
      if (route.kind === 'profile') {
        setTradeModalState(null);
        setDirectChatModalState(null);
        setActiveOfferId(null);
        setProfileUsername(route.username);
        setActiveTab('profile');
      } else if (route.kind === 'offer') {
        setTradeModalState(null);
        setDirectChatModalState(null);
        setProfileUsername(null);
        setActiveOfferId(route.offerId);
        setActiveTab('offer');
      } else {
        setTradeModalState(null);
        setDirectChatModalState(null);
        setProfileUsername(null);
        setActiveOfferId(null);
        setActiveTab('offers');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const upsertTrade = useCallback((incoming: TradeOrder) => {
    setTrades((prev) => {
      const exists = prev.some((t) => t.id === incoming.id);
      return exists
        ? prev.map((t) => (t.id === incoming.id ? incoming : t))
        : [incoming, ...prev];
    });
    setTradeModalState((prev) =>
      prev?.existingTrade?.id === incoming.id ? { ...prev, existingTrade: incoming } : prev
    );
  }, []);

  const upsertDirectChat = useCallback((incoming: DirectChat) => {
    setDirectChats((prev) => {
      const exists = prev.some((c) => c.id === incoming.id);
      const next = exists
        ? prev.map((c) => (c.id === incoming.id ? incoming : c))
        : [incoming, ...prev];
      return [...next].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    });
    setDirectChatModalState((prev) =>
      prev?.chat.id === incoming.id ? { chat: incoming } : prev
    );
  }, []);

  const { onlineUsers, sendTyping, sendTradeRead, sendDmTyping, sendDmRead } = useRealtime(
    Boolean(user),
    {
      onOffersSnapshot: (nextOffers) => {
        setOffers(nextOffers);
        setLoadingOffers(false);
        setTradeModalState((prev) => {
          if (!prev?.offer) return prev;
          const updated = nextOffers.find((o) => o.id === prev.offer!.id);
          return updated ? { ...prev, offer: updated } : prev;
        });
      },
      onTradersSnapshot: (nextTraders) => {
        setTraders(nextTraders);
      },
      onTradesSnapshot: (nextTrades) => {
        setTrades(nextTrades);
        setTradeModalState((prev) => {
          if (!prev?.existingTrade) return prev;
          const refreshed = nextTrades.find((t) => t.id === prev.existingTrade!.id);
          return refreshed ? { ...prev, existingTrade: refreshed } : prev;
        });
      },
      onActiveTradeMessages: (tradeId, msgs) => {
        setTrades((prev) =>
          prev.map((t) =>
            t.id === tradeId
              ? {
                  ...t,
                  messages: enrichTradeMessages(msgs, t.lastReadAtBy, false, {
                    viewerUsername: user?.username,
                    buyerUsername: t.buyerUsername,
                    sellerUsername: t.sellerUsername,
                  }),
                }
              : t
          )
        );
        setTradeModalState((prev) =>
          prev?.existingTrade?.id === tradeId
            ? {
                ...prev,
                existingTrade: {
                  ...prev.existingTrade,
                  messages: enrichTradeMessages(msgs, prev.existingTrade.lastReadAtBy, false, {
                    viewerUsername: user?.username,
                    buyerUsername: prev.existingTrade.buyerUsername,
                    sellerUsername: prev.existingTrade.sellerUsername,
                  }),
                },
              }
            : prev
        );
      },
      onChatsSnapshot: (nextChats) => {
        setDirectChats(nextChats);
        setDirectChatModalState((prev) => {
          if (!prev?.chat) return prev;
          const refreshed = nextChats.find((c) => c.id === prev.chat.id);
          return refreshed ? { chat: refreshed } : prev;
        });
      },
      onActiveChatMessages: (chatId, msgs) => {
        setDirectChats((prev) =>
          prev.map((c) => (c.id === chatId ? { ...c, messages: msgs } : c))
        );
        setDirectChatModalState((prev) =>
          prev?.chat.id === chatId
            ? { chat: { ...prev.chat, messages: msgs } }
            : prev
        );
      },
      onNotificationsSnapshot: (nextNotifs) => {
        setNotifications(nextNotifs);
      },
      onTradeCreated: (trade) => {
        upsertTrade(trade);
      },
      onTradeMessage: ({ trade }) => {
        upsertTrade(trade);
      },
      onTradeUpdated: (trade) => {
        upsertTrade(trade);
      },
      onTradeTyping: ({ tradeId, username, isTyping }) => {
        if (typingTimeoutsRef.current[tradeId]) {
          clearTimeout(typingTimeoutsRef.current[tradeId]);
          delete typingTimeoutsRef.current[tradeId];
        }
        setTypingByTrade((prev) => ({ ...prev, [tradeId]: isTyping ? username : null }));
        if (isTyping) {
          typingTimeoutsRef.current[tradeId] = setTimeout(() => {
            setTypingByTrade((prev) => ({ ...prev, [tradeId]: null }));
          }, 3500);
        }
      },
      onDmMessage: ({ chat }) => {
        upsertDirectChat(chat);
      },
      onDmUpdated: (chat) => {
        upsertDirectChat(chat);
      },
      onDmTyping: ({ chatId, username, isTyping }) => {
        if (dmTypingTimeoutsRef.current[chatId]) {
          clearTimeout(dmTypingTimeoutsRef.current[chatId]);
          delete dmTypingTimeoutsRef.current[chatId];
        }
        setDmTypingByChat((prev) => ({ ...prev, [chatId]: isTyping ? username : null }));
        if (isTyping) {
          dmTypingTimeoutsRef.current[chatId] = setTimeout(() => {
            setDmTypingByChat((prev) => ({ ...prev, [chatId]: null }));
          }, 3500);
        }
      },
      onOfferCreated: (offer) => {
        setOffers((prev) => {
          if (prev.some((o) => o.id === offer.id)) return prev;
          return [offer, ...prev];
        });
      },
      onOfferUpdated: (offer) => {
        setOffers((prev) => prev.map((o) => (o.id === offer.id ? offer : o)));
        setTradeModalState((prev) =>
          prev?.offer?.id === offer.id ? { ...prev, offer } : prev
        );
      },
      onOfferDeleted: (offerId) => {
        setOffers((prev) => prev.filter((o) => o.id !== offerId));
      },
      onTraderUpdated: (trader) => {
        setTraders((prev) => ({ ...prev, [trader.username]: trader }));
      },
      onUserUpdated: (updatedUser) => {
        setUser(updatedUser);
      },
      onNotificationNew: ({ notification }) => {
        setNotifications((prev) => {
          if (prev.some((n) => n.id === notification.id)) return prev;
          return [notification, ...prev].slice(0, 60);
        });
      },
      onServerLoadError: () => {
        setLoadingOffers(false);
      },
    },
    {
      currentUsername: user?.username,
      activeTradeId: tradeModalState?.existingTrade?.id,
      activeChatId: directChatModalState?.chat.id,
    }
  );

  const handleMarkTradeRead = useCallback(
    async (tradeId: string) => {
      if (!user) return;
      const targetTrade =
        (tradeModalState?.existingTrade?.id === tradeId
          ? tradeModalState.existingTrade
          : undefined) ?? tradesRef.current.find((t) => t.id === tradeId);
      if (!targetTrade || getTradeUnreadCount(targetTrade, user.username) === 0) {
        return;
      }
      const lastIncomingStamp =
        targetTrade.messages
          .filter((m) => m.sender.toLowerCase() !== user.username.toLowerCase())
          .slice(-1)[0]?.timestamp ?? 'unread';
      if (lastMarkedTradeStampRef.current[tradeId] === lastIncomingStamp) {
        return;
      }
      lastMarkedTradeStampRef.current[tradeId] = lastIncomingStamp;

      sendTradeRead(tradeId);
      const nowIso = new Date().toISOString();
      setTrades((prev) =>
        prev.map((t) =>
          t.id === tradeId
            ? { ...t, lastReadAtBy: { ...(t.lastReadAtBy ?? {}), [user.username]: nowIso } }
            : t
        )
      );
      setTradeModalState((prev) =>
        prev?.existingTrade?.id === tradeId
          ? {
              ...prev,
              existingTrade: {
                ...prev.existingTrade,
                lastReadAtBy: { ...(prev.existingTrade.lastReadAtBy ?? {}), [user.username]: nowIso },
              },
            }
          : prev
      );
      try {
        await api.markTradeRead(tradeId);
      } catch {
        delete lastMarkedTradeStampRef.current[tradeId];
      }
    },
    [user, tradeModalState?.existingTrade, sendTradeRead]
  );

  const handleMarkDirectChatRead = useCallback(
    async (chatId: string) => {
      if (!user) return;
      const targetChat =
        (directChatModalState?.chat.id === chatId ? directChatModalState.chat : undefined) ??
        directChatsRef.current.find((c) => c.id === chatId);
      if (!targetChat || getDirectChatUnreadCount(targetChat, user.username) === 0) {
        return;
      }
      const lastIncomingStamp =
        targetChat.messages
          .filter((m) => m.sender.toLowerCase() !== user.username.toLowerCase())
          .slice(-1)[0]?.timestamp ?? 'unread';
      if (lastMarkedChatStampRef.current[chatId] === lastIncomingStamp) {
        return;
      }
      lastMarkedChatStampRef.current[chatId] = lastIncomingStamp;

      sendDmRead(chatId);
      const nowIso = new Date().toISOString();
      setDirectChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? { ...c, lastReadAtBy: { ...(c.lastReadAtBy ?? {}), [user.username]: nowIso } }
            : c
        )
      );
      setDirectChatModalState((prev) =>
        prev?.chat.id === chatId
          ? {
              chat: {
                ...prev.chat,
                lastReadAtBy: { ...(prev.chat.lastReadAtBy ?? {}), [user.username]: nowIso },
              },
            }
          : prev
      );
      try {
        await api.markDirectChatRead(chatId);
      } catch {
        delete lastMarkedChatStampRef.current[chatId];
      }
    },
    [user, directChatModalState?.chat, sendDmRead]
  );

  const handleOpenDirectChat = useCallback(
    async (targetUsername: string, offer?: P2POffer) => {
      if (!getToken() || !user) {
        pendingDirectChatRef.current = { targetUsername, offer };
        setTradeModalState(null);
        setAuthModal('register');
        return;
      }
      if (targetUsername.toLowerCase() === user.username.toLowerCase()) return;
      try {
        const res = await api.openDirectChat(targetUsername, offer?.id);
        if (res?.chat) {
          upsertDirectChat(res.chat);
          setTradeModalState(null);
          setDirectChatModalState({ chat: res.chat });
        }
      } catch {
        // Fallback: open messages modal if chat creation failed transiently
        setMessagesOpen(true);
      }
    },
    [user, upsertDirectChat]
  );

  const handleMarkNotificationsRead = useCallback(async (id?: string) => {
    setNotifications((prev) =>
      prev.map((n) => (!id || n.id === id ? { ...n, read: true } : n))
    );
    await api.markNotificationsRead(id).catch(() => undefined);
  }, []);

  const handleNotificationClick = useCallback(
    async (notif: AppNotification) => {
      if (!notif.read) {
        void handleMarkNotificationsRead(notif.id);
      }
      if (notif.chatId) {
        const existingChat = directChats.find((c) => c.id === notif.chatId);
        if (existingChat) {
          setDirectChatModalState({ chat: existingChat });
          return;
        }
        try {
          const res = await api.getDirectChats();
          if (Array.isArray(res?.chats)) {
            setDirectChats(res.chats);
            const found = res.chats.find((c) => c.id === notif.chatId);
            if (found) {
              setDirectChatModalState({ chat: found });
              return;
            }
          }
        } catch {
          // fallback below
        }
        setMessagesOpen(true);
        return;
      }
      if (notif.tradeId) {
        const existing = trades.find((t) => t.id === notif.tradeId);
        if (existing) {
          setTradeModalState({ existingTrade: existing });
          return;
        }
        try {
          const res = await api.getTrades();
          if (Array.isArray(res?.trades)) {
            setTrades(res.trades);
            const found = res.trades.find((t) => t.id === notif.tradeId);
            if (found) {
              setTradeModalState({ existingTrade: found });
              return;
            }
          }
        } catch {
          // fallback below
        }
        navigateToPath('/');
        setProfileUsername(null);
        setActiveTab('account');
        return;
      }
      if (notif.offerId) {
        openOfferById(notif.offerId, true);
        return;
      }
      if (notif.type === 'feedback_received' && user) {
        setTradeModalState(null);
        setDirectChatModalState(null);
        setActiveOfferId(null);
        setProfileUsername(user.username);
        setActiveTab('profile');
        navigateToPath(`/${encodeURIComponent(user.username)}`);
        return;
      }
      if (notif.type === 'wallet_credit') {
        navigateToPath('/');
        setActiveOfferId(null);
        setProfileUsername(null);
        setActiveTab('account');
      }
    },
    [handleMarkNotificationsRead, directChats, trades, navigateToPath, openOfferById, user]
  );

  const handleAuthSuccess = (authedUser: UserAccount) => {
    setUser(authedUser);
    const pending = pendingDirectChatRef.current;
    if (pending) {
      pendingDirectChatRef.current = null;
      if (pending.targetUsername.toLowerCase() !== authedUser.username.toLowerCase()) {
        api
          .openDirectChat(pending.targetUsername, pending.offer?.id)
          .then((res) => {
            if (res?.chat) {
              upsertDirectChat(res.chat);
              setDirectChatModalState({ chat: res.chat });
            }
          })
          .catch(() => undefined);
      }
    }
  };

  const handleLogout = async () => {
    await api.logout().catch(() => undefined);
    setToken(null);
    pendingDirectChatRef.current = null;
    setUser(null);
    setTrades([]);
    setDirectChats([]);
    setDirectChatModalState(null);
    setNotifications([]);
  };

  const handleHeaderTabSelect = (tab: AppTab) => {
    navigateToPath('/');
    setProfileUsername(null);
    setActiveOfferId(null);
    if (tab === 'swap') {
      setActiveTab('offers');
      setFilters((f) => ({ ...f, intent: 'swap' }));
      setVisibleCount(20);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (tab === 'offers') {
      setActiveTab('offers');
      setFilters((f) => (f.intent === 'swap' ? { ...f, intent: 'buy' } : f));
      setVisibleCount(20);
      return;
    }
    setActiveTab('account');
  };

  const handleSelectTrader = useCallback(
    (username: string) => {
      setTradeModalState(null);
      setActiveOfferId(null);
      setProfileUsername(username);
      setActiveTab('profile');
      navigateToPath(`/${encodeURIComponent(username)}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [navigateToPath]
  );

  const handleOpenCreateOffer = (source: string) => {
    void notifyDiscordEvent({
      title: 'Create Offer Pressed',
      color: 0x0b3b2e,
      fields: [
        { name: 'User', value: user?.username ?? 'Guest' },
        { name: 'Market Tab', value: filters.intent.toUpperCase() },
        { name: 'Source', value: source },
      ],
    });
    setCreateOfferOpen(true);
  };

  const headerActiveTab: AppTab =
    activeTab === 'profile'
      ? 'profile'
      : activeTab === 'account'
        ? 'account'
        : filters.intent === 'swap'
          ? 'swap'
          : 'offers';

  const parsedAmount = useMemo(() => {
    const n = Number(filters.amount);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [filters.amount]);

  const hasSearchQuery = filters.searchQuery.trim().length > 0;

  const filteredOffers = useMemo(() => {
    const targetSide =
      filters.intent === 'buy'
        ? 'sell_crypto'
        : filters.intent === 'sell'
          ? 'buy_crypto'
          : 'swap_crypto';
    const pmQuery = filters.paymentMethod.trim().toLowerCase();
    const qClean = filters.searchQuery.trim().toLowerCase().replace(/^@+/, '');

    const list = offers.filter((offer) => {
      // When actively searching by @username, ad ID, or keyword, search across ALL Buy/Sell/Swap sides
      // so user-posted ads always show up regardless of which tab is selected.
      if (!hasSearchQuery && offer.side !== targetSide) return false;
      if (filters.hideInactive && !offer.active) return false;
      if (filters.crypto !== 'ALL') {
        if (offer.side === 'swap_crypto') {
          if (offer.crypto !== filters.crypto && offer.swapToCrypto !== filters.crypto) {
            return false;
          }
        } else if (offer.crypto !== filters.crypto) {
          return false;
        }
      }
      if (offer.side !== 'swap_crypto') {
        if (filters.fiat !== 'ALL' && offer.fiat !== filters.fiat) return false;
        if (filters.country !== 'ALL' && offer.country !== filters.country) return false;
      }
      if (
        pmQuery &&
        !offer.paymentMethod.toLowerCase().includes(pmQuery) &&
        !offer.paymentCategory.toLowerCase().includes(pmQuery)
      ) {
        return false;
      }
      if (!matchesSearchQuery(offer, filters.searchQuery)) return false;
      if (parsedAmount !== null) {
        if (offer.side === 'swap_crypto' && offer.swapToCrypto) {
          const minS = offer.minSwapAmount ?? offer.minFiat / (prices.usdPrices[offer.swapToCrypto] ?? 1);
          const maxS = offer.maxSwapAmount ?? offer.maxFiat / (prices.usdPrices[offer.swapToCrypto] ?? 1);
          if (parsedAmount < minS || parsedAmount > maxS) return false;
        } else if (parsedAmount < offer.minFiat || parsedAmount > offer.maxFiat) {
          return false;
        }
      }

      const trader = traders[offer.traderUsername];
      if (filters.verifiedOnly && !trader?.verified) return false;
      if (filters.minRating > 0 && (trader?.ratingPct ?? 100) < filters.minRating) return false;
      if (
        filters.selectedTags.length > 0 &&
        !filters.selectedTags.every((tag) => offer.tags.includes(tag))
      ) {
        return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      if (qClean) {
        const aExact = a.traderUsername.toLowerCase() === qClean || a.id.toLowerCase() === qClean;
        const bExact = b.traderUsername.toLowerCase() === qClean || b.id.toLowerCase() === qClean;
        if (aExact !== bExact) return aExact ? -1 : 1;
      }
      const traderA = traders[a.traderUsername];
      const traderB = traders[b.traderUsername];
      if (sortBy === 'trades') {
        return (traderB?.tradesCount ?? 0) - (traderA?.tradesCount ?? 0);
      }
      if (sortBy === 'rating') {
        return (traderB?.ratingPct ?? 100) - (traderA?.ratingPct ?? 100);
      }
      if (sortBy === 'price_asc' || sortBy === 'price_desc') {
        const usdA =
          a.side === 'swap_crypto' && a.swapToCrypto
            ? getOfferUnitPrice(a, prices) * (prices.usdPrices[a.swapToCrypto] ?? 1)
            : getOfferUnitPrice(a, prices) / (prices.fiatRatesFromUsd[a.fiat] ?? 1);
        const usdB =
          b.side === 'swap_crypto' && b.swapToCrypto
            ? getOfferUnitPrice(b, prices) * (prices.usdPrices[b.swapToCrypto] ?? 1)
            : getOfferUnitPrice(b, prices) / (prices.fiatRatesFromUsd[b.fiat] ?? 1);
        return sortBy === 'price_asc' ? usdA - usdB : usdB - usdA;
      }
      // 'best': favorable margin + online + trade reputation
      const score = (o: P2POffer, t?: TraderProfile) => {
        const marginScore = o.side === 'sell_crypto' || o.side === 'swap_crypto' ? -o.marginPct : o.marginPct;
        const onlineBonus = t?.lastSeenMinutes === 0 ? 5 : 0;
        const repBonus = Math.min((t?.tradesCount ?? 0) / 120, 5);
        return marginScore + onlineBonus + repBonus;
      };
      return score(b, traderB) - score(a, traderA);
    });
  }, [offers, traders, filters, hasSearchQuery, parsedAmount, sortBy, prices]);

  const activeTradesCount = trades.filter(
    (t) => t.status === 'escrow_funded' || t.status === 'payment_sent' || t.status === 'disputed'
  ).length;

  const unreadMessagesCount = useMemo(
    () =>
      trades.reduce((sum, t) => sum + getTradeUnreadCount(t, user?.username), 0) +
      directChats.reduce((sum, c) => sum + getDirectChatUnreadCount(c, user?.username), 0),
    [trades, directChats, user?.username]
  );

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const myOffers = user ? offers.filter((o) => o.traderUsername === user.username) : [];

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F5F5] text-[#111817] dark:bg-[#0B1010] dark:text-[#EAF0EF]">
      <Header
        activeTab={headerActiveTab}
        onSelectTab={handleHeaderTabSelect}
        user={user}
        activeTradesCount={activeTradesCount}
        unreadMessagesCount={unreadMessagesCount}
        supportUnreadCount={supportUnreadCount}
        notifications={notifications}
        unreadNotificationsCount={unreadNotificationsCount}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((d) => !d)}
        onOpenAuth={(mode) => setAuthModal(mode)}
        onLogout={handleLogout}
        onOpenSecretMenu={() => setSecretMenuOpen(true)}
        onOpenMessages={() => setMessagesOpen(true)}
        onOpenSupport={() => setSupportChatOpen(true)}
        onViewMyProfile={() => {
          if (user) handleSelectTrader(user.username);
        }}
        onMarkNotificationsRead={handleMarkNotificationsRead}
        onNotificationClick={handleNotificationClick}
      />

      <main className="mx-auto w-full max-w-[1380px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {activeTab === 'offers' && (
          <div className="space-y-6">
            {/* Filter Toolbar */}
            <OfferFilterBar
              filters={filters}
              onChange={(next) => {
                setFilters(next);
                setVisibleCount(20);
              }}
              onReset={() => {
                setFilters({ ...INITIAL_FILTERS, intent: filters.intent });
                setVisibleCount(20);
              }}
              prices={prices}
            />

            {/* Live Spot Rates Strip */}
            <div className="rounded-xl border border-[#E3E7E7] bg-white p-3 text-xs sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:px-4 sm:py-2.5 dark:border-[#1E2726] dark:bg-[#131A1A]">
              {/* Mobile Top Status Bar */}
              <div className="mb-2.5 flex items-center justify-between border-b border-[#ECEFEF] pb-2 text-[#5C6665] sm:hidden dark:border-[#202B2A] dark:text-[#8E9B98]">
                <span className="font-medium">Live Spot Rates</span>
                <button
                  type="button"
                  onClick={() => loadPrices(true)}
                  className="inline-flex items-center gap-1.5 font-medium hover:text-[#0E1715] dark:hover:text-white"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshingPrices ? 'animate-spin' : ''}`} />
                  <span>{refreshingPrices ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2">
                {CRYPTO_ASSETS.slice(0, 5).map((coin, idx) => {
                  const price = prices?.usdPrices?.[coin.symbol] ?? 0;
                  const chg = prices?.changes24h?.[coin.symbol] ?? 0;
                  const active = filters.crypto === coin.symbol;
                  return (
                    <button
                      key={coin.symbol}
                      type="button"
                      onClick={() =>
                        setFilters((f) => ({
                          ...f,
                          crypto: f.crypto === coin.symbol ? 'ALL' : coin.symbol,
                        }))
                      }
                      className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 transition-colors sm:justify-start sm:border-transparent sm:px-2 sm:py-1 ${
                        idx === 0 ? 'col-span-2 sm:col-span-1' : ''
                      } ${
                        active
                          ? 'border-[#0B3B2E]/25 bg-[#EEF6F2] font-bold text-[#0B3B2E] sm:border-transparent dark:border-[#7FE85B]/30 dark:bg-[#162C22] dark:text-[#7FE85B]'
                          : 'border-[#ECEFEF] bg-[#F9FAFA] hover:bg-[#F5F7F7] sm:bg-transparent dark:border-[#1E2726] dark:bg-[#0F1515] dark:hover:bg-[#1B2423] dark:sm:bg-transparent'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <CoinIcon symbol={coin.symbol} size={16} />
                        <span className="font-semibold">{coin.symbol}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="font-mono tabular-nums text-[#0E1715] dark:text-white">
                          ${price.toLocaleString('en-US', {
                            minimumFractionDigits: price < 10 ? 2 : 0,
                            maximumFractionDigits: price < 10 ? 2 : 0,
                          })}
                        </span>
                        <span
                          className={`font-mono text-[11px] tabular-nums ${
                            chg >= 0
                              ? 'text-[#0D6832] dark:text-[#7FE85B]'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {chg >= 0 ? `+${chg.toFixed(1)}%` : `${chg.toFixed(1)}%`}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="hidden sm:flex items-center gap-3 text-[#5C6665] dark:text-[#8E9B98]">
                <button
                  type="button"
                  onClick={() => loadPrices(true)}
                  className="inline-flex items-center gap-1.5 font-medium hover:text-[#0E1715] dark:hover:text-white"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshingPrices ? 'animate-spin' : ''}`} />
                  <span>{refreshingPrices ? 'Refreshing rates...' : prices.source}</span>
                </button>
              </div>
            </div>

            {/* Results Header Row */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center justify-between gap-3 sm:justify-start">
                <h1 className="font-display text-xl font-bold tracking-tight text-[#0E1715] sm:text-2xl dark:text-white">
                  {hasSearchQuery
                    ? `Search results for "${filters.searchQuery.trim()}"`
                    : filters.intent === 'buy'
                      ? 'Buying offers'
                      : filters.intent === 'sell'
                        ? 'Selling offers'
                        : 'Crypto swap offers'}
                </h1>
                <span className="rounded-lg border border-[#DCE2E1] bg-white px-2.5 py-1 font-mono text-xs font-medium tabular-nums text-[#4B5554] dark:border-[#232E2D] dark:bg-[#131A1A] dark:text-[#98A4A2]">
                  {filteredOffers.length} Results
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:flex sm:items-center sm:gap-3">
                {/* Sort Selector */}
                <div className="relative">
                  <ArrowUpDown className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#5C6665]" />
                  <select
                    aria-label="Sort offers"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="h-10 w-full appearance-none rounded-xl border border-[#DCE2E1] bg-white pl-9 pr-8 text-sm font-medium text-[#111917] focus:border-[#0B3B2E] focus:outline-none sm:w-auto dark:border-[#232E2D] dark:bg-[#131A1A] dark:text-[#EDF3F2]"
                  >
                    <option value="best">Best</option>
                    <option value="price_asc">Lowest Price</option>
                    <option value="price_desc">Highest Price</option>
                    <option value="trades">Most Trades</option>
                    <option value="rating">Highest Trust</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-[#5C6665]" />
                </div>

                {/* Primary Lime CTA */}
                <button
                  type="button"
                  onClick={() => handleOpenCreateOffer('Offers Header')}
                  className="h-10 w-full rounded-xl bg-[#7FE85B] px-5 text-sm font-semibold text-[#082213] hover:bg-[#6AD845] sm:w-auto whitespace-nowrap shrink-0 transition-colors"
                >
                  Create Offer
                </button>
              </div>
            </div>

            {/* Offers List */}
            {loadingOffers ? (
              <div className="space-y-3.5">
                {[1, 2, 3, 4].map((idx) => (
                  <div
                    key={idx}
                    className="h-28 animate-pulse rounded-2xl border border-[#E3E7E7] bg-white dark:border-[#202B2A] dark:bg-[#131A1A]"
                  />
                ))}
              </div>
            ) : filteredOffers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#D3DADA] bg-white p-8 text-center sm:p-12 dark:border-[#263130] dark:bg-[#131A1A]">
                <h2 className="font-display text-lg font-bold text-[#0E1715] dark:text-white">
                  No offers match your filters
                </h2>
                <p className="mt-1.5 text-sm text-[#5C6665] dark:text-[#98A4A2]">
                  Try clearing your search query, amount, payment method, or currency filters to explore all listings.
                </p>
                <div className="mt-5 grid grid-cols-1 gap-2.5 sm:flex sm:justify-center sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setFilters({ ...INITIAL_FILTERS, intent: filters.intent })}
                    className="min-h-[44px] w-full rounded-xl bg-[#0B3B2E] px-5 py-2.5 text-sm font-semibold text-white sm:w-auto dark:bg-[#7FE85B] dark:text-[#082213]"
                  >
                    Reset Filters
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenCreateOffer('Empty Filter State')}
                    className="min-h-[44px] w-full rounded-xl border border-[#DCE2E1] px-5 py-2.5 text-sm font-semibold text-[#0E1715] sm:w-auto dark:border-[#263130] dark:text-white"
                  >
                    Post This Offer Yourself
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredOffers
                  .slice(0, user ? visibleCount : 10)
                  .map((offer) => (
                    <OfferRow
                      key={offer.id}
                      offer={offer}
                      trader={traders[offer.traderUsername]}
                      prices={prices}
                      enteredAmount={parsedAmount}
                      currentUsername={user?.username}
                      onSelectOffer={(o) => setTradeModalState({ offer: o })}
                      onSelectTrader={handleSelectTrader}
                    />
                  ))}

                {!user && filteredOffers.length > 10 && (
                  <div className="rounded-2xl border border-[#DCE2E1] bg-white p-8 text-center dark:border-[#202B2A] dark:bg-[#131A1A]">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF6F2] text-[#0B3B2E] dark:bg-[#152B20] dark:text-[#7FE85B]">
                      <Lock className="h-5 w-5" />
                    </div>
                    <h2 className="mt-3 font-display text-xl font-bold text-[#0E1715] dark:text-white">
                      Register to view all {filteredOffers.length} offers
                    </h2>
                    <p className="mx-auto mt-1.5 max-w-md text-sm text-[#5C6665] dark:text-[#98A4A2]">
                      Guests can preview the top 10 listings. Create a free anonymous OOSAB account in seconds to unlock all {filteredOffers.length} offers — no KYC or ID required.
                    </p>
                    <div className="mt-5 grid grid-cols-1 gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-3">
                      <button
                        type="button"
                        onClick={() => setAuthModal('register')}
                        className="min-h-[44px] w-full rounded-xl bg-[#7FE85B] px-6 py-2.5 text-sm font-semibold text-[#082213] hover:bg-[#6AD845] sm:w-auto"
                      >
                        Register Free (No KYC)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthModal('login')}
                        className="min-h-[44px] w-full rounded-xl border border-[#DCE2E1] px-6 py-2.5 text-sm font-semibold text-[#0E1715] hover:bg-[#F5F7F7] sm:w-auto dark:border-[#263130] dark:text-white dark:hover:bg-[#1A2423]"
                      >
                        Sign in
                      </button>
                    </div>
                  </div>
                )}

                {user && filteredOffers.length > visibleCount && (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((c) => c + 25)}
                      className="min-h-[44px] w-full rounded-xl border border-[#DCE2E1] bg-white px-6 py-2.5 text-sm font-semibold text-[#0E1715] hover:bg-[#F5F7F7] sm:w-auto dark:border-[#263130] dark:bg-[#131A1A] dark:text-white dark:hover:bg-[#1A2423]"
                    >
                      Show more offers ({filteredOffers.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'account' && (
          <AccountView
            user={user}
            prices={prices}
            trades={trades}
            myOffers={myOffers}
            depositNotice={depositNotice}
            onDismissDepositNotice={() => setDepositNotice(null)}
            onOpenAuth={(mode) => setAuthModal(mode)}
            onOpenTrade={(trade) => setTradeModalState({ existingTrade: trade })}
            onViewOffer={(offer) => setTradeModalState({ offer })}
            onOpenCreateOffer={() => handleOpenCreateOffer('Account Dashboard')}
            onUserUpdated={setUser}
            onProfileUpdated={(updatedTrader) => {
              setTraders((prev) => ({ ...prev, [updatedTrader.username]: updatedTrader }));
              setProfileRefreshKey((k) => k + 1);
            }}
            onOfferUpdated={(updated) =>
              setOffers((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
            }
            onOfferDeleted={(offerId) =>
              setOffers((prev) => prev.filter((o) => o.id !== offerId))
            }
            onViewPublicProfile={handleSelectTrader}
          />
        )}

        {activeTab === 'profile' && profileUsername && (
          <ProfileView
            username={profileUsername}
            initialTrader={
              traders[profileUsername] ??
              Object.values(traders).find(
                (t) => t.username.toLowerCase() === profileUsername.toLowerCase()
              )
            }
            offers={offers}
            prices={prices}
            currentUsername={user?.username}
            currentUser={user}
            onlineUsers={onlineUsers}
            refreshKey={profileRefreshKey}
            onBackToMarketplace={() => handleHeaderTabSelect('offers')}
            onSelectOffer={(offer) => setTradeModalState({ offer })}
            onMessageTrader={(uname) => void handleOpenDirectChat(uname)}
            onOpenAccountSettings={() => {
              navigateToPath('/');
              setProfileUsername(null);
              setActiveOfferId(null);
              setActiveTab('account');
            }}
            onOpenCreateOffer={() => handleOpenCreateOffer('Profile Page')}
            onTraderLoaded={(loaded) =>
              setTraders((prev) => ({ ...prev, [loaded.username]: loaded }))
            }
            onUserUpdated={setUser}
          />
        )}

        {activeTab === 'offer' && activeOfferId && (
          <OfferDetailView
            offerId={activeOfferId}
            initialOffer={offers.find((o) => o.id.toLowerCase() === activeOfferId.toLowerCase())}
            initialTrader={(() => {
              const found = offers.find((o) => o.id.toLowerCase() === activeOfferId.toLowerCase());
              return found ? traders[found.traderUsername] : undefined;
            })()}
            prices={prices}
            user={user}
            onlineUsers={onlineUsers}
            onBackToMarketplace={() => handleHeaderTabSelect('offers')}
            onSelectTrader={handleSelectTrader}
            onMessageTrader={(uname, offer) => void handleOpenDirectChat(uname, offer)}
            onRequireAuth={(mode) => setAuthModal(mode)}
            onTradeOpened={(trade, updatedUser) => {
              upsertTrade(trade);
              if (updatedUser) setUser(updatedUser);
              setTradeModalState({ existingTrade: trade });
            }}
            onOfferUpdated={(updated) =>
              setOffers((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
            }
            onOfferDeleted={(deletedId) =>
              setOffers((prev) => prev.filter((o) => o.id !== deletedId))
            }
          />
        )}
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-[#E3E7E7] bg-white py-6 dark:border-[#1E2726] dark:bg-[#111717]">
        <div className="mx-auto flex max-w-[1380px] flex-col items-center justify-between gap-4 px-4 text-center text-xs text-[#5C6665] sm:flex-row sm:px-6 sm:text-left lg:px-8 dark:text-[#8E9B98]">
          <div>
            <span className="font-display font-bold tracking-[0.08em] text-[#0E1715] dark:text-white mr-2">
              OOSAB
            </span>
            <span>Peer-to-peer multi-asset escrow marketplace</span>
          </div>
          <div className="grid w-full max-w-xs grid-cols-2 gap-x-6 gap-y-2.5 sm:flex sm:w-auto sm:max-w-none sm:flex-wrap sm:items-center sm:gap-5">
            <button
              type="button"
              onClick={() => {
                navigateToPath('/');
                setProfileUsername(null);
                setActiveTab('offers');
                setFilters((f) => ({ ...f, intent: f.intent === 'swap' ? 'buy' : f.intent, crypto: 'XMR' }));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-[#0E1715] dark:hover:text-white"
            >
              Monero (XMR) Market
            </button>
            <button
              type="button"
              onClick={() => {
                navigateToPath('/');
                setProfileUsername(null);
                setActiveTab('offers');
                setFilters((f) => ({ ...f, intent: f.intent === 'swap' ? 'buy' : f.intent, crypto: 'BTC' }));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-[#0E1715] dark:hover:text-white"
            >
              Bitcoin (BTC) Market
            </button>
            <button
              type="button"
              onClick={() => handleHeaderTabSelect('swap')}
              className="hover:text-[#0E1715] dark:hover:text-white"
            >
              P2P Swap Ads
            </button>
            <a
              href="https://card.oosab.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#0E1715] dark:hover:text-white"
            >
              Privacy Cards
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {createOfferOpen && (
        <CreateOfferModal
          prices={prices}
          user={user}
          initialSide={
            filters.intent === 'swap'
              ? 'swap_crypto'
              : filters.intent === 'sell'
                ? 'buy_crypto'
                : 'sell_crypto'
          }
          onRequireAuth={() => setAuthModal('register')}
          onOpenWallet={(asset, requiredAmount) => {
            navigateToPath('/');
            setProfileUsername(null);
            setDepositNotice(asset ? { asset, requiredAmount } : null);
            setActiveTab('account');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onClose={() => setCreateOfferOpen(false)}
          onCreated={(offer) => {
            setOffers((prev) => [offer, ...prev]);
            setFilters({
              ...INITIAL_FILTERS,
              intent:
                offer.side === 'sell_crypto'
                  ? 'buy'
                  : offer.side === 'buy_crypto'
                    ? 'sell'
                    : 'swap',
            });
          }}
          onOpenOffer={(offer) => {
            setCreateOfferOpen(false);
            openOfferById(offer.id, true);
          }}
        />
      )}

      {tradeModalState && (
        <TradeModal
          offer={tradeModalState.offer}
          trader={
            tradeModalState.offer
              ? traders[tradeModalState.offer.traderUsername]
              : tradeModalState.existingTrade
                ? traders[
                    user &&
                    tradeModalState.existingTrade.buyerUsername.toLowerCase() ===
                      user.username.toLowerCase()
                      ? tradeModalState.existingTrade.sellerUsername
                      : user &&
                          tradeModalState.existingTrade.sellerUsername.toLowerCase() ===
                            user.username.toLowerCase()
                        ? tradeModalState.existingTrade.buyerUsername
                        : tradeModalState.existingTrade.traderUsername
                  ]
                : undefined
          }
          existingTrade={tradeModalState.existingTrade}
          prices={prices}
          initialFiatAmount={parsedAmount}
          user={user}
          onlineUsers={onlineUsers}
          typingByTrade={typingByTrade}
          onTyping={sendTyping}
          onMarkRead={handleMarkTradeRead}
          onSelectTrader={handleSelectTrader}
          onMessageTrader={(uname, offer) => void handleOpenDirectChat(uname, offer)}
          onRequireAuth={() => setAuthModal('register')}
          onClose={() => {
            setTradeModalState(null);
          }}
          onTradeUpdated={(updatedTrade, updatedUser) => {
            upsertTrade(updatedTrade);
            setTradeModalState((prev) =>
              prev ? { ...prev, existingTrade: updatedTrade } : prev
            );
            if (updatedUser) setUser(updatedUser);
          }}
        />
      )}

      {directChatModalState && user && (
        <DirectChatModal
          chat={directChatModalState.chat}
          trader={(() => {
            const other =
              directChatModalState.chat.participants.find(
                (p) => p.toLowerCase() !== user.username.toLowerCase()
              ) ?? directChatModalState.chat.participants[0];
            return (
              traders[other] ??
              Object.values(traders).find((t) => t.username.toLowerCase() === other.toLowerCase())
            );
          })()}
          user={user}
          onlineUsers={onlineUsers}
          typingUsername={dmTypingByChat[directChatModalState.chat.id] ?? null}
          onTyping={sendDmTyping}
          onMarkRead={handleMarkDirectChatRead}
          onChatUpdated={upsertDirectChat}
          onSelectTrader={handleSelectTrader}
          onOpenOffer={(id) => openOfferById(id, true)}
          onClose={() => setDirectChatModalState(null)}
        />
      )}

      {messagesOpen && user && (
        <MessagesModal
          trades={trades}
          directChats={directChats}
          traders={traders}
          currentUsername={user.username}
          onlineUsers={onlineUsers}
          onClose={() => setMessagesOpen(false)}
          onSelectTrade={(trade) => {
            setMessagesOpen(false);
            setTradeModalState({ existingTrade: trade });
          }}
          onSelectDirectChat={(chat) => {
            setMessagesOpen(false);
            setDirectChatModalState({ chat });
          }}
        />
      )}

      {authModal && (
        <AuthModal
          initialMode={authModal}
          onClose={() => setAuthModal(null)}
          onSuccess={handleAuthSuccess}
        />
      )}

      {supportChatOpen && (
        <SupportChatModal user={user} onClose={() => setSupportChatOpen(false)} />
      )}

      {secretMenuOpen && (
        <SecretCreditModal
          user={user}
          prices={prices}
          onClose={() => setSecretMenuOpen(false)}
          onRequireAuth={(mode) => setAuthModal(mode)}
          onUserUpdated={(updatedUser) => setUser(updatedUser)}
          onProfileUpdated={(updatedTrader) => {
            setTraders((prev) => ({ ...prev, [updatedTrader.username]: updatedTrader }));
            setProfileRefreshKey((k) => k + 1);
          }}
          onAccountRemoved={(removedUsername, removedSelf) => {
            const lower = removedUsername.toLowerCase();
            setTraders((prev) => {
              const next = { ...prev };
              for (const k of Object.keys(next)) {
                if (k.toLowerCase() === lower) delete next[k];
              }
              return next;
            });
            setOffers((prev) => prev.filter((o) => o.traderUsername.toLowerCase() !== lower));
            if (profileUsername && profileUsername.toLowerCase() === lower) {
              navigateToPath('/');
              setProfileUsername(null);
              setActiveTab('offers');
            }
            if (removedSelf) {
              void handleLogout();
            }
            setProfileRefreshKey((k) => k + 1);
          }}
          onDataSynced={() => {
            setProfileRefreshKey((k) => k + 1);
          }}
          onNavigateProfile={(uname) => {
            setSecretMenuOpen(false);
            handleSelectTrader(uname);
          }}
          onOpenWallet={() => {
            navigateToPath('/');
            setProfileUsername(null);
            setActiveTab('account');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}
    </div>
  );
}
