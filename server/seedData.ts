import type { P2POffer, TraderProfile } from '../src/types.ts';

export const SEED_TRADERS: Record<string, TraderProfile> = {
  Veyhtr239: {
    username: 'Veyhtr239',
    joinedAt: '2022-04-18',
    tradesCount: 1114,
    ratingPct: 100,
    avgReleaseMinutes: 4,
    lastSeenMinutes: 0,
    verified: true,
    languages: ['English', 'Arabic'],
    pgpFingerprint: '4F92 8A10 C71B 9E22 D03A  882F 19A4 55C1 7E0B 319D',
    bio: 'Instant gift card & regional liquidity desk. Fast verification, zero ID checks, automated escrow release.',
    volumeTier: '50+ BTC',
    recentFeedback: [
      { id: 'fb1', author: 'khalid_m', positive: true, comment: 'Released BTC in under 3 minutes after code check.', asset: 'BTC', date: '2 days ago' },
      { id: 'fb2', author: 'anon_842', positive: true, comment: 'Smooth PSN card trade, zero hassle.', asset: 'BTC', date: '5 days ago' },
      { id: 'fb3', author: 'bahrain_hodl', positive: true, comment: 'Reliable regular desk for BHD trades.', asset: 'XMR', date: '1 week ago' },
    ],
  },
  HugoZhang: {
    username: 'HugoZhang',
    joinedAt: '2021-09-03',
    tradesCount: 5510,
    ratingPct: 100,
    avgReleaseMinutes: 3,
    lastSeenMinutes: 0,
    verified: true,
    languages: ['English', 'Indonesian', 'Mandarin'],
    pgpFingerprint: '9C31 E40B 112D 77A8 4B90  3E21 88C0 44F2 6A11 90E4',
    bio: '24/7 digital voucher and Southeast Asia OTC desk. Supporting BTC, XMR, and USDT with instant settlement.',
    volumeTier: '120+ BTC',
    recentFeedback: [
      { id: 'fb4', author: 'jakarta_user', positive: true, comment: 'Best IDR rates on Bitspend, instant release.', asset: 'BTC', date: '1 day ago' },
      { id: 'fb5', author: 'cipher_id', positive: true, comment: 'Bought XMR with Steam card smoothly.', asset: 'XMR', date: '3 days ago' },
      { id: 'fb6', author: 'raya99', positive: true, comment: '5500+ trades for a reason. Top trader.', asset: 'USDT', date: '6 days ago' },
    ],
  },
  LynnShaw: {
    username: 'LynnShaw',
    joinedAt: '2024-01-12',
    tradesCount: 92,
    ratingPct: 98,
    avgReleaseMinutes: 9,
    lastSeenMinutes: 0,
    verified: false,
    languages: ['English'],
    pgpFingerprint: '7A14 D920 55B3 21E9 8C44  0F12 6B7A 33D1 9E80 12C5',
    bio: 'Direct bank transfer and Zelle peer-to-peer trader. No ID verification or selfie requests.',
    volumeTier: '5+ BTC',
    recentFeedback: [
      { id: 'fb7', author: 'texas_btc', positive: true, comment: 'Clean bank transfer at spot price, fast release.', asset: 'BTC', date: '3 days ago' },
      { id: 'fb8', author: 'privacy_fan', positive: true, comment: 'No KYC nonsense, honest rate.', asset: 'XMR', date: '1 week ago' },
    ],
  },
  MoneroVault: {
    username: 'MoneroVault',
    joinedAt: '2020-11-22',
    tradesCount: 3284,
    ratingPct: 100,
    avgReleaseMinutes: 5,
    lastSeenMinutes: 0,
    verified: true,
    languages: ['English', 'German', 'French'],
    pgpFingerprint: 'E812 9B44 33A1 77C0 5D19  2F88 4C10 99B2 1E77 6A03',
    bio: 'Dedicated Monero (XMR) & Bitcoin liquidity provider. Privacy-first trading via SEPA, Wise, Cash by Mail, and Revolut.',
    volumeTier: '85+ BTC',
    recentFeedback: [
      { id: 'fb9', author: 'swiss_anon', positive: true, comment: 'My go-to XMR desk in Europe. Zero friction.', asset: 'XMR', date: '6 hours ago' },
      { id: 'fb10', author: 'tor_nomad', positive: true, comment: 'PGP verified, cash by mail arrived and XMR released immediately.', asset: 'XMR', date: '4 days ago' },
    ],
  },
  AlpinePrivacy: {
    username: 'AlpinePrivacy',
    joinedAt: '2021-06-15',
    tradesCount: 1847,
    ratingPct: 99,
    avgReleaseMinutes: 6,
    lastSeenMinutes: 4,
    verified: true,
    languages: ['German', 'English', 'Italian'],
    pgpFingerprint: '3B77 10F2 8E49 6C11 A205  9D33 7F18 22E0 4B99 81A2',
    bio: 'Swiss & EU P2P desk specializing in XMR, BTC, and LTC via SEPA Instant, Wise, and Cash in Person (Zurich/Basel).',
    volumeTier: '40+ BTC',
    recentFeedback: [
      { id: 'fb11', author: 'elena_ch', positive: true, comment: 'SEPA Instant confirmed in 10 seconds, XMR released.', asset: 'XMR', date: '1 day ago' },
      { id: 'fb12', author: 'marcus_de', positive: true, comment: 'Very professional, clear instructions.', asset: 'BTC', date: '5 days ago' },
    ],
  },
  ZeroTrace_OTC: {
    username: 'ZeroTrace_OTC',
    joinedAt: '2022-08-30',
    tradesCount: 763,
    ratingPct: 100,
    avgReleaseMinutes: 7,
    lastSeenMinutes: 0,
    verified: true,
    languages: ['English', 'Spanish'],
    pgpFingerprint: '1D44 8C90 22E7 5A13 9F60  7B28 3E11 6C49 0D82 55F1',
    bio: 'High-privacy Cash by Mail & Cardless ATM desk. No ID, no bank statements, PGP encrypted shipping details.',
    volumeTier: '25+ BTC',
    recentFeedback: [
      { id: 'fb13', author: 'ghost_node', positive: true, comment: 'Cardless ATM code worked like magic for XMR.', asset: 'XMR', date: '2 days ago' },
      { id: 'fb14', author: 'liberty_tx', positive: true, comment: 'Cash by mail tracked and released same afternoon.', asset: 'BTC', date: '1 week ago' },
    ],
  },
  NordicSwap: {
    username: 'NordicSwap',
    joinedAt: '2023-02-14',
    tradesCount: 1420,
    ratingPct: 99,
    avgReleaseMinutes: 4,
    lastSeenMinutes: 8,
    verified: true,
    languages: ['English', 'Swedish', 'Norwegian'],
    pgpFingerprint: '6E29 4A11 90D3 8B55 1C72  3F04 7A88 12E6 9B30 44D8',
    bio: 'Fast Revolut, Wise, and SEPA trades across EUR, GBP, and USD. Tight spreads on BTC, ETH, XMR, and USDT.',
    volumeTier: '35+ BTC',
    recentFeedback: [
      { id: 'fb15', author: 'oslo_dev', positive: true, comment: 'Tightest Revolut spread for ETH.', asset: 'ETH', date: '12 hours ago' },
      { id: 'fb16', author: 'uk_stacker', positive: true, comment: 'Faster Payments settled in 2 mins.', asset: 'BTC', date: '3 days ago' },
    ],
  },
  KryptoKat_XMR: {
    username: 'KryptoKat_XMR',
    joinedAt: '2021-12-05',
    tradesCount: 2190,
    ratingPct: 100,
    avgReleaseMinutes: 5,
    lastSeenMinutes: 0,
    verified: true,
    languages: ['English', 'Polish'],
    pgpFingerprint: '8F03 2B66 4D19 7E80 3A51  9C42 1E77 6B08 5D23 90A4',
    bio: 'Monero maximalist & multi-asset trader. Buying and selling XMR, LTC, and BTC with Amazon/Apple cards and Wise.',
    volumeTier: '45+ BTC',
    recentFeedback: [
      { id: 'fb17', author: 'monero_joe', positive: true, comment: 'Always online and super helpful to first-time XMR buyers.', asset: 'XMR', date: '9 hours ago' },
      { id: 'fb18', author: 'warsaw_p2p', positive: true, comment: 'Fast Wise transfer, zero issues.', asset: 'XMR', date: '4 days ago' },
    ],
  },
  SatoshiExpress: {
    username: 'SatoshiExpress',
    joinedAt: '2020-05-19',
    tradesCount: 4108,
    ratingPct: 99,
    avgReleaseMinutes: 3,
    lastSeenMinutes: 0,
    verified: true,
    languages: ['English', 'Spanish'],
    pgpFingerprint: '5A88 3E12 7C40 9D16 2B77  4F91 0E63 8A25 1C90 67B3',
    bio: 'US Zelle, Apple Pay, and Cash App desk. Instant automated release for verified repeat counterparties.',
    volumeTier: '95+ BTC',
    recentFeedback: [
      { id: 'fb19', author: 'nyc_trader', positive: true, comment: 'Zelle to BTC in under 4 minutes.', asset: 'BTC', date: '1 day ago' },
      { id: 'fb20', author: 'miami_sol', positive: true, comment: 'Great SOL rate with Apple Pay.', asset: 'SOL', date: '2 days ago' },
    ],
  },
  MapleLeafBTC: {
    username: 'MapleLeafBTC',
    joinedAt: '2022-01-27',
    tradesCount: 985,
    ratingPct: 100,
    avgReleaseMinutes: 6,
    lastSeenMinutes: 12,
    verified: true,
    languages: ['English', 'French'],
    pgpFingerprint: '2C19 7B44 8E05 3D62 9A18  5F70 1B33 4E89 6C20 08D1',
    bio: 'Canada Interac e-Transfer & Wise liquidity desk. Instant CAD settlements for BTC, XMR, and ETH.',
    volumeTier: '20+ BTC',
    recentFeedback: [
      { id: 'fb21', author: 'toronto_anon', positive: true, comment: 'Best Interac rate for Monero in Canada.', asset: 'XMR', date: '2 days ago' },
    ],
  },
  SingaporeFlow: {
    username: 'SingaporeFlow',
    joinedAt: '2023-05-08',
    tradesCount: 640,
    ratingPct: 99,
    avgReleaseMinutes: 5,
    lastSeenMinutes: 0,
    verified: true,
    languages: ['English', 'Mandarin', 'Malay'],
    pgpFingerprint: '9E41 5C28 0B73 6A19 4D82  7F30 2A95 8E11 3C64 19B7',
    bio: 'APAC high-volume USDT, USDC, and BTC desk. Supporting SGD, AUD, and USD via Wise, Bank Transfer, and Alipay.',
    volumeTier: '30+ BTC',
    recentFeedback: [
      { id: 'fb22', author: 'sg_whale', positive: true, comment: 'Clean 5k USDT trade, zero delay.', asset: 'USDT', date: '18 hours ago' },
    ],
  },
  LondonBridgeOTC: {
    username: 'LondonBridgeOTC',
    joinedAt: '2021-03-11',
    tradesCount: 2740,
    ratingPct: 99,
    avgReleaseMinutes: 4,
    lastSeenMinutes: 19,
    verified: true,
    languages: ['English'],
    pgpFingerprint: '4D60 1A92 8C37 5E14 7B29  0F83 6D41 9A55 2E78 30C6',
    bio: 'UK Faster Payments & Cash in Person (Central London). Low fees on GBP <-> BTC, ETH, XMR.',
    volumeTier: '65+ BTC',
    recentFeedback: [
      { id: 'fb23', author: 'soho_dev', positive: true, comment: 'FPS arrived and BTC released immediately.', asset: 'BTC', date: '3 days ago' },
    ],
  },
  DubaiCrescent: {
    username: 'DubaiCrescent',
    joinedAt: '2022-10-02',
    tradesCount: 1305,
    ratingPct: 100,
    avgReleaseMinutes: 8,
    lastSeenMinutes: 0,
    verified: true,
    languages: ['English', 'Arabic'],
    pgpFingerprint: '7B52 3E89 1C04 6D27 8A93  5F10 4E62 9B78 0C31 24A5',
    bio: 'UAE & Gulf Region OTC desk. AED, BHD, and USD trades via Domestic Wire, Wise, and Cash in Person.',
    volumeTier: '55+ BTC',
    recentFeedback: [
      { id: 'fb24', author: 'abudhabi_otc', positive: true, comment: 'Seamless AED wire for USDT.', asset: 'USDT', date: '2 days ago' },
    ],
  },
  LatamPulse: {
    username: 'LatamPulse',
    joinedAt: '2023-07-19',
    tradesCount: 512,
    ratingPct: 98,
    avgReleaseMinutes: 7,
    lastSeenMinutes: 45,
    verified: false,
    languages: ['Portuguese', 'Spanish', 'English'],
    pgpFingerprint: '0A33 6E71 9B28 4C50 1D84  2F97 5A16 8E39 7C02 64B8',
    bio: 'PIX, SPEI, and USDT/BTC/LTC regional liquidity across Brazil & Mexico. Fast releases, no KYC.',
    volumeTier: '12+ BTC',
    recentFeedback: [
      { id: 'fb25', author: 'sao_paulo_btc', positive: true, comment: 'PIX confirmed instantly, LTC released.', asset: 'LTC', date: '5 days ago' },
    ],
  },
};

const BASE_SEED_OFFERS: P2POffer[] = [
  // Top Bitcoin Buying Offers (side: 'sell_crypto' -> user is BUYING crypto)
  {
    id: 'off-101',
    side: 'sell_crypto',
    traderUsername: 'Veyhtr239',
    crypto: 'BTC',
    fiat: 'BHD',
    country: 'Bahrain',
    paymentMethod: 'PlayStation Network Gift Card',
    paymentCategory: 'Gift Cards',
    pricingMode: 'margin',
    marginPct: -10,
    minFiat: 10,
    maxFiat: 98,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release'],
    terms: 'Upload clear code or receipt-free valid BHD PlayStation Network gift card. Do not mark paid until code is ready. Instant BTC release upon redemption.',
    active: true,
    createdAt: '2026-11-10T10:00:00Z',
  },
  {
    id: 'off-102',
    side: 'sell_crypto',
    traderUsername: 'HugoZhang',
    crypto: 'BTC',
    fiat: 'IDR',
    country: 'Indonesia',
    paymentMethod: 'Steam Gift Card',
    paymentCategory: 'Gift Cards',
    pricingMode: 'margin',
    marginPct: -10,
    minFiat: 100000,
    maxFiat: 500000,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release'],
    terms: 'IDR Steam Wallet codes only. No ID needed. Send the 15-character code in trade chat and wait 2 minutes for automatic verification.',
    active: true,
    createdAt: '2026-11-10T11:30:00Z',
  },
  {
    id: 'off-103',
    side: 'sell_crypto',
    traderUsername: 'LynnShaw',
    crypto: 'BTC',
    fiat: 'USD',
    country: 'United States',
    paymentMethod: 'Bank Transfer',
    paymentCategory: 'Bank & Wire',
    pricingMode: 'margin',
    marginPct: 0,
    minFiat: 500,
    maxFiat: 1871,
    paymentWindowMinutes: 45,
    tags: ['No ID Required', 'Receipt Not Required'],
    terms: 'ACH or domestic bank transfer. No ID upload required. Include trade reference code only if requested in chat. BTC released once funds clear.',
    active: true,
    createdAt: '2026-11-11T08:15:00Z',
  },
  // Monero (XMR) Buying Offers (featured!)
  {
    id: 'off-104',
    side: 'sell_crypto',
    traderUsername: 'MoneroVault',
    crypto: 'XMR',
    fiat: 'USD',
    country: 'Global',
    paymentMethod: 'Wise',
    paymentCategory: 'Online Wallets',
    pricingMode: 'margin',
    marginPct: 1.5,
    minFiat: 50,
    maxFiat: 4500,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'PGP Signed', 'Tor Friendly'],
    terms: 'Zero KYC Monero desk. Send via Wise balance transfer using the reference note provided in chat. Never mention crypto or XMR in Wise memos.',
    active: true,
    createdAt: '2026-11-12T09:00:00Z',
  },
  {
    id: 'off-105',
    side: 'sell_crypto',
    traderUsername: 'AlpinePrivacy',
    crypto: 'XMR',
    fiat: 'EUR',
    country: 'Germany',
    paymentMethod: 'SEPA Instant',
    paymentCategory: 'Bank & Wire',
    pricingMode: 'margin',
    marginPct: 1.2,
    minFiat: 100,
    maxFiat: 8000,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release', 'PGP Signed'],
    terms: 'SEPA Instant Euro transfers only. No ID, no selfie. Transfer settles in ~15 seconds and XMR is released straight from escrow.',
    active: true,
    createdAt: '2026-11-12T10:20:00Z',
  },
  {
    id: 'off-106',
    side: 'sell_crypto',
    traderUsername: 'KryptoKat_XMR',
    crypto: 'XMR',
    fiat: 'USD',
    country: 'United States',
    paymentMethod: 'Amazon Gift Card',
    paymentCategory: 'Gift Cards',
    pricingMode: 'margin',
    marginPct: 4.5,
    minFiat: 25,
    maxFiat: 500,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Receipt Not Required'],
    terms: 'US Amazon e-gift codes accepted without store receipt. Paste claim code in chat; released within 5 minutes.',
    active: true,
    createdAt: '2026-11-12T11:45:00Z',
  },
  {
    id: 'off-107',
    side: 'sell_crypto',
    traderUsername: 'ZeroTrace_OTC',
    crypto: 'XMR',
    fiat: 'USD',
    country: 'United States',
    paymentMethod: 'Cash by Mail',
    paymentCategory: 'Cash & In-Person',
    pricingMode: 'margin',
    marginPct: 3.0,
    minFiat: 300,
    maxFiat: 5000,
    paymentWindowMinutes: 120,
    tags: ['No ID Required', 'Cash Only', 'PGP Signed', 'Tor Friendly'],
    terms: 'USPS Priority Express or FedEx envelope. PGP-encrypt tracking number in chat. XMR remains locked in escrow until delivery.',
    active: true,
    createdAt: '2026-11-12T12:10:00Z',
  },
  {
    id: 'off-108',
    side: 'sell_crypto',
    traderUsername: 'MapleLeafBTC',
    crypto: 'XMR',
    fiat: 'CAD',
    country: 'Canada',
    paymentMethod: 'Interac e-Transfer',
    paymentCategory: 'Bank & Wire',
    pricingMode: 'margin',
    marginPct: 2.0,
    minFiat: 75,
    maxFiat: 3000,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release'],
    terms: 'Canadian Interac e-Transfer with auto-deposit enabled. No ID checks. Do not write Monero or Bitspend in transfer memo.',
    active: true,
    createdAt: '2026-11-12T14:00:00Z',
  },
  {
    id: 'off-109',
    side: 'sell_crypto',
    traderUsername: 'LondonBridgeOTC',
    crypto: 'XMR',
    fiat: 'GBP',
    country: 'United Kingdom',
    paymentMethod: 'Faster Payments (FPS)',
    paymentCategory: 'Bank & Wire',
    pricingMode: 'margin',
    marginPct: 1.8,
    minFiat: 100,
    maxFiat: 5000,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release'],
    terms: 'UK Faster Payments from personal UK bank account. Settled in under 2 minutes, immediate XMR release.',
    active: true,
    createdAt: '2026-11-12T15:30:00Z',
  },
  // More BTC Offers
  {
    id: 'off-110',
    side: 'sell_crypto',
    traderUsername: 'SatoshiExpress',
    crypto: 'BTC',
    fiat: 'USD',
    country: 'United States',
    paymentMethod: 'Zelle',
    paymentCategory: 'Online Wallets',
    pricingMode: 'margin',
    marginPct: 1.4,
    minFiat: 100,
    maxFiat: 3500,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release'],
    terms: 'Zelle instant transfer. Leave memo completely blank. BTC released immediately once notification arrives.',
    active: true,
    createdAt: '2026-11-12T16:10:00Z',
  },
  {
    id: 'off-111',
    side: 'sell_crypto',
    traderUsername: 'NordicSwap',
    crypto: 'BTC',
    fiat: 'EUR',
    country: 'Global',
    paymentMethod: 'Revolut',
    paymentCategory: 'Online Wallets',
    pricingMode: 'margin',
    marginPct: 0.8,
    minFiat: 50,
    maxFiat: 6000,
    paymentWindowMinutes: 20,
    tags: ['No ID Required', 'Instant Release'],
    terms: 'Revolut tag transfer in EUR. Fast 24/7 release. No verification photos needed.',
    active: true,
    createdAt: '2026-11-12T17:00:00Z',
  },
  {
    id: 'off-112',
    side: 'sell_crypto',
    traderUsername: 'ZeroTrace_OTC',
    crypto: 'BTC',
    fiat: 'USD',
    country: 'United States',
    paymentMethod: 'Cardless ATM',
    paymentCategory: 'Cash & In-Person',
    pricingMode: 'margin',
    marginPct: 3.5,
    minFiat: 100,
    maxFiat: 1500,
    paymentWindowMinutes: 45,
    tags: ['No ID Required', 'Cash Only', 'Receipt Not Required'],
    terms: 'Generate a cardless cash withdrawal code or deposit cash at supported ATMs. Zero identity footprint.',
    active: true,
    createdAt: '2026-11-12T18:20:00Z',
  },
  {
    id: 'off-113',
    side: 'sell_crypto',
    traderUsername: 'AlpinePrivacy',
    crypto: 'BTC',
    fiat: 'CHF',
    country: 'Switzerland',
    paymentMethod: 'Cash in Person',
    paymentCategory: 'Cash & In-Person',
    pricingMode: 'margin',
    marginPct: 2.5,
    minFiat: 1000,
    maxFiat: 25000,
    paymentWindowMinutes: 120,
    tags: ['No ID Required', 'Cash Only', 'High Volume', 'PGP Signed'],
    terms: 'In-person public meetup in Zurich HB or Basel. Escrow funded before meeting; release signed on the spot.',
    active: true,
    createdAt: '2026-11-12T19:00:00Z',
  },
  // ETH, USDT, LTC, SOL, USDC Buying Offers
  {
    id: 'off-114',
    side: 'sell_crypto',
    traderUsername: 'NordicSwap',
    crypto: 'ETH',
    fiat: 'EUR',
    country: 'Global',
    paymentMethod: 'SEPA Instant',
    paymentCategory: 'Bank & Wire',
    pricingMode: 'margin',
    marginPct: 1.0,
    minFiat: 100,
    maxFiat: 10000,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release', 'High Volume'],
    terms: 'Instant SEPA transfers in EUR for native ETH. Zero KYC requirements.',
    active: true,
    createdAt: '2026-11-13T07:00:00Z',
  },
  {
    id: 'off-115',
    side: 'sell_crypto',
    traderUsername: 'SatoshiExpress',
    crypto: 'SOL',
    fiat: 'USD',
    country: 'United States',
    paymentMethod: 'Apple Pay',
    paymentCategory: 'Online Wallets',
    pricingMode: 'margin',
    marginPct: 2.2,
    minFiat: 40,
    maxFiat: 2000,
    paymentWindowMinutes: 20,
    tags: ['No ID Required', 'Instant Release'],
    terms: 'Apple Cash / Apple Pay P2P transfer. Instant SOL release.',
    active: true,
    createdAt: '2026-11-13T08:15:00Z',
  },
  {
    id: 'off-116',
    side: 'sell_crypto',
    traderUsername: 'SingaporeFlow',
    crypto: 'USDT',
    fiat: 'SGD',
    country: 'Singapore',
    paymentMethod: 'Wise',
    paymentCategory: 'Online Wallets',
    pricingMode: 'margin',
    marginPct: 0.5,
    minFiat: 200,
    maxFiat: 15000,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'High Volume'],
    terms: 'SGD Wise transfer for USDT (TRC20 / ERC20). Clean settlement with zero ID checks.',
    active: true,
    createdAt: '2026-11-13T09:30:00Z',
  },
  {
    id: 'off-117',
    side: 'sell_crypto',
    traderUsername: 'DubaiCrescent',
    crypto: 'USDT',
    fiat: 'AED',
    country: 'United Arab Emirates',
    paymentMethod: 'Domestic Wire',
    paymentCategory: 'Bank & Wire',
    pricingMode: 'margin',
    marginPct: 0.4,
    minFiat: 1000,
    maxFiat: 50000,
    paymentWindowMinutes: 60,
    tags: ['No ID Required', 'High Volume'],
    terms: 'UAE domestic bank transfer or cash desk in Dubai Marina. Fast USDT escrow release.',
    active: true,
    createdAt: '2026-11-13T10:15:00Z',
  },
  {
    id: 'off-118',
    side: 'sell_crypto',
    traderUsername: 'KryptoKat_XMR',
    crypto: 'LTC',
    fiat: 'USD',
    country: 'Global',
    paymentMethod: 'PayPal',
    paymentCategory: 'Online Wallets',
    pricingMode: 'margin',
    marginPct: 2.5,
    minFiat: 25,
    maxFiat: 800,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release'],
    terms: 'PayPal Friends & Family only. No notes in payment. Fast Litecoin release.',
    active: true,
    createdAt: '2026-11-13T11:00:00Z',
  },
  {
    id: 'off-119',
    side: 'sell_crypto',
    traderUsername: 'LatamPulse',
    crypto: 'LTC',
    fiat: 'BRL',
    country: 'Brazil',
    paymentMethod: 'PIX',
    paymentCategory: 'Bank & Wire',
    pricingMode: 'margin',
    marginPct: 1.5,
    minFiat: 100,
    maxFiat: 10000,
    paymentWindowMinutes: 20,
    tags: ['No ID Required', 'Instant Release'],
    terms: 'PIX instant key provided in trade chat. Litecoin released in ~2 minutes.',
    active: true,
    createdAt: '2026-11-13T12:00:00Z',
  },
  {
    id: 'off-120',
    side: 'sell_crypto',
    traderUsername: 'HugoZhang',
    crypto: 'USDT',
    fiat: 'USD',
    country: 'Global',
    paymentMethod: 'Razer Gold Gift Card',
    paymentCategory: 'Gift Cards',
    pricingMode: 'margin',
    marginPct: -6.0,
    minFiat: 20,
    maxFiat: 1000,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Receipt Not Required'],
    terms: 'Global USD Razer Gold PINs accepted. Zero ID needed.',
    active: true,
    createdAt: '2026-11-13T13:10:00Z',
  },
  {
    id: 'off-121',
    side: 'sell_crypto',
    traderUsername: 'SingaporeFlow',
    crypto: 'USDC',
    fiat: 'AUD',
    country: 'Australia',
    paymentMethod: 'Bank Transfer',
    paymentCategory: 'Bank & Wire',
    pricingMode: 'margin',
    marginPct: 0.7,
    minFiat: 150,
    maxFiat: 12000,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release'],
    terms: 'Australian PayID / Osko instant bank transfer for USDC.',
    active: true,
    createdAt: '2026-11-13T14:00:00Z',
  },

  // SELLING OFFERS (side: 'buy_crypto' -> merchants buying crypto FROM the user!)
  {
    id: 'off-201',
    side: 'buy_crypto',
    traderUsername: 'MoneroVault',
    crypto: 'XMR',
    fiat: 'USD',
    country: 'Global',
    paymentMethod: 'Wise',
    paymentCategory: 'Online Wallets',
    pricingMode: 'margin',
    marginPct: -1.5,
    minFiat: 100,
    maxFiat: 8000,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'PGP Signed', 'High Volume'],
    terms: 'Selling your XMR for USD via Wise? I pay within 5 minutes of escrow funding. Zero KYC.',
    active: true,
    createdAt: '2026-11-13T15:00:00Z',
  },
  {
    id: 'off-202',
    side: 'buy_crypto',
    traderUsername: 'AlpinePrivacy',
    crypto: 'XMR',
    fiat: 'EUR',
    country: 'Germany',
    paymentMethod: 'SEPA Instant',
    paymentCategory: 'Bank & Wire',
    pricingMode: 'margin',
    marginPct: -1.0,
    minFiat: 150,
    maxFiat: 12000,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release'],
    terms: 'Send your IBAN in trade chat. Instant SEPA payout for your Monero once escrow is locked.',
    active: true,
    createdAt: '2026-11-13T15:30:00Z',
  },
  {
    id: 'off-203',
    side: 'buy_crypto',
    traderUsername: 'SatoshiExpress',
    crypto: 'BTC',
    fiat: 'USD',
    country: 'United States',
    paymentMethod: 'Zelle',
    paymentCategory: 'Online Wallets',
    pricingMode: 'margin',
    marginPct: 2.0,
    minFiat: 100,
    maxFiat: 5000,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release'],
    terms: 'Cash out BTC to Zelle at +2% above spot! Provide your Zelle email or phone in chat.',
    active: true,
    createdAt: '2026-11-13T16:00:00Z',
  },
  {
    id: 'off-204',
    side: 'buy_crypto',
    traderUsername: 'LondonBridgeOTC',
    crypto: 'BTC',
    fiat: 'GBP',
    country: 'United Kingdom',
    paymentMethod: 'Faster Payments (FPS)',
    paymentCategory: 'Bank & Wire',
    pricingMode: 'margin',
    marginPct: 0.5,
    minFiat: 100,
    maxFiat: 10000,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'High Volume'],
    terms: 'Buying your BTC for GBP via UK Faster Payments. Fast payout with zero paperwork.',
    active: true,
    createdAt: '2026-11-13T16:45:00Z',
  },
  {
    id: 'off-205',
    side: 'buy_crypto',
    traderUsername: 'Veyhtr239',
    crypto: 'BTC',
    fiat: 'USD',
    country: 'Global',
    paymentMethod: 'Steam Gift Card',
    paymentCategory: 'Gift Cards',
    pricingMode: 'margin',
    marginPct: 12.0,
    minFiat: 20,
    maxFiat: 500,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release'],
    terms: 'Get +12% bonus in USD Steam Gift Cards when selling BTC! Codes sent immediately in chat.',
    active: true,
    createdAt: '2026-11-13T17:20:00Z',
  },
  {
    id: 'off-206',
    side: 'buy_crypto',
    traderUsername: 'NordicSwap',
    crypto: 'ETH',
    fiat: 'EUR',
    country: 'Global',
    paymentMethod: 'Revolut',
    paymentCategory: 'Online Wallets',
    pricingMode: 'margin',
    marginPct: -0.5,
    minFiat: 50,
    maxFiat: 7500,
    paymentWindowMinutes: 20,
    tags: ['No ID Required', 'Instant Release'],
    terms: 'Instant EUR payout to your Revolut handle when selling ETH.',
    active: true,
    createdAt: '2026-11-13T18:00:00Z',
  },
  {
    id: 'off-207',
    side: 'buy_crypto',
    traderUsername: 'MapleLeafBTC',
    crypto: 'XMR',
    fiat: 'CAD',
    country: 'Canada',
    paymentMethod: 'Interac e-Transfer',
    paymentCategory: 'Bank & Wire',
    pricingMode: 'margin',
    marginPct: -1.2,
    minFiat: 100,
    maxFiat: 4000,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release'],
    terms: 'Fast CAD Interac payout for your XMR. Provide e-Transfer email in chat.',
    active: true,
    createdAt: '2026-11-13T18:30:00Z',
  },
  {
    id: 'off-208',
    side: 'buy_crypto',
    traderUsername: 'DubaiCrescent',
    crypto: 'USDT',
    fiat: 'AED',
    country: 'United Arab Emirates',
    paymentMethod: 'Cash in Person',
    paymentCategory: 'Cash & In-Person',
    pricingMode: 'margin',
    marginPct: 0.2,
    minFiat: 5000,
    maxFiat: 100000,
    paymentWindowMinutes: 120,
    tags: ['No ID Required', 'Cash Only', 'High Volume'],
    terms: 'Cash payout in AED for your USDT in Dubai. Zero KYC, escrow protected.',
    active: true,
    createdAt: '2026-11-13T19:00:00Z',
  },
  {
    id: 'off-209',
    side: 'buy_crypto',
    traderUsername: 'HugoZhang',
    crypto: 'BTC',
    fiat: 'IDR',
    country: 'Indonesia',
    paymentMethod: 'Bank Transfer',
    paymentCategory: 'Bank & Wire',
    pricingMode: 'margin',
    marginPct: -0.8,
    minFiat: 500000,
    maxFiat: 50000000,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release'],
    terms: 'BCA / Mandiri / BRI instant transfer for your BTC.',
    active: true,
    createdAt: '2026-11-13T19:30:00Z',
  },
  {
    id: 'off-210',
    side: 'buy_crypto',
    traderUsername: 'KryptoKat_XMR',
    crypto: 'LTC',
    fiat: 'USD',
    country: 'Global',
    paymentMethod: 'PayPal',
    paymentCategory: 'Online Wallets',
    pricingMode: 'margin',
    marginPct: -1.8,
    minFiat: 30,
    maxFiat: 1200,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release'],
    terms: 'Fast PayPal payout for Litecoin. Zero ID checks.',
    active: true,
    createdAt: '2026-11-13T20:00:00Z',
  },
  {
    id: 'off-211',
    side: 'sell_crypto',
    traderUsername: 'ZeroTrace_OTC',
    crypto: 'BTC',
    fiat: 'USD',
    country: 'United States',
    paymentMethod: 'Cash by Mail',
    paymentCategory: 'Cash & In-Person',
    pricingMode: 'margin',
    marginPct: 2.8,
    minFiat: 400,
    maxFiat: 7500,
    paymentWindowMinutes: 120,
    tags: ['No ID Required', 'Cash Only', 'PGP Signed'],
    terms: 'Mail USD cash securely to PGP-encrypted drop address. BTC stays safely locked in escrow until delivery.',
    active: true,
    createdAt: '2026-11-14T07:00:00Z',
  },
  {
    id: 'off-212',
    side: 'sell_crypto',
    traderUsername: 'Veyhtr239',
    crypto: 'XMR',
    fiat: 'BHD',
    country: 'Bahrain',
    paymentMethod: 'PlayStation Network Gift Card',
    paymentCategory: 'Gift Cards',
    pricingMode: 'margin',
    marginPct: -8.0,
    minFiat: 10,
    maxFiat: 120,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release'],
    terms: 'Swap BHD PlayStation Network gift cards directly for Monero (XMR). Instant release, no ID.',
    active: true,
    createdAt: '2026-11-14T08:00:00Z',
  },
  {
    id: 'off-213',
    side: 'sell_crypto',
    traderUsername: 'LatamPulse',
    crypto: 'XMR',
    fiat: 'MXN',
    country: 'Mexico',
    paymentMethod: 'Bank Transfer',
    paymentCategory: 'Bank & Wire',
    pricingMode: 'margin',
    marginPct: 2.1,
    minFiat: 500,
    maxFiat: 40000,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release'],
    terms: 'SPEI instant transfer in MXN for Monero (XMR). Zero KYC.',
    active: true,
    createdAt: '2026-11-14T09:00:00Z',
  },
  // Inactive sample offer so "Hide inactive" filter works visibly when toggled!
  {
    id: 'off-214',
    side: 'sell_crypto',
    traderUsername: 'LatamPulse',
    crypto: 'BTC',
    fiat: 'USD',
    country: 'Global',
    paymentMethod: 'Perfect Money',
    paymentCategory: 'Online Wallets',
    pricingMode: 'margin',
    marginPct: 3.5,
    minFiat: 100,
    maxFiat: 2000,
    paymentWindowMinutes: 45,
    tags: ['No ID Required'],
    terms: 'Paused while replenishing hot wallet liquidity.',
    active: false,
    createdAt: '2026-11-09T12:00:00Z',
  },
  // Additional XMR Buy Offers (user buying XMR) -> total 10+ XMR Buy offers
  {
    id: 'off-301',
    side: 'sell_crypto',
    traderUsername: 'SatoshiExpress',
    crypto: 'XMR',
    fiat: 'USD',
    country: 'United States',
    paymentMethod: 'Zelle',
    paymentCategory: 'Online Wallets',
    pricingMode: 'margin',
    marginPct: 2.4,
    minFiat: 75,
    maxFiat: 2500,
    availableCrypto: 18.5,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release'],
    terms: 'Instant Zelle to XMR. Leave memo empty. No ID verification or selfie required.',
    active: true,
    createdAt: '2026-11-14T09:15:00Z',
  },
  {
    id: 'off-302',
    side: 'sell_crypto',
    traderUsername: 'NordicSwap',
    crypto: 'XMR',
    fiat: 'EUR',
    country: 'Global',
    paymentMethod: 'Revolut',
    paymentCategory: 'Online Wallets',
    pricingMode: 'margin',
    marginPct: 0.9,
    minFiat: 40,
    maxFiat: 4000,
    availableCrypto: 28.0,
    paymentWindowMinutes: 20,
    tags: ['No ID Required', 'Instant Release', 'Tor Friendly'],
    terms: 'Revolut EUR transfer for Monero. Instant release upon confirmation.',
    active: true,
    createdAt: '2026-11-14T09:30:00Z',
  },
  {
    id: 'off-303',
    side: 'sell_crypto',
    traderUsername: 'LynnShaw',
    crypto: 'XMR',
    fiat: 'USD',
    country: 'United States',
    paymentMethod: 'Bank Transfer',
    paymentCategory: 'Bank & Wire',
    pricingMode: 'margin',
    marginPct: 0.5,
    minFiat: 250,
    maxFiat: 3000,
    availableCrypto: 22.0,
    paymentWindowMinutes: 45,
    tags: ['No ID Required', 'Receipt Not Required'],
    terms: 'Direct US bank ACH/wire for Monero near spot price. Clean, private settlement.',
    active: true,
    createdAt: '2026-11-14T09:45:00Z',
  },
  // Additional XMR Sell Offers (user selling XMR) -> total 10 XMR Sell offers
  {
    id: 'off-304',
    side: 'buy_crypto',
    traderUsername: 'KryptoKat_XMR',
    crypto: 'XMR',
    fiat: 'USD',
    country: 'Global',
    paymentMethod: 'PayPal',
    paymentCategory: 'Online Wallets',
    pricingMode: 'margin',
    marginPct: -2.0,
    minFiat: 35,
    maxFiat: 1200,
    availableCrypto: 14.0,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release'],
    terms: 'Buying your XMR via PayPal Friends & Family USD. Zero ID checks, fast payout.',
    active: true,
    createdAt: '2026-11-14T10:00:00Z',
  },
  {
    id: 'off-305',
    side: 'buy_crypto',
    traderUsername: 'SatoshiExpress',
    crypto: 'XMR',
    fiat: 'USD',
    country: 'United States',
    paymentMethod: 'Zelle',
    paymentCategory: 'Online Wallets',
    pricingMode: 'margin',
    marginPct: 1.5,
    minFiat: 100,
    maxFiat: 4500,
    availableCrypto: 32.0,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release'],
    terms: 'Paying +1.5% above market via Zelle for your Monero. Share Zelle handle in chat.',
    active: true,
    createdAt: '2026-11-14T10:15:00Z',
  },
  {
    id: 'off-306',
    side: 'buy_crypto',
    traderUsername: 'ZeroTrace_OTC',
    crypto: 'XMR',
    fiat: 'USD',
    country: 'United States',
    paymentMethod: 'Cash by Mail',
    paymentCategory: 'Cash & In-Person',
    pricingMode: 'margin',
    marginPct: 2.5,
    minFiat: 500,
    maxFiat: 6000,
    availableCrypto: 40.0,
    paymentWindowMinutes: 120,
    tags: ['No ID Required', 'Cash Only', 'PGP Signed'],
    terms: 'Send your XMR into BitSpend escrow and receive crisp USD bills via Express Mail.',
    active: true,
    createdAt: '2026-11-14T10:30:00Z',
  },
  {
    id: 'off-307',
    side: 'buy_crypto',
    traderUsername: 'LondonBridgeOTC',
    crypto: 'XMR',
    fiat: 'GBP',
    country: 'United Kingdom',
    paymentMethod: 'Faster Payments (FPS)',
    paymentCategory: 'Bank & Wire',
    pricingMode: 'margin',
    marginPct: -0.8,
    minFiat: 100,
    maxFiat: 6000,
    availableCrypto: 45.0,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release', 'High Volume'],
    terms: 'UK Faster Payments GBP payout for your Monero within 3 minutes of escrow lock.',
    active: true,
    createdAt: '2026-11-14T10:45:00Z',
  },
  {
    id: 'off-308',
    side: 'buy_crypto',
    traderUsername: 'NordicSwap',
    crypto: 'XMR',
    fiat: 'EUR',
    country: 'Global',
    paymentMethod: 'Revolut',
    paymentCategory: 'Online Wallets',
    pricingMode: 'margin',
    marginPct: -0.5,
    minFiat: 50,
    maxFiat: 5000,
    availableCrypto: 35.0,
    paymentWindowMinutes: 20,
    tags: ['No ID Required', 'Instant Release'],
    terms: 'Instant EUR Revolut transfer when you sell Monero. Zero paperwork.',
    active: true,
    createdAt: '2026-11-14T11:00:00Z',
  },
  {
    id: 'off-309',
    side: 'buy_crypto',
    traderUsername: 'SingaporeFlow',
    crypto: 'XMR',
    fiat: 'SGD',
    country: 'Singapore',
    paymentMethod: 'Bank Transfer',
    paymentCategory: 'Bank & Wire',
    pricingMode: 'margin',
    marginPct: 0.4,
    minFiat: 200,
    maxFiat: 8000,
    availableCrypto: 50.0,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'High Volume'],
    terms: 'FAST / PayNow SGD payout for XMR. Quick escrow settlement.',
    active: true,
    createdAt: '2026-11-14T11:15:00Z',
  },
  {
    id: 'off-310',
    side: 'buy_crypto',
    traderUsername: 'HugoZhang',
    crypto: 'XMR',
    fiat: 'USD',
    country: 'Global',
    paymentMethod: 'Steam Gift Card',
    paymentCategory: 'Gift Cards',
    pricingMode: 'margin',
    marginPct: 10.0,
    minFiat: 25,
    maxFiat: 600,
    availableCrypto: 12.0,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release', 'Receipt Not Required'],
    terms: 'Get +10% bonus in USD Steam Gift Cards for your Monero! Instant delivery in trade chat.',
    active: true,
    createdAt: '2026-11-14T11:30:00Z',
  },
];

const EXTRA_CRYPTOS: Array<'BTC' | 'XMR' | 'ETH' | 'USDT' | 'LTC' | 'SOL' | 'USDC'> = [
  'BTC',
  'XMR',
  'ETH',
  'USDT',
  'LTC',
  'SOL',
  'USDC',
];

const EXTRA_PAIRS: Array<{
  fiat: P2POffer['fiat'];
  country: string;
  minBase: number;
  maxBase: number;
  pm: string;
  cat: P2POffer['paymentCategory'];
}> = [
  { fiat: 'USD', country: 'United States', minBase: 50, maxBase: 3500, pm: 'Zelle', cat: 'Online Wallets' },
  { fiat: 'EUR', country: 'Germany', minBase: 75, maxBase: 6000, pm: 'SEPA Instant', cat: 'Bank & Wire' },
  { fiat: 'GBP', country: 'United Kingdom', minBase: 60, maxBase: 4500, pm: 'Faster Payments (FPS)', cat: 'Bank & Wire' },
  { fiat: 'USD', country: 'Global', minBase: 25, maxBase: 2000, pm: 'Wise', cat: 'Online Wallets' },
  { fiat: 'CAD', country: 'Canada', minBase: 100, maxBase: 3500, pm: 'Interac e-Transfer', cat: 'Bank & Wire' },
  { fiat: 'EUR', country: 'Global', minBase: 40, maxBase: 4000, pm: 'Revolut', cat: 'Online Wallets' },
  { fiat: 'USD', country: 'Global', minBase: 20, maxBase: 500, pm: 'Amazon Gift Card', cat: 'Gift Cards' },
  { fiat: 'USD', country: 'United States', minBase: 150, maxBase: 4000, pm: 'Cash by Mail', cat: 'Cash & In-Person' },
  { fiat: 'CHF', country: 'Switzerland', minBase: 200, maxBase: 10000, pm: 'Bank Transfer', cat: 'Bank & Wire' },
  { fiat: 'SGD', country: 'Singapore', minBase: 100, maxBase: 8000, pm: 'Wise', cat: 'Online Wallets' },
  { fiat: 'AUD', country: 'Australia', minBase: 100, maxBase: 5000, pm: 'Bank Transfer', cat: 'Bank & Wire' },
  { fiat: 'AED', country: 'United Arab Emirates', minBase: 500, maxBase: 25000, pm: 'Domestic Wire', cat: 'Bank & Wire' },
  { fiat: 'BRL', country: 'Brazil', minBase: 150, maxBase: 9000, pm: 'PIX', cat: 'Bank & Wire' },
  { fiat: 'USD', country: 'Global', minBase: 30, maxBase: 800, pm: 'PayPal', cat: 'Online Wallets' },
  { fiat: 'JPY', country: 'Japan', minBase: 10000, maxBase: 450000, pm: 'Domestic Wire', cat: 'Bank & Wire' },
  { fiat: 'INR', country: 'India', minBase: 3000, maxBase: 150000, pm: 'UPI', cat: 'Bank & Wire' },
  { fiat: 'NGN', country: 'Nigeria', minBase: 35000, maxBase: 2500000, pm: 'Bank Transfer', cat: 'Bank & Wire' },
  { fiat: 'MXN', country: 'Mexico', minBase: 500, maxBase: 35000, pm: 'Bank Transfer', cat: 'Bank & Wire' },
  { fiat: 'USD', country: 'Global', minBase: 25, maxBase: 600, pm: 'Apple Gift Card', cat: 'Gift Cards' },
  { fiat: 'EUR', country: 'Germany', minBase: 100, maxBase: 7500, pm: 'Paysera', cat: 'Online Wallets' },
];

const EXTRA_TAGS: P2POffer['tags'][] = [
  ['No ID Required', 'Instant Release'],
  ['No ID Required', 'PGP Signed', 'Tor Friendly'],
  ['No ID Required', 'Receipt Not Required'],
  ['No ID Required', 'High Volume'],
  ['No ID Required', 'Cash Only', 'PGP Signed'],
];

const TRADER_NAMES = Object.keys(SEED_TRADERS);

// Expand active buying offers to exact 318 total so guests see 318 Results + registration gate
const currentActiveBuyCount = BASE_SEED_OFFERS.filter(
  (o) => o.side === 'sell_crypto' && o.active
).length;
const neededBuyOffers = Math.max(0, 318 - currentActiveBuyCount);

const GENERATED_OFFERS: P2POffer[] = [];

for (let i = 0; i < neededBuyOffers; i++) {
  const traderUsername = TRADER_NAMES[i % TRADER_NAMES.length];
  const crypto = EXTRA_CRYPTOS[(i * 3 + Math.floor(i / 7)) % EXTRA_CRYPTOS.length];
  const pair = EXTRA_PAIRS[(i * 5 + 2) % EXTRA_PAIRS.length];
  const isGift = pair.cat === 'Gift Cards';
  const rawMargin = isGift
    ? -8 + (i % 7) * 2
    : -0.5 + ((i * 7) % 13) * 0.45;
  const marginPct = Number(rawMargin.toFixed(1));
  const scale = 1 + (i % 4) * 0.5;
  const minFiat = Math.round(pair.minBase * scale);
  const maxFiat = Math.round(pair.maxBase * (1 + (i % 3) * 0.4));
  const availMap: Record<string, number> = {
    BTC: Number((0.15 + (i % 9) * 0.25).toFixed(2)),
    XMR: Number((8 + (i % 15) * 4.5).toFixed(1)),
    ETH: Number((1.5 + (i % 8) * 1.2).toFixed(1)),
    USDT: 2500 + (i % 10) * 1500,
    LTC: Number((15 + (i % 12) * 8).toFixed(1)),
    SOL: Number((12 + (i % 14) * 6).toFixed(1)),
    USDC: 2000 + (i % 8) * 1250,
  };

  GENERATED_OFFERS.push({
    id: `off-gen-b-${i + 1}`,
    side: 'sell_crypto',
    traderUsername,
    crypto,
    fiat: pair.fiat,
    country: pair.country,
    paymentMethod: pair.pm,
    paymentCategory: pair.cat,
    pricingMode: 'margin',
    marginPct,
    minFiat,
    maxFiat,
    availableCrypto: availMap[crypto],
    paymentWindowMinutes: pair.cat === 'Cash & In-Person' ? 90 : 30,
    tags:
      pair.cat === 'Cash & In-Person'
        ? ['No ID Required', 'Cash Only', 'PGP Signed']
        : EXTRA_TAGS[i % EXTRA_TAGS.length],
    terms: `Direct ${pair.pm} settlement in ${pair.fiat} for ${crypto}. Zero ID verification required. Include trade reference only if requested inside trade chat.`,
    active: true,
    createdAt: new Date(Date.UTC(2026, 10, 14, 10, 0) - i * 3600_000).toISOString(),
  });
}

// Also generate 48 additional Sell offers for broad liquidity across all assets
for (let i = 0; i < 48; i++) {
  const traderUsername = TRADER_NAMES[(i + 3) % TRADER_NAMES.length];
  const crypto = EXTRA_CRYPTOS[(i * 2 + 1) % EXTRA_CRYPTOS.length];
  const pair = EXTRA_PAIRS[(i * 3 + 1) % EXTRA_PAIRS.length];
  const marginPct = Number((-2.5 + (i % 9) * 0.65).toFixed(1));

  GENERATED_OFFERS.push({
    id: `off-gen-s-${i + 1}`,
    side: 'buy_crypto',
    traderUsername,
    crypto,
    fiat: pair.fiat,
    country: pair.country,
    paymentMethod: pair.pm,
    paymentCategory: pair.cat,
    pricingMode: 'margin',
    marginPct,
    minFiat: pair.minBase,
    maxFiat: pair.maxBase,
    paymentWindowMinutes: 30,
    tags: EXTRA_TAGS[(i + 1) % EXTRA_TAGS.length],
    terms: `Paying ${pair.fiat} via ${pair.pm} for your ${crypto} as soon as escrow is funded. No ID required.`,
    active: true,
    createdAt: new Date(Date.UTC(2026, 10, 14, 9, 0) - i * 3600_000).toISOString(),
  });
}

// Generate 14 peer-to-peer Crypto-to-Crypto Swap offers
const SWAP_SEED_PAIRS: {
  crypto: P2POffer['crypto'];
  swapToCrypto: P2POffer['crypto'];
  minSwap: number;
  maxSwap: number;
  minUsd: number;
  maxUsd: number;
  avail: number;
  margin: number;
  method: string;
}[] = [
  { crypto: 'XMR', swapToCrypto: 'BTC', minSwap: 0.002, maxSwap: 0.35, minUsd: 130, maxUsd: 22000, avail: 48, margin: 0.8, method: 'BitSpend P2P Escrow Swap' },
  { crypto: 'BTC', swapToCrypto: 'XMR', minSwap: 0.5, maxSwap: 25, minUsd: 230, maxUsd: 11700, avail: 0.65, margin: 1.2, method: 'BitSpend P2P Escrow Swap' },
  { crypto: 'XMR', swapToCrypto: 'USDT', minSwap: 100, maxSwap: 12000, minUsd: 100, maxUsd: 12000, avail: 36, margin: 1.4, method: 'BitSpend P2P Escrow Swap' },
  { crypto: 'XMR', swapToCrypto: 'ETH', minSwap: 0.1, maxSwap: 6, minUsd: 180, maxUsd: 10500, avail: 22, margin: 0.9, method: 'Direct On-Chain Atomic Swap' },
  { crypto: 'USDT', swapToCrypto: 'BTC', minSwap: 0.005, maxSwap: 0.5, minUsd: 320, maxUsd: 31800, avail: 35000, margin: 0.5, method: 'BitSpend P2P Escrow Swap' },
  { crypto: 'ETH', swapToCrypto: 'XMR', minSwap: 1, maxSwap: 30, minUsd: 465, maxUsd: 14000, avail: 9.5, margin: 1.1, method: 'Direct On-Chain Atomic Swap' },
  { crypto: 'BTC', swapToCrypto: 'USDC', minSwap: 250, maxSwap: 25000, minUsd: 250, maxUsd: 25000, avail: 1.2, margin: 0.6, method: 'BitSpend P2P Escrow Swap' },
  { crypto: 'SOL', swapToCrypto: 'XMR', minSwap: 0.5, maxSwap: 18, minUsd: 230, maxUsd: 8400, avail: 180, margin: 1.5, method: 'BitSpend P2P Escrow Swap' },
  { crypto: 'XMR', swapToCrypto: 'LTC', minSwap: 2, maxSwap: 120, minUsd: 90, maxUsd: 5400, avail: 18, margin: 1.0, method: 'Direct On-Chain Atomic Swap' },
  { crypto: 'LTC', swapToCrypto: 'BTC', minSwap: 0.003, maxSwap: 0.25, minUsd: 190, maxUsd: 16000, avail: 260, margin: 0.7, method: 'BitSpend P2P Escrow Swap' },
  { crypto: 'USDC', swapToCrypto: 'XMR', minSwap: 0.4, maxSwap: 20, minUsd: 185, maxUsd: 9400, avail: 15000, margin: 1.3, method: 'BitSpend P2P Escrow Swap' },
  { crypto: 'XMR', swapToCrypto: 'SOL', minSwap: 1.5, maxSwap: 80, minUsd: 105, maxUsd: 5600, avail: 14, margin: 1.2, method: 'BitSpend P2P Escrow Swap' },
  { crypto: 'ETH', swapToCrypto: 'USDT', minSwap: 200, maxSwap: 15000, minUsd: 200, maxUsd: 15000, avail: 12, margin: 0.4, method: 'BitSpend P2P Escrow Swap' },
  { crypto: 'BTC', swapToCrypto: 'LTC', minSwap: 5, maxSwap: 300, minUsd: 220, maxUsd: 13200, avail: 0.85, margin: 1.1, method: 'Direct On-Chain Atomic Swap' },
];

for (let i = 0; i < SWAP_SEED_PAIRS.length; i++) {
  const sp = SWAP_SEED_PAIRS[i];
  const traderUsername = TRADER_NAMES[(i * 2 + 1) % TRADER_NAMES.length];
  GENERATED_OFFERS.push({
    id: `off-gen-swp-${i + 1}`,
    side: 'swap_crypto',
    traderUsername,
    crypto: sp.crypto,
    swapToCrypto: sp.swapToCrypto,
    fiat: 'USD',
    country: 'Global',
    paymentMethod: sp.method,
    paymentCategory: 'Crypto Swap',
    pricingMode: 'margin',
    marginPct: sp.margin,
    minFiat: sp.minUsd,
    maxFiat: sp.maxUsd,
    minSwapAmount: sp.minSwap,
    maxSwapAmount: sp.maxSwap,
    availableCrypto: sp.avail,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release', 'Tor Friendly'],
    terms: `Direct user-to-user ${sp.swapToCrypto} to ${sp.crypto} escrow swap. Both assets settle through BitSpend P2P multi-asset escrow with zero KYC.`,
    active: true,
    createdAt: new Date(Date.UTC(2026, 10, 14, 11, 30) - i * 2400_000).toISOString(),
  });
}

export const SEED_OFFERS: P2POffer[] = [...BASE_SEED_OFFERS, ...GENERATED_OFFERS];

const SAMPLE_HANDLES = [
  'k***9', 'm***a', 'z***4', 'x***r', 'p***2', 'v***t', 'a***7', 'd***n', 'h***0', 's***e',
  'b***3', 'c***k', 'r***8', 't***w', 'n***5', 'l***p', 'g***1', 'j***6', 'f***m', 'q***z',
];

const FEEDBACK_AUTHORS = [
  'anon_4821', 'xmr_nomad', 'silent_hodl', 'zurich_stack', 'tor_relay', 'desert_btc',
  'nordic_node', 'cipher_otc', 'privacy_desk', 'tokyo_p2p', 'soho_stacker', 'alpine_xmr',
  'gulf_trader', 'bay_area_btc', 'monero_fox', 'stealth_swap', 'vancouver_p2p', 'berlin_anon',
  'singapore_desk', 'oslo_vault', 'rio_crypto', 'seoul_node', 'dubai_otc', 'texas_hodler',
];

const SAMPLE_PAYMENTS = [
  'Wise',
  'SEPA Instant',
  'Bank Transfer',
  'Zelle',
  'Revolut',
  'Steam Gift Card',
  'Faster Payments (FPS)',
  'Interac e-Transfer',
  'Apple Pay',
  'Cash by Mail',
];

const POSITIVE_TEMPLATES = [
  (asset: string, method: string, mins: number) =>
    `Released ${asset} in ${mins} mins via ${method}. Smooth zero-KYC trade.`,
  (asset: string, method: string, mins: number) =>
    `Great ${asset} rate using ${method}. Escrow settled in ${mins}m without friction.`,
  (asset: string, method: string, _mins: number) =>
    `Fast settlement on ${method}. No ID checks, clear instructions, got my ${asset} right away.`,
  (asset: string, method: string, mins: number) =>
    `Repeat ${asset} trade via ${method} — verified and released in under ${mins + 1} minutes.`,
  (asset: string, method: string, _mins: number) =>
    `PGP-signed terms and straightforward ${method} transfer. Honest ${asset} pricing.`,
  (asset: string, method: string, mins: number) =>
    `Escrow funded immediately and ${asset} hit my wallet ${mins}m after ${method} confirmation.`,
  (asset: string, method: string, _mins: number) =>
    `Reliable desk for ${asset}. ${method} went through smoothly with zero hassle.`,
  (asset: string, method: string, mins: number) =>
    `Quick ${mins}-minute release after ${method} arrived. Would trade ${asset} here again.`,
];

const NEGATIVE_TEMPLATES = [
  (asset: string, method: string) =>
    `Slow response in chat before releasing ${asset} on ${method}, though escrow eventually settled.`,
  (asset: string, method: string) =>
    `Took over 25 minutes to verify ${method} payment for ${asset}.`,
  (asset: string, _method: string) =>
    `Had to remind trader to check confirmation for ${asset} release.`,
];

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRand(seed: number, index: number, salt: number): number {
  let x = (seed ^ Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b)) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b) >>> 0;
  x ^= x >>> 16;
  return x >>> 0;
}

function formatRelativeAge(hoursAgo: number): string {
  if (hoursAgo < 24) return `${Math.max(1, hoursAgo)}h ago`;
  const days = Math.floor(hoursAgo / 24);
  if (days < 14) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 24) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

function formatFeedbackAge(hoursAgo: number): string {
  if (hoursAgo < 24) {
    const h = Math.max(1, hoursAgo);
    return `${h} ${h === 1 ? 'hour' : 'hours'} ago`;
  }
  const days = Math.floor(hoursAgo / 24);
  if (days < 14) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  const months = Math.floor(days / 30);
  return `${months} ${months === 1 ? 'month' : 'months'} ago`;
}

export function getTraderFeedbackTotal(trader: TraderProfile): number {
  if (trader.tradesCount <= 0) {
    return trader.recentFeedback?.length ?? 0;
  }
  const seed = hashString(trader.username);
  const ratio = 0.86 + (seed % 9) * 0.01; // 86% to 94% of completed trades leave feedback
  return Math.max(
    trader.recentFeedback?.length ?? 0,
    Math.min(trader.tradesCount, Math.round(trader.tradesCount * ratio))
  );
}

export function generateTraderTradesPage(
  trader: TraderProfile,
  offers: P2POffer[],
  offset = 0,
  limit = 15
): { items: NonNullable<TraderProfile['tradeHistory']>; total: number; hasMore: boolean } {
  const total = Math.max(0, trader.tradesCount);
  const start = Math.max(0, offset);
  const end = Math.min(total, start + limit);
  const seed = hashString(trader.username);
  const traderOffers = offers.filter((o) => o.traderUsername === trader.username);
  const assetsPool =
    traderOffers.length > 0
      ? traderOffers.map((o) => o.crypto)
      : (['XMR', 'BTC', 'ETH', 'USDT'] as const);

  const approxUsdByAsset: Record<string, number> = {
    BTC: 91250,
    XMR: 184.6,
    ETH: 3140,
    USDT: 1,
    LTC: 86.4,
    SOL: 214.5,
    USDC: 1,
  };

  const items: NonNullable<TraderProfile['tradeHistory']> = [];

  for (let i = start; i < end; i++) {
    const r0 = seededRand(seed, i, 1);
    const r1 = seededRand(seed, i, 2);
    const r2 = seededRand(seed, i, 3);
    const r3 = seededRand(seed, i, 4);

    const offer = traderOffers.length > 0 ? traderOffers[r0 % traderOffers.length] : undefined;
    const asset = offer?.crypto ?? assetsPool[r0 % assetsPool.length];
    const fiatAmt = Math.round((120 + (r1 % 3200)) / 10) * 10;
    const cryptoAmt = Number(
      (fiatAmt / (approxUsdByAsset[asset] || 100)).toFixed(
        asset === 'USDT' || asset === 'USDC' ? 2 : 4
      )
    );

    const hoursAgo = 2 + i * 6 + (r2 % 5);
    const handlePrefix = SAMPLE_HANDLES[r2 % SAMPLE_HANDLES.length];
    const paymentMethod =
      offer?.paymentMethod ?? SAMPLE_PAYMENTS[r3 % SAMPLE_PAYMENTS.length];

    items.push({
      id: `TX-${100000 + ((seed + i * 7919 + (r0 % 997)) % 899999)}`,
      asset,
      cryptoAmount: cryptoAmt,
      fiatAmount: fiatAmt,
      fiat: 'USD',
      paymentMethod,
      side: r3 % 3 === 0 ? 'Bought' : 'Sold',
      counterparty: handlePrefix,
      completedAt: formatRelativeAge(hoursAgo),
    });
  }

  return {
    items,
    total,
    hasMore: end < total,
  };
}

export function generateTraderFeedbackPage(
  trader: TraderProfile,
  offers: P2POffer[],
  offset = 0,
  limit = 15
): { items: TraderProfile['recentFeedback']; total: number; hasMore: boolean } {
  const realFeedback = trader.recentFeedback ?? [];
  const total = getTraderFeedbackTotal(trader);
  const start = Math.max(0, offset);
  const end = Math.min(total, start + limit);

  const seed = hashString(trader.username);
  const traderOffers = offers.filter((o) => o.traderUsername === trader.username);
  const assetsPool =
    traderOffers.length > 0
      ? traderOffers.map((o) => o.crypto)
      : (['XMR', 'BTC', 'ETH', 'USDT'] as const);

  const negRatePer100 = Math.max(0, Math.min(10, 100 - Math.round(trader.ratingPct)));
  const items: TraderProfile['recentFeedback'] = [];

  for (let i = start; i < end; i++) {
    if (i < realFeedback.length) {
      items.push(realFeedback[i]);
      continue;
    }

    const genIdx = i - realFeedback.length;
    const r0 = seededRand(seed, i, 11);
    const r1 = seededRand(seed, i, 12);
    const r2 = seededRand(seed, i, 13);
    const r3 = seededRand(seed, i, 14);

    const offer = traderOffers.length > 0 ? traderOffers[r0 % traderOffers.length] : undefined;
    const asset = offer?.crypto ?? assetsPool[r0 % assetsPool.length];
    const method = offer?.paymentMethod ?? SAMPLE_PAYMENTS[r1 % SAMPLE_PAYMENTS.length];
    const mins = Math.max(2, trader.avgReleaseMinutes + ((r2 % 5) - 2));

    const isNegative = negRatePer100 > 0 && r3 % 100 < negRatePer100;
    const comment = isNegative
      ? NEGATIVE_TEMPLATES[r1 % NEGATIVE_TEMPLATES.length](asset, method)
      : POSITIVE_TEMPLATES[r1 % POSITIVE_TEMPLATES.length](asset, method, mins);

    const baseAuthor = FEEDBACK_AUTHORS[r2 % FEEDBACK_AUTHORS.length];
    const author = `${baseAuthor.split('_')[0]}_${100 + ((r0 + genIdx) % 899)}`;
    const hoursAgo = 5 + i * 7 + (r3 % 6);

    items.push({
      id: `fb-gen-${trader.username}-${i}`,
      author,
      positive: !isNegative,
      comment,
      asset,
      date: formatFeedbackAge(hoursAgo),
    });
  }

  return {
    items,
    total,
    hasMore: end < total,
  };
}

export function buildTraderDetails(
  trader: TraderProfile,
  offers: P2POffer[]
): TraderProfile {
  const seed = hashString(trader.username);
  const totalFeedbackCount = getTraderFeedbackTotal(trader);
  const tradesPage = generateTraderTradesPage(trader, offers, 0, 15);
  const feedbackPage = generateTraderFeedbackPage(trader, offers, 0, 15);

  const totalVolumeUsd =
    trader.tradesCount <= 0
      ? 0
      : trader.totalVolumeUsd ||
        Math.max(18500, trader.tradesCount * (320 + (seed % 480)));

  return {
    ...trader,
    totalVolumeUsd,
    completionRatePct:
      trader.completionRatePct ?? Number((98.6 + (seed % 14) * 0.1).toFixed(1)),
    totalFeedbackCount,
    recentFeedback: feedbackPage.items,
    tradeHistory: tradesPage.items,
  };
}


