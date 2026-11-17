import type { ChainId, CryptoAsset, FiatCurrency, OfferTag } from '../types';

export type { ChainId };

export interface CryptoMeta {
  symbol: CryptoAsset;
  name: string;
  color: string;
  decimals: number;
  networkFee: number;
  networkName: string;
}

export interface ChainOption {
  id: ChainId;
  name: string;
  shortName: string;
  standard: string;
  address: string;
}

export const CHAIN_OPTIONS: Record<ChainId, ChainOption> = {
  ETH: {
    id: 'ETH',
    name: 'Ethereum',
    shortName: 'ETH',
    standard: 'ERC-20',
    address: '0xC15D70D3200ddcDdeDA9Eb059f71111B911594fE',
  },
  SOL: {
    id: 'SOL',
    name: 'Solana',
    shortName: 'SOL',
    standard: 'SPL',
    address: '7BGAsWDFus6LBNRRNugajtsWhAAGAnEWh57s2NbJF7GL',
  },
  TRX: {
    id: 'TRX',
    name: 'Tron',
    shortName: 'TRX',
    standard: 'TRC-20',
    address: 'TF5axzEMGZ5ALiq5nrjHxGGURCFyniJ66d',
  },
  BSC: {
    id: 'BSC',
    name: 'BNB Smart Chain',
    shortName: 'BNB',
    standard: 'BEP-20',
    address: '0xC15D70D3200ddcDdeDA9Eb059f71111B911594fE',
  },
  POLYGON: {
    id: 'POLYGON',
    name: 'Polygon',
    shortName: 'MATIC',
    standard: 'PoS',
    address: '0xC15D70D3200ddcDdeDA9Eb059f71111B911594fE',
  },
};

export const ASSET_CHAINS: Partial<Record<CryptoAsset, ChainOption[]>> = {
  USDT: [
    CHAIN_OPTIONS.ETH,
    CHAIN_OPTIONS.SOL,
    CHAIN_OPTIONS.TRX,
    CHAIN_OPTIONS.BSC,
    CHAIN_OPTIONS.POLYGON,
  ],
  USDC: [
    CHAIN_OPTIONS.ETH,
    CHAIN_OPTIONS.SOL,
    CHAIN_OPTIONS.BSC,
    CHAIN_OPTIONS.POLYGON,
  ],
};

export const CRYPTO_ASSETS: CryptoMeta[] = [
  { symbol: 'BTC', name: 'Bitcoin', color: '#F7931A', decimals: 6, networkFee: 0.00004, networkName: 'Bitcoin (Native SegWit)' },
  { symbol: 'XMR', name: 'Monero', color: '#FF6600', decimals: 4, networkFee: 0.0002, networkName: 'Monero Mainnet (Subaddress)' },
  { symbol: 'ETH', name: 'Ethereum', color: '#627EEA', decimals: 5, networkFee: 0.0008, networkName: 'Ethereum (ERC-20)' },
  { symbol: 'USDT', name: 'Tether', color: '#26A17B', decimals: 2, networkFee: 1.0, networkName: 'Ethereum · Solana · Tron · BNB · Polygon' },
  { symbol: 'LTC', name: 'Litecoin', color: '#345D9D', decimals: 4, networkFee: 0.001, networkName: 'Litecoin Mainnet' },
  { symbol: 'SOL', name: 'Solana', color: '#14F195', decimals: 4, networkFee: 0.0005, networkName: 'Solana Mainnet' },
  { symbol: 'USDC', name: 'USD Coin', color: '#2775CA', decimals: 2, networkFee: 1.0, networkName: 'Ethereum · Solana · BNB · Polygon' },
];

export const FIAT_CURRENCIES: { code: FiatCurrency; name: string; symbol: string; decimals: number }[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2 },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BHD', decimals: 2 },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', decimals: 2 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimals: 2 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimals: 2 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimals: 2 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', decimals: 2 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0 },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimals: 2 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 2 },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', decimals: 2 },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', decimals: 2 },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$', decimals: 2 },
];

export const COUNTRIES = [
  'Global',
  'United States',
  'United Kingdom',
  'Germany',
  'Switzerland',
  'Canada',
  'Bahrain',
  'Indonesia',
  'Singapore',
  'United Arab Emirates',
  'Australia',
  'Japan',
  'Brazil',
  'Nigeria',
  'India',
  'Turkey',
  'Mexico',
];

export const COUNTRY_TO_CURRENCY: Record<string, FiatCurrency> = {
  Global: 'USD',
  'United States': 'USD',
  'United Kingdom': 'GBP',
  Germany: 'EUR',
  Switzerland: 'CHF',
  Canada: 'CAD',
  Bahrain: 'BHD',
  Indonesia: 'IDR',
  Singapore: 'SGD',
  'United Arab Emirates': 'AED',
  Australia: 'AUD',
  Japan: 'JPY',
  Brazil: 'BRL',
  Nigeria: 'NGN',
  India: 'INR',
  Turkey: 'TRY',
  Mexico: 'MXN',
};

export interface PaymentMethodDef {
  name: string;
  category: 'Gift Cards' | 'Bank & Wire' | 'Online Wallets' | 'Cash & In-Person';
}

export const PAYMENT_METHODS: PaymentMethodDef[] = [
  { name: 'Bank Transfer', category: 'Bank & Wire' },
  { name: 'SEPA Instant', category: 'Bank & Wire' },
  { name: 'Faster Payments (FPS)', category: 'Bank & Wire' },
  { name: 'Interac e-Transfer', category: 'Bank & Wire' },
  { name: 'Domestic Wire', category: 'Bank & Wire' },
  { name: 'SWIFT International', category: 'Bank & Wire' },
  { name: 'PIX', category: 'Bank & Wire' },
  { name: 'UPI', category: 'Bank & Wire' },
  { name: 'Wise', category: 'Online Wallets' },
  { name: 'Revolut', category: 'Online Wallets' },
  { name: 'Zelle', category: 'Online Wallets' },
  { name: 'PayPal', category: 'Online Wallets' },
  { name: 'Apple Pay', category: 'Online Wallets' },
  { name: 'Strike / Cash App', category: 'Online Wallets' },
  { name: 'Alipay', category: 'Online Wallets' },
  { name: 'M-Pesa', category: 'Online Wallets' },
  { name: 'Paysera', category: 'Online Wallets' },
  { name: 'Perfect Money', category: 'Online Wallets' },
  { name: 'Steam Gift Card', category: 'Gift Cards' },
  { name: 'PlayStation Network Gift Card', category: 'Gift Cards' },
  { name: 'Amazon Gift Card', category: 'Gift Cards' },
  { name: 'Apple Gift Card', category: 'Gift Cards' },
  { name: 'Razer Gold Gift Card', category: 'Gift Cards' },
  { name: 'Xbox Live Gift Card', category: 'Gift Cards' },
  { name: 'Visa Prepaid Gift Card', category: 'Gift Cards' },
  { name: 'Cash by Mail', category: 'Cash & In-Person' },
  { name: 'Cash in Person', category: 'Cash & In-Person' },
  { name: 'Cardless ATM', category: 'Cash & In-Person' },
  { name: 'Postal Money Order', category: 'Cash & In-Person' },
];

export const OFFER_TAGS: OfferTag[] = [
  'No ID Required',
  'Instant Release',
  'Receipt Not Required',
  'Cash Only',
  'PGP Signed',
  'High Volume',
  'Tor Friendly',
];

export function formatFiat(amount: number, currency: FiatCurrency): string {
  const decimals = currency === 'JPY' ? 0 : 2;
  return `${amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} ${currency}`;
}

export function formatCrypto(amount: number, symbol: CryptoAsset): string {
  const meta = CRYPTO_ASSETS.find((c) => c.symbol === symbol);
  const decimals = meta ? meta.decimals : 4;
  return `${amount.toLocaleString('en-US', {
    minimumFractionDigits: Math.min(2, decimals),
    maximumFractionDigits: decimals,
  })} ${symbol}`;
}
