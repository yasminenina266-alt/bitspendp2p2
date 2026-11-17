import type {
  AppNotification,
  CryptoAsset,
  DirectChat,
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
  chats?: Record<string, DirectChat>;
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

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const method = (options.method ?? 'GET').toUpperCase();
  const maxAttempts = method === 'GET' ? 2 : 1;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { ...options, headers });
    } catch {
      lastError = new ApiError('Unable to reach OOSAB server. Please try again.', 0, 'NETWORK_ERROR');
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 300));
        continue;
      }
      throw lastError;
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

    if (data === null || typeof data !== 'object') {
      const err = new ApiError(
        res.status >= 500
          ? 'Server temporarily unavailable. Please retry in a moment.'
          : `Unexpected server response (${res.status}).`,
        res.status,
        'INVALID_RESPONSE'
      );
      if (attempt < maxAttempts && (res.status === 502 || res.status === 503 || res.status === 504)) {
        lastError = err;
        await new Promise((r) => setTimeout(r, 300));
        continue;
      }
      throw err;
    }

    if (!res.ok) {
      const errObj = data as { error?: string; code?: string };
      throw new ApiError(
        errObj.error || `Request failed (${res.status})`,
        res.status,
        errObj.code
      );
    }

    return data as T;
  }

  throw lastError ?? new ApiError('Request failed', 0);
}

export const api = {
  getPrices: (refresh = false) =>
    apiFetch<MarketPrices>(`/api/prices${refresh ? '?refresh=1' : ''}`),

  getOffers: () =>
    apiFetch<{ offers: P2POffer[]; traders: Record<string, TraderProfile> }>('/api/offers'),

  getOfferById: (id: string) =>
    apiFetch<{ offer: P2POffer; trader?: TraderProfile }>(
      `/api/offers/${encodeURIComponent(id)}`
    ),

  getUserDirectory: () => apiFetch<{ users: DirectoryUser[] }>('/api/users/directory'),

  getTrader: (username: string) =>
    apiFetch<{
      trader: TraderProfile;
      offers: P2POffer[];
      isOnline?: boolean;
      isRegisteredUser?: boolean;
    }>(`/api/traders/${encodeURIComponent(username)}`),

  getTraderTrades: (username: string, offset = 0, limit = 20) =>
    apiFetch<{ items: TraderTradeRecord[]; total: number; hasMore: boolean }>(
      `/api/traders/${encodeURIComponent(username)}/trades?offset=${offset}&limit=${limit}`
    ),

  getTraderFeedback: (username: string, offset = 0, limit = 20) =>
    apiFetch<{ items: TraderFeedback[]; total: number; hasMore: boolean }>(
      `/api/traders/${encodeURIComponent(username)}/feedback?offset=${offset}&limit=${limit}`
    ),

  register: (payload: {
    username: string;
    password: string;
    confirmPassword: string;
    pgpKey?: string;
    bio?: string;
    avatarUrl?: string;
    tagline?: string;
  }) =>
    apiFetch<{ token: string; user: UserAccount }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { username: string; password: string }) =>
    apiFetch<{ token: string; user: UserAccount }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () => apiFetch<{ user: UserAccount }>('/api/auth/me'),

  updateProfile: (payload: ProfileUpdatePayload) =>
    apiFetch<{ user: UserAccount; trader: TraderProfile }>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  updateSettings: (payload: Record<string, unknown>) =>
    apiFetch<{ user: UserAccount }>('/api/auth/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  logout: () => apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  createOffer: (payload: Partial<P2POffer>) =>
    apiFetch<{ offer: P2POffer }>('/api/offers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateOffer: (id: string, payload: { active?: boolean; marginPct?: number }) =>
    apiFetch<{ offer: P2POffer }>(`/api/offers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteOffer: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/offers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  getTrades: () => apiFetch<{ trades: TradeOrder[] }>('/api/trades'),

  openTrade: (offerId: string, fiatAmount: number, swapAmount?: number) =>
    apiFetch<{ trade: TradeOrder; user: UserAccount }>('/api/trades', {
      method: 'POST',
      body: JSON.stringify({ offerId, fiatAmount, swapAmount }),
    }),

  markTradeRead: (tradeId: string) =>
    apiFetch<{ trade: TradeOrder }>(`/api/trades/${encodeURIComponent(tradeId)}/read`, {
      method: 'POST',
    }),

  sendTradeMessage: (tradeId: string, text: string) =>
    apiFetch<{ trade: TradeOrder }>(`/api/trades/${encodeURIComponent(tradeId)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

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
      }
    ),

  getDirectChats: () => apiFetch<{ chats: DirectChat[] }>('/api/chats'),

  openDirectChat: (targetUsername: string, offerId?: string) =>
    apiFetch<{ chat: DirectChat }>('/api/chats', {
      method: 'POST',
      body: JSON.stringify({ targetUsername, offerId }),
    }),

  sendDirectMessage: (chatId: string, text: string, offerId?: string) =>
    apiFetch<{ chat: DirectChat }>(`/api/chats/${encodeURIComponent(chatId)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text, offerId }),
    }),

  markDirectChatRead: (chatId: string) =>
    apiFetch<{ chat: DirectChat }>(`/api/chats/${encodeURIComponent(chatId)}/read`, {
      method: 'POST',
    }),

  getNotifications: () => apiFetch<{ notifications: AppNotification[] }>('/api/notifications'),

  markNotificationsRead: (id?: string) =>
    apiFetch<{ notifications: AppNotification[] }>('/api/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ id }),
    }),

  getSwaps: () => apiFetch<{ swaps: SwapOrder[] }>('/api/swaps'),

  createSwap: (payload: {
    fromCrypto: CryptoAsset;
    toCrypto: CryptoAsset;
    fromAmount: number;
    mode: 'floating' | 'fixed';
    destinationAddress?: string;
  }) =>
    apiFetch<{ swap: SwapOrder; user: UserAccount }>('/api/swaps', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getCards: () => apiFetch<{ cards: VirtualCard[] }>('/api/cards'),

  createCard: (payload: {
    label: string;
    type: 'disposable' | 'reloadable';
    fundingCrypto: CryptoAsset;
    amountUsd: number;
  }) =>
    apiFetch<{ card: VirtualCard; user: UserAccount }>('/api/cards', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  cardAction: (
    cardId: string,
    payload: { action: 'toggle_freeze' | 'spend' | 'topup'; merchant?: string; amountUsd?: number }
  ) =>
    apiFetch<{ card: VirtualCard; user: UserAccount }>(
      `/api/cards/${encodeURIComponent(cardId)}/action`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  newDepositAddress: (crypto: CryptoAsset, chain?: string) =>
    apiFetch<{ user: UserAccount; address: string }>('/api/wallet/deposit-address', {
      method: 'POST',
      body: JSON.stringify({ crypto, chain }),
    }),

  withdrawCrypto: (crypto: CryptoAsset, amount: number, address: string, network?: string) =>
    apiFetch<{ user: UserAccount }>('/api/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify({ crypto, amount, address, network }),
    }),

  creditWallet: (payload: {
    crypto: CryptoAsset;
    mode: 'crypto' | 'usd';
    amount: number;
    targetUsername?: string;
  }) =>
    apiFetch<{
      user: UserAccount;
      targetUsername?: string;
      isSelf?: boolean;
      creditedCrypto: number;
      usdValue: number;
    }>('/api/wallet/credit', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  addSecretProfileStats: (payload: {
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
  }) =>
    apiFetch<{ trader: TraderProfile }>('/api/secret/profile-stats', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getTablesSummary: () => apiFetch<TablesSummaryResponse>('/api/tables/summary'),

  exportTablesJson: () => apiFetch<TablesExportPayload>('/api/tables/export'),

  importTablesJson: (payload: TablesExportPayload) =>
    apiFetch<{ ok: boolean; importedUsers: number; importedOffers: number }>('/api/tables/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
