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
      { id: 'fb4', author: 'jakarta_user', positive: true, comment: 'Best IDR rates on OOSAB, instant release.', asset: 'BTC', date: '1 day ago' },
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
  cryptocoop: {
    username: 'cryptocoop',
    joinedAt: '2021-08-14',
    tradesCount: 2640,
    ratingPct: 100,
    avgReleaseMinutes: 4,
    lastSeenMinutes: 0,
    verified: true,
    languages: ['English', 'Spanish'],
    pgpFingerprint: '3D84 19C2 7A05 6E11 8B40  2F73 9C15 4A88 0E62 51D9',
    bio: 'Community-driven P2P desk offering tight BTC, XMR, and USDT spreads via Wise, Revolut, and SEPA Instant. Always escrow-backed.',
    volumeTier: '60+ BTC',
    recentFeedback: [
      { id: 'fb-cc-1', author: 'nord_p2p', positive: true, comment: 'Great rate and released BTC in under 3 minutes.', asset: 'BTC', date: '1 day ago' },
      { id: 'fb-cc-2', author: 'xmr_owl', positive: true, comment: 'Smooth Wise trade, polite and fast.', asset: 'XMR', date: '4 days ago' },
      { id: 'fb-cc-3', author: 'milo_88', positive: true, comment: 'Zero friction, best peer desk on OOSAB.', asset: 'USDT', date: '1 week ago' },
    ],
  },
  poopdeck: {
    username: 'poopdeck',
    joinedAt: '2022-03-21',
    tradesCount: 1980,
    ratingPct: 99,
    avgReleaseMinutes: 5,
    lastSeenMinutes: 0,
    verified: true,
    languages: ['English', 'German'],
    pgpFingerprint: '8A17 5C40 2E91 0F36 7D82  4B19 6E03 9A55 1C48 72E0',
    bio: 'Independent zero-KYC liquidity provider for Monero, Bitcoin, and Litecoin. Fast release once payment clears.',
    volumeTier: '45+ BTC',
    recentFeedback: [
      { id: 'fb-pd-1', author: 'tomas_k', positive: true, comment: 'Super quick Revolut confirmation and XMR release.', asset: 'XMR', date: '14 hours ago' },
      { id: 'fb-pd-2', author: 'anon_314', positive: true, comment: 'Clean trade, zero extra questions.', asset: 'BTC', date: '3 days ago' },
      { id: 'fb-pd-3', author: 'cairo_btc', positive: true, comment: 'Always reliable and fast escrow settlement.', asset: 'LTC', date: '6 days ago' },
    ],
  },
  Victor7777: {
    username: 'Victor7777',
    joinedAt: '2020-02-14',
    tradesCount: 17897,
    ratingPct: 99,
    avgReleaseMinutes: 6,
    lastSeenMinutes: 0,
    verified: true,
    languages: ['English', 'French'],
    pgpFingerprint: 'C410 8B22 7E91 5A03 6D18  2F74 9C05 3E12 8A60 11B4',
    bio: 'High-volume P2P merchant specializing in Paysafecard, prepaid vouchers, and Interac CAD liquidity. Instant escrow release.',
    volumeTier: '250+ BTC',
    recentFeedback: [
      { id: 'fb-vic-1', author: 'mtl_stack', positive: true, comment: '17k+ trades says it all, BTC released in 4 mins.', asset: 'BTC', date: '4 hours ago' },
      { id: 'fb-vic-2', author: 'nord_cad', positive: true, comment: 'Paysafecard redeemed smoothly with zero hassle.', asset: 'BTC', date: '2 days ago' },
    ],
  },
  BitLords: {
    username: 'BitLords',
    joinedAt: '2020-07-09',
    tradesCount: 9940,
    ratingPct: 100,
    avgReleaseMinutes: 5,
    lastSeenMinutes: 0,
    verified: true,
    languages: ['English', 'Hindi'],
    pgpFingerprint: '7E29 4A01 8C53 1D90 6B44  3F18 2A75 9C06 5E12 88D3',
    bio: 'Trusted high-volume OTC & Cash in Person desk across major cities. Zero-KYC USDT, BTC, and XMR liquidity.',
    volumeTier: '180+ BTC',
    recentFeedback: [
      { id: 'fb-bl-1', author: 'mumbai_otc', positive: true, comment: 'Seamless USDT settlement, super professional.', asset: 'USDT', date: '1 day ago' },
      { id: 'fb-bl-2', author: 'del_trader', positive: true, comment: 'Reliable desk for large trades, fast release.', asset: 'BTC', date: '4 days ago' },
    ],
  },
  EnoughShoveler: {
    username: 'EnoughShoveler',
    joinedAt: '2020-11-18',
    tradesCount: 6315,
    ratingPct: 100,
    avgReleaseMinutes: 5,
    lastSeenMinutes: 0,
    verified: true,
    languages: ['English', 'Urdu'],
    pgpFingerprint: '2A61 9F04 3C82 7E15 4D90  8B13 5E27 1A49 6C38 0F72',
    bio: 'Fast Release · Best Rates · Trusted P2P Seller. Multi-chain USDT (TRC-20 / ERC-20) and BTC liquidity 24/7.',
    volumeTier: '140+ BTC',
    recentFeedback: [
      { id: 'fb-es-1', author: 'lagos_fx', positive: true, comment: 'Best NGN rate and released TRC20 USDT immediately.', asset: 'USDT', date: '6 hours ago' },
      { id: 'fb-es-2', author: 'karachi_p2p', positive: true, comment: 'Super quick response, zero friction.', asset: 'USDT', date: '3 days ago' },
    ],
  },
  Queen13598: {
    username: 'Queen13598',
    joinedAt: '2021-04-02',
    tradesCount: 5405,
    ratingPct: 99,
    avgReleaseMinutes: 8,
    lastSeenMinutes: 0,
    verified: true,
    languages: ['English'],
    pgpFingerprint: '9D14 6B80 2E37 5C91 1A48  7F02 3D65 8E19 4C20 77A1',
    bio: '24/7 Fast Deals · Secure Trade. Interac e-Transfer, Wise, and Virtual Visa settlement across CAD & USD.',
    volumeTier: '110+ BTC',
    recentFeedback: [
      { id: 'fb-qn-1', author: 'van_btc', positive: true, comment: 'Fast Interac auto-deposit and instant USDT release.', asset: 'USDT', date: '12 hours ago' },
      { id: 'fb-qn-2', author: 'calgary_xmr', positive: true, comment: 'Always reliable, clear instructions.', asset: 'BTC', date: '5 days ago' },
    ],
  },
  jakemin: {
    username: 'jakemin',
    joinedAt: '2021-06-21',
    tradesCount: 3574,
    ratingPct: 99,
    avgReleaseMinutes: 6,
    lastSeenMinutes: 0,
    verified: true,
    languages: ['English', 'Hindi'],
    pgpFingerprint: '5C83 1E49 7A20 9B64 3F12  0D85 6E31 4A97 2C08 55E6',
    bio: 'Fast Release · Best Rates · Trusted Seller. UPI, IMPS, and PayPal P2P settlements in minutes.',
    volumeTier: '80+ BTC',
    recentFeedback: [
      { id: 'fb-jm-1', author: 'blr_swap', positive: true, comment: 'Instant UPI verification and USDT release.', asset: 'USDT', date: '1 day ago' },
    ],
  },
  kryptomaster: {
    username: 'kryptomaster',
    joinedAt: '2020-09-12',
    tradesCount: 3360,
    ratingPct: 98,
    avgReleaseMinutes: 7,
    lastSeenMinutes: 0,
    verified: true,
    languages: ['English'],
    pgpFingerprint: '4B72 0D95 6E18 3A41 8C27  9F50 1E63 7B24 0A89 33C2',
    bio: 'FAST AND RELIABLE. Long-time US P2P vendor accepting PayPal, Zelle, Apple Pay, and Cash App.',
    volumeTier: '75+ BTC',
    recentFeedback: [
      { id: 'fb-km-1', author: 'austin_hodl', positive: true, comment: 'Smooth PayPal trade, released BTC right away.', asset: 'BTC', date: '2 days ago' },
    ],
  },
  RO_EXCHANGE: {
    username: 'RO_EXCHANGE',
    joinedAt: '2021-01-25',
    tradesCount: 2601,
    ratingPct: 100,
    avgReleaseMinutes: 5,
    lastSeenMinutes: 0,
    verified: true,
    languages: ['Romanian', 'English'],
    pgpFingerprint: '6F19 3A84 0C52 7E91 2B68  4D03 8A75 1E29 9C40 61B8',
    bio: 'European instant bank transfer desk (SEPA Instant, Revolut, RON). Fast verification and 100% escrow track record.',
    volumeTier: '65+ BTC',
    recentFeedback: [
      { id: 'fb-ro-1', author: 'bucharest_eth', positive: true, comment: 'Instant SEPA settlement, ETH released in 3 mins.', asset: 'ETH', date: '10 hours ago' },
    ],
  },
  Threeking: {
    username: 'Threeking',
    joinedAt: '2021-08-08',
    tradesCount: 2585,
    ratingPct: 100,
    avgReleaseMinutes: 7,
    lastSeenMinutes: 0,
    verified: true,
    languages: ['English', 'Hindi'],
    pgpFingerprint: '8E40 2C17 9A63 5D08 1F94  7B32 0E56 4C81 3A29 90D5',
    bio: 'Any cryptocurrency · Best P2P transactions 24/7. Fast UPI, Google Pay, and Virtual Visa settlement.',
    volumeTier: '60+ BTC',
    recentFeedback: [
      { id: 'fb-tk-1', author: 'pune_btc', positive: true, comment: 'Top trader, zero delays on BTC.', asset: 'BTC', date: '1 day ago' },
    ],
  },
  XingQiu77: {
    username: 'XingQiu77',
    joinedAt: '2022-01-19',
    tradesCount: 2045,
    ratingPct: 100,
    avgReleaseMinutes: 6,
    lastSeenMinutes: 0,
    verified: true,
    languages: ['English', 'Mandarin'],
    pgpFingerprint: '3A58 7F12 9C40 6E83 2D05  1B79 4A62 8E31 0C94 72F8',
    bio: 'Fast, secure, and trustworthy. Specializing in Apple Gift Cards, Steam Gift Cards, and AUD/USD P2P swaps.',
    volumeTier: '50+ BTC',
    recentFeedback: [
      { id: 'fb-xq-1', author: 'syd_stacker', positive: true, comment: 'Apple card verified and BTC released fast.', asset: 'BTC', date: '18 hours ago' },
    ],
  },
  Qing66666: {
    username: 'Qing66666',
    joinedAt: '2022-05-03',
    tradesCount: 1794,
    ratingPct: 99,
    avgReleaseMinutes: 4,
    lastSeenMinutes: 0,
    verified: true,
    languages: ['English', 'Mandarin'],
    pgpFingerprint: '1F92 4E60 8A37 2C15 9D84  6B03 7E41 5A28 0C69 34E7',
    bio: 'Honesty and Speed. Accepting Amazon, Apple, and Steam gift cards for LTC, BTC, and USDT.',
    volumeTier: '40+ BTC',
    recentFeedback: [
      { id: 'fb-qg-1', author: 'uk_gift', positive: true, comment: 'Super fast gift card verification, highly recommend.', asset: 'LTC', date: '2 days ago' },
    ],
  },
  Chenyi519: {
    username: 'Chenyi519',
    joinedAt: '2022-06-11',
    tradesCount: 1713,
    ratingPct: 100,
    avgReleaseMinutes: 8,
    lastSeenMinutes: 0,
    verified: true,
    languages: ['English', 'Mandarin'],
    pgpFingerprint: '7C04 9B28 5E13 6A72 4F90  2D61 8C35 0E19 7A48 53B2',
    bio: 'Fast and honest, 24/7 online. Australia PayID, gift cards, and multi-asset P2P liquidity.',
    volumeTier: '38+ BTC',
    recentFeedback: [
      { id: 'fb-cy-1', author: 'melb_btc', positive: true, comment: 'Clean AUD trade, fast release.', asset: 'BTC', date: '3 days ago' },
    ],
  },
  Asfi6325: {
    username: 'Asfi6325',
    joinedAt: '2022-09-17',
    tradesCount: 1593,
    ratingPct: 100,
    avgReleaseMinutes: 9,
    lastSeenMinutes: 0,
    verified: true,
    languages: ['English'],
    pgpFingerprint: '0E71 5A39 2B84 6C10 8D52  9F27 3A64 1E08 4B93 65C1',
    bio: 'Canadian Interac e-Transfer & Virtual Visa P2P desk. Fast release and clear terms.',
    volumeTier: '35+ BTC',
    recentFeedback: [
      { id: 'fb-as-1', author: 'ottawa_p2p', positive: true, comment: 'Easy Interac e-Transfer, smooth trade.', asset: 'BTC', date: '4 days ago' },
    ],
  },
  trade_thunder: {
    username: 'trade_thunder',
    joinedAt: '2022-03-29',
    tradesCount: 1584,
    ratingPct: 100,
    avgReleaseMinutes: 6,
    lastSeenMinutes: 0,
    verified: true,
    languages: ['English', 'Urdu'],
    pgpFingerprint: '9A25 6D80 4E12 7C39 0B64  5F18 2A93 6E47 1C80 39D4',
    bio: 'Bank Transfer, JazzCash, and EasyPaisa Fast Service 24/7 Available.',
    volumeTier: '32+ BTC',
    recentFeedback: [
      { id: 'fb-tt-1', author: 'lhr_usdt', positive: true, comment: 'EasyPaisa confirmed in 2 mins, prompt release.', asset: 'USDT', date: '1 day ago' },
    ],
  },
  Zoeyy: {
    username: 'Zoeyy',
    joinedAt: '2022-11-04',
    tradesCount: 1117,
    ratingPct: 99,
    avgReleaseMinutes: 5,
    lastSeenMinutes: 0,
    verified: true,
    languages: ['English'],
    pgpFingerprint: '2D86 7C41 9E05 3A72 6F18  4B90 8E23 5C67 0A14 78D9',
    bio: 'UK Faster Payments, Wise & Revolut instant GBP liquidity. Fast release and zero KYC friction.',
    volumeTier: '28+ BTC',
    recentFeedback: [
      { id: 'fb-zy-1', author: 'manchester_btc', positive: true, comment: 'FPS settled instantly, very friendly trader.', asset: 'USDT', date: '2 days ago' },
    ],
  },
  TheRock: {
    username: 'TheRock',
    joinedAt: '2023-01-15',
    tradesCount: 284,
    ratingPct: 100,
    avgReleaseMinutes: 6,
    lastSeenMinutes: 0,
    verified: true,
    languages: ['English'],
    pgpFingerprint: '4E19 8A52 7B03 6C41 9D80  3F25 1E67 8A94 2C05 47B6',
    bio: 'Fast trade / 24/7 active. Cash App, Zelle, and Virtual Debit Card P2P settlements.',
    volumeTier: '10+ BTC',
    recentFeedback: [
      { id: 'fb-tr-1', author: 'chicago_sol', positive: true, comment: 'Cash App to USDT settled in 3 mins.', asset: 'USDT', date: '3 days ago' },
    ],
  },
};

// Populate 96 additional realistic username-style trader profiles
function seedHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const COMMUNITY_HANDLES: Array<{
  username: string;
  langs: string[];
  bio: string;
}> = [
  { username: 'eliasse321', langs: ['English', 'French'], bio: 'Fast peer-to-peer XMR & BTC trades. Online daily, instant escrow release once payment clears.' },
  { username: 'niko_val94', langs: ['English', 'German'], bio: 'SEPA Instant, Wise & Revolut trader. Straightforward terms, no paperwork.' },
  { username: 'maren_k', langs: ['English', 'Norwegian'], bio: 'Nordic peer-to-peer desk. Smooth EUR and USD settlements for XMR, BTC, and ETH.' },
  { username: 'tomasz404', langs: ['Polish', 'English'], bio: 'Long-time Monero and Litecoin trader. Fast response, PGP available on request.' },
  { username: 'kaito_jp7', langs: ['Japanese', 'English'], bio: 'APAC liquidity for BTC, ETH, and SOL. Domestic wire and Wise settled quickly.' },
  { username: 'diego_mx21', langs: ['Spanish', 'English'], bio: 'SPEI, Wise, and gift card swaps. Zero ID hassle, fast turnaround.' },
  { username: 'samir_92', langs: ['English', 'Arabic'], bio: 'Middle East & global P2P liquidity. Clean bank wires and digital vouchers.' },
  { username: 'viktor912', langs: ['English', 'Czech'], bio: 'SEPA Instant & Paysera EUR trades. Always funded in escrow before chat starts.' },
  { username: 'claire_p2p', langs: ['French', 'English'], bio: 'Buying and selling BTC/XMR via Revolut and Wise. Active European hours.' },
  { username: 'yusuf_tr8', langs: ['Turkish', 'English'], bio: 'Quick bank & USDT peer-to-peer settlement. Reliable counterparty.' },
  { username: 'liam_tor', langs: ['English'], bio: 'Canada Interac e-Transfer & cash-by-mail trader. Privacy-respecting, no memos.' },
  { username: 'hana.sato', langs: ['Japanese', 'English'], bio: 'Spot-synced BTC and ETH desk. Polite communication and prompt release.' },
  { username: 'felix_zh', langs: ['German', 'English'], bio: 'Swiss CHF bank transfer and Zurich cash meetups. PGP signed terms.' },
  { username: 'zoe_k22', langs: ['English'], bio: 'Zelle, Apple Pay & PayPal F&F trades. Fast release for repeat users.' },
  { username: 'henrik_77', langs: ['Swedish', 'English'], bio: 'Scandinavian EUR/USD trader. Tight spreads on XMR and BTC.' },
  { username: 'anya_pl', langs: ['Polish', 'English'], bio: 'Revolut, SEPA & Amazon card trades. Quick verification.' },
  { username: 'julien_r', langs: ['French', 'English'], bio: 'SEPA Instant & Wise EUR swaps. Zero KYC, direct settlement.' },
  { username: 'theo_808', langs: ['English'], bio: 'US cashless ATM & Zelle liquidity. Fast releases, no extra steps.' },
  { username: 'noah_sg3', langs: ['English', 'Mandarin'], bio: 'Singapore FAST & Wise trader for USDT, USDC, and BTC.' },
  { username: 'elena_ch', langs: ['German', 'Italian', 'English'], bio: 'Zurich/Lugano CHF & EUR peer-to-peer trader. Clean escrow execution.' },
  { username: 'lucas_br9', langs: ['Portuguese', 'English'], bio: 'PIX instant BRL settlements for BTC, LTC, and USDT.' },
  { username: 'mina_kr', langs: ['Korean', 'English'], bio: 'Cross-border USDT/USDC and SOL peer swaps. Fast replies.' },
  { username: 'antoine55', langs: ['French', 'English'], bio: 'Private P2P trader since 2021. SEPA Instant & Revolut.' },
  { username: 'rafa_es', langs: ['Spanish', 'English'], bio: 'SEPA Instant Spain/EU & Wise trades. Clear instructions.' },
  { username: 'petra_at', langs: ['German', 'English'], bio: 'Vienna EUR bank wire and SEPA Instant desk. Monero friendly.' },
  { username: 'ivan_bg4', langs: ['Bulgarian', 'English'], bio: 'SEPA, Paysera & Revolut trader for BTC, ETH, and XMR.' },
  { username: 'kiran_in', langs: ['English', 'Hindi'], bio: 'UPI & Wise P2P settlement. Instant confirmation and release.' },
  { username: 'maya_nz', langs: ['English'], bio: 'NZD & AUD bank transfers for Bitcoin and Monero.' },
  { username: 'daiki_tk', langs: ['Japanese', 'English'], bio: 'Tokyo desk handling JPY bank wires and cross-crypto swaps.' },
  { username: 'jonas_dk', langs: ['Danish', 'English'], bio: 'Copenhagen SEPA & Revolut trader. Fast release on ETH & BTC.' },
  { username: 'stella_gr', langs: ['Greek', 'English'], bio: 'SEPA Instant & Revolut EUR peer trades. No ID checks.' },
  { username: 'max_bxl', langs: ['French', 'Dutch', 'English'], bio: 'Brussels SEPA & Wise desk for XMR, BTC, and LTC.' },
  { username: 'tariq_ae', langs: ['Arabic', 'English'], bio: 'AED domestic wire & Dubai cash desk. High liquidity.' },
  { username: 'fiona_ie', langs: ['English'], bio: 'Dublin SEPA Instant & Revolut trader. Reliable and responsive.' },
  { username: 'bruno_pt', langs: ['Portuguese', 'English'], bio: 'Lisbon EUR SEPA & Wise liquidity for BTC and Monero.' },
  { username: 'nadia_ma', langs: ['Arabic', 'French', 'English'], bio: 'Global Wise & Paysera peer-to-peer trader.' },
  { username: 'owen_uk6', langs: ['English'], bio: 'UK Faster Payments (FPS) specialist. Settled in minutes.' },
  { username: 'leila_tn', langs: ['French', 'Arabic', 'English'], bio: 'Gift card & EUR wallet swaps. Instant verification.' },
  { username: 'remy_fr', langs: ['French', 'English'], bio: 'Lyon EUR SEPA Instant & Cash by Mail for XMR/BTC.' },
  { username: 'kuba_waw', langs: ['Polish', 'English'], bio: 'Warsaw P2P desk. Revolut, Wise, and gift cards.' },
  { username: 'enzo_it3', langs: ['Italian', 'English'], bio: 'Milan SEPA Instant & Revolut trader. Fast escrow turnaround.' },
  { username: 'tessa_nl', langs: ['Dutch', 'English'], bio: 'Amsterdam SEPA & Wise EUR trader. Clean zero-KYC process.' },
  { username: 'ali_bh7', langs: ['Arabic', 'English'], bio: 'Bahrain BHD gift cards & Gulf bank transfers.' },
  { username: 'kevin_ca4', langs: ['English', 'French'], bio: 'Canadian Interac e-Transfer & Wise trader. Auto-deposit active.' },
  { username: 'paula_co', langs: ['Spanish', 'English'], bio: 'Wise USD & global stablecoin P2P liquidity.' },
  { username: 'hugo_se2', langs: ['Swedish', 'English'], bio: 'Stockholm P2P trader. Revolut, SEPA & XMR swaps.' },
  { username: 'mikael90', langs: ['Finnish', 'English'], bio: 'SEPA Instant & Paysera EUR desk. Active daily.' },
  { username: 'yara_lb', langs: ['Arabic', 'English'], bio: 'USD Wise & digital gift card trades. Fast releases.' },
  { username: 'oscar_pe', langs: ['Spanish', 'English'], bio: 'LATAM & USD bank transfer peer trader.' },
  { username: 'emil_fi', langs: ['Finnish', 'Swedish', 'English'], bio: 'Helsinki Monero & Bitcoin P2P trader. Zero hassle.' },
  { username: 'sara_hk', langs: ['English', 'Cantonese'], bio: 'HKD/USD Wise & cross-chain USDT/USDC liquidity.' },
  { username: 'dante_ar', langs: ['Spanish', 'English'], bio: 'Stablecoin & BTC peer-to-peer trader. Fast chat.' },
  { username: 'oliver_au', langs: ['English'], bio: 'Australian PayID & Osko instant transfers for BTC, XMR, USDC.' },
  { username: 'noor_kw', langs: ['Arabic', 'English'], bio: 'Gulf region gift cards & USD wire peer trader.' },
  { username: 'simon_be', langs: ['Dutch', 'French', 'English'], bio: 'Antwerp SEPA Instant & Wise desk. Tight spreads.' },
  { username: 'jade_tw', langs: ['Mandarin', 'English'], bio: 'APAC USDT, ETH, and SOL peer-to-peer desk.' },
  { username: 'alexis_ch', langs: ['French', 'German', 'English'], bio: 'Geneva CHF & EUR transfers. PGP verified.' },
  { username: 'rohan_sg', langs: ['English', 'Hindi'], bio: 'Singapore Wise & PayNow trades. Fast and consistent.' },
  { username: 'ines_es4', langs: ['Spanish', 'English'], bio: 'Madrid Revolut & SEPA Instant peer trader.' },
  { username: 'benji_us', langs: ['English'], bio: 'Zelle, Apple Pay & Cash by Mail. Fast US settlements.' },
  { username: 'milo_420', langs: ['English'], bio: 'Privacy-first XMR & LTC swaps. Tor friendly, PGP active.' },
  { username: 'katja_si', langs: ['Slovenian', 'English'], bio: 'EU SEPA Instant & Paysera trades for BTC and XMR.' },
  { username: 'farid_my', langs: ['Malay', 'English'], bio: 'MYR/SGD/USD Wise & Steam gift card trader.' },
  { username: 'iris_ro', langs: ['Romanian', 'English'], bio: 'SEPA Instant & Revolut EUR desk. Quick releases.' },
  { username: 'gideon_za', langs: ['English'], bio: 'Global Wise, PayPal & BTC/LTC peer trader.' },
  { username: 'chloe_qc', langs: ['French', 'English'], bio: 'Montreal Interac e-Transfer for Monero & Bitcoin.' },
  { username: 'karim_eg', langs: ['Arabic', 'English'], bio: 'Wise & digital voucher peer-to-peer trades.' },
  { username: 'valeria_uy', langs: ['Spanish', 'English'], bio: 'USD Wise & Revolut cross-border trades.' },
  { username: 'seb_219', langs: ['English', 'German'], bio: 'Fast crypto-to-crypto & SEPA escrow swaps.' },
  { username: 'tobi_ng', langs: ['English'], bio: 'NGN bank transfer & USD gift card P2P desk.' },
  { username: 'amira_qa', langs: ['Arabic', 'English'], bio: 'Gulf domestic wire & Wise USDT liquidity.' },
  { username: 'nico_de9', langs: ['German', 'English'], bio: 'Berlin SEPA Instant & Cash by Mail for XMR.' },
  { username: 'ash_991', langs: ['English'], bio: 'Amazon, Apple & Steam gift card trader. Quick verification.' },
  { username: 'freja_no', langs: ['Norwegian', 'English'], bio: 'Oslo Revolut & Wise peer-to-peer desk.' },
  { username: 'lorenzo_m', langs: ['Italian', 'English'], bio: 'Rome SEPA Instant & EUR/BTC swaps.' },
  { username: 'khalid_973', langs: ['Arabic', 'English'], bio: 'Bahrain & UAE PSN/Steam cards and wire trades.' },
  { username: 'artur_lv', langs: ['Latvian', 'English'], bio: 'Baltic SEPA Instant & Paysera EUR liquidity.' },
  { username: 'veronika_cz', langs: ['Czech', 'English'], bio: 'Prague Revolut & SEPA peer trader. Fast escrow.' },
  { username: 'matej_sk', langs: ['Slovak', 'English'], bio: 'EU SEPA & LTC/XMR peer swaps. Zero KYC.' },
  { username: 'bastian_9', langs: ['German', 'English'], bio: 'Munich SEPA Instant & Revolut BTC desk.' },
  { username: 'sam_nyc24', langs: ['English'], bio: 'Zelle, Apple Pay & Cardless ATM US trades.' },
  { username: 'celine_lu', langs: ['French', 'German', 'English'], bio: 'Luxembourg SEPA Instant & Wise high-limit desk.' },
  { username: 'andre_ao', langs: ['Portuguese', 'English'], bio: 'Global Wise & USDT peer settlements.' },
  { username: 'hassan_om', langs: ['Arabic', 'English'], bio: 'Gulf wire & digital voucher peer desk.' },
  { username: 'darius_lt', langs: ['Lithuanian', 'English'], bio: 'Paysera & Revolut EUR instant trades.' },
  { username: 'kael_0x', langs: ['English'], bio: 'ETH, SOL, and XMR peer-to-peer atomic & escrow swaps.' },
  { username: 'soren_xmr', langs: ['Danish', 'English'], bio: 'Dedicated Monero privacy desk. PGP & Tor ready.' },
  { username: 'nina_bkk', langs: ['Thai', 'English'], bio: 'Bangkok Wise & USDT/BTC peer liquidity.' },
  { username: 'arjun_09', langs: ['English', 'Hindi'], bio: 'UPI & Wise peer-to-peer BTC/ETH desk.' },
  { username: 'marco_r8', langs: ['Spanish', 'Italian', 'English'], bio: 'SEPA Instant & Revolut EUR liquidity.' },
  { username: 'ayla_303', langs: ['English', 'Turkish'], bio: 'Fast Revolut, Wise & Steam card trades.' },
  { username: 'dani_k', langs: ['English'], bio: 'Zelle, PayPal F&F & LTC quick swaps.' },
  { username: 'roman_71', langs: ['Czech', 'German', 'English'], bio: 'Central EU SEPA & cash-by-mail XMR desk.' },
  { username: 'talia_v', langs: ['English', 'Spanish'], bio: 'Wise & Apple Pay trader. Clean terms.' },
  { username: 'cyrus_01', langs: ['English'], bio: 'Cash by Mail & XMR/BTC multi-asset swapper.' },
  { username: 'keiko_os', langs: ['Japanese', 'English'], bio: 'Osaka JPY wire & USDT/BTC P2P trader.' },
];

const YEAR_OPTIONS = ['2020', '2021', '2022', '2023', '2024', '2025'];
const SEEN_OPTIONS = [0, 0, 0, 2, 5, 9, 14, 23, 38];
const SAMPLE_FB_COMMENTS = [
  'Fast release and clear instructions.',
  'Smooth zero-KYC trade, would deal again.',
  'Escrow settled in a few minutes without issues.',
  'Honest pricing and quick response in chat.',
  'Clean transaction from start to finish.',
];
const SAMPLE_FB_AUTHORS = [
  'milo_88', 'anon_314', 'nord_p2p', 'sara_v', 'tomas_k', 'xmr_owl', 'jules_19', 'cairo_btc',
];

for (let idx = 0; idx < COMMUNITY_HANDLES.length; idx++) {
  const entry = COMMUNITY_HANDLES[idx];
  const h = seedHash(entry.username);
  const tradesCount = 24 + (h % 3150);
  const ratingPct = tradesCount > 400 ? 99 + (h % 2) : 97 + (h % 4);
  const avgReleaseMinutes = 2 + (h % 11);
  const lastSeenMinutes = SEEN_OPTIONS[h % SEEN_OPTIONS.length];
  const year = YEAR_OPTIONS[h % YEAR_OPTIONS.length];
  const month = String(1 + ((h >> 3) % 12)).padStart(2, '0');
  const day = String(1 + ((h >> 7) % 28)).padStart(2, '0');
  const hexA = (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
  const hexB = ((h * 2654435761) >>> 0).toString(16).toUpperCase().padStart(8, '0');
  const hexC = ((h * 2246822519) >>> 0).toString(16).toUpperCase().padStart(8, '0');
  const hexD = ((h * 3266489917) >>> 0).toString(16).toUpperCase().padStart(8, '0');
  const hexE = ((h * 668265263) >>> 0).toString(16).toUpperCase().padStart(8, '0');
  const raw40 = `${hexA}${hexB}${hexC}${hexD}${hexE}`;
  const pgpFingerprint = raw40.match(/.{1,4}/g)?.join(' ') ?? raw40;
  const volBtc = Math.max(2, Math.round(tradesCount / 42));

  SEED_TRADERS[entry.username] = {
    username: entry.username,
    joinedAt: `${year}-${month}-${day}`,
    tradesCount,
    ratingPct: Math.min(100, ratingPct),
    avgReleaseMinutes,
    lastSeenMinutes,
    verified: tradesCount >= 260,
    languages: entry.langs,
    pgpFingerprint,
    bio: entry.bio,
    volumeTier: `${volBtc}+ BTC`,
    recentFeedback: [
      {
        id: `fb-c-${idx}-1`,
        author: SAMPLE_FB_AUTHORS[h % SAMPLE_FB_AUTHORS.length],
        positive: true,
        comment: SAMPLE_FB_COMMENTS[h % SAMPLE_FB_COMMENTS.length],
        asset: (['BTC', 'XMR', 'ETH', 'USDT', 'LTC'] as const)[h % 5],
        date: `${1 + (h % 6)} days ago`,
      },
      {
        id: `fb-c-${idx}-2`,
        author: SAMPLE_FB_AUTHORS[(h + 3) % SAMPLE_FB_AUTHORS.length],
        positive: true,
        comment: SAMPLE_FB_COMMENTS[(h + 2) % SAMPLE_FB_COMMENTS.length],
        asset: (['XMR', 'BTC', 'USDT', 'SOL', 'USDC'] as const)[(h + 1) % 5],
        date: `${1 + (h % 3)} weeks ago`,
      },
    ],
  };
}

const BASE_SEED_OFFERS: P2POffer[] = [
  // Top First-Page Featured Traders (Active LocalCoinSwap Handles)
  {
    id: 'off-101',
    side: 'sell_crypto',
    traderUsername: 'Victor7777',
    crypto: 'BTC',
    fiat: 'CAD',
    country: 'Canada',
    paymentMethod: 'Paysafecard',
    paymentCategory: 'Gift Cards',
    pricingMode: 'margin',
    marginPct: -10,
    minFiat: 25,
    maxFiat: 500,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release', 'High Volume'],
    terms: 'Valid Canadian or global Paysafecard PIN only. Share the 16-digit code in chat; BTC released immediately after verification.',
    active: true,
    createdAt: '2026-11-10T10:00:00Z',
  },
  {
    id: 'off-102',
    side: 'sell_crypto',
    traderUsername: 'XingQiu77',
    crypto: 'BTC',
    fiat: 'AUD',
    country: 'Australia',
    paymentMethod: 'Apple Gift Card',
    paymentCategory: 'Gift Cards',
    pricingMode: 'margin',
    marginPct: -9.5,
    minFiat: 100,
    maxFiat: 1000,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release'],
    terms: 'Fast, secure, and trustworthy. AUD Apple Store / iTunes gift cards accepted. Send clear claim code in trade chat.',
    active: true,
    createdAt: '2026-11-10T11:30:00Z',
  },
  {
    id: 'off-103',
    side: 'sell_crypto',
    traderUsername: 'Qing66666',
    crypto: 'LTC',
    fiat: 'GBP',
    country: 'United Kingdom',
    paymentMethod: 'Amazon Gift Card',
    paymentCategory: 'Gift Cards',
    pricingMode: 'margin',
    marginPct: -9.0,
    minFiat: 25,
    maxFiat: 600,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release', 'Receipt Not Required'],
    terms: 'Honesty and Speed. UK Amazon Gift Card codes accepted without extra paperwork. Instant LTC release upon claim.',
    active: true,
    createdAt: '2026-11-11T08:15:00Z',
  },
  {
    id: 'off-104',
    side: 'sell_crypto',
    traderUsername: 'EnoughShoveler',
    crypto: 'USDT',
    cryptoChain: 'TRX',
    fiat: 'NGN',
    country: 'Nigeria',
    paymentMethod: 'Bank Transfer',
    paymentCategory: 'Bank & Wire',
    pricingMode: 'margin',
    marginPct: -6.5,
    minFiat: 50000,
    maxFiat: 5000000,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release', 'High Volume'],
    terms: 'Fast Release Best Rates Trusted Seller. Instant NGN bank transfer for USDT (TRC-20). Zero KYC friction.',
    active: true,
    createdAt: '2026-11-12T09:00:00Z',
  },
  {
    id: 'off-105',
    side: 'sell_crypto',
    traderUsername: 'BitLords',
    crypto: 'USDT',
    cryptoChain: 'ETH',
    fiat: 'INR',
    country: 'India',
    paymentMethod: 'Cash in Person',
    paymentCategory: 'Cash & In-Person',
    pricingMode: 'margin',
    marginPct: -6.2,
    minFiat: 15000,
    maxFiat: 450000,
    paymentWindowMinutes: 90,
    tags: ['No ID Required', 'Cash Only', 'High Volume'],
    terms: 'All major cities cash desk or bank settlement. Escrow funded prior to meetup; instant USDT release on confirmation.',
    active: true,
    createdAt: '2026-11-12T10:20:00Z',
  },
  {
    id: 'off-106',
    side: 'sell_crypto',
    traderUsername: 'Queen13598',
    crypto: 'USDT',
    cryptoChain: 'SOL',
    fiat: 'CAD',
    country: 'Canada',
    paymentMethod: 'Interac e-Transfer',
    paymentCategory: 'Bank & Wire',
    pricingMode: 'margin',
    marginPct: -6.0,
    minFiat: 50,
    maxFiat: 3000,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release', 'High Volume'],
    terms: '24/7 Fast Deals · Secure Trade. Interac e-Transfer auto-deposit enabled. Leave transfer note blank.',
    active: true,
    createdAt: '2026-11-12T11:45:00Z',
  },
  {
    id: 'off-107',
    side: 'sell_crypto',
    traderUsername: 'jakemin',
    crypto: 'USDT',
    cryptoChain: 'TRX',
    fiat: 'INR',
    country: 'India',
    paymentMethod: 'UPI',
    paymentCategory: 'Bank & Wire',
    pricingMode: 'margin',
    marginPct: -5.8,
    minFiat: 2500,
    maxFiat: 100000,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release'],
    terms: 'Fast Release Best Rates Trusted Seller. Instant UPI / IMPS INR payment for USDT.',
    active: true,
    createdAt: '2026-11-12T12:10:00Z',
  },
  {
    id: 'off-108',
    side: 'sell_crypto',
    traderUsername: 'kryptomaster',
    crypto: 'BTC',
    fiat: 'USD',
    country: 'United States',
    paymentMethod: 'PayPal',
    paymentCategory: 'Online Wallets',
    pricingMode: 'margin',
    marginPct: -5.6,
    minFiat: 50,
    maxFiat: 1500,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release'],
    terms: 'FAST AND RELIABLE. PayPal Friends & Family transfer from verified balance. Do not mention crypto in memos.',
    active: true,
    createdAt: '2026-11-12T14:00:00Z',
  },
  {
    id: 'off-109',
    side: 'sell_crypto',
    traderUsername: 'RO_EXCHANGE',
    crypto: 'ETH',
    fiat: 'EUR',
    country: 'Romania',
    paymentMethod: 'SEPA Instant',
    paymentCategory: 'Bank & Wire',
    pricingMode: 'margin',
    marginPct: -5.4,
    minFiat: 100,
    maxFiat: 10000,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release', 'High Volume'],
    terms: 'Instant EUR SEPA or local bank transfer. Settled in seconds with zero ID checks.',
    active: true,
    createdAt: '2026-11-12T15:30:00Z',
  },
  {
    id: 'off-110',
    side: 'sell_crypto',
    traderUsername: 'Threeking',
    crypto: 'BTC',
    fiat: 'USD',
    country: 'United States',
    paymentMethod: 'Virtual Visa Card',
    paymentCategory: 'Debit & Virtual Cards',
    pricingMode: 'margin',
    marginPct: -5.2,
    minFiat: 50,
    maxFiat: 1200,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release'],
    terms: 'Best P2P transactions 24/7. Instant BTC release via Virtual Visa / prepaid card settlement in chat.',
    active: true,
    createdAt: '2026-11-12T16:10:00Z',
  },
  {
    id: 'off-111',
    side: 'sell_crypto',
    traderUsername: 'claire_p2p',
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
    traderUsername: 'theo_808',
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
    traderUsername: 'felix_zh',
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
    traderUsername: 'viktor912',
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
    traderUsername: 'benji_us',
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
    traderUsername: 'noah_sg3',
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
    traderUsername: 'tariq_ae',
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
    traderUsername: 'dani_k',
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
    traderUsername: 'lucas_br9',
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
    traderUsername: 'ayla_303',
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
    traderUsername: 'oliver_au',
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
  {
    id: 'off-122',
    side: 'sell_crypto',
    traderUsername: 'cryptocoop',
    crypto: 'BTC',
    fiat: 'USD',
    country: 'Global',
    paymentMethod: 'Wise',
    paymentCategory: 'Online Wallets',
    pricingMode: 'margin',
    marginPct: -3.2,
    minFiat: 50,
    maxFiat: 4500,
    paymentWindowMinutes: 30,
    tags: ['No ID Required', 'Instant Release', 'PGP Signed'],
    terms: 'Instant Wise balance transfer in USD. Do not mention crypto in the memo. BTC releases from escrow immediately once settled.',
    active: true,
    createdAt: '2026-11-15T10:00:00Z',
  },
  {
    id: 'off-123',
    side: 'sell_crypto',
    traderUsername: 'poopdeck',
    crypto: 'XMR',
    fiat: 'USD',
    country: 'Global',
    paymentMethod: 'Revolut',
    paymentCategory: 'Online Wallets',
    pricingMode: 'margin',
    marginPct: -2.6,
    minFiat: 40,
    maxFiat: 3200,
    paymentWindowMinutes: 25,
    tags: ['No ID Required', 'Instant Release', 'Tor Friendly'],
    terms: 'Fast USD Revolut tag transfer for Monero (XMR). Zero KYC, clean peer-to-peer release.',
    active: true,
    createdAt: '2026-11-15T11:00:00Z',
  },

  // SELLING OFFERS (side: 'buy_crypto' -> merchants buying crypto FROM the user!)
  {
    id: 'off-201',
    side: 'buy_crypto',
    traderUsername: 'eliasse321',
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
    traderUsername: 'bastian_9',
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
    traderUsername: 'sam_nyc24',
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
    traderUsername: 'owen_uk6',
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
    traderUsername: 'khalid_973',
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
    traderUsername: 'maren_k',
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
    traderUsername: 'kevin_ca4',
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
    traderUsername: 'farid_my',
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
    traderUsername: 'talia_v',
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
    traderUsername: 'ali_bh7',
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
    traderUsername: 'diego_mx21',
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
    traderUsername: 'samir_92',
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
    traderUsername: 'henrik_77',
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
    traderUsername: 'soren_xmr',
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
    traderUsername: 'theo_808',
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
    traderUsername: 'nico_de9',
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
    terms: 'Send your XMR into OOSAB escrow and receive crisp USD bills via Express Mail.',
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
    traderUsername: 'tessa_nl',
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
    traderUsername: 'rohan_sg',
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
    traderUsername: 'yara_lb',
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
  { fiat: 'USD', country: 'Global', minBase: 25, maxBase: 1000, pm: 'Virtual Visa Card', cat: 'Debit & Virtual Cards' },
  { fiat: 'CAD', country: 'Canada', minBase: 100, maxBase: 3500, pm: 'Interac e-Transfer', cat: 'Bank & Wire' },
  { fiat: 'EUR', country: 'Global', minBase: 40, maxBase: 4000, pm: 'Revolut', cat: 'Online Wallets' },
  { fiat: 'USD', country: 'Global', minBase: 20, maxBase: 500, pm: 'Amazon Gift Card', cat: 'Gift Cards' },
  { fiat: 'USD', country: 'United States', minBase: 25, maxBase: 600, pm: 'Vanilla Visa Gift Card', cat: 'Debit & Virtual Cards' },
  { fiat: 'USD', country: 'United States', minBase: 150, maxBase: 4000, pm: 'Cash by Mail', cat: 'Cash & In-Person' },
  { fiat: 'CHF', country: 'Switzerland', minBase: 100, maxBase: 5000, pm: 'TWINT (Switzerland)', cat: 'Bank & Wire' },
  { fiat: 'SGD', country: 'Singapore', minBase: 100, maxBase: 8000, pm: 'PayNow (Singapore)', cat: 'Bank & Wire' },
  { fiat: 'AUD', country: 'Australia', minBase: 100, maxBase: 5000, pm: 'PayID / OSKO (Australia)', cat: 'Bank & Wire' },
  { fiat: 'AED', country: 'United Arab Emirates', minBase: 500, maxBase: 25000, pm: 'Aani Instant Payment (UAE)', cat: 'Bank & Wire' },
  { fiat: 'BRL', country: 'Brazil', minBase: 150, maxBase: 9000, pm: 'PIX', cat: 'Bank & Wire' },
  { fiat: 'USD', country: 'Global', minBase: 30, maxBase: 800, pm: 'PayPal', cat: 'Online Wallets' },
  { fiat: 'USD', country: 'United States', minBase: 25, maxBase: 1200, pm: 'Venmo', cat: 'Online Wallets' },
  { fiat: 'USD', country: 'Global', minBase: 50, maxBase: 1500, pm: 'Revolut Virtual Disposable Card', cat: 'Debit & Virtual Cards' },
  { fiat: 'JPY', country: 'Japan', minBase: 10000, maxBase: 450000, pm: 'PayPay', cat: 'Online Wallets' },
  { fiat: 'INR', country: 'India', minBase: 3000, maxBase: 150000, pm: 'UPI', cat: 'Bank & Wire' },
  { fiat: 'NGN', country: 'Nigeria', minBase: 35000, maxBase: 2500000, pm: 'OPay', cat: 'Online Wallets' },
  { fiat: 'KES', country: 'Kenya', minBase: 2500, maxBase: 180000, pm: 'M-Pesa', cat: 'Online Wallets' },
  { fiat: 'ZAR', country: 'South Africa', minBase: 500, maxBase: 35000, pm: 'Instant EFT / Ozow (South Africa)', cat: 'Bank & Wire' },
  { fiat: 'PHP', country: 'Philippines', minBase: 1500, maxBase: 75000, pm: 'GCash', cat: 'Online Wallets' },
  { fiat: 'IDR', country: 'Indonesia', minBase: 350000, maxBase: 20000000, pm: 'GoPay', cat: 'Online Wallets' },
  { fiat: 'THB', country: 'Thailand', minBase: 1000, maxBase: 65000, pm: 'PromptPay (Thailand)', cat: 'Bank & Wire' },
  { fiat: 'PLN', country: 'Poland', minBase: 150, maxBase: 8000, pm: 'BLIK (Poland)', cat: 'Bank & Wire' },
  { fiat: 'SEK', country: 'Sweden', minBase: 350, maxBase: 25000, pm: 'Swish (Sweden)', cat: 'Bank & Wire' },
  { fiat: 'EUR', country: 'Spain', minBase: 50, maxBase: 2000, pm: 'Bizum (Spain)', cat: 'Bank & Wire' },
  { fiat: 'SAR', country: 'Saudi Arabia', minBase: 200, maxBase: 15000, pm: 'STC Pay', cat: 'Online Wallets' },
  { fiat: 'COP', country: 'Colombia', minBase: 100000, maxBase: 6000000, pm: 'Nequi', cat: 'Online Wallets' },
  { fiat: 'PKR', country: 'Pakistan', minBase: 8000, maxBase: 350000, pm: 'JazzCash', cat: 'Online Wallets' },
  { fiat: 'MXN', country: 'Mexico', minBase: 500, maxBase: 35000, pm: 'SPEI (Mexico)', cat: 'Bank & Wire' },
  { fiat: 'USD', country: 'Global', minBase: 25, maxBase: 600, pm: 'Apple Gift Card', cat: 'Gift Cards' },
  { fiat: 'USD', country: 'United States', minBase: 25, maxBase: 500, pm: 'Walmart Gift Card', cat: 'Gift Cards' },
  { fiat: 'USD', country: 'Global', minBase: 15, maxBase: 400, pm: 'Google Play Gift Card', cat: 'Gift Cards' },
  { fiat: 'USD', country: 'United States', minBase: 50, maxBase: 1500, pm: 'Chime Visa Debit Card', cat: 'Debit & Virtual Cards' },
  { fiat: 'EUR', country: 'Global', minBase: 25, maxBase: 500, pm: 'Paysafecard', cat: 'Gift Cards' },
  { fiat: 'EUR', country: 'Germany', minBase: 100, maxBase: 7500, pm: 'Paysera', cat: 'Online Wallets' },
  { fiat: 'GHS', country: 'Ghana', minBase: 300, maxBase: 25000, pm: 'MTN Mobile Money (MoMo)', cat: 'Online Wallets' },
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
  const traderUsername = TRADER_NAMES[(i * 17 + 14) % TRADER_NAMES.length];
  const crypto = EXTRA_CRYPTOS[(i * 3 + Math.floor(i / 7)) % EXTRA_CRYPTOS.length];
  const pair = EXTRA_PAIRS[(i * 5 + 2) % EXTRA_PAIRS.length];
  const isGift = pair.cat === 'Gift Cards';
  const rawMargin = isGift
    ? -4.5 + (i % 7) * 1.1
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
  const traderUsername = TRADER_NAMES[(i * 19 + 21) % TRADER_NAMES.length];
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

// Generate 60 peer-to-peer Crypto-to-Crypto Swap offers across the userbase
const SWAP_REF_USD: Record<P2POffer['crypto'], number> = {
  BTC: 91250,
  XMR: 184.6,
  ETH: 3140,
  USDT: 1.0,
  LTC: 86.4,
  SOL: 214.5,
  USDC: 1.0,
};

function roundSwapLimit(usdTarget: number, asset: P2POffer['crypto']): number {
  const raw = usdTarget / (SWAP_REF_USD[asset] || 1);
  if (asset === 'USDT' || asset === 'USDC') return Math.max(10, Math.round(raw / 5) * 5);
  if (raw >= 50) return Number(raw.toFixed(0));
  if (raw >= 5) return Number(raw.toFixed(1));
  if (raw >= 0.5) return Number(raw.toFixed(2));
  return Number(raw.toFixed(4));
}

const SWAP_METHODS = [
  'OOSAB P2P Escrow Swap',
  'Direct On-Chain Atomic Swap',
  'Multi-Sig Escrow Swap',
];

const SWAP_PAIR_BLUEPRINTS: Array<{
  crypto: P2POffer['crypto'];
  swapToCrypto: P2POffer['crypto'];
  marginPct: number;
  minUsd: number;
  maxUsd: number;
  availUsd: number;
  methodIdx: number;
}> = [
  // XMR P2P Swap Ads (expensive: strictly >10% and <=17%)
  { crypto: 'XMR', swapToCrypto: 'BTC', marginPct: 11.4, minUsd: 180, maxUsd: 18000, availUsd: 24000, methodIdx: 0 },
  { crypto: 'XMR', swapToCrypto: 'USDT', marginPct: 12.8, minUsd: 100, maxUsd: 12500, availUsd: 16500, methodIdx: 0 },
  { crypto: 'XMR', swapToCrypto: 'ETH', marginPct: 10.6, minUsd: 150, maxUsd: 14000, availUsd: 19000, methodIdx: 1 },
  { crypto: 'XMR', swapToCrypto: 'USDC', marginPct: 13.5, minUsd: 120, maxUsd: 10000, availUsd: 14000, methodIdx: 0 },
  { crypto: 'XMR', swapToCrypto: 'LTC', marginPct: 14.2, minUsd: 80, maxUsd: 6500, availUsd: 9500, methodIdx: 1 },
  { crypto: 'XMR', swapToCrypto: 'SOL', marginPct: 15.6, minUsd: 100, maxUsd: 7500, availUsd: 11000, methodIdx: 2 },
  { crypto: 'XMR', swapToCrypto: 'BTC', marginPct: 13.9, minUsd: 250, maxUsd: 25000, availUsd: 32000, methodIdx: 1 },
  { crypto: 'XMR', swapToCrypto: 'USDT', marginPct: 10.9, minUsd: 200, maxUsd: 15000, availUsd: 21000, methodIdx: 2 },
  { crypto: 'XMR', swapToCrypto: 'ETH', marginPct: 14.8, minUsd: 300, maxUsd: 11000, availUsd: 14500, methodIdx: 0 },
  { crypto: 'XMR', swapToCrypto: 'USDC', marginPct: 16.4, minUsd: 75, maxUsd: 5500, availUsd: 8200, methodIdx: 0 },
  { crypto: 'XMR', swapToCrypto: 'BTC', marginPct: 16.8, minUsd: 120, maxUsd: 9000, availUsd: 13000, methodIdx: 2 },
  { crypto: 'XMR', swapToCrypto: 'LTC', marginPct: 11.9, minUsd: 90, maxUsd: 4800, availUsd: 7400, methodIdx: 1 },
  { crypto: 'XMR', swapToCrypto: 'SOL', marginPct: 12.3, minUsd: 110, maxUsd: 6200, availUsd: 9000, methodIdx: 0 },
  { crypto: 'XMR', swapToCrypto: 'USDT', marginPct: 15.1, minUsd: 150, maxUsd: 20000, availUsd: 26000, methodIdx: 1 },
  { crypto: 'XMR', swapToCrypto: 'BTC', marginPct: 14.5, minUsd: 400, maxUsd: 28000, availUsd: 35000, methodIdx: 0 },
  { crypto: 'XMR', swapToCrypto: 'ETH', marginPct: 16.1, minUsd: 140, maxUsd: 8400, availUsd: 11500, methodIdx: 2 },
  { crypto: 'XMR', swapToCrypto: 'USDC', marginPct: 11.2, minUsd: 200, maxUsd: 16000, availUsd: 22000, methodIdx: 1 },
  { crypto: 'XMR', swapToCrypto: 'BTC', marginPct: 12.1, minUsd: 100, maxUsd: 12000, availUsd: 17500, methodIdx: 0 },
  { crypto: 'BTC', swapToCrypto: 'XMR', marginPct: 11.6, minUsd: 220, maxUsd: 15000, availUsd: 28000, methodIdx: 0 },
  { crypto: 'USDT', swapToCrypto: 'XMR', marginPct: 10.8, minUsd: 150, maxUsd: 12000, availUsd: 24000, methodIdx: 0 },
  { crypto: 'ETH', swapToCrypto: 'XMR', marginPct: 12.4, minUsd: 200, maxUsd: 11000, availUsd: 19500, methodIdx: 1 },
  { crypto: 'LTC', swapToCrypto: 'XMR', marginPct: 13.7, minUsd: 95, maxUsd: 5200, availUsd: 9800, methodIdx: 1 },
  { crypto: 'USDC', swapToCrypto: 'XMR', marginPct: 11.5, minUsd: 160, maxUsd: 14000, availUsd: 22000, methodIdx: 2 },
  { crypto: 'SOL', swapToCrypto: 'XMR', marginPct: 15.2, minUsd: 130, maxUsd: 7800, availUsd: 13500, methodIdx: 0 },
  { crypto: 'BTC', swapToCrypto: 'XMR', marginPct: 14.9, minUsd: 300, maxUsd: 22000, availUsd: 34000, methodIdx: 2 },
  { crypto: 'USDT', swapToCrypto: 'XMR', marginPct: 16.2, minUsd: 100, maxUsd: 9500, availUsd: 18000, methodIdx: 0 },
  { crypto: 'ETH', swapToCrypto: 'XMR', marginPct: 13.1, minUsd: 180, maxUsd: 13000, availUsd: 21000, methodIdx: 1 },
  { crypto: 'BTC', swapToCrypto: 'XMR', marginPct: 10.5, minUsd: 500, maxUsd: 30000, availUsd: 42000, methodIdx: 0 },

  // Other Coin Swap Ads (tighter spreads around 3%-4% for major pairs, plus moderate alt spreads <=10%)
  { crypto: 'BTC', swapToCrypto: 'USDT', marginPct: 3.2, minUsd: 150, maxUsd: 25000, availUsd: 45000, methodIdx: 0 },
  { crypto: 'USDT', swapToCrypto: 'BTC', marginPct: 3.1, minUsd: 200, maxUsd: 28000, availUsd: 48000, methodIdx: 0 },
  { crypto: 'BTC', swapToCrypto: 'USDC', marginPct: 3.4, minUsd: 200, maxUsd: 22000, availUsd: 36000, methodIdx: 0 },
  { crypto: 'USDC', swapToCrypto: 'BTC', marginPct: 3.3, minUsd: 250, maxUsd: 20000, availUsd: 32000, methodIdx: 2 },
  { crypto: 'ETH', swapToCrypto: 'USDT', marginPct: 3.5, minUsd: 120, maxUsd: 16000, availUsd: 29000, methodIdx: 0 },
  { crypto: 'USDT', swapToCrypto: 'ETH', marginPct: 3.6, minUsd: 120, maxUsd: 18000, availUsd: 31000, methodIdx: 0 },
  { crypto: 'ETH', swapToCrypto: 'USDC', marginPct: 3.4, minUsd: 150, maxUsd: 14000, availUsd: 25000, methodIdx: 2 },
  { crypto: 'USDC', swapToCrypto: 'ETH', marginPct: 3.8, minUsd: 150, maxUsd: 15000, availUsd: 24000, methodIdx: 0 },
  { crypto: 'BTC', swapToCrypto: 'ETH', marginPct: 3.5, minUsd: 250, maxUsd: 24000, availUsd: 40000, methodIdx: 1 },
  { crypto: 'ETH', swapToCrypto: 'BTC', marginPct: 3.7, minUsd: 200, maxUsd: 20000, availUsd: 34000, methodIdx: 1 },
  { crypto: 'LTC', swapToCrypto: 'BTC', marginPct: 3.6, minUsd: 100, maxUsd: 11000, availUsd: 19000, methodIdx: 1 },
  { crypto: 'BTC', swapToCrypto: 'LTC', marginPct: 3.9, minUsd: 120, maxUsd: 12000, availUsd: 21000, methodIdx: 1 },
  { crypto: 'SOL', swapToCrypto: 'USDT', marginPct: 3.8, minUsd: 80, maxUsd: 9500, availUsd: 18000, methodIdx: 0 },
  { crypto: 'USDT', swapToCrypto: 'SOL', marginPct: 3.4, minUsd: 90, maxUsd: 10500, availUsd: 20000, methodIdx: 0 },
  { crypto: 'SOL', swapToCrypto: 'USDC', marginPct: 3.7, minUsd: 80, maxUsd: 8500, availUsd: 15000, methodIdx: 2 },
  { crypto: 'USDC', swapToCrypto: 'SOL', marginPct: 3.9, minUsd: 100, maxUsd: 9000, availUsd: 16000, methodIdx: 0 },
  { crypto: 'LTC', swapToCrypto: 'USDT', marginPct: 3.5, minUsd: 60, maxUsd: 7500, availUsd: 13000, methodIdx: 0 },
  { crypto: 'USDT', swapToCrypto: 'LTC', marginPct: 3.8, minUsd: 75, maxUsd: 8000, availUsd: 14500, methodIdx: 0 },
  { crypto: 'LTC', swapToCrypto: 'USDC', marginPct: 4.0, minUsd: 70, maxUsd: 6500, availUsd: 11000, methodIdx: 2 },
  { crypto: 'SOL', swapToCrypto: 'BTC', marginPct: 4.1, minUsd: 150, maxUsd: 14000, availUsd: 22000, methodIdx: 1 },
  { crypto: 'BTC', swapToCrypto: 'SOL', marginPct: 4.2, minUsd: 160, maxUsd: 15000, availUsd: 24000, methodIdx: 0 },
  { crypto: 'ETH', swapToCrypto: 'SOL', marginPct: 4.0, minUsd: 120, maxUsd: 11000, availUsd: 18000, methodIdx: 2 },
  { crypto: 'SOL', swapToCrypto: 'ETH', marginPct: 4.3, minUsd: 110, maxUsd: 10000, availUsd: 17000, methodIdx: 0 },
  { crypto: 'BTC', swapToCrypto: 'USDT', marginPct: 3.9, minUsd: 350, maxUsd: 30000, availUsd: 55000, methodIdx: 2 },
  { crypto: 'USDT', swapToCrypto: 'BTC', marginPct: 3.6, minUsd: 100, maxUsd: 15000, availUsd: 27000, methodIdx: 0 },
  { crypto: 'ETH', swapToCrypto: 'USDT', marginPct: 3.3, minUsd: 200, maxUsd: 20000, availUsd: 35000, methodIdx: 0 },
  { crypto: 'USDC', swapToCrypto: 'LTC', marginPct: 4.4, minUsd: 65, maxUsd: 6000, availUsd: 10500, methodIdx: 1 },
  { crypto: 'ETH', swapToCrypto: 'LTC', marginPct: 5.8, minUsd: 100, maxUsd: 7500, availUsd: 12000, methodIdx: 1 },
  { crypto: 'LTC', swapToCrypto: 'ETH', marginPct: 6.4, minUsd: 100, maxUsd: 7000, availUsd: 11500, methodIdx: 1 },
  { crypto: 'SOL', swapToCrypto: 'LTC', marginPct: 7.2, minUsd: 75, maxUsd: 5000, availUsd: 8800, methodIdx: 2 },
  { crypto: 'LTC', swapToCrypto: 'SOL', marginPct: 7.8, minUsd: 75, maxUsd: 5500, availUsd: 9200, methodIdx: 0 },
  { crypto: 'BTC', swapToCrypto: 'USDC', marginPct: 4.0, minUsd: 500, maxUsd: 35000, availUsd: 60000, methodIdx: 2 },
];

for (let i = 0; i < SWAP_PAIR_BLUEPRINTS.length; i++) {
  const sp = SWAP_PAIR_BLUEPRINTS[i];
  const traderUsername = TRADER_NAMES[(i * 23 + 14) % TRADER_NAMES.length];
  const minSwap = roundSwapLimit(sp.minUsd, sp.swapToCrypto);
  const maxSwap = roundSwapLimit(sp.maxUsd, sp.swapToCrypto);
  const avail = roundSwapLimit(sp.availUsd, sp.crypto);
  const method = SWAP_METHODS[sp.methodIdx % SWAP_METHODS.length];
  const isXmrSwap = sp.crypto === 'XMR' || sp.swapToCrypto === 'XMR';

  GENERATED_OFFERS.push({
    id: `off-swp-p2p-${i + 1}`,
    side: 'swap_crypto',
    traderUsername,
    crypto: sp.crypto,
    swapToCrypto: sp.swapToCrypto,
    fiat: 'USD',
    country: 'Global',
    paymentMethod: method,
    paymentCategory: 'Crypto Swap',
    pricingMode: 'margin',
    marginPct: sp.marginPct,
    minFiat: sp.minUsd,
    maxFiat: sp.maxUsd,
    minSwapAmount: minSwap,
    maxSwapAmount: maxSwap,
    availableCrypto: avail,
    paymentWindowMinutes: sp.methodIdx === 1 ? 45 : 30,
    tags: isXmrSwap
      ? ['No ID Required', 'PGP Signed', 'Tor Friendly']
      : EXTRA_TAGS[(i + 2) % EXTRA_TAGS.length],
    terms: `Direct peer-to-peer ${sp.swapToCrypto} to ${sp.crypto} escrow swap (${sp.marginPct >= 0 ? `+${sp.marginPct}%` : `${sp.marginPct}%`} spread). Locked in OOSAB multi-asset escrow with zero KYC.`,
    active: i < SWAP_PAIR_BLUEPRINTS.length - 2,
    createdAt: new Date(Date.UTC(2026, 10, 14, 12, 0) - i * 1800_000).toISOString(),
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
  const realLen = trader.recentFeedback?.length ?? 0;
  if (typeof trader.totalFeedbackCount === 'number' && trader.totalFeedbackCount >= realLen) {
    return trader.totalFeedbackCount;
  }
  if (trader.tradesCount <= 0) {
    return realLen;
  }
  const seed = hashString(trader.username);
  const ratio = 0.86 + (seed % 9) * 0.01; // 86% to 94% of completed trades leave feedback
  return Math.max(
    realLen,
    Math.min(trader.tradesCount, Math.round(trader.tradesCount * ratio))
  );
}

export function generateTraderTradesPage(
  trader: TraderProfile,
  offers: P2POffer[],
  offset = 0,
  limit = 15
): { items: NonNullable<TraderProfile['tradeHistory']>; total: number; hasMore: boolean } {
  const realHistory = trader.tradeHistory ?? [];
  const total = Math.max(realHistory.length, trader.tradesCount);
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
    if (i < realHistory.length) {
      items.push(realHistory[i]);
      continue;
    }

    const genIdx = i - realHistory.length;
    const r0 = seededRand(seed, genIdx, 1);
    const r1 = seededRand(seed, genIdx, 2);
    const r2 = seededRand(seed, genIdx, 3);
    const r3 = seededRand(seed, genIdx, 4);

    const offer = traderOffers.length > 0 ? traderOffers[r0 % traderOffers.length] : undefined;
    const asset = offer?.crypto ?? assetsPool[r0 % assetsPool.length];
    const fiatAmt = Math.round((120 + (r1 % 3200)) / 10) * 10;
    const cryptoAmt = Number(
      (fiatAmt / (approxUsdByAsset[asset] || 100)).toFixed(
        asset === 'USDT' || asset === 'USDC' ? 2 : 4
      )
    );

    const hoursAgo = 2 + genIdx * 6 + (r2 % 5);
    const handlePrefix = SAMPLE_HANDLES[r2 % SAMPLE_HANDLES.length];
    const paymentMethod =
      offer?.paymentMethod ?? SAMPLE_PAYMENTS[r3 % SAMPLE_PAYMENTS.length];

    items.push({
      id: `TX-${100000 + ((seed + genIdx * 7919 + (r0 % 997)) % 899999)}`,
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
    trader.tradesCount <= 0 && (!trader.tradeHistory || trader.tradeHistory.length === 0)
      ? 0
      : typeof trader.totalVolumeUsd === 'number' && trader.totalVolumeUsd > 0
        ? trader.totalVolumeUsd
        : Math.max(18500, trader.tradesCount * (320 + (seed % 480)));

  return {
    ...trader,
    totalVolumeUsd,
    completionRatePct:
      trader.completionRatePct ??
      (trader.tradesCount <= 0 ? 100 : Number((98.6 + (seed % 14) * 0.1).toFixed(1))),
    totalFeedbackCount,
    recentFeedback: feedbackPage.items,
    tradeHistory: tradesPage.items,
  };
}


