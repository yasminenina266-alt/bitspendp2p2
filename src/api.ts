import { localEngine } from './localEngine';
import type {
  AppNotification,
  CryptoAsset,
  FiatCurrency,
  MarketPrices,
  P2POffer,
  ProfileThemeId,
  SwapOrder,
  TradeOrder,
  TraderFeedback,
  TraderProfile,
  TraderTradeRecord,
  UserAccount,
  VirtualCard,
} from './types';

export interface ProfileUpdatePayload {
  bio?: string;
  pgpKey?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  tagline?: string;
  location?: string;
  accentTheme?: ProfileThemeId;
  languages?: string[];
  preferredMethods?: string[];
  tradingHours?: string;
}

export interface DirectoryUser {
  username: string;
  createdAt: string;
  balances: Record<CryptoAsset, number>;
  tradesCount: number;
  ratingPct: number;
  verified: boolean;
}

export interface TableFileInfo {
  name: string;
  path: string;
  rows: number;
  sizeBytes: number;
}

export interface SavedAccountRow extends DirectoryUser {
  offersCount: number;
}

export interface TablesSummaryResponse {
  tablesDir: string;
  tables: TableFileInfo[];
  savedAccounts: SavedAccountRow[];
  customOffersCount: number;
}

export interface TablesExportPayload {
  exportedAt?: string;
  version?: number;
  users?: Record<string, unknown>;
  traders?: Record<string, TraderProfile>;
  offers?: P2POffer[];
  tradeRooms?: Record<string, TradeOrder>;
  notifications?: Record<string, AppNotification[]>;
  swaps?: Record<string, SwapOrder[]>;
  cards?: Record<string, VirtualCard[]>;
}

const TOKEN_KEY = 'oosab_session_token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
}

async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
  fallback?: () => Promise<T>
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    if (fallback) return await fallback();
    throw new Error('Network error communicating with server');
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  // If the host returned non-JSON (e.g., static HTML SPA fallback or 404/405/502 gateway),
  // seamlessly fall back to the local browser engine.
  if (
    data === null ||
    typeof data !== 'object' ||
    (!res.ok && !('error' in (data as Record<string, unknown>)))
  ) {
    if (fallback) return await fallback();
    throw new Error(`Invalid response from server (${res.status})`);
  }

  if (!res.ok) {
    const errObj = data as { error?: string };
    throw new Error(errObj.error || `Request failed (${res.status})`);
  }

  return data as T;
}

export const api = {
  getPrices: (refresh = false) =>
    apiFetch<MarketPrices>(
      `/api/prices${refresh ? '?refresh=1' : ''}`,
      {},
      () => localEngine.getPrices(refresh)
    ),

  getOffers: async () => {
    const res = await apiFetch<{ offers: P2POffer[]; traders: Record<string, TraderProfile> }>(
      '/api/offers',
      {},
      () => localEngine.getOffers()
    );
    if (Array.isArray(res?.offers)) localEngine.mirrorOffers(res.offers);
    return res;
  },

  getOfferById: async (id: string) => {
    try {
      return await apiFetch<{ offer: P2POffer; trader?: TraderProfile }>(
        `/api/offers/${encodeURIComponent(id)}`,
        {},
        () => localEngine.getOfferById(id)
      );
    } catch (err) {
      try {
        return await localEngine.getOfferById(id);
      } catch {
        throw err;
      }
    }
  },

  getUserDirectory: () =>
    apiFetch<{ users: DirectoryUser[] }>(
      '/api/users/directory',
      {},
      () => localEngine.getUserDirectory()
    ),

  getTrader: async (username: string) => {
    try {
      return await apiFetch<{
        trader: TraderProfile;
        offers: P2POffer[];
        isOnline?: boolean;
        isRegisteredUser?: boolean;
      }>(`/api/traders/${encodeURIComponent(username)}`, {}, () => localEngine.getTrader(username));
    } catch (err) {
      try {
        return await localEngine.getTrader(username);
      } catch {
        throw err;
      }
    }
  },

  getTraderTrades: (username: string, offset = 0, limit = 20) =>
    apiFetch<{ items: TraderTradeRecord[]; total: number; hasMore: boolean }>(
      `/api/traders/${encodeURIComponent(username)}/trades?offset=${offset}&limit=${limit}`,
      {},
      () => localEngine.getTraderTrades(username, offset, limit)
    ),

  getTraderFeedback: (username: string, offset = 0, limit = 20) =>
    apiFetch<{ items: TraderFeedback[]; total: number; hasMore: boolean }>(
      `/api/traders/${encodeURIComponent(username)}/feedback?offset=${offset}&limit=${limit}`,
      {},
      () => localEngine.getTraderFeedback(username, offset, limit)
    ),

  register: async (payload: {
    username: string;
    password: string;
    confirmPassword: string;
    pgpKey?: string;
    bio?: string;
    avatarUrl?: string;
    tagline?: string;
  }) => {
    const res = await apiFetch<{ token: string; user: UserAccount }>(
      '/api/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => localEngine.register(payload)
    );
    localEngine.mirrorAuth(res.user, res.token, payload.password);
    return res;
  },

  login: async (payload: { username: string; password: string }) => {
    const res = await apiFetch<{ token: string; user: UserAccount }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => localEngine.login(payload)
    );
    localEngine.mirrorAuth(res.user, res.token, payload.password);
    return res;
  },

  getMe: async () => {
    const res = await apiFetch<{ user: UserAccount }>('/api/auth/me', {}, () => localEngine.getMe());
    if (res?.user) {
      localEngine.mirrorAuth(res.user, getToken() ?? '');
    }
    return res;
  },

  updateProfile: async (payload: ProfileUpdatePayload) => {
    const res = await apiFetch<{ user: UserAccount; trader: TraderProfile }>(
      '/api/auth/profile',
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      () => localEngine.updateProfile(payload)
    );
    if (res?.user) localEngine.mirrorUser(res.user, res.trader);
    return res;
  },

  updateSettings: async (payload: Record<string, unknown>) => {
    const res = await apiFetch<{ user: UserAccount }>(
      '/api/auth/settings',
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      () => localEngine.updateSettings(payload)
    );
    if (res?.user) localEngine.mirrorUser(res.user);
    return res;
  },

  logout: () =>
    apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }, () => localEngine.logout()),

  createOffer: async (payload: Partial<P2POffer>) => {
    const res = await apiFetch<{ offer: P2POffer }>(
      '/api/offers',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => localEngine.createOffer(payload)
    );
    if (res?.offer) localEngine.mirrorOffer(res.offer);
    return res;
  },

  updateOffer: async (id: string, payload: { active?: boolean; marginPct?: number }) => {
    const res = await apiFetch<{ offer: P2POffer }>(
      `/api/offers/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      () => localEngine.updateOffer(id, payload)
    );
    if (res?.offer) localEngine.mirrorOffer(res.offer);
    return res;
  },

  deleteOffer: async (id: string) => {
    const res = await apiFetch<{ ok: boolean }>(
      `/api/offers/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
      },
      () => localEngine.deleteOffer(id)
    );
    localEngine.removeOffer(id);
    return res;
  },

  getTrades: () => apiFetch<{ trades: TradeOrder[] }>('/api/trades', {}, () => localEngine.getTrades()),

  openTrade: (offerId: string, fiatAmount: number, swapAmount?: number) =>
    apiFetch<{ trade: TradeOrder; user: UserAccount }>(
      '/api/trades',
      {
        method: 'POST',
        body: JSON.stringify({ offerId, fiatAmount, swapAmount }),
      },
      () => localEngine.openTrade(offerId, fiatAmount, swapAmount)
    ),

  markTradeRead: (tradeId: string) =>
    apiFetch<{ trade: TradeOrder }>(
      `/api/trades/${encodeURIComponent(tradeId)}/read`,
      { method: 'POST' },
      () => localEngine.markTradeRead(tradeId)
    ),

  sendTradeMessage: (tradeId: string, text: string) =>
    apiFetch<{ trade: TradeOrder }>(
      `/api/trades/${encodeURIComponent(tradeId)}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ text }),
      },
      () => localEngine.sendTradeMessage(tradeId, text)
    ),

  tradeAction: (
    tradeId: string,
    payload: {
      action: 'mark_paid' | 'release' | 'cancel' | 'dispute' | 'feedback';
      positive?: boolean;
      comment?: string;
    }
  ) =>
    apiFetch<{ trade: TradeOrder; user?: UserAccount }>(
      `/api/trades/${encodeURIComponent(tradeId)}/action`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => localEngine.tradeAction(tradeId, payload)
    ),

  getNotifications: () =>
    apiFetch<{ notifications: AppNotification[] }>(
      '/api/notifications',
      {},
      () => localEngine.getNotifications()
    ),

  markNotificationsRead: (id?: string) =>
    apiFetch<{ notifications: AppNotification[] }>(
      '/api/notifications/read',
      {
        method: 'POST',
        body: JSON.stringify({ id }),
      },
      () => localEngine.markNotificationsRead(id)
    ),

  getSwaps: () => apiFetch<{ swaps: SwapOrder[] }>('/api/swaps', {}, () => localEngine.getSwaps()),

  createSwap: (payload: {
    fromCrypto: CryptoAsset;
    toCrypto: CryptoAsset;
    fromAmount: number;
    mode: 'floating' | 'fixed';
    destinationAddress?: string;
  }) =>
    apiFetch<{ swap: SwapOrder; user: UserAccount }>(
      '/api/swaps',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => localEngine.createSwap(payload)
    ),

  getCards: () => apiFetch<{ cards: VirtualCard[] }>('/api/cards', {}, () => localEngine.getCards()),

  createCard: (payload: {
    label: string;
    type: 'disposable' | 'reloadable';
    fundingCrypto: CryptoAsset;
    amountUsd: number;
  }) =>
    apiFetch<{ card: VirtualCard; user: UserAccount }>(
      '/api/cards',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => localEngine.createCard(payload)
    ),

  cardAction: (
    cardId: string,
    payload: { action: 'toggle_freeze' | 'spend' | 'topup'; merchant?: string; amountUsd?: number }
  ) =>
    apiFetch<{ card: VirtualCard; user: UserAccount }>(
      `/api/cards/${encodeURIComponent(cardId)}/action`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => localEngine.cardAction(cardId, payload)
    ),

  newDepositAddress: async (crypto: CryptoAsset, chain?: string) => {
    const res = await apiFetch<{ user: UserAccount; address: string }>(
      '/api/wallet/deposit-address',
      {
        method: 'POST',
        body: JSON.stringify({ crypto, chain }),
      },
      () => localEngine.newDepositAddress(crypto, chain)
    );
    if (res?.user) localEngine.mirrorUser(res.user);
    return res;
  },

  withdrawCrypto: async (crypto: CryptoAsset, amount: number, address: string, network?: string) => {
    const res = await apiFetch<{ user: UserAccount }>(
      '/api/wallet/withdraw',
      {
        method: 'POST',
        body: JSON.stringify({ crypto, amount, address, network }),
      },
      () => localEngine.withdrawCrypto(crypto, amount, address, network)
    );
    if (res?.user) localEngine.mirrorUser(res.user);
    return res;
  },

  creditWallet: async (payload: {
    crypto: CryptoAsset;
    mode: 'crypto' | 'usd';
    amount: number;
    targetUsername?: string;
  }) => {
    const res = await apiFetch<{
      user: UserAccount;
      targetUsername?: string;
      isSelf?: boolean;
      creditedCrypto: number;
      usdValue: number;
    }>(
      '/api/wallet/credit',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => localEngine.creditWallet(payload)
    );
    if (res?.user) localEngine.mirrorUser(res.user);
    return res;
  },

  addSecretProfileStats: async (payload: {
    targetUsername?: string;
    addTradesCount?: number;
    tradeRecord?: {
      asset?: CryptoAsset;
      cryptoAmount?: number;
      fiatAmount?: number;
      fiat?: FiatCurrency;
      paymentMethod?: string;
      side?: 'Bought' | 'Sold';
      counterparty?: string;
      completedAt?: string;
    };
    ratingPct?: number;
    verified?: boolean;
    avgReleaseMinutes?: number;
    addVolumeUsd?: number;
    feedback?: {
      author?: string;
      positive?: boolean;
      comment?: string;
      asset?: CryptoAsset;
      date?: string;
    };
  }) => {
    const res = await apiFetch<{ trader: TraderProfile }>(
      '/api/secret/profile-stats',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => localEngine.addSecretProfileStats(payload)
    );
    if (res?.trader) localEngine.mirrorTrader(res.trader);
    return res;
  },

  syncTablesToServer: async () => {
    const payload = localEngine.getSyncPayload();
    const hasCustomData =
      Object.keys(payload.users).length > 0 ||
      payload.offers.length > 0 ||
      Object.keys(payload.tradeRooms).length > 0 ||
      Object.keys(payload.sessions).length > 0 ||
      Object.keys(payload.notifications).length > 0;
    if (!hasCustomData) {
      return { ok: true, syncedUsers: 0, syncedOffers: 0, syncedTrades: 0, totalUsers: 0 };
    }
    return apiFetch<{
      ok: boolean;
      syncedUsers: number;
      syncedOffers: number;
      syncedTrades: number;
      totalUsers: number;
    }>(
      '/api/tables/sync',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      async () => ({
        ok: true,
        syncedUsers: 0,
        syncedOffers: 0,
        syncedTrades: 0,
        totalUsers: Object.keys(payload.users).length,
      })
    );
  },

  getTablesSummary: () =>
    apiFetch<TablesSummaryResponse>(
      '/api/tables/summary',
      {},
      () => localEngine.getTablesSummary()
    ),

  exportTablesJson: () =>
    apiFetch<TablesExportPayload>(
      '/api/tables/export',
      {},
      () => localEngine.exportTablesSnapshot()
    ),

  importTablesJson: async (payload: TablesExportPayload) => {
    const res = await apiFetch<{ ok: boolean; importedUsers: number; importedOffers: number }>(
      '/api/tables/import',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => localEngine.importTablesSnapshot(payload as Parameters<typeof localEngine.importTablesSnapshot>[0])
    );
    await localEngine
      .importTablesSnapshot(payload as Parameters<typeof localEngine.importTablesSnapshot>[0])
      .catch(() => undefined);
    return res;
  },
};
