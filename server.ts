import 'dotenv/config';
import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SEED_OFFERS,
  SEED_TRADERS,
  buildTraderDetails,
  generateTraderFeedbackPage,
  generateTraderTradesPage,
} from './server/seedData.ts';
import type {
  CryptoAsset,
  FiatCurrency,
  MarketPrices,
  P2POffer,
  SwapOrder,
  TradeOrder,
  TraderProfile,
  UserAccount,
  UserSettings,
  VirtualCard,
  WalletTx,
} from './src/types.ts';

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
  trades: Record<string, TradeOrder[]>; // username -> trades
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
  return u;
}

function sanitizeUser(u: StoredUser): UserAccount {
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

let db: DatabaseSchema = {
  traders: { ...SEED_TRADERS },
  offers: [...SEED_OFFERS],
  users: {},
  sessions: {},
  trades: {},
  swaps: {},
  cards: {},
};

async function loadDb() {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
    const seedOfferIds = new Set(SEED_OFFERS.map((o) => o.id));
    const customOffers = (Array.isArray(parsed.offers) ? parsed.offers : []).filter(
      (o) => !seedOfferIds.has(o.id) && !o.id.startsWith('off-gen-')
    );
    const mergedOffers = [...customOffers, ...SEED_OFFERS];

    db = {
      traders: { ...(parsed.traders ?? {}), ...SEED_TRADERS },
      offers: mergedOffers.length > 0 ? mergedOffers : [...SEED_OFFERS],
      users: parsed.users ?? {},
      sessions: parsed.sessions ?? {},
      trades: parsed.trades ?? {},
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
  app.use(express.json({ limit: '1mb' }));

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

  app.get('/api/traders/:username', (req, res) => {
    const rawTrader = db.traders[req.params.username];
    if (!rawTrader) {
      return res.status(404).json({ error: 'Trader profile not found' });
    }
    const enriched = buildTraderDetails(rawTrader, db.offers);
    const activeOffers = db.offers.filter(
      (o) => o.traderUsername === enriched.username && o.active
    );
    return res.json({ trader: enriched, offers: activeOffers });
  });

  app.get('/api/traders/:username/trades', (req, res) => {
    const rawTrader = db.traders[req.params.username];
    if (!rawTrader) {
      return res.status(404).json({ error: 'Trader profile not found' });
    }
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    return res.json(generateTraderTradesPage(rawTrader, db.offers, offset, limit));
  });

  app.get('/api/traders/:username/feedback', (req, res) => {
    const rawTrader = db.traders[req.params.username];
    if (!rawTrader) {
      return res.status(404).json({ error: 'Trader profile not found' });
    }
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    return res.json(generateTraderFeedbackPage(rawTrader, db.offers, offset, limit));
  });

  // Zero-KYC Auth
  app.post('/api/auth/register', async (req, res) => {
    const { username, password, confirmPassword, pgpKey, bio } = req.body as {
      username?: string;
      password?: string;
      confirmPassword?: string;
      pgpKey?: string;
      bio?: string;
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

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const nowIso = new Date().toISOString();
    const user: StoredUser = {
      username: cleanName,
      bio: (bio ?? '').trim() || 'Privacy-focused P2P trader on OOSAB. Zero KYC.',
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
      volumeTier: 'Starter',
      recentFeedback: [],
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
    const { bio, pgpKey } = req.body as { bio?: string; pgpKey?: string };
    if (typeof bio === 'string') {
      user.bio = bio.trim().slice(0, 280);
    }
    if (typeof pgpKey === 'string' && pgpKey.trim()) {
      user.pgpKey = pgpKey.trim().slice(0, 120);
    }
    if (db.traders[user.username]) {
      db.traders[user.username].bio = user.bio;
      db.traders[user.username].pgpFingerprint = user.pgpKey.slice(0, 49);
    }
    await saveDb();
    return res.json({ user: sanitizeUser(user), trader: db.traders[user.username] });
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
      const prices = await getLivePrices();
      const wantUsd = prices.usdPrices[body.swapToCrypto] ?? DEFAULT_USD_PRICES[body.swapToCrypto];
      const offerUsd = prices.usdPrices[body.crypto] ?? DEFAULT_USD_PRICES[body.crypto];
      const crossRate = wantUsd > 0 ? offerUsd / wantUsd : 1;
      const unitPrice =
        body.pricingMode === 'fixed' && Number(body.fixedPrice) > 0
          ? Number(body.fixedPrice)
          : crossRate * (1 + (Number.isFinite(Number(body.marginPct)) ? Number(body.marginPct) : 0) / 100);
      const minCryptoEq = unitPrice > 0 ? minSwap / unitPrice : 0;
      const requestedAvailable =
        body.availableCrypto && Number(body.availableCrypto) > 0 ? Number(body.availableCrypto) : 0;
      const requiredCrypto = Math.max(requestedAvailable, minCryptoEq);
      const currentBalance = user.balances[body.crypto] ?? 0;

      if (currentBalance < requiredCrypto) {
        return res.status(400).json({
          error: `Insufficient ${body.crypto} funds to publish this swap listing. You need at least ${requiredCrypto.toFixed(6)} ${body.crypto} (current balance: ${currentBalance.toFixed(6)} ${body.crypto}).`,
          code: 'INSUFFICIENT_FUNDS',
          asset: body.crypto,
          requiredCrypto,
          availableBalance: currentBalance,
        });
      }

      const newOffer: P2POffer = {
        id: `off-${crypto.randomBytes(3).toString('hex')}`,
        side: 'swap_crypto',
        traderUsername: user.username,
        crypto: body.crypto,
        swapToCrypto: body.swapToCrypto,
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

    if (body.side === 'sell_crypto') {
      const prices = await getLivePrices();
      const usdSpot = prices.usdPrices[body.crypto] ?? DEFAULT_USD_PRICES[body.crypto];
      const fiatRate = prices.fiatRatesFromUsd[body.fiat] ?? 1;
      const margin = Number.isFinite(Number(body.marginPct)) ? Number(body.marginPct) : 0;
      const unitPrice =
        body.pricingMode === 'fixed' && Number(body.fixedPrice) > 0
          ? Number(body.fixedPrice)
          : usdSpot * fiatRate * (1 + margin / 100);
      const minCryptoEq = unitPrice > 0 ? minFiat / unitPrice : 0;
      const requestedAvailable =
        body.availableCrypto && Number(body.availableCrypto) > 0 ? Number(body.availableCrypto) : 0;
      const requiredCrypto = Math.max(requestedAvailable, minCryptoEq);
      const currentBalance = user.balances[body.crypto] ?? 0;

      if (currentBalance < requiredCrypto) {
        return res.status(400).json({
          error: `Insufficient ${body.crypto} funds to publish this listing. You need at least ${requiredCrypto.toFixed(6)} ${body.crypto} (current balance: ${currentBalance.toFixed(6)} ${body.crypto}).`,
          code: 'INSUFFICIENT_FUNDS',
          asset: body.crypto,
          requiredCrypto,
          availableBalance: currentBalance,
        });
      }
    }

    const newOffer: P2POffer = {
      id: `off-${crypto.randomBytes(3).toString('hex')}`,
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

  // P2P Escrow Trades
  app.get('/api/trades', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    return res.json({ trades: db.trades[user.username] ?? [] });
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
    if (offer.traderUsername === user.username) {
      return res.status(400).json({ error: 'You cannot place a trade on your own offer.' });
    }

    const prices = await getLivePrices();
    const unitPrice = computeOfferUnitPrice(offer, prices);
    const now = Date.now();
    const tradeId = `TRD-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

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
        paymentDetails,
        terms: offer.terms,
        status: 'escrow_funded',
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + offer.paymentWindowMinutes * 60_000).toISOString(),
        messages: [
          {
            id: `msg-${crypto.randomBytes(4).toString('hex')}`,
            sender: 'Escrow System',
            text: `Both sides funded in OOSAB multi-asset escrow: ${sendAmt.toFixed(6)} ${offer.swapToCrypto} swapped for ${receiveAmt.toFixed(6)} ${offer.crypto} at 1 ${offer.crypto} = ${unitPrice.toFixed(6)} ${offer.swapToCrypto}.`,
            timestamp: new Date(now).toISOString(),
            isSystem: true,
          },
          {
            id: `msg-${crypto.randomBytes(4).toString('hex')}`,
            sender: offer.traderUsername,
            text: `Hello ${user.username}, my ${receiveAmt.toFixed(6)} ${offer.crypto} is locked in escrow for swap ${tradeId}. Press "Confirm Swap Deposit" to trigger automatic atomic release.`,
            timestamp: new Date(now + 1000).toISOString(),
          },
        ],
      };

      if (!db.trades[user.username]) db.trades[user.username] = [];
      db.trades[user.username].unshift(trade);
      await saveDb();
      return res.status(201).json({ trade, user: sanitizeUser(user) });
    }

    const amount = Number(fiatAmount);
    if (!Number.isFinite(amount) || amount < offer.minFiat || amount > offer.maxFiat) {
      return res.status(400).json({
        error: `Trade amount must be between ${offer.minFiat} and ${offer.maxFiat} ${offer.fiat}.`,
      });
    }

    const cryptoAmount = amount / unitPrice;

    // If user is selling crypto (offer.side === 'buy_crypto'), verify user has enough wallet balance
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
      paymentDetails,
      terms: offer.terms,
      status: 'escrow_funded',
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + offer.paymentWindowMinutes * 60_000).toISOString(),
      messages: [
        {
          id: `msg-${crypto.randomBytes(4).toString('hex')}`,
          sender: 'Escrow System',
          text: `${cryptoAmount.toFixed(6)} ${offer.crypto} is now locked in OOSAB multi-sig escrow at ${unitPrice.toFixed(2)} ${offer.fiat}/${offer.crypto}.`,
          timestamp: new Date(now).toISOString(),
          isSystem: true,
        },
        {
          id: `msg-${crypto.randomBytes(4).toString('hex')}`,
          sender: offer.traderUsername,
          text:
            offer.side === 'sell_crypto'
              ? `Hello ${user.username}, escrow is funded for trade ${tradeId}. Please send ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${offer.fiat} via ${offer.paymentMethod}. Payment instruction: ${paymentDetails}`
              : `Hello ${user.username}, escrow is funded. Share your ${offer.paymentMethod} receiving details here so I can transfer ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${offer.fiat}.`,
          timestamp: new Date(now + 1000).toISOString(),
        },
      ],
    };

    if (!db.trades[user.username]) db.trades[user.username] = [];
    db.trades[user.username].unshift(trade);
    await saveDb();

    return res.status(201).json({ trade, user: sanitizeUser(user) });
  });

  app.post('/api/trades/:id/messages', async (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    const trade = (db.trades[user.username] ?? []).find((t) => t.id === req.params.id);
    if (!trade) return res.status(404).json({ error: 'Trade not found' });

    const text = String(req.body.text ?? '').trim();
    if (!text) return res.status(400).json({ error: 'Message cannot be empty' });

    trade.messages.push({
      id: `msg-${crypto.randomBytes(4).toString('hex')}`,
      sender: user.username,
      text,
      timestamp: new Date().toISOString(),
    });

    if (trade.status === 'escrow_funded' || trade.status === 'payment_sent') {
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
    return res.json({ trade });
  });

  app.post('/api/trades/:id/action', async (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    const trade = (db.trades[user.username] ?? []).find((t) => t.id === req.params.id);
    if (!trade) return res.status(404).json({ error: 'Trade not found' });

    const { action, positive, comment } = req.body as {
      action?: 'mark_paid' | 'release' | 'cancel' | 'dispute' | 'feedback';
      positive?: boolean;
      comment?: string;
    };

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
      trade.messages.push({
        id: `msg-${crypto.randomBytes(4).toString('hex')}`,
        sender: trade.traderUsername,
        text: isSwap
          ? `Escrow deposit verified! Releasing ${trade.cryptoAmount.toFixed(6)} ${trade.crypto} to your wallet now.`
          : `Payment notice received! Checking ${trade.paymentMethod} settlement now — releasing ${trade.crypto} shortly.`,
        timestamp: new Date(Date.now() + 600).toISOString(),
      });
    } else if (action === 'release' && (trade.status === 'escrow_funded' || trade.status === 'payment_sent')) {
      trade.status = 'completed';
      if (trade.side === 'sell_crypto' || trade.side === 'swap_crypto') {
        user.balances[trade.crypto] = Number(
          ((user.balances[trade.crypto] ?? 0) + trade.cryptoAmount).toFixed(8)
        );
      }
      const trader = db.traders[trade.traderUsername];
      if (trader) trader.tradesCount += 1;
      if (db.traders[user.username]) db.traders[user.username].tradesCount += 1;

      trade.messages.push({
        id: `msg-${crypto.randomBytes(4).toString('hex')}`,
        sender: 'Escrow System',
        text: `Escrow released! ${trade.cryptoAmount.toFixed(6)} ${trade.crypto} settled to ${trade.buyerUsername}.`,
        timestamp: new Date().toISOString(),
        isSystem: true,
      });
    } else if (action === 'cancel' && trade.status === 'escrow_funded') {
      trade.status = 'cancelled';
      if (trade.side === 'buy_crypto') {
        user.balances[trade.crypto] = Number(
          ((user.balances[trade.crypto] ?? 0) + trade.cryptoAmount).toFixed(8)
        );
      } else if (trade.side === 'swap_crypto' && trade.swapToCrypto && trade.swapToAmount) {
        user.balances[trade.swapToCrypto] = Number(
          ((user.balances[trade.swapToCrypto] ?? 0) + trade.swapToAmount).toFixed(8)
        );
      }
      trade.messages.push({
        id: `msg-${crypto.randomBytes(4).toString('hex')}`,
        sender: 'Escrow System',
        text: `Trade ${trade.id} cancelled and escrow unlocked.`,
        timestamp: new Date().toISOString(),
        isSystem: true,
      });
    } else if (action === 'dispute' && (trade.status === 'escrow_funded' || trade.status === 'payment_sent')) {
      trade.status = 'disputed';
      trade.messages.push({
        id: `msg-${crypto.randomBytes(4).toString('hex')}`,
        sender: 'Escrow System',
        text: `Dispute opened. An independent OOSAB arbitrator has frozen the ${trade.crypto} in escrow and joined the chat.`,
        timestamp: new Date().toISOString(),
        isSystem: true,
      });
    } else if (action === 'feedback' && trade.status === 'completed') {
      const isPos = positive !== false;
      const note = (comment ?? '').trim() || 'Smooth zero-KYC trade!';
      trade.feedbackGiven = { positive: isPos, comment: note };
      const trader = db.traders[trade.traderUsername];
      if (trader) {
        trader.recentFeedback.unshift({
          id: `fb-${crypto.randomBytes(3).toString('hex')}`,
          author: user.username,
          positive: isPos,
          comment: note,
          asset: trade.crypto,
          date: 'Just now',
        });
      }
    } else {
      return res.status(400).json({ error: 'Invalid trade state transition.' });
    }

    await saveDb();
    return res.json({ trade, user: sanitizeUser(user) });
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
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Sign in or register to credit your profile balance.' });

    const { crypto: asset, mode, amount } = req.body as {
      crypto?: CryptoAsset;
      mode?: 'crypto' | 'usd';
      amount?: number;
    };
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

    user.balances[asset] = Number(((user.balances[asset] ?? 0) + creditedCrypto).toFixed(8));
    const tx: WalletTx = {
      id: `DEP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      type: 'deposit',
      crypto: asset,
      amount: creditedCrypto,
      address: user.depositAddresses[asset] ?? generateDepositAddress(asset),
      txHash: crypto.randomBytes(32).toString('hex'),
      network: `${asset} Direct Credit`,
      status: 'Confirmed',
      timestamp: new Date().toISOString(),
    };
    user.walletHistory.unshift(tx);
    await saveDb();

    return res.json({
      user: sanitizeUser(user),
      tx,
      creditedCrypto,
      usdValue,
    });
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OOSAB server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
