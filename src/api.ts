import { localEngine } from './localEngine';
import type {
  CryptoAsset,
  MarketPrices,
  P2POffer,
  SwapOrder,
  TradeOrder,
  TraderFeedback,
  TraderProfile,
  TraderTradeRecord,
  UserAccount,
  VirtualCard,
} from './types';

const TOKEN_KEY = 'bitspend_session_token';

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

  getOffers: () =>
    apiFetch<{ offers: P2POffer[]; traders: Record<string, TraderProfile> }>(
      '/api/offers',
      {},
      () => localEngine.getOffers()
    ),

  getTrader: (username: string) =>
    apiFetch<{ trader: TraderProfile; offers: P2POffer[] }>(
      `/api/traders/${encodeURIComponent(username)}`,
      {},
      () => localEngine.getTrader(username)
    ),

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

  register: (payload: {
    username: string;
    password: string;
    confirmPassword: string;
    pgpKey?: string;
    bio?: string;
  }) =>
    apiFetch<{ token: string; user: UserAccount }>(
      '/api/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => localEngine.register(payload)
    ),

  login: (payload: { username: string; password: string }) =>
    apiFetch<{ token: string; user: UserAccount }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => localEngine.login(payload)
    ),

  getMe: () => apiFetch<{ user: UserAccount }>('/api/auth/me', {}, () => localEngine.getMe()),

  updateProfile: (payload: { bio?: string; pgpKey?: string }) =>
    apiFetch<{ user: UserAccount; trader: TraderProfile }>(
      '/api/auth/profile',
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      () => localEngine.updateProfile(payload)
    ),

  updateSettings: (payload: Record<string, unknown>) =>
    apiFetch<{ user: UserAccount }>(
      '/api/auth/settings',
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      () => localEngine.updateSettings(payload)
    ),

  logout: () =>
    apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }, () => localEngine.logout()),

  createOffer: (payload: Partial<P2POffer>) =>
    apiFetch<{ offer: P2POffer }>(
      '/api/offers',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => localEngine.createOffer(payload)
    ),

  updateOffer: (id: string, payload: { active?: boolean; marginPct?: number }) =>
    apiFetch<{ offer: P2POffer }>(
      `/api/offers/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      () => localEngine.updateOffer(id, payload)
    ),

  deleteOffer: (id: string) =>
    apiFetch<{ ok: boolean }>(
      `/api/offers/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
      },
      () => localEngine.deleteOffer(id)
    ),

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

  newDepositAddress: (crypto: CryptoAsset, chain?: string) =>
    apiFetch<{ user: UserAccount; address: string }>(
      '/api/wallet/deposit-address',
      {
        method: 'POST',
        body: JSON.stringify({ crypto, chain }),
      },
      () => localEngine.newDepositAddress(crypto, chain)
    ),

  withdrawCrypto: (crypto: CryptoAsset, amount: number, address: string, network?: string) =>
    apiFetch<{ user: UserAccount }>(
      '/api/wallet/withdraw',
      {
        method: 'POST',
        body: JSON.stringify({ crypto, amount, address, network }),
      },
      () => localEngine.withdrawCrypto(crypto, amount, address, network)
    ),
};
