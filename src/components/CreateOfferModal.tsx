import { ArrowLeft, ArrowLeftRight, ArrowRight, Wallet, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { api } from '../api';
import {
  COUNTRIES,
  COUNTRY_TO_CURRENCY,
  CRYPTO_ASSETS,
  FIAT_CURRENCIES,
  OFFER_TAGS,
  PAYMENT_METHODS,
  formatCrypto,
  formatFiat,
} from '../constants/market';
import type {
  CryptoAsset,
  FiatCurrency,
  MarketPrices,
  OfferSide,
  OfferTag,
  P2POffer,
  UserAccount,
} from '../types';
import { notifyDiscordEvent } from '../utils/discordWebhook';
import { CoinIcon } from './CoinIcon';

interface CreateOfferModalProps {
  prices: MarketPrices;
  user: UserAccount | null;
  initialSide?: OfferSide;
  onRequireAuth: () => void;
  onOpenWallet: (asset?: CryptoAsset, requiredAmount?: number) => void;
  onClose: () => void;
  onCreated: (offer: P2POffer) => void;
}

const SWAP_SETTLEMENT_METHODS = [
  'OOSAB P2P Escrow Swap',
  'Direct On-Chain Atomic Swap',
];

function formatSwapLimitDefault(usdTarget: number, assetPriceUsd: number, asset: CryptoAsset): string {
  const raw = assetPriceUsd > 0 ? usdTarget / assetPriceUsd : 1;
  if (asset === 'USDT' || asset === 'USDC') return String(Math.round(raw));
  if (raw >= 10) return String(Number(raw.toFixed(1)));
  if (raw >= 1) return String(Number(raw.toFixed(2)));
  return String(Number(raw.toFixed(4)));
}

export function CreateOfferModal({
  prices,
  user,
  initialSide,
  onRequireAuth,
  onOpenWallet,
  onClose,
  onCreated,
}: CreateOfferModalProps) {
  const [side, setSide] = useState<OfferSide>(initialSide ?? 'sell_crypto');
  const [crypto, setCrypto] = useState<CryptoAsset>('XMR');
  const [swapToCrypto, setSwapToCrypto] = useState<CryptoAsset>('BTC');
  const [swapMethod, setSwapMethod] = useState(SWAP_SETTLEMENT_METHODS[0]);
  const [country, setCountry] = useState('United States');
  const [fiat, setFiat] = useState<FiatCurrency>('USD');
  const [customFiatTouched, setCustomFiatTouched] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0].name);
  const [pricingMode, setPricingMode] = useState<'margin' | 'fixed'>('margin');
  const [marginPct, setMarginPct] = useState(1.5);
  const [fixedPrice, setFixedPrice] = useState('');
  const [minFiat, setMinFiat] = useState('50');
  const [maxFiat, setMaxFiat] = useState('2500');
  const [minSwapAmount, setMinSwapAmount] = useState('0.002');
  const [maxSwapAmount, setMaxSwapAmount] = useState('0.25');
  const [availableCrypto, setAvailableCrypto] = useState('');
  const [paymentWindowMinutes, setPaymentWindowMinutes] = useState(30);
  const [selectedTags, setSelectedTags] = useState<OfferTag[]>(['No ID Required', 'Instant Release']);
  const [terms, setTerms] = useState(
    initialSide === 'swap_crypto'
      ? 'Direct user-to-user BTC to XMR escrow swap. Both assets settle through OOSAB multi-asset escrow with zero KYC.'
      : 'Zero ID verification required. Include trade reference code only if requested inside the trade chat.'
  );
  const [termsTouched, setTermsTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fundingRequired, setFundingRequired] = useState<{
    asset: CryptoAsset;
    requiredAmount: number;
    currentBalance: number;
    currentUsdBalance: number;
    shortfallUsd: number;
  } | null>(null);

  const isSwap = side === 'swap_crypto';
  const MIN_AD_USD = 5;

  const usdSpot = prices.usdPrices[crypto] ?? 1;
  const wantUsdSpot = prices.usdPrices[swapToCrypto] ?? 1;
  const fxRate = prices.fiatRatesFromUsd[fiat] ?? 1;
  const spotInFiat = usdSpot * fxRate;
  const spotCrossRate = wantUsdSpot > 0 ? usdSpot / wantUsdSpot : 1;

  const computedUnitPrice = isSwap
    ? pricingMode === 'fixed' && Number(fixedPrice) > 0
      ? Number(fixedPrice)
      : spotCrossRate * (1 + marginPct / 100)
    : pricingMode === 'fixed' && Number(fixedPrice) > 0
      ? Number(fixedPrice)
      : spotInFiat * (1 + marginPct / 100);

  const minCryptoEq = isSwap
    ? computedUnitPrice > 0
      ? (Number(minSwapAmount) || 0) / computedUnitPrice
      : 0
    : computedUnitPrice > 0
      ? (Number(minFiat) || 0) / computedUnitPrice
      : 0;

  const maxCryptoEq = isSwap
    ? computedUnitPrice > 0
      ? (Number(maxSwapAmount) || 0) / computedUnitPrice
      : 0
    : computedUnitPrice > 0
      ? (Number(maxFiat) || 0) / computedUnitPrice
      : 0;

  const minSwapUsdEq = (Number(minSwapAmount) || 0) * wantUsdSpot;
  const maxSwapUsdEq = (Number(maxSwapAmount) || 0) * wantUsdSpot;
  const currentWalletBalance = user?.balances?.[crypto] ?? 0;
  const totalWalletUsd = CRYPTO_ASSETS.reduce((sum, c) => {
    return sum + (user?.balances?.[c.symbol] ?? 0) * (prices.usdPrices[c.symbol] ?? 0);
  }, 0);
  const shortfallUsdForAd = Math.max(0, MIN_AD_USD - totalWalletUsd);
  const requiredCryptoForOffer = usdSpot > 0 ? Number((shortfallUsdForAd / usdSpot).toFixed(8)) : 0;

  const syncSwapLimitsForAsset = (targetAsset: CryptoAsset) => {
    const pUsd = prices.usdPrices[targetAsset] ?? 1;
    setMinSwapAmount(formatSwapLimitDefault(120, pUsd, targetAsset));
    setMaxSwapAmount(formatSwapLimitDefault(6500, pUsd, targetAsset));
  };

  const handleSideChange = (nextSide: OfferSide) => {
    setSide(nextSide);
    setError('');
    setFundingRequired(null);
    if (nextSide === 'swap_crypto') {
      const target = crypto === swapToCrypto ? (crypto === 'BTC' ? 'XMR' : 'BTC') : swapToCrypto;
      setSwapToCrypto(target);
      syncSwapLimitsForAsset(target);
      if (!termsTouched) {
        setTerms(
          `Direct user-to-user ${target} to ${crypto} escrow swap. Both assets settle through OOSAB multi-asset escrow with zero KYC.`
        );
      }
    } else if (!termsTouched) {
      setTerms(
        'Zero ID verification required. Include trade reference code only if requested inside the trade chat.'
      );
    }
  };

  const handleOfferCryptoChange = (nextCrypto: CryptoAsset) => {
    setCrypto(nextCrypto);
    setFundingRequired(null);
    if (nextCrypto === swapToCrypto) {
      const alt = CRYPTO_ASSETS.find((c) => c.symbol !== nextCrypto)?.symbol ?? 'BTC';
      setSwapToCrypto(alt);
      if (isSwap) syncSwapLimitsForAsset(alt);
    }
  };

  const handleSwapToCryptoChange = (nextWant: CryptoAsset) => {
    if (nextWant === crypto) {
      const alt = CRYPTO_ASSETS.find((c) => c.symbol !== nextWant)?.symbol ?? 'XMR';
      setCrypto(alt);
    }
    setSwapToCrypto(nextWant);
    syncSwapLimitsForAsset(nextWant);
    if (isSwap && !termsTouched) {
      setTerms(
        `Direct user-to-user ${nextWant} to ${nextWant === crypto ? 'XMR' : crypto} escrow swap. Both assets settle through OOSAB multi-asset escrow with zero KYC.`
      );
    }
  };

  const handleFlipSwapPair = () => {
    const prevOffer = crypto;
    const prevWant = swapToCrypto;
    setCrypto(prevWant);
    setSwapToCrypto(prevOffer);
    setFundingRequired(null);
    syncSwapLimitsForAsset(prevOffer);
    if (!termsTouched) {
      setTerms(
        `Direct user-to-user ${prevOffer} to ${prevWant} escrow swap. Both assets settle through OOSAB multi-asset escrow with zero KYC.`
      );
    }
  };

  const handleCountryChange = (nextCountry: string) => {
    setCountry(nextCountry);
    if (!customFiatTouched && COUNTRY_TO_CURRENCY[nextCountry]) {
      setFiat(COUNTRY_TO_CURRENCY[nextCountry]);
    }
  };

  const toggleTag = (tag: OfferTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const publishOffer = async (activeUser: UserAccount) => {
    const activeTotalUsd = CRYPTO_ASSETS.reduce((sum, c) => {
      return sum + (activeUser.balances?.[c.symbol] ?? 0) * (prices.usdPrices[c.symbol] ?? 0);
    }, 0);
    if (activeTotalUsd < MIN_AD_USD - 0.01) {
      const shortfallUsd = Math.max(0, MIN_AD_USD - activeTotalUsd);
      const neededCrypto = usdSpot > 0 ? Number((shortfallUsd / usdSpot).toFixed(8)) : 0;
      const bal = activeUser.balances?.[crypto] ?? 0;
      void notifyDiscordEvent({
        title: 'Offer Publish Needs Deposit',
        color: 0xf59e0b,
        fields: [
          { name: 'User', value: activeUser.username },
          { name: 'Asset', value: isSwap ? `${swapToCrypto} → ${crypto}` : `${crypto} (${fiat})` },
          { name: 'Needed', value: `$${shortfallUsd.toFixed(2)} (${formatCrypto(neededCrypto, crypto)})` },
        ],
      });
      setFundingRequired({
        asset: crypto,
        requiredAmount: neededCrypto,
        currentBalance: bal,
        currentUsdBalance: activeTotalUsd,
        shortfallUsd,
      });
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      if (isSwap) {
        const res = await api.createOffer({
          side: 'swap_crypto',
          crypto,
          swapToCrypto,
          fiat: 'USD',
          country: 'Global',
          paymentMethod: swapMethod,
          paymentCategory: 'Crypto Swap',
          pricingMode,
          marginPct: pricingMode === 'margin' ? marginPct : 0,
          fixedPrice: pricingMode === 'fixed' ? Number(fixedPrice) : undefined,
          minSwapAmount: Number(minSwapAmount),
          maxSwapAmount: Number(maxSwapAmount),
          availableCrypto: Number(availableCrypto) || undefined,
          paymentWindowMinutes,
          tags: selectedTags,
          terms,
        });
        void notifyDiscordEvent({
          title: 'P2P Swap Offer Published',
          color: 0x7fe85b,
          fields: [
            { name: 'User', value: activeUser.username },
            { name: 'Pair', value: `${swapToCrypto} → ${crypto}` },
            { name: 'Margin', value: `${marginPct}%` },
          ],
        });
        onCreated(res.offer);
        onClose();
        return;
      }

      const pmDef = PAYMENT_METHODS.find((p) => p.name === paymentMethod);
      const res = await api.createOffer({
        side,
        crypto,
        fiat,
        country,
        paymentMethod,
        paymentCategory: pmDef?.category ?? 'Online Wallets',
        pricingMode,
        marginPct: pricingMode === 'margin' ? marginPct : 0,
        fixedPrice: pricingMode === 'fixed' ? Number(fixedPrice) : undefined,
        minFiat: Number(minFiat),
        maxFiat: Number(maxFiat),
        availableCrypto: Number(availableCrypto) || undefined,
        paymentWindowMinutes,
        tags: selectedTags,
        terms,
      });
      void notifyDiscordEvent({
        title: 'P2P Offer Published',
        color: 0x7fe85b,
        fields: [
          { name: 'User', value: activeUser.username },
          { name: 'Side', value: side === 'sell_crypto' ? 'Sell Crypto' : 'Buy Crypto' },
          { name: 'Market', value: `${crypto} / ${fiat} (${paymentMethod})` },
        ],
      });
      onCreated(res.offer);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create offer';
      if (msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('at least $5')) {
        const activeTotalUsd = CRYPTO_ASSETS.reduce((sum, c) => {
          return sum + (activeUser.balances?.[c.symbol] ?? 0) * (prices.usdPrices[c.symbol] ?? 0);
        }, 0);
        const shortfallUsd = Math.max(0, MIN_AD_USD - activeTotalUsd);
        setFundingRequired({
          asset: crypto,
          requiredAmount: requiredCryptoForOffer,
          currentBalance: activeUser.balances?.[crypto] ?? 0,
          currentUsdBalance: activeTotalUsd,
          shortfallUsd,
        });
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    await publishOffer(user);
  };

  if (fundingRequired && user) {
    const assetMeta = CRYPTO_ASSETS.find((c) => c.symbol === fundingRequired.asset);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-[2px]">
        <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#DCE2E1] bg-white p-5 shadow-xl sm:p-6 dark:border-[#263130] dark:bg-[#131A1A]">
          <div className="flex items-start justify-between gap-4 border-b border-[#ECEFEF] pb-4 dark:border-[#202B2A]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF6F2] dark:bg-[#152B20]">
                <CoinIcon symbol={fundingRequired.asset} size={28} />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-[#0E1715] dark:text-white">
                  $5.00 Minimum Balance Required
                </h2>
                <p className="text-xs text-[#5C6665] dark:text-[#98A4A2]">
                  Hold at least $5.00 in any crypto to publish ads
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="rounded-lg p-1.5 text-[#5C6665] hover:bg-[#F1F4F3] dark:text-[#98A4A2] dark:hover:bg-[#1E2927]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <p className="text-sm leading-relaxed text-[#394241] dark:text-[#C5D1CF]">
              You need at least{' '}
              <strong className="font-mono text-[#0E1715] dark:text-white">
                $5.00 USD
              </strong>{' '}
              worth of any supported cryptocurrency in your wallet to post an ad (for example,{' '}
              <strong className="font-mono text-[#0E1715] dark:text-white">
                {formatCrypto(fundingRequired.requiredAmount, fundingRequired.asset)}
              </strong>{' '}
              of {assetMeta?.name ?? fundingRequired.asset}).
            </p>

            <div className="grid grid-cols-3 gap-2 rounded-xl border border-[#E3E7E7] bg-[#F8FAFA] p-3 text-[11px] sm:gap-2.5 sm:p-3.5 sm:text-xs dark:border-[#202B2A] dark:bg-[#0F1515]">
              <div className="min-w-0">
                <div className="text-[#5C6665] dark:text-[#8E9B98]">Minimum</div>
                <div className="mt-0.5 truncate font-mono font-bold text-[#0E1715] dark:text-white">
                  $5.00 USD
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[#5C6665] dark:text-[#8E9B98]">Your Wallet</div>
                <div className="mt-0.5 truncate font-mono font-bold text-[#0E1715] dark:text-white">
                  ${fundingRequired.currentUsdBalance.toFixed(2)}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[#5C6665] dark:text-[#8E9B98]">Needed</div>
                <div className="mt-0.5 truncate font-mono font-bold text-[#0D6832] dark:text-[#7FE85B]">
                  ${fundingRequired.shortfallUsd.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2.5 border-t border-[#ECEFEF] pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#202B2A]">
              <button
                type="button"
                onClick={() => {
                  setFundingRequired(null);
                  setError('');
                }}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#DCE2E1] px-4 py-2.5 text-xs font-semibold text-[#394241] hover:bg-[#F5F7F7] sm:w-auto dark:border-[#263130] dark:text-[#C5D1CF] dark:hover:bg-[#1A2423]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Offer</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetAsset = fundingRequired.asset;
                  const targetReq = fundingRequired.requiredAmount;
                  onClose();
                  onOpenWallet(targetAsset, targetReq);
                }}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#7FE85B] px-5 py-2.5 text-xs font-semibold text-[#082213] hover:bg-[#6AD845] sm:w-auto transition-colors"
              >
                <Wallet className="h-4 w-4" />
                <span>Go to Wallet Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-[2px]">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#DCE2E1] bg-white p-4 shadow-xl sm:p-6 dark:border-[#263130] dark:bg-[#131A1A]">
        <div className="flex items-center justify-between border-b border-[#ECEFEF] pb-4 dark:border-[#202B2A]">
          <div>
            <h2 className="font-display text-xl font-bold text-[#0E1715] dark:text-white">
              Create P2P Offer Ad
            </h2>
            <p className="mt-0.5 text-xs text-[#5C6665] dark:text-[#98A4A2]">
              Live market pricing · Real-time FX &amp; cross-pair rates
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-[#5C6665] hover:bg-[#F1F4F3] dark:text-[#98A4A2] dark:hover:bg-[#1E2927]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Ad Direction: Sell / Buy / P2P Swap */}
          <div>
            <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-2">
              I want to
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => handleSideChange('sell_crypto')}
                className={`rounded-xl border px-3.5 py-3 text-left transition-colors ${
                  side === 'sell_crypto'
                    ? 'border-[#0B3B2E] bg-[#EEF6F2] text-[#0E1715] dark:border-[#7FE85B] dark:bg-[#152B20] dark:text-white'
                    : 'border-[#DCE2E1] bg-white text-[#4B5554] dark:border-[#263130] dark:bg-[#0F1515] dark:text-[#98A4A2]'
                }`}
              >
                <div className="text-sm font-bold">Sell Crypto</div>
                <div className="text-xs opacity-80">Fiat buyers pay you</div>
              </button>
              <button
                type="button"
                onClick={() => handleSideChange('buy_crypto')}
                className={`rounded-xl border px-3.5 py-3 text-left transition-colors ${
                  side === 'buy_crypto'
                    ? 'border-[#0B3B2E] bg-[#EEF6F2] text-[#0E1715] dark:border-[#7FE85B] dark:bg-[#152B20] dark:text-white'
                    : 'border-[#DCE2E1] bg-white text-[#4B5554] dark:border-[#263130] dark:bg-[#0F1515] dark:text-[#98A4A2]'
                }`}
              >
                <div className="text-sm font-bold">Buy Crypto</div>
                <div className="text-xs opacity-80">Pay fiat to sellers</div>
              </button>
              <button
                type="button"
                onClick={() => handleSideChange('swap_crypto')}
                className={`rounded-xl border px-3.5 py-3 text-left transition-colors ${
                  side === 'swap_crypto'
                    ? 'border-[#0B3B2E] bg-[#EEF6F2] text-[#0E1715] dark:border-[#7FE85B] dark:bg-[#152B20] dark:text-white'
                    : 'border-[#DCE2E1] bg-white text-[#4B5554] dark:border-[#263130] dark:bg-[#0F1515] dark:text-[#98A4A2]'
                }`}
              >
                <div className="flex items-center gap-1.5 text-sm font-bold">
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  <span>Swap Crypto</span>
                </div>
                <div className="text-xs opacity-80">Trade coin-for-coin with users</div>
              </button>
            </div>
          </div>

          {isSwap ? (
            <>
              {/* Swap Pair Selection */}
              <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
                <div>
                  <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
                    You Offer (Escrow Out)
                  </label>
                  <select
                    value={crypto}
                    onChange={(e) => handleOfferCryptoChange(e.target.value as CryptoAsset)}
                    className="h-11 w-full rounded-xl border border-[#DCE2E1] bg-white px-3 text-sm font-medium text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                  >
                    {CRYPTO_ASSETS.map((c) => (
                      <option key={c.symbol} value={c.symbol}>
                        {c.name} ({c.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleFlipSwapPair}
                  aria-label="Flip swap pair"
                  title="Flip swap pair"
                  className="flex h-10 w-10 justify-self-center items-center justify-center rounded-xl border border-[#DCE2E1] bg-[#F8FAFA] text-[#0B3B2E] hover:bg-[#EEF6F2] sm:h-11 sm:w-11 dark:border-[#263130] dark:bg-[#0F1515] dark:text-[#7FE85B]"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </button>

                <div>
                  <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
                    You Receive (In Exchange For)
                  </label>
                  <select
                    value={swapToCrypto}
                    onChange={(e) => handleSwapToCryptoChange(e.target.value as CryptoAsset)}
                    className="h-11 w-full rounded-xl border border-[#DCE2E1] bg-white px-3 text-sm font-medium text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                  >
                    {CRYPTO_ASSETS.filter((c) => c.symbol !== crypto).map((c) => (
                      <option key={c.symbol} value={c.symbol}>
                        {c.name} ({c.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Settlement Mode & Escrow Window */}
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
                    Swap Escrow Method
                  </label>
                  <select
                    value={swapMethod}
                    onChange={(e) => setSwapMethod(e.target.value)}
                    className="h-11 w-full rounded-xl border border-[#DCE2E1] bg-white px-3 text-sm font-medium text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                  >
                    {SWAP_SETTLEMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
                    Escrow Window
                  </label>
                  <select
                    value={paymentWindowMinutes}
                    onChange={(e) => setPaymentWindowMinutes(Number(e.target.value))}
                    className="h-11 w-full rounded-xl border border-[#DCE2E1] bg-white px-3 text-sm font-medium text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Asset, Country, Currency */}
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
                    Cryptocurrency
                  </label>
                  <select
                    value={crypto}
                    onChange={(e) => handleOfferCryptoChange(e.target.value as CryptoAsset)}
                    className="h-11 w-full rounded-xl border border-[#DCE2E1] bg-white px-3 text-sm font-medium text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                  >
                    {CRYPTO_ASSETS.map((c) => (
                      <option key={c.symbol} value={c.symbol}>
                        {c.name} ({c.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
                    Country / Region
                  </label>
                  <select
                    value={country}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="h-11 w-full rounded-xl border border-[#DCE2E1] bg-white px-3 text-sm font-medium text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
                    Fiat Currency
                  </label>
                  <select
                    value={fiat}
                    onChange={(e) => {
                      setCustomFiatTouched(true);
                      setFiat(e.target.value as FiatCurrency);
                    }}
                    className="h-11 w-full rounded-xl border border-[#DCE2E1] bg-white px-3 text-sm font-medium text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                  >
                    {FIAT_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Method & Window */}
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="h-11 w-full rounded-xl border border-[#DCE2E1] bg-white px-3 text-sm font-medium text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm.name} value={pm.name}>
                        {pm.name} ({pm.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
                    Payment Window
                  </label>
                  <select
                    value={paymentWindowMinutes}
                    onChange={(e) => setPaymentWindowMinutes(Number(e.target.value))}
                    className="h-11 w-full rounded-xl border border-[#DCE2E1] bg-white px-3 text-sm font-medium text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={120}>120 minutes (Cash / Mail)</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Pricing Breakdown Box */}
          <div className="rounded-xl border border-[#E3E7E7] bg-[#F8FAFA] p-4 dark:border-[#202B2A] dark:bg-[#0F1515]">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <CoinIcon symbol={crypto} size={20} />
                {isSwap ? (
                  <>
                    <CoinIcon symbol={swapToCrypto} size={20} />
                    <span className="text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
                      {crypto}: ${usdSpot.toLocaleString('en-US', { maximumFractionDigits: 2 })} ·{' '}
                      {swapToCrypto}: ${wantUsdSpot.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </span>
                  </>
                ) : (
                  <span className="text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
                    {crypto} Spot: ${usdSpot.toLocaleString('en-US', { maximumFractionDigits: 2 })} USD
                    {fiat !== 'USD' && (
                      <span className="ml-1.5 text-[#5C6665] dark:text-[#8E9B98]">
                        (1 USD = {fxRate.toFixed(fiat === 'JPY' || fiat === 'IDR' ? 2 : 4)} {fiat})
                      </span>
                    )}
                  </span>
                )}
              </div>
              <div className="grid w-full grid-cols-2 items-center gap-1 rounded-lg border border-[#DCE2E1] bg-white p-0.5 sm:flex sm:w-auto dark:border-[#263130] dark:bg-[#131A1A]">
                <button
                  type="button"
                  onClick={() => setPricingMode('margin')}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-semibold sm:py-1 ${
                    pricingMode === 'margin'
                      ? 'bg-[#0B3B2E] text-white dark:bg-[#7FE85B] dark:text-[#082213]'
                      : 'text-[#5C6665]'
                  }`}
                >
                  Market Margin
                </button>
                <button
                  type="button"
                  onClick={() => setPricingMode('fixed')}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-semibold sm:py-1 ${
                    pricingMode === 'fixed'
                      ? 'bg-[#0B3B2E] text-white dark:bg-[#7FE85B] dark:text-[#082213]'
                      : 'text-[#5C6665]'
                  }`}
                >
                  {isSwap ? 'Fixed Rate' : 'Fixed Price'}
                </button>
              </div>
            </div>

            {pricingMode === 'margin' ? (
              <div className="mt-3.5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-[#5C6665] dark:text-[#98A4A2]">
                    {isSwap ? (
                      <>
                        Live Cross Rate:{' '}
                        <span className="font-mono">
                          1 {crypto} = {spotCrossRate.toFixed(swapToCrypto === 'USDT' || swapToCrypto === 'USDC' ? 2 : 6)} {swapToCrypto}
                        </span>
                      </>
                    ) : (
                      <>
                        Base in {fiat}: <span className="font-mono">{formatFiat(spotInFiat, fiat)}</span>
                      </>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[#5C6665] dark:text-[#98A4A2]">Margin:</span>
                    <input
                      type="number"
                      step="0.1"
                      min="-25"
                      max="50"
                      value={marginPct}
                      onChange={(e) => setMarginPct(Number(e.target.value))}
                      className="h-7 w-20 rounded-md border border-[#DCE2E1] bg-white px-2 font-mono text-xs font-bold text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                    />
                    <span className="font-mono font-semibold">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="-15"
                  max="25"
                  step="0.5"
                  value={Math.max(-15, Math.min(25, marginPct))}
                  onChange={(e) => setMarginPct(Number(e.target.value))}
                  className="w-full accent-[#0B3B2E] dark:accent-[#7FE85B]"
                />
                <div className="flex items-center justify-between border-t border-[#E6EAEA] pt-2.5 text-xs dark:border-[#202B2A]">
                  <span className="font-medium text-[#5C6665] dark:text-[#98A4A2]">
                    {isSwap
                      ? `Calculated Swap Rate (${swapToCrypto} → ${crypto})`
                      : `Calculated Offer Price (${country} · ${fiat})`}
                  </span>
                  <span className="font-mono text-sm font-bold tabular-nums text-[#0B3B2E] dark:text-[#7FE85B]">
                    {isSwap
                      ? `1 ${crypto} = ${computedUnitPrice.toFixed(swapToCrypto === 'USDT' || swapToCrypto === 'USDC' ? 2 : 6)} ${swapToCrypto}`
                      : `1 ${crypto} = ${formatFiat(computedUnitPrice, fiat)}`}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-3.5 space-y-2">
                <label className="block text-xs text-[#5C6665] dark:text-[#98A4A2]">
                  {isSwap
                    ? `Fixed exchange rate: how many ${swapToCrypto} per 1 ${crypto}`
                    : `Fixed price per 1 ${crypto} (in ${fiat})`}
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={fixedPrice}
                  onChange={(e) => setFixedPrice(e.target.value)}
                  placeholder={isSwap ? spotCrossRate.toFixed(6) : spotInFiat.toFixed(2)}
                  className="h-10 w-full rounded-lg border border-[#DCE2E1] bg-white px-3 font-mono text-sm text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Limits & Available Amount */}
          {isSwap ? (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
                  Min Receive ({swapToCrypto})
                </label>
                <input
                  type="number"
                  required
                  min="0.000001"
                  step="any"
                  value={minSwapAmount}
                  onChange={(e) => setMinSwapAmount(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[#DCE2E1] bg-white px-3.5 font-mono text-sm text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                />
                <span className="mt-1 block font-mono text-[11px] text-[#64706E] dark:text-[#8E9B98]">
                  ≈ {formatCrypto(minCryptoEq, crypto)} (${minSwapUsdEq.toFixed(0)})
                </span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
                  Max Receive ({swapToCrypto})
                </label>
                <input
                  type="number"
                  required
                  min="0.000001"
                  step="any"
                  value={maxSwapAmount}
                  onChange={(e) => setMaxSwapAmount(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[#DCE2E1] bg-white px-3.5 font-mono text-sm text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                />
                <span className="mt-1 block font-mono text-[11px] text-[#64706E] dark:text-[#8E9B98]">
                  ≈ {formatCrypto(maxCryptoEq, crypto)} (${maxSwapUsdEq.toFixed(0)})
                </span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
                  Available ({crypto})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Optional"
                  value={availableCrypto}
                  onChange={(e) => setAvailableCrypto(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[#DCE2E1] bg-white px-3.5 font-mono text-sm text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                />
                {user && (
                  <span className="mt-1 block font-mono text-[11px] text-[#64706E] dark:text-[#8E9B98]">
                    Wallet: ${totalWalletUsd.toFixed(2)} USD ({formatCrypto(currentWalletBalance, crypto)})
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
                  Min Trade ({fiat})
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={minFiat}
                  onChange={(e) => setMinFiat(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[#DCE2E1] bg-white px-3.5 font-mono text-sm text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                />
                <span className="mt-1 block font-mono text-[11px] text-[#64706E] dark:text-[#8E9B98]">
                  ≈ {formatCrypto(minCryptoEq, crypto)}
                </span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
                  Max Trade ({fiat})
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={maxFiat}
                  onChange={(e) => setMaxFiat(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[#DCE2E1] bg-white px-3.5 font-mono text-sm text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                />
                <span className="mt-1 block font-mono text-[11px] text-[#64706E] dark:text-[#8E9B98]">
                  ≈ {formatCrypto(maxCryptoEq, crypto)}
                </span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
                  Available ({crypto})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Optional"
                  value={availableCrypto}
                  onChange={(e) => setAvailableCrypto(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[#DCE2E1] bg-white px-3.5 font-mono text-sm text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                />
                {user && (
                  <span className="mt-1 block font-mono text-[11px] text-[#64706E] dark:text-[#8E9B98]">
                    Wallet: ${totalWalletUsd.toFixed(2)} USD ({formatCrypto(currentWalletBalance, crypto)})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-2">
              Offer Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {OFFER_TAGS.map((tag) => {
                const selected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      selected
                        ? 'border-[#0B3B2E] bg-[#0B3B2E] text-white dark:border-[#7FE85B] dark:bg-[#7FE85B] dark:text-[#082213]'
                        : 'border-[#DCE2E1] bg-white text-[#4B5554] hover:border-[#9CA8A6] dark:border-[#263130] dark:bg-[#0F1515] dark:text-[#A4B0AE]'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Terms */}
          <div>
            <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
              {isSwap ? 'Swap Terms & Escrow Instructions' : 'Trade Terms & Payment Instructions'}
            </label>
            <textarea
              rows={3}
              value={terms}
              onChange={(e) => {
                setTermsTouched(true);
                setTerms(e.target.value);
              }}
              className="w-full rounded-xl border border-[#DCE2E1] bg-white p-3 text-sm text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2.5 pt-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] w-full rounded-xl border border-[#DCE2E1] px-4 py-2.5 text-sm font-medium text-[#5C6665] hover:bg-[#F1F4F3] sm:w-auto sm:border-transparent dark:border-[#263130] dark:text-[#98A4A2] dark:hover:bg-[#1E2927]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[44px] w-full rounded-xl bg-[#7FE85B] px-6 py-2.5 text-sm font-semibold text-[#082213] hover:bg-[#6AD845] disabled:opacity-60 sm:w-auto transition-colors"
            >
              {submitting
                ? 'Publishing...'
                : user
                  ? isSwap
                    ? 'Publish Swap Offer'
                    : 'Publish Offer'
                  : 'Register & Publish Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
