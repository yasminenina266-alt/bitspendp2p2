export type CryptoAsset = 'BTC' | 'XMR' | 'ETH' | 'USDT' | 'LTC' | 'SOL' | 'USDC';

export type ChainId = 'ETH' | 'SOL' | 'TRX' | 'BSC' | 'POLYGON';

export type FiatCurrency =
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'BHD'
  | 'IDR'
  | 'CAD'
  | 'AUD'
  | 'CHF'
  | 'SGD'
  | 'AED'
  | 'JPY'
  | 'BRL'
  | 'INR'
  | 'NGN'
  | 'TRY'
  | 'MXN'
  | 'ZAR'
  | 'KES'
  | 'GHS'
  | 'EGP'
  | 'MAD'
  | 'PHP'
  | 'THB'
  | 'VND'
  | 'MYR'
  | 'PKR'
  | 'BDT'
  | 'KRW'
  | 'HKD'
  | 'TWD'
  | 'NZD'
  | 'PLN'
  | 'SEK'
  | 'NOK'
  | 'DKK'
  | 'CZK'
  | 'HUF'
  | 'RON'
  | 'ARS'
  | 'COP'
  | 'CLP'
  | 'PEN'
  | 'SAR'
  | 'QAR'
  | 'KWD';

export type OfferSide = 'sell_crypto' | 'buy_crypto' | 'swap_crypto';

export type OfferTag =
  | 'No ID Required'
  | 'Instant Release'
  | 'Receipt Not Required'
  | 'Cash Only'
  | 'PGP Signed'
  | 'High Volume'
  | 'Tor Friendly';

export interface TraderFeedback {
  id: string;
  author: string;
  positive: boolean;
  comment: string;
  asset: CryptoAsset;
  date: string;
}

export interface TraderTradeRecord {
  id: string;
  asset: CryptoAsset;
  cryptoAmount: number;
  fiatAmount: number;
  fiat: FiatCurrency;
  paymentMethod: string;
  side: 'Bought' | 'Sold';
  counterparty: string;
  completedAt: string;
}

export type ProfileThemeId = 'emerald' | 'midnight' | 'amber' | 'violet' | 'slate';

export interface TraderProfile {
  username: string;
  joinedAt: string;
  tradesCount: number;
  ratingPct: number;
  avgReleaseMinutes: number;
  lastSeenMinutes: number; // 0 means active now
  verified: boolean;
  languages: string[];
  pgpFingerprint: string;
  bio: string;
  avatarUrl?: string;
  bannerUrl?: string;
  tagline?: string;
  location?: string;
  accentTheme?: ProfileThemeId;
  preferredMethods?: string[];
  tradingHours?: string;
  volumeTier: string;
  totalVolumeUsd?: number;
  completionRatePct?: number;
  totalFeedbackCount?: number;
  recentFeedback: TraderFeedback[];
  tradeHistory?: TraderTradeRecord[];
}

export interface P2POffer {
  id: string;
  side: OfferSide; // 'sell_crypto' = buy with fiat, 'buy_crypto' = sell for fiat, 'swap_crypto' = P2P crypto-to-crypto swap
  traderUsername: string;
  crypto: CryptoAsset; // For swap_crypto, asset maker is offering (taker receives)
  cryptoChain?: ChainId; // Optional network chain for multi-chain assets (USDT, USDC)
  swapToCrypto?: CryptoAsset; // For swap_crypto, asset maker wants in exchange (taker sends)
  swapToChain?: ChainId; // Optional network chain for swapToCrypto (USDT, USDC)
  fiat: FiatCurrency;
  country: string;
  paymentMethod: string;
  paymentCategory:
    | 'Gift Cards'
    | 'Debit & Virtual Cards'
    | 'Bank & Wire'
    | 'Online Wallets'
    | 'Cash & In-Person'
    | 'Crypto Swap';
  pricingMode: 'margin' | 'fixed';
  marginPct: number;
  fixedPrice?: number;
  minFiat: number;
  maxFiat: number;
  minSwapAmount?: number; // For swap_crypto, min taker send amount in swapToCrypto
  maxSwapAmount?: number; // For swap_crypto, max taker send amount in swapToCrypto
  availableCrypto?: number;
  paymentWindowMinutes: number;
  tags: OfferTag[];
  terms: string;
  active: boolean;
  createdAt: string;
}

export interface TradeMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
  imageUrl?: string;
  imageHidden?: boolean;
  deleted?: boolean;
}

export type TradeStatus =
  | 'escrow_funded'
  | 'payment_sent'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export interface TradeOrder {
  id: string;
  offerId: string;
  side: OfferSide;
  traderUsername: string;
  buyerUsername: string;
  sellerUsername: string;
  crypto: CryptoAsset;
  cryptoChain?: ChainId;
  swapToCrypto?: CryptoAsset;
  swapToChain?: ChainId;
  swapToAmount?: number;
  fiat: FiatCurrency;
  fiatAmount: number;
  cryptoAmount: number;
  unitPrice: number;
  paymentMethod: string;
  paymentDetails: string;
  terms: string;
  status: TradeStatus;
  createdAt: string;
  expiresAt: string;
  messages: TradeMessage[];
  counterpartyIsReal?: boolean;
  lastReadAtBy?: Record<string, string>;
  feedbackBy?: Record<string, { positive: boolean; comment: string }>;
  feedbackGiven?: {
    positive: boolean;
    comment: string;
  };
}

export interface DirectMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  offerId?: string;
}

export interface DirectChat {
  id: string;
  participants: [string, string];
  offerId?: string;
  offerSummary?: string;
  createdAt: string;
  updatedAt: string;
  messages: DirectMessage[];
  lastReadAtBy?: Record<string, string>;
}

export type NotificationType =
  | 'trade_opened'
  | 'trade_message'
  | 'trade_status'
  | 'direct_message'
  | 'wallet_credit'
  | 'feedback_received';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  tradeId?: string;
  offerId?: string;
  chatId?: string;
  fromUsername?: string;
  read: boolean;
  createdAt: string;
}

export type SwapStatus = 'awaiting_deposit' | 'confirming' | 'exchanging' | 'completed';

export interface SwapOrder {
  id: string;
  fromCrypto: CryptoAsset;
  toCrypto: CryptoAsset;
  fromAmount: number;
  toAmount: number;
  rate: number;
  mode: 'floating' | 'fixed';
  destinationAddress: string;
  depositAddress: string;
  status: SwapStatus;
  createdAt: string;
}

export interface CardTransaction {
  id: string;
  merchant: string;
  amountUsd: number;
  timestamp: string;
  status: 'Settled' | 'Top-up';
}

export interface VirtualCard {
  id: string;
  label: string;
  type: 'disposable' | 'reloadable';
  fundingCrypto: CryptoAsset;
  balanceUsd: number;
  last4: string;
  fullNumber: string;
  expiry: string;
  cvv: string;
  frozen: boolean;
  createdAt: string;
  transactions: CardTransaction[];
}

export interface WalletTx {
  id: string;
  type: 'deposit' | 'withdrawal';
  crypto: CryptoAsset;
  amount: number;
  address: string;
  txHash: string;
  network: string;
  status: 'Confirmed';
  timestamp: string;
}

export interface UserSettings {
  preferredCurrency: FiatCurrency;
  defaultPaymentWindow: number;
  autoPgpSign: boolean;
  hideOnlineStatus: boolean;
  torFriendlyMode: boolean;
  escrowAlerts: boolean;
}

export interface UserAccount {
  username: string;
  bio: string;
  avatarUrl?: string;
  bannerUrl?: string;
  tagline?: string;
  location?: string;
  accentTheme?: ProfileThemeId;
  languages?: string[];
  preferredMethods?: string[];
  tradingHours?: string;
  createdAt: string;
  pgpKey: string;
  recoveryPhrase: string;
  balances: Record<CryptoAsset, number>;
  depositAddresses: Record<CryptoAsset, string>;
  walletHistory: WalletTx[];
  settings: UserSettings;
}

export interface MarketPrices {
  usdPrices: Record<CryptoAsset, number>;
  fiatRatesFromUsd: Record<FiatCurrency, number>;
  changes24h: Record<CryptoAsset, number>;
  source: string;
  updatedAt: number;
}
