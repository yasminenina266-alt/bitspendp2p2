import 'dotenv/config';
import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, type WebSocket } from 'ws';
import {
  SEED_OFFERS,
  SEED_TRADERS,
  buildTraderDetails,
  generateTraderFeedbackPage,
  generateTraderTradesPage,
} from './server/seedData.ts';
import type {
  AppNotification,
  ChainId,
  CryptoAsset,
  FiatCurrency,
  MarketPrices,
  P2POffer,
  ProfileThemeId,
  SwapOrder,
  TradeOrder,
  TraderProfile,
  TraderTradeRecord,
  UserAccount,
  UserSettings,
  VirtualCard,
  WalletTx,
} from './src/types.ts';

const ALLOWED_PROFILE_THEMES = new Set<ProfileThemeId>([
  'emerald',
  'midnight',
  'amber',
  'violet',
  'slate',
]);

function sanitizeImageField(val: unknown): string | undefined {
  if (typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  if (!trimmed) return '';
  if (/^https?:\/\/\S+$/i.test(trimmed) && trimmed.length <= 1024) {
    return trimmed;
  }
  if (
    /^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,[a-zA-Z0-9+/=]+$/i.test(trimmed) &&
    trimmed.length <= 450_000
  ) {
    return trimmed;
  }
  return undefined;
}

function sanitizeStringArray(val: unknown, maxItems = 8, maxLen = 36): string[] | undefined {
  if (!Array.isArray(val)) return undefined;
  const cleaned = val
    .map((item) => (typeof item === 'string' ? item.trim().slice(0, maxLen) : ''))
    .filter(Boolean);
  return Array.from(new Set(cleaned)).slice(0, maxItems);
}

const ALLOWED_ASSET_CHAINS: Partial<Record<CryptoAsset, ChainId[]>> = {
  USDT: ['ETH', 'SOL', 'TRX', 'BSC', 'POLYGON'],
  USDC: ['ETH', 'SOL', 'BSC', 'POLYGON'],
};

function resolveAssetChain(asset: CryptoAsset, requested?: unknown): ChainId | undefined {
  const allowed = ALLOWED_ASSET_CHAINS[asset];
  if (!allowed) return undefined;
  if (typeof requested === 'string' && (allowed as string[]).includes(requested)) {
    return requested as ChainId;
  }
  return allowed[0];
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const DB_PATH = path.join(__dirname, 'data', 'oosab-db.json');

interface StoredUser extends UserAccount {
  passwordHash: string;
  salt: string;
}

interface DatabaseSchema {
  traders: Record<string, TraderProfile>;
  offers: P2POffer[];
  users: Record<string, StoredUser>;
  sessions: Record<string, string>; // token -> username
  trades: Record<string, TradeOrder[]>; // legacy per-user trades index
  tradeRooms: Record<string, TradeOrder>; // shared tradeId -> TradeOrder
  notifications: Record<string, AppNotification[]>; // username -> notifications
  swaps: Record<string, SwapOrder[]>; // username -> swaps
  cards: Record<string, VirtualCard[]>; // username -> cards
}

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

let priceCache: MarketPrices = {
  usdPrices: { ...DEFAULT_USD_PRICES },
  fiatRatesFromUsd: { ...DEFAULT_FIAT_RATES },
  changes24h: { ...DEFAULT_24H_CHANGES },
  source: 'Live Market Rates',
  updatedAt: 0,
};

let fiatLastUpdated = 0;

async function fetchJsonWithTimeout(url: string, timeoutMs = 4500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'OOSAB-P2P/1.0',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function refreshFiatRates(): Promise<Record<FiatCurrency, number>> {
  const now = Date.now();
  if (now - fiatLastUpdated < 60 * 60 * 1000 && fiatLastUpdated > 0) {
    return priceCache.fiatRatesFromUsd;
  }
  try {
    const data = (await fetchJsonWithTimeout('https://open.er-api.com/v6/latest/USD')) as {
      result?: string;
      rates?: Record<string, number>;
    };
    if (data?.result === 'success' && data.rates) {
      const next = { ...DEFAULT_FIAT_RATES };
      (Object.keys(next) as FiatCurrency[]).forEach((code) => {
        if (typeof data.rates?.[code] === 'number' && data.rates[code] > 0) {
          next[code] = data.rates[code];
        }
      });
      fiatLastUpdated = now;
      return next;
    }
  } catch {
    // keep cached/default fiat rates
  }
  return priceCache.fiatRatesFromUsd;
}

async function getLivePrices(force = false): Promise<MarketPrices> {
  const now = Date.now();
  const ageMs = now - priceCache.updatedAt;
  if (!force && priceCache.updatedAt > 0 && ageMs < 45_000) {
    return priceCache;
  }
  if (force && priceCache.updatedAt > 0 && ageMs < 10_000) {
    return priceCache;
  }

  const fiatRatesFromUsd = await refreshFiatRates();

  // 1. CoinGecko Free API
  try {
    const cg = (await fetchJsonWithTimeout(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,monero,ethereum,tether,litecoin,solana,usd-coin&vs_currencies=usd&include_24hr_change=true'
    )) as Record<string, { usd?: number; usd_24h_change?: number }>;

    if (cg?.bitcoin?.usd && cg?.monero?.usd) {
      priceCache = {
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
        source: 'Live Market Rates',
        updatedAt: now,
      };
      return priceCache;
    }
  } catch {
    // Fallback to CryptoCompare
  }

  // 2. CryptoCompare Free API
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
      priceCache = {
        usdPrices,
        fiatRatesFromUsd,
        changes24h,
        source: 'Live Market Rates',
        updatedAt: now,
      };
      return priceCache;
    }
  } catch {
    // Fallback to Kraken
  }

  // 3. Kraken Public Ticker
  try {
    const kraken = (await fetchJsonWithTimeout(
      'https://api.kraken.com/0/public/Ticker?pair=XXBTZUSD,XXMRZUSD,XETHZUSD,USDTZUSD,XLTCZUSD,SOLUSD'
    )) as { result?: Record<string, { c?: string[]; o?: string }> };

    if (kraken?.result) {
      const pick = (key: string, fallback: number) => {
        const val = Number(kraken.result?.[key]?.c?.[0]);
        return Number.isFinite(val) && val > 0 ? val : fallback;
      };
      const pct = (key: string, fallback: number) => {
        const last = Number(kraken.result?.[key]?.c?.[0]);
        const open = Number(kraken.result?.[key]?.o);
        return Number.isFinite(last) && Number.isFinite(open) && open > 0
          ? ((last - open) / open) * 100
          : fallback;
      };
      priceCache = {
        usdPrices: {
          BTC: pick('XXBTZUSD', DEFAULT_USD_PRICES.BTC),
          XMR: pick('XXMRZUSD', DEFAULT_USD_PRICES.XMR),
          ETH: pick('XETHZUSD', DEFAULT_USD_PRICES.ETH),
          USDT: pick('USDTZUSD', 1.0),
          LTC: pick('XLTCZUSD', DEFAULT_USD_PRICES.LTC),
          SOL: pick('SOLUSD', DEFAULT_USD_PRICES.SOL),
          USDC: 1.0,
        },
        fiatRatesFromUsd,
        changes24h: {
          BTC: pct('XXBTZUSD', 0),
          XMR: pct('XXMRZUSD', 0),
          ETH: pct('XETHZUSD', 0),
          USDT: 0,
          LTC: pct('XLTCZUSD', 0),
          SOL: pct('SOLUSD', 0),
          USDC: 0,
        },
        source: 'Live Market Rates',
        updatedAt: now,
      };
      return priceCache;
    }
  } catch {
    // Keep baseline
  }

  priceCache = {
    ...priceCache,
    fiatRatesFromUsd,
    updatedAt: now,
  };
  return priceCache;
}

const RECOVERY_WORDS = [
  'ember', 'cipher', 'pine', 'vault', 'anchor', 'quartz', 'monarch', 'velvet',
  'harbor', 'summit', 'cobalt', 'orbit', 'saffron', 'granite', 'horizon', 'cedar',
  'prism', 'beacon', 'frost', 'meadow', 'silver', 'vector', 'pulse', 'atlas',
];

function generateRecoveryPhrase(): string {
  const picked: string[] = [];
  for (let i = 0; i < 12; i++) {
    const idx = crypto.randomInt(0, RECOVERY_WORDS.length);
    picked.push(RECOVERY_WORDS[idx]);
  }
  return picked.join(' ');
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function generatePgpFingerprint(): string {
  const hex = crypto.randomBytes(20).toString('hex').toUpperCase();
  return hex.match(/.{1,4}/g)?.join(' ') ?? hex;
}

const DEFAULT_SETTINGS: UserSettings = {
  preferredCurrency: 'USD',
  defaultPaymentWindow: 30,
  autoPgpSign: true,
  hideOnlineStatus: false,
  torFriendlyMode: false,
  escrowAlerts: true,
};

const FIXED_BTC_ADDRESS = 'bc1qv7qvjjam07ev06ysu7kfuztn3dfjesdznz6wfm';
const FIXED_LTC_ADDRESS = 'LatBh7a5ZyZxFudV2AtgByuA9obpxzm7fr';
const FIXED_EVM_ADDRESS = '0xC15D70D3200ddcDdeDA9Eb059f71111B911594fE';
const FIXED_SOL_ADDRESS = '7BGAsWDFus6LBNRRNugajtsWhAAGAnEWh57s2NbJF7GL';
const FIXED_TRON_ADDRESS = 'TF5axzEMGZ5ALiq5nrjHxGGURCFyniJ66d';

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

function ensureUserFields(u: StoredUser): StoredUser {
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
  if (!Array.isArray(u.walletHistory)) {
    u.walletHistory = [];
  }
  if (!u.settings) {
    u.settings = { ...DEFAULT_SETTINGS };
  }
  if (!Array.isArray(u.languages) || u.languages.length === 0) {
    u.languages = ['English'];
  }
  if (!Array.isArray(u.preferredMethods)) {
    u.preferredMethods = [];
  }
  if (!u.accentTheme || !ALLOWED_PROFILE_THEMES.has(u.accentTheme)) {
    u.accentTheme = 'emerald';
  }
  return u;
}

function sanitizeUser(u: StoredUser): UserAccount {
  ensureUserFields(u);
  return {
    username: u.username,
    bio: u.bio,
    avatarUrl: u.avatarUrl,
    bannerUrl: u.bannerUrl,
    tagline: u.tagline,
    location: u.location,
    accentTheme: u.accentTheme,
    languages: u.languages,
    preferredMethods: u.preferredMethods,
    tradingHours: u.tradingHours,
    createdAt: u.createdAt,
    pgpKey: u.pgpKey,
    recoveryPhrase: u.recoveryPhrase,
    balances: u.balances,
    depositAddresses: u.depositAddresses,
    walletHistory: u.walletHistory,
    settings: u.settings,
  };
}

let db: DatabaseSchema = {
  traders: { ...SEED_TRADERS },
  offers: [...SEED_OFFERS],
  users: {},
  sessions: {},
  trades: {},
  tradeRooms: {},
  notifications: {},
  swaps: {},
  cards: {},
};

function findUserByUsername(username: string): StoredUser | undefined {
  const clean = username.trim();
  if (!clean) return undefined;
  if (db.users[clean]) return ensureUserFields(db.users[clean]);
  const key = Object.keys(db.users).find((k) => k.toLowerCase() === clean.toLowerCase());
  return key ? ensureUserFields(db.users[key]) : undefined;
}

function findTraderByUsername(username: string): TraderProfile | undefined {
  const clean = username.trim();
  if (!clean) return undefined;
  if (db.traders[clean]) return db.traders[clean];
  const key = Object.keys(db.traders).find((k) => k.toLowerCase() === clean.toLowerCase());
  return key ? db.traders[key] : undefined;
}

async function loadDb() {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
    const seedOfferIds = new Set(SEED_OFFERS.map((o) => o.id));
    const customOffers = (Array.isArray(parsed.offers) ? parsed.offers : []).filter(
      (o) => !seedOfferIds.has(o.id) && !o.id.startsWith('off-gen-')
    );
    const mergedOffers = [...customOffers, ...SEED_OFFERS];

    const mergedTraders: Record<string, TraderProfile> = {
      ...SEED_TRADERS,
      ...(parsed.traders ?? {}),
    };
    const users = parsed.users ?? {};
    for (const u of Object.values(users)) {
      if (!u?.username) continue;
      if (!mergedTraders[u.username]) {
        mergedTraders[u.username] = {
          username: u.username,
          joinedAt: (u.createdAt ?? new Date().toISOString()).slice(0, 10),
          tradesCount: 0,
          ratingPct: 100,
          avgReleaseMinutes: 5,
          lastSeenMinutes: 0,
          verified: false,
          languages: u.languages && u.languages.length > 0 ? u.languages : ['English'],
          pgpFingerprint: (u.pgpKey ?? '').slice(0, 49),
          bio: u.bio || 'Privacy-focused P2P trader on OOSAB. Zero KYC.',
          avatarUrl: u.avatarUrl,
          bannerUrl: u.bannerUrl,
          tagline: u.tagline,
          location: u.location,
          accentTheme: u.accentTheme,
          preferredMethods: u.preferredMethods,
          tradingHours: u.tradingHours,
          volumeTier: 'Starter',
          recentFeedback: [],
          tradeHistory: [],
        };
      } else {
        const t = mergedTraders[u.username];
        if (u.avatarUrl !== undefined && t.avatarUrl === undefined) t.avatarUrl = u.avatarUrl;
        if (u.bannerUrl !== undefined && t.bannerUrl === undefined) t.bannerUrl = u.bannerUrl;
        if (u.tagline !== undefined && t.tagline === undefined) t.tagline = u.tagline;
        if (u.location !== undefined && t.location === undefined) t.location = u.location;
        if (u.accentTheme !== undefined && t.accentTheme === undefined) t.accentTheme = u.accentTheme;
        if (u.preferredMethods !== undefined && t.preferredMethods === undefined) {
          t.preferredMethods = u.preferredMethods;
        }
        if (u.tradingHours !== undefined && t.tradingHours === undefined) {
          t.tradingHours = u.tradingHours;
        }
      }
    }

    const tradeRooms: Record<string, TradeOrder> = { ...(parsed.tradeRooms ?? {}) };
    const legacyTrades = parsed.trades ?? {};
    for (const list of Object.values(legacyTrades)) {
      if (!Array.isArray(list)) continue;
      for (const t of list) {
        if (t?.id && !tradeRooms[t.id]) {
          tradeRooms[t.id] = t;
        }
      }
    }

    db = {
      traders: mergedTraders,
      offers: mergedOffers.length > 0 ? mergedOffers : [...SEED_OFFERS],
      users,
      sessions: parsed.sessions ?? {},
      trades: legacyTrades,
      tradeRooms,
      notifications: parsed.notifications ?? {},
      swaps: parsed.swaps ?? {},
      cards: parsed.cards ?? {},
    };
  } catch {
    await saveDb();
  }
}

async function saveDb() {
  try {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  } catch {
    // Keep running in-memory if filesystem is read-only
  }
}

function getAuthUser(req: express.Request): StoredUser | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  const username = db.sessions[token];
  if (!username) return null;
  const user = db.users[username];
  return user ? ensureUserFields(user) : null;
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
  const basePrice = usdSpot * fiatRate;
  return basePrice * (1 + offer.marginPct / 100);
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
  const rand = crypto.randomBytes(16).toString('hex');
  if (asset === 'XMR') return `4${rand}89ab${rand.slice(0, 12)}`;
  return `${rand.slice(0, 36)}`;
}

function generateCardNumber(): string {
  const digits = ['4', '5', '3', '2'];
  while (digits.length < 16) {
    digits.push(String(crypto.randomInt(0, 10)));
  }
  return digits.join('');
}

async function startServer() {
  await loadDb();
  // Warm price cache in background
  getLivePrices().catch(() => undefined);

  const app = express();
  app.use(express.json({ limit: '2mb' }));

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });
  const userSockets = new Map<string, Set<WebSocket>>();

  const sendToUser = (username: string, payload: unknown) => {
    const set = userSockets.get(username);
    if (!set || set.size === 0) return;
    const raw = JSON.stringify(payload);
    for (const sock of set) {
      if (sock.readyState === 1) {
        sock.send(raw);
      }
    }
  };

  const broadcastPresence = () => {
    const onlineUsers = Array.from(userSockets.keys());
    const raw = JSON.stringify({ type: 'presence:update', onlineUsers });
    for (const set of userSockets.values()) {
      for (const sock of set) {
        if (sock.readyState === 1) sock.send(raw);
      }
    }
  };

  const isUserOnline = (username: string) => {
    const set = userSockets.get(username);
    return Boolean(set && set.size > 0);
  };

  const pushNotification = (
    username: string,
    input: Omit<AppNotification, 'id' | 'read' | 'createdAt'>
  ) => {
    const notif: AppNotification = {
      id: `ntf-${crypto.randomBytes(4).toString('hex')}`,
      ...input,
      read: false,
      createdAt: new Date().toISOString(),
    };
    if (!db.notifications[username]) db.notifications[username] = [];
    db.notifications[username].unshift(notif);
    if (db.notifications[username].length > 60) {
      db.notifications[username] = db.notifications[username].slice(0, 60);
    }
    const unreadCount = db.notifications[username].filter((n) => !n.read).length;
    sendToUser(username, { type: 'notification:new', notification: notif, unreadCount });
    return notif;
  };

  const formatTradeForViewer = (trade: TradeOrder, viewerUsername: string): TradeOrder => {
    const other =
      trade.buyerUsername === viewerUsername ? trade.sellerUsername : trade.buyerUsername;
    return {
      ...trade,
      counterpartyIsReal: Boolean(findUserByUsername(other)),
      feedbackGiven: trade.feedbackBy?.[viewerUsername] ?? trade.feedbackGiven,
    };
  };

  httpServer.on('upgrade', (req, socket, head) => {
    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (parsedUrl.pathname !== '/ws') {
      return;
    }
    const token = parsedUrl.searchParams.get('token') ?? '';
    const username = db.sessions[token];
    if (!username || !db.users[username]) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      if (!userSockets.has(username)) userSockets.set(username, new Set());
      userSockets.get(username)!.add(ws);
      if (db.traders[username]) {
        db.traders[username].lastSeenMinutes = 0;
      }

      ws.send(
        JSON.stringify({
          type: 'connected',
          username,
          onlineUsers: Array.from(userSockets.keys()),
        })
      );
      broadcastPresence();

      ws.on('message', async (raw) => {
        try {
          const msg = JSON.parse(String(raw)) as {
            type?: string;
            tradeId?: string;
            isTyping?: boolean;
          };
          if (msg.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
            return;
          }
          if (msg.type === 'typing' && msg.tradeId) {
            const trade = db.tradeRooms[msg.tradeId];
            if (!trade) return;
            if (trade.buyerUsername !== username && trade.sellerUsername !== username) return;
            const other =
              trade.buyerUsername === username ? trade.sellerUsername : trade.buyerUsername;
            sendToUser(other, {
              type: 'trade:typing',
              tradeId: trade.id,
              username,
              isTyping: Boolean(msg.isTyping),
            });
          } else if (msg.type === 'trade:read' && msg.tradeId) {
            const trade = db.tradeRooms[msg.tradeId];
            if (!trade) return;
            if (trade.buyerUsername !== username && trade.sellerUsername !== username) return;
            if (!trade.lastReadAtBy) trade.lastReadAtBy = {};
            trade.lastReadAtBy[username] = new Date().toISOString();
            await saveDb();
          }
        } catch {
          // ignore malformed ws message
        }
      });

      ws.on('close', () => {
        const set = userSockets.get(username);
        if (set) {
          set.delete(ws);
          if (set.size === 0) userSockets.delete(username);
        }
        broadcastPresence();
      });
    });
  });

  // Live Market Prices
  app.get('/api/prices', async (req, res) => {
    const force = req.query.refresh === '1';
    const prices = await getLivePrices(force);
    res.json(prices);
  });

  // Marketplace Offers & Traders
  app.get('/api/offers', (_req, res) => {
    res.json({
      offers: db.offers,
      traders: db.traders,
    });
  });

  app.get('/api/offers/:id', (req, res) => {
    const cleanId = req.params.id.trim().toLowerCase();
    const offer = db.offers.find((o) => o.id.toLowerCase() === cleanId);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    const rawTrader = findTraderByUsername(offer.traderUsername);
    const trader = rawTrader ? buildTraderDetails(rawTrader, db.offers) : undefined;
    return res.json({ offer, trader });
  });

  app.get('/api/users/directory', (_req, res) => {
    const users = Object.values(db.users).map((raw) => {
      const u = ensureUserFields(raw);
      const t = db.traders[u.username];
      return {
        username: u.username,
        createdAt: u.createdAt,
        balances: u.balances,
        tradesCount: t?.tradesCount ?? 0,
        ratingPct: t?.ratingPct ?? 100,
        verified: t?.verified ?? false,
      };
    });
    return res.json({ users });
  });

  app.get('/api/traders/:username', (req, res) => {
    const rawTrader = findTraderByUsername(req.params.username);
    if (!rawTrader) {
      return res.status(404).json({ error: 'Trader profile not found' });
    }
    const enriched = buildTraderDetails(rawTrader, db.offers);
    const activeOffers = db.offers.filter(
      (o) => o.traderUsername === enriched.username && o.active
    );
    const online = isUserOnline(enriched.username) || enriched.lastSeenMinutes === 0;
    return res.json({
      trader: { ...enriched, lastSeenMinutes: isUserOnline(enriched.username) ? 0 : enriched.lastSeenMinutes },
      offers: activeOffers,
      isOnline: online,
      isRegisteredUser: Boolean(findUserByUsername(enriched.username)),
    });
  });

  app.get('/api/traders/:username/trades', (req, res) => {
    const rawTrader = findTraderByUsername(req.params.username);
    if (!rawTrader) {
      return res.status(404).json({ error: 'Trader profile not found' });
    }
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    return res.json(generateTraderTradesPage(rawTrader, db.offers, offset, limit));
  });

  app.get('/api/traders/:username/feedback', (req, res) => {
    const rawTrader = findTraderByUsername(req.params.username);
    if (!rawTrader) {
      return res.status(404).json({ error: 'Trader profile not found' });
    }
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    return res.json(generateTraderFeedbackPage(rawTrader, db.offers, offset, limit));
  });

  // Zero-KYC Auth
  app.post('/api/auth/register', async (req, res) => {
    const { username, password, confirmPassword, pgpKey, bio, avatarUrl, tagline } = req.body as {
      username?: string;
      password?: string;
      confirmPassword?: string;
      pgpKey?: string;
      bio?: string;
      avatarUrl?: string;
      tagline?: string;
    };
    const cleanName = (username ?? '').trim();
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(cleanName)) {
      return res.status(400).json({
        error: 'Username must be 3–24 characters using letters, numbers, or underscores.',
      });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    if (typeof confirmPassword === 'string' && password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }
    const existing = Object.keys(db.users).find(
      (k) => k.toLowerCase() === cleanName.toLowerCase()
    );
    if (existing || db.traders[cleanName]) {
      return res.status(409).json({ error: 'That username is already taken.' });
    }

    const safeAvatar = sanitizeImageField(avatarUrl);
    const cleanTagline = (tagline ?? '').trim().slice(0, 90);
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const nowIso = new Date().toISOString();
    const user: StoredUser = {
      username: cleanName,
      bio: (bio ?? '').trim() || 'Privacy-focused P2P trader on OOSAB. Zero KYC.',
      avatarUrl: safeAvatar || undefined,
      tagline: cleanTagline || undefined,
      accentTheme: 'emerald',
      languages: ['English'],
      preferredMethods: [],
      createdAt: nowIso,
      pgpKey: (pgpKey ?? '').trim() || generatePgpFingerprint(),
      recoveryPhrase: generateRecoveryPhrase(),
      passwordHash,
      salt,
      balances: {
        BTC: 0,
        XMR: 0,
        ETH: 0,
        USDT: 0,
        LTC: 0,
        SOL: 0,
        USDC: 0,
      },
      depositAddresses: createAllDepositAddresses(),
      walletHistory: [],
      settings: { ...DEFAULT_SETTINGS },
    };

    db.users[cleanName] = user;
    db.traders[cleanName] = {
      username: cleanName,
      joinedAt: nowIso.slice(0, 10),
      tradesCount: 0,
      ratingPct: 100,
      avgReleaseMinutes: 5,
      lastSeenMinutes: 0,
      verified: false,
      languages: ['English'],
      pgpFingerprint: user.pgpKey.slice(0, 49),
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      tagline: user.tagline,
      accentTheme: 'emerald',
      preferredMethods: [],
      volumeTier: 'Starter',
      recentFeedback: [],
      tradeHistory: [],
    };
    db.trades[cleanName] = [];
    db.swaps[cleanName] = [];
    db.cards[cleanName] = [];

    const token = crypto.randomBytes(32).toString('hex');
    db.sessions[token] = cleanName;
    await saveDb();

    return res.status(201).json({
      token,
      user: sanitizeUser(user),
    });
  });

  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body as { username?: string; password?: string };
    const cleanName = (username ?? '').trim();
    const matchedKey = Object.keys(db.users).find(
      (k) => k.toLowerCase() === cleanName.toLowerCase()
    );
    if (!matchedKey || !password) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    const user = db.users[matchedKey];
    const attemptHash = hashPassword(password, user.salt);
    if (attemptHash !== user.passwordHash) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    db.sessions[token] = user.username;
    if (db.traders[user.username]) {
      db.traders[user.username].lastSeenMinutes = 0;
    }
    await saveDb();
    return res.json({ token, user: sanitizeUser(user) });
  });

  app.get('/api/auth/me', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    return res.json({ user: sanitizeUser(user) });
  });

  app.patch('/api/auth/profile', async (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    const {
      bio,
      pgpKey,
      avatarUrl,
      bannerUrl,
      tagline,
      location,
      accentTheme,
      languages,
      preferredMethods,
      tradingHours,
    } = req.body as {
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
    };

    if (typeof bio === 'string') {
      user.bio = bio.trim().slice(0, 320);
    }
    if (typeof pgpKey === 'string' && pgpKey.trim()) {
      user.pgpKey = pgpKey.trim().slice(0, 120);
    }
    if (avatarUrl !== undefined) {
      const safe = sanitizeImageField(avatarUrl);
      if (safe === undefined) {
        return res.status(400).json({ error: 'Invalid avatar image URL or format.' });
      }
      user.avatarUrl = safe || undefined;
    }
    if (bannerUrl !== undefined) {
      const safe = sanitizeImageField(bannerUrl);
      if (safe === undefined) {
        return res.status(400).json({ error: 'Invalid banner image URL or format.' });
      }
      user.bannerUrl = safe || undefined;
    }
    if (typeof tagline === 'string') {
      user.tagline = tagline.trim().slice(0, 90) || undefined;
    }
    if (typeof location === 'string') {
      user.location = location.trim().slice(0, 60) || undefined;
    }
    if (typeof tradingHours === 'string') {
      user.tradingHours = tradingHours.trim().slice(0, 60) || undefined;
    }
    if (accentTheme && ALLOWED_PROFILE_THEMES.has(accentTheme)) {
      user.accentTheme = accentTheme;
    }
    const cleanLangs = sanitizeStringArray(languages, 6, 24);
    if (cleanLangs && cleanLangs.length > 0) {
      user.languages = cleanLangs;
    }
    const cleanMethods = sanitizeStringArray(preferredMethods, 6, 36);
    if (cleanMethods) {
      user.preferredMethods = cleanMethods;
    }

    if (db.traders[user.username]) {
      const t = db.traders[user.username];
      t.bio = user.bio;
      t.pgpFingerprint = user.pgpKey.slice(0, 49);
      t.avatarUrl = user.avatarUrl;
      t.bannerUrl = user.bannerUrl;
      t.tagline = user.tagline;
      t.location = user.location;
      t.accentTheme = user.accentTheme;
      t.tradingHours = user.tradingHours;
      if (user.languages && user.languages.length > 0) t.languages = user.languages;
      t.preferredMethods = user.preferredMethods ?? [];
    }

    const sanitized = sanitizeUser(user);
    sendToUser(user.username, { type: 'user:updated', user: sanitized });
    await saveDb();
    return res.json({
      user: sanitized,
      trader: db.traders[user.username]
        ? buildTraderDetails(db.traders[user.username], db.offers)
        : undefined,
    });
  });

  app.patch('/api/auth/settings', async (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    const {
      preferredCurrency,
      defaultPaymentWindow,
      autoPgpSign,
      hideOnlineStatus,
      torFriendlyMode,
      escrowAlerts,
      newPassword,
      confirmNewPassword,
    } = req.body as Partial<UserSettings> & {
      newPassword?: string;
      confirmNewPassword?: string;
    };

    if (preferredCurrency) user.settings.preferredCurrency = preferredCurrency;
    if (typeof defaultPaymentWindow === 'number') {
      user.settings.defaultPaymentWindow = defaultPaymentWindow;
    }
    if (typeof autoPgpSign === 'boolean') user.settings.autoPgpSign = autoPgpSign;
    if (typeof hideOnlineStatus === 'boolean') {
      user.settings.hideOnlineStatus = hideOnlineStatus;
      if (db.traders[user.username]) {
        db.traders[user.username].lastSeenMinutes = hideOnlineStatus ? 15 : 0;
      }
    }
    if (typeof torFriendlyMode === 'boolean') user.settings.torFriendlyMode = torFriendlyMode;
    if (typeof escrowAlerts === 'boolean') user.settings.escrowAlerts = escrowAlerts;

    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters.' });
      }
      if (newPassword !== confirmNewPassword) {
        return res.status(400).json({ error: 'New passwords do not match.' });
      }
      const salt = crypto.randomBytes(16).toString('hex');
      user.salt = salt;
      user.passwordHash = hashPassword(newPassword, salt);
    }

    await saveDb();
    return res.json({ user: sanitizeUser(user) });
  });

  app.post('/api/auth/logout', async (req, res) => {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      delete db.sessions[header.slice(7).trim()];
      await saveDb();
    }
    return res.json({ ok: true });
  });

  // Create & Manage P2P Offers
  app.post('/api/offers', async (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Sign in or register to publish an offer.' });

    const body = req.body as Partial<P2POffer>;
    if (!body.crypto || !body.side) {
      return res.status(400).json({ error: 'Missing required offer fields.' });
    }

    const prices = await getLivePrices();
    // Buy Crypto (paying fiat like Zelle/Bank to buy crypto) requires $0 crypto wallet balance.
    // Sell Crypto and Swap Crypto ads require at least $5.00 USD in crypto.
    const requiresCryptoFunding = body.side === 'sell_crypto' || body.side === 'swap_crypto';
    if (requiresCryptoFunding) {
      const totalUsdBalance = (Object.keys(user.balances) as CryptoAsset[]).reduce((sum, sym) => {
        const bal = user.balances[sym] ?? 0;
        const usd = prices.usdPrices[sym] ?? DEFAULT_USD_PRICES[sym] ?? 0;
        return sum + bal * usd;
      }, 0);
      const MIN_AD_USD = 5;
      if (totalUsdBalance < MIN_AD_USD - 0.01) {
        const shortfallUsd = Math.max(0, MIN_AD_USD - totalUsdBalance);
        const assetUsd = prices.usdPrices[body.crypto] ?? DEFAULT_USD_PRICES[body.crypto] ?? 1;
        const requiredCrypto = Number((shortfallUsd / assetUsd).toFixed(8));
        return res.status(400).json({
          error: `You need at least $${MIN_AD_USD.toFixed(2)} worth of any cryptocurrency in your account to post a Sell or Swap ad (current balance: $${totalUsdBalance.toFixed(2)}).`,
          code: 'INSUFFICIENT_FUNDS',
          asset: body.crypto,
          requiredCrypto,
          requiredUsd: MIN_AD_USD,
          currentUsdBalance: Number(totalUsdBalance.toFixed(2)),
          availableBalance: user.balances[body.crypto] ?? 0,
        });
      }
    }

    const isSwap = body.side === 'swap_crypto';
    if (isSwap) {
      if (!body.swapToCrypto || body.swapToCrypto === body.crypto) {
        return res.status(400).json({ error: 'Select a different cryptocurrency to receive in the swap.' });
      }
      const minSwap = Number(body.minSwapAmount);
      const maxSwap = Number(body.maxSwapAmount);
      if (!Number.isFinite(minSwap) || !Number.isFinite(maxSwap) || minSwap <= 0 || maxSwap < minSwap) {
        return res.status(400).json({ error: 'Maximum swap limit must be greater than or equal to minimum.' });
      }
      const wantUsd = prices.usdPrices[body.swapToCrypto] ?? DEFAULT_USD_PRICES[body.swapToCrypto];

      const newOffer: P2POffer = {
        id: `off-${crypto.randomBytes(3).toString('hex')}`,
        side: 'swap_crypto',
        traderUsername: user.username,
        crypto: body.crypto,
        cryptoChain: resolveAssetChain(body.crypto, body.cryptoChain),
        swapToCrypto: body.swapToCrypto,
        swapToChain: resolveAssetChain(body.swapToCrypto, body.swapToChain),
        fiat: 'USD',
        country: body.country || 'Global',
        paymentMethod: body.paymentMethod || 'OOSAB P2P Escrow Swap',
        paymentCategory: 'Crypto Swap',
        pricingMode: body.pricingMode === 'fixed' ? 'fixed' : 'margin',
        marginPct: Number.isFinite(Number(body.marginPct)) ? Number(body.marginPct) : 0,
        fixedPrice: body.pricingMode === 'fixed' ? Number(body.fixedPrice) : undefined,
        minFiat: Math.max(1, Math.round(minSwap * wantUsd)),
        maxFiat: Math.max(1, Math.round(maxSwap * wantUsd)),
        minSwapAmount: minSwap,
        maxSwapAmount: maxSwap,
        availableCrypto:
          body.availableCrypto && Number(body.availableCrypto) > 0
            ? Number(body.availableCrypto)
            : undefined,
        paymentWindowMinutes: Number(body.paymentWindowMinutes) || 30,
        tags: Array.isArray(body.tags) && body.tags.length > 0 ? body.tags : ['No ID Required', 'Instant Release'],
        terms:
          (body.terms ?? '').trim() ||
          `Direct user-to-user ${body.swapToCrypto} to ${body.crypto} escrow swap. Zero ID verification required.`,
        active: true,
        createdAt: new Date().toISOString(),
      };
      db.offers.unshift(newOffer);
      await saveDb();
      return res.status(201).json({ offer: newOffer });
    }

    if (!body.fiat || !body.paymentMethod) {
      return res.status(400).json({ error: 'Missing required offer fields.' });
    }
    const minFiat = Number(body.minFiat);
    const maxFiat = Number(body.maxFiat);
    if (!Number.isFinite(minFiat) || !Number.isFinite(maxFiat) || minFiat <= 0 || maxFiat < minFiat) {
      return res.status(400).json({ error: 'Maximum trade limit must be greater than or equal to minimum.' });
    }

    const newOffer: P2POffer = {
      id: `off-${crypto.randomBytes(3).toString('hex')}`,
      side: body.side,
      traderUsername: user.username,
      crypto: body.crypto,
      cryptoChain: resolveAssetChain(body.crypto, body.cryptoChain),
      fiat: body.fiat,
      country: body.country || 'Global',
      paymentMethod: body.paymentMethod,
      paymentCategory: body.paymentCategory || 'Online Wallets',
      pricingMode: body.pricingMode === 'fixed' ? 'fixed' : 'margin',
      marginPct: Number.isFinite(Number(body.marginPct)) ? Number(body.marginPct) : 0,
      fixedPrice: body.pricingMode === 'fixed' ? Number(body.fixedPrice) : undefined,
      minFiat,
      maxFiat,
      availableCrypto:
        body.availableCrypto && Number(body.availableCrypto) > 0
          ? Number(body.availableCrypto)
          : undefined,
      paymentWindowMinutes: Number(body.paymentWindowMinutes) || 30,
      tags: Array.isArray(body.tags) && body.tags.length > 0 ? body.tags : ['No ID Required'],
      terms: (body.terms ?? '').trim() || 'Fast settlement. Zero ID verification required.',
      active: true,
      createdAt: new Date().toISOString(),
    };

    db.offers.unshift(newOffer);
    await saveDb();
    return res.status(201).json({ offer: newOffer });
  });

  app.patch('/api/offers/:id', async (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    const offer = db.offers.find((o) => o.id === req.params.id);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    if (offer.traderUsername !== user.username) {
      return res.status(403).json({ error: 'You can only modify your own offers' });
    }
    if (typeof req.body.active === 'boolean') offer.active = req.body.active;
    if (typeof req.body.marginPct === 'number') offer.marginPct = req.body.marginPct;
    await saveDb();
    return res.json({ offer });
  });

  app.delete('/api/offers/:id', async (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    const idx = db.offers.findIndex((o) => o.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Offer not found' });
    if (db.offers[idx].traderUsername !== user.username) {
      return res.status(403).json({ error: 'You can only delete your own offers' });
    }
    db.offers.splice(idx, 1);
    await saveDb();
    return res.json({ ok: true });
  });

  // P2P Escrow Trades (Shared Two-Party Rooms + Live WebSocket Events)
  app.get('/api/trades', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    const list = Object.values(db.tradeRooms)
      .filter((t) => t.buyerUsername === user.username || t.sellerUsername === user.username)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((t) => formatTradeForViewer(t, user.username));
    return res.json({ trades: list });
  });

  app.post('/api/trades', async (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Sign in or register to open an escrow trade.' });

    const { offerId, fiatAmount, swapAmount } = req.body as {
      offerId?: string;
      fiatAmount?: number;
      swapAmount?: number;
    };
    const offer = db.offers.find((o) => o.id === offerId);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    if (offer.traderUsername.toLowerCase() === user.username.toLowerCase()) {
      return res.status(400).json({ error: 'You cannot place a trade on your own offer.' });
    }

    const prices = await getLivePrices();
    const unitPrice = computeOfferUnitPrice(offer, prices);
    const now = Date.now();
    const tradeId = `TRD-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const makerUser = findUserByUsername(offer.traderUsername);
    const counterpartyIsReal = Boolean(makerUser);

    if (offer.side === 'swap_crypto' && offer.swapToCrypto) {
      const sendAmt = Number(swapAmount ?? fiatAmount);
      const minSwap = offer.minSwapAmount ?? offer.minFiat / (prices.usdPrices[offer.swapToCrypto] ?? 1);
      const maxSwap = offer.maxSwapAmount ?? offer.maxFiat / (prices.usdPrices[offer.swapToCrypto] ?? 1);
      if (!Number.isFinite(sendAmt) || sendAmt < minSwap * 0.999 || sendAmt > maxSwap * 1.001) {
        return res.status(400).json({
          error: `Swap amount must be between ${minSwap} and ${maxSwap} ${offer.swapToCrypto}.`,
        });
      }
      if ((user.balances[offer.swapToCrypto] ?? 0) < sendAmt) {
        return res.status(400).json({
          error: `Insufficient ${offer.swapToCrypto} balance in your OOSAB wallet. Deposit ${offer.swapToCrypto} in Profile & Wallet first.`,
        });
      }
      user.balances[offer.swapToCrypto] = Number(
        (user.balances[offer.swapToCrypto] - sendAmt).toFixed(8)
      );
      const receiveAmt = sendAmt / unitPrice;
      const usdVal = Number((sendAmt * (prices.usdPrices[offer.swapToCrypto] ?? 1)).toFixed(2));
      const paymentDetails = `Multi-Asset Escrow Lock · ${sendAmt.toFixed(6)} ${offer.swapToCrypto} ↔ ${receiveAmt.toFixed(6)} ${offer.crypto} · Ref: ${tradeId}`;

      const messages: TradeOrder['messages'] = [
        {
          id: `msg-${crypto.randomBytes(4).toString('hex')}`,
          sender: 'Escrow System',
          text: `Both sides funded in OOSAB multi-asset escrow: ${sendAmt.toFixed(6)} ${offer.swapToCrypto} swapped for ${receiveAmt.toFixed(6)} ${offer.crypto} at 1 ${offer.crypto} = ${unitPrice.toFixed(6)} ${offer.swapToCrypto}.`,
          timestamp: new Date(now).toISOString(),
          isSystem: true,
        },
      ];
      if (!counterpartyIsReal) {
        messages.push({
          id: `msg-${crypto.randomBytes(4).toString('hex')}`,
          sender: offer.traderUsername,
          text: `Hello ${user.username}, my ${receiveAmt.toFixed(6)} ${offer.crypto} is locked in escrow for swap ${tradeId}. Press "Confirm Swap Deposit" to trigger automatic atomic release.`,
          timestamp: new Date(now + 1000).toISOString(),
        });
      }

      const trade: TradeOrder = {
        id: tradeId,
        offerId: offer.id,
        side: 'swap_crypto',
        traderUsername: offer.traderUsername,
        buyerUsername: user.username,
        sellerUsername: offer.traderUsername,
        crypto: offer.crypto,
        cryptoChain: offer.cryptoChain,
        swapToCrypto: offer.swapToCrypto,
        swapToChain: offer.swapToChain,
        swapToAmount: sendAmt,
        fiat: 'USD',
        fiatAmount: usdVal,
        cryptoAmount: receiveAmt,
        unitPrice,
        paymentMethod: offer.paymentMethod,
        paymentDetails,
        terms: offer.terms,
        status: 'escrow_funded',
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + offer.paymentWindowMinutes * 60_000).toISOString(),
        messages,
        counterpartyIsReal,
        lastReadAtBy: { [user.username]: new Date(now).toISOString() },
      };

      db.tradeRooms[trade.id] = trade;
      if (makerUser) {
        pushNotification(makerUser.username, {
          type: 'trade_opened',
          title: `New swap trade ${trade.id}`,
          body: `${user.username} opened a ${sendAmt.toFixed(4)} ${offer.swapToCrypto} → ${receiveAmt.toFixed(4)} ${offer.crypto} trade.`,
          tradeId: trade.id,
          offerId: offer.id,
          fromUsername: user.username,
        });
        sendToUser(makerUser.username, {
          type: 'trade:created',
          trade: formatTradeForViewer(trade, makerUser.username),
        });
      }
      await saveDb();
      return res.status(201).json({
        trade: formatTradeForViewer(trade, user.username),
        user: sanitizeUser(user),
      });
    }

    const amount = Number(fiatAmount);
    if (!Number.isFinite(amount) || amount < offer.minFiat || amount > offer.maxFiat) {
      return res.status(400).json({
        error: `Trade amount must be between ${offer.minFiat} and ${offer.maxFiat} ${offer.fiat}.`,
      });
    }

    const cryptoAmount = amount / unitPrice;

    // If taker is selling crypto to maker (offer.side === 'buy_crypto'), verify taker has enough balance
    if (offer.side === 'buy_crypto') {
      if ((user.balances[offer.crypto] ?? 0) < cryptoAmount) {
        return res.status(400).json({
          error: `Insufficient ${offer.crypto} balance in your OOSAB wallet. Deposit ${offer.crypto} in Profile & Wallet first.`,
        });
      }
      user.balances[offer.crypto] = Number((user.balances[offer.crypto] - cryptoAmount).toFixed(8));
    }

    const paymentDetails =
      offer.paymentCategory === 'Gift Cards'
        ? `Submit unused ${offer.fiat} ${offer.paymentMethod} claim code in the trade chat below.`
        : offer.paymentCategory === 'Bank & Wire'
          ? `Account Holder: ${offer.traderUsername} Desk · Reference: ${tradeId}`
          : offer.paymentCategory === 'Cash & In-Person'
            ? `PGP-encrypted meetup/drop coordinates available in trade chat · Ref: ${tradeId}`
            : `Recipient Handle: @${offer.traderUsername.toLowerCase()}_pay · Note: ${tradeId}`;

    const messages: TradeOrder['messages'] = [
      {
        id: `msg-${crypto.randomBytes(4).toString('hex')}`,
        sender: 'Escrow System',
        text: `${cryptoAmount.toFixed(6)} ${offer.crypto} is now locked in OOSAB multi-sig escrow at ${unitPrice.toFixed(2)} ${offer.fiat}/${offer.crypto}.`,
        timestamp: new Date(now).toISOString(),
        isSystem: true,
      },
    ];
    if (!counterpartyIsReal) {
      messages.push({
        id: `msg-${crypto.randomBytes(4).toString('hex')}`,
        sender: offer.traderUsername,
        text:
          offer.side === 'sell_crypto'
            ? `Hello ${user.username}, escrow is funded for trade ${tradeId}. Please send ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${offer.fiat} via ${offer.paymentMethod}. Payment instruction: ${paymentDetails}`
            : `Hello ${user.username}, escrow is funded. Share your ${offer.paymentMethod} receiving details here so I can transfer ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${offer.fiat}.`,
        timestamp: new Date(now + 1000).toISOString(),
      });
    }

    const trade: TradeOrder = {
      id: tradeId,
      offerId: offer.id,
      side: offer.side,
      traderUsername: offer.traderUsername,
      buyerUsername: offer.side === 'sell_crypto' ? user.username : offer.traderUsername,
      sellerUsername: offer.side === 'sell_crypto' ? offer.traderUsername : user.username,
      crypto: offer.crypto,
      cryptoChain: offer.cryptoChain,
      fiat: offer.fiat,
      fiatAmount: amount,
      cryptoAmount,
      unitPrice,
      paymentMethod: offer.paymentMethod,
      paymentDetails,
      terms: offer.terms,
      status: 'escrow_funded',
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + offer.paymentWindowMinutes * 60_000).toISOString(),
      messages,
      counterpartyIsReal,
      lastReadAtBy: { [user.username]: new Date(now).toISOString() },
    };

    db.tradeRooms[trade.id] = trade;
    if (makerUser) {
      pushNotification(makerUser.username, {
        type: 'trade_opened',
        title: `New trade ${trade.id} opened`,
        body: `${user.username} opened a ${amount.toLocaleString('en-US')} ${offer.fiat} (${cryptoAmount.toFixed(5)} ${offer.crypto}) trade via ${offer.paymentMethod}.`,
        tradeId: trade.id,
        offerId: offer.id,
        fromUsername: user.username,
      });
      sendToUser(makerUser.username, {
        type: 'trade:created',
        trade: formatTradeForViewer(trade, makerUser.username),
      });
    }
    await saveDb();

    return res.status(201).json({
      trade: formatTradeForViewer(trade, user.username),
      user: sanitizeUser(user),
    });
  });

  app.post('/api/trades/:id/read', async (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    const trade = db.tradeRooms[req.params.id];
    if (!trade || (trade.buyerUsername !== user.username && trade.sellerUsername !== user.username)) {
      return res.status(404).json({ error: 'Trade not found' });
    }
    if (!trade.lastReadAtBy) trade.lastReadAtBy = {};
    trade.lastReadAtBy[user.username] = new Date().toISOString();
    await saveDb();
    return res.json({ trade: formatTradeForViewer(trade, user.username) });
  });

  app.post('/api/trades/:id/messages', async (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    const trade = db.tradeRooms[req.params.id];
    if (!trade || (trade.buyerUsername !== user.username && trade.sellerUsername !== user.username)) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    const text = String(req.body.text ?? '').trim();
    if (!text) return res.status(400).json({ error: 'Message cannot be empty' });

    const nowIso = new Date().toISOString();
    const message = {
      id: `msg-${crypto.randomBytes(4).toString('hex')}`,
      sender: user.username,
      text,
      timestamp: nowIso,
    };
    trade.messages.push(message);
    if (!trade.lastReadAtBy) trade.lastReadAtBy = {};
    trade.lastReadAtBy[user.username] = nowIso;

    const otherUsername =
      trade.buyerUsername === user.username ? trade.sellerUsername : trade.buyerUsername;
    const otherUser = findUserByUsername(otherUsername);

    if (otherUser) {
      pushNotification(otherUser.username, {
        type: 'trade_message',
        title: `Message from ${user.username}`,
        body: text.length > 90 ? `${text.slice(0, 87)}...` : text,
        tradeId: trade.id,
        fromUsername: user.username,
      });
      sendToUser(otherUser.username, {
        type: 'trade:message',
        tradeId: trade.id,
        message,
        trade: formatTradeForViewer(trade, otherUser.username),
      });
      sendToUser(user.username, {
        type: 'trade:updated',
        trade: formatTradeForViewer(trade, user.username),
      });
    } else if (trade.status === 'escrow_funded' || trade.status === 'payment_sent') {
      const lower = text.toLowerCase();
      let reply = `Received. Keeping an eye on ${trade.paymentMethod} for trade ${trade.id}.`;
      if (
        lower.includes('detail') ||
        lower.includes('account') ||
        lower.includes('where') ||
        lower.includes('iban') ||
        lower.includes('handle')
      ) {
        reply = `${trade.paymentDetails}. Never include crypto keywords in the transfer note.`;
      } else if (lower.includes('sent') || lower.includes('paid') || lower.includes('code')) {
        reply = `Thanks! Verifying your ${trade.paymentMethod} transfer now — if you haven't already, press "Mark Payment as Paid" so escrow can finalize.`;
      }
      trade.messages.push({
        id: `msg-${crypto.randomBytes(4).toString('hex')}`,
        sender: trade.traderUsername,
        text: reply,
        timestamp: new Date(Date.now() + 700).toISOString(),
      });
    }

    await saveDb();
    return res.json({ trade: formatTradeForViewer(trade, user.username) });
  });

  app.post('/api/trades/:id/action', async (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    const trade = db.tradeRooms[req.params.id];
    if (!trade || (trade.buyerUsername !== user.username && trade.sellerUsername !== user.username)) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    const { action, positive, comment } = req.body as {
      action?: 'mark_paid' | 'release' | 'cancel' | 'dispute' | 'feedback';
      positive?: boolean;
      comment?: string;
    };

    const otherUsername =
      trade.buyerUsername === user.username ? trade.sellerUsername : trade.buyerUsername;
    const otherUser = findUserByUsername(otherUsername);
    const bothRealUsers = Boolean(
      findUserByUsername(trade.buyerUsername) && findUserByUsername(trade.sellerUsername)
    );

    if (action === 'mark_paid' && trade.status === 'escrow_funded') {
      trade.status = 'payment_sent';
      const isSwap = trade.side === 'swap_crypto' && trade.swapToCrypto;
      trade.messages.push({
        id: `msg-${crypto.randomBytes(4).toString('hex')}`,
        sender: 'Escrow System',
        text: isSwap
          ? `${user.username} confirmed ${trade.swapToAmount?.toFixed(6)} ${trade.swapToCrypto} swap escrow deposit. Finalizing atomic settlement.`
          : `${user.username} marked fiat payment as sent via ${trade.paymentMethod}. Waiting for seller confirmation.`,
        timestamp: new Date().toISOString(),
        isSystem: true,
      });
      if (!otherUser) {
        trade.messages.push({
          id: `msg-${crypto.randomBytes(4).toString('hex')}`,
          sender: trade.traderUsername,
          text: isSwap
            ? `Escrow deposit verified! Releasing ${trade.cryptoAmount.toFixed(6)} ${trade.crypto} to your wallet now.`
            : `Payment notice received! Checking ${trade.paymentMethod} settlement now — releasing ${trade.crypto} shortly.`,
          timestamp: new Date(Date.now() + 600).toISOString(),
        });
      } else {
        pushNotification(otherUser.username, {
          type: 'trade_status',
          title: `Payment sent on ${trade.id}`,
          body: `${user.username} marked ${trade.paymentMethod} payment as sent. Verify receipt and release ${trade.crypto}.`,
          tradeId: trade.id,
          fromUsername: user.username,
        });
      }
    } else if (action === 'release' && (trade.status === 'escrow_funded' || trade.status === 'payment_sent')) {
      if (bothRealUsers && user.username !== trade.sellerUsername) {
        return res.status(403).json({
          error: `Only the seller (${trade.sellerUsername}) can confirm receipt and release escrow.`,
        });
      }
      trade.status = 'completed';

      const buyerUser = findUserByUsername(trade.buyerUsername);
      const sellerUser = findUserByUsername(trade.sellerUsername);

      if (buyerUser) {
        buyerUser.balances[trade.crypto] = Number(
          ((buyerUser.balances[trade.crypto] ?? 0) + trade.cryptoAmount).toFixed(8)
        );
      }
      if (trade.side === 'swap_crypto' && trade.swapToCrypto && trade.swapToAmount && sellerUser) {
        sellerUser.balances[trade.swapToCrypto] = Number(
          ((sellerUser.balances[trade.swapToCrypto] ?? 0) + trade.swapToAmount).toFixed(8)
        );
      }

      const nowDate = 'Just now';
      const buyerTrader = findTraderByUsername(trade.buyerUsername);
      if (buyerTrader) {
        buyerTrader.tradesCount += 1;
        if (!buyerTrader.tradeHistory) buyerTrader.tradeHistory = [];
        buyerTrader.tradeHistory.unshift({
          id: trade.id,
          asset: trade.crypto,
          cryptoAmount: Number(trade.cryptoAmount.toFixed(6)),
          fiatAmount: Number(trade.fiatAmount.toFixed(2)),
          fiat: trade.fiat,
          paymentMethod: trade.paymentMethod,
          side: 'Bought',
          counterparty: trade.sellerUsername,
          completedAt: nowDate,
        });
      }
      const sellerTrader = findTraderByUsername(trade.sellerUsername);
      if (sellerTrader) {
        sellerTrader.tradesCount += 1;
        if (!sellerTrader.tradeHistory) sellerTrader.tradeHistory = [];
        sellerTrader.tradeHistory.unshift({
          id: trade.id,
          asset: trade.crypto,
          cryptoAmount: Number(trade.cryptoAmount.toFixed(6)),
          fiatAmount: Number(trade.fiatAmount.toFixed(2)),
          fiat: trade.fiat,
          paymentMethod: trade.paymentMethod,
          side: 'Sold',
          counterparty: trade.buyerUsername,
          completedAt: nowDate,
        });
      }

      trade.messages.push({
        id: `msg-${crypto.randomBytes(4).toString('hex')}`,
        sender: 'Escrow System',
        text: `Escrow released! ${trade.cryptoAmount.toFixed(6)} ${trade.crypto} settled to ${trade.buyerUsername}.`,
        timestamp: new Date().toISOString(),
        isSystem: true,
      });

      if (otherUser) {
        pushNotification(otherUser.username, {
          type: 'trade_status',
          title: `Escrow released (${trade.id})`,
          body: `${trade.cryptoAmount.toFixed(6)} ${trade.crypto} settled to ${trade.buyerUsername}.`,
          tradeId: trade.id,
          fromUsername: user.username,
        });
        sendToUser(otherUser.username, {
          type: 'user:updated',
          user: sanitizeUser(otherUser),
        });
      }
    } else if (action === 'cancel' && trade.status === 'escrow_funded') {
      trade.status = 'cancelled';
      if (trade.side === 'buy_crypto') {
        const sellerUser = findUserByUsername(trade.sellerUsername);
        if (sellerUser) {
          sellerUser.balances[trade.crypto] = Number(
            ((sellerUser.balances[trade.crypto] ?? 0) + trade.cryptoAmount).toFixed(8)
          );
        }
      } else if (trade.side === 'swap_crypto' && trade.swapToCrypto && trade.swapToAmount) {
        const buyerUser = findUserByUsername(trade.buyerUsername);
        if (buyerUser) {
          buyerUser.balances[trade.swapToCrypto] = Number(
            ((buyerUser.balances[trade.swapToCrypto] ?? 0) + trade.swapToAmount).toFixed(8)
          );
        }
      }
      trade.messages.push({
        id: `msg-${crypto.randomBytes(4).toString('hex')}`,
        sender: 'Escrow System',
        text: `Trade ${trade.id} cancelled by ${user.username} and escrow unlocked.`,
        timestamp: new Date().toISOString(),
        isSystem: true,
      });
      if (otherUser) {
        pushNotification(otherUser.username, {
          type: 'trade_status',
          title: `Trade ${trade.id} cancelled`,
          body: `${user.username} cancelled the trade and unlocked escrow.`,
          tradeId: trade.id,
          fromUsername: user.username,
        });
        sendToUser(otherUser.username, {
          type: 'user:updated',
          user: sanitizeUser(otherUser),
        });
      }
    } else if (action === 'dispute' && (trade.status === 'escrow_funded' || trade.status === 'payment_sent')) {
      trade.status = 'disputed';
      trade.messages.push({
        id: `msg-${crypto.randomBytes(4).toString('hex')}`,
        sender: 'Escrow System',
        text: `Dispute opened by ${user.username}. An independent OOSAB arbitrator has frozen the ${trade.crypto} in escrow and joined the chat.`,
        timestamp: new Date().toISOString(),
        isSystem: true,
      });
      if (otherUser) {
        pushNotification(otherUser.username, {
          type: 'trade_status',
          title: `Dispute opened (${trade.id})`,
          body: `${user.username} opened an escrow dispute on ${trade.id}.`,
          tradeId: trade.id,
          fromUsername: user.username,
        });
      }
    } else if (action === 'feedback' && trade.status === 'completed') {
      const isPos = positive !== false;
      const note = (comment ?? '').trim() || 'Smooth zero-KYC trade!';
      if (!trade.feedbackBy) trade.feedbackBy = {};
      trade.feedbackBy[user.username] = { positive: isPos, comment: note };
      trade.feedbackGiven = { positive: isPos, comment: note };

      const targetUsername =
        user.username === trade.buyerUsername ? trade.sellerUsername : trade.buyerUsername;
      const targetTrader = findTraderByUsername(targetUsername);
      if (targetTrader) {
        targetTrader.recentFeedback.unshift({
          id: `fb-${crypto.randomBytes(3).toString('hex')}`,
          author: user.username,
          positive: isPos,
          comment: note,
          asset: trade.crypto,
          date: 'Just now',
        });
        targetTrader.totalFeedbackCount = Math.max(
          targetTrader.totalFeedbackCount ?? 0,
          targetTrader.recentFeedback.length
        );
        const posCount = targetTrader.recentFeedback.filter((f) => f.positive).length;
        if (targetTrader.recentFeedback.length > 0 && targetTrader.tradesCount <= targetTrader.recentFeedback.length) {
          targetTrader.ratingPct = Math.round((posCount / targetTrader.recentFeedback.length) * 100);
        }
      }
      if (otherUser) {
        pushNotification(otherUser.username, {
          type: 'feedback_received',
          title: `New ${isPos ? 'positive' : 'negative'} feedback from ${user.username}`,
          body: note,
          tradeId: trade.id,
          fromUsername: user.username,
        });
      }
    } else {
      return res.status(400).json({ error: 'Invalid trade state transition.' });
    }

    if (otherUser) {
      sendToUser(otherUser.username, {
        type: 'trade:updated',
        trade: formatTradeForViewer(trade, otherUser.username),
      });
    }
    await saveDb();
    return res.json({
      trade: formatTradeForViewer(trade, user.username),
      user: sanitizeUser(user),
    });
  });

  // Notifications
  app.get('/api/notifications', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    const list = db.notifications[user.username] ?? [];
    return res.json({ notifications: list });
  });

  app.post('/api/notifications/read', async (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    const { id } = (req.body ?? {}) as { id?: string };
    const list = db.notifications[user.username] ?? [];
    for (const item of list) {
      if (!id || item.id === id) {
        item.read = true;
      }
    }
    await saveDb();
    return res.json({ notifications: list });
  });

  // Instant Swaps
  app.get('/api/swaps', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    return res.json({ swaps: db.swaps[user.username] ?? [] });
  });

  app.post('/api/swaps', async (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Sign in or register to execute a swap.' });

    const { fromCrypto, toCrypto, fromAmount, mode, destinationAddress } = req.body as {
      fromCrypto?: CryptoAsset;
      toCrypto?: CryptoAsset;
      fromAmount?: number;
      mode?: 'floating' | 'fixed';
      destinationAddress?: string;
    };
    if (!fromCrypto || !toCrypto || fromCrypto === toCrypto) {
      return res.status(400).json({ error: 'Select two different assets to swap.' });
    }
    const amt = Number(fromAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ error: 'Enter a valid swap amount.' });
    }
    if ((user.balances[fromCrypto] ?? 0) < amt) {
      return res.status(400).json({
        error: `Insufficient ${fromCrypto} wallet balance. Deposit ${fromCrypto} in your wallet first.`,
      });
    }

    const prices = await getLivePrices();
    const fromUsd = prices.usdPrices[fromCrypto];
    const toUsd = prices.usdPrices[toCrypto];
    const feePct = mode === 'fixed' ? 0.009 : 0.004;
    const rawRate = fromUsd / toUsd;
    const effectiveRate = rawRate * (1 - feePct);
    const toAmount = amt * effectiveRate;

    user.balances[fromCrypto] = Number((user.balances[fromCrypto] - amt).toFixed(8));
    user.balances[toCrypto] = Number(((user.balances[toCrypto] ?? 0) + toAmount).toFixed(8));

    const swap: SwapOrder = {
      id: `SWP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      fromCrypto,
      toCrypto,
      fromAmount: amt,
      toAmount,
      rate: effectiveRate,
      mode: mode === 'fixed' ? 'fixed' : 'floating',
      destinationAddress: (destinationAddress ?? '').trim() || generateDepositAddress(toCrypto),
      depositAddress: generateDepositAddress(fromCrypto),
      status: 'completed',
      createdAt: new Date().toISOString(),
    };

    if (!db.swaps[user.username]) db.swaps[user.username] = [];
    db.swaps[user.username].unshift(swap);
    await saveDb();

    return res.status(201).json({ swap, user: sanitizeUser(user) });
  });

  // No-KYC Virtual Crypto Cards
  app.get('/api/cards', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    return res.json({ cards: db.cards[user.username] ?? [] });
  });

  app.post('/api/cards', async (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Sign in or register to issue a private crypto card.' });

    const { label, type, fundingCrypto, amountUsd } = req.body as {
      label?: string;
      type?: 'disposable' | 'reloadable';
      fundingCrypto?: CryptoAsset;
      amountUsd?: number;
    };
    const usd = Number(amountUsd);
    if (!fundingCrypto || !Number.isFinite(usd) || usd < 10 || usd > 10000) {
      return res.status(400).json({ error: 'Card amount must be between $10 and $10,000.' });
    }

    const prices = await getLivePrices();
    const cryptoPrice = prices.usdPrices[fundingCrypto];
    const cryptoCost = (usd * 1.015) / cryptoPrice; // 1.5% card issuance fee
    if ((user.balances[fundingCrypto] ?? 0) < cryptoCost) {
      return res.status(400).json({
        error: `Insufficient ${fundingCrypto} balance (need ${cryptoCost.toFixed(6)} ${fundingCrypto}).`,
      });
    }

    user.balances[fundingCrypto] = Number((user.balances[fundingCrypto] - cryptoCost).toFixed(8));
    const fullNumber = generateCardNumber();
    const card: VirtualCard = {
      id: `CRD-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      label: (label ?? '').trim() || `${fundingCrypto} Privacy Card`,
      type: type === 'disposable' ? 'disposable' : 'reloadable',
      fundingCrypto,
      balanceUsd: usd,
      last4: fullNumber.slice(-4),
      fullNumber,
      expiry: '08/29',
      cvv: String(crypto.randomInt(100, 999)),
      frozen: false,
      createdAt: new Date().toISOString(),
      transactions: [
        {
          id: `tx-${crypto.randomBytes(3).toString('hex')}`,
          merchant: `Funded with ${cryptoCost.toFixed(5)} ${fundingCrypto}`,
          amountUsd: usd,
          timestamp: new Date().toISOString(),
          status: 'Top-up',
        },
      ],
    };

    if (!db.cards[user.username]) db.cards[user.username] = [];
    db.cards[user.username].unshift(card);
    await saveDb();

    return res.status(201).json({ card, user: sanitizeUser(user) });
  });

  app.post('/api/cards/:id/action', async (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    const card = (db.cards[user.username] ?? []).find((c) => c.id === req.params.id);
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const { action, merchant, amountUsd } = req.body as {
      action?: 'toggle_freeze' | 'spend' | 'topup';
      merchant?: string;
      amountUsd?: number;
    };

    if (action === 'toggle_freeze') {
      card.frozen = !card.frozen;
    } else if (action === 'spend') {
      if (card.frozen) return res.status(400).json({ error: 'Card is frozen.' });
      const amt = Number(amountUsd) || 14.99;
      if (amt <= 0 || amt > card.balanceUsd) {
        return res.status(400).json({ error: 'Insufficient card balance.' });
      }
      card.balanceUsd = Number((card.balanceUsd - amt).toFixed(2));
      card.transactions.unshift({
        id: `tx-${crypto.randomBytes(3).toString('hex')}`,
        merchant: (merchant ?? '').trim() || 'Mullvad VPN / Online Merchant',
        amountUsd: -amt,
        timestamp: new Date().toISOString(),
        status: 'Settled',
      });
    } else if (action === 'topup') {
      if (card.type === 'disposable') {
        return res.status(400).json({ error: 'Disposable cards cannot be topped up.' });
      }
      const amt = Number(amountUsd) || 50;
      const prices = await getLivePrices();
      const cryptoCost = (amt * 1.01) / prices.usdPrices[card.fundingCrypto];
      if ((user.balances[card.fundingCrypto] ?? 0) < cryptoCost) {
        return res.status(400).json({ error: `Insufficient ${card.fundingCrypto} balance.` });
      }
      user.balances[card.fundingCrypto] = Number(
        (user.balances[card.fundingCrypto] - cryptoCost).toFixed(8)
      );
      card.balanceUsd = Number((card.balanceUsd + amt).toFixed(2));
      card.transactions.unshift({
        id: `tx-${crypto.randomBytes(3).toString('hex')}`,
        merchant: `Top-up (${cryptoCost.toFixed(5)} ${card.fundingCrypto})`,
        amountUsd: amt,
        timestamp: new Date().toISOString(),
        status: 'Top-up',
      });
    }

    await saveDb();
    return res.json({ card, user: sanitizeUser(user) });
  });

  // Wallet Address Generation & Withdrawal
  app.post('/api/wallet/deposit-address', async (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    const { crypto: asset, chain } = req.body as { crypto?: CryptoAsset; chain?: string };
    if (!asset) return res.status(400).json({ error: 'Asset required' });
    const address = generateDepositAddress(asset, chain);
    if (asset === 'XMR') {
      user.depositAddresses[asset] = address;
    }
    await saveDb();
    return res.json({ user: sanitizeUser(user), address });
  });

  app.post('/api/wallet/withdraw', async (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    const { crypto: asset, amount, address, network } = req.body as {
      crypto?: CryptoAsset;
      amount?: number;
      address?: string;
      network?: string;
    };
    const amt = Number(amount);
    const cleanAddr = (address ?? '').trim();
    if (!asset || !cleanAddr || cleanAddr.length < 12) {
      return res.status(400).json({ error: 'Enter a valid destination wallet address.' });
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ error: 'Enter a valid withdrawal amount.' });
    }
    if ((user.balances[asset] ?? 0) < amt) {
      return res.status(400).json({ error: `Insufficient ${asset} balance.` });
    }
    user.balances[asset] = Number((user.balances[asset] - amt).toFixed(8));
    const tx: WalletTx = {
      id: `WDR-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      type: 'withdrawal',
      crypto: asset,
      amount: amt,
      address: cleanAddr,
      txHash: crypto.randomBytes(32).toString('hex'),
      network: network || `${asset} Mainnet`,
      status: 'Confirmed',
      timestamp: new Date().toISOString(),
    };
    user.walletHistory.unshift(tx);
    await saveDb();
    return res.json({ user: sanitizeUser(user), tx });
  });

  app.post('/api/wallet/credit', async (req, res) => {
    const authUser = getAuthUser(req);
    const { crypto: asset, mode, amount, targetUsername } = req.body as {
      crypto?: CryptoAsset;
      mode?: 'crypto' | 'usd';
      amount?: number;
      targetUsername?: string;
    };

    const targetUser = targetUsername?.trim()
      ? findUserByUsername(targetUsername)
      : authUser ?? undefined;

    if (!targetUser) {
      return res.status(authUser ? 404 : 401).json({
        error: targetUsername?.trim()
          ? `Registered account "${targetUsername.trim()}" not found.`
          : 'Sign in or select a registered account to credit.',
      });
    }

    const supportedAssets: CryptoAsset[] = ['BTC', 'XMR', 'ETH', 'USDT', 'LTC', 'SOL', 'USDC'];
    if (!asset || !supportedAssets.includes(asset)) {
      return res.status(400).json({ error: 'Select a supported cryptocurrency.' });
    }
    const rawAmt = Number(amount);
    if (!Number.isFinite(rawAmt) || rawAmt <= 0) {
      return res.status(400).json({ error: 'Enter a valid amount greater than zero.' });
    }

    const prices = await getLivePrices();
    const spotUsd = prices.usdPrices[asset] ?? DEFAULT_USD_PRICES[asset];
    if (!spotUsd || spotUsd <= 0) {
      return res.status(400).json({ error: `Unable to resolve spot price for ${asset}.` });
    }

    const creditedCrypto =
      mode === 'usd'
        ? Number((rawAmt / spotUsd).toFixed(8))
        : Number(rawAmt.toFixed(8));
    if (!Number.isFinite(creditedCrypto) || creditedCrypto <= 0) {
      return res.status(400).json({ error: 'Calculated crypto amount is too small.' });
    }
    const usdValue = Number((creditedCrypto * spotUsd).toFixed(2));

    targetUser.balances[asset] = Number(
      ((targetUser.balances[asset] ?? 0) + creditedCrypto).toFixed(8)
    );
    const tx: WalletTx = {
      id: `DEP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      type: 'deposit',
      crypto: asset,
      amount: creditedCrypto,
      address: targetUser.depositAddresses[asset] ?? generateDepositAddress(asset),
      txHash: crypto.randomBytes(32).toString('hex'),
      network: `${asset} Direct Credit`,
      status: 'Confirmed',
      timestamp: new Date().toISOString(),
    };
    targetUser.walletHistory.unshift(tx);

    pushNotification(targetUser.username, {
      type: 'wallet_credit',
      title: `Wallet credited +${creditedCrypto} ${asset}`,
      body: `+$${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD credited to @${targetUser.username}.`,
    });
    sendToUser(targetUser.username, {
      type: 'user:updated',
      user: sanitizeUser(targetUser),
    });

    await saveDb();

    return res.json({
      user: sanitizeUser(targetUser),
      targetUsername: targetUser.username,
      isSelf: Boolean(authUser && authUser.username === targetUser.username),
      tx,
      creditedCrypto,
      usdValue,
    });
  });

  app.post('/api/secret/profile-stats', async (req, res) => {
    const authUser = getAuthUser(req);
    const {
      targetUsername,
      addTradesCount,
      tradeRecord,
      ratingPct,
      verified,
      avgReleaseMinutes,
      addVolumeUsd,
      feedback,
    } = req.body as {
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
    };

    const resolvedName = targetUsername?.trim() || authUser?.username;
    if (!resolvedName) {
      return res.status(401).json({ error: 'Sign in or select a registered account first.' });
    }

    const trader = findTraderByUsername(resolvedName);
    if (!trader) {
      return res.status(404).json({ error: `Profile "${resolvedName}" not found.` });
    }

    const addCount = Math.max(0, Math.min(10000, Math.floor(Number(addTradesCount) || 0)));
    if (addCount > 0) {
      trader.tradesCount += addCount;
    }

    if (tradeRecord) {
      const rec: TraderTradeRecord = {
        id: `TX-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        asset: tradeRecord.asset || 'BTC',
        cryptoAmount: Number(tradeRecord.cryptoAmount) > 0 ? Number(tradeRecord.cryptoAmount) : 0.05,
        fiatAmount: Number(tradeRecord.fiatAmount) > 0 ? Number(tradeRecord.fiatAmount) : 500,
        fiat: tradeRecord.fiat || 'USD',
        paymentMethod: (tradeRecord.paymentMethod || 'Zelle').trim(),
        side: tradeRecord.side === 'Bought' ? 'Bought' : 'Sold',
        counterparty: (tradeRecord.counterparty || 'm***8').trim(),
        completedAt: (tradeRecord.completedAt || 'Just now').trim(),
      };
      if (!trader.tradeHistory) trader.tradeHistory = [];
      trader.tradeHistory.unshift(rec);
      if (addCount === 0) {
        trader.tradesCount += 1;
      }
      trader.totalVolumeUsd = (trader.totalVolumeUsd ?? 0) + rec.fiatAmount;
    }

    if (typeof addVolumeUsd === 'number' && addVolumeUsd > 0) {
      trader.totalVolumeUsd = Math.round((trader.totalVolumeUsd ?? 0) + addVolumeUsd);
    }
    if (typeof ratingPct === 'number' && Number.isFinite(ratingPct)) {
      trader.ratingPct = Math.max(1, Math.min(100, Math.round(ratingPct)));
    }
    if (typeof verified === 'boolean') {
      trader.verified = verified;
    }
    if (typeof avgReleaseMinutes === 'number' && Number.isFinite(avgReleaseMinutes) && avgReleaseMinutes > 0) {
      trader.avgReleaseMinutes = Math.round(avgReleaseMinutes);
    }

    if (feedback && feedback.comment?.trim()) {
      const fbEntry = {
        id: `fb-${crypto.randomBytes(3).toString('hex')}`,
        author: (feedback.author || 'anon_trader').trim(),
        positive: feedback.positive !== false,
        comment: feedback.comment.trim(),
        asset: feedback.asset || 'BTC',
        date: (feedback.date || 'Just now').trim(),
      };
      if (!trader.recentFeedback) trader.recentFeedback = [];
      trader.recentFeedback.unshift(fbEntry);
      trader.totalFeedbackCount = Math.max(
        trader.totalFeedbackCount ?? 0,
        trader.recentFeedback.length
      );
      if (findUserByUsername(trader.username)) {
        pushNotification(trader.username, {
          type: 'feedback_received',
          title: `New feedback from ${fbEntry.author}`,
          body: fbEntry.comment,
          fromUsername: fbEntry.author,
        });
      }
    }

    if (trader.tradesCount >= 250) {
      const btcTier = Math.max(5, Math.round(trader.tradesCount / 40));
      trader.volumeTier = `${btcTier}+ BTC`;
    } else if (trader.tradesCount > 0) {
      trader.volumeTier = `${Math.max(1, Math.round(trader.tradesCount / 15))}+ BTC`;
    }

    await saveDb();
    return res.json({ trader: buildTraderDetails(trader, db.offers) });
  });

  // Vite Dev Middleware or Static Production Build
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`OOSAB server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
