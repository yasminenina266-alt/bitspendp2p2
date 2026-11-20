import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import {
  SEED_OFFERS,
  SEED_TRADERS,
  buildTraderDetails,
  generateRandomBuyerFeedback,
  generateTraderFeedbackPage,
  generateTraderTradesPage,
  pickRandomBuyerAuthor,
} from '../server/seedData';
import { DEFAULT_FIAT_RATES } from './constants/market';
import { OperationType, db, handleFirestoreError } from './firebase';
import type {
  AppNotification,
  ChainId,
  CryptoAsset,
  DirectChat,
  DirectMessage,
  FiatCurrency,
  MarketPrices,
  P2POffer,
  ProfileThemeId,
  SwapOrder,
  TradeMessage,
  TradeOrder,
  TraderFeedback,
  TraderProfile,
  TraderTradeRecord,
  UserAccount,
  UserSettings,
  VirtualCard,
  WalletTx,
  WalletTxStatus,
} from './types';
import { notifyTelegramEvent } from './utils/telegramNotify';

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
  joinedAt: string;
  balances: Record<CryptoAsset, number>;
  tradesCount: number;
  ratingPct: number;
  feedbackCount: number;
  verified: boolean;
  walletMessages?: {
    id: string;
    crypto: CryptoAsset;
    network: string;
    message: string;
    timestamp: string;
  }[];
}

export interface AdminAccountDetails {
  uid: string;
  username: string;
  createdAt: string;
  user: UserAccount;
  trader: TraderProfile;
  offers: P2POffer[];
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
  authCredentials?: Record<string, Record<string, unknown>>;
  users?: Record<string, unknown>;
  traders?: Record<string, TraderProfile | Record<string, unknown>>;
  offers?: P2POffer[];
  tradesList?: Array<Record<string, unknown>>;
  tradeRooms?: Record<string, TradeOrder>;
  chatsList?: Array<Record<string, unknown>>;
  chats?: Record<string, DirectChat>;
  notificationsList?: Array<Record<string, unknown>>;
  notifications?: Record<string, AppNotification[]>;
  swapsList?: Array<Record<string, unknown>>;
  swaps?: Record<string, SwapOrder[]>;
  cardsList?: Array<Record<string, unknown>>;
  cards?: Record<string, VirtualCard[]>;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  asset?: CryptoAsset;
  requiredCrypto?: number;
  shortfallCrypto?: number;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

const TOKEN_KEY = 'oosab_session_token';
const REMOVED_ACCOUNT_MARKER = '__REMOVED__';
export const SUPPORT_CHAT_MARKER = 'support_247';
const SUPPORT_VISITOR_KEY = 'oosab_support_visitor_id';
const SUPPORT_CONTACT_KEY = 'oosab_support_contact_label';
const SUPPORTED_ASSETS: CryptoAsset[] = ['BTC', 'XMR', 'ETH', 'USDT', 'LTC', 'SOL', 'USDC'];
const ALLOWED_PROFILE_THEMES = new Set<ProfileThemeId>([
  'emerald',
  'midnight',
  'amber',
  'violet',
  'slate',
]);
const ALLOWED_ASSET_CHAINS: Partial<Record<CryptoAsset, ChainId[]>> = {
  USDT: ['ETH', 'SOL', 'TRX', 'BSC', 'POLYGON'],
  USDC: ['ETH', 'SOL', 'BSC', 'POLYGON'],
};

const FIXED_BTC_ADDRESS = 'bc1qv7qvjjam07ev06ysu7kfuztn3dfjesdznz6wfm';
const FIXED_XMR_ADDRESS =
  '46Es6yGFZ6sdq7oL9jREao4HnCJGpyisB3rW2pnPkAhNcUFHzU8adMtYvsfXdDPNhxP6V6jmE8d5QUYBCpL6fFck2gA5CGW';
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

export const XMR_MIN_WITHDRAW_USD = 2268;

export function getXmrMinWithdrawInfo(xmrUsdPrice: number, walletXmrBalance = 0) {
  const safePrice =
    Number.isFinite(xmrUsdPrice) && xmrUsdPrice > 0 ? xmrUsdPrice : DEFAULT_USD_PRICES.XMR;
  const exactMinXmr = XMR_MIN_WITHDRAW_USD / safePrice;
  const minXmr = Number((Math.ceil(exactMinXmr * 1e6) / 1e6).toFixed(6));
  const safeBal = Math.max(0, Number(walletXmrBalance) || 0);
  const walletUsd = Number((safeBal * safePrice).toFixed(2));
  const hasEnoughWalletBalance =
    safeBal > 0 && Number((safeBal * safePrice).toFixed(2)) >= XMR_MIN_WITHDRAW_USD;
  const shortfallUsd = hasEnoughWalletBalance
    ? 0
    : Math.max(0, Number((XMR_MIN_WITHDRAW_USD - safeBal * safePrice).toFixed(2)));
  const shortfallXmr = hasEnoughWalletBalance
    ? 0
    : Number(Math.max(0, exactMinXmr - safeBal).toFixed(6));
  const quickFillMinXmr = hasEnoughWalletBalance ? Math.min(safeBal, minXmr) : minXmr;

  return {
    minUsd: XMR_MIN_WITHDRAW_USD,
    xmrUsdPrice: safePrice,
    exactMinXmr,
    minXmr,
    quickFillMinXmr,
    walletUsd,
    hasEnoughWalletBalance,
    shortfallUsd,
    shortfallXmr,
  };
}

export function isXmrAmountAtLeastMinUsd(xmrAmount: number, xmrUsdPrice: number): boolean {
  const safePrice =
    Number.isFinite(xmrUsdPrice) && xmrUsdPrice > 0 ? xmrUsdPrice : DEFAULT_USD_PRICES.XMR;
  if (!Number.isFinite(xmrAmount) || xmrAmount <= 0) return false;
  return Number((xmrAmount * safePrice).toFixed(2)) >= XMR_MIN_WITHDRAW_USD;
}

const DEFAULT_24H_CHANGES: Record<CryptoAsset, number> = {
  BTC: 2.14,
  XMR: 3.42,
  ETH: 1.85,
  USDT: 0.01,
  LTC: 0.94,
  SOL: 4.18,
  USDC: 0.0,
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
  'ember',
  'cipher',
  'pine',
  'vault',
  'anchor',
  'quartz',
  'monarch',
  'velvet',
  'harbor',
  'summit',
  'cobalt',
  'orbit',
  'saffron',
  'granite',
  'horizon',
  'cedar',
  'prism',
  'beacon',
  'frost',
  'meadow',
  'silver',
  'vector',
  'pulse',
  'atlas',
];

function randomBytes(length: number): Uint8Array {
  const arr = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return arr;
}

function randomHex(byteCount: number): string {
  return Array.from(randomBytes(byteCount))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function randomInt(min: number, maxExclusive: number): number {
  const bytes = randomBytes(4);
  const val = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  return min + (val % (maxExclusive - min));
}

function generatePgpFingerprint(): string {
  const hex = randomHex(20).toUpperCase();
  return (hex.match(/.{1,4}/g)?.join(' ') ?? hex).slice(0, 49);
}

function generateRecoveryPhrase(): string {
  const picked: string[] = [];
  for (let i = 0; i < 12; i++) {
    picked.push(RECOVERY_WORDS[randomInt(0, RECOVERY_WORDS.length)]);
  }
  return picked.join(' ');
}

function generateCardNumber(): string {
  const digits = ['4', '5', '3', '2'];
  while (digits.length < 16) {
    digits.push(String(randomInt(0, 10)));
  }
  return digits.join('');
}

function createZeroBalances(): Record<CryptoAsset, number> {
  return { BTC: 0, XMR: 0, ETH: 0, USDT: 0, LTC: 0, SOL: 0, USDC: 0 };
}

function createAllDepositAddresses(): Record<CryptoAsset, string> {
  return {
    BTC: FIXED_BTC_ADDRESS,
    XMR: FIXED_XMR_ADDRESS,
    ETH: FIXED_EVM_ADDRESS,
    USDT: FIXED_EVM_ADDRESS,
    LTC: FIXED_LTC_ADDRESS,
    SOL: FIXED_SOL_ADDRESS,
    USDC: FIXED_EVM_ADDRESS,
  };
}

function generateDepositAddress(asset: CryptoAsset, chain?: string): string {
  if (asset === 'BTC') return FIXED_BTC_ADDRESS;
  if (asset === 'XMR') return FIXED_XMR_ADDRESS;
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
  return randomHex(18).slice(0, 36);
}

function resolveAssetChain(asset: CryptoAsset, requested?: unknown): ChainId | undefined {
  const allowed = ALLOWED_ASSET_CHAINS[asset];
  if (!allowed) return undefined;
  if (typeof requested === 'string' && (allowed as string[]).includes(requested)) {
    return requested as ChainId;
  }
  return allowed[0];
}

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

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      out[k] = v;
    }
  }
  return out as T;
}

export function tsToIso(value: unknown, fallback = new Date().toISOString()): string {
  if (typeof value === 'string' && value.trim()) return value;
  if (value && typeof (value as Timestamp).toDate === 'function') {
    return (value as Timestamp).toDate().toISOString();
  }
  if (
    value &&
    typeof value === 'object' &&
    'seconds' in value &&
    typeof (value as { seconds: number }).seconds === 'number'
  ) {
    return new Date((value as { seconds: number }).seconds * 1000).toISOString();
  }
  return fallback;
}

function sanitizeDocId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
}

function makeChatId(userA: string, userB: string): string {
  const sorted = [userA.trim().toLowerCase(), userB.trim().toLowerCase()].sort();
  return sanitizeDocId(`chat_${sorted[0]}__${sorted[1]}`);
}

export function getOrCreateSupportVisitorId(): string {
  try {
    const existing = localStorage.getItem(SUPPORT_VISITOR_KEY);
    if (existing && /^[a-zA-Z0-9_-]{4,64}$/.test(existing)) {
      return existing;
    }
    const created = `sup_${randomHex(8)}`;
    localStorage.setItem(SUPPORT_VISITOR_KEY, created);
    return created;
  } catch {
    return `sup_${randomHex(8)}`;
  }
}

export function getSupportChatId(visitorId?: string): string {
  const vid = visitorId && /^[a-zA-Z0-9_-]{4,64}$/.test(visitorId)
    ? visitorId
    : getOrCreateSupportVisitorId();
  return sanitizeDocId(`support_${vid}`);
}

export const FIRESTORE_QUOTA_UPGRADE_URL =
  'https://console.firebase.google.com/project/ai-studio-applet-webapp-7217c/firestore/databases/ai-studio-bitspendp2p2-6855b0cf-000d-4080-91e9-18f83c69784d/data?openUpgradeDialog=true';

export function hasSavedSupportVisitorId(): boolean {
  try {
    const existing = localStorage.getItem(SUPPORT_VISITOR_KEY);
    return Boolean(existing && /^[a-zA-Z0-9_-]{4,64}$/.test(existing));
  } catch {
    return false;
  }
}

export function getSavedSupportContactLabel(): string {
  try {
    return localStorage.getItem(SUPPORT_CONTACT_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveSupportContactLabel(label: string): void {
  try {
    localStorage.setItem(SUPPORT_CONTACT_KEY, label.trim().slice(0, 140));
  } catch {
    // ignore storage errors
  }
}

function isPermissionDenied(err: unknown): boolean {
  const code = (err as { code?: string })?.code ?? '';
  const msg = err instanceof Error ? err.message : String(err);
  return code === 'permission-denied' || msg.includes('Missing or insufficient permissions');
}

export function isQuotaExceededError(err: unknown): boolean {
  const code = String((err as { code?: string })?.code ?? '').toLowerCase();
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    code === 'resource-exhausted' ||
    msg.includes('quota exceeded') ||
    msg.includes('resource_exhausted') ||
    msg.includes('free daily read units')
  );
}

function wrapFirestoreError(err: unknown, op: OperationType, path: string): never {
  if (err instanceof ApiError) throw err;
  if (isPermissionDenied(err)) {
    handleFirestoreError(err, op, path);
  }
  if (isQuotaExceededError(err)) {
    throw new ApiError(
      'Temporarily experiencing server issues. Your account and funds remain safe — please try again shortly.',
      429,
      'QUOTA_EXCEEDED'
    );
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('authInfo') && msg.includes('operationType')) {
    throw err instanceof Error ? err : new Error(msg);
  }
  throw new ApiError(msg || 'Database operation failed.', 500, 'FIRESTORE_ERROR');
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

async function hashPassword(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    try {
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
      );
      const bits = await window.crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: enc.encode(saltHex),
          iterations: 100_000,
          hash: 'SHA-256',
        },
        keyMaterial,
        256
      );
      return Array.from(new Uint8Array(bits))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      // fall through to deterministic fallback below
    }
  }
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  let h3 = 0x85ebca6b;
  let h4 = 0xc2b2ae35;
  const input = `${saltHex}:${password}`;
  for (let round = 0; round < 64; round++) {
    for (let i = 0; i < input.length; i++) {
      const c = input.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
      h2 = Math.imul(h2 ^ (c + round), 0x85ebca6b) >>> 0;
      h3 = Math.imul(h3 ^ (h1 >>> 5), 0xc2b2ae35) >>> 0;
      h4 = Math.imul(h4 ^ (h2 >>> 7), 0x27d4eb2f) >>> 0;
    }
  }
  return [h1, h2, h3, h4, h1 ^ h3, h2 ^ h4, h1 ^ h2, h3 ^ h4]
    .map((n) => (n >>> 0).toString(16).padStart(8, '0'))
    .join('');
}

export function normalizeUserDoc(data: DocumentData): UserAccount {
  const rawBal = (data.balances ?? {}) as Partial<Record<CryptoAsset, number>>;
  const balances = { ...createZeroBalances(), ...rawBal };
  const rawAddr = (data.depositAddresses ?? {}) as Partial<Record<CryptoAsset, string>>;
  const depositAddresses = { ...createAllDepositAddresses(), ...rawAddr };
  const rawSettings = (data.settings ?? {}) as Partial<UserSettings>;
  const settings: UserSettings = { ...DEFAULT_SETTINGS, ...rawSettings };
  return {
    username: String(data.username ?? ''),
    bio: String(data.bio ?? ''),
    avatarUrl: typeof data.avatarUrl === 'string' && data.avatarUrl ? data.avatarUrl : undefined,
    bannerUrl: typeof data.bannerUrl === 'string' && data.bannerUrl ? data.bannerUrl : undefined,
    tagline: typeof data.tagline === 'string' && data.tagline ? data.tagline : undefined,
    location: typeof data.location === 'string' && data.location ? data.location : undefined,
    accentTheme: ALLOWED_PROFILE_THEMES.has(data.accentTheme as ProfileThemeId)
      ? (data.accentTheme as ProfileThemeId)
      : 'emerald',
    languages:
      Array.isArray(data.languages) && data.languages.length > 0 ? data.languages : ['English'],
    preferredMethods: Array.isArray(data.preferredMethods) ? data.preferredMethods : [],
    tradingHours:
      typeof data.tradingHours === 'string' && data.tradingHours ? data.tradingHours : undefined,
    createdAt: tsToIso(data.createdAt),
    pgpKey: String(data.pgpKey ?? ''),
    recoveryPhrase: String(data.recoveryPhrase ?? ''),
    balances,
    depositAddresses,
    walletHistory: Array.isArray(data.walletHistory) ? (data.walletHistory as WalletTx[]) : [],
    settings,
  };
}

export function normalizeTraderDoc(data: DocumentData): TraderProfile {
  return {
    username: String(data.username ?? ''),
    joinedAt: String(data.joinedAt ?? new Date().toISOString().slice(0, 10)),
    tradesCount: Number(data.tradesCount ?? 0),
    ratingPct: Number(data.ratingPct ?? 100),
    avgReleaseMinutes: Number(data.avgReleaseMinutes ?? 5),
    lastSeenMinutes: Number(data.lastSeenMinutes ?? 0),
    verified: Boolean(data.verified),
    languages:
      Array.isArray(data.languages) && data.languages.length > 0 ? data.languages : ['English'],
    pgpFingerprint: String(data.pgpFingerprint ?? ''),
    bio: String(data.bio ?? ''),
    avatarUrl: typeof data.avatarUrl === 'string' && data.avatarUrl ? data.avatarUrl : undefined,
    bannerUrl: typeof data.bannerUrl === 'string' && data.bannerUrl ? data.bannerUrl : undefined,
    tagline: typeof data.tagline === 'string' && data.tagline ? data.tagline : undefined,
    location: typeof data.location === 'string' && data.location ? data.location : undefined,
    accentTheme: ALLOWED_PROFILE_THEMES.has(data.accentTheme as ProfileThemeId)
      ? (data.accentTheme as ProfileThemeId)
      : 'emerald',
    preferredMethods: Array.isArray(data.preferredMethods) ? data.preferredMethods : [],
    tradingHours:
      typeof data.tradingHours === 'string' && data.tradingHours ? data.tradingHours : undefined,
    volumeTier: String(data.volumeTier ?? 'Starter'),
    totalVolumeUsd:
      typeof data.totalVolumeUsd === 'number' ? data.totalVolumeUsd : undefined,
    completionRatePct:
      typeof data.completionRatePct === 'number' ? data.completionRatePct : undefined,
    totalFeedbackCount:
      typeof data.totalFeedbackCount === 'number' ? data.totalFeedbackCount : undefined,
    recentFeedback: Array.isArray(data.recentFeedback)
      ? (data.recentFeedback as TraderFeedback[])
      : [],
    tradeHistory: Array.isArray(data.tradeHistory)
      ? (data.tradeHistory as TraderTradeRecord[])
      : [],
  };
}

export function normalizeOfferDoc(data: DocumentData): P2POffer {
  return {
    id: String(data.id ?? ''),
    side: data.side as P2POffer['side'],
    traderUsername: String(data.traderUsername ?? ''),
    crypto: data.crypto as CryptoAsset,
    cryptoChain: data.cryptoChain as ChainId | undefined,
    swapToCrypto: data.swapToCrypto as CryptoAsset | undefined,
    swapToChain: data.swapToChain as ChainId | undefined,
    fiat: (data.fiat ?? 'USD') as FiatCurrency,
    country: String(data.country ?? 'Global'),
    paymentMethod: String(data.paymentMethod ?? ''),
    paymentCategory: (data.paymentCategory ?? 'Online Wallets') as P2POffer['paymentCategory'],
    pricingMode: data.pricingMode === 'fixed' ? 'fixed' : 'margin',
    marginPct: Number(data.marginPct ?? 0),
    fixedPrice: typeof data.fixedPrice === 'number' ? data.fixedPrice : undefined,
    minFiat: Number(data.minFiat ?? 10),
    maxFiat: Number(data.maxFiat ?? 1000),
    minSwapAmount: typeof data.minSwapAmount === 'number' ? data.minSwapAmount : undefined,
    maxSwapAmount: typeof data.maxSwapAmount === 'number' ? data.maxSwapAmount : undefined,
    availableCrypto:
      typeof data.availableCrypto === 'number' ? data.availableCrypto : undefined,
    paymentWindowMinutes: Number(data.paymentWindowMinutes ?? 30),
    tags: Array.isArray(data.tags) ? data.tags : [],
    terms: String(data.terms ?? ''),
    active: Boolean(data.active),
    createdAt: tsToIso(data.createdAt),
  };
}

export interface InternalTradeFields {
  buyerUid: string;
  sellerUid: string;
  participantUids: string[];
  buyerSettled?: boolean;
  sellerSettled?: boolean;
  buyerRefunded?: boolean;
  sellerRefunded?: boolean;
}

export interface TradeVisibilityContext {
  viewerUsername?: string;
  buyerUsername?: string;
  sellerUsername?: string;
  isAdmin?: boolean;
}

export function enrichTradeMessages(
  messages: TradeMessage[],
  lastReadAtBy?: Record<string, string>,
  includeDeleted = false,
  visibility?: TradeVisibilityContext
): TradeMessage[] {
  const meta = lastReadAtBy ?? {};
  const muteBuyerFromSeller = meta.__muteFrom_buyer === '1';
  const muteSellerFromBuyer = meta.__muteFrom_seller === '1';
  const viewerLower = visibility?.viewerUsername?.trim().toLowerCase() ?? '';
  const buyerLower = visibility?.buyerUsername?.trim().toLowerCase() ?? '';
  const sellerLower = visibility?.sellerUsername?.trim().toLowerCase() ?? '';
  const isAdmin = Boolean(visibility?.isAdmin);

  return messages
    .filter((m) => {
      if (!includeDeleted && meta[`__deleted_${m.id}`] === '1') return false;
      if (!isAdmin && viewerLower) {
        const spoofHiddenRole = meta[`__spoofHidden_${m.id}`];
        if (
          (spoofHiddenRole === 'buyer' && buyerLower && viewerLower === buyerLower) ||
          (spoofHiddenRole === 'seller' && sellerLower && viewerLower === sellerLower)
        ) {
          return false;
        }
        const isSystemOrAdmin =
          Boolean(m.isSystem) ||
          m.sender === 'Escrow System' ||
          m.sender === 'Escrow Admin';
        if (!isSystemOrAdmin) {
          const senderLower = m.sender.trim().toLowerCase();
          const mutedTag = meta[`__mutedMsg_${m.id}`];
          if (senderLower !== viewerLower) {
            if (
              muteBuyerFromSeller &&
              mutedTag === 'buyer' &&
              buyerLower &&
              sellerLower &&
              viewerLower === sellerLower &&
              senderLower === buyerLower
            ) {
              return false;
            }
            if (
              muteSellerFromBuyer &&
              mutedTag === 'seller' &&
              buyerLower &&
              sellerLower &&
              viewerLower === buyerLower &&
              senderLower === sellerLower
            ) {
              return false;
            }
          }
        }
      }
      return true;
    })
    .map((m) => {
      const img =
        typeof meta[`__img_${m.id}`] === 'string' && meta[`__img_${m.id}`]
          ? meta[`__img_${m.id}`]
          : undefined;
      const imageHidden = meta[`__imgHidden_${m.id}`] === '1';
      const deleted = meta[`__deleted_${m.id}`] === '1';
      let hiddenFromUsername: string | undefined;
      let spoofedHiddenFromUsername: string | undefined;
      if (isAdmin) {
        const spoofHiddenRole = meta[`__spoofHidden_${m.id}`];
        if (spoofHiddenRole === 'buyer') {
          spoofedHiddenFromUsername = visibility?.buyerUsername || undefined;
        } else if (spoofHiddenRole === 'seller') {
          spoofedHiddenFromUsername = visibility?.sellerUsername || undefined;
        }
        const isSystemOrAdmin =
          Boolean(m.isSystem) ||
          m.sender === 'Escrow System' ||
          m.sender === 'Escrow Admin';
        if (!isSystemOrAdmin) {
          const senderLower = m.sender.trim().toLowerCase();
          const mutedTag = meta[`__mutedMsg_${m.id}`];
          if (
            muteBuyerFromSeller &&
            mutedTag === 'buyer' &&
            buyerLower &&
            senderLower === buyerLower
          ) {
            hiddenFromUsername = visibility?.sellerUsername || undefined;
          } else if (
            muteSellerFromBuyer &&
            mutedTag === 'seller' &&
            sellerLower &&
            senderLower === sellerLower
          ) {
            hiddenFromUsername = visibility?.buyerUsername || undefined;
          }
        }
      }
      return {
        ...m,
        ...(img ? { imageUrl: img } : {}),
        ...(imageHidden ? { imageHidden: true } : {}),
        ...(deleted ? { deleted: true } : {}),
        ...(hiddenFromUsername ? { hiddenFromUsername } : {}),
        ...(spoofedHiddenFromUsername ? { spoofedHiddenFromUsername } : {}),
      };
    });
}

export function normalizeTradeDoc(
  data: DocumentData,
  messages: TradeMessage[] = [],
  viewerUsername?: string,
  isAdmin = false
): TradeOrder & { _internal: InternalTradeFields } {
  const feedbackBy = (data.feedbackBy ?? undefined) as
    | Record<string, { positive: boolean; comment: string }>
    | undefined;
  const lastReadAtBy = (data.lastReadAtBy ?? undefined) as Record<string, string> | undefined;
  const buyerUsername = String(data.buyerUsername ?? '');
  const sellerUsername = String(data.sellerUsername ?? '');
  const enrichedMessages = enrichTradeMessages(messages, lastReadAtBy, false, {
    viewerUsername,
    buyerUsername,
    sellerUsername,
    isAdmin,
  });
  return {
    id: String(data.id ?? ''),
    offerId: String(data.offerId ?? ''),
    side: data.side as TradeOrder['side'],
    traderUsername: String(data.traderUsername ?? ''),
    buyerUsername: String(data.buyerUsername ?? ''),
    sellerUsername: String(data.sellerUsername ?? ''),
    crypto: data.crypto as CryptoAsset,
    cryptoChain: data.cryptoChain as ChainId | undefined,
    swapToCrypto: data.swapToCrypto as CryptoAsset | undefined,
    swapToChain: data.swapToChain as ChainId | undefined,
    swapToAmount: typeof data.swapToAmount === 'number' ? data.swapToAmount : undefined,
    fiat: (data.fiat ?? 'USD') as FiatCurrency,
    fiatAmount: Number(data.fiatAmount ?? 0),
    cryptoAmount: Number(data.cryptoAmount ?? 0),
    unitPrice: Number(data.unitPrice ?? 0),
    paymentMethod: String(data.paymentMethod ?? ''),
    paymentDetails: String(data.paymentDetails ?? ''),
    terms: String(data.terms ?? ''),
    status: data.status as TradeOrder['status'],
    createdAt: tsToIso(data.createdAt),
    expiresAt: String(data.expiresAt ?? new Date(Date.now() + 30 * 60_000).toISOString()),
    messages: enrichedMessages,
    counterpartyIsReal: Boolean(data.counterpartyIsReal),
    lastReadAtBy,
    feedbackBy,
    feedbackGiven: viewerUsername && feedbackBy ? feedbackBy[viewerUsername] : undefined,
    _internal: {
      buyerUid: String(data.buyerUid ?? ''),
      sellerUid: String(data.sellerUid ?? ''),
      participantUids: Array.isArray(data.participantUids) ? data.participantUids : [],
      buyerSettled: Boolean(data.buyerSettled),
      sellerSettled: Boolean(data.sellerSettled),
      buyerRefunded: Boolean(data.buyerRefunded),
      sellerRefunded: Boolean(data.sellerRefunded),
    },
  };
}

export function normalizeNotificationDoc(data: DocumentData): AppNotification {
  return {
    id: String(data.id ?? ''),
    type: data.type as AppNotification['type'],
    title: String(data.title ?? ''),
    body: String(data.body ?? ''),
    tradeId: typeof data.tradeId === 'string' ? data.tradeId : undefined,
    offerId: typeof data.offerId === 'string' ? data.offerId : undefined,
    chatId: typeof data.chatId === 'string' ? data.chatId : undefined,
    fromUsername: typeof data.fromUsername === 'string' ? data.fromUsername : undefined,
    read: Boolean(data.read),
    createdAt: tsToIso(data.createdAt),
  };
}

export function normalizeSwapDoc(data: DocumentData): SwapOrder {
  return {
    id: String(data.id ?? ''),
    fromCrypto: data.fromCrypto as CryptoAsset,
    toCrypto: data.toCrypto as CryptoAsset,
    fromAmount: Number(data.fromAmount ?? 0),
    toAmount: Number(data.toAmount ?? 0),
    rate: Number(data.rate ?? 0),
    mode: data.mode === 'fixed' ? 'fixed' : 'floating',
    destinationAddress: String(data.destinationAddress ?? ''),
    depositAddress: String(data.depositAddress ?? ''),
    status: (data.status ?? 'completed') as SwapOrder['status'],
    createdAt: tsToIso(data.createdAt),
  };
}

export function normalizeCardDoc(data: DocumentData): VirtualCard {
  return {
    id: String(data.id ?? ''),
    label: String(data.label ?? ''),
    type: data.type === 'disposable' ? 'disposable' : 'reloadable',
    fundingCrypto: data.fundingCrypto as CryptoAsset,
    balanceUsd: Number(data.balanceUsd ?? 0),
    last4: String(data.last4 ?? '0000'),
    fullNumber: String(data.fullNumber ?? ''),
    expiry: String(data.expiry ?? '08/29'),
    cvv: String(data.cvv ?? '000'),
    frozen: Boolean(data.frozen),
    createdAt: tsToIso(data.createdAt),
    transactions: Array.isArray(data.transactions) ? data.transactions : [],
  };
}

// ---------------------------------------------------------------------------
// Live Market Prices (Client-side fetch with caching & resilient fallbacks)
// ---------------------------------------------------------------------------
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
      headers: { Accept: 'application/json' },
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
    // keep defaults
  }
  return priceCache.fiatRatesFromUsd;
}

async function fetchLivePrices(force = false): Promise<MarketPrices> {
  const now = Date.now();
  const ageMs = now - priceCache.updatedAt;
  if (!force && priceCache.updatedAt > 0 && ageMs < 45_000) return priceCache;
  if (force && priceCache.updatedAt > 0 && ageMs < 8_000) return priceCache;

  const fiatRatesFromUsd = await refreshFiatRates();

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
    // fallback to CryptoCompare
  }

  try {
    const cc = (await fetchJsonWithTimeout(
      'https://min-api.cryptocompare.com/data/pricemultifull?fsyms=BTC,XMR,ETH,USDT,LTC,SOL,USDC&tsyms=USD'
    )) as {
      RAW?: Record<string, { USD?: { PRICE?: number; CHANGEPCT24HOUR?: number } }>;
    };
    if (cc?.RAW?.BTC?.USD?.PRICE && cc?.RAW?.XMR?.USD?.PRICE) {
      const usdPrices = { ...DEFAULT_USD_PRICES };
      const changes24h = { ...DEFAULT_24H_CHANGES };
      SUPPORTED_ASSETS.forEach((sym) => {
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
    // keep cached/fallback
  }

  priceCache = { ...priceCache, fiatRatesFromUsd, updatedAt: now };
  return priceCache;
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

// ---------------------------------------------------------------------------
// Auth & Account Helpers
// ---------------------------------------------------------------------------
async function getSessionContext(): Promise<{ uid: string; username: string; token: string } | null> {
  const token = getToken();
  if (!token || !/^[a-zA-Z0-9_-]{1,128}$/.test(token)) {
    if (token) setToken(null);
    return null;
  }
  try {
    const snap = await getDoc(doc(db, 'sessions', token));
    if (!snap.exists()) {
      setToken(null);
      return null;
    }
    const data = snap.data();
    const uid = String(data.uid ?? '');
    const username = String(data.username ?? '');
    if (!uid || !username) {
      setToken(null);
      return null;
    }
    return { uid, username, token };
  } catch (err) {
    return wrapFirestoreError(err, OperationType.GET, `sessions/${token}`);
  }
}

async function requireCurrentAccount(): Promise<{ uid: string; user: UserAccount; raw: DocumentData }> {
  const session = await getSessionContext();
  if (!session) {
    throw new ApiError('Please sign in or register an account.', 401, 'UNAUTHENTICATED');
  }
  const path = `users/${session.uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', session.uid));
    if (!snap.exists()) {
      setToken(null);
      throw new ApiError('Session expired. Please sign in again.', 401, 'UNAUTHENTICATED');
    }
    const raw = snap.data();
    if (raw.tagline === REMOVED_ACCOUNT_MARKER) {
      setToken(null);
      throw new ApiError('This account has been removed.', 401, 'UNAUTHENTICATED');
    }
    return { uid: session.uid, user: normalizeUserDoc(raw), raw };
  } catch (err) {
    return wrapFirestoreError(err, OperationType.GET, path);
  }
}

async function resolveUsernameTarget(
  targetUsername: string
): Promise<{ isReal: boolean; uid?: string; canonicalUsername: string }> {
  const clean = targetUsername.trim();
  const lower = clean.toLowerCase();
  if (!lower) return { isReal: false, canonicalUsername: clean };

  try {
    const claimSnap = await getDoc(doc(db, 'usernames', lower));
    if (claimSnap.exists()) {
      const data = claimSnap.data();
      return {
        isReal: true,
        uid: String(data.uid),
        canonicalUsername: String(data.username),
      };
    }
  } catch (err) {
    wrapFirestoreError(err, OperationType.GET, `usernames/${lower}`);
  }

  const seedMatch = Object.keys(SEED_TRADERS).find((k) => k.toLowerCase() === lower);
  return {
    isReal: false,
    canonicalUsername: seedMatch ?? clean,
  };
}

export async function fetchTradeMessages(tradeId: string): Promise<TradeMessage[]> {
  const path = `trades/${tradeId}/messages`;
  try {
    const q = query(
      collection(db, 'trades', tradeId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(80)
    );
    const snap = await getDocs(q);
    return snap.docs.reverse().map((d) => {
      const m = d.data();
      return {
        id: String(m.id ?? d.id),
        sender: String(m.sender ?? 'System'),
        text: String(m.text ?? ''),
        timestamp: tsToIso(m.createdAt),
        isSystem: typeof m.isSystem === 'boolean' ? m.isSystem : undefined,
      };
    });
  } catch (err) {
    return wrapFirestoreError(err, OperationType.LIST, path);
  }
}

export async function fetchChatMessages(chatId: string): Promise<DirectMessage[]> {
  const path = `chats/${chatId}/messages`;
  try {
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(80)
    );
    const snap = await getDocs(q);
    return snap.docs.reverse().map((d) => {
      const m = d.data();
      return {
        id: String(m.id ?? d.id),
        sender: String(m.sender ?? ''),
        senderUid: typeof m.senderUid === 'string' ? m.senderUid : undefined,
        text: String(m.text ?? ''),
        timestamp: tsToIso(m.createdAt),
        offerId: typeof m.offerId === 'string' ? m.offerId : undefined,
      };
    });
  } catch (err) {
    return wrapFirestoreError(err, OperationType.LIST, path);
  }
}

export async function claimPendingTradeSettlements(
  uid: string,
  user: UserAccount
): Promise<{ user: UserAccount; updated: boolean }> {
  let snap;
  try {
    const q = query(collection(db, 'trades'), where('participantUids', 'array-contains', uid));
    snap = await getDocs(q);
  } catch (err) {
    if (isPermissionDenied(err)) handleFirestoreError(err, OperationType.LIST, 'trades');
    return { user, updated: false };
  }

  let nextBalances = { ...user.balances };
  const batch = writeBatch(db);
  let hasClaims = false;

  for (const d of snap.docs) {
    const t = d.data();
    const status = String(t.status ?? '');
    const buyerUid = String(t.buyerUid ?? '');
    const sellerUid = String(t.sellerUid ?? '');
    const side = String(t.side ?? '');
    const cryptoAsset = t.crypto as CryptoAsset;
    const cryptoAmt = Number(t.cryptoAmount ?? 0);

    if (status === 'completed') {
      if (buyerUid === uid && t.buyerSettled !== true && cryptoAmt > 0) {
        nextBalances[cryptoAsset] = Number(
          ((nextBalances[cryptoAsset] ?? 0) + cryptoAmt).toFixed(8)
        );
        batch.update(doc(db, 'trades', d.id), {
          buyerSettled: true,
          updatedAt: serverTimestamp(),
        });
        hasClaims = true;
      } else if (
        sellerUid === uid &&
        t.sellerSettled !== true &&
        side === 'swap_crypto' &&
        t.swapToCrypto &&
        Number(t.swapToAmount ?? 0) > 0
      ) {
        const recvAsset = t.swapToCrypto as CryptoAsset;
        const recvAmt = Number(t.swapToAmount);
        nextBalances[recvAsset] = Number(((nextBalances[recvAsset] ?? 0) + recvAmt).toFixed(8));
        batch.update(doc(db, 'trades', d.id), {
          sellerSettled: true,
          updatedAt: serverTimestamp(),
        });
        hasClaims = true;
      }
    } else if (status === 'cancelled') {
      const sellerHadFunded =
        (t.lastReadAtBy?.__escrowState === 'funded' ||
          (side === 'buy_crypto' && t.lastReadAtBy?.__escrowState !== 'awaiting_seller')) &&
        t.lastReadAtBy?.__adminEscrowOverride !== '1';
      if (
        sellerUid === uid &&
        t.sellerRefunded !== true &&
        sellerHadFunded &&
        cryptoAmt > 0
      ) {
        nextBalances[cryptoAsset] = Number(
          ((nextBalances[cryptoAsset] ?? 0) + cryptoAmt).toFixed(8)
        );
        batch.update(doc(db, 'trades', d.id), {
          sellerRefunded: true,
          updatedAt: serverTimestamp(),
        });
        hasClaims = true;
      } else if (
        buyerUid === uid &&
        t.buyerRefunded !== true &&
        side === 'swap_crypto' &&
        t.swapToCrypto &&
        Number(t.swapToAmount ?? 0) > 0
      ) {
        const swapAsset = t.swapToCrypto as CryptoAsset;
        const swapAmt = Number(t.swapToAmount);
        nextBalances[swapAsset] = Number(((nextBalances[swapAsset] ?? 0) + swapAmt).toFixed(8));
        batch.update(doc(db, 'trades', d.id), {
          buyerRefunded: true,
          updatedAt: serverTimestamp(),
        });
        hasClaims = true;
      }
    }
  }

  if (!hasClaims) return { user, updated: false };

  batch.update(doc(db, 'users', uid), {
    balances: nextBalances,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return {
      user: { ...user, balances: nextBalances },
      updated: true,
    };
  } catch (err) {
    return wrapFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }
}

function createNotificationPayload(params: {
  id: string;
  toUid: string;
  fromUid: string;
  type: AppNotification['type'];
  title: string;
  body: string;
  tradeId?: string;
  offerId?: string;
  chatId?: string;
  fromUsername?: string;
}) {
  return stripUndefined({
    id: params.id,
    toUid: params.toUid,
    fromUid: params.fromUid,
    type: params.type,
    title: params.title.slice(0, 160),
    body: params.body.slice(0, 400),
    tradeId: params.tradeId?.slice(0, 64),
    offerId: params.offerId?.slice(0, 64),
    chatId: params.chatId?.slice(0, 128),
    fromUsername: params.fromUsername?.slice(0, 40),
    read: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Exported Firebase-backed API
// ---------------------------------------------------------------------------
export const api = {
  getPrices: (refresh = false) => fetchLivePrices(refresh),

  async register(payload: {
    username: string;
    password: string;
    confirmPassword?: string;
    pgpKey?: string;
    bio?: string;
    avatarUrl?: string;
    tagline?: string;
  }): Promise<{ token: string; user: UserAccount }> {
    const cleanUsername = (payload.username ?? '').trim();
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(cleanUsername)) {
      throw new ApiError(
        'Username must be 3-24 characters (letters, numbers, underscore only).',
        400,
        'INVALID_USERNAME'
      );
    }

    const password = String(payload.password ?? '');
    if (password.length < 6) {
      throw new ApiError('Password must be at least 6 characters.', 400, 'INVALID_PASSWORD');
    }
    if (payload.confirmPassword !== undefined && payload.confirmPassword !== password) {
      throw new ApiError('Passwords do not match.', 400, 'PASSWORD_MISMATCH');
    }

    const lower = cleanUsername.toLowerCase();
    if (Object.keys(SEED_TRADERS).some((k) => k.toLowerCase() === lower)) {
      throw new ApiError('Username already taken.', 409, 'USERNAME_TAKEN');
    }

    const [claimSnap, credSnap] = await Promise.all([
      getDoc(doc(db, 'usernames', lower)).catch((err) =>
        wrapFirestoreError(err, OperationType.GET, `usernames/${lower}`)
      ),
      getDoc(doc(db, 'authCredentials', lower)).catch((err) =>
        wrapFirestoreError(err, OperationType.GET, `authCredentials/${lower}`)
      ),
    ]);
    if (claimSnap.exists() || credSnap.exists()) {
      throw new ApiError('Username already taken.', 409, 'USERNAME_TAKEN');
    }

    const uid = lower;
    const salt = randomHex(16);
    const passwordHash = await hashPassword(password, salt);
    const token = randomHex(32);

    const cleanBio =
      (payload.bio ?? '').trim().slice(0, 320) || 'Privacy-focused P2P trader on OOSAB. Zero KYC.';
    const cleanPgp = (payload.pgpKey ?? '').trim().slice(0, 120) || generatePgpFingerprint();
    const cleanAvatar = sanitizeImageField(payload.avatarUrl) || undefined;
    const cleanTagline =
      typeof payload.tagline === 'string' && payload.tagline.trim()
        ? payload.tagline.trim().slice(0, 90)
        : undefined;
    const recoveryPhrase = generateRecoveryPhrase();
    const balances = createZeroBalances();
    const depositAddresses = createAllDepositAddresses();
    const settings = { ...DEFAULT_SETTINGS };
    const nowIso = new Date().toISOString();

    const batch = writeBatch(db);

    batch.set(doc(db, 'authCredentials', lower), {
      uid,
      username: cleanUsername,
      lowerUsername: lower,
      passwordHash,
      salt,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'usernames', lower), {
      uid,
      username: cleanUsername,
      lowerUsername: lower,
      createdAt: serverTimestamp(),
    });

    batch.set(
      doc(db, 'traders', cleanUsername),
      stripUndefined({
        ownerUid: uid,
        username: cleanUsername,
        lowerUsername: lower,
        isRegisteredUser: true,
        joinedAt: nowIso.slice(0, 10),
        tradesCount: 0,
        ratingPct: 100,
        avgReleaseMinutes: 5,
        lastSeenMinutes: 0,
        verified: false,
        languages: ['English'],
        pgpFingerprint: cleanPgp.slice(0, 49),
        bio: cleanBio,
        avatarUrl: cleanAvatar,
        tagline: cleanTagline,
        accentTheme: 'emerald',
        preferredMethods: [],
        volumeTier: 'Starter',
        recentFeedback: [],
        tradeHistory: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    batch.set(
      doc(db, 'users', uid),
      stripUndefined({
        uid,
        username: cleanUsername,
        bio: cleanBio,
        avatarUrl: cleanAvatar,
        tagline: cleanTagline,
        accentTheme: 'emerald',
        languages: ['English'],
        preferredMethods: [],
        pgpKey: cleanPgp,
        recoveryPhrase,
        balances,
        depositAddresses,
        walletHistory: [],
        settings,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    batch.set(doc(db, 'sessions', token), {
      token,
      uid,
      username: cleanUsername,
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
      setToken(token);
    } catch (err) {
      return wrapFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    }

    return {
      token,
      user: {
        username: cleanUsername,
        bio: cleanBio,
        avatarUrl: cleanAvatar,
        tagline: cleanTagline,
        accentTheme: 'emerald',
        languages: ['English'],
        preferredMethods: [],
        createdAt: nowIso,
        pgpKey: cleanPgp,
        recoveryPhrase,
        balances,
        depositAddresses,
        walletHistory: [],
        settings,
      },
    };
  },

  async login(payload: {
    username: string;
    password: string;
  }): Promise<{ token: string; user: UserAccount }> {
    const clean = (payload.username ?? '').trim();
    const password = String(payload.password ?? '');
    if (!clean || !password) {
      throw new ApiError('Username and password required.', 400, 'MISSING_CREDENTIALS');
    }

    const lower = clean.toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(lower)) {
      throw new ApiError('Invalid username or password.', 401, 'INVALID_CREDENTIALS');
    }

    let credSnap;
    try {
      credSnap = await getDoc(doc(db, 'authCredentials', lower));
    } catch (err) {
      return wrapFirestoreError(err, OperationType.GET, `authCredentials/${lower}`);
    }

    if (!credSnap.exists()) {
      throw new ApiError('Invalid username or password.', 401, 'INVALID_CREDENTIALS');
    }

    const cred = credSnap.data();
    const expectedHash = await hashPassword(password, String(cred.salt ?? ''));
    if (expectedHash !== String(cred.passwordHash ?? '')) {
      throw new ApiError('Invalid username or password.', 401, 'INVALID_CREDENTIALS');
    }

    const uid = String(cred.uid);
    const canonicalUsername = String(cred.username);
    const userSnap = await getDoc(doc(db, 'users', uid)).catch((err) =>
      wrapFirestoreError(err, OperationType.GET, `users/${uid}`)
    );
    if (!userSnap.exists()) {
      throw new ApiError('Account record not found.', 404, 'USER_NOT_FOUND');
    }

    let user = normalizeUserDoc(userSnap.data());
    if (user.tagline === REMOVED_ACCOUNT_MARKER) {
      throw new ApiError('This account has been removed.', 403, 'ACCOUNT_REMOVED');
    }
    const token = randomHex(32);

    const batch = writeBatch(db);
    batch.set(doc(db, 'sessions', token), {
      token,
      uid,
      username: canonicalUsername,
      createdAt: serverTimestamp(),
    });
    batch.update(doc(db, 'traders', canonicalUsername), {
      lastSeenMinutes: user.settings?.hideOnlineStatus ? 15 : 0,
      updatedAt: serverTimestamp(),
    });

    try {
      await batch.commit();
      setToken(token);
    } catch (err) {
      return wrapFirestoreError(err, OperationType.WRITE, `sessions/${token}`);
    }

    const settled = await claimPendingTradeSettlements(uid, user);
    user = settled.user;
    return { token, user };
  },

  async getMe(): Promise<{ user: UserAccount }> {
    const { uid, user } = await requireCurrentAccount();
    const settled = await claimPendingTradeSettlements(uid, user);
    return { user: settled.user };
  },

  async logout(): Promise<{ ok: boolean }> {
    const token = getToken();
    setToken(null);
    if (token && /^[a-zA-Z0-9_-]{1,128}$/.test(token)) {
      await deleteDoc(doc(db, 'sessions', token)).catch(() => undefined);
    }
    return { ok: true };
  },

  async getOffers(): Promise<{ offers: P2POffer[]; traders: Record<string, TraderProfile> }> {
    try {
      const [offersSnap, tradersSnap] = await Promise.all([
        getDocs(collection(db, 'offers')),
        getDocs(collection(db, 'traders')),
      ]);

      const customOffers = offersSnap.docs
        .map((d) => normalizeOfferDoc(d.data()))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const removedUsernames = new Set<string>();
      const traders: Record<string, TraderProfile> = { ...SEED_TRADERS };
      for (const d of tradersSnap.docs) {
        const raw = d.data();
        const t = normalizeTraderDoc(raw);
        if (raw.tagline === REMOVED_ACCOUNT_MARKER) {
          if (t.username) removedUsernames.add(t.username.toLowerCase());
          continue;
        }
        if (t.username) traders[t.username] = t;
      }

      const visibleCustomOffers = customOffers.filter(
        (o) => !removedUsernames.has(o.traderUsername.toLowerCase())
      );
      const customIds = new Set(visibleCustomOffers.map((o) => o.id.toLowerCase()));
      const offers = [
        ...visibleCustomOffers,
        ...SEED_OFFERS.filter((o) => !customIds.has(o.id.toLowerCase())),
      ];

      return { offers, traders };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.LIST, 'offers');
    }
  },

  async getOfferById(id: string): Promise<{ offer: P2POffer; trader?: TraderProfile }> {
    const cleanId = id.trim();
    if (!cleanId) throw new ApiError('Offer ad not found', 404, 'OFFER_NOT_FOUND');

    let offer: P2POffer | undefined;
    if (/^[a-zA-Z0-9_-]{1,128}$/.test(cleanId)) {
      try {
        const directSnap = await getDoc(doc(db, 'offers', cleanId));
        if (directSnap.exists()) {
          offer = normalizeOfferDoc(directSnap.data());
        } else {
          const allSnap = await getDocs(collection(db, 'offers'));
          const match = allSnap.docs.find((d) => d.id.toLowerCase() === cleanId.toLowerCase());
          if (match) offer = normalizeOfferDoc(match.data());
        }
      } catch (err) {
        return wrapFirestoreError(err, OperationType.GET, `offers/${cleanId}`);
      }
    }

    if (!offer) {
      offer = SEED_OFFERS.find((o) => o.id.toLowerCase() === cleanId.toLowerCase());
    }
    if (!offer) {
      throw new ApiError('Offer ad not found', 404, 'OFFER_NOT_FOUND');
    }

    let trader: TraderProfile | undefined;
    try {
      const tSnap = await getDoc(doc(db, 'traders', offer.traderUsername));
      if (tSnap.exists()) {
        trader = normalizeTraderDoc(tSnap.data());
      }
    } catch {
      // fallback to seed trader
    }
    if (!trader) {
      const seedKey = Object.keys(SEED_TRADERS).find(
        (k) => k.toLowerCase() === offer!.traderUsername.toLowerCase()
      );
      if (seedKey) {
        trader = buildTraderDetails(SEED_TRADERS[seedKey], [offer, ...SEED_OFFERS]);
      }
    }
    return { offer, trader };
  },

  async getUserDirectory(): Promise<{ users: DirectoryUser[] }> {
    try {
      const [usersSnap, tradersSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'traders')),
      ]);
      const traderMap = new Map<string, TraderProfile>();
      tradersSnap.docs.forEach((d) => {
        const t = normalizeTraderDoc(d.data());
        traderMap.set(t.username.toLowerCase(), t);
      });
      const users: DirectoryUser[] = [];
      for (const d of usersSnap.docs) {
        const raw = d.data();
        if (raw.tagline === REMOVED_ACCOUNT_MARKER) continue;
        const u = normalizeUserDoc(raw);
        const t = traderMap.get(u.username.toLowerCase());
        if (t?.tagline === REMOVED_ACCOUNT_MARKER) continue;
        const walletMessages = (u.walletHistory ?? [])
          .filter((tx) => typeof tx.message === 'string' && tx.message.trim().length > 0)
          .map((tx) => ({
            id: tx.id,
            crypto: tx.crypto,
            network: tx.network,
            message: tx.message!.trim(),
            timestamp: tx.timestamp,
          }));
        users.push({
          username: u.username,
          createdAt: u.createdAt,
          joinedAt: t?.joinedAt ?? u.createdAt.slice(0, 10),
          balances: u.balances,
          tradesCount: t?.tradesCount ?? 0,
          ratingPct: t?.ratingPct ?? 100,
          feedbackCount: t?.recentFeedback?.length ?? 0,
          verified: t?.verified ?? false,
          walletMessages,
        });
      }
      users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return { users };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.LIST, 'users');
    }
  },

  async getTrader(username: string): Promise<{
    trader: TraderProfile;
    offers: P2POffer[];
    isOnline?: boolean;
    isRegisteredUser?: boolean;
  }> {
    const clean = username.trim();
    const lower = clean.toLowerCase();
    if (!clean) throw new ApiError('Trader not found', 404, 'TRADER_NOT_FOUND');

    let canonical = clean;
    let isRegisteredUser = false;
    try {
      const claimSnap = await getDoc(doc(db, 'usernames', lower));
      if (claimSnap.exists()) {
        canonical = String(claimSnap.data().username ?? clean);
        isRegisteredUser = true;
      }
    } catch {
      // ignore invalid id characters when probing seed profiles
    }

    let baseTrader: TraderProfile | undefined;
    let isRemovedAccount = false;
    try {
      const tSnap = await getDoc(doc(db, 'traders', canonical));
      if (tSnap.exists()) {
        const rawT = tSnap.data();
        if (rawT.tagline === REMOVED_ACCOUNT_MARKER) {
          isRemovedAccount = true;
        } else {
          baseTrader = normalizeTraderDoc(rawT);
          isRegisteredUser = Boolean(rawT.isRegisteredUser);
        }
      }
    } catch {
      // continue to seed fallback
    }

    if (isRemovedAccount) {
      throw new ApiError('Trader not found', 404, 'TRADER_NOT_FOUND');
    }

    if (!baseTrader) {
      const seedKey = Object.keys(SEED_TRADERS).find((k) => k.toLowerCase() === lower);
      if (seedKey) {
        canonical = seedKey;
        baseTrader = SEED_TRADERS[seedKey];
      }
    }

    if (!baseTrader) {
      throw new ApiError('Trader not found', 404, 'TRADER_NOT_FOUND');
    }

    let customOffers: P2POffer[] = [];
    try {
      const q = query(collection(db, 'offers'), where('traderUsername', '==', canonical));
      const snap = await getDocs(q);
      customOffers = snap.docs.map((d) => normalizeOfferDoc(d.data()));
    } catch {
      // ignore transient query error
    }

    const customIds = new Set(customOffers.map((o) => o.id.toLowerCase()));
    const allTraderOffers = [
      ...customOffers,
      ...SEED_OFFERS.filter(
        (o) =>
          o.traderUsername.toLowerCase() === canonical.toLowerCase() &&
          !customIds.has(o.id.toLowerCase())
      ),
    ];

    const detailed = isRegisteredUser
      ? baseTrader
      : buildTraderDetails(baseTrader, [...customOffers, ...SEED_OFFERS]);

    return {
      trader: detailed,
      offers: allTraderOffers.filter((o) => o.active),
      isOnline: detailed.lastSeenMinutes === 0,
      isRegisteredUser,
    };
  },

  async getTraderTrades(
    username: string,
    offset = 0,
    limit = 20
  ): Promise<{ items: TraderTradeRecord[]; total: number; hasMore: boolean }> {
    const { trader } = await api.getTrader(username);
    const seedKey = Object.keys(SEED_TRADERS).find(
      (k) => k.toLowerCase() === trader.username.toLowerCase()
    );
    if (!seedKey) {
      const list = trader.tradeHistory ?? [];
      return {
        items: list.slice(offset, offset + limit),
        total: list.length,
        hasMore: offset + limit < list.length,
      };
    }
    return generateTraderTradesPage(trader, SEED_OFFERS, offset, limit);
  },

  async getTraderFeedback(
    username: string,
    offset = 0,
    limit = 20
  ): Promise<{ items: TraderFeedback[]; total: number; hasMore: boolean }> {
    const { trader } = await api.getTrader(username);
    const seedKey = Object.keys(SEED_TRADERS).find(
      (k) => k.toLowerCase() === trader.username.toLowerCase()
    );
    if (!seedKey) {
      const list = trader.recentFeedback ?? [];
      return {
        items: list.slice(offset, offset + limit),
        total: list.length,
        hasMore: offset + limit < list.length,
      };
    }
    return generateTraderFeedbackPage(trader, SEED_OFFERS, offset, limit);
  },

  async updateProfile(
    payload: ProfileUpdatePayload
  ): Promise<{ user: UserAccount; trader: TraderProfile }> {
    const { uid, user } = await requireCurrentAccount();
    const userUpdates: Record<string, unknown> = { updatedAt: serverTimestamp() };
    const traderUpdates: Record<string, unknown> = { updatedAt: serverTimestamp() };

    if (typeof payload.bio === 'string') {
      const b = payload.bio.trim().slice(0, 320);
      userUpdates.bio = b;
      traderUpdates.bio = b;
    }
    if (typeof payload.pgpKey === 'string' && payload.pgpKey.trim()) {
      const p = payload.pgpKey.trim().slice(0, 120);
      userUpdates.pgpKey = p;
      traderUpdates.pgpFingerprint = p.slice(0, 49);
    }
    if (payload.avatarUrl !== undefined) {
      const safe = sanitizeImageField(payload.avatarUrl);
      if (safe === undefined) throw new ApiError('Invalid profile image format or size.', 400);
      userUpdates.avatarUrl = safe || null;
      traderUpdates.avatarUrl = safe || null;
    }
    if (payload.bannerUrl !== undefined) {
      const safe = sanitizeImageField(payload.bannerUrl);
      if (safe === undefined) throw new ApiError('Invalid banner image format or size.', 400);
      userUpdates.bannerUrl = safe || null;
      traderUpdates.bannerUrl = safe || null;
    }
    if (typeof payload.tagline === 'string') {
      const t = payload.tagline.trim().slice(0, 90) || null;
      userUpdates.tagline = t;
      traderUpdates.tagline = t;
    }
    if (typeof payload.location === 'string') {
      const l = payload.location.trim().slice(0, 60) || null;
      userUpdates.location = l;
      traderUpdates.location = l;
    }
    if (typeof payload.tradingHours === 'string') {
      const h = payload.tradingHours.trim().slice(0, 60) || null;
      userUpdates.tradingHours = h;
      traderUpdates.tradingHours = h;
    }
    if (payload.accentTheme && ALLOWED_PROFILE_THEMES.has(payload.accentTheme)) {
      userUpdates.accentTheme = payload.accentTheme;
      traderUpdates.accentTheme = payload.accentTheme;
    }
    const cleanLangs = sanitizeStringArray(payload.languages, 6, 24);
    if (cleanLangs && cleanLangs.length > 0) {
      userUpdates.languages = cleanLangs;
      traderUpdates.languages = cleanLangs;
    }
    const cleanMethods = sanitizeStringArray(payload.preferredMethods, 6, 36);
    if (cleanMethods) {
      userUpdates.preferredMethods = cleanMethods;
      traderUpdates.preferredMethods = cleanMethods;
    }

    const batch = writeBatch(db);
    batch.update(doc(db, 'users', uid), userUpdates);
    batch.update(doc(db, 'traders', user.username), traderUpdates);

    try {
      await batch.commit();
      const [uSnap, tSnap] = await Promise.all([
        getDoc(doc(db, 'users', uid)),
        getDoc(doc(db, 'traders', user.username)),
      ]);
      return {
        user: uSnap.exists() ? normalizeUserDoc(uSnap.data()) : user,
        trader: tSnap.exists()
          ? normalizeTraderDoc(tSnap.data())
          : (await api.getTrader(user.username)).trader,
      };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    }
  },

  async updateSettings(payload: Record<string, unknown>): Promise<{ user: UserAccount }> {
    const { uid, user } = await requireCurrentAccount();

    const newPassword = typeof payload.newPassword === 'string' ? payload.newPassword : '';
    const confirmNewPassword =
      typeof payload.confirmNewPassword === 'string' ? payload.confirmNewPassword : undefined;
    if (newPassword) {
      if (newPassword.length < 6) {
        throw new ApiError('New password must be at least 6 characters.', 400);
      }
      if (confirmNewPassword !== undefined && confirmNewPassword !== newPassword) {
        throw new ApiError('Passwords do not match.', 400);
      }
    }

    const nextSettings: UserSettings = { ...user.settings };
    if (typeof payload.preferredCurrency === 'string') {
      nextSettings.preferredCurrency = payload.preferredCurrency as FiatCurrency;
    }
    if (typeof payload.defaultPaymentWindow === 'number') {
      nextSettings.defaultPaymentWindow = payload.defaultPaymentWindow;
    }
    if (typeof payload.autoPgpSign === 'boolean') nextSettings.autoPgpSign = payload.autoPgpSign;
    if (typeof payload.hideOnlineStatus === 'boolean') {
      nextSettings.hideOnlineStatus = payload.hideOnlineStatus;
    }
    if (typeof payload.torFriendlyMode === 'boolean') {
      nextSettings.torFriendlyMode = payload.torFriendlyMode;
    }
    if (typeof payload.escrowAlerts === 'boolean') nextSettings.escrowAlerts = payload.escrowAlerts;

    const batch = writeBatch(db);
    batch.update(doc(db, 'users', uid), {
      settings: nextSettings,
      updatedAt: serverTimestamp(),
    });
    if (typeof payload.hideOnlineStatus === 'boolean') {
      batch.update(doc(db, 'traders', user.username), {
        lastSeenMinutes: payload.hideOnlineStatus ? 15 : 0,
        updatedAt: serverTimestamp(),
      });
    }

    if (newPassword) {
      const salt = randomHex(16);
      const passwordHash = await hashPassword(newPassword, salt);
      const credRef = doc(db, 'authCredentials', uid);
      const credSnap = await getDoc(credRef).catch(() => null);
      if (credSnap?.exists()) {
        batch.update(credRef, {
          passwordHash,
          salt,
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(credRef, {
          uid,
          username: user.username,
          lowerUsername: uid,
          passwordHash,
          salt,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    try {
      await batch.commit();
      return { user: { ...user, settings: nextSettings } };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  },

  async createOffer(payload: Partial<P2POffer>): Promise<{ offer: P2POffer }> {
    const { uid, user } = await requireCurrentAccount();
    if (!payload.crypto || !payload.side) {
      throw new ApiError('Missing required offer fields.', 400);
    }

    const prices = await fetchLivePrices();
    const isSwap = payload.side === 'swap_crypto';
    const offerId = `off-${randomHex(3)}`;

    if (isSwap) {
      if (!payload.swapToCrypto || payload.swapToCrypto === payload.crypto) {
        throw new ApiError('Select a different cryptocurrency to receive in the swap.', 400);
      }
      const minSwap = Number(payload.minSwapAmount);
      const maxSwap = Number(payload.maxSwapAmount);
      if (!Number.isFinite(minSwap) || !Number.isFinite(maxSwap) || minSwap <= 0 || maxSwap < minSwap) {
        throw new ApiError('Maximum swap limit must be greater than or equal to minimum.', 400);
      }

      const offerUsd = prices.usdPrices[payload.crypto] ?? DEFAULT_USD_PRICES[payload.crypto] ?? 1;
      const wantUsd =
        prices.usdPrices[payload.swapToCrypto] ?? DEFAULT_USD_PRICES[payload.swapToCrypto] ?? 1;
      const margin = Number.isFinite(Number(payload.marginPct)) ? Number(payload.marginPct) : 0;
      const crossRate = wantUsd > 0 ? offerUsd / wantUsd : 1;
      const unitPrice =
        payload.pricingMode === 'fixed' && Number(payload.fixedPrice) > 0
          ? Number(payload.fixedPrice)
          : crossRate * (1 + margin / 100);
      const minCryptoEq = unitPrice > 0 ? minSwap / unitPrice : 0;
      const maxCryptoEq = unitPrice > 0 ? maxSwap / unitPrice : 0;
      const parsedAvail = Number(payload.availableCrypto);

      if (Number.isFinite(parsedAvail) && parsedAvail > 0 && parsedAvail < minCryptoEq * 0.999) {
        throw new ApiError(
          `Available ${payload.crypto} (${parsedAvail}) must cover at least your minimum swap limit (${minCryptoEq.toFixed(6)} ${payload.crypto}).`,
          400
        );
      }

      const minFiat = Math.max(1, Math.round(minSwap * wantUsd));
      const maxFiat = Math.max(minFiat, Math.round(maxSwap * wantUsd));
      const nowIso = new Date().toISOString();

      const docData = stripUndefined({
        id: offerId,
        ownerUid: uid,
        side: 'swap_crypto' as const,
        traderUsername: user.username,
        crypto: payload.crypto,
        cryptoChain: resolveAssetChain(payload.crypto, payload.cryptoChain),
        swapToCrypto: payload.swapToCrypto,
        swapToChain: resolveAssetChain(payload.swapToCrypto, payload.swapToChain),
        fiat: 'USD' as FiatCurrency,
        country: (payload.country || 'Global').slice(0, 64),
        paymentMethod: (payload.paymentMethod || 'OOSAB P2P Escrow Swap').slice(0, 80),
        paymentCategory: 'Crypto Swap' as const,
        pricingMode: (payload.pricingMode === 'fixed' ? 'fixed' : 'margin') as 'margin' | 'fixed',
        marginPct: Math.max(-50, Math.min(200, margin)),
        fixedPrice:
          payload.pricingMode === 'fixed' && Number(payload.fixedPrice) > 0
            ? Number(payload.fixedPrice)
            : undefined,
        minFiat,
        maxFiat,
        minSwapAmount: minSwap,
        maxSwapAmount: maxSwap,
        availableCrypto: Number.isFinite(parsedAvail) && parsedAvail > 0 ? parsedAvail : undefined,
        paymentWindowMinutes: Math.max(5, Math.min(180, Number(payload.paymentWindowMinutes) || 30)),
        tags:
          Array.isArray(payload.tags) && payload.tags.length > 0
            ? payload.tags.slice(0, 10)
            : (['No ID Required', 'Instant Release'] as P2POffer['tags']),
        terms:
          (payload.terms ?? '').trim().slice(0, 2000) ||
          `Direct user-to-user ${payload.swapToCrypto} to ${payload.crypto} escrow swap. Zero ID verification required.`,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      try {
        await setDoc(doc(db, 'offers', offerId), docData);
        return { offer: { ...normalizeOfferDoc(docData), createdAt: nowIso } };
      } catch (err) {
        return wrapFirestoreError(err, OperationType.CREATE, `offers/${offerId}`);
      }
    }

    if (!payload.fiat || !payload.paymentMethod) {
      throw new ApiError('Missing required offer fields.', 400);
    }
    const minFiat = Number(payload.minFiat);
    const maxFiat = Number(payload.maxFiat);
    if (!Number.isFinite(minFiat) || !Number.isFinite(maxFiat) || minFiat <= 0 || maxFiat < minFiat) {
      throw new ApiError('Maximum trade limit must be greater than or equal to minimum.', 400);
    }

    if (payload.side === 'sell_crypto') {
      const usdSpot = prices.usdPrices[payload.crypto] ?? DEFAULT_USD_PRICES[payload.crypto] ?? 1;
      const fiatRate = prices.fiatRatesFromUsd[payload.fiat] ?? 1;
      const margin = Number.isFinite(Number(payload.marginPct)) ? Number(payload.marginPct) : 0;
      const unitPrice =
        payload.pricingMode === 'fixed' && Number(payload.fixedPrice) > 0
          ? Number(payload.fixedPrice)
          : usdSpot * fiatRate * (1 + margin / 100);
      const minCryptoEq = unitPrice > 0 ? minFiat / unitPrice : 0;
      const maxCryptoEq = unitPrice > 0 ? maxFiat / unitPrice : 0;
      const parsedAvail = Number(payload.availableCrypto);

      if (Number.isFinite(parsedAvail) && parsedAvail > 0 && parsedAvail < minCryptoEq * 0.999) {
        throw new ApiError(
          `Available ${payload.crypto} (${parsedAvail}) must be at least ${minCryptoEq.toFixed(6)} ${payload.crypto} to cover your minimum ${minFiat} ${payload.fiat} trade limit.`,
          400
        );
      }
    }

    const nowIso = new Date().toISOString();
    const docData = stripUndefined({
      id: offerId,
      ownerUid: uid,
      side: payload.side,
      traderUsername: user.username,
      crypto: payload.crypto,
      cryptoChain: resolveAssetChain(payload.crypto, payload.cryptoChain),
      fiat: payload.fiat,
      country: (payload.country || 'Global').slice(0, 64),
      paymentMethod: payload.paymentMethod.slice(0, 80),
      paymentCategory: (payload.paymentCategory || 'Online Wallets').slice(0, 40),
      pricingMode: (payload.pricingMode === 'fixed' ? 'fixed' : 'margin') as 'margin' | 'fixed',
      marginPct: Math.max(
        -50,
        Math.min(200, Number.isFinite(Number(payload.marginPct)) ? Number(payload.marginPct) : 0)
      ),
      fixedPrice:
        payload.pricingMode === 'fixed' && Number(payload.fixedPrice) > 0
          ? Number(payload.fixedPrice)
          : undefined,
      minFiat,
      maxFiat,
      availableCrypto:
        payload.availableCrypto && Number(payload.availableCrypto) > 0
          ? Number(payload.availableCrypto)
          : undefined,
      paymentWindowMinutes: Math.max(5, Math.min(180, Number(payload.paymentWindowMinutes) || 30)),
      tags:
        Array.isArray(payload.tags) && payload.tags.length > 0
          ? payload.tags.slice(0, 10)
          : (['No ID Required'] as P2POffer['tags']),
      terms:
        (payload.terms ?? '').trim().slice(0, 2000) ||
        'Fast settlement. Zero ID verification required.',
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      await setDoc(doc(db, 'offers', offerId), docData);
      return { offer: { ...normalizeOfferDoc(docData), createdAt: nowIso } };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.CREATE, `offers/${offerId}`);
    }
  },

  async updateOffer(
    id: string,
    payload: { active?: boolean; marginPct?: number }
  ): Promise<{ offer: P2POffer }> {
    const { user } = await requireCurrentAccount();
    const path = `offers/${id}`;
    try {
      const ref = doc(db, 'offers', id);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new ApiError('Offer not found', 404);
      const existing = normalizeOfferDoc(snap.data());
      if (existing.traderUsername.toLowerCase() !== user.username.toLowerCase()) {
        throw new ApiError('You can only modify your own offers', 403);
      }
      const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };
      if (typeof payload.active === 'boolean') updates.active = payload.active;
      if (typeof payload.marginPct === 'number') {
        updates.marginPct = Math.max(-50, Math.min(200, payload.marginPct));
      }
      await updateDoc(ref, updates);
      return {
        offer: {
          ...existing,
          ...(typeof payload.active === 'boolean' ? { active: payload.active } : {}),
          ...(typeof payload.marginPct === 'number' ? { marginPct: updates.marginPct as number } : {}),
        },
      };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  async deleteOffer(id: string): Promise<{ ok: boolean }> {
    await requireCurrentAccount();
    const path = `offers/${id}`;
    try {
      await deleteDoc(doc(db, 'offers', id));
      return { ok: true };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.DELETE, path);
    }
  },

  async getTrades(): Promise<{ trades: TradeOrder[] }> {
    const session = await getSessionContext();
    if (!session) return { trades: [] };
    let viewerUsername: string | undefined = session.username;
    try {
      const uSnap = await getDoc(doc(db, 'users', session.uid));
      if (uSnap.exists()) {
        const acct = normalizeUserDoc(uSnap.data());
        viewerUsername = acct.username;
        await claimPendingTradeSettlements(session.uid, acct);
      }
    } catch {
      // continue
    }

    try {
      const q = query(collection(db, 'trades'), where('participantUids', 'array-contains', session.uid));
      const snap = await getDocs(q);
      const list = await Promise.all(
        snap.docs.map(async (d) => {
          const msgs = await fetchTradeMessages(d.id);
          return normalizeTradeDoc(d.data(), msgs, viewerUsername);
        })
      );
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return { trades: list };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.LIST, 'trades');
    }
  },

  async openTrade(
    offerId: string,
    fiatAmount: number,
    swapAmount?: number
  ): Promise<{ trade: TradeOrder; user: UserAccount }> {
    const { uid, user } = await requireCurrentAccount();
    const { offer } = await api.getOfferById(offerId);
    if (!offer.active) {
      throw new ApiError('This offer is currently paused by the maker.', 400);
    }
    if (offer.traderUsername.toLowerCase() === user.username.toLowerCase()) {
      throw new ApiError('You cannot place a trade on your own offer.', 400);
    }

    const prices = await fetchLivePrices();
    const unitPrice = computeOfferUnitPrice(offer, prices);
    const now = Date.now();
    const tradeId = `TRD-${randomHex(3).toUpperCase()}`;
    const target = await resolveUsernameTarget(offer.traderUsername);
    const counterpartyIsReal = target.isReal && Boolean(target.uid);
    const makerUid = counterpartyIsReal
      ? target.uid!
      : sanitizeDocId(`seed_${offer.traderUsername}`);

    const batch = writeBatch(db);
    let nextBalances = { ...user.balances };
    let balancesChanged = false;

    const nowIso = new Date(now).toISOString();
    const expiresAt = new Date(now + offer.paymentWindowMinutes * 60_000).toISOString();

    if (offer.side === 'swap_crypto' && offer.swapToCrypto) {
      const sendAmt = Number(swapAmount ?? fiatAmount);
      const minSwap =
        offer.minSwapAmount ?? offer.minFiat / (prices.usdPrices[offer.swapToCrypto] ?? 1);
      const maxSwap =
        offer.maxSwapAmount ?? offer.maxFiat / (prices.usdPrices[offer.swapToCrypto] ?? 1);
      if (!Number.isFinite(sendAmt) || sendAmt < minSwap * 0.999 || sendAmt > maxSwap * 1.001) {
        throw new ApiError(
          `Swap amount must be between ${minSwap} and ${maxSwap} ${offer.swapToCrypto}.`,
          400
        );
      }
      if ((nextBalances[offer.swapToCrypto] ?? 0) < sendAmt - 1e-8) {
        throw new ApiError(
          `Insufficient ${offer.swapToCrypto} balance in your OOSAB wallet. Deposit ${offer.swapToCrypto} in Profile & Wallet first.`,
          400
        );
      }

      const receiveAmt = sendAmt / unitPrice;
      nextBalances[offer.swapToCrypto] = Number(
        Math.max(0, (nextBalances[offer.swapToCrypto] ?? 0) - sendAmt).toFixed(8)
      );
      balancesChanged = true;

      const usdVal = Number((sendAmt * (prices.usdPrices[offer.swapToCrypto] ?? 1)).toFixed(2));
      const paymentDetails = `Multi-Asset Escrow Lock · ${sendAmt.toFixed(6)} ${offer.swapToCrypto} ↔ ${receiveAmt.toFixed(6)} ${offer.crypto} · Ref: ${tradeId}`;
      const participantUids = counterpartyIsReal ? [uid, makerUid] : [uid];

      const tradeDoc = stripUndefined({
        id: tradeId,
        offerId: offer.id,
        side: 'swap_crypto' as const,
        traderUsername: offer.traderUsername,
        buyerUsername: user.username,
        sellerUsername: offer.traderUsername,
        buyerUid: uid,
        sellerUid: makerUid,
        participantUids,
        crypto: offer.crypto,
        cryptoChain: offer.cryptoChain,
        swapToCrypto: offer.swapToCrypto,
        swapToChain: offer.swapToChain,
        swapToAmount: sendAmt,
        fiat: 'USD' as FiatCurrency,
        fiatAmount: usdVal,
        cryptoAmount: receiveAmt,
        unitPrice,
        paymentMethod: offer.paymentMethod.slice(0, 80),
        paymentDetails: paymentDetails.slice(0, 500),
        terms: offer.terms.slice(0, 2000),
        status: 'escrow_funded' as const,
        counterpartyIsReal,
        buyerSettled: false,
        sellerSettled: false,
        buyerRefunded: false,
        sellerRefunded: false,
        lastReadAtBy: {
          [user.username]: nowIso,
          __escrowState: counterpartyIsReal ? 'awaiting_seller' : 'funded',
        },
        expiresAt,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.set(doc(db, 'trades', tradeId), tradeDoc);
      batch.update(doc(db, 'users', uid), {
        balances: nextBalances,
        updatedAt: serverTimestamp(),
      });

      const sysId = `msg-${randomHex(4)}`;
      const sysText = counterpartyIsReal
        ? `${sendAmt.toFixed(6)} ${offer.swapToCrypto} locked in escrow by ${user.username}. Waiting for @${offer.traderUsername} to fund ${receiveAmt.toFixed(6)} ${offer.crypto} into escrow.`
        : `Both sides funded in OOSAB multi-asset escrow: ${sendAmt.toFixed(6)} ${offer.swapToCrypto} swapped for ${receiveAmt.toFixed(6)} ${offer.crypto} at 1 ${offer.crypto} = ${unitPrice.toFixed(6)} ${offer.swapToCrypto}.`;
      batch.set(doc(db, 'trades', tradeId, 'messages', sysId), {
        id: sysId,
        sender: 'Escrow System',
        senderUid: uid,
        text: sysText,
        isSystem: true,
        createdAt: serverTimestamp(),
      });

      const localMessages: TradeMessage[] = [
        { id: sysId, sender: 'Escrow System', text: sysText, timestamp: nowIso, isSystem: true },
      ];

      if (!counterpartyIsReal) {
        const npcId = `msg-${randomHex(4)}`;
        const npcText = `Hello ${user.username}, my ${receiveAmt.toFixed(6)} ${offer.crypto} is locked in escrow for swap ${tradeId}. Press "Confirm Swap Deposit" to trigger automatic atomic release.`;
        batch.set(doc(db, 'trades', tradeId, 'messages', npcId), {
          id: npcId,
          sender: offer.traderUsername,
          senderUid: uid,
          text: npcText,
          createdAt: serverTimestamp(),
        });
        localMessages.push({
          id: npcId,
          sender: offer.traderUsername,
          text: npcText,
          timestamp: new Date(now + 1000).toISOString(),
        });
      } else {
        const notifId = `ntf-${randomHex(4)}`;
        batch.set(
          doc(db, 'notifications', notifId),
          createNotificationPayload({
            id: notifId,
            toUid: makerUid,
            fromUid: uid,
            type: 'trade_opened',
            title: `New swap trade ${tradeId}`,
            body: `${user.username} opened a ${sendAmt.toFixed(4)} ${offer.swapToCrypto} → ${receiveAmt.toFixed(4)} ${offer.crypto} trade.`,
            tradeId,
            offerId: offer.id,
            fromUsername: user.username,
          })
        );
      }

      try {
        await batch.commit();
        return {
          trade: {
            ...normalizeTradeDoc(tradeDoc, localMessages, user.username),
            createdAt: nowIso,
          },
          user: { ...user, balances: nextBalances },
        };
      } catch (err) {
        return wrapFirestoreError(err, OperationType.WRITE, `trades/${tradeId}`);
      }
    }

    const amount = Number(fiatAmount);
    if (!Number.isFinite(amount) || amount < offer.minFiat || amount > offer.maxFiat) {
      throw new ApiError(
        `Trade amount must be between ${offer.minFiat} and ${offer.maxFiat} ${offer.fiat}.`,
        400
      );
    }

    const cryptoAmount = amount / unitPrice;
    const requiresSellerFundingStep = counterpartyIsReal || offer.side === 'buy_crypto';
    const initialEscrowState = requiresSellerFundingStep ? 'awaiting_seller' : 'funded';

    const paymentDetails =
      offer.paymentCategory === 'Gift Cards'
        ? `Submit unused ${offer.fiat} ${offer.paymentMethod} claim code in the trade chat below.`
        : offer.paymentCategory === 'Debit & Virtual Cards'
          ? `Share ${offer.paymentMethod} virtual/prepaid card transfer or voucher details securely in trade chat · Ref: ${tradeId}`
          : offer.paymentCategory === 'Bank & Wire'
            ? `Account Holder: ${offer.traderUsername} Desk · Reference: ${tradeId}`
            : offer.paymentCategory === 'Cash & In-Person'
              ? `PGP-encrypted meetup/drop coordinates available in trade chat · Ref: ${tradeId}`
              : `Recipient Handle: @${offer.traderUsername.toLowerCase()}_pay · Note: ${tradeId}`;

    const buyerUsername = offer.side === 'sell_crypto' ? user.username : offer.traderUsername;
    const sellerUsername = offer.side === 'sell_crypto' ? offer.traderUsername : user.username;
    const buyerUid = offer.side === 'sell_crypto' ? uid : makerUid;
    const sellerUid = offer.side === 'sell_crypto' ? makerUid : uid;
    const participantUids = counterpartyIsReal ? [uid, makerUid] : [uid];

    const tradeDoc = stripUndefined({
      id: tradeId,
      offerId: offer.id,
      side: offer.side,
      traderUsername: offer.traderUsername,
      buyerUsername,
      sellerUsername,
      buyerUid,
      sellerUid,
      participantUids,
      crypto: offer.crypto,
      cryptoChain: offer.cryptoChain,
      fiat: offer.fiat,
      fiatAmount: amount,
      cryptoAmount,
      unitPrice,
      paymentMethod: offer.paymentMethod.slice(0, 80),
      paymentDetails: paymentDetails.slice(0, 500),
      terms: offer.terms.slice(0, 2000),
      status: 'escrow_funded' as const,
      counterpartyIsReal,
      buyerSettled: false,
      sellerSettled: false,
      buyerRefunded: false,
      sellerRefunded: false,
      lastReadAtBy: {
        [user.username]: nowIso,
        __escrowState: initialEscrowState,
      },
      expiresAt,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'trades', tradeId), tradeDoc);
    if (balancesChanged) {
      batch.update(doc(db, 'users', uid), {
        balances: nextBalances,
        updatedAt: serverTimestamp(),
      });
    }

    const sysId = `msg-${randomHex(4)}`;
    const sysText = requiresSellerFundingStep
      ? `Trade ${tradeId} opened for ${cryptoAmount.toFixed(6)} ${offer.crypto} (${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${offer.fiat}). Waiting for @${sellerUsername} to fund escrow before payment.`
      : `${cryptoAmount.toFixed(6)} ${offer.crypto} is now locked in OOSAB multi-sig escrow at ${unitPrice.toFixed(2)} ${offer.fiat}/${offer.crypto}.`;
    batch.set(doc(db, 'trades', tradeId, 'messages', sysId), {
      id: sysId,
      sender: 'Escrow System',
      senderUid: uid,
      text: sysText,
      isSystem: true,
      createdAt: serverTimestamp(),
    });

    const localMessages: TradeMessage[] = [
      { id: sysId, sender: 'Escrow System', text: sysText, timestamp: nowIso, isSystem: true },
    ];

    if (!counterpartyIsReal) {
      const npcId = `msg-${randomHex(4)}`;
      const npcText =
        offer.side === 'sell_crypto'
          ? `Hello ${user.username}, escrow is funded for trade ${tradeId}. Please send ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${offer.fiat} via ${offer.paymentMethod}. Payment instruction: ${paymentDetails}`
          : `Hello ${user.username}, trade ${tradeId} is open. Fund ${cryptoAmount.toFixed(6)} ${offer.crypto} into escrow first, then I will send ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${offer.fiat} via ${offer.paymentMethod}.`;
      batch.set(doc(db, 'trades', tradeId, 'messages', npcId), {
        id: npcId,
        sender: offer.traderUsername,
        senderUid: uid,
        text: npcText,
        createdAt: serverTimestamp(),
      });
      localMessages.push({
        id: npcId,
        sender: offer.traderUsername,
        text: npcText,
        timestamp: new Date(now + 1000).toISOString(),
      });
    } else {
      const notifId = `ntf-${randomHex(4)}`;
      batch.set(
        doc(db, 'notifications', notifId),
        createNotificationPayload({
          id: notifId,
          toUid: makerUid,
          fromUid: uid,
          type: 'trade_opened',
          title: `New trade ${tradeId} opened`,
          body:
            offer.side === 'sell_crypto'
              ? `${user.username} opened a ${amount.toLocaleString('en-US')} ${offer.fiat} (${cryptoAmount.toFixed(5)} ${offer.crypto}) trade. Open the trade room to fund escrow.`
              : `${user.username} opened a ${amount.toLocaleString('en-US')} ${offer.fiat} (${cryptoAmount.toFixed(5)} ${offer.crypto}) trade via ${offer.paymentMethod}.`,
          tradeId,
          offerId: offer.id,
          fromUsername: user.username,
        })
      );
    }

    try {
      await batch.commit();
      return {
        trade: {
          ...normalizeTradeDoc(tradeDoc, localMessages, user.username),
          createdAt: nowIso,
        },
        user: { ...user, balances: nextBalances },
      };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.WRITE, `trades/${tradeId}`);
    }
  },

  async markTradeRead(tradeId: string): Promise<{ trade: TradeOrder }> {
    const { user } = await requireCurrentAccount();
    const path = `trades/${tradeId}`;
    try {
      const ref = doc(db, 'trades', tradeId);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new ApiError('Trade not found', 404);
      const nowIso = new Date().toISOString();
      const prevRead = (snap.data().lastReadAtBy ?? {}) as Record<string, string>;
      await updateDoc(ref, {
        lastReadAtBy: { ...prevRead, [user.username]: nowIso },
        updatedAt: serverTimestamp(),
      });
      const msgs = await fetchTradeMessages(tradeId);
      const normalized = normalizeTradeDoc(
        { ...snap.data(), lastReadAtBy: { ...prevRead, [user.username]: nowIso } },
        msgs,
        user.username
      );
      return { trade: normalized };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  async sendTradeMessage(
    tradeId: string,
    text: string,
    imageUrl?: string
  ): Promise<{ trade: TradeOrder }> {
    const { uid, user } = await requireCurrentAccount();
    const clean = text.trim().slice(0, 2000);
    const cleanImage = imageUrl ? sanitizeImageField(imageUrl) : undefined;
    if (imageUrl && !cleanImage) {
      throw new ApiError('Invalid image format or size.', 400);
    }
    if (!clean && !cleanImage) throw new ApiError('Message cannot be empty', 400);

    const msgText = clean || '[Photo uploaded]';
    const path = `trades/${tradeId}`;
    try {
      const ref = doc(db, 'trades', tradeId);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new ApiError('Trade not found', 404);
      const tData = snap.data();
      const msgId = `msg-${randomHex(4)}`;
      const nowIso = new Date().toISOString();
      const prevRead = (tData.lastReadAtBy ?? {}) as Record<string, string>;
      const nextRead: Record<string, string> = {
        ...prevRead,
        [user.username]: nowIso,
      };
      if (cleanImage) {
        nextRead[`__img_${msgId}`] = cleanImage;
      }

      const buyerNameLower = String(tData.buyerUsername ?? '').toLowerCase();
      const sellerNameLower = String(tData.sellerUsername ?? '').toLowerCase();
      const senderLower = user.username.toLowerCase();
      const isBuyerSender = String(tData.buyerUid) === uid || senderLower === buyerNameLower;
      const isSellerSender = String(tData.sellerUid) === uid || senderLower === sellerNameLower;
      const mutedBuyerSend = isBuyerSender && prevRead.__muteFrom_buyer === '1';
      const mutedSellerSend = isSellerSender && prevRead.__muteFrom_seller === '1';
      const mutedFromOther = mutedBuyerSend || mutedSellerSend;
      if (mutedBuyerSend) {
        nextRead[`__mutedMsg_${msgId}`] = 'buyer';
      } else if (mutedSellerSend) {
        nextRead[`__mutedMsg_${msgId}`] = 'seller';
      }

      const batch = writeBatch(db);
      batch.set(doc(db, 'trades', tradeId, 'messages', msgId), {
        id: msgId,
        sender: user.username,
        senderUid: uid,
        text: msgText,
        createdAt: serverTimestamp(),
      });
      batch.update(ref, {
        lastReadAtBy: nextRead,
        updatedAt: serverTimestamp(),
      });

      const otherUid =
        String(tData.buyerUid) === uid ? String(tData.sellerUid) : String(tData.buyerUid);

      if (tData.counterpartyIsReal) {
        if (!mutedFromOther) {
          const notifId = `ntf-${randomHex(4)}`;
          const notifPreview = clean || 'Sent an image attachment in trade chat.';
          batch.set(
            doc(db, 'notifications', notifId),
            createNotificationPayload({
              id: notifId,
              toUid: otherUid,
              fromUid: uid,
              type: 'trade_message',
              title: `Message from ${user.username}`,
              body: notifPreview.length > 90 ? `${notifPreview.slice(0, 87)}...` : notifPreview,
              tradeId,
              fromUsername: user.username,
            })
          );
        }
      } else if (!mutedFromOther && (tData.status === 'escrow_funded' || tData.status === 'payment_sent')) {
        const lower = msgText.toLowerCase();
        let reply = `Received. Keeping an eye on ${tData.paymentMethod} for trade ${tradeId}.`;
        if (cleanImage && !clean) {
          reply = `Thanks, I can see the image you shared for trade ${tradeId}. Let me know once you're ready for the next step.`;
        } else if (
          lower.includes('detail') ||
          lower.includes('account') ||
          lower.includes('where') ||
          lower.includes('iban') ||
          lower.includes('handle')
        ) {
          reply = `${tData.paymentDetails}. Never include crypto keywords in the transfer note.`;
        } else if (lower.includes('sent') || lower.includes('paid') || lower.includes('code')) {
          reply = `Thanks! Verifying your ${tData.paymentMethod} transfer now — if you haven't already, press "Mark Payment as Paid" so escrow can finalize.`;
        }
        const replyId = `msg-${randomHex(4)}`;
        batch.set(doc(db, 'trades', tradeId, 'messages', replyId), {
          id: replyId,
          sender: String(tData.traderUsername),
          senderUid: uid,
          text: reply,
          createdAt: serverTimestamp(),
        });
      }

      await batch.commit();
      void notifyTelegramEvent({
        type: 'escrow_message',
        sender: `@${user.username}`,
        reference: tradeId,
        summary: `${String(tData.crypto ?? '')} ${String(tData.cryptoAmount ?? '')} · Buyer @${String(tData.buyerUsername ?? '')} / Seller @${String(tData.sellerUsername ?? '')}`,
        text: msgText,
      });
      const msgs = await fetchTradeMessages(tradeId);
      return {
        trade: normalizeTradeDoc(
          { ...tData, lastReadAtBy: nextRead },
          msgs,
          user.username
        ),
      };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.WRITE, path);
    }
  },

  async tradeAction(
    tradeId: string,
    payload: {
      action: 'fund_escrow' | 'mark_paid' | 'release' | 'cancel' | 'dispute' | 'feedback';
      positive?: boolean;
      comment?: string;
    }
  ): Promise<{ trade: TradeOrder; user?: UserAccount }> {
    const { uid, user } = await requireCurrentAccount();
    const tradeRef = doc(db, 'trades', tradeId);
    const snap = await getDoc(tradeRef).catch((err) =>
      wrapFirestoreError(err, OperationType.GET, `trades/${tradeId}`)
    );
    if (!snap.exists()) throw new ApiError('Trade not found', 404);

    const tData = snap.data();
    const trade = normalizeTradeDoc(tData, [], user.username);
    const { buyerUid, sellerUid } = trade._internal;
    const isReal = Boolean(trade.counterpartyIsReal);
    const otherUid = buyerUid === uid ? sellerUid : buyerUid;
    const batch = writeBatch(db);
    let updatedUser: UserAccount = { ...user, balances: { ...user.balances } };
    let nextStatus = trade.status;
    let nextFeedbackBy = trade.feedbackBy ? { ...trade.feedbackBy } : undefined;
    let nextLastReadAtBy = tData.lastReadAtBy
      ? { ...(tData.lastReadAtBy as Record<string, string>) }
      : undefined;
    const escrowState = nextLastReadAtBy?.__escrowState;

    if (
      payload.action === 'fund_escrow' &&
      trade.status === 'escrow_funded' &&
      escrowState === 'awaiting_seller'
    ) {
      if (uid !== sellerUid) {
        throw new ApiError(
          `Only the seller (${trade.sellerUsername}) can fund escrow for this trade.`,
          403
        );
      }
      if ((updatedUser.balances[trade.crypto] ?? 0) < trade.cryptoAmount - 1e-8) {
        throw new ApiError(
          `Insufficient ${trade.crypto} balance to fund escrow (${trade.cryptoAmount.toFixed(6)} ${trade.crypto} needed). Deposit ${trade.crypto} in your wallet first.`,
          400
        );
      }

      updatedUser.balances[trade.crypto] = Number(
        Math.max(0, (updatedUser.balances[trade.crypto] ?? 0) - trade.cryptoAmount).toFixed(8)
      );
      batch.update(doc(db, 'users', uid), {
        balances: updatedUser.balances,
        updatedAt: serverTimestamp(),
      });

      const nowIso = new Date().toISOString();
      nextLastReadAtBy = {
        ...(nextLastReadAtBy ?? {}),
        [user.username]: nowIso,
        __escrowState: 'funded',
      };
      batch.update(tradeRef, {
        lastReadAtBy: nextLastReadAtBy,
        updatedAt: serverTimestamp(),
      });

      const sysId = `msg-${randomHex(4)}`;
      batch.set(doc(db, 'trades', tradeId, 'messages', sysId), {
        id: sysId,
        sender: 'Escrow System',
        senderUid: uid,
        text: `${trade.cryptoAmount.toFixed(6)} ${trade.crypto} has been funded into OOSAB multi-sig escrow by ${user.username}.`,
        isSystem: true,
        createdAt: serverTimestamp(),
      });

      if (isReal) {
        const notifId = `ntf-${randomHex(4)}`;
        batch.set(
          doc(db, 'notifications', notifId),
          createNotificationPayload({
            id: notifId,
            toUid: otherUid,
            fromUid: uid,
            type: 'trade_status',
            title: `Escrow funded on ${trade.id}`,
            body: `${user.username} locked ${trade.cryptoAmount.toFixed(5)} ${trade.crypto} in escrow. You can now send payment.`,
            tradeId: trade.id,
            fromUsername: user.username,
          })
        );
      } else if (trade.side === 'buy_crypto') {
        const npcId = `msg-${randomHex(4)}`;
        batch.set(doc(db, 'trades', tradeId, 'messages', npcId), {
          id: npcId,
          sender: trade.traderUsername,
          senderUid: uid,
          text: `Escrow verified! Sending ${trade.fiatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${trade.fiat} via ${trade.paymentMethod} now.`,
          createdAt: serverTimestamp(),
        });
      }
    } else if (payload.action === 'mark_paid' && trade.status === 'escrow_funded') {
      if (escrowState === 'awaiting_seller') {
        throw new ApiError(
          `Waiting for ${trade.sellerUsername} to fund ${trade.crypto} into escrow first.`,
          400
        );
      }
      nextStatus = 'payment_sent';
      batch.update(tradeRef, {
        status: 'payment_sent',
        updatedAt: serverTimestamp(),
      });
      const isSwap = trade.side === 'swap_crypto' && trade.swapToCrypto;
      const sysId = `msg-${randomHex(4)}`;
      batch.set(doc(db, 'trades', tradeId, 'messages', sysId), {
        id: sysId,
        sender: 'Escrow System',
        senderUid: uid,
        text: isSwap
          ? `${user.username} confirmed ${trade.swapToAmount?.toFixed(6)} ${trade.swapToCrypto} swap escrow deposit. Finalizing atomic settlement.`
          : trade.side === 'buy_crypto' && !isReal
            ? `${trade.traderUsername} marked ${trade.paymentMethod} payment as sent. Verify receipt and release ${trade.crypto}.`
            : `${user.username} marked fiat payment as sent via ${trade.paymentMethod}. Waiting for seller confirmation.`,
        isSystem: true,
        createdAt: serverTimestamp(),
      });

      if (!isReal) {
        if (trade.side !== 'buy_crypto') {
          const npcId = `msg-${randomHex(4)}`;
          batch.set(doc(db, 'trades', tradeId, 'messages', npcId), {
            id: npcId,
            sender: trade.traderUsername,
            senderUid: uid,
            text: isSwap
              ? `Escrow deposit verified! Releasing ${trade.cryptoAmount.toFixed(6)} ${trade.crypto} to your wallet now.`
              : `Payment notice received! Checking ${trade.paymentMethod} settlement now — releasing ${trade.crypto} shortly.`,
            createdAt: serverTimestamp(),
          });
        }
      } else {
        const notifId = `ntf-${randomHex(4)}`;
        batch.set(
          doc(db, 'notifications', notifId),
          createNotificationPayload({
            id: notifId,
            toUid: otherUid,
            fromUid: uid,
            type: 'trade_status',
            title: `Payment sent on ${trade.id}`,
            body: `${user.username} marked ${trade.paymentMethod} payment as sent. Verify receipt and release ${trade.crypto}.`,
            tradeId: trade.id,
            fromUsername: user.username,
          })
        );
      }
    } else if (
      payload.action === 'release' &&
      (trade.status === 'escrow_funded' || trade.status === 'payment_sent')
    ) {
      if (escrowState === 'awaiting_seller') {
        throw new ApiError('Fund escrow first before releasing crypto.', 400);
      }
      if (isReal && uid !== sellerUid) {
        throw new ApiError(
          `Only the seller (${trade.sellerUsername}) can confirm receipt and release escrow.`,
          403
        );
      }

      const alreadyFundedInEscrow = escrowState === 'funded';
      if (
        isReal &&
        !alreadyFundedInEscrow &&
        (trade.side === 'sell_crypto' || trade.side === 'swap_crypto') &&
        (updatedUser.balances[trade.crypto] ?? 0) < trade.cryptoAmount - 1e-8
      ) {
        throw new ApiError(
          `Insufficient ${trade.crypto} balance to release (${trade.cryptoAmount.toFixed(6)} ${trade.crypto} needed).`,
          400
        );
      }

      nextStatus = 'completed';
      let buyerSettled = Boolean(tData.buyerSettled);
      let sellerSettled = Boolean(tData.sellerSettled);
      let userBalChanged = false;

      if (isReal) {
        if (!alreadyFundedInEscrow && (trade.side === 'sell_crypto' || trade.side === 'swap_crypto')) {
          updatedUser.balances[trade.crypto] = Number(
            Math.max(0, (updatedUser.balances[trade.crypto] ?? 0) - trade.cryptoAmount).toFixed(8)
          );
          userBalChanged = true;
        }
        if (trade.side === 'swap_crypto' && trade.swapToCrypto && trade.swapToAmount) {
          updatedUser.balances[trade.swapToCrypto] = Number(
            ((updatedUser.balances[trade.swapToCrypto] ?? 0) + trade.swapToAmount).toFixed(8)
          );
          userBalChanged = true;
        }
        sellerSettled = true;
      } else {
        if (buyerUid === uid) {
          updatedUser.balances[trade.crypto] = Number(
            ((updatedUser.balances[trade.crypto] ?? 0) + trade.cryptoAmount).toFixed(8)
          );
          userBalChanged = true;
        }
        buyerSettled = true;
        sellerSettled = true;
      }

      if (userBalChanged) {
        batch.update(doc(db, 'users', uid), {
          balances: updatedUser.balances,
          updatedAt: serverTimestamp(),
        });
      }

      batch.update(tradeRef, {
        status: 'completed',
        buyerSettled,
        sellerSettled,
        updatedAt: serverTimestamp(),
      });

      const sysId = `msg-${randomHex(4)}`;
      batch.set(doc(db, 'trades', tradeId, 'messages', sysId), {
        id: sysId,
        sender: 'Escrow System',
        senderUid: uid,
        text: `Escrow released! ${trade.cryptoAmount.toFixed(6)} ${trade.crypto} settled to ${trade.buyerUsername}.`,
        isSystem: true,
        createdAt: serverTimestamp(),
      });

      // Update registered trader profile stats
      const updateTraderRecord = async (tName: string, recSide: 'Bought' | 'Sold', counterName: string) => {
        const tSnap = await getDoc(doc(db, 'traders', tName));
        if (!tSnap.exists()) return;
        const t = normalizeTraderDoc(tSnap.data());
        const nextHistory = [
          {
            id: trade.id,
            asset: trade.crypto,
            cryptoAmount: Number(trade.cryptoAmount.toFixed(6)),
            fiatAmount: Number(trade.fiatAmount.toFixed(2)),
            fiat: trade.fiat,
            paymentMethod: trade.paymentMethod,
            side: recSide,
            counterparty: counterName,
            completedAt: 'Just now',
          },
          ...(t.tradeHistory ?? []),
        ].slice(0, 40);
        batch.update(doc(db, 'traders', tName), {
          tradesCount: t.tradesCount + 1,
          tradeHistory: nextHistory,
          lastTradeId: trade.id,
          updatedAt: serverTimestamp(),
        });
      };

      await updateTraderRecord(trade.buyerUsername, 'Bought', trade.sellerUsername);
      await updateTraderRecord(trade.sellerUsername, 'Sold', trade.buyerUsername);

      if (isReal) {
        const notifId = `ntf-${randomHex(4)}`;
        batch.set(
          doc(db, 'notifications', notifId),
          createNotificationPayload({
            id: notifId,
            toUid: otherUid,
            fromUid: uid,
            type: 'trade_status',
            title: `Escrow released (${trade.id})`,
            body: `${trade.cryptoAmount.toFixed(6)} ${trade.crypto} settled to ${trade.buyerUsername}.`,
            tradeId: trade.id,
            fromUsername: user.username,
          })
        );
      }
    } else if (payload.action === 'cancel' && trade.status === 'escrow_funded') {
      nextStatus = 'cancelled';
      const sellerHadFunded =
        escrowState === 'funded' ||
        (trade.side === 'buy_crypto' && escrowState !== 'awaiting_seller');
      let buyerRefunded = trade.side === 'sell_crypto' || trade.side === 'buy_crypto';
      let sellerRefunded = !sellerHadFunded;
      let userBalChanged = false;

      if (sellerHadFunded) {
        if (sellerUid === uid) {
          updatedUser.balances[trade.crypto] = Number(
            ((updatedUser.balances[trade.crypto] ?? 0) + trade.cryptoAmount).toFixed(8)
          );
          sellerRefunded = true;
          userBalChanged = true;
        } else {
          sellerRefunded = false;
        }
      }
      if (trade.side === 'swap_crypto' && trade.swapToCrypto && trade.swapToAmount) {
        if (buyerUid === uid) {
          updatedUser.balances[trade.swapToCrypto] = Number(
            ((updatedUser.balances[trade.swapToCrypto] ?? 0) + trade.swapToAmount).toFixed(8)
          );
          buyerRefunded = true;
          userBalChanged = true;
        } else {
          buyerRefunded = false;
        }
      }

      if (userBalChanged) {
        batch.update(doc(db, 'users', uid), {
          balances: updatedUser.balances,
          updatedAt: serverTimestamp(),
        });
      }

      batch.update(tradeRef, {
        status: 'cancelled',
        buyerRefunded,
        sellerRefunded,
        updatedAt: serverTimestamp(),
      });

      const sysId = `msg-${randomHex(4)}`;
      batch.set(doc(db, 'trades', tradeId, 'messages', sysId), {
        id: sysId,
        sender: 'Escrow System',
        senderUid: uid,
        text: `Trade ${trade.id} cancelled by ${user.username} and escrow unlocked.`,
        isSystem: true,
        createdAt: serverTimestamp(),
      });

      if (isReal) {
        const notifId = `ntf-${randomHex(4)}`;
        batch.set(
          doc(db, 'notifications', notifId),
          createNotificationPayload({
            id: notifId,
            toUid: otherUid,
            fromUid: uid,
            type: 'trade_status',
            title: `Trade ${trade.id} cancelled`,
            body: `${user.username} cancelled the trade and unlocked escrow.`,
            tradeId: trade.id,
            fromUsername: user.username,
          })
        );
      }
    } else if (
      payload.action === 'dispute' &&
      (trade.status === 'escrow_funded' || trade.status === 'payment_sent')
    ) {
      nextStatus = 'disputed';
      batch.update(tradeRef, {
        status: 'disputed',
        updatedAt: serverTimestamp(),
      });
      const sysId = `msg-${randomHex(4)}`;
      batch.set(doc(db, 'trades', tradeId, 'messages', sysId), {
        id: sysId,
        sender: 'Escrow System',
        senderUid: uid,
        text: `Dispute opened by ${user.username}. An independent OOSAB arbitrator has frozen the ${trade.crypto} in escrow and joined the chat.`,
        isSystem: true,
        createdAt: serverTimestamp(),
      });
      if (isReal) {
        const notifId = `ntf-${randomHex(4)}`;
        batch.set(
          doc(db, 'notifications', notifId),
          createNotificationPayload({
            id: notifId,
            toUid: otherUid,
            fromUid: uid,
            type: 'trade_status',
            title: `Dispute opened (${trade.id})`,
            body: `${user.username} opened an escrow dispute on ${trade.id}.`,
            tradeId: trade.id,
            fromUsername: user.username,
          })
        );
      }
    } else if (payload.action === 'feedback' && trade.status === 'completed') {
      const isPos = payload.positive !== false;
      const note = (payload.comment ?? '').trim().slice(0, 320) || 'Smooth zero-KYC trade!';
      nextFeedbackBy = {
        ...(trade.feedbackBy ?? {}),
        [user.username]: { positive: isPos, comment: note },
      };
      batch.update(tradeRef, {
        feedbackBy: nextFeedbackBy,
        updatedAt: serverTimestamp(),
      });

      const targetUsername =
        user.username.toLowerCase() === trade.buyerUsername.toLowerCase()
          ? trade.sellerUsername
          : trade.buyerUsername;
      const tSnap = await getDoc(doc(db, 'traders', targetUsername));
      if (tSnap.exists()) {
        const t = normalizeTraderDoc(tSnap.data());
        const nextFb = [
          {
            id: `fb-${randomHex(3)}`,
            author: user.username,
            positive: isPos,
            comment: note,
            asset: trade.crypto,
            date: 'Just now',
          },
          ...t.recentFeedback,
        ].slice(0, 40);
        const totalFeedbackCount = Math.max(t.totalFeedbackCount ?? 0, nextFb.length);
        const posCount = nextFb.filter((f) => f.positive).length;
        const nextRating =
          nextFb.length > 0 && t.tradesCount <= nextFb.length
            ? Math.round((posCount / nextFb.length) * 100)
            : t.ratingPct;

        batch.update(doc(db, 'traders', targetUsername), {
          recentFeedback: nextFb,
          totalFeedbackCount,
          ratingPct: nextRating,
          lastTradeId: trade.id,
          updatedAt: serverTimestamp(),
        });
      }

      if (isReal) {
        const notifId = `ntf-${randomHex(4)}`;
        batch.set(
          doc(db, 'notifications', notifId),
          createNotificationPayload({
            id: notifId,
            toUid: otherUid,
            fromUid: uid,
            type: 'feedback_received',
            title: `New ${isPos ? 'positive' : 'negative'} feedback from ${user.username}`,
            body: note,
            tradeId: trade.id,
            fromUsername: user.username,
          })
        );
      }
    } else {
      throw new ApiError('Invalid trade state transition.', 400);
    }

    try {
      await batch.commit();
      const msgs = await fetchTradeMessages(tradeId);
      const updated = normalizeTradeDoc(
        {
          ...tData,
          status: nextStatus,
          feedbackBy: nextFeedbackBy ?? tData.feedbackBy,
          lastReadAtBy: nextLastReadAtBy ?? tData.lastReadAtBy,
        },
        msgs,
        user.username
      );
      return { trade: updated, user: updatedUser };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.WRITE, `trades/${tradeId}`);
    }
  },

  async getDirectChats(): Promise<{ chats: DirectChat[] }> {
    const session = await getSessionContext();
    if (!session) return { chats: [] };
    try {
      const q = query(
        collection(db, 'chats'),
        where('participantUids', 'array-contains', session.uid),
        limit(50)
      );
      const snap = await getDocs(q);
      const chats = await Promise.all(
        snap.docs
          .filter(
            (d) =>
              d.data().offerId !== SUPPORT_CHAT_MARKER &&
              d.data().offerId !== 'archived_hidden'
          )
          .map(async (d) => {
            const data = d.data();
            const msgs = await fetchChatMessages(d.id);
            return {
              id: String(data.id ?? d.id),
              participants: (data.participants ?? ['', '']) as [string, string],
              offerId: typeof data.offerId === 'string' ? data.offerId : undefined,
              offerSummary: typeof data.offerSummary === 'string' ? data.offerSummary : undefined,
              createdAt: tsToIso(data.createdAt),
              updatedAt: tsToIso(data.updatedAt),
              messages: msgs,
              lastReadAtBy: (data.lastReadAtBy ?? undefined) as Record<string, string> | undefined,
            };
          })
      );
      chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      return { chats };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.LIST, 'chats');
    }
  },

  async openDirectChat(targetUsername: string, offerId?: string): Promise<{ chat: DirectChat }> {
    const { uid, user } = await requireCurrentAccount();
    const target = await resolveUsernameTarget(targetUsername);
    if (target.canonicalUsername.toLowerCase() === user.username.toLowerCase()) {
      throw new ApiError('You cannot start a direct chat with yourself.', 400);
    }

    const chatId = makeChatId(user.username, target.canonicalUsername);
    let linkedOffer: P2POffer | undefined;
    if (offerId) {
      try {
        linkedOffer = (await api.getOfferById(offerId)).offer;
      } catch {
        linkedOffer = undefined;
      }
    }
    const offerSummary = linkedOffer
      ? `${linkedOffer.side === 'sell_crypto' ? 'Buy' : linkedOffer.side === 'swap_crypto' ? 'Swap' : 'Sell'} ${linkedOffer.crypto} · ${linkedOffer.paymentMethod}`
      : undefined;

    const chatRef = doc(db, 'chats', chatId);
    try {
      const existingSnap = await getDoc(chatRef);
      if (existingSnap.exists()) {
        if (linkedOffer) {
          await updateDoc(chatRef, {
            offerId: linkedOffer.id,
            offerSummary: offerSummary ?? null,
            updatedAt: serverTimestamp(),
          });
        }
        const data = existingSnap.data();
        const msgs = await fetchChatMessages(chatId);
        return {
          chat: {
            id: chatId,
            participants: (data.participants ?? [user.username, target.canonicalUsername]) as [
              string,
              string,
            ],
            offerId: linkedOffer?.id ?? (typeof data.offerId === 'string' ? data.offerId : undefined),
            offerSummary:
              offerSummary ??
              (typeof data.offerSummary === 'string' ? data.offerSummary : undefined),
            createdAt: tsToIso(data.createdAt),
            updatedAt: new Date().toISOString(),
            messages: msgs,
            lastReadAtBy: (data.lastReadAtBy ?? undefined) as Record<string, string> | undefined,
          },
        };
      }

      const nowIso = new Date().toISOString();
      const participantUids = target.isReal && target.uid ? [uid, target.uid] : [uid];
      const pairSorted = [user.username, target.canonicalUsername].sort((a, b) =>
        a.localeCompare(b)
      ) as [string, string];

      const docData = stripUndefined({
        id: chatId,
        participants: pairSorted,
        participantUids,
        offerId: linkedOffer?.id,
        offerSummary,
        lastReadAtBy: { [user.username]: nowIso },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await setDoc(chatRef, docData);
      return {
        chat: {
          id: chatId,
          participants: pairSorted,
          offerId: linkedOffer?.id,
          offerSummary,
          createdAt: nowIso,
          updatedAt: nowIso,
          messages: [],
          lastReadAtBy: { [user.username]: nowIso },
        },
      };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.WRITE, `chats/${chatId}`);
    }
  },

  async sendDirectMessage(
    chatId: string,
    text: string,
    offerId?: string
  ): Promise<{ chat: DirectChat }> {
    const { uid, user } = await requireCurrentAccount();
    const clean = text.trim().slice(0, 2000);
    if (!clean) throw new ApiError('Message cannot be empty', 400);

    const chatRef = doc(db, 'chats', chatId);
    try {
      const snap = await getDoc(chatRef);
      if (!snap.exists()) throw new ApiError('Conversation not found', 404);
      const data = snap.data();
      const participantUids = Array.isArray(data.participantUids)
        ? (data.participantUids as string[])
        : [];
      const participants = (data.participants ?? [user.username, '']) as [string, string];
      const otherName =
        participants.find((p) => p.toLowerCase() !== user.username.toLowerCase()) ?? '';
      const otherUid = participantUids.find((p) => p !== uid);
      const nowIso = new Date().toISOString();
      const prevRead = (data.lastReadAtBy ?? {}) as Record<string, string>;
      const linkedOfferId = offerId || (typeof data.offerId === 'string' ? data.offerId : undefined);

      const batch = writeBatch(db);
      const msgId = `dmsg-${randomHex(4)}`;
      batch.set(
        doc(db, 'chats', chatId, 'messages', msgId),
        stripUndefined({
          id: msgId,
          sender: user.username,
          senderUid: uid,
          text: clean,
          offerId: linkedOfferId,
          createdAt: serverTimestamp(),
        })
      );
      batch.update(chatRef, {
        lastReadAtBy: { ...prevRead, [user.username]: nowIso },
        updatedAt: serverTimestamp(),
      });

      if (otherUid) {
        const notifId = `ntf-${randomHex(4)}`;
        batch.set(
          doc(db, 'notifications', notifId),
          createNotificationPayload({
            id: notifId,
            toUid: otherUid,
            fromUid: uid,
            type: 'direct_message',
            title: `Direct message from @${user.username}`,
            body: clean.length > 90 ? `${clean.slice(0, 87)}...` : clean,
            chatId,
            offerId: linkedOfferId,
            fromUsername: user.username,
          })
        );
      } else if (otherName) {
        let linked: P2POffer | undefined;
        if (linkedOfferId) {
          try {
            linked = (await api.getOfferById(linkedOfferId)).offer;
          } catch {
            linked = undefined;
          }
        }
        const replyText = linked
          ? `Thanks for reaching out about offer ${linked.id} (${linked.paymentMethod}). Click "Open Offer" to enter your amount and start escrow whenever you're ready.`
          : `Hi @${user.username}, thanks for messaging @${otherName}. Select any of my active offers to open a 2-of-3 multi-sig escrow room.`;
        const replyId = `dmsg-${randomHex(4)}`;
        batch.set(
          doc(db, 'chats', chatId, 'messages', replyId),
          stripUndefined({
            id: replyId,
            sender: otherName,
            senderUid: uid,
            text: replyText,
            offerId: linkedOfferId,
            createdAt: serverTimestamp(),
          })
        );
      }

      await batch.commit();
      const msgs = await fetchChatMessages(chatId);
      return {
        chat: {
          id: chatId,
          participants,
          offerId: linkedOfferId,
          offerSummary: typeof data.offerSummary === 'string' ? data.offerSummary : undefined,
          createdAt: tsToIso(data.createdAt),
          updatedAt: nowIso,
          messages: msgs,
          lastReadAtBy: { ...prevRead, [user.username]: nowIso },
        },
      };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.WRITE, `chats/${chatId}`);
    }
  },

  async markDirectChatRead(chatId: string): Promise<{ chat: DirectChat }> {
    const { user } = await requireCurrentAccount();
    const chatRef = doc(db, 'chats', chatId);
    try {
      const snap = await getDoc(chatRef);
      if (!snap.exists()) throw new ApiError('Conversation not found', 404);
      const data = snap.data();
      const nowIso = new Date().toISOString();
      const nextRead = {
        ...((data.lastReadAtBy ?? {}) as Record<string, string>),
        [user.username]: nowIso,
      };
      await updateDoc(chatRef, {
        lastReadAtBy: nextRead,
        updatedAt: serverTimestamp(),
      });
      const msgs = await fetchChatMessages(chatId);
      return {
        chat: {
          id: chatId,
          participants: (data.participants ?? ['', '']) as [string, string],
          offerId: typeof data.offerId === 'string' ? data.offerId : undefined,
          offerSummary: typeof data.offerSummary === 'string' ? data.offerSummary : undefined,
          createdAt: tsToIso(data.createdAt),
          updatedAt: nowIso,
          messages: msgs,
          lastReadAtBy: nextRead,
        },
      };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.UPDATE, `chats/${chatId}`);
    }
  },

  async getNotifications(): Promise<{ notifications: AppNotification[] }> {
    const session = await getSessionContext();
    if (!session) return { notifications: [] };
    try {
      const q = query(collection(db, 'notifications'), where('toUid', '==', session.uid));
      const snap = await getDocs(q);
      const notifications = snap.docs
        .map((d) => normalizeNotificationDoc(d.data()))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 60);
      return { notifications };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.LIST, 'notifications');
    }
  },

  async markNotificationsRead(id?: string): Promise<{ notifications: AppNotification[] }> {
    const session = await getSessionContext();
    if (!session) return { notifications: [] };
    try {
      const q = query(collection(db, 'notifications'), where('toUid', '==', session.uid));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      let dirty = false;
      for (const d of snap.docs) {
        if ((!id || d.id === id) && d.data().read !== true) {
          batch.update(doc(db, 'notifications', d.id), {
            read: true,
            updatedAt: serverTimestamp(),
          });
          dirty = true;
        }
      }
      if (dirty) await batch.commit();
      return await api.getNotifications();
    } catch (err) {
      return wrapFirestoreError(err, OperationType.UPDATE, 'notifications');
    }
  },

  async getSwaps(): Promise<{ swaps: SwapOrder[] }> {
    const session = await getSessionContext();
    if (!session) return { swaps: [] };
    try {
      const q = query(collection(db, 'swaps'), where('ownerUid', '==', session.uid));
      const snap = await getDocs(q);
      const swaps = snap.docs
        .map((d) => normalizeSwapDoc(d.data()))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return { swaps };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.LIST, 'swaps');
    }
  },

  async createSwap(payload: {
    fromCrypto: CryptoAsset;
    toCrypto: CryptoAsset;
    fromAmount: number;
    mode: 'floating' | 'fixed';
    destinationAddress?: string;
  }): Promise<{ swap: SwapOrder; user: UserAccount }> {
    const { uid, user } = await requireCurrentAccount();
    if (!payload.fromCrypto || !payload.toCrypto || payload.fromCrypto === payload.toCrypto) {
      throw new ApiError('Select two different assets to swap.', 400);
    }
    const amt = Number(payload.fromAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      throw new ApiError('Enter a valid swap amount.', 400);
    }
    if ((user.balances[payload.fromCrypto] ?? 0) < amt) {
      throw new ApiError(
        `Insufficient ${payload.fromCrypto} wallet balance. Deposit ${payload.fromCrypto} in your wallet first.`,
        400
      );
    }

    const prices = await fetchLivePrices();
    const fromUsd = prices.usdPrices[payload.fromCrypto] ?? 1;
    const toUsd = prices.usdPrices[payload.toCrypto] ?? 1;
    const feePct = payload.mode === 'fixed' ? 0.009 : 0.004;
    const effectiveRate = (fromUsd / toUsd) * (1 - feePct);
    const toAmount = amt * effectiveRate;

    const nextBalances = {
      ...user.balances,
      [payload.fromCrypto]: Number((user.balances[payload.fromCrypto] - amt).toFixed(8)),
      [payload.toCrypto]: Number(((user.balances[payload.toCrypto] ?? 0) + toAmount).toFixed(8)),
    };

    const swapId = `SWP-${randomHex(3).toUpperCase()}`;
    const nowIso = new Date().toISOString();
    const destAddr =
      (payload.destinationAddress ?? '').trim().slice(0, 160) ||
      generateDepositAddress(payload.toCrypto);
    const depAddr = generateDepositAddress(payload.fromCrypto);

    const swapDoc = {
      id: swapId,
      ownerUid: uid,
      fromCrypto: payload.fromCrypto,
      toCrypto: payload.toCrypto,
      fromAmount: amt,
      toAmount,
      rate: effectiveRate,
      mode: (payload.mode === 'fixed' ? 'fixed' : 'floating') as 'floating' | 'fixed',
      destinationAddress: destAddr,
      depositAddress: depAddr,
      status: 'completed' as const,
      createdAt: serverTimestamp(),
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'swaps', swapId), swapDoc);
    batch.update(doc(db, 'users', uid), {
      balances: nextBalances,
      updatedAt: serverTimestamp(),
    });

    try {
      await batch.commit();
      return {
        swap: { ...normalizeSwapDoc(swapDoc), createdAt: nowIso },
        user: { ...user, balances: nextBalances },
      };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.WRITE, `swaps/${swapId}`);
    }
  },

  async getCards(): Promise<{ cards: VirtualCard[] }> {
    const session = await getSessionContext();
    if (!session) return { cards: [] };
    try {
      const q = query(collection(db, 'cards'), where('ownerUid', '==', session.uid));
      const snap = await getDocs(q);
      const cards = snap.docs
        .map((d) => normalizeCardDoc(d.data()))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return { cards };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.LIST, 'cards');
    }
  },

  async createCard(payload: {
    label: string;
    type: 'disposable' | 'reloadable';
    fundingCrypto: CryptoAsset;
    amountUsd: number;
  }): Promise<{ card: VirtualCard; user: UserAccount }> {
    const { uid, user } = await requireCurrentAccount();
    const usd = Number(payload.amountUsd);
    if (!payload.fundingCrypto || !Number.isFinite(usd) || usd < 10 || usd > 10000) {
      throw new ApiError('Card amount must be between $10 and $10,000.', 400);
    }

    const prices = await fetchLivePrices();
    const cryptoPrice = prices.usdPrices[payload.fundingCrypto] ?? 1;
    const cryptoCost = (usd * 1.015) / cryptoPrice;
    if ((user.balances[payload.fundingCrypto] ?? 0) < cryptoCost) {
      throw new ApiError(
        `Insufficient ${payload.fundingCrypto} balance (need ${cryptoCost.toFixed(6)} ${payload.fundingCrypto}).`,
        400
      );
    }

    const nextBalances = {
      ...user.balances,
      [payload.fundingCrypto]: Number((user.balances[payload.fundingCrypto] - cryptoCost).toFixed(8)),
    };
    const fullNumber = generateCardNumber();
    const cardId = `CRD-${randomHex(3).toUpperCase()}`;
    const nowIso = new Date().toISOString();

    const cardDoc = {
      id: cardId,
      ownerUid: uid,
      label: (payload.label ?? '').trim().slice(0, 80) || `${payload.fundingCrypto} Privacy Card`,
      type: (payload.type === 'disposable' ? 'disposable' : 'reloadable') as
        | 'disposable'
        | 'reloadable',
      fundingCrypto: payload.fundingCrypto,
      balanceUsd: usd,
      last4: fullNumber.slice(-4),
      fullNumber,
      expiry: '08/29',
      cvv: String(randomInt(100, 999)),
      frozen: false,
      transactions: [
        {
          id: `tx-${randomHex(3)}`,
          merchant: `Funded with ${cryptoCost.toFixed(5)} ${payload.fundingCrypto}`,
          amountUsd: usd,
          timestamp: nowIso,
          status: 'Top-up' as const,
        },
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'cards', cardId), cardDoc);
    batch.update(doc(db, 'users', uid), {
      balances: nextBalances,
      updatedAt: serverTimestamp(),
    });

    try {
      await batch.commit();
      return {
        card: { ...normalizeCardDoc(cardDoc), createdAt: nowIso },
        user: { ...user, balances: nextBalances },
      };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.WRITE, `cards/${cardId}`);
    }
  },

  async cardAction(
    cardId: string,
    payload: { action: 'toggle_freeze' | 'spend' | 'topup'; merchant?: string; amountUsd?: number }
  ): Promise<{ card: VirtualCard; user: UserAccount }> {
    const { uid, user } = await requireCurrentAccount();
    const cardRef = doc(db, 'cards', cardId);
    const snap = await getDoc(cardRef).catch((err) =>
      wrapFirestoreError(err, OperationType.GET, `cards/${cardId}`)
    );
    if (!snap.exists()) throw new ApiError('Card not found', 404);
    const card = normalizeCardDoc(snap.data());
    const nextBalances = { ...user.balances };
    let balChanged = false;
    const nowIso = new Date().toISOString();

    if (payload.action === 'toggle_freeze') {
      card.frozen = !card.frozen;
    } else if (payload.action === 'spend') {
      if (card.frozen) throw new ApiError('Card is frozen.', 400);
      const amt = Number(payload.amountUsd) || 14.99;
      if (amt <= 0 || amt > card.balanceUsd) throw new ApiError('Insufficient card balance.', 400);
      card.balanceUsd = Number((card.balanceUsd - amt).toFixed(2));
      card.transactions = [
        {
          id: `tx-${randomHex(3)}`,
          merchant: (payload.merchant ?? '').trim() || 'Mullvad VPN / Online Merchant',
          amountUsd: -amt,
          timestamp: nowIso,
          status: 'Settled' as const,
        },
        ...card.transactions,
      ].slice(0, 100);
    } else if (payload.action === 'topup') {
      if (card.type === 'disposable') {
        throw new ApiError('Disposable cards cannot be topped up.', 400);
      }
      const amt = Number(payload.amountUsd) || 50;
      const prices = await fetchLivePrices();
      const cryptoCost = (amt * 1.01) / (prices.usdPrices[card.fundingCrypto] ?? 1);
      if ((nextBalances[card.fundingCrypto] ?? 0) < cryptoCost) {
        throw new ApiError(`Insufficient ${card.fundingCrypto} balance.`, 400);
      }
      nextBalances[card.fundingCrypto] = Number(
        (nextBalances[card.fundingCrypto] - cryptoCost).toFixed(8)
      );
      balChanged = true;
      card.balanceUsd = Number((card.balanceUsd + amt).toFixed(2));
      card.transactions = [
        {
          id: `tx-${randomHex(3)}`,
          merchant: `Top-up (${cryptoCost.toFixed(5)} ${card.fundingCrypto})`,
          amountUsd: amt,
          timestamp: nowIso,
          status: 'Top-up' as const,
        },
        ...card.transactions,
      ].slice(0, 100);
    }

    const batch = writeBatch(db);
    batch.update(cardRef, {
      frozen: card.frozen,
      balanceUsd: card.balanceUsd,
      transactions: card.transactions,
      updatedAt: serverTimestamp(),
    });
    if (balChanged) {
      batch.update(doc(db, 'users', uid), {
        balances: nextBalances,
        updatedAt: serverTimestamp(),
      });
    }

    try {
      await batch.commit();
      return { card, user: { ...user, balances: nextBalances } };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.WRITE, `cards/${cardId}`);
    }
  },

  async newDepositAddress(
    cryptoAsset: CryptoAsset,
    chain?: string
  ): Promise<{ user: UserAccount; address: string }> {
    const { user } = await requireCurrentAccount();
    return {
      user,
      address: generateDepositAddress(cryptoAsset, chain),
    };
  },

  async saveDepositMessage(
    asset: CryptoAsset,
    message: string,
    address?: string,
    network?: string
  ): Promise<{ user: UserAccount }> {
    const { uid, user } = await requireCurrentAccount();
    const cleanMsg = message.trim().slice(0, 500);
    if (!cleanMsg) {
      throw new ApiError('Enter a message before saving.', 400);
    }

    const cleanAddr = (address ?? '').trim() || generateDepositAddress(asset);
    const cleanNetwork = (network ?? '').trim() || `${asset} Mainnet`;
    const tx: WalletTx = {
      id: `MSG-${randomHex(3).toUpperCase()}`,
      type: 'deposit',
      crypto: asset,
      amount: 0,
      address: cleanAddr,
      txHash: randomHex(32),
      network: cleanNetwork,
      status: 'Confirmed',
      timestamp: new Date().toISOString(),
      message: cleanMsg,
    };
    const nextHistory = [tx, ...(user.walletHistory ?? [])].slice(0, 100);

    try {
      await updateDoc(doc(db, 'users', uid), {
        walletHistory: nextHistory,
        updatedAt: serverTimestamp(),
      });
      return {
        user: { ...user, walletHistory: nextHistory },
      };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  },

  async withdrawCrypto(
    asset: CryptoAsset,
    amount: number,
    address: string,
    network?: string
  ): Promise<{ user: UserAccount }> {
    const { uid, user } = await requireCurrentAccount();
    const amt = Number(amount);
    const cleanAddr = address.trim();
    if (!asset || !cleanAddr || cleanAddr.length < 12) {
      throw new ApiError('Enter a valid destination wallet address.', 400);
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      throw new ApiError('Enter a valid withdrawal amount.', 400);
    }
    if (asset === 'XMR') {
      const prices = await fetchLivePrices();
      const xmrPriceUsd = prices.usdPrices.XMR ?? DEFAULT_USD_PRICES.XMR;
      const minInfo = getXmrMinWithdrawInfo(xmrPriceUsd, user.balances.XMR ?? 0);
      if (!minInfo.hasEnoughWalletBalance) {
        throw new ApiError(
          `Monero (XMR) withdrawals require at least $2,268.00 USD (${minInfo.minXmr.toFixed(6)} XMR) in your wallet. You currently have ${(user.balances.XMR ?? 0).toFixed(6)} XMR ($${minInfo.walletUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD).`,
          400
        );
      }
      if (!isXmrAmountAtLeastMinUsd(amt, xmrPriceUsd)) {
        throw new ApiError(
          `Minimum Monero (XMR) withdrawal is $2,268.00 USD (${minInfo.minXmr.toFixed(6)} XMR at $${xmrPriceUsd.toFixed(2)}/XMR).`,
          400
        );
      }
    }
    if ((user.balances[asset] ?? 0) < amt) {
      throw new ApiError(`Insufficient ${asset} balance.`, 400);
    }

    const nextBalances = {
      ...user.balances,
      [asset]: Number((user.balances[asset] - amt).toFixed(8)),
    };
    const tx: WalletTx = {
      id: `WDR-${randomHex(3).toUpperCase()}`,
      type: 'withdrawal',
      crypto: asset,
      amount: amt,
      address: cleanAddr,
      txHash: randomHex(32),
      network: network || `${asset} Mainnet`,
      status: 'Pending',
      timestamp: new Date().toISOString(),
    };
    const nextHistory = [tx, ...user.walletHistory].slice(0, 100);

    try {
      await updateDoc(doc(db, 'users', uid), {
        balances: nextBalances,
        walletHistory: nextHistory,
        updatedAt: serverTimestamp(),
      });
      return {
        user: { ...user, balances: nextBalances, walletHistory: nextHistory },
      };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  },

  async creditWallet(payload: {
    crypto: CryptoAsset;
    mode: 'crypto' | 'usd';
    amount: number;
    targetUsername?: string;
  }): Promise<{
    user: UserAccount;
    targetUsername?: string;
    isSelf?: boolean;
    creditedCrypto: number;
    usdValue: number;
  }> {
    if (!SUPPORTED_ASSETS.includes(payload.crypto)) {
      throw new ApiError('Select a supported cryptocurrency.', 400);
    }
    const rawAmt = Number(payload.amount);
    if (!Number.isFinite(rawAmt) || rawAmt <= 0) {
      throw new ApiError('Enter a valid amount greater than zero.', 400);
    }

    const session = await getSessionContext();
    const desiredTarget = (payload.targetUsername ?? session?.username ?? '').trim();
    if (!desiredTarget) {
      throw new ApiError('Select a target username or sign in first.', 400);
    }

    const target = await resolveUsernameTarget(desiredTarget);
    if (!target.isReal || !target.uid) {
      throw new ApiError(`Registered account "${desiredTarget}" not found.`, 404);
    }

    const targetUid = target.uid;
    const tSnap = await getDoc(doc(db, 'users', targetUid));
    if (!tSnap.exists()) {
      throw new ApiError(`Registered account "${desiredTarget}" not found.`, 404);
    }
    const targetUser = normalizeUserDoc(tSnap.data());
    const isSelf = Boolean(session && session.uid === targetUid);

    const prices = await fetchLivePrices();
    const spotUsd = prices.usdPrices[payload.crypto] ?? DEFAULT_USD_PRICES[payload.crypto];
    const creditedCrypto =
      payload.mode === 'usd'
        ? Number((rawAmt / spotUsd).toFixed(8))
        : Number(rawAmt.toFixed(8));
    const usdValue = Number((creditedCrypto * spotUsd).toFixed(2));

    const nextBalances = {
      ...targetUser.balances,
      [payload.crypto]: Number(((targetUser.balances[payload.crypto] ?? 0) + creditedCrypto).toFixed(8)),
    };
    const tx: WalletTx = {
      id: `DEP-${randomHex(3).toUpperCase()}`,
      type: 'deposit',
      crypto: payload.crypto,
      amount: creditedCrypto,
      address: targetUser.depositAddresses[payload.crypto] ?? generateDepositAddress(payload.crypto),
      txHash: randomHex(32),
      network: `${payload.crypto} Vault Credit`,
      status: 'Confirmed',
      timestamp: new Date().toISOString(),
    };
    const nextHistory = [tx, ...targetUser.walletHistory].slice(0, 100);

    const batch = writeBatch(db);
    batch.update(doc(db, 'users', targetUid), {
      balances: nextBalances,
      walletHistory: nextHistory,
      updatedAt: serverTimestamp(),
    });
    const notifId = `ntf-${randomHex(4)}`;
    batch.set(
      doc(db, 'notifications', notifId),
      createNotificationPayload({
        id: notifId,
        toUid: targetUid,
        fromUid: session?.uid ?? targetUid,
        type: 'wallet_credit',
        title: `Wallet credited +${creditedCrypto} ${payload.crypto}`,
        body: `Your ${payload.crypto} balance increased by $${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
        fromUsername: session?.username ?? 'Vault Console',
      })
    );

    try {
      await batch.commit();
      return {
        user: { ...targetUser, balances: nextBalances, walletHistory: nextHistory },
        targetUsername: targetUser.username,
        isSelf,
        creditedCrypto,
        usdValue,
      };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.WRITE, `users/${targetUid}`);
    }
  },

  async addSecretProfileStats(payload: {
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
  }): Promise<{ trader: TraderProfile }> {
    const session = await getSessionContext();
    const desired = (payload.targetUsername ?? session?.username ?? '').trim();
    if (!desired) {
      throw new ApiError('Select or enter a registered username first.', 400);
    }

    const target = await resolveUsernameTarget(desired);
    const tName = target.canonicalUsername;
    const tRef = doc(db, 'traders', tName);
    const tSnap = await getDoc(tRef).catch((err) =>
      wrapFirestoreError(err, OperationType.GET, `traders/${tName}`)
    );
    if (!tSnap.exists()) {
      throw new ApiError(`Trader profile "${desired}" not found in Cloud Firestore.`, 404);
    }

    const t = normalizeTraderDoc(tSnap.data());
    const addTrades = Math.max(0, Math.min(10000, Math.round(Number(payload.addTradesCount ?? 0))));
    const nextTradesCount = t.tradesCount + addTrades;
    const nextRating =
      typeof payload.ratingPct === 'number' && payload.ratingPct >= 1 && payload.ratingPct <= 100
        ? Math.round(payload.ratingPct)
        : t.ratingPct;
    const nextAvgRelease =
      typeof payload.avgReleaseMinutes === 'number' && payload.avgReleaseMinutes >= 1
        ? Math.round(payload.avgReleaseMinutes)
        : t.avgReleaseMinutes;
    const nextVerified =
      typeof payload.verified === 'boolean' ? payload.verified : t.verified;
    const addVol =
      typeof payload.addVolumeUsd === 'number' && payload.addVolumeUsd > 0
        ? payload.addVolumeUsd
        : 0;
    const nextVolume = (t.totalVolumeUsd ?? t.tradesCount * 420) + addVol;
    const volumeTier =
      nextVolume >= 250000
        ? '$250K+ Desk'
        : nextVolume >= 50000
          ? '$50K+ Desk'
          : nextVolume >= 10000
            ? '$10K+ Trader'
            : t.volumeTier || 'Starter';

    const nextHistory = [...(t.tradeHistory ?? [])];
    if (payload.tradeRecord) {
      nextHistory.unshift({
        id: `TRD-${randomHex(3).toUpperCase()}`,
        asset: payload.tradeRecord.asset ?? 'BTC',
        cryptoAmount: Number(payload.tradeRecord.cryptoAmount ?? 0.05),
        fiatAmount: Number(payload.tradeRecord.fiatAmount ?? 1000),
        fiat: payload.tradeRecord.fiat ?? 'USD',
        paymentMethod: payload.tradeRecord.paymentMethod || 'Bank Transfer',
        side: payload.tradeRecord.side === 'Bought' ? 'Bought' : 'Sold',
        counterparty: payload.tradeRecord.counterparty || 'm***9',
        completedAt: payload.tradeRecord.completedAt || 'Just now',
      });
    }

    const nextFeedback = [...t.recentFeedback];
    if (payload.feedback?.comment?.trim()) {
      nextFeedback.unshift({
        id: `fb-${randomHex(3)}`,
        author: payload.feedback.author?.trim() || 'Victor7777',
        positive: payload.feedback.positive !== false,
        comment: payload.feedback.comment.trim(),
        asset: payload.feedback.asset ?? 'BTC',
        date: payload.feedback.date || 'Just now',
      });
    }

    const totalFeedbackCount = Math.max(t.totalFeedbackCount ?? 0, nextFeedback.length);
    const updates = {
      tradesCount: nextTradesCount,
      ratingPct: nextRating,
      avgReleaseMinutes: nextAvgRelease,
      verified: nextVerified,
      totalVolumeUsd: nextVolume,
      volumeTier,
      tradeHistory: nextHistory.slice(0, 40),
      recentFeedback: nextFeedback.slice(0, 40),
      totalFeedbackCount,
      updatedAt: serverTimestamp(),
    };

    try {
      await updateDoc(tRef, updates);
      return {
        trader: {
          ...t,
          tradesCount: nextTradesCount,
          ratingPct: nextRating,
          avgReleaseMinutes: nextAvgRelease,
          verified: nextVerified,
          totalVolumeUsd: nextVolume,
          volumeTier,
          tradeHistory: updates.tradeHistory,
          recentFeedback: updates.recentFeedback,
          totalFeedbackCount,
        },
      };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.UPDATE, `traders/${tName}`);
    }
  },

  async getTablesSummary(): Promise<TablesSummaryResponse> {
    try {
      const [offersSnap, tradersSnap, usersSnap, tSnap, cSnap, nSnap, sSnap, kSnap] = await Promise.all([
        getDocs(collection(db, 'offers')),
        getDocs(collection(db, 'traders')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'trades')).catch(() => null),
        getDocs(collection(db, 'chats')).catch(() => null),
        getDocs(collection(db, 'notifications')).catch(() => null),
        getDocs(collection(db, 'swaps')).catch(() => null),
        getDocs(collection(db, 'cards')).catch(() => null),
      ]);

      const customOffers = offersSnap.docs.map((d) => normalizeOfferDoc(d.data()));
      const offersByUser = new Map<string, number>();
      for (const o of customOffers) {
        const key = o.traderUsername.toLowerCase();
        offersByUser.set(key, (offersByUser.get(key) ?? 0) + 1);
      }

      const traderMap = new Map<string, TraderProfile>();
      tradersSnap.docs.forEach((d) => {
        const t = normalizeTraderDoc(d.data());
        if (t.username) traderMap.set(t.username.toLowerCase(), t);
      });

      const directoryUsers: DirectoryUser[] = [];
      for (const d of usersSnap.docs) {
        const raw = d.data();
        if (raw.tagline === REMOVED_ACCOUNT_MARKER) continue;
        const u = normalizeUserDoc(raw);
        const t = traderMap.get(u.username.toLowerCase());
        if (t?.tagline === REMOVED_ACCOUNT_MARKER) continue;
        const walletMessages = (u.walletHistory ?? [])
          .filter((tx) => typeof tx.message === 'string' && tx.message.trim().length > 0)
          .map((tx) => ({
            id: tx.id,
            crypto: tx.crypto,
            network: tx.network,
            message: tx.message!.trim(),
            timestamp: tx.timestamp,
          }));
        directoryUsers.push({
          username: u.username,
          createdAt: u.createdAt,
          joinedAt: t?.joinedAt ?? u.createdAt.slice(0, 10),
          balances: u.balances,
          tradesCount: t?.tradesCount ?? 0,
          ratingPct: t?.ratingPct ?? 100,
          feedbackCount: t?.recentFeedback?.length ?? 0,
          verified: t?.verified ?? false,
          walletMessages,
        });
      }
      directoryUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const tradesCount = tSnap?.size ?? 0;
      const chatsCount = cSnap?.size ?? 0;
      const notifsCount = nSnap?.size ?? 0;
      const swapsCount = sSnap?.size ?? 0;
      const cardsCount = kSnap?.size ?? 0;

      const tables: TableFileInfo[] = [
        { name: 'users', path: '/users', rows: directoryUsers.length, sizeBytes: directoryUsers.length * 1024 },
        { name: 'traders', path: '/traders', rows: tradersSnap.size + Object.keys(SEED_TRADERS).length, sizeBytes: (tradersSnap.size + 127) * 850 },
        { name: 'offers', path: '/offers', rows: customOffers.length + SEED_OFFERS.length, sizeBytes: (customOffers.length + SEED_OFFERS.length) * 620 },
        { name: 'trades', path: '/trades', rows: tradesCount, sizeBytes: tradesCount * 740 },
        { name: 'chats', path: '/chats', rows: chatsCount, sizeBytes: chatsCount * 420 },
        { name: 'notifications', path: '/notifications', rows: notifsCount, sizeBytes: notifsCount * 280 },
        { name: 'swaps', path: '/swaps', rows: swapsCount, sizeBytes: swapsCount * 360 },
        { name: 'cards', path: '/cards', rows: cardsCount, sizeBytes: cardsCount * 512 },
      ];

      const savedAccounts: SavedAccountRow[] = directoryUsers.map((u) => ({
        ...u,
        offersCount: offersByUser.get(u.username.toLowerCase()) ?? 0,
      }));

      return {
        tablesDir: 'Cloud Firestore',
        tables,
        savedAccounts,
        customOffersCount: customOffers.length,
      };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.LIST, 'offers');
    }
  },

  async exportTablesJson(): Promise<TablesExportPayload> {
    try {
      const [
        usersSnap,
        tradersSnap,
        offersSnap,
        tradesSnap,
        chatsSnap,
        notifsSnap,
        swapsSnap,
        cardsSnap,
      ] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'traders')),
        getDocs(collection(db, 'offers')),
        getDocs(collection(db, 'trades')),
        getDocs(collection(db, 'chats')),
        getDocs(collection(db, 'notifications')),
        getDocs(collection(db, 'swaps')),
        getDocs(collection(db, 'cards')),
      ]);

      const usersMap: Record<string, Record<string, unknown>> = {};
      const authCredentialsMap: Record<string, Record<string, unknown>> = {};

      await Promise.all(
        usersSnap.docs.map(async (d) => {
          const raw = d.data();
          if (raw.tagline === REMOVED_ACCOUNT_MARKER) return;
          const u = normalizeUserDoc(raw);
          if (!u.username) return;
          const uid = String(raw.uid ?? d.id).toLowerCase();
          usersMap[uid] = {
            ...u,
            uid,
          };
          const credSnap = await getDoc(doc(db, 'authCredentials', u.username.toLowerCase())).catch(
            () => null
          );
          if (credSnap?.exists()) {
            const c = credSnap.data();
            authCredentialsMap[u.username.toLowerCase()] = {
              uid: String(c.uid ?? uid),
              username: String(c.username ?? u.username),
              lowerUsername: String(c.lowerUsername ?? u.username.toLowerCase()),
              passwordHash: String(c.passwordHash ?? ''),
              salt: String(c.salt ?? ''),
              createdAt: tsToIso(c.createdAt),
            };
          }
        })
      );

      const tradersMap: Record<string, TraderProfile & { ownerUid?: string }> = {};
      tradersSnap.docs.forEach((d) => {
        const raw = d.data();
        if (raw.tagline === REMOVED_ACCOUNT_MARKER) return;
        const t = normalizeTraderDoc(raw);
        if (t.username) {
          tradersMap[t.username] = {
            ...t,
            ownerUid: typeof raw.ownerUid === 'string' ? raw.ownerUid : t.username.toLowerCase(),
          };
        }
      });

      const customOffers = offersSnap.docs.map((d) => normalizeOfferDoc(d.data()));

      const tradesList = await Promise.all(
        tradesSnap.docs.map(async (d) => {
          const raw = d.data();
          const msgs = await fetchTradeMessages(d.id).catch(() => []);
          const base = normalizeTradeDoc(raw, msgs, undefined, true);
          return {
            ...base,
            buyerUid: String(raw.buyerUid ?? ''),
            sellerUid: String(raw.sellerUid ?? ''),
            participantUids: Array.isArray(raw.participantUids) ? raw.participantUids : [],
            buyerSettled: Boolean(raw.buyerSettled),
            sellerSettled: Boolean(raw.sellerSettled),
            buyerRefunded: Boolean(raw.buyerRefunded),
            sellerRefunded: Boolean(raw.sellerRefunded),
          };
        })
      );

      const chatsList = await Promise.all(
        chatsSnap.docs.map(async (d) => {
          const raw = d.data();
          const msgs = await fetchChatMessages(d.id).catch(() => []);
          const rawParticipants = Array.isArray(raw.participants) ? raw.participants : [];
          const participants: [string, string] = [
            String(rawParticipants[0] ?? 'Guest'),
            String(rawParticipants[1] ?? 'OOSAB Support'),
          ];
          return {
            id: String(raw.id ?? d.id),
            participants,
            participantUids: Array.isArray(raw.participantUids) ? raw.participantUids : ['support'],
            offerId: typeof raw.offerId === 'string' ? raw.offerId : undefined,
            offerSummary: typeof raw.offerSummary === 'string' ? raw.offerSummary : undefined,
            lastReadAtBy: raw.lastReadAtBy ?? undefined,
            createdAt: tsToIso(raw.createdAt),
            updatedAt: tsToIso(raw.updatedAt),
            messages: msgs,
          };
        })
      );

      const notificationsList = notifsSnap.docs.map((d) => {
        const raw = d.data();
        return {
          ...normalizeNotificationDoc(raw),
          toUid: String(raw.toUid ?? ''),
          fromUid: String(raw.fromUid ?? ''),
        };
      });

      const swapsList = swapsSnap.docs.map((d) => {
        const raw = d.data();
        return {
          ...normalizeSwapDoc(raw),
          ownerUid: String(raw.ownerUid ?? ''),
        };
      });

      const cardsList = cardsSnap.docs.map((d) => {
        const raw = d.data();
        return {
          ...normalizeCardDoc(raw),
          ownerUid: String(raw.ownerUid ?? ''),
        };
      });

      const tradeRooms: Record<string, TradeOrder> = {};
      tradesList.forEach((t) => {
        tradeRooms[t.id] = t;
      });
      const chatMap: Record<string, DirectChat> = {};
      chatsList.forEach((c) => {
        if (c.offerId !== SUPPORT_CHAT_MARKER) {
          chatMap[c.id] = c as DirectChat;
        }
      });

      return {
        exportedAt: new Date().toISOString(),
        version: 3,
        authCredentials: authCredentialsMap,
        users: usersMap,
        traders: tradersMap,
        offers: customOffers,
        tradesList,
        tradeRooms,
        chatsList,
        chats: chatMap,
        notificationsList,
        swapsList,
        cardsList,
      };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.LIST, 'users');
    }
  },

  async importTablesJson(payload: TablesExportPayload): Promise<{
    ok: boolean;
    importedUsers: number;
    importedOffers: number;
    importedTrades: number;
    importedChats: number;
  }> {
    let importedUsers = 0;
    let importedOffers = 0;
    let importedTrades = 0;
    let importedChats = 0;

    const rawUsers =
      payload.users && typeof payload.users === 'object' ? Object.values(payload.users) : [];
    const rawTraders =
      payload.traders && typeof payload.traders === 'object' ? payload.traders : {};
    const rawCreds =
      payload.authCredentials && typeof payload.authCredentials === 'object'
        ? payload.authCredentials
        : {};

    // 1. Restore accounts (/traders + /users + /usernames + /authCredentials)
    for (const entry of rawUsers) {
      if (!entry || typeof entry !== 'object') continue;
      const uRaw = entry as Record<string, unknown>;
      const username = String(uRaw.username ?? '').trim();
      if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) continue;
      const lower = username.toLowerCase();
      const uid = sanitizeDocId(String(uRaw.uid ?? lower).toLowerCase());
      const normalizedUser = normalizeUserDoc(uRaw);

      const traderEntry =
        (rawTraders[username] as Record<string, unknown> | undefined) ??
        (rawTraders[lower] as Record<string, unknown> | undefined) ??
        {};
      const normalizedTrader = normalizeTraderDoc({
        ...traderEntry,
        username,
        bio: traderEntry.bio ?? normalizedUser.bio,
        pgpFingerprint:
          traderEntry.pgpFingerprint ?? (normalizedUser.pgpKey || generatePgpFingerprint()),
      });

      const batch = writeBatch(db);

      const existingTraderSnap = await getDoc(doc(db, 'traders', username)).catch(() => null);
      if (!existingTraderSnap?.exists()) {
        batch.set(
          doc(db, 'traders', username),
          stripUndefined({
            ownerUid: uid,
            username,
            lowerUsername: lower,
            isRegisteredUser: true,
            joinedAt: normalizedTrader.joinedAt,
            tradesCount: normalizedTrader.tradesCount,
            ratingPct: normalizedTrader.ratingPct,
            avgReleaseMinutes: normalizedTrader.avgReleaseMinutes,
            lastSeenMinutes: normalizedTrader.lastSeenMinutes,
            verified: normalizedTrader.verified,
            languages: normalizedTrader.languages,
            pgpFingerprint: normalizedTrader.pgpFingerprint.slice(0, 49),
            bio: normalizedTrader.bio.slice(0, 320),
            avatarUrl: normalizedTrader.avatarUrl,
            bannerUrl: normalizedTrader.bannerUrl,
            tagline: normalizedTrader.tagline,
            location: normalizedTrader.location,
            accentTheme: normalizedTrader.accentTheme ?? 'emerald',
            preferredMethods: normalizedTrader.preferredMethods ?? [],
            tradingHours: normalizedTrader.tradingHours,
            volumeTier: normalizedTrader.volumeTier,
            totalVolumeUsd: normalizedTrader.totalVolumeUsd,
            completionRatePct: normalizedTrader.completionRatePct,
            totalFeedbackCount: normalizedTrader.totalFeedbackCount,
            recentFeedback: (normalizedTrader.recentFeedback ?? []).slice(0, 40),
            tradeHistory: (normalizedTrader.tradeHistory ?? []).slice(0, 40),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        );
      }

      const existingUserSnap = await getDoc(doc(db, 'users', uid)).catch(() => null);
      if (!existingUserSnap?.exists()) {
        batch.set(
          doc(db, 'users', uid),
          stripUndefined({
            uid,
            username,
            bio: normalizedUser.bio.slice(0, 320),
            avatarUrl: normalizedUser.avatarUrl,
            bannerUrl: normalizedUser.bannerUrl,
            tagline: normalizedUser.tagline,
            location: normalizedUser.location,
            accentTheme: normalizedUser.accentTheme ?? 'emerald',
            languages: normalizedUser.languages,
            preferredMethods: normalizedUser.preferredMethods ?? [],
            tradingHours: normalizedUser.tradingHours,
            pgpKey: normalizedUser.pgpKey.slice(0, 120),
            recoveryPhrase: normalizedUser.recoveryPhrase.slice(0, 256),
            balances: normalizedUser.balances,
            depositAddresses: normalizedUser.depositAddresses,
            walletHistory: normalizedUser.walletHistory.slice(0, 100),
            settings: normalizedUser.settings,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        );
      }

      const existingClaimSnap = await getDoc(doc(db, 'usernames', lower)).catch(() => null);
      if (!existingClaimSnap?.exists()) {
        batch.set(doc(db, 'usernames', lower), {
          uid,
          username,
          lowerUsername: lower,
          createdAt: serverTimestamp(),
        });
      }

      const cred = rawCreds[lower];
      if (cred && typeof cred.passwordHash === 'string' && typeof cred.salt === 'string') {
        const existingCredSnap = await getDoc(doc(db, 'authCredentials', lower)).catch(() => null);
        if (!existingCredSnap?.exists()) {
          batch.set(doc(db, 'authCredentials', lower), {
            uid,
            username,
            lowerUsername: lower,
            passwordHash: cred.passwordHash,
            salt: cred.salt,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }

      await batch.commit();
      importedUsers += 1;
    }

    // Restore any standalone custom traders (skipping seed profiles)
    const seedTraderSet = new Set(Object.keys(SEED_TRADERS).map((k) => k.toLowerCase()));
    for (const [key, tVal] of Object.entries(rawTraders)) {
      if (!tVal || typeof tVal !== 'object') continue;
      const tRaw = tVal as Record<string, unknown>;
      const username = String(tRaw.username ?? key).trim();
      if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) continue;
      if (seedTraderSet.has(username.toLowerCase())) continue;
      const existingT = await getDoc(doc(db, 'traders', username)).catch(() => null);
      if (existingT?.exists()) continue;
      const nt = normalizeTraderDoc(tRaw);
      await setDoc(
        doc(db, 'traders', username),
        stripUndefined({
          ownerUid: sanitizeDocId(String(tRaw.ownerUid ?? username).toLowerCase()),
          username,
          lowerUsername: username.toLowerCase(),
          isRegisteredUser: Boolean(tRaw.isRegisteredUser ?? false),
          joinedAt: nt.joinedAt,
          tradesCount: nt.tradesCount,
          ratingPct: nt.ratingPct,
          avgReleaseMinutes: nt.avgReleaseMinutes,
          lastSeenMinutes: nt.lastSeenMinutes,
          verified: nt.verified,
          languages: nt.languages,
          pgpFingerprint: nt.pgpFingerprint.slice(0, 49),
          bio: nt.bio.slice(0, 320),
          avatarUrl: nt.avatarUrl,
          bannerUrl: nt.bannerUrl,
          tagline: nt.tagline,
          location: nt.location,
          accentTheme: nt.accentTheme ?? 'emerald',
          preferredMethods: nt.preferredMethods ?? [],
          tradingHours: nt.tradingHours,
          volumeTier: nt.volumeTier,
          totalVolumeUsd: nt.totalVolumeUsd,
          completionRatePct: nt.completionRatePct,
          totalFeedbackCount: nt.totalFeedbackCount,
          recentFeedback: (nt.recentFeedback ?? []).slice(0, 40),
          tradeHistory: (nt.tradeHistory ?? []).slice(0, 40),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    }

    // 2. Restore offers
    if (Array.isArray(payload.offers)) {
      const seedIds = new Set(SEED_OFFERS.map((s) => s.id.toLowerCase()));
      for (const o of payload.offers) {
        if (!o?.id || seedIds.has(o.id.toLowerCase())) continue;
        const cleanId = sanitizeDocId(o.id);
        const ownerUid = sanitizeDocId(String(o.traderUsername ?? 'admin').toLowerCase());
        const existingOffer = await getDoc(doc(db, 'offers', cleanId)).catch(() => null);
        if (existingOffer?.exists()) continue;
        await setDoc(
          doc(db, 'offers', cleanId),
          stripUndefined({
            ...o,
            id: cleanId,
            ownerUid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        );
        importedOffers += 1;
      }
    }

    // 3. Restore trades & messages
    const rawTrades: Array<Record<string, unknown>> = Array.isArray(payload.tradesList)
      ? payload.tradesList
      : payload.tradeRooms && typeof payload.tradeRooms === 'object'
        ? (Object.values(payload.tradeRooms) as unknown as Array<Record<string, unknown>>)
        : [];
    for (const tr of rawTrades) {
      const cleanId = sanitizeDocId(String(tr.id ?? ''));
      if (!cleanId) continue;
      const existingTrade = await getDoc(doc(db, 'trades', cleanId)).catch(() => null);
      if (!existingTrade?.exists()) {
        const finalStatus = String(tr.status ?? 'escrow_funded');
        const buyerUsername = String(tr.buyerUsername ?? '');
        const sellerUsername = String(tr.sellerUsername ?? '');
        const buyerUid = String(tr.buyerUid ?? buyerUsername.toLowerCase());
        const sellerUid = String(tr.sellerUid ?? sellerUsername.toLowerCase());
        const baseDoc = stripUndefined({
          id: cleanId,
          offerId: sanitizeDocId(String(tr.offerId ?? 'off-101')),
          side: tr.side ?? 'sell_crypto',
          traderUsername: String(tr.traderUsername ?? sellerUsername),
          buyerUsername,
          sellerUsername,
          buyerUid,
          sellerUid,
          participantUids: Array.isArray(tr.participantUids) && tr.participantUids.length > 0
            ? tr.participantUids
            : [buyerUid, sellerUid].filter(Boolean).slice(0, 2),
          crypto: tr.crypto ?? 'BTC',
          cryptoChain: tr.cryptoChain,
          swapToCrypto: tr.swapToCrypto,
          swapToChain: tr.swapToChain,
          swapToAmount: tr.swapToAmount,
          fiat: tr.fiat ?? 'USD',
          fiatAmount: Number(tr.fiatAmount ?? 100),
          cryptoAmount: Number(tr.cryptoAmount ?? 0.001),
          unitPrice: Number(tr.unitPrice ?? 1),
          paymentMethod: String(tr.paymentMethod ?? 'Bank Transfer'),
          paymentDetails: String(tr.paymentDetails ?? ''),
          terms: String(tr.terms ?? ''),
          status: 'escrow_funded',
          counterpartyIsReal: Boolean(tr.counterpartyIsReal ?? true),
          buyerSettled: Boolean(tr.buyerSettled),
          sellerSettled: Boolean(tr.sellerSettled),
          buyerRefunded: Boolean(tr.buyerRefunded),
          sellerRefunded: Boolean(tr.sellerRefunded),
          lastReadAtBy: tr.lastReadAtBy,
          feedbackBy: tr.feedbackBy,
          expiresAt: String(tr.expiresAt ?? new Date().toISOString()),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'trades', cleanId), baseDoc);
        if (finalStatus !== 'escrow_funded') {
          await updateDoc(doc(db, 'trades', cleanId), {
            status: finalStatus,
            updatedAt: serverTimestamp(),
          });
        }
        const msgs = Array.isArray(tr.messages) ? (tr.messages as Array<Record<string, unknown>>) : [];
        for (const m of msgs) {
          const msgId = sanitizeDocId(String(m.id ?? `msg_${randomHex(6)}`));
          await setDoc(
            doc(db, 'trades', cleanId, 'messages', msgId),
            stripUndefined({
              id: msgId,
              sender: String(m.sender ?? 'System').slice(0, 64),
              senderUid: sanitizeDocId(String(m.sender ?? 'system').toLowerCase()) || 'system',
              text: String(m.text ?? ' ').slice(0, 2000),
              isSystem: typeof m.isSystem === 'boolean' ? m.isSystem : undefined,
              createdAt: serverTimestamp(),
            })
          ).catch(() => undefined);
        }
        importedTrades += 1;
      }
    }

    // 4. Restore direct chats & 24/7 support threads + messages
    const rawChats: Array<Record<string, unknown>> = Array.isArray(payload.chatsList)
      ? payload.chatsList
      : payload.chats && typeof payload.chats === 'object'
        ? (Object.values(payload.chats) as unknown as Array<Record<string, unknown>>)
        : [];
    for (const ch of rawChats) {
      const cleanId = sanitizeDocId(String(ch.id ?? ''));
      if (!cleanId) continue;
      const existingChat = await getDoc(doc(db, 'chats', cleanId)).catch(() => null);
      if (!existingChat?.exists()) {
        const participants = Array.isArray(ch.participants) && ch.participants.length === 2
          ? ch.participants
          : ['Guest', 'OOSAB Support'];
        const participantUids =
          Array.isArray(ch.participantUids) && ch.participantUids.length > 0
            ? ch.participantUids.slice(0, 2)
            : [String(participants[0] ?? 'guest').toLowerCase()];
        await setDoc(
          doc(db, 'chats', cleanId),
          stripUndefined({
            id: cleanId,
            participants,
            participantUids,
            offerId: typeof ch.offerId === 'string' ? ch.offerId : undefined,
            offerSummary: typeof ch.offerSummary === 'string' ? ch.offerSummary : undefined,
            lastReadAtBy: ch.lastReadAtBy,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        );
        const msgs = Array.isArray(ch.messages) ? (ch.messages as Array<Record<string, unknown>>) : [];
        for (const m of msgs) {
          const msgId = sanitizeDocId(String(m.id ?? `cmsg_${randomHex(6)}`));
          await setDoc(
            doc(db, 'chats', cleanId, 'messages', msgId),
            stripUndefined({
              id: msgId,
              sender: String(m.sender ?? 'Client').slice(0, 64),
              senderUid: sanitizeDocId(String(m.senderUid ?? m.sender ?? 'visitor').toLowerCase()) || 'visitor',
              text: String(m.text ?? ' ').slice(0, 2000),
              offerId: typeof m.offerId === 'string' ? m.offerId : undefined,
              createdAt: serverTimestamp(),
            })
          ).catch(() => undefined);
        }
        importedChats += 1;
      }
    }

    // 5. Restore notifications, swaps, cards
    if (Array.isArray(payload.notificationsList)) {
      for (const n of payload.notificationsList) {
        const nid = sanitizeDocId(String(n.id ?? ''));
        if (!nid) continue;
        const ex = await getDoc(doc(db, 'notifications', nid)).catch(() => null);
        if (ex?.exists()) continue;
        await setDoc(
          doc(db, 'notifications', nid),
          stripUndefined({
            ...n,
            id: nid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        ).catch(() => undefined);
      }
    }

    if (Array.isArray(payload.swapsList)) {
      for (const s of payload.swapsList) {
        const sid = sanitizeDocId(String(s.id ?? ''));
        if (!sid) continue;
        const ex = await getDoc(doc(db, 'swaps', sid)).catch(() => null);
        if (ex?.exists()) continue;
        await setDoc(
          doc(db, 'swaps', sid),
          stripUndefined({
            ...s,
            id: sid,
            createdAt: serverTimestamp(),
          })
        ).catch(() => undefined);
      }
    }

    if (Array.isArray(payload.cardsList)) {
      for (const k of payload.cardsList) {
        const kid = sanitizeDocId(String(k.id ?? ''));
        if (!kid) continue;
        const ex = await getDoc(doc(db, 'cards', kid)).catch(() => null);
        if (ex?.exists()) continue;
        await setDoc(
          doc(db, 'cards', kid),
          stripUndefined({
            ...k,
            id: kid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        ).catch(() => undefined);
      }
    }

    return {
      ok: true,
      importedUsers,
      importedOffers,
      importedTrades,
      importedChats,
    };
  },

  // -------------------------------------------------------------------------
  // Admin Live Trades Console Methods
  // -------------------------------------------------------------------------
  adminSubscribeAllTrades(
    onTrades: (trades: TradeOrder[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    return onSnapshot(
      query(collection(db, 'trades'), limit(60)),
      (snap) => {
        const list = snap.docs
          .map((d) => normalizeTradeDoc(d.data(), [], undefined, true))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onTrades(list);
      },
      (err) => {
        if (onError) {
          onError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    );
  },

  adminSubscribeTradeMessages(
    tradeId: string,
    onMessages: (messages: TradeMessage[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const q = query(
      collection(db, 'trades', tradeId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(80)
    );
    return onSnapshot(
      q,
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
        onMessages(msgs);
      },
      (err) => {
        if (onError) {
          onError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    );
  },

  async adminSendTradeMessage(
    tradeId: string,
    text: string,
    options?: {
      isSystem?: boolean;
      imageUrl?: string;
      senderName?: string;
      asRole?: 'admin' | 'system' | 'buyer' | 'seller';
    }
  ): Promise<void> {
    const clean = text.trim().slice(0, 2000);
    const cleanImage = options?.imageUrl ? sanitizeImageField(options.imageUrl) : undefined;
    if (options?.imageUrl && !cleanImage) {
      throw new ApiError('Invalid image format or size.', 400);
    }
    if (!clean && !cleanImage) {
      throw new ApiError('Message or image cannot be empty.', 400);
    }

    const session = await getSessionContext();
    const asRole = options?.asRole ?? (options?.isSystem ? 'system' : 'admin');
    const msgText = clean || '[Photo uploaded]';
    const tradeRef = doc(db, 'trades', tradeId);

    try {
      const snap = await getDoc(tradeRef);
      if (!snap.exists()) throw new ApiError('Trade not found', 404);
      const tData = snap.data();
      const prevRead = (tData.lastReadAtBy ?? {}) as Record<string, string>;
      const buyerUid = String(tData.buyerUid ?? '');
      const sellerUid = String(tData.sellerUid ?? '');
      const buyerUsername = String(tData.buyerUsername ?? 'Buyer');
      const sellerUsername = String(tData.sellerUsername ?? 'Seller');

      let sender = 'Escrow Admin';
      let senderUid = session?.uid || 'escrow_admin';
      let isSystem = false;

      if (asRole === 'buyer') {
        sender = (options?.senderName || buyerUsername).slice(0, 64);
        senderUid = buyerUid || session?.uid || 'escrow_admin';
        isSystem = false;
      } else if (asRole === 'seller') {
        sender = (options?.senderName || sellerUsername).slice(0, 64);
        senderUid = sellerUid || session?.uid || 'escrow_admin';
        isSystem = false;
      } else if (asRole === 'system') {
        sender = (options?.senderName || 'Escrow System').slice(0, 64);
        isSystem = true;
      } else {
        sender = (options?.senderName || 'Escrow Admin').slice(0, 64);
        isSystem = Boolean(options?.isSystem);
      }

      const msgId = `msg-${randomHex(4)}`;
      const nextRead: Record<string, string> = { ...prevRead };
      if (asRole === 'buyer' || asRole === 'seller') {
        nextRead[`__spoofHidden_${msgId}`] = asRole;
      }
      if (asRole === 'buyer' && prevRead.__muteFrom_buyer === '1') {
        nextRead[`__mutedMsg_${msgId}`] = 'buyer';
      } else if (asRole === 'seller' && prevRead.__muteFrom_seller === '1') {
        nextRead[`__mutedMsg_${msgId}`] = 'seller';
      }
      if (cleanImage) {
        nextRead[`__img_${msgId}`] = cleanImage;
      }

      const batch = writeBatch(db);
      batch.set(
        doc(db, 'trades', tradeId, 'messages', msgId),
        stripUndefined({
          id: msgId,
          sender,
          senderUid,
          text: msgText,
          isSystem,
          createdAt: serverTimestamp(),
        })
      );
      batch.update(tradeRef, {
        lastReadAtBy: nextRead,
        updatedAt: serverTimestamp(),
      });

      const preview = clean || (asRole === 'buyer' || asRole === 'seller' ? 'Sent an image attachment in trade chat.' : 'Attached an image in trade chat.');

      if (asRole === 'buyer' || asRole === 'seller') {
        const targetUid = asRole === 'buyer' ? sellerUid : buyerUid;
        const isMutedFromRecipient =
          (asRole === 'buyer' && prevRead.__muteFrom_buyer === '1') ||
          (asRole === 'seller' && prevRead.__muteFrom_seller === '1');
        if (
          targetUid &&
          !targetUid.startsWith('seed_') &&
          targetUid !== senderUid &&
          !isMutedFromRecipient
        ) {
          const notifId = `ntf-${randomHex(4)}`;
          batch.set(
            doc(db, 'notifications', notifId),
            createNotificationPayload({
              id: notifId,
              toUid: targetUid,
              fromUid: senderUid,
              type: 'trade_message',
              title: `Message from ${sender}`,
              body: preview.length > 90 ? `${preview.slice(0, 87)}...` : preview,
              tradeId,
              fromUsername: sender.slice(0, 40),
            })
          );
        }
      } else {
        for (const targetUid of [buyerUid, sellerUid]) {
          if (targetUid && !targetUid.startsWith('seed_') && targetUid !== senderUid) {
            const notifId = `ntf-${randomHex(4)}`;
            batch.set(
              doc(db, 'notifications', notifId),
              createNotificationPayload({
                id: notifId,
                toUid: targetUid,
                fromUid: senderUid,
                type: 'trade_message',
                title: `${sender} posted in ${tradeId}`,
                body: preview.length > 90 ? `${preview.slice(0, 87)}...` : preview,
                tradeId,
                fromUsername: sender.slice(0, 40),
              })
            );
          }
        }
      }

      await batch.commit();
    } catch (err) {
      return wrapFirestoreError(err, OperationType.WRITE, `trades/${tradeId}`);
    }
  },

  async adminSetTradeMessageImageHidden(
    tradeId: string,
    msgId: string,
    hidden: boolean
  ): Promise<void> {
    const tradeRef = doc(db, 'trades', tradeId);
    try {
      const snap = await getDoc(tradeRef);
      if (!snap.exists()) throw new ApiError('Trade not found', 404);
      const tData = snap.data();
      const nextRead = { ...((tData.lastReadAtBy ?? {}) as Record<string, string>) };
      const key = `__imgHidden_${msgId}`;
      if (hidden) {
        nextRead[key] = '1';
      } else {
        delete nextRead[key];
      }
      await updateDoc(tradeRef, {
        lastReadAtBy: nextRead,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      return wrapFirestoreError(err, OperationType.UPDATE, `trades/${tradeId}`);
    }
  },

  async adminSetTradeSenderInvisible(
    tradeId: string,
    hiddenSenderRole: 'buyer' | 'seller',
    invisible: boolean
  ): Promise<void> {
    const tradeRef = doc(db, 'trades', tradeId);
    try {
      const snap = await getDoc(tradeRef);
      if (!snap.exists()) throw new ApiError('Trade not found', 404);
      const tData = snap.data();
      const nextRead = { ...((tData.lastReadAtBy ?? {}) as Record<string, string>) };
      const key = hiddenSenderRole === 'buyer' ? '__muteFrom_buyer' : '__muteFrom_seller';
      if (invisible) {
        nextRead[key] = '1';
      } else {
        delete nextRead[key];
        for (const metaKey of Object.keys(nextRead)) {
          if (metaKey.startsWith('__mutedMsg_') && nextRead[metaKey] === hiddenSenderRole) {
            delete nextRead[metaKey];
          }
        }
      }
      await updateDoc(tradeRef, {
        lastReadAtBy: nextRead,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      return wrapFirestoreError(err, OperationType.UPDATE, `trades/${tradeId}`);
    }
  },

  async adminDeleteTradeMessage(tradeId: string, msgId: string): Promise<void> {
    const tradeRef = doc(db, 'trades', tradeId);
    try {
      const snap = await getDoc(tradeRef);
      if (!snap.exists()) throw new ApiError('Trade not found', 404);
      const tData = snap.data();
      const nextRead = { ...((tData.lastReadAtBy ?? {}) as Record<string, string>) };
      nextRead[`__deleted_${msgId}`] = '1';
      delete nextRead[`__img_${msgId}`];
      delete nextRead[`__imgHidden_${msgId}`];
      delete nextRead[`__mutedMsg_${msgId}`];
      delete nextRead[`__spoofHidden_${msgId}`];
      await updateDoc(tradeRef, {
        lastReadAtBy: nextRead,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      return wrapFirestoreError(err, OperationType.UPDATE, `trades/${tradeId}`);
    }
  },

  async adminTradeAction(
    tradeId: string,
    action: 'fund_escrow' | 'mark_paid' | 'release' | 'cancel' | 'dispute' | 'reopen',
    note?: string
  ): Promise<TradeOrder> {
    const session = await getSessionContext();
    const actorUid = session?.uid || 'escrow_admin';
    const tradeRef = doc(db, 'trades', tradeId);

    const snap = await getDoc(tradeRef).catch((err) =>
      wrapFirestoreError(err, OperationType.GET, `trades/${tradeId}`)
    );
    if (!snap.exists()) throw new ApiError('Trade not found', 404);

    const tData = snap.data();
    const trade = normalizeTradeDoc(tData, [], undefined, true);
    const { buyerUid, sellerUid } = trade._internal;
    const buyerIsReal = Boolean(buyerUid) && !buyerUid.startsWith('seed_');
    const sellerIsReal = Boolean(sellerUid) && !sellerUid.startsWith('seed_');

    const nextLastReadAtBy: Record<string, string> = {
      ...((tData.lastReadAtBy ?? {}) as Record<string, string>),
    };
    const escrowState = nextLastReadAtBy.__escrowState;
    const nowIso = new Date().toISOString();
    const batch = writeBatch(db);

    let nextStatus = trade.status;
    let buyerSettled = Boolean(tData.buyerSettled);
    let sellerSettled = Boolean(tData.sellerSettled);
    let buyerRefunded = Boolean(tData.buyerRefunded);
    let sellerRefunded = Boolean(tData.sellerRefunded);
    let sysText = '';
    let notifTitle = '';
    let notifBody = '';

    if (action === 'fund_escrow') {
      if (trade.status === 'completed' || trade.status === 'cancelled' || trade.status === 'disputed') {
        nextStatus = 'escrow_funded';
      }
      if (escrowState === 'awaiting_seller') {
        let deductedFromSeller = false;
        if (sellerIsReal) {
          const sellerSnap = await getDoc(doc(db, 'users', sellerUid)).catch(() => null);
          if (sellerSnap?.exists()) {
            const sellerAcct = normalizeUserDoc(sellerSnap.data());
            if ((sellerAcct.balances[trade.crypto] ?? 0) >= trade.cryptoAmount - 1e-8) {
              const nextBal = {
                ...sellerAcct.balances,
                [trade.crypto]: Number(
                  Math.max(0, (sellerAcct.balances[trade.crypto] ?? 0) - trade.cryptoAmount).toFixed(8)
                ),
              };
              batch.update(doc(db, 'users', sellerUid), {
                balances: nextBal,
                updatedAt: serverTimestamp(),
              });
              deductedFromSeller = true;
            }
          }
        }
        if (deductedFromSeller) {
          delete nextLastReadAtBy.__adminEscrowOverride;
          sellerRefunded = false;
        } else {
          nextLastReadAtBy.__adminEscrowOverride = '1';
          sellerRefunded = true;
        }
      }
      nextLastReadAtBy.__escrowState = 'funded';
      delete nextLastReadAtBy.__closedByAdmin;
      sysText =
        note?.trim() ||
        `Escrow Admin marked ${trade.cryptoAmount.toFixed(6)} ${trade.crypto} escrow as funded on ${trade.id}.`;
      notifTitle = `Escrow funded by Admin (${trade.id})`;
      notifBody = `Escrow is now marked funded on trade ${trade.id}.`;
    } else if (action === 'mark_paid') {
      nextStatus = 'payment_sent';
      nextLastReadAtBy.__escrowState = 'funded';
      delete nextLastReadAtBy.__closedByAdmin;
      sysText =
        note?.trim() ||
        `Escrow Admin marked ${trade.paymentMethod} payment as sent for trade ${trade.id}.`;
      notifTitle = `Payment marked sent (${trade.id})`;
      notifBody = `Escrow Admin updated trade ${trade.id} to Payment Sent.`;
    } else if (action === 'release') {
      const alreadyFunded = escrowState === 'funded';
      if (!alreadyFunded && sellerIsReal && (trade.side === 'sell_crypto' || trade.side === 'swap_crypto')) {
        const sellerSnap = await getDoc(doc(db, 'users', sellerUid)).catch(() => null);
        if (sellerSnap?.exists()) {
          const sellerAcct = normalizeUserDoc(sellerSnap.data());
          if ((sellerAcct.balances[trade.crypto] ?? 0) >= trade.cryptoAmount - 1e-8) {
            const nextBal = {
              ...sellerAcct.balances,
              [trade.crypto]: Number(
                Math.max(0, (sellerAcct.balances[trade.crypto] ?? 0) - trade.cryptoAmount).toFixed(8)
              ),
            };
            batch.update(doc(db, 'users', sellerUid), {
              balances: nextBal,
              updatedAt: serverTimestamp(),
            });
          }
        }
      }

      nextStatus = 'completed';
      nextLastReadAtBy.__escrowState = 'funded';
      nextLastReadAtBy.__closedByAdmin = nowIso;
      buyerSettled = buyerIsReal ? false : true;
      sellerSettled = trade.side === 'swap_crypto' && sellerIsReal ? false : true;

      const updateTraderRecord = async (
        tName: string,
        recSide: 'Bought' | 'Sold',
        counterName: string
      ) => {
        const tSnap = await getDoc(doc(db, 'traders', tName)).catch(() => null);
        if (!tSnap?.exists()) return;
        const t = normalizeTraderDoc(tSnap.data());
        const nextHistory = [
          {
            id: trade.id,
            asset: trade.crypto,
            cryptoAmount: Number(trade.cryptoAmount.toFixed(6)),
            fiatAmount: Number(trade.fiatAmount.toFixed(2)),
            fiat: trade.fiat,
            paymentMethod: trade.paymentMethod,
            side: recSide,
            counterparty: counterName,
            completedAt: 'Just now',
          },
          ...(t.tradeHistory ?? []),
        ].slice(0, 40);
        batch.update(doc(db, 'traders', tName), {
          tradesCount: t.tradesCount + 1,
          tradeHistory: nextHistory,
          lastTradeId: trade.id,
          updatedAt: serverTimestamp(),
        });
      };

      await updateTraderRecord(trade.buyerUsername, 'Bought', trade.sellerUsername);
      await updateTraderRecord(trade.sellerUsername, 'Sold', trade.buyerUsername);

      sysText =
        note?.trim() ||
        `Escrow Admin completed trade ${trade.id} and released ${trade.cryptoAmount.toFixed(6)} ${trade.crypto} to @${trade.buyerUsername}.`;
      notifTitle = `Trade ${trade.id} completed by Admin`;
      notifBody = `${trade.cryptoAmount.toFixed(6)} ${trade.crypto} released to @${trade.buyerUsername}.`;
    } else if (action === 'cancel') {
      nextStatus = 'cancelled';
      nextLastReadAtBy.__closedByAdmin = nowIso;
      const sellerHadFunded =
        (escrowState === 'funded' ||
          (trade.side === 'buy_crypto' && escrowState !== 'awaiting_seller')) &&
        nextLastReadAtBy.__adminEscrowOverride !== '1';
      sellerRefunded = sellerHadFunded && sellerIsReal ? false : true;
      buyerRefunded = trade.side === 'swap_crypto' && buyerIsReal ? false : true;
      sysText =
        note?.trim() ||
        `Trade ${trade.id} was closed & cancelled by Escrow Admin.`;
      notifTitle = `Trade ${trade.id} closed by Admin`;
      notifBody = `Escrow Admin closed and cancelled trade ${trade.id}.`;
    } else if (action === 'dispute') {
      nextStatus = 'disputed';
      sysText =
        note?.trim() ||
        `Escrow Admin placed trade ${trade.id} into Dispute Freeze for review.`;
      notifTitle = `Trade ${trade.id} frozen in dispute`;
      notifBody = `Escrow Admin flagged trade ${trade.id} for dispute arbitration.`;
    } else {
      nextStatus = 'escrow_funded';
      delete nextLastReadAtBy.__closedByAdmin;
      sysText =
        note?.trim() ||
        `Trade ${trade.id} reopened by Escrow Admin.`;
      notifTitle = `Trade ${trade.id} reopened`;
      notifBody = `Escrow Admin reopened trade ${trade.id}.`;
    }

    batch.update(tradeRef, {
      status: nextStatus,
      buyerSettled,
      sellerSettled,
      buyerRefunded,
      sellerRefunded,
      lastReadAtBy: nextLastReadAtBy,
      updatedAt: serverTimestamp(),
    });

    const sysId = `msg-${randomHex(4)}`;
    batch.set(doc(db, 'trades', tradeId, 'messages', sysId), {
      id: sysId,
      sender: 'Escrow System',
      senderUid: actorUid,
      text: sysText,
      isSystem: true,
      createdAt: serverTimestamp(),
    });

    for (const targetUid of [buyerUid, sellerUid]) {
      if (targetUid && !targetUid.startsWith('seed_')) {
        const notifId = `ntf-${randomHex(4)}`;
        batch.set(
          doc(db, 'notifications', notifId),
          createNotificationPayload({
            id: notifId,
            toUid: targetUid,
            fromUid: actorUid,
            type: 'trade_status',
            title: notifTitle,
            body: notifBody,
            tradeId: trade.id,
            fromUsername: 'Escrow Admin',
          })
        );
      }
    }

    try {
      await batch.commit();
      const msgs = await fetchTradeMessages(tradeId);
      return normalizeTradeDoc(
        {
          ...tData,
          status: nextStatus,
          buyerSettled,
          sellerSettled,
          buyerRefunded,
          sellerRefunded,
          lastReadAtBy: nextLastReadAtBy,
        },
        msgs,
        undefined,
        true
      );
    } catch (err) {
      return wrapFirestoreError(err, OperationType.WRITE, `trades/${tradeId}`);
    }
  },

  // -------------------------------------------------------------------------
  // Admin Account, Profile, Reviews & History Moderation Methods
  // -------------------------------------------------------------------------
  async adminGetAccountDetails(targetUsername: string): Promise<AdminAccountDetails> {
    const clean = targetUsername.trim();
    if (!clean) throw new ApiError('Select an account first.', 400);

    const target = await resolveUsernameTarget(clean);
    if (!target.isReal || !target.uid) {
      throw new ApiError(`Registered account "${clean}" not found.`, 404);
    }

    const uid = target.uid;
    const canonical = target.canonicalUsername;
    try {
      const [uSnap, tSnap, offersSnap] = await Promise.all([
        getDoc(doc(db, 'users', uid)),
        getDoc(doc(db, 'traders', canonical)),
        getDocs(query(collection(db, 'offers'), where('traderUsername', '==', canonical))),
      ]);

      if (!uSnap.exists() || !tSnap.exists()) {
        throw new ApiError(`Account records for "${clean}" were not found.`, 404);
      }
      const uRaw = uSnap.data();
      const tRaw = tSnap.data();
      if (uRaw.tagline === REMOVED_ACCOUNT_MARKER || tRaw.tagline === REMOVED_ACCOUNT_MARKER) {
        throw new ApiError(`Account @${canonical} has been removed.`, 404);
      }

      const user = normalizeUserDoc(uRaw);
      const trader = normalizeTraderDoc(tRaw);
      const offers = offersSnap.docs
        .map((d) => normalizeOfferDoc(d.data()))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return {
        uid,
        username: canonical,
        createdAt: user.createdAt,
        user,
        trader,
        offers,
      };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.GET, `users/${uid}`);
    }
  },

  async adminUpdateAccount(
    targetUsername: string,
    payload: {
      joinedAt?: string;
      tradesCount?: number;
      ratingPct?: number;
      avgReleaseMinutes?: number;
      completionRatePct?: number;
      lastSeenMinutes?: number;
      verified?: boolean;
      totalVolumeUsd?: number;
      volumeTier?: string;
      totalFeedbackCount?: number;
      bio?: string;
      tagline?: string;
      location?: string;
      tradingHours?: string;
      balances?: Partial<Record<CryptoAsset, number>>;
      clearWalletHistory?: boolean;
      removeAvatar?: boolean;
      removeBanner?: boolean;
    }
  ): Promise<AdminAccountDetails> {
    const clean = targetUsername.trim();
    if (!clean) throw new ApiError('Select an account first.', 400);

    const target = await resolveUsernameTarget(clean);
    if (!target.isReal || !target.uid) {
      throw new ApiError(`Registered account "${clean}" not found.`, 404);
    }

    const uid = target.uid;
    const canonical = target.canonicalUsername;
    const userRef = doc(db, 'users', uid);
    const traderRef = doc(db, 'traders', canonical);

    const [uSnap, tSnap] = await Promise.all([
      getDoc(userRef).catch((err) => wrapFirestoreError(err, OperationType.GET, `users/${uid}`)),
      getDoc(traderRef).catch((err) =>
        wrapFirestoreError(err, OperationType.GET, `traders/${canonical}`)
      ),
    ]);

    if (!uSnap.exists() || !tSnap.exists()) {
      throw new ApiError(`Account "${clean}" not found.`, 404);
    }
    const existingUser = normalizeUserDoc(uSnap.data());
    if (
      uSnap.data().tagline === REMOVED_ACCOUNT_MARKER ||
      tSnap.data().tagline === REMOVED_ACCOUNT_MARKER
    ) {
      throw new ApiError(`Account @${canonical} has been removed.`, 404);
    }

    const userUpdates: Record<string, unknown> = { updatedAt: serverTimestamp() };
    const traderUpdates: Record<string, unknown> = { updatedAt: serverTimestamp() };

    if (typeof payload.joinedAt === 'string' && payload.joinedAt.trim()) {
      traderUpdates.joinedAt = payload.joinedAt.trim().slice(0, 32);
    }
    if (typeof payload.tradesCount === 'number' && Number.isFinite(payload.tradesCount)) {
      traderUpdates.tradesCount = Math.max(0, Math.round(payload.tradesCount));
    }
    if (typeof payload.ratingPct === 'number' && Number.isFinite(payload.ratingPct)) {
      traderUpdates.ratingPct = Math.max(0, Math.min(100, Math.round(payload.ratingPct)));
    }
    if (typeof payload.avgReleaseMinutes === 'number' && Number.isFinite(payload.avgReleaseMinutes)) {
      traderUpdates.avgReleaseMinutes = Math.max(0, Math.round(payload.avgReleaseMinutes));
    }
    if (
      typeof payload.completionRatePct === 'number' &&
      Number.isFinite(payload.completionRatePct)
    ) {
      traderUpdates.completionRatePct = Math.max(
        0,
        Math.min(100, Number(payload.completionRatePct.toFixed(1)))
      );
    }
    if (typeof payload.lastSeenMinutes === 'number' && Number.isFinite(payload.lastSeenMinutes)) {
      traderUpdates.lastSeenMinutes = Math.max(0, Math.round(payload.lastSeenMinutes));
    }
    if (typeof payload.verified === 'boolean') {
      traderUpdates.verified = payload.verified;
    }
    if (typeof payload.totalVolumeUsd === 'number' && Number.isFinite(payload.totalVolumeUsd)) {
      const nextVol = Math.max(0, Number(payload.totalVolumeUsd.toFixed(2)));
      traderUpdates.totalVolumeUsd = nextVol;
      if (typeof payload.volumeTier !== 'string') {
        traderUpdates.volumeTier =
          nextVol >= 250000
            ? '$250K+ Desk'
            : nextVol >= 50000
              ? '$50K+ Desk'
              : nextVol >= 10000
                ? '$10K+ Trader'
                : 'Starter';
      }
    }
    if (typeof payload.volumeTier === 'string' && payload.volumeTier.trim()) {
      traderUpdates.volumeTier = payload.volumeTier.trim().slice(0, 40);
    }
    if (
      typeof payload.totalFeedbackCount === 'number' &&
      Number.isFinite(payload.totalFeedbackCount)
    ) {
      traderUpdates.totalFeedbackCount = Math.max(0, Math.round(payload.totalFeedbackCount));
    }
    if (typeof payload.bio === 'string') {
      const cleanBio = payload.bio.trim().slice(0, 320);
      userUpdates.bio = cleanBio;
      traderUpdates.bio = cleanBio;
    }
    if (typeof payload.tagline === 'string') {
      const cleanTagline = payload.tagline.trim().slice(0, 90);
      const safeTagline =
        cleanTagline === REMOVED_ACCOUNT_MARKER ? null : cleanTagline || null;
      userUpdates.tagline = safeTagline;
      traderUpdates.tagline = safeTagline;
    }
    if (typeof payload.location === 'string') {
      const cleanLoc = payload.location.trim().slice(0, 60) || null;
      userUpdates.location = cleanLoc;
      traderUpdates.location = cleanLoc;
    }
    if (typeof payload.tradingHours === 'string') {
      const cleanHours = payload.tradingHours.trim().slice(0, 60) || null;
      userUpdates.tradingHours = cleanHours;
      traderUpdates.tradingHours = cleanHours;
    }
    if (payload.removeAvatar) {
      userUpdates.avatarUrl = null;
      traderUpdates.avatarUrl = null;
    }
    if (payload.removeBanner) {
      userUpdates.bannerUrl = null;
      traderUpdates.bannerUrl = null;
    }
    if (payload.clearWalletHistory) {
      userUpdates.walletHistory = [];
    }
    if (payload.balances) {
      const nextBalances = { ...existingUser.balances };
      for (const asset of SUPPORTED_ASSETS) {
        const val = payload.balances[asset];
        if (typeof val === 'number' && Number.isFinite(val) && val >= 0) {
          nextBalances[asset] = Number(val.toFixed(8));
        }
      }
      userUpdates.balances = nextBalances;
    }

    const batch = writeBatch(db);
    batch.update(userRef, userUpdates);
    batch.update(traderRef, traderUpdates);

    try {
      await batch.commit();
      return await api.adminGetAccountDetails(canonical);
    } catch (err) {
      return wrapFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    }
  },

  async adminAddFeedback(
    targetUsername: string,
    payload: {
      custom?: {
        author?: string;
        comment: string;
        positive?: boolean;
        asset?: CryptoAsset;
        date?: string;
      };
      generateCount?: number;
      asset?: CryptoAsset | 'MIXED';
      positiveOnly?: boolean;
      incrementTradesCount?: boolean;
      recalcRating?: boolean;
    }
  ): Promise<{ trader: TraderProfile; addedCount: number }> {
    const clean = targetUsername.trim();
    const target = await resolveUsernameTarget(clean);
    if (!target.isReal || !target.uid) {
      throw new ApiError(`Registered account "${clean}" not found.`, 404);
    }

    const tRef = doc(db, 'traders', target.canonicalUsername);
    const tSnap = await getDoc(tRef).catch((err) =>
      wrapFirestoreError(err, OperationType.GET, `traders/${target.canonicalUsername}`)
    );
    if (!tSnap.exists()) {
      throw new ApiError(`Trader profile "${clean}" not found.`, 404);
    }

    const t = normalizeTraderDoc(tSnap.data());
    const added: TraderFeedback[] = [];

    if (payload.custom) {
      const comment = payload.custom.comment.trim().slice(0, 400);
      if (!comment) {
        throw new ApiError('Enter a feedback comment first.', 400);
      }
      const author =
        payload.custom.author?.trim().slice(0, 32) ||
        pickRandomBuyerAuthor([t.username, ...t.recentFeedback.map((f) => f.author)]);
      added.push({
        id: `fb-${randomHex(4)}`,
        author,
        positive: payload.custom.positive !== false,
        comment,
        asset: payload.custom.asset ?? 'BTC',
        date: (payload.custom.date?.trim() || 'Just now').slice(0, 32),
      });
    } else if (typeof payload.generateCount === 'number' && payload.generateCount > 0) {
      const generated = generateRandomBuyerFeedback({
        targetUsername: t.username,
        count: payload.generateCount,
        asset: payload.asset ?? 'MIXED',
        existingAuthors: t.recentFeedback.map((f) => f.author),
        positiveOnly: payload.positiveOnly !== false,
      });
      for (const item of generated) {
        added.push({
          id: `fb-${randomHex(4)}`,
          ...item,
        });
      }
    } else {
      throw new ApiError('Provide a feedback comment or a count to generate.', 400);
    }

    const nextFeedback = [...added, ...t.recentFeedback].slice(0, 40);
    const nextTotalFeedback = Math.max(
      nextFeedback.length,
      (t.totalFeedbackCount ?? t.recentFeedback.length) + added.length
    );
    const nextTradesCount = payload.incrementTradesCount
      ? t.tradesCount + added.length
      : t.tradesCount;

    let nextRating = t.ratingPct;
    if (payload.recalcRating && nextFeedback.length > 0) {
      const pos = nextFeedback.filter((f) => f.positive).length;
      nextRating = Math.round((pos / nextFeedback.length) * 100);
    }

    try {
      await updateDoc(tRef, {
        recentFeedback: nextFeedback,
        totalFeedbackCount: nextTotalFeedback,
        tradesCount: nextTradesCount,
        ratingPct: nextRating,
        updatedAt: serverTimestamp(),
      });
      return {
        trader: {
          ...t,
          recentFeedback: nextFeedback,
          totalFeedbackCount: nextTotalFeedback,
          tradesCount: nextTradesCount,
          ratingPct: nextRating,
        },
        addedCount: added.length,
      };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.UPDATE, `traders/${target.canonicalUsername}`);
    }
  },

  async adminRemoveFeedback(
    targetUsername: string,
    feedbackId: string,
    recalcRating = true
  ): Promise<{ trader: TraderProfile }> {
    const clean = targetUsername.trim();
    const target = await resolveUsernameTarget(clean);
    if (!target.isReal || !target.uid) {
      throw new ApiError(`Registered account "${clean}" not found.`, 404);
    }

    const tRef = doc(db, 'traders', target.canonicalUsername);
    const tSnap = await getDoc(tRef).catch((err) =>
      wrapFirestoreError(err, OperationType.GET, `traders/${target.canonicalUsername}`)
    );
    if (!tSnap.exists()) {
      throw new ApiError(`Trader profile "${clean}" not found.`, 404);
    }

    const t = normalizeTraderDoc(tSnap.data());
    const nextFeedback = t.recentFeedback.filter((fb) => fb.id !== feedbackId);
    const removedCount = t.recentFeedback.length - nextFeedback.length;
    if (removedCount === 0) {
      return { trader: t };
    }

    const prevTotal = t.totalFeedbackCount ?? t.recentFeedback.length;
    const nextTotalFeedback = Math.max(nextFeedback.length, Math.max(0, prevTotal - removedCount));
    let nextRating = t.ratingPct;
    if (recalcRating) {
      if (nextFeedback.length === 0) {
        nextRating = 100;
      } else {
        const pos = nextFeedback.filter((f) => f.positive).length;
        nextRating = Math.round((pos / nextFeedback.length) * 100);
      }
    }

    try {
      await updateDoc(tRef, {
        recentFeedback: nextFeedback,
        totalFeedbackCount: nextTotalFeedback,
        ratingPct: nextRating,
        updatedAt: serverTimestamp(),
      });
      return {
        trader: {
          ...t,
          recentFeedback: nextFeedback,
          totalFeedbackCount: nextTotalFeedback,
          ratingPct: nextRating,
        },
      };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.UPDATE, `traders/${target.canonicalUsername}`);
    }
  },

  async adminClearAllFeedback(
    targetUsername: string,
    resetRating = true
  ): Promise<{ trader: TraderProfile }> {
    const clean = targetUsername.trim();
    const target = await resolveUsernameTarget(clean);
    if (!target.isReal || !target.uid) {
      throw new ApiError(`Registered account "${clean}" not found.`, 404);
    }

    const tRef = doc(db, 'traders', target.canonicalUsername);
    const tSnap = await getDoc(tRef).catch((err) =>
      wrapFirestoreError(err, OperationType.GET, `traders/${target.canonicalUsername}`)
    );
    if (!tSnap.exists()) {
      throw new ApiError(`Trader profile "${clean}" not found.`, 404);
    }

    const t = normalizeTraderDoc(tSnap.data());
    const nextRating = resetRating ? 100 : t.ratingPct;
    try {
      await updateDoc(tRef, {
        recentFeedback: [],
        totalFeedbackCount: 0,
        ratingPct: nextRating,
        updatedAt: serverTimestamp(),
      });
      return {
        trader: {
          ...t,
          recentFeedback: [],
          totalFeedbackCount: 0,
          ratingPct: nextRating,
        },
      };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.UPDATE, `traders/${target.canonicalUsername}`);
    }
  },

  async adminRemoveTradeHistoryEntry(
    targetUsername: string,
    recordId: string,
    decrementCount = true
  ): Promise<{ trader: TraderProfile }> {
    const clean = targetUsername.trim();
    const target = await resolveUsernameTarget(clean);
    if (!target.isReal || !target.uid) {
      throw new ApiError(`Registered account "${clean}" not found.`, 404);
    }

    const tRef = doc(db, 'traders', target.canonicalUsername);
    const tSnap = await getDoc(tRef).catch((err) =>
      wrapFirestoreError(err, OperationType.GET, `traders/${target.canonicalUsername}`)
    );
    if (!tSnap.exists()) {
      throw new ApiError(`Trader profile "${clean}" not found.`, 404);
    }

    const t = normalizeTraderDoc(tSnap.data());
    const existingList = t.tradeHistory ?? [];
    const nextHistory = existingList.filter((r) => r.id !== recordId);
    const removed = existingList.length - nextHistory.length;
    const nextTradesCount =
      decrementCount && removed > 0 ? Math.max(0, t.tradesCount - removed) : t.tradesCount;

    try {
      await updateDoc(tRef, {
        tradeHistory: nextHistory,
        tradesCount: nextTradesCount,
        updatedAt: serverTimestamp(),
      });
      return {
        trader: {
          ...t,
          tradeHistory: nextHistory,
          tradesCount: nextTradesCount,
        },
      };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.UPDATE, `traders/${target.canonicalUsername}`);
    }
  },

  async adminClearTradeHistory(
    targetUsername: string,
    resetStats = true
  ): Promise<{ trader: TraderProfile }> {
    const clean = targetUsername.trim();
    const target = await resolveUsernameTarget(clean);
    if (!target.isReal || !target.uid) {
      throw new ApiError(`Registered account "${clean}" not found.`, 404);
    }

    const tRef = doc(db, 'traders', target.canonicalUsername);
    const tSnap = await getDoc(tRef).catch((err) =>
      wrapFirestoreError(err, OperationType.GET, `traders/${target.canonicalUsername}`)
    );
    if (!tSnap.exists()) {
      throw new ApiError(`Trader profile "${clean}" not found.`, 404);
    }

    const t = normalizeTraderDoc(tSnap.data());
    const updates: Record<string, unknown> = {
      tradeHistory: [],
      updatedAt: serverTimestamp(),
    };
    if (resetStats) {
      updates.tradesCount = 0;
      updates.totalVolumeUsd = 0;
      updates.volumeTier = 'Starter';
    }

    try {
      await updateDoc(tRef, updates);
      return {
        trader: {
          ...t,
          tradeHistory: [],
          ...(resetStats
            ? { tradesCount: 0, totalVolumeUsd: 0, volumeTier: 'Starter' }
            : {}),
        },
      };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.UPDATE, `traders/${target.canonicalUsername}`);
    }
  },

  async adminRemoveWalletMessage(
    targetUsername: string,
    txId: string
  ): Promise<AdminAccountDetails> {
    const clean = targetUsername.trim();
    const target = await resolveUsernameTarget(clean);
    if (!target.isReal || !target.uid) {
      throw new ApiError(`Registered account "${clean}" not found.`, 404);
    }

    const uid = target.uid;
    const uRef = doc(db, 'users', uid);
    const uSnap = await getDoc(uRef).catch((err) =>
      wrapFirestoreError(err, OperationType.GET, `users/${uid}`)
    );
    if (!uSnap.exists()) {
      throw new ApiError(`Account records for "${clean}" were not found.`, 404);
    }

    const existingUser = normalizeUserDoc(uSnap.data());
    const nextHistory = (existingUser.walletHistory ?? []).filter((tx) => tx.id !== txId);

    try {
      await updateDoc(uRef, {
        walletHistory: nextHistory,
        updatedAt: serverTimestamp(),
      });
      return await api.adminGetAccountDetails(target.canonicalUsername);
    } catch (err) {
      return wrapFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  },

  async adminUpdateWalletTxStatus(
    targetUsername: string,
    txId: string,
    nextStatus: WalletTxStatus,
    refundOnInvalid = false
  ): Promise<AdminAccountDetails> {
    const clean = targetUsername.trim();
    const target = await resolveUsernameTarget(clean);
    if (!target.isReal || !target.uid) {
      throw new ApiError(`Registered account "${clean}" not found.`, 404);
    }

    const uid = target.uid;
    const uRef = doc(db, 'users', uid);
    const uSnap = await getDoc(uRef).catch((err) =>
      wrapFirestoreError(err, OperationType.GET, `users/${uid}`)
    );
    if (!uSnap.exists()) {
      throw new ApiError(`Account records for "${clean}" were not found.`, 404);
    }

    const existingUser = normalizeUserDoc(uSnap.data());
    const idx = (existingUser.walletHistory ?? []).findIndex((tx) => tx.id === txId);
    if (idx === -1) {
      throw new ApiError(`Transaction ${txId} was not found.`, 404);
    }

    const targetTx = existingUser.walletHistory[idx];
    const nextBalances = { ...existingUser.balances };
    let nextRefunded = Boolean(targetTx.refunded);

    if (
      nextStatus === 'Invalid Address' &&
      refundOnInvalid &&
      targetTx.type === 'withdrawal' &&
      targetTx.amount > 0 &&
      !nextRefunded
    ) {
      nextBalances[targetTx.crypto] = Number(
        ((nextBalances[targetTx.crypto] ?? 0) + targetTx.amount).toFixed(8)
      );
      nextRefunded = true;
    }

    const nextHistory = existingUser.walletHistory.map((tx) =>
      tx.id === txId
        ? stripUndefined({
            ...tx,
            status: nextStatus,
            refunded: nextRefunded ? true : undefined,
          })
        : tx
    );

    try {
      await updateDoc(uRef, {
        balances: nextBalances,
        walletHistory: nextHistory,
        updatedAt: serverTimestamp(),
      });
      return await api.adminGetAccountDetails(target.canonicalUsername);
    } catch (err) {
      return wrapFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  },

  async adminUpdateWalletTxAddress(
    targetUsername: string,
    txId: string,
    nextAddress: string
  ): Promise<AdminAccountDetails> {
    const clean = targetUsername.trim();
    const cleanAddr = nextAddress.trim();
    if (cleanAddr.length < 10 || cleanAddr.length > 180) {
      throw new ApiError('Enter a valid destination address (10–180 characters).', 400);
    }

    const target = await resolveUsernameTarget(clean);
    if (!target.isReal || !target.uid) {
      throw new ApiError(`Registered account "${clean}" not found.`, 404);
    }

    const uid = target.uid;
    const uRef = doc(db, 'users', uid);
    const uSnap = await getDoc(uRef).catch((err) =>
      wrapFirestoreError(err, OperationType.GET, `users/${uid}`)
    );
    if (!uSnap.exists()) {
      throw new ApiError(`Account records for "${clean}" were not found.`, 404);
    }

    const existingUser = normalizeUserDoc(uSnap.data());
    const idx = (existingUser.walletHistory ?? []).findIndex((tx) => tx.id === txId);
    if (idx === -1) {
      throw new ApiError(`Transaction ${txId} was not found.`, 404);
    }

    const targetTx = existingUser.walletHistory[idx];
    if (targetTx.type !== 'withdrawal') {
      throw new ApiError('Only withdrawal destination addresses can be edited.', 400);
    }
    if (targetTx.status !== 'Pending') {
      throw new ApiError(
        'Address is permanent unless withdrawal status is Pending. Set status to Pending first.',
        400
      );
    }

    const nextHistory = existingUser.walletHistory.map((tx) =>
      tx.id === txId
        ? stripUndefined({
            ...tx,
            address: cleanAddr,
          })
        : tx
    );

    try {
      await updateDoc(uRef, {
        walletHistory: nextHistory,
        updatedAt: serverTimestamp(),
      });
      return await api.adminGetAccountDetails(target.canonicalUsername);
    } catch (err) {
      return wrapFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  },

  async adminRemoveAccount(targetUsername: string): Promise<{
    removedUsername: string;
    removedSelf: boolean;
    deletedOffers: number;
  }> {
    const clean = targetUsername.trim();
    if (!clean) throw new ApiError('Select an account to remove.', 400);

    const target = await resolveUsernameTarget(clean);
    if (!target.isReal || !target.uid) {
      throw new ApiError(`Registered account "${clean}" not found.`, 404);
    }

    const uid = target.uid;
    const canonical = target.canonicalUsername;
    const lower = canonical.toLowerCase();
    const session = await getSessionContext();
    const removedSelf = Boolean(session && session.uid === uid);

    const [offersSnap, notifSnap, credSnap] = await Promise.all([
      getDocs(collection(db, 'offers')).catch(() => null),
      getDocs(query(collection(db, 'notifications'), where('toUid', '==', uid))).catch(() => null),
      getDoc(doc(db, 'authCredentials', lower)).catch(() => null),
    ]);

    const batch = writeBatch(db);
    let deletedOffers = 0;

    if (offersSnap) {
      for (const oDoc of offersSnap.docs) {
        const oData = oDoc.data();
        const oOwner = String(oData.ownerUid ?? '');
        const oTrader = String(oData.traderUsername ?? '').toLowerCase();
        if (oOwner === uid || oTrader === lower) {
          batch.delete(doc(db, 'offers', oDoc.id));
          deletedOffers += 1;
        }
      }
    }

    if (notifSnap) {
      for (const nDoc of notifSnap.docs) {
        batch.delete(doc(db, 'notifications', nDoc.id));
      }
    }

    batch.update(doc(db, 'users', uid), {
      balances: createZeroBalances(),
      walletHistory: [],
      bio: 'Account removed by admin',
      tagline: REMOVED_ACCOUNT_MARKER,
      location: null,
      tradingHours: null,
      avatarUrl: null,
      bannerUrl: null,
      updatedAt: serverTimestamp(),
    });

    batch.update(doc(db, 'traders', canonical), {
      tradesCount: 0,
      ratingPct: 100,
      verified: false,
      lastSeenMinutes: 999999,
      bio: 'Account removed by admin',
      tagline: REMOVED_ACCOUNT_MARKER,
      location: null,
      tradingHours: null,
      avatarUrl: null,
      bannerUrl: null,
      preferredMethods: [],
      volumeTier: 'Starter',
      totalVolumeUsd: 0,
      totalFeedbackCount: 0,
      recentFeedback: [],
      tradeHistory: [],
      updatedAt: serverTimestamp(),
    });

    if (credSnap?.exists()) {
      batch.update(doc(db, 'authCredentials', lower), {
        passwordHash: randomHex(32),
        salt: randomHex(16),
        updatedAt: serverTimestamp(),
      });
    }

    try {
      await batch.commit();
      if (removedSelf) {
        setToken(null);
      }
      return {
        removedUsername: canonical,
        removedSelf,
        deletedOffers,
      };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    }
  },

  // -------------------------------------------------------------------------
  // 24/7 Support Chat (Guest + Logged-in Client <-> Admin Console)
  // -------------------------------------------------------------------------
  subscribeSupportChatDoc(
    chatId: string,
    onChat: (chat: DirectChat | null) => void,
    onError?: (err: Error) => void
  ): () => void {
    const cleanId = sanitizeDocId(chatId);
    return onSnapshot(
      doc(db, 'chats', cleanId),
      (snap) => {
        if (!snap.exists()) {
          onChat(null);
          return;
        }
        const data = snap.data();
        onChat({
          id: String(data.id ?? snap.id),
          participants: (data.participants ?? ['Guest Client', 'OOSAB Support']) as [string, string],
          offerId: typeof data.offerId === 'string' ? data.offerId : undefined,
          offerSummary: typeof data.offerSummary === 'string' ? data.offerSummary : undefined,
          createdAt: tsToIso(data.createdAt),
          updatedAt: tsToIso(data.updatedAt),
          messages: [],
          lastReadAtBy: (data.lastReadAtBy ?? undefined) as Record<string, string> | undefined,
        });
      },
      (err) => {
        if (onError) {
          onError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    );
  },

  subscribeSupportMessages(
    chatId: string,
    onMessages: (messages: DirectMessage[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const cleanId = sanitizeDocId(chatId);
    const q = query(
      collection(db, 'chats', cleanId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(80)
    );
    return onSnapshot(
      q,
      (snap) => {
        const msgs: DirectMessage[] = snap.docs.reverse().map((d) => {
          const m = d.data();
          return {
            id: String(m.id ?? d.id),
            sender: String(m.sender ?? 'Client'),
            senderUid: typeof m.senderUid === 'string' ? m.senderUid : undefined,
            text: String(m.text ?? ''),
            timestamp: tsToIso(m.createdAt),
            offerId: typeof m.offerId === 'string' ? m.offerId : undefined,
          };
        });
        onMessages(msgs);
      },
      (err) => {
        if (onError) {
          onError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    );
  },

  async sendSupportMessage(payload: {
    visitorId: string;
    text: string;
    contactLabel?: string;
    currentUsername?: string;
  }): Promise<{ chatId: string }> {
    const cleanText = payload.text.trim().slice(0, 2000);
    if (!cleanText) throw new ApiError('Message cannot be empty.', 400);

    const visitorId = sanitizeDocId(payload.visitorId || getOrCreateSupportVisitorId());
    const chatId = getSupportChatId(visitorId);
    const contactClean = (payload.contactLabel ?? '').trim().slice(0, 140);
    if (contactClean) {
      saveSupportContactLabel(contactClean);
    }

    const senderDisplay = (
      contactClean ||
      (payload.currentUsername ? `@${payload.currentUsername}` : 'Guest Client')
    ).slice(0, 64);

    const offerSummary = (
      contactClean
        ? payload.currentUsername &&
          !contactClean.toLowerCase().includes(payload.currentUsername.toLowerCase())
          ? `${contactClean} (@${payload.currentUsername})`
          : contactClean
        : payload.currentUsername
          ? `Account: @${payload.currentUsername}`
          : `Guest Session (${visitorId.slice(0, 12)})`
    ).slice(0, 200);

    const chatRef = doc(db, 'chats', chatId);
    try {
      const snap = await getDoc(chatRef);
      const nowIso = new Date().toISOString();
      const msgId = `smsg-${randomHex(5)}`;
      const batch = writeBatch(db);

      if (!snap.exists()) {
        batch.set(
          chatRef,
          stripUndefined({
            id: chatId,
            participants: [senderDisplay, 'OOSAB Support'],
            participantUids: [visitorId, 'support_admin'],
            offerId: SUPPORT_CHAT_MARKER,
            offerSummary,
            lastReadAtBy: {
              visitor: nowIso,
              lastVisitorMsgAt: nowIso,
              lastVisitorMsgPreview: cleanText.slice(0, 120),
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        );
      } else {
        const data = snap.data();
        const prevRead = (data.lastReadAtBy ?? {}) as Record<string, string>;
        batch.update(chatRef, {
          offerId: SUPPORT_CHAT_MARKER,
          offerSummary: offerSummary || (typeof data.offerSummary === 'string' ? data.offerSummary : ''),
          lastReadAtBy: {
            ...prevRead,
            visitor: nowIso,
            lastVisitorMsgAt: nowIso,
            lastVisitorMsgPreview: cleanText.slice(0, 120),
          },
          updatedAt: serverTimestamp(),
        });
      }

      batch.set(
        doc(db, 'chats', chatId, 'messages', msgId),
        stripUndefined({
          id: msgId,
          sender: senderDisplay,
          senderUid: visitorId,
          text: cleanText,
          offerId: SUPPORT_CHAT_MARKER,
          createdAt: serverTimestamp(),
        })
      );

      await batch.commit();
      void notifyTelegramEvent({
        type: 'support_247',
        sender: senderDisplay,
        reference: chatId,
        summary: offerSummary,
        text: cleanText,
      });
      return { chatId };
    } catch (err) {
      return wrapFirestoreError(err, OperationType.WRITE, `chats/${chatId}`);
    }
  },

  async updateSupportContactLabel(
    visitorId: string,
    contactLabel: string,
    currentUsername?: string
  ): Promise<void> {
    const cleanLabel = contactLabel.trim().slice(0, 140);
    saveSupportContactLabel(cleanLabel);
    const chatId = getSupportChatId(visitorId);
    const chatRef = doc(db, 'chats', chatId);
    try {
      const snap = await getDoc(chatRef);
      if (!snap.exists()) return;
      const summary = (
        cleanLabel
          ? currentUsername && !cleanLabel.toLowerCase().includes(currentUsername.toLowerCase())
            ? `${cleanLabel} (@${currentUsername})`
            : cleanLabel
          : currentUsername
            ? `Account: @${currentUsername}`
            : `Guest Session (${visitorId.slice(0, 12)})`
      ).slice(0, 200);
      await updateDoc(chatRef, {
        offerSummary: summary,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      return wrapFirestoreError(err, OperationType.UPDATE, `chats/${chatId}`);
    }
  },

  async markSupportChatRead(chatId: string, role: 'visitor' | 'admin'): Promise<void> {
    const cleanId = sanitizeDocId(chatId);
    const chatRef = doc(db, 'chats', cleanId);
    try {
      const nowIso = new Date().toISOString();
      await updateDoc(chatRef, {
        [`lastReadAtBy.${role}`]: nowIso,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      if ((err as { code?: string })?.code === 'not-found') return;
      return wrapFirestoreError(err, OperationType.UPDATE, `chats/${cleanId}`);
    }
  },

  adminSubscribeSupportChats(
    onChats: (chats: DirectChat[]) => void,
    onError?: (err: Error) => void,
    includeAllChats = false
  ): () => void {
    const q = includeAllChats
      ? query(collection(db, 'chats'), limit(60))
      : query(collection(db, 'chats'), where('offerId', '==', SUPPORT_CHAT_MARKER), limit(60));
    return onSnapshot(
      q,
      (snap) => {
        const list: DirectChat[] = snap.docs
          .filter((d) => d.data().offerId !== 'archived_hidden')
          .map((d) => {
            const data = d.data();
            return {
              id: String(data.id ?? d.id),
              participants: (data.participants ?? ['Guest Client', 'OOSAB Support']) as [
                string,
                string,
              ],
              offerId: typeof data.offerId === 'string' ? data.offerId : undefined,
              offerSummary: typeof data.offerSummary === 'string' ? data.offerSummary : undefined,
              createdAt: tsToIso(data.createdAt),
              updatedAt: tsToIso(data.updatedAt),
              messages: [],
              lastReadAtBy: (data.lastReadAtBy ?? undefined) as Record<string, string> | undefined,
            };
          })
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        onChats(list);
      },
      (err) => {
        if (onError) {
          onError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    );
  },

  async adminSendSupportMessage(chatId: string, text: string): Promise<void> {
    const cleanText = text.trim().slice(0, 2000);
    if (!cleanText) throw new ApiError('Reply message cannot be empty.', 400);

    const cleanId = sanitizeDocId(chatId);
    const chatRef = doc(db, 'chats', cleanId);
    try {
      const nowIso = new Date().toISOString();
      const msgId = `smsg-${randomHex(5)}`;

      const batch = writeBatch(db);
      batch.set(
        doc(db, 'chats', cleanId, 'messages', msgId),
        stripUndefined({
          id: msgId,
          sender: 'OOSAB Support',
          senderUid: 'support_admin',
          text: cleanText,
          offerId: SUPPORT_CHAT_MARKER,
          createdAt: serverTimestamp(),
        })
      );
      batch.update(chatRef, {
        'lastReadAtBy.admin': nowIso,
        'lastReadAtBy.lastAdminMsgAt': nowIso,
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (err) {
      return wrapFirestoreError(err, OperationType.WRITE, `chats/${cleanId}`);
    }
  },

  async adminDeleteChat(chatId: string): Promise<{ deletedMessages: number; archivedOnly: boolean }> {
    const cleanId = sanitizeDocId(chatId);
    const chatRef = doc(db, 'chats', cleanId);
    let deletedMessages = 0;

    try {
      const msgsSnap = await getDocs(collection(db, 'chats', cleanId, 'messages')).catch(() => null);
      if (msgsSnap && !msgsSnap.empty) {
        const docs = msgsSnap.docs;
        for (let i = 0; i < docs.length; i += 350) {
          const chunk = docs.slice(i, i + 350);
          const batch = writeBatch(db);
          chunk.forEach((m) => batch.delete(doc(db, 'chats', cleanId, 'messages', m.id)));
          await batch.commit();
          deletedMessages += chunk.length;
        }
      }
      await deleteDoc(chatRef);
      return { deletedMessages, archivedOnly: false };
    } catch (err) {
      if (isPermissionDenied(err)) {
        try {
          await updateDoc(chatRef, {
            offerId: 'archived_hidden',
            offerSummary: '[Removed by Admin]',
            lastReadAtBy: {},
            updatedAt: serverTimestamp(),
          });
          return { deletedMessages, archivedOnly: true };
        } catch (updateErr) {
          return wrapFirestoreError(updateErr, OperationType.UPDATE, `chats/${cleanId}`);
        }
      }
      return wrapFirestoreError(err, OperationType.DELETE, `chats/${cleanId}`);
    }
  },

  async adminPruneChatsExcept(options?: {
    keepUsername?: string;
    includeClosedTradeMessages?: boolean;
  }): Promise<{
    keepUsername: string;
    keptChats: number;
    deletedChats: number;
    archivedChats: number;
    deletedMessages: number;
    deletedTradeMessages: number;
    rulesUpdateNeeded: boolean;
  }> {
    const keepRaw = (options?.keepUsername ?? 'n44nBread').trim() || 'n44nBread';
    const keepLower = keepRaw.toLowerCase();

    const valueMatchesKeep = (val: unknown): boolean => {
      if (typeof val === 'string') return val.toLowerCase().includes(keepLower);
      if (Array.isArray(val)) return val.some((item) => valueMatchesKeep(item));
      if (val && typeof val === 'object') {
        return Object.entries(val as Record<string, unknown>).some(
          ([k, v]) => k.toLowerCase().includes(keepLower) || valueMatchesKeep(v)
        );
      }
      return false;
    };

    let keptChats = 0;
    let deletedChats = 0;
    let archivedChats = 0;
    let deletedMessages = 0;
    let deletedTradeMessages = 0;
    let rulesUpdateNeeded = false;

    try {
      const chatsSnap = await getDocs(collection(db, 'chats'));
      for (const cDoc of chatsSnap.docs) {
        const data = cDoc.data();
        const isKeep =
          cDoc.id.toLowerCase().includes(keepLower) ||
          valueMatchesKeep(data.participants) ||
          valueMatchesKeep(data.participantUids) ||
          valueMatchesKeep(data.offerSummary) ||
          valueMatchesKeep(data.lastReadAtBy);

        if (isKeep) {
          keptChats += 1;
          continue;
        }

        const msgsSnap = await getDocs(collection(db, 'chats', cDoc.id, 'messages')).catch(
          () => null
        );
        try {
          if (msgsSnap && !msgsSnap.empty) {
            const mDocs = msgsSnap.docs;
            for (let i = 0; i < mDocs.length; i += 350) {
              const chunk = mDocs.slice(i, i + 350);
              const batch = writeBatch(db);
              chunk.forEach((m) => batch.delete(doc(db, 'chats', cDoc.id, 'messages', m.id)));
              await batch.commit();
              deletedMessages += chunk.length;
            }
          }
          await deleteDoc(doc(db, 'chats', cDoc.id));
          deletedChats += 1;
        } catch (delErr) {
          if (isPermissionDenied(delErr)) {
            rulesUpdateNeeded = true;
            if (data.offerId !== 'archived_hidden') {
              await updateDoc(doc(db, 'chats', cDoc.id), {
                offerId: 'archived_hidden',
                offerSummary: '[Removed by Admin]',
                lastReadAtBy: {},
                updatedAt: serverTimestamp(),
              });
              archivedChats += 1;
            }
          } else {
            throw delErr;
          }
        }
      }

      if (options?.includeClosedTradeMessages) {
        const tradesSnap = await getDocs(collection(db, 'trades'));
        for (const tDoc of tradesSnap.docs) {
          const td = tDoc.data();
          const isKeepTrade =
            valueMatchesKeep(td.buyerUsername) ||
            valueMatchesKeep(td.sellerUsername) ||
            valueMatchesKeep(td.traderUsername) ||
            valueMatchesKeep(td.buyerUid) ||
            valueMatchesKeep(td.sellerUid) ||
            valueMatchesKeep(td.participantUids);
          if (isKeepTrade) continue;
          const st = String(td.status ?? '');
          if (st !== 'completed' && st !== 'cancelled') continue;

          const tMsgsSnap = await getDocs(
            query(collection(db, 'trades', tDoc.id, 'messages'), orderBy('createdAt', 'desc'))
          ).catch(() => null);
          if (!tMsgsSnap || tMsgsSnap.size <= 1) continue;

          const toDelete = tMsgsSnap.docs.slice(1);
          try {
            for (let i = 0; i < toDelete.length; i += 350) {
              const chunk = toDelete.slice(i, i + 350);
              const batch = writeBatch(db);
              chunk.forEach((m) => batch.delete(doc(db, 'trades', tDoc.id, 'messages', m.id)));
              await batch.commit();
              deletedTradeMessages += chunk.length;
            }
          } catch (delErr) {
            if (isPermissionDenied(delErr)) {
              rulesUpdateNeeded = true;
            } else {
              throw delErr;
            }
          }
        }
      }

      return {
        keepUsername: keepRaw,
        keptChats,
        deletedChats,
        archivedChats,
        deletedMessages,
        deletedTradeMessages,
        rulesUpdateNeeded,
      };
    } catch (err) {
      if (isQuotaExceededError(err)) {
        throw new ApiError(
          `Firebase Spark daily write/delete quota was reached during cleanup (already kept ${keptChats} ${keepRaw} chat(s), deleted ${deletedChats} chat(s) & ${deletedMessages} message(s), archived ${archivedChats}). Retry after midnight PT reset or upgrade to Blaze.`,
          429,
          'QUOTA_EXCEEDED'
        );
      }
      return wrapFirestoreError(err, OperationType.DELETE, 'chats');
    }
  },
};
