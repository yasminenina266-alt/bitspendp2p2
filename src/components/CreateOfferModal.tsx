import {
  ArrowLeftRight,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Link2,
  X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { api } from '../api';
import {
  ASSET_CHAINS,
  CHAIN_OPTIONS,
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
  ChainId,
  CryptoAsset,
  FiatCurrency,
  MarketPrices,
  OfferSide,
  OfferTag,
  P2POffer,
  UserAccount,
} from '../types';
import { notifyTelegramEvent } from '../utils/telegramNotify';
import { ChainIcon, CoinIcon } from './CoinIcon';
import { PaymentMethodPicker } from './PaymentMethodPicker';

interface CreateOfferModalProps {
  prices: MarketPrices;
  user: UserAccount | null;
  initialSide?: OfferSide;
  onRequireAuth: () => void;
  onOpenWallet: (asset?: CryptoAsset, requiredAmount?: number) => void;
  onClose: () => void;
  onCreated: (offer: P2POffer) => void;
  onOpenOffer?: (offer: P2POffer) => void;
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
  onOpenOffer,
}: CreateOfferModalProps) {
  const [side, setSide] = useState<OfferSide>(initialSide ?? 'sell_crypto');
  const [crypto, setCrypto] = useState<CryptoAsset>('XMR');
  const [cryptoChain, setCryptoChain] = useState<ChainId>('ETH');
  const [swapToCrypto, setSwapToCrypto] = useState<CryptoAsset>('BTC');
  const [swapToChain, setSwapToChain] = useState<ChainId>('ETH');
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
  const [createdOffer, setCreatedOffer] = useState<P2POffer | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const isSwap = side === 'swap_crypto';
  const requiresCryptoFunding = side === 'sell_crypto' || side === 'swap_crypto';

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
  const parsedAvailCrypto = Number(availableCrypto) > 0 ? Number(availableCrypto) : 0;

  const syncSwapLimitsForAsset = (targetAsset: CryptoAsset) => {
    const pUsd = prices.usdPrices[targetAsset] ?? 1;
    setMinSwapAmount(formatSwapLimitDefault(120, pUsd, targetAsset));
    setMaxSwapAmount(formatSwapLimitDefault(6500, pUsd, targetAsset));
  };

  const handleSideChange = (nextSide: OfferSide) => {
    setSide(nextSide);
    setError('');
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

  const normalizeChainForAsset = (asset: CryptoAsset, currentChain: ChainId): ChainId => {
    const chains = ASSET_CHAINS[asset];
    if (!chains || chains.length === 0) return 'ETH';
    return chains.some((c) => c.id === currentChain) ? currentChain : chains[0].id;
  };

  const handleOfferCryptoChange = (nextCrypto: CryptoAsset) => {
    setCrypto(nextCrypto);
    setCryptoChain((prev) => normalizeChainForAsset(nextCrypto, prev));
    if (nextCrypto === swapToCrypto) {
      const alt = CRYPTO_ASSETS.find((c) => c.symbol !== nextCrypto)?.symbol ?? 'BTC';
      setSwapToCrypto(alt);
      setSwapToChain((prev) => normalizeChainForAsset(alt, prev));
      if (isSwap) syncSwapLimitsForAsset(alt);
    }
  };

  const handleSwapToCryptoChange = (nextWant: CryptoAsset) => {
    if (nextWant === crypto) {
      const alt = CRYPTO_ASSETS.find((c) => c.symbol !== nextWant)?.symbol ?? 'XMR';
      setCrypto(alt);
      setCryptoChain((prev) => normalizeChainForAsset(alt, prev));
    }
    setSwapToCrypto(nextWant);
    setSwapToChain((prev) => normalizeChainForAsset(nextWant, prev));
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
    const prevOfferChain = cryptoChain;
    const prevWantChain = swapToChain;
    setCrypto(prevWant);
    setSwapToCrypto(prevOffer);
    setCryptoChain(normalizeChainForAsset(prevWant, prevWantChain));
    setSwapToChain(normalizeChainForAsset(prevOffer, prevOfferChain));
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
    if (requiresCryptoFunding) {
      if (parsedAvailCrypto > 0 && parsedAvailCrypto < minCryptoEq * 0.999) {
        setError(
          `Available ${crypto} (${parsedAvailCrypto}) must be at least ${formatCrypto(minCryptoEq, crypto)} to cover your minimum trade limit.`
        );
        return;
      }
    }

    setError('');
    setSubmitting(true);
    try {
      if (isSwap) {
        const activeOfferChain = ASSET_CHAINS[crypto]
          ? normalizeChainForAsset(crypto, cryptoChain)
          : undefined;
        const activeSwapChain = ASSET_CHAINS[swapToCrypto]
          ? normalizeChainForAsset(swapToCrypto, swapToChain)
          : undefined;
        const res = await api.createOffer({
          side: 'swap_crypto',
          crypto,
          cryptoChain: activeOfferChain,
          swapToCrypto,
          swapToChain: activeSwapChain,
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
        void notifyTelegramEvent({
          type: 'offer_created',
          sender: `@${activeUser.username}`,
          reference: res.offer.id,
          title: 'Crypto Swap Offer',
          fields: [
            {
              name: 'Pair',
              value: `${swapToCrypto}${activeSwapChain ? ` (${CHAIN_OPTIONS[activeSwapChain].standard})` : ''} → ${crypto}${activeOfferChain ? ` (${CHAIN_OPTIONS[activeOfferChain].standard})` : ''}`,
            },
            { name: 'Margin', value: `${marginPct}%` },
          ],
        });
        onCreated(res.offer);
        setCreatedOffer(res.offer);
        return;
      }

      const pmDef = PAYMENT_METHODS.find((p) => p.name === paymentMethod);
      const activeOfferChain = ASSET_CHAINS[crypto]
        ? normalizeChainForAsset(crypto, cryptoChain)
        : undefined;
      const res = await api.createOffer({
        side,
        crypto,
        cryptoChain: activeOfferChain,
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
      void notifyTelegramEvent({
        type: 'offer_created',
        sender: `@${activeUser.username}`,
        reference: res.offer.id,
        title: side === 'sell_crypto' ? 'Sell Crypto Offer' : 'Buy Crypto Offer',
        fields: [
          { name: 'Side', value: side === 'sell_crypto' ? 'Sell Crypto' : 'Buy Crypto' },
          {
            name: 'Market',
            value: `${crypto}${activeOfferChain ? ` (${CHAIN_OPTIONS[activeOfferChain].standard})` : ''} / ${fiat} (${paymentMethod})`,
          },
        ],
      });
      onCreated(res.offer);
      setCreatedOffer(res.offer);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create offer';
      setError(msg);
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

  if (createdOffer) {
    const shareUrl = `${window.location.origin}/offer/${createdOffer.id}`;
    const handleCopyOfferUrl = async () => {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } catch {
        // ignore
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-[2px]">
        <div className="w-full max-w-md rounded-2xl border border-[#DCE2E1] bg-white p-5 shadow-xl sm:p-6 dark:border-[#263130] dark:bg-[#131A1A]">
          <div className="flex items-start justify-between gap-4 border-b border-[#ECEFEF] pb-4 dark:border-[#202B2A]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAFBF0] text-[#0D6832] dark:bg-[#133322] dark:text-[#7FE85B]">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-[#0E1715] dark:text-white">
                  Offer Published Live
                </h2>
                <p className="text-xs text-[#5C6665] dark:text-[#98A4A2]">
                  {createdOffer.id} · Share your custom listing link
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
            <div className="rounded-xl border border-[#E3E7E7] bg-[#F8FAFA] p-3.5 dark:border-[#202B2A] dark:bg-[#0F1515]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
                <Link2 className="h-3.5 w-3.5 text-[#0B3B2E] dark:text-[#7FE85B]" />
                <span>Custom Shareable Offer Link</span>
              </div>
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-[#DCE2E1] bg-white px-3 py-2 dark:border-[#263130] dark:bg-[#131A1A]">
                <span className="flex-1 truncate font-mono text-xs text-[#0E1715] dark:text-white">
                  {shareUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyOfferUrl}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#EEF6F2] px-2.5 py-1 text-xs font-semibold text-[#0B3B2E] hover:bg-[#DFF0E6] dark:bg-[#162C22] dark:text-[#7FE85B]"
                >
                  {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-end">
              {onOpenOffer && (
                <button
                  type="button"
                  onClick={() => {
                    const o = createdOffer;
                    onClose();
                    onOpenOffer(o);
                  }}
                  className="inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#DCE2E1] px-4 py-2 text-xs font-semibold text-[#0E1715] hover:bg-[#F5F7F7] sm:w-auto dark:border-[#263130] dark:text-white dark:hover:bg-[#1A2423]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open Offer Link</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="min-h-[42px] w-full rounded-xl bg-[#7FE85B] px-5 py-2 text-xs font-semibold text-[#082213] hover:bg-[#6AD845] sm:w-auto"
              >
                Done
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
            {side === 'buy_crypto' && (
              <p className="mt-2.5 rounded-xl border border-[#C6E8CF] bg-[#F2FAF4] px-3.5 py-2 text-xs font-medium text-[#0D6832] dark:border-[#1E3B2B] dark:bg-[#112219] dark:text-[#7FE85B]">
                No wallet balance required to buy crypto with fiat (e.g. Zelle, Bank Transfer, or Cash). Listed on the Sell tab so crypto sellers can sell to you.
              </p>
            )}
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

              {ASSET_CHAINS[crypto] && (
                <div>
                  <label className="mb-2 block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
                    Select {crypto} Network / Chain (You Offer)
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {ASSET_CHAINS[crypto]!.map((ch, idx) => {
                      const activeId = normalizeChainForAsset(crypto, cryptoChain);
                      const isSelected = ch.id === activeId;
                      const isLastOddMobile =
                        ASSET_CHAINS[crypto]!.length % 2 === 1 && idx === ASSET_CHAINS[crypto]!.length - 1;
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => setCryptoChain(ch.id)}
                          className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs transition-colors ${
                            isLastOddMobile ? 'col-span-2 sm:col-span-1' : ''
                          } ${
                            isSelected
                              ? 'border-[#0B3B2E] bg-[#EEF6F2] text-[#0E1715] font-bold dark:border-[#7FE85B] dark:bg-[#152B20] dark:text-white'
                              : 'border-[#DCE2E1] bg-white text-[#4B5554] hover:border-[#9CA8A6] dark:border-[#263130] dark:bg-[#0D1313] dark:text-[#98A4A2]'
                          }`}
                        >
                          <ChainIcon chain={ch.id} size={18} />
                          <div className="min-w-0">
                            <div className="truncate leading-tight">{ch.name}</div>
                            <div className="font-mono text-[10px] opacity-75">{ch.standard}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {ASSET_CHAINS[swapToCrypto] && (
                <div>
                  <label className="mb-2 block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
                    Select {swapToCrypto} Network / Chain (You Receive)
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {ASSET_CHAINS[swapToCrypto]!.map((ch, idx) => {
                      const activeId = normalizeChainForAsset(swapToCrypto, swapToChain);
                      const isSelected = ch.id === activeId;
                      const isLastOddMobile =
                        ASSET_CHAINS[swapToCrypto]!.length % 2 === 1 &&
                        idx === ASSET_CHAINS[swapToCrypto]!.length - 1;
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => setSwapToChain(ch.id)}
                          className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs transition-colors ${
                            isLastOddMobile ? 'col-span-2 sm:col-span-1' : ''
                          } ${
                            isSelected
                              ? 'border-[#0B3B2E] bg-[#EEF6F2] text-[#0E1715] font-bold dark:border-[#7FE85B] dark:bg-[#152B20] dark:text-white'
                              : 'border-[#DCE2E1] bg-white text-[#4B5554] hover:border-[#9CA8A6] dark:border-[#263130] dark:bg-[#0D1313] dark:text-[#98A4A2]'
                          }`}
                        >
                          <ChainIcon chain={ch.id} size={18} />
                          <div className="min-w-0">
                            <div className="truncate leading-tight">{ch.name}</div>
                            <div className="font-mono text-[10px] opacity-75">{ch.standard}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
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

              {ASSET_CHAINS[crypto] && (
                <div>
                  <label className="mb-2 block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
                    Select {crypto} Network / Chain
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {ASSET_CHAINS[crypto]!.map((ch, idx) => {
                      const activeId = normalizeChainForAsset(crypto, cryptoChain);
                      const isSelected = ch.id === activeId;
                      const isLastOddMobile =
                        ASSET_CHAINS[crypto]!.length % 2 === 1 && idx === ASSET_CHAINS[crypto]!.length - 1;
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => setCryptoChain(ch.id)}
                          className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs transition-colors ${
                            isLastOddMobile ? 'col-span-2 sm:col-span-1' : ''
                          } ${
                            isSelected
                              ? 'border-[#0B3B2E] bg-[#EEF6F2] text-[#0E1715] font-bold dark:border-[#7FE85B] dark:bg-[#152B20] dark:text-white'
                              : 'border-[#DCE2E1] bg-white text-[#4B5554] hover:border-[#9CA8A6] dark:border-[#263130] dark:bg-[#0D1313] dark:text-[#98A4A2]'
                          }`}
                        >
                          <ChainIcon chain={ch.id} size={18} />
                          <div className="min-w-0">
                            <div className="truncate leading-tight">{ch.name}</div>
                            <div className="font-mono text-[10px] opacity-75">{ch.standard}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Payment Method & Window */}
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
                    Payment Method ({PAYMENT_METHODS.length}+ options)
                  </label>
                  <PaymentMethodPicker
                    value={paymentMethod}
                    onChange={setPaymentMethod}
                  />
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
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-1 font-mono text-[11px] text-[#64706E] dark:text-[#8E9B98]">
                    <span>
                      {crypto} Bal: {formatCrypto(currentWalletBalance, crypto)}
                    </span>
                    {currentWalletBalance > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setAvailableCrypto(String(Number(currentWalletBalance.toFixed(6))))
                        }
                        className="font-sans font-semibold text-[#0B3B2E] hover:underline dark:text-[#7FE85B]"
                      >
                        Use Max
                      </button>
                    )}
                  </div>
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
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-1 font-mono text-[11px] text-[#64706E] dark:text-[#8E9B98]">
                    <span>
                      {crypto} Bal: {formatCrypto(currentWalletBalance, crypto)}
                    </span>
                    {requiresCryptoFunding && currentWalletBalance > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const maxFiatAtBal = Math.floor(currentWalletBalance * computedUnitPrice);
                          setAvailableCrypto(String(Number(currentWalletBalance.toFixed(6))));
                          if (maxFiatAtBal > 0 && Number(maxFiat) > maxFiatAtBal) {
                            setMaxFiat(String(maxFiatAtBal));
                            if (Number(minFiat) > maxFiatAtBal) {
                              setMinFiat(String(Math.max(1, Math.min(25, maxFiatAtBal))));
                            }
                          }
                        }}
                        className="font-sans font-semibold text-[#0B3B2E] hover:underline dark:text-[#7FE85B]"
                      >
                        Use Max
                      </button>
                    )}
                  </div>
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
