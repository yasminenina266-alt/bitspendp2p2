import {
  SEED_OFFERS,
  SEED_TRADERS,
  buildTraderDetails,
  generateTraderFeedbackPage,
  generateTraderTradesPage,
} from '../server/seedData';
import type {
  CryptoAsset,
  FiatCurrency,
  MarketPrices,
  P2POffer,
  SwapOrder,
  TradeOrder,
  TraderFeedback,
  TraderProfile,
  TraderTradeRecord,
  UserAccount,
  UserSettings,
  VirtualCard,
  WalletTx,
} from './types';

const LOCAL_DB_KEY = 'bitspend_local_state_v1';
const TOKEN_KEY = 'bitspend_session_token';

const FIXED_BTC_ADDRESS = 'bc1qv7qvjjam07ev06ysu7kfuztn3dfjesdznz6wfm';
const FIXED_LTC_ADDRESS = 'LatBh7a5ZyZxFudV2AtgByuA9obpxzm7fr';
const FIXED_EVM_ADDRESS = '0xC15D70D3200ddcDdeDA9Eb059f71111B911594fE';
const FIXED_SOL_ADDRESS = '7BGAsWDFus6LBNRRNugajtsWhAAGAnEWh57s2NbJF7GL';
const FIXED_TRON_ADDRESS = 'TF5axzEMGZ5ALiq5nrjHxGGURCFyniJ66d';

const DEFAULT_USD_PRICES: Record<CryptoAsset, number> = {
  BTC: 91250.0,
  XMR: 184.6,
  ETH: 3140.0,
  USDT: 1.0,
  LTC: 86.4,
  SOL: 214.5,
  USDC: 1.0,
};

const DEFAULT_24H_CHANGES: Record<CryptoAsset, number> = {
  BTC: 2.14,
  XMR: 3.42,
  ETH: 1.85,
  USDT: 0.01,
  LTC: 0.94,
  SOL: 4.18,
  USDC: 0.0,
};

const DEFAULT_FIAT_RATES: Record<FiatCurrency, number> = {
  USD: 1.0,
  EUR: 0.925,
  GBP: 0.788,
  BHD: 0.376,
  IDR: 15850.0,
  CAD: 1.395,
  AUD: 1.535,
  CHF: 0.882,
  SGD: 1.338,
  AED: 3.6725,
  JPY: 154.2,
  BRL: 5.76,
  INR: 84.4,
  NGN: 1665.0,
  TRY: 34.4,
  MXN: 20.35,
};

const DEFAULT_SETTINGS: UserSettings = {
  preferredCurrency: 'USD',
  defaultPaymentWindow: 30,
  autoPgpSign: true,
  hideOnlineStatus: false,
  torFriendlyMode: false,
  escrowAlerts: true,
};

const RECOVERY_WORDS = [
  'ember', 'cipher', 'pine', 'vault', 'anchor', 'quartz', 'monarch', 'velvet',
  'harbor', 'summit', 'cobalt', 'orbit', 'saffron', 'granite', 'horizon', 'cedar',
  'prism', 'beacon', 'frost', 'meadow', 'silver', 'vector', 'pulse', 'atlas',
];

interface LocalUser extends UserAccount {
  password: string;
}

interface LocalDb {
  traders: Record<string, TraderProfile>;
  offers: P2POffer[];
  users: Record<string, LocalUser>;
  sessions: Record<string, string>;
  trades: Record<string, TradeOrder[]>;
  swaps: Record<string, SwapOrder[]>;
  cards: Record<string, VirtualCard[]>;
}

let cachedPrices: MarketPrices = {
  usdPrices: { ...DEFAULT_USD_PRICES },
  fiatRatesFromUsd: { ...DEFAULT_FIAT_RATES },
  changes24h: { ...DEFAULT_24H_CHANGES },
  source: 'Market Reference Rates',
  updatedAt: 0,
};

let fiatLastUpdated = 0;

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

function generateDepositAddress(asset: CryptoAsset, chain?: string): string {
  if (asset === 'BTC') return FIXED_BTC_ADDRESS;
  if (asset === 'LTC') return FIXED_LTC_ADDRESS;
  if (asset === 'ETH') return FIXED_EVM_ADDRESS;
  if (asset === 'SOL') return FIXED_SOL_ADDRESS;
  if (asset === 'USDT') {
    if (chain === 'SOL') return FIXED_SOL_ADDRESS;
    if (chain === 'TRX') return FIXED_TRON_ADDRESS;
    return FIXED_EVM_ADDRESS;
  }
  if (asset === 'USDC') {
    if (chain === 'SOL') return FIXED_SOL_ADDRESS;
    return FIXED_EVM_ADDRESS;
  }
  const rand = randomHex(16);
  return `4${rand}89ab${rand.slice(0, 12)}`;
}

function createAllDepositAddresses(): Record<CryptoAsset, string> {
  return {
    BTC: FIXED_BTC_ADDRESS,
    XMR: generateDepositAddress('XMR'),
    ETH: FIXED_EVM_ADDRESS,
    USDT: FIXED_EVM_ADDRESS,
    LTC: FIXED_LTC_ADDRESS,
    SOL: FIXED_SOL_ADDRESS,
    USDC: FIXED_EVM_ADDRESS,
  };
}

function ensureUserFields(u: LocalUser): LocalUser {
  if (!u.depositAddresses) {
    u.depositAddresses = createAllDepositAddresses();
  } else {
    u.depositAddresses.BTC = FIXED_BTC_ADDRESS;
    u.depositAddresses.LTC = FIXED_LTC_ADDRESS;
    u.depositAddresses.ETH = FIXED_EVM_ADDRESS;
    u.depositAddresses.SOL = FIXED_SOL_ADDRESS;
    u.depositAddresses.USDT = FIXED_EVM_ADDRESS;
    u.depositAddresses.USDC = FIXED_EVM_ADDRESS;
  }
  if (!Array.isArray(u.walletHistory)) u.walletHistory = [];
  if (!u.settings) u.settings = { ...DEFAULT_SETTINGS };
  return u;
}

function sanitizeUser(u: LocalUser): UserAccount {
  ensureUserFields(u);
  return {
    username: u.username,
    bio: u.bio,
    createdAt: u.createdAt,
    pgpKey: u.pgpKey,
    recoveryPhrase: u.recoveryPhrase,
    balances: u.balances,
    depositAddresses: u.depositAddresses,
    walletHistory: u.walletHistory,
    settings: u.settings,
  };
}

function loadLocalDb(): LocalDb {
  try {
    const raw = localStorage.getItem(LOCAL_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LocalDb>;
      const existingOffers = Array.isArray(parsed.offers) ? parsed.offers : [];
      const existingIds = new Set(existingOffers.map((o) => o.id));
      return {
        traders: { ...SEED_TRADERS, ...(parsed.traders ?? {}) },
        offers: [...existingOffers, ...SEED_OFFERS.filter((o) => !existingIds.has(o.id))],
        users: parsed.users ?? {},
        sessions: parsed.sessions ?? {},
        trades: parsed.trades ?? {},
        swaps: parsed.swaps ?? {},
        cards: parsed.cards ?? {},
      };
    }
  } catch {
    // ignore storage read error
  }
  return {
    traders: { ...SEED_TRADERS },
    offers: [...SEED_OFFERS],
    users: {},
    sessions: {},
    trades: {},
    swaps: {},
    cards: {},
  };
}

function saveLocalDb(db: LocalDb) {
  try {
    localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db));
  } catch {
    // ignore storage quota errors
  }
}

function getLocalAuthUser(db: LocalDb): LocalUser {
  let token: string | null = null;
  try {
    token = localStorage.getItem(TOKEN_KEY);
  } catch {
    token = null;
  }
  if (!token) throw new Error('Authentication required');
  const username = db.sessions[token];
  if (!username || !db.users[username]) throw new Error('Authentication required');
  return ensureUserFields(db.users[username]);
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 4500): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function getBrowserLivePrices(force = false): Promise<MarketPrices> {
  const now = Date.now();
  const ageMs = now - cachedPrices.updatedAt;
  if (!force && cachedPrices.updatedAt > 0 && ageMs < 45_000) {
    return cachedPrices;
  }

  let fiatRatesFromUsd = { ...cachedPrices.fiatRatesFromUsd };
  if (now - fiatLastUpdated > 60 * 60 * 1000 || fiatLastUpdated === 0) {
    try {
      const fx = (await fetchJsonWithTimeout('https://open.er-api.com/v6/latest/USD')) as {
        result?: string;
        rates?: Record<string, number>;
      };
      if (fx?.result === 'success' && fx.rates) {
        (Object.keys(fiatRatesFromUsd) as FiatCurrency[]).forEach((code) => {
          if (typeof fx.rates?.[code] === 'number' && fx.rates[code] > 0) {
            fiatRatesFromUsd[code] = fx.rates[code];
          }
        });
        fiatLastUpdated = now;
      }
    } catch {
      // keep existing fiat rates
    }
  }

  try {
    const cg = (await fetchJsonWithTimeout(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,monero,ethereum,tether,litecoin,solana,usd-coin&vs_currencies=usd&include_24hr_change=true'
    )) as Record<string, { usd?: number; usd_24h_change?: number }>;

    if (cg?.bitcoin?.usd && cg?.monero?.usd) {
      cachedPrices = {
        usdPrices: {
          BTC: cg.bitcoin.usd,
          XMR: cg.monero.usd,
          ETH: cg.ethereum?.usd ?? DEFAULT_USD_PRICES.ETH,
          USDT: cg.tether?.usd ?? 1.0,
          LTC: cg.litecoin?.usd ?? DEFAULT_USD_PRICES.LTC,
          SOL: cg.solana?.usd ?? DEFAULT_USD_PRICES.SOL,
          USDC: cg['usd-coin']?.usd ?? 1.0,
        },
        fiatRatesFromUsd,
        changes24h: {
          BTC: cg.bitcoin.usd_24h_change ?? 0,
          XMR: cg.monero.usd_24h_change ?? 0,
          ETH: cg.ethereum?.usd_24h_change ?? 0,
          USDT: cg.tether?.usd_24h_change ?? 0,
          LTC: cg.litecoin?.usd_24h_change ?? 0,
          SOL: cg.solana?.usd_24h_change ?? 0,
          USDC: cg['usd-coin']?.usd_24h_change ?? 0,
        },
        source: 'CoinGecko API',
        updatedAt: now,
      };
      return cachedPrices;
    }
  } catch {
    // fallback to CryptoCompare
  }

  try {
    const cc = (await fetchJsonWithTimeout(
      'https://min-api.cryptocompare.com/data/pricemultifull?fsyms=BTC,XMR,ETH,USDT,LTC,SOL,USDC&tsyms=USD'
    )) as {
      RAW?: Record<string, { USD?: { PRICE?: number; CHANGEPCT24HOUR?: number } }>;
    };
    if (cc?.RAW?.BTC?.USD?.PRICE && cc?.RAW?.XMR?.USD?.PRICE) {
      const assets: CryptoAsset[] = ['BTC', 'XMR', 'ETH', 'USDT', 'LTC', 'SOL', 'USDC'];
      const usdPrices = { ...DEFAULT_USD_PRICES };
      const changes24h = { ...DEFAULT_24H_CHANGES };
      assets.forEach((sym) => {
        const entry = cc.RAW?.[sym]?.USD;
        if (entry?.PRICE) usdPrices[sym] = entry.PRICE;
        if (typeof entry?.CHANGEPCT24HOUR === 'number') changes24h[sym] = entry.CHANGEPCT24HOUR;
      });
      cachedPrices = {
        usdPrices,
        fiatRatesFromUsd,
        changes24h,
        source: 'CryptoCompare API',
        updatedAt: now,
      };
      return cachedPrices;
    }
  } catch {
    // keep baseline
  }

  cachedPrices = {
    ...cachedPrices,
    fiatRatesFromUsd,
    source: cachedPrices.updatedAt > 0 ? cachedPrices.source : 'Reference Baseline',
    updatedAt: now,
  };
  return cachedPrices;
}

function computeOfferUnitPrice(offer: P2POffer, prices: MarketPrices): number {
  if (offer.pricingMode === 'fixed' && offer.fixedPrice && offer.fixedPrice > 0) {
    return offer.fixedPrice;
  }
  if (offer.side === 'swap_crypto' && offer.swapToCrypto) {
    const offerUsd = prices.usdPrices[offer.crypto] ?? DEFAULT_USD_PRICES[offer.crypto];
    const wantUsd = prices.usdPrices[offer.swapToCrypto] ?? DEFAULT_USD_PRICES[offer.swapToCrypto];
    const crossRate = wantUsd > 0 ? offerUsd / wantUsd : 1;
    return crossRate * (1 + offer.marginPct / 100);
  }
  const usdSpot = prices.usdPrices[offer.crypto] ?? DEFAULT_USD_PRICES[offer.crypto];
  const fiatRate = prices.fiatRatesFromUsd[offer.fiat] ?? 1;
  return usdSpot * fiatRate * (1 + offer.marginPct / 100);
}

export const localEngine = {
  getPrices: (refresh = false) => getBrowserLivePrices(refresh),

  getOffers: async () => {
    const db = loadLocalDb();
    return { offers: db.offers, traders: db.traders };
  },

  getTrader: async (username: string) => {
    const db = loadLocalDb();
    const rawTrader = db.traders[username];
    if (!rawTrader) throw new Error('Trader profile not found');
    const trader = buildTraderDetails(rawTrader, db.offers);
    const offers = db.offers.filter((o) => o.traderUsername === trader.username && o.active);
    return { trader, offers };
  },

  getTraderTrades: async (username: string, offset = 0, limit = 20): Promise<{
    items: TraderTradeRecord[];
    total: number;
    hasMore: boolean;
  }> => {
    const db = loadLocalDb();
    const rawTrader = db.traders[username];
    if (!rawTrader) throw new Error('Trader profile not found');
    return generateTraderTradesPage(rawTrader, db.offers, offset, limit);
  },

  getTraderFeedback: async (username: string, offset = 0, limit = 20): Promise<{
    items: TraderFeedback[];
    total: number;
    hasMore: boolean;
  }> => {
    const db = loadLocalDb();
    const rawTrader = db.traders[username];
    if (!rawTrader) throw new Error('Trader profile not found');
    return generateTraderFeedbackPage(rawTrader, db.offers, offset, limit);
  },

  register: async (payload: {
    username: string;
    password: string;
    confirmPassword: string;
    pgpKey?: string;
    bio?: string;
  }) => {
    const db = loadLocalDb();
    const cleanUser = (payload.username ?? '').trim();
    if (!cleanUser || cleanUser.length < 3 || !/^[a-zA-Z0-9_.-]+$/.test(cleanUser)) {
      throw new Error('Username must be at least 3 characters (letters, numbers, _, ., -).');
    }
    if (!payload.password || payload.password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    if (payload.password !== payload.confirmPassword) {
      throw new Error('Passwords do not match.');
    }
    if (db.users[cleanUser] || db.traders[cleanUser]) {
      throw new Error('That username is already registered.');
    }

    const pgpFp = (payload.pgpKey ?? '').trim() || randomHex(20).toUpperCase().match(/.{1,4}/g)?.join(' ') || '';
    const recoveryWords: string[] = [];
    for (let i = 0; i < 12; i++) {
      recoveryWords.push(RECOVERY_WORDS[Math.floor(Math.random() * RECOVERY_WORDS.length)]);
    }

    const newUser: LocalUser = {
      username: cleanUser,
      password: payload.password,
      bio: (payload.bio ?? '').trim() || 'Independent P2P trader on BitSpend. Zero KYC.',
      createdAt: new Date().toISOString().slice(0, 10),
      pgpKey: pgpFp,
      recoveryPhrase: recoveryWords.join(' '),
      balances: { BTC: 0, XMR: 0, ETH: 0, USDT: 0, LTC: 0, SOL: 0, USDC: 0 },
      depositAddresses: createAllDepositAddresses(),
      walletHistory: [],
      settings: { ...DEFAULT_SETTINGS },
    };

    const newTrader: TraderProfile = {
      username: cleanUser,
      joinedAt: newUser.createdAt,
      tradesCount: 0,
      ratingPct: 100,
      avgReleaseMinutes: 5,
      lastSeenMinutes: 0,
      verified: false,
      languages: ['English'],
      pgpFingerprint: pgpFp,
      bio: newUser.bio,
      volumeTier: 'New Trader',
      recentFeedback: [],
    };

    const token = randomHex(24);
    db.users[cleanUser] = newUser;
    db.traders[cleanUser] = newTrader;
    db.sessions[token] = cleanUser;
    saveLocalDb(db);
    return { token, user: sanitizeUser(newUser) };
  },

  login: async (payload: { username: string; password: string }) => {
    const db = loadLocalDb();
    const user = db.users[(payload.username ?? '').trim()];
    if (!user || user.password !== payload.password) {
      throw new Error('Invalid username or password.');
    }
    const token = randomHex(24);
    db.sessions[token] = user.username;
    saveLocalDb(db);
    return { token, user: sanitizeUser(user) };
  },

  getMe: async () => {
    const db = loadLocalDb();
    const user = getLocalAuthUser(db);
    return { user: sanitizeUser(user) };
  },

  updateProfile: async (payload: { bio?: string; pgpKey?: string }) => {
    const db = loadLocalDb();
    const user = getLocalAuthUser(db);
    if (typeof payload.bio === 'string') user.bio = payload.bio.trim();
    if (typeof payload.pgpKey === 'string' && payload.pgpKey.trim()) {
      user.pgpKey = payload.pgpKey.trim();
    }
    if (db.traders[user.username]) {
      db.traders[user.username].bio = user.bio;
      db.traders[user.username].pgpFingerprint = user.pgpKey;
    }
    saveLocalDb(db);
    return { user: sanitizeUser(user), trader: db.traders[user.username] };
  },

  updateSettings: async (payload: Record<string, unknown>) => {
    const db = loadLocalDb();
    const user = getLocalAuthUser(db);
    if (typeof payload.preferredCurrency === 'string') {
      user.settings.preferredCurrency = payload.preferredCurrency as FiatCurrency;
    }
    if (typeof payload.defaultPaymentWindow === 'number') {
      user.settings.defaultPaymentWindow = payload.defaultPaymentWindow;
    }
    if (typeof payload.autoPgpSign === 'boolean') user.settings.autoPgpSign = payload.autoPgpSign;
    if (typeof payload.hideOnlineStatus === 'boolean') {
      user.settings.hideOnlineStatus = payload.hideOnlineStatus;
    }
    if (typeof payload.torFriendlyMode === 'boolean') {
      user.settings.torFriendlyMode = payload.torFriendlyMode;
    }
    if (typeof payload.escrowAlerts === 'boolean') user.settings.escrowAlerts = payload.escrowAlerts;
    if (typeof payload.newPassword === 'string' && payload.newPassword) {
      if (payload.newPassword.length < 6) throw new Error('New password must be at least 6 characters.');
      if (payload.newPassword !== payload.confirmNewPassword) {
        throw new Error('New passwords do not match.');
      }
      user.password = payload.newPassword;
    }
    saveLocalDb(db);
    return { user: sanitizeUser(user) };
  },

  logout: async () => {
    const db = loadLocalDb();
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        delete db.sessions[token];
        saveLocalDb(db);
      }
    } catch {
      // ignore
    }
    return { ok: true };
  },

  createOffer: async (body: Partial<P2POffer>) => {
    const db = loadLocalDb();
    const user = getLocalAuthUser(db);
    if (!body.crypto || !body.side) throw new Error('Missing required offer fields.');

    const prices = await getBrowserLivePrices();
    if (body.side === 'swap_crypto') {
      if (!body.swapToCrypto || body.swapToCrypto === body.crypto) {
        throw new Error('Select a different cryptocurrency to receive in the swap.');
      }
      const minSwap = Number(body.minSwapAmount);
      const maxSwap = Number(body.maxSwapAmount);
      if (!Number.isFinite(minSwap) || !Number.isFinite(maxSwap) || minSwap <= 0 || maxSwap < minSwap) {
        throw new Error('Maximum swap limit must be greater than or equal to minimum.');
      }
      const wantUsd = prices.usdPrices[body.swapToCrypto] ?? DEFAULT_USD_PRICES[body.swapToCrypto];
      const offerUsd = prices.usdPrices[body.crypto] ?? DEFAULT_USD_PRICES[body.crypto];
      const crossRate = wantUsd > 0 ? offerUsd / wantUsd : 1;
      const unitPrice =
        body.pricingMode === 'fixed' && Number(body.fixedPrice) > 0
          ? Number(body.fixedPrice)
          : crossRate * (1 + (Number.isFinite(Number(body.marginPct)) ? Number(body.marginPct) : 0) / 100);
      const minCryptoEq = unitPrice > 0 ? minSwap / unitPrice : 0;
      const reqAvail = body.availableCrypto && Number(body.availableCrypto) > 0 ? Number(body.availableCrypto) : 0;
      const requiredCrypto = Math.max(reqAvail, minCryptoEq);
      const bal = user.balances[body.crypto] ?? 0;
      if (bal < requiredCrypto) {
        throw new Error(
          `Insufficient ${body.crypto} funds to publish this swap listing. You need at least ${requiredCrypto.toFixed(6)} ${body.crypto}.`
        );
      }
      const newOffer: P2POffer = {
        id: `off-${randomHex(3)}`,
        side: 'swap_crypto',
        traderUsername: user.username,
        crypto: body.crypto,
        swapToCrypto: body.swapToCrypto,
        fiat: 'USD',
        country: body.country || 'Global',
        paymentMethod: body.paymentMethod || 'BitSpend P2P Escrow Swap',
        paymentCategory: 'Crypto Swap',
        pricingMode: body.pricingMode === 'fixed' ? 'fixed' : 'margin',
        marginPct: Number.isFinite(Number(body.marginPct)) ? Number(body.marginPct) : 0,
        fixedPrice: body.pricingMode === 'fixed' ? Number(body.fixedPrice) : undefined,
        minFiat: Math.max(1, Math.round(minSwap * wantUsd)),
        maxFiat: Math.max(1, Math.round(maxSwap * wantUsd)),
        minSwapAmount: minSwap,
        maxSwapAmount: maxSwap,
        availableCrypto: reqAvail > 0 ? reqAvail : undefined,
        paymentWindowMinutes: Number(body.paymentWindowMinutes) || 30,
        tags: Array.isArray(body.tags) && body.tags.length > 0 ? body.tags : ['No ID Required', 'Instant Release'],
        terms:
          (body.terms ?? '').trim() ||
          `Direct user-to-user ${body.swapToCrypto} to ${body.crypto} escrow swap. Zero ID verification required.`,
        active: true,
        createdAt: new Date().toISOString(),
      };
      db.offers.unshift(newOffer);
      saveLocalDb(db);
      return { offer: newOffer };
    }

    if (!body.fiat || !body.paymentMethod) throw new Error('Missing required offer fields.');
    const minFiat = Number(body.minFiat);
    const maxFiat = Number(body.maxFiat);
    if (!Number.isFinite(minFiat) || !Number.isFinite(maxFiat) || minFiat <= 0 || maxFiat < minFiat) {
      throw new Error('Maximum trade limit must be greater than or equal to minimum.');
    }

    if (body.side === 'sell_crypto') {
      const usdSpot = prices.usdPrices[body.crypto] ?? DEFAULT_USD_PRICES[body.crypto];
      const fiatRate = prices.fiatRatesFromUsd[body.fiat] ?? 1;
      const margin = Number.isFinite(Number(body.marginPct)) ? Number(body.marginPct) : 0;
      const unitPrice =
        body.pricingMode === 'fixed' && Number(body.fixedPrice) > 0
          ? Number(body.fixedPrice)
          : usdSpot * fiatRate * (1 + margin / 100);
      const minCryptoEq = unitPrice > 0 ? minFiat / unitPrice : 0;
      const reqAvail = body.availableCrypto && Number(body.availableCrypto) > 0 ? Number(body.availableCrypto) : 0;
      const requiredCrypto = Math.max(reqAvail, minCryptoEq);
      const bal = user.balances[body.crypto] ?? 0;
      if (bal < requiredCrypto) {
        throw new Error(
          `Insufficient ${body.crypto} funds to publish this listing. You need at least ${requiredCrypto.toFixed(6)} ${body.crypto}.`
        );
      }
    }

    const newOffer: P2POffer = {
      id: `off-${randomHex(3)}`,
      side: body.side,
      traderUsername: user.username,
      crypto: body.crypto,
      fiat: body.fiat,
      country: body.country || 'Global',
      paymentMethod: body.paymentMethod,
      paymentCategory: body.paymentCategory || 'Online Wallets',
      pricingMode: body.pricingMode === 'fixed' ? 'fixed' : 'margin',
      marginPct: Number.isFinite(Number(body.marginPct)) ? Number(body.marginPct) : 0,
      fixedPrice: body.pricingMode === 'fixed' ? Number(body.fixedPrice) : undefined,
      minFiat,
      maxFiat,
      availableCrypto: body.availableCrypto && Number(body.availableCrypto) > 0 ? Number(body.availableCrypto) : undefined,
      paymentWindowMinutes: Number(body.paymentWindowMinutes) || 30,
      tags: Array.isArray(body.tags) && body.tags.length > 0 ? body.tags : ['No ID Required'],
      terms: (body.terms ?? '').trim() || 'Fast settlement. Zero ID verification required.',
      active: true,
      createdAt: new Date().toISOString(),
    };
    db.offers.unshift(newOffer);
    saveLocalDb(db);
    return { offer: newOffer };
  },

  updateOffer: async (id: string, payload: { active?: boolean; marginPct?: number }) => {
    const db = loadLocalDb();
    const user = getLocalAuthUser(db);
    const offer = db.offers.find((o) => o.id === id);
    if (!offer) throw new Error('Offer not found');
    if (offer.traderUsername !== user.username) throw new Error('You can only modify your own offers');
    if (typeof payload.active === 'boolean') offer.active = payload.active;
    if (typeof payload.marginPct === 'number') offer.marginPct = payload.marginPct;
    saveLocalDb(db);
    return { offer };
  },

  deleteOffer: async (id: string) => {
    const db = loadLocalDb();
    const user = getLocalAuthUser(db);
    const idx = db.offers.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error('Offer not found');
    if (db.offers[idx].traderUsername !== user.username) throw new Error('You can only delete your own offers');
    db.offers.splice(idx, 1);
    saveLocalDb(db);
    return { ok: true };
  },

  getTrades: async () => {
    const db = loadLocalDb();
    const user = getLocalAuthUser(db);
    return { trades: db.trades[user.username] ?? [] };
  },

  openTrade: async (offerId: string, fiatAmount: number, swapAmount?: number) => {
    const db = loadLocalDb();
    const user = getLocalAuthUser(db);
    const offer = db.offers.find((o) => o.id === offerId);
    if (!offer) throw new Error('Offer not found');
    if (offer.traderUsername === user.username) {
      throw new Error('You cannot place a trade on your own offer.');
    }
    const prices = await getBrowserLivePrices();
    const unitPrice = computeOfferUnitPrice(offer, prices);
    const now = Date.now();
    const tradeId = `TRD-${randomHex(3).toUpperCase()}`;

    if (offer.side === 'swap_crypto' && offer.swapToCrypto) {
      const sendAmt = Number(swapAmount ?? fiatAmount);
      const minSwap = offer.minSwapAmount ?? offer.minFiat / (prices.usdPrices[offer.swapToCrypto] ?? 1);
      const maxSwap = offer.maxSwapAmount ?? offer.maxFiat / (prices.usdPrices[offer.swapToCrypto] ?? 1);
      if (!Number.isFinite(sendAmt) || sendAmt < minSwap * 0.999 || sendAmt > maxSwap * 1.001) {
        throw new Error(`Swap amount must be between ${minSwap} and ${maxSwap} ${offer.swapToCrypto}.`);
      }
      if ((user.balances[offer.swapToCrypto] ?? 0) < sendAmt) {
        throw new Error(`Insufficient ${offer.swapToCrypto} balance in your BitSpend wallet.`);
      }
      user.balances[offer.swapToCrypto] = Number((user.balances[offer.swapToCrypto] - sendAmt).toFixed(8));
      const receiveAmt = sendAmt / unitPrice;
      const usdVal = Number((sendAmt * (prices.usdPrices[offer.swapToCrypto] ?? 1)).toFixed(2));
      const trade: TradeOrder = {
        id: tradeId,
        offerId: offer.id,
        side: 'swap_crypto',
        traderUsername: offer.traderUsername,
        buyerUsername: user.username,
        sellerUsername: offer.traderUsername,
        crypto: offer.crypto,
        swapToCrypto: offer.swapToCrypto,
        swapToAmount: sendAmt,
        fiat: 'USD',
        fiatAmount: usdVal,
        cryptoAmount: receiveAmt,
        unitPrice,
        paymentMethod: offer.paymentMethod,
        paymentDetails: `Multi-Asset Escrow Lock · ${sendAmt.toFixed(6)} ${offer.swapToCrypto} ↔ ${receiveAmt.toFixed(6)} ${offer.crypto} · Ref: ${tradeId}`,
        terms: offer.terms,
        status: 'escrow_funded',
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + offer.paymentWindowMinutes * 60_000).toISOString(),
        messages: [
          {
            id: `msg-${randomHex(4)}`,
            sender: 'Escrow System',
            text: `Both sides funded in BitSpend P2P multi-asset escrow: ${sendAmt.toFixed(6)} ${offer.swapToCrypto} swapped for ${receiveAmt.toFixed(6)} ${offer.crypto}.`,
            timestamp: new Date(now).toISOString(),
            isSystem: true,
          },
        ],
      };
      if (!db.trades[user.username]) db.trades[user.username] = [];
      db.trades[user.username].unshift(trade);
      saveLocalDb(db);
      return { trade, user: sanitizeUser(user) };
    }

    const amount = Number(fiatAmount);
    if (!Number.isFinite(amount) || amount < offer.minFiat || amount > offer.maxFiat) {
      throw new Error(`Trade amount must be between ${offer.minFiat} and ${offer.maxFiat} ${offer.fiat}.`);
    }
    const cryptoAmount = amount / unitPrice;
    if (offer.side === 'buy_crypto') {
      if ((user.balances[offer.crypto] ?? 0) < cryptoAmount) {
        throw new Error(`Insufficient ${offer.crypto} balance in your BitSpend wallet.`);
      }
      user.balances[offer.crypto] = Number((user.balances[offer.crypto] - cryptoAmount).toFixed(8));
    }

    const trade: TradeOrder = {
      id: tradeId,
      offerId: offer.id,
      side: offer.side,
      traderUsername: offer.traderUsername,
      buyerUsername: offer.side === 'sell_crypto' ? user.username : offer.traderUsername,
      sellerUsername: offer.side === 'sell_crypto' ? offer.traderUsername : user.username,
      crypto: offer.crypto,
      fiat: offer.fiat,
      fiatAmount: amount,
      cryptoAmount,
      unitPrice,
      paymentMethod: offer.paymentMethod,
      paymentDetails: `Reference: ${tradeId}`,
      terms: offer.terms,
      status: 'escrow_funded',
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + offer.paymentWindowMinutes * 60_000).toISOString(),
      messages: [
        {
          id: `msg-${randomHex(4)}`,
          sender: 'Escrow System',
          text: `Escrow funded with ${cryptoAmount.toFixed(6)} ${offer.crypto}. Complete ${offer.paymentMethod} transfer within ${offer.paymentWindowMinutes} minutes.`,
          timestamp: new Date(now).toISOString(),
          isSystem: true,
        },
      ],
    };
    if (!db.trades[user.username]) db.trades[user.username] = [];
    db.trades[user.username].unshift(trade);
    saveLocalDb(db);
    return { trade, user: sanitizeUser(user) };
  },

  sendTradeMessage: async (tradeId: string, text: string) => {
    const db = loadLocalDb();
    const user = getLocalAuthUser(db);
    const trade = (db.trades[user.username] ?? []).find((t) => t.id === tradeId);
    if (!trade) throw new Error('Trade not found');
    trade.messages.push({
      id: `msg-${randomHex(4)}`,
      sender: user.username,
      text: text.trim(),
      timestamp: new Date().toISOString(),
    });
    saveLocalDb(db);
    return { trade };
  },

  tradeAction: async (
    tradeId: string,
    payload: {
      action: 'mark_paid' | 'release' | 'cancel' | 'dispute' | 'feedback';
      positive?: boolean;
      comment?: string;
    }
  ) => {
    const db = loadLocalDb();
    const user = getLocalAuthUser(db);
    const trade = (db.trades[user.username] ?? []).find((t) => t.id === tradeId);
    if (!trade) throw new Error('Trade not found');

    if (payload.action === 'mark_paid' && trade.status === 'escrow_funded') {
      trade.status = 'payment_sent';
    } else if (payload.action === 'release' && (trade.status === 'payment_sent' || trade.status === 'escrow_funded')) {
      trade.status = 'completed';
      if (trade.side === 'sell_crypto' || trade.side === 'swap_crypto') {
        user.balances[trade.crypto] = Number(((user.balances[trade.crypto] ?? 0) + trade.cryptoAmount).toFixed(8));
      }
    } else if (payload.action === 'cancel' && trade.status === 'escrow_funded') {
      trade.status = 'cancelled';
      if (trade.side === 'buy_crypto') {
        user.balances[trade.crypto] = Number(((user.balances[trade.crypto] ?? 0) + trade.cryptoAmount).toFixed(8));
      } else if (trade.side === 'swap_crypto' && trade.swapToCrypto && trade.swapToAmount) {
        user.balances[trade.swapToCrypto] = Number(
          ((user.balances[trade.swapToCrypto] ?? 0) + trade.swapToAmount).toFixed(8)
        );
      }
    } else if (payload.action === 'dispute') {
      trade.status = 'disputed';
    } else if (payload.action === 'feedback' && trade.status === 'completed') {
      trade.feedbackGiven = {
        positive: Boolean(payload.positive),
        comment: (payload.comment ?? '').trim() || 'Clean trade.',
      };
    }
    saveLocalDb(db);
    return { trade, user: sanitizeUser(user) };
  },

  getSwaps: async () => {
    const db = loadLocalDb();
    const user = getLocalAuthUser(db);
    return { swaps: db.swaps[user.username] ?? [] };
  },

  createSwap: async (payload: {
    fromCrypto: CryptoAsset;
    toCrypto: CryptoAsset;
    fromAmount: number;
    mode: 'floating' | 'fixed';
    destinationAddress?: string;
  }) => {
    const db = loadLocalDb();
    const user = getLocalAuthUser(db);
    const amt = Number(payload.fromAmount);
    if (!Number.isFinite(amt) || amt <= 0) throw new Error('Invalid swap amount.');
    if ((user.balances[payload.fromCrypto] ?? 0) < amt) {
      throw new Error(`Insufficient ${payload.fromCrypto} balance.`);
    }
    const prices = await getBrowserLivePrices();
    const fee = payload.mode === 'fixed' ? 0.009 : 0.004;
    const rate = (prices.usdPrices[payload.fromCrypto] / prices.usdPrices[payload.toCrypto]) * (1 - fee);
    const toAmount = Number((amt * rate).toFixed(6));
    user.balances[payload.fromCrypto] = Number((user.balances[payload.fromCrypto] - amt).toFixed(8));
    if (!payload.destinationAddress?.trim()) {
      user.balances[payload.toCrypto] = Number(((user.balances[payload.toCrypto] ?? 0) + toAmount).toFixed(8));
    }
    const swap: SwapOrder = {
      id: `SWP-${randomHex(3).toUpperCase()}`,
      fromCrypto: payload.fromCrypto,
      toCrypto: payload.toCrypto,
      fromAmount: amt,
      toAmount,
      rate,
      mode: payload.mode,
      destinationAddress: payload.destinationAddress?.trim() || user.depositAddresses[payload.toCrypto],
      depositAddress: user.depositAddresses[payload.fromCrypto],
      status: 'completed',
      createdAt: new Date().toISOString(),
    };
    if (!db.swaps[user.username]) db.swaps[user.username] = [];
    db.swaps[user.username].unshift(swap);
    saveLocalDb(db);
    return { swap, user: sanitizeUser(user) };
  },

  getCards: async () => {
    const db = loadLocalDb();
    const user = getLocalAuthUser(db);
    return { cards: db.cards[user.username] ?? [] };
  },

  createCard: async (payload: {
    label: string;
    type: 'disposable' | 'reloadable';
    fundingCrypto: CryptoAsset;
    amountUsd: number;
  }) => {
    const db = loadLocalDb();
    const user = getLocalAuthUser(db);
    const prices = await getBrowserLivePrices();
    const cost = (payload.amountUsd * 1.015) / (prices.usdPrices[payload.fundingCrypto] || 1);
    if ((user.balances[payload.fundingCrypto] ?? 0) < cost) {
      throw new Error(`Insufficient ${payload.fundingCrypto} balance.`);
    }
    user.balances[payload.fundingCrypto] = Number((user.balances[payload.fundingCrypto] - cost).toFixed(8));
    const num = `4532${String(Math.floor(100000000000 + Math.random() * 899999999999))}`;
    const card: VirtualCard = {
      id: `CRD-${randomHex(3).toUpperCase()}`,
      label: payload.label.trim() || 'Private Virtual Card',
      type: payload.type,
      fundingCrypto: payload.fundingCrypto,
      balanceUsd: payload.amountUsd,
      last4: num.slice(-4),
      fullNumber: num,
      expiry: '09/29',
      cvv: String(Math.floor(100 + Math.random() * 899)),
      frozen: false,
      createdAt: new Date().toISOString(),
      transactions: [],
    };
    if (!db.cards[user.username]) db.cards[user.username] = [];
    db.cards[user.username].unshift(card);
    saveLocalDb(db);
    return { card, user: sanitizeUser(user) };
  },

  cardAction: async (
    cardId: string,
    payload: { action: 'toggle_freeze' | 'spend' | 'topup'; merchant?: string; amountUsd?: number }
  ) => {
    const db = loadLocalDb();
    const user = getLocalAuthUser(db);
    const card = (db.cards[user.username] ?? []).find((c) => c.id === cardId);
    if (!card) throw new Error('Card not found');
    if (payload.action === 'toggle_freeze') card.frozen = !card.frozen;
    else if (payload.action === 'spend') {
      const amt = Number(payload.amountUsd) || 18.5;
      if (card.balanceUsd < amt) throw new Error('Insufficient card balance.');
      card.balanceUsd = Number((card.balanceUsd - amt).toFixed(2));
      card.transactions.unshift({
        id: `tx-${randomHex(3)}`,
        merchant: payload.merchant || 'Online Merchant',
        amountUsd: -amt,
        timestamp: new Date().toISOString(),
        status: 'Settled',
      });
    } else if (payload.action === 'topup') {
      const amt = Number(payload.amountUsd) || 50;
      const prices = await getBrowserLivePrices();
      const cost = (amt * 1.01) / (prices.usdPrices[card.fundingCrypto] || 1);
      if ((user.balances[card.fundingCrypto] ?? 0) < cost) {
        throw new Error(`Insufficient ${card.fundingCrypto} balance.`);
      }
      user.balances[card.fundingCrypto] = Number((user.balances[card.fundingCrypto] - cost).toFixed(8));
      card.balanceUsd = Number((card.balanceUsd + amt).toFixed(2));
    }
    saveLocalDb(db);
    return { card, user: sanitizeUser(user) };
  },

  newDepositAddress: async (crypto: CryptoAsset, chain?: string) => {
    const db = loadLocalDb();
    const user = getLocalAuthUser(db);
    const address = generateDepositAddress(crypto, chain);
    if (crypto === 'XMR') user.depositAddresses[crypto] = address;
    saveLocalDb(db);
    return { user: sanitizeUser(user), address };
  },

  withdrawCrypto: async (crypto: CryptoAsset, amount: number, address: string, network?: string) => {
    const db = loadLocalDb();
    const user = getLocalAuthUser(db);
    const amt = Number(amount);
    if (!address.trim() || address.trim().length < 12) {
      throw new Error('Enter a valid destination wallet address.');
    }
    if (!Number.isFinite(amt) || amt <= 0) throw new Error('Enter a valid withdrawal amount.');
    if ((user.balances[crypto] ?? 0) < amt) throw new Error(`Insufficient ${crypto} balance.`);
    user.balances[crypto] = Number((user.balances[crypto] - amt).toFixed(8));
    const tx: WalletTx = {
      id: `WDR-${randomHex(3).toUpperCase()}`,
      type: 'withdrawal',
      crypto,
      amount: amt,
      address: address.trim(),
      txHash: randomHex(32),
      network: network || `${crypto} Mainnet`,
      status: 'Confirmed',
      timestamp: new Date().toISOString(),
    };
    user.walletHistory.unshift(tx);
    saveLocalDb(db);
    return { user: sanitizeUser(user) };
  },
};
