import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Clock,
  Copy,
  Link2,
  Lock,
  MessageSquare,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
  Star,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '../api';
import { CHAIN_OPTIONS, formatCrypto, formatFiat } from '../constants/market';
import type {
  MarketPrices,
  P2POffer,
  TradeOrder,
  TraderProfile,
  UserAccount,
} from '../types';
import { ChainIcon, CoinIcon } from './CoinIcon';
import { getOfferUnitPrice } from './OfferRow';
import { TraderAvatar } from './TraderAvatar';

interface OfferDetailViewProps {
  offerId: string;
  initialOffer?: P2POffer;
  initialTrader?: TraderProfile;
  prices: MarketPrices;
  user: UserAccount | null;
  onlineUsers?: string[];
  onBackToMarketplace: () => void;
  onSelectTrader: (username: string) => void;
  onMessageTrader?: (username: string, offer: P2POffer) => void;
  onRequireAuth: (mode: 'login' | 'register') => void;
  onTradeOpened: (trade: TradeOrder, updatedUser?: UserAccount) => void;
  onOfferUpdated: (offer: P2POffer) => void;
  onOfferDeleted: (offerId: string) => void;
}

export function OfferDetailView({
  offerId,
  initialOffer,
  initialTrader,
  prices,
  user,
  onlineUsers = [],
  onBackToMarketplace,
  onSelectTrader,
  onMessageTrader,
  onRequireAuth,
  onTradeOpened,
  onOfferUpdated,
  onOfferDeleted,
}: OfferDetailViewProps) {
  const [offer, setOffer] = useState<P2POffer | null>(
    initialOffer && initialOffer.id.toLowerCase() === offerId.toLowerCase() ? initialOffer : null
  );
  const [trader, setTrader] = useState<TraderProfile | null>(initialTrader ?? null);
  const [loading, setLoading] = useState(!offer);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [amountInput, setAmountInput] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (initialOffer && initialOffer.id.toLowerCase() === offerId.toLowerCase()) {
      setOffer(initialOffer);
    }
  }, [initialOffer, offerId]);

  useEffect(() => {
    if (initialTrader && (!trader || trader.username.toLowerCase() === initialTrader.username.toLowerCase())) {
      setTrader(initialTrader);
    }
  }, [initialTrader]);

  const fetchOfferDetail = useCallback(
    async (showLoader: boolean) => {
      setNotFound(false);
      setLoadError('');
      if (showLoader) setLoading(true);
      try {
        const res = await api.getOfferById(offerId);
        setOffer(res.offer);
        if (res.trader) setTrader(res.trader);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setOffer(null);
          setNotFound(true);
        } else {
          setLoadError(
            err instanceof Error ? err.message : 'Unable to load offer details from server.'
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [offerId]
  );

  useEffect(() => {
    const hasInitialMatch = Boolean(
      initialOffer && initialOffer.id.toLowerCase() === offerId.toLowerCase()
    );
    void fetchOfferDetail(!hasInitialMatch);
  }, [offerId, fetchOfferDetail]);

  useEffect(() => {
    if (!offer) return;
    if (offer.side === 'swap_crypto' && offer.swapToCrypto) {
      const minS = offer.minSwapAmount ?? offer.minFiat / (prices.usdPrices[offer.swapToCrypto] ?? 1);
      setAmountInput(String(Number(minS.toFixed(6))));
    } else {
      setAmountInput(String(offer.minFiat));
    }
  }, [offer?.id]);

  const handleCopyShareUrl = async () => {
    const shareUrl = `${window.location.origin}/offer/${encodeURIComponent(offer?.id ?? offerId)}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={onBackToMarketplace}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#DCE2E1] bg-white px-3.5 py-2 text-xs font-semibold text-[#1E2726] dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#DCE4E3]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Marketplace</span>
        </button>
        <div className="h-72 animate-pulse rounded-2xl border border-[#E3E7E7] bg-white dark:border-[#202B2A] dark:bg-[#131A1A]" />
      </div>
    );
  }

  if (!offer) {
    if (loadError && !notFound) {
      return (
        <div className="mx-auto max-w-xl rounded-2xl border border-[#E3E7E7] bg-white p-8 text-center dark:border-[#202B2A] dark:bg-[#131A1A]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-display text-xl font-bold text-[#0E1715] dark:text-white">
            Unable to Load Offer Ad
          </h1>
          <p className="mt-2 text-sm text-[#5C6665] dark:text-[#98A4A2]">{loadError}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            <button
              type="button"
              onClick={() => void fetchOfferDetail(true)}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#7FE85B] px-5 py-2.5 text-sm font-semibold text-[#082213] hover:bg-[#6AD845]"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Retry</span>
            </button>
            <button
              type="button"
              onClick={onBackToMarketplace}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#DCE2E1] px-5 py-2.5 text-sm font-semibold text-[#0E1715] hover:bg-[#F5F7F7] dark:border-[#263130] dark:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Marketplace</span>
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-[#E3E7E7] bg-white p-8 text-center dark:border-[#202B2A] dark:bg-[#131A1A]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="mt-4 font-display text-xl font-bold text-[#0E1715] dark:text-white">
          Offer Ad Not Found
        </h1>
        <p className="mt-2 text-sm text-[#5C6665] dark:text-[#98A4A2]">
          No active P2P listing exists at <span className="font-mono">/offer/{offerId}</span>. It may have been removed by the maker.
        </p>
        <button
          type="button"
          onClick={onBackToMarketplace}
          className="mt-5 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#7FE85B] px-5 py-2.5 text-sm font-semibold text-[#082213] hover:bg-[#6AD845]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to P2P Marketplace</span>
        </button>
      </div>
    );
  }

  const isSwap = offer.side === 'swap_crypto' && !!offer.swapToCrypto;
  const swapTargetAsset = offer.swapToCrypto ?? 'BTC';
  const isBuyingCrypto = offer.side === 'sell_crypto';
  const isOwnOffer = Boolean(
    user && offer.traderUsername.toLowerCase() === user.username.toLowerCase()
  );
  const isOnline = Boolean(
    onlineUsers.some((u) => u.toLowerCase() === offer.traderUsername.toLowerCase()) ||
      trader?.lastSeenMinutes === 0
  );

  const unitPrice = getOfferUnitPrice(offer, prices);
  const parsedSend = Number(amountInput) || 0;
  const cryptoAmt = unitPrice > 0 ? parsedSend / unitPrice : 0;

  const minLimit = isSwap
    ? offer.minSwapAmount ?? offer.minFiat / (prices.usdPrices[swapTargetAsset] ?? 1)
    : offer.minFiat;
  const maxLimit = isSwap
    ? offer.maxSwapAmount ?? offer.maxFiat / (prices.usdPrices[swapTargetAsset] ?? 1)
    : offer.maxFiat;

  const spotBase = isSwap
    ? (prices.usdPrices[offer.crypto] ?? 1) / (prices.usdPrices[swapTargetAsset] ?? 1)
    : (prices.usdPrices[offer.crypto] ?? 1) * (prices.fiatRatesFromUsd[offer.fiat] ?? 1);
  const effectiveMarginPct =
    offer.pricingMode === 'fixed' && spotBase > 0
      ? ((unitPrice - spotBase) / spotBase) * 100
      : offer.marginPct;

  const handleCryptoInput = (val: string) => {
    const c = Number(val);
    if (Number.isFinite(c) && unitPrice > 0) {
      const prod = c * unitPrice;
      setAmountInput(
        isSwap
          ? String(Number(prod.toFixed(swapTargetAsset === 'USDT' || swapTargetAsset === 'USDC' ? 2 : 6)))
          : prod.toFixed(2)
      );
    }
  };

  const handleStartTrade = async () => {
    if (isOwnOffer || !offer.active) return;
    if (!user) {
      onRequireAuth('register');
      return;
    }
    if (!acceptedTerms) {
      setError('Please confirm that you accept the offer terms and escrow rules.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const res = await api.openTrade(offer.id, parsedSend, isSwap ? parsedSend : undefined);
      onTradeOpened(res.trade, res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start escrow trade.');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleActive = async () => {
    if (!isOwnOffer) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.updateOffer(offer.id, { active: !offer.active });
      setOffer(res.offer);
      onOfferUpdated(res.offer);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update offer status.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteOffer = async () => {
    if (!isOwnOffer) return;
    setBusy(true);
    setError('');
    try {
      await api.deleteOffer(offer.id);
      onOfferDeleted(offer.id);
      onBackToMarketplace();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete offer.');
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Share Link */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToMarketplace}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#DCE2E1] bg-white px-3.5 py-2 text-xs font-semibold text-[#1E2726] hover:bg-[#F5F7F7] dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#DCE4E3] dark:hover:bg-[#1B2423]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Marketplace</span>
        </button>

        <button
          type="button"
          onClick={handleCopyShareUrl}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#DCE2E1] bg-white px-3.5 py-2 font-mono text-xs font-semibold text-[#0E1715] hover:bg-[#F5F7F7] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white dark:hover:bg-[#1B2423]"
        >
          {copiedLink ? (
            <>
              <Check className="h-3.5 w-3.5 text-[#0D6832] dark:text-[#7FE85B]" />
              <span>Copied /offer/{offer.id}</span>
            </>
          ) : (
            <>
              <Link2 className="h-3.5 w-3.5 text-[#5C6665]" />
              <span>Share Offer Link</span>
              <Copy className="h-3 w-3 opacity-60" />
            </>
          )}
        </button>
      </div>

      {/* Main Offer Ad Header */}
      <div className="rounded-2xl border border-[#E3E7E7] bg-white p-5 sm:p-6 dark:border-[#202B2A] dark:bg-[#131A1A]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F4F7F6] dark:bg-[#0D1313]">
              <CoinIcon symbol={offer.crypto} size={32} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-[#EEF6F2] px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#0B3B2E] dark:bg-[#152B20] dark:text-[#7FE85B]">
                  {isSwap
                    ? 'P2P Crypto Swap'
                    : isBuyingCrypto
                      ? 'Buy Crypto Ad'
                      : 'Sell Crypto Ad'}
                </span>
                <span className="font-mono text-xs text-[#64706E] dark:text-[#8E9B98]">
                  ID: {offer.id}
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                    offer.active
                      ? 'bg-[#EAFBF0] text-[#0D6832] dark:bg-[#133322] dark:text-[#7FE85B]'
                      : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                  }`}
                >
                  {offer.active ? 'Live Active' : 'Paused'}
                </span>
              </div>

              <h1 className="mt-2 font-display text-2xl font-bold text-[#0E1715] sm:text-3xl dark:text-white">
                {isSwap
                  ? `Swap ${swapTargetAsset} for ${offer.crypto}`
                  : isBuyingCrypto
                    ? `Buy ${offer.crypto} with ${offer.paymentMethod}`
                    : `Sell ${offer.crypto} for ${offer.paymentMethod}`}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[#5C6665] dark:text-[#98A4A2]">
                <span>{isSwap ? offer.paymentMethod : `${offer.country} · ${offer.fiat}`}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{offer.paymentWindowMinutes} min escrow window</span>
                </span>
                {offer.cryptoChain && CHAIN_OPTIONS[offer.cryptoChain] && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 rounded-md border border-[#DCE2E1] bg-[#F8FAFA] px-2 py-0.5 font-mono text-[11px] font-medium text-[#394241] dark:border-[#263130] dark:bg-[#172120] dark:text-[#C5D1CF]">
                      <ChainIcon chain={offer.cryptoChain} size={12} />
                      <span>
                        {offer.crypto} ({CHAIN_OPTIONS[offer.cryptoChain].standard})
                      </span>
                    </span>
                  </>
                )}
                {isSwap && offer.swapToChain && CHAIN_OPTIONS[offer.swapToChain] && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-[#DCE2E1] bg-[#F8FAFA] px-2 py-0.5 font-mono text-[11px] font-medium text-[#394241] dark:border-[#263130] dark:bg-[#172120] dark:text-[#C5D1CF]">
                    <ChainIcon chain={offer.swapToChain} size={12} />
                    <span>
                      {swapTargetAsset} ({CHAIN_OPTIONS[offer.swapToChain].standard})
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Rate Highlight */}
          <div className="rounded-xl border border-[#ECEFEF] bg-[#F8FAFA] px-4 py-3 sm:text-right dark:border-[#202B2A] dark:bg-[#0D1313]">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[#5C6665] dark:text-[#8E9B98]">
              {isSwap ? 'Exchange Rate' : `Price per 1 ${offer.crypto}`}
            </div>
            <div className="mt-0.5 font-mono text-xl font-bold tabular-nums text-[#0E1715] dark:text-white">
              {isSwap
                ? `1 ${offer.crypto} = ${unitPrice.toFixed(swapTargetAsset === 'USDT' || swapTargetAsset === 'USDC' ? 2 : 6)} ${swapTargetAsset}`
                : formatFiat(unitPrice, offer.fiat)}
            </div>
            <div className="mt-0.5 font-mono text-xs text-[#0D6832] dark:text-[#7FE85B]">
              {effectiveMarginPct >= 0
                ? `+${effectiveMarginPct.toFixed(1)}% vs market`
                : `${effectiveMarginPct.toFixed(1)}% vs market`}
            </div>
          </div>
        </div>
      </div>

      {/* Main Split Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Trader Card + Specs + Terms */}
        <div className="space-y-5 lg:col-span-7">
          {/* Trader Card */}
          <div className="rounded-2xl border border-[#E3E7E7] bg-white p-5 dark:border-[#202B2A] dark:bg-[#131A1A]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => onSelectTrader(offer.traderUsername)}
                  className="shrink-0 rounded-xl focus:outline-none"
                >
                  <TraderAvatar
                    username={offer.traderUsername}
                    avatarUrl={trader?.avatarUrl}
                    accentTheme={trader?.accentTheme}
                    size={48}
                    rounded="xl"
                  />
                </button>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectTrader(offer.traderUsername)}
                      className="font-display text-lg font-bold text-[#0E1715] hover:text-[#0B3B2E] hover:underline dark:text-white dark:hover:text-[#7FE85B]"
                    >
                      /{offer.traderUsername}
                    </button>
                    {trader?.verified && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#EEF6F2] px-2 py-0.5 text-[11px] font-semibold text-[#0B3B2E] dark:bg-[#152B20] dark:text-[#7FE85B]">
                        <UserCheck className="h-3 w-3" />
                        <span>Verified</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#5C6665] dark:text-[#98A4A2]">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isOnline ? 'bg-[#16A34A] dark:bg-[#7FE85B]' : 'bg-[#9CA8A6]'
                        }`}
                      />
                      <span>
                        {isOnline
                          ? 'Online now'
                          : trader
                            ? `Seen ${trader.lastSeenMinutes}m ago`
                            : 'Active'}
                      </span>
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#4F5A58] dark:text-[#98A4A2] tabular-nums">
                    <span className="inline-flex items-center gap-1 font-semibold text-[#0E1715] dark:text-white">
                      <Star className="h-3.5 w-3.5 fill-[#16A34A] text-[#16A34A] dark:fill-[#7FE85B] dark:text-[#7FE85B]" />
                      {trader?.ratingPct ?? 100}% Trust
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{(trader?.tradesCount ?? 0).toLocaleString('en-US')} Completed Trades</span>
                    <span aria-hidden="true">·</span>
                    <span>~{trader?.avgReleaseMinutes ?? 5}m Avg Release</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!isOwnOffer && onMessageTrader && (
                  <button
                    type="button"
                    onClick={() => onMessageTrader(offer.traderUsername, offer)}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#0B3B2E] bg-[#EEF6F2] px-3.5 py-2 text-xs font-semibold text-[#0B3B2E] hover:bg-[#DFF0E6] dark:border-[#7FE85B]/50 dark:bg-[#152B20] dark:text-[#7FE85B] dark:hover:bg-[#1B3729]"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Message @{offer.traderUsername}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onSelectTrader(offer.traderUsername)}
                  className="min-h-[38px] rounded-xl border border-[#DCE2E1] bg-white px-4 py-2 text-xs font-semibold text-[#0E1715] hover:bg-[#F5F7F7] dark:border-[#263130] dark:bg-[#0F1515] dark:text-white dark:hover:bg-[#1A2423]"
                >
                  View Trader Profile
                </button>
              </div>
            </div>
          </div>

          {/* Limits & Payment Details */}
          <div className="rounded-2xl border border-[#E3E7E7] bg-white p-5 dark:border-[#202B2A] dark:bg-[#131A1A]">
            <h2 className="font-display text-base font-bold text-[#0E1715] dark:text-white">
              Offer Specifications &amp; Limits
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#ECEFEF] bg-[#F8FAFA] p-3 dark:border-[#202B2A] dark:bg-[#0D1313]">
                <div className="text-[11px] text-[#5C6665] dark:text-[#8E9B98]">Payment Method</div>
                <div className="mt-0.5 text-sm font-bold text-[#0E1715] dark:text-white">
                  {offer.paymentMethod}
                </div>
                <div className="text-[11px] text-[#64706E] dark:text-[#8E9B98]">
                  {offer.paymentCategory}
                </div>
              </div>
              <div className="rounded-xl border border-[#ECEFEF] bg-[#F8FAFA] p-3 dark:border-[#202B2A] dark:bg-[#0D1313]">
                <div className="text-[11px] text-[#5C6665] dark:text-[#8E9B98]">Trade Limits</div>
                <div className="mt-0.5 font-mono text-sm font-bold text-[#0E1715] dark:text-white">
                  {isSwap
                    ? `${Number(minLimit.toFixed(4))} – ${Number(maxLimit.toFixed(4))} ${swapTargetAsset}`
                    : `${formatFiat(offer.minFiat, offer.fiat)} – ${formatFiat(offer.maxFiat, offer.fiat)}`}
                </div>
                <div className="text-[11px] text-[#64706E] dark:text-[#8E9B98]">Per escrow trade</div>
              </div>
              <div className="col-span-2 rounded-xl border border-[#ECEFEF] bg-[#F8FAFA] p-3 sm:col-span-1 dark:border-[#202B2A] dark:bg-[#0D1313]">
                <div className="text-[11px] text-[#5C6665] dark:text-[#8E9B98]">Escrow Window</div>
                <div className="mt-0.5 font-mono text-sm font-bold text-[#0E1715] dark:text-white">
                  {offer.paymentWindowMinutes} minutes
                </div>
                <div className="text-[11px] text-[#64706E] dark:text-[#8E9B98]">
                  {offer.availableCrypto
                    ? `Max Avail: ${formatCrypto(offer.availableCrypto, offer.crypto)}`
                    : 'Zero KYC Escrow'}
                </div>
              </div>
            </div>

            {offer.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {offer.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-[#DCE2E1] bg-[#F8FAFA] px-2.5 py-1 text-xs font-medium text-[#394241] dark:border-[#263130] dark:bg-[#0F1515] dark:text-[#C5D1CF]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 rounded-xl border border-[#ECEFEF] bg-[#F8FAFA] p-4 dark:border-[#202B2A] dark:bg-[#0D1313]">
              <div className="text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
                Maker Terms &amp; Instructions
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-[#1E2726] dark:text-[#E5ECEB]">
                {offer.terms}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Trade Box or Maker Controls */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-[#E3E7E7] bg-white p-5 sm:p-6 dark:border-[#202B2A] dark:bg-[#131A1A]">
            {isOwnOffer ? (
              <div className="space-y-4">
                <h2 className="font-display text-lg font-bold text-[#0E1715] dark:text-white">
                  Manage Your Offer Ad
                </h2>
                <p className="text-xs leading-relaxed text-[#5C6665] dark:text-[#98A4A2]">
                  You created this listing. Share <span className="font-mono">/offer/{offer.id}</span> directly with counterparties so they can open an escrow trade with you.
                </p>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                    {error}
                  </div>
                )}

                <div className="space-y-2.5 pt-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleCopyShareUrl}
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#7FE85B] px-5 py-2.5 text-sm font-semibold text-[#082213] hover:bg-[#6AD845]"
                  >
                    {copiedLink ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                    <span>{copiedLink ? 'Offer Link Copied' : 'Copy Shareable Offer Link'}</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleToggleActive}
                      className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-[#DCE2E1] bg-white px-4 py-2 text-xs font-semibold text-[#0E1715] hover:bg-[#F5F7F7] disabled:opacity-50 dark:border-[#263130] dark:bg-[#0F1515] dark:text-white dark:hover:bg-[#1A2423]"
                    >
                      {offer.active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      <span>{offer.active ? 'Pause Ad' : 'Resume Ad'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleDeleteOffer}
                      className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete Ad</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-[#0E1715] dark:text-white">
                    {isSwap
                      ? `Swap ${swapTargetAsset} → ${offer.crypto}`
                      : isBuyingCrypto
                        ? `Buy ${offer.crypto}`
                        : `Sell ${offer.crypto}`}
                  </h2>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[#0D6832] dark:text-[#7FE85B]">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Escrow Protected</span>
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
                    {isSwap
                      ? `I will send (${swapTargetAsset})`
                      : isBuyingCrypto
                        ? `I will pay (${offer.fiat})`
                        : `I will receive (${offer.fiat})`}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min={minLimit}
                      max={maxLimit}
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      className="h-12 w-full rounded-xl border border-[#DCE2E1] bg-white pl-4 pr-20 font-mono text-base font-bold text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                    />
                    <span className="absolute right-3.5 top-3.5 font-mono text-xs font-bold text-[#5C6665] dark:text-[#8E9B98]">
                      {isSwap ? swapTargetAsset : offer.fiat}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#64706E] dark:text-[#8E9B98]">
                    <span>
                      Limits:{' '}
                      {isSwap
                        ? `${Number(minLimit.toFixed(4))} – ${Number(maxLimit.toFixed(4))} ${swapTargetAsset}`
                        : `${formatFiat(offer.minFiat, offer.fiat)} – ${formatFiat(offer.maxFiat, offer.fiat)}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAmountInput(String(Number(maxLimit.toFixed(6))))}
                      className="font-semibold text-[#0B3B2E] hover:underline dark:text-[#7FE85B]"
                    >
                      Max
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
                    {isSwap
                      ? `I will receive (${offer.crypto})`
                      : isBuyingCrypto
                        ? `I will receive (${offer.crypto})`
                        : `I will sell (${offer.crypto})`}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={cryptoAmt > 0 ? Number(cryptoAmt.toFixed(6)) : ''}
                      onChange={(e) => handleCryptoInput(e.target.value)}
                      className="h-12 w-full rounded-xl border border-[#DCE2E1] bg-[#F8FAFA] pl-4 pr-20 font-mono text-base font-bold text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#0F1515] dark:text-white"
                    />
                    <span className="absolute right-3.5 top-3.5 font-mono text-xs font-bold text-[#5C6665] dark:text-[#8E9B98]">
                      {offer.crypto}
                    </span>
                  </div>
                </div>

                <label className="flex items-start gap-2.5 rounded-xl border border-[#ECEFEF] bg-[#F8FAFA] p-3 text-xs text-[#394241] cursor-pointer dark:border-[#202B2A] dark:bg-[#0D1313] dark:text-[#C5D1CF]">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded accent-[#0B3B2E]"
                  />
                  <span>
                    I have read and accept {offer.traderUsername}&rsquo;s trade terms and OOSAB multi-sig escrow rules.
                  </span>
                </label>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                    {error}
                  </div>
                )}

                {!offer.active ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-xs font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                    This offer is currently paused by the maker.
                  </div>
                ) : !user ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => onRequireAuth('register')}
                      className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#7FE85B] px-5 py-2.5 text-sm font-semibold text-[#082213] hover:bg-[#6AD845]"
                    >
                      <Lock className="h-4 w-4" />
                      <span>Register Free (No KYC) to Trade</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequireAuth('login')}
                      className="min-h-[40px] w-full rounded-xl border border-[#DCE2E1] px-4 py-2 text-xs font-semibold text-[#0E1715] hover:bg-[#F5F7F7] dark:border-[#263130] dark:text-white dark:hover:bg-[#1A2423]"
                    >
                      Already have an account? Sign in
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleStartTrade}
                      className={`min-h-[46px] w-full rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
                        isBuyingCrypto || isSwap
                          ? 'bg-[#7FE85B] text-[#082213] hover:bg-[#6AD845]'
                          : 'bg-[#0B3B2E] text-white hover:bg-[#082B21] dark:bg-[#7FE85B] dark:text-[#082213] dark:hover:bg-[#6AD845]'
                      }`}
                    >
                      {busy
                        ? 'Opening Escrow Room...'
                        : isSwap
                          ? `Open Escrow Swap (${cryptoAmt.toFixed(5)} ${offer.crypto})`
                          : isBuyingCrypto
                            ? `Buy ${offer.crypto} Now (${cryptoAmt.toFixed(5)} ${offer.crypto})`
                            : `Sell ${offer.crypto} Now (${cryptoAmt.toFixed(5)} ${offer.crypto})`}
                    </button>
                    {onMessageTrader && (
                      <button
                        type="button"
                        onClick={() => onMessageTrader(offer.traderUsername, offer)}
                        className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-[#DCE2E1] bg-white px-4 py-2 text-xs font-semibold text-[#0E1715] hover:bg-[#F5F7F7] dark:border-[#263130] dark:bg-[#0F1515] dark:text-white dark:hover:bg-[#1A2423]"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-[#0B3B2E] dark:text-[#7FE85B]" />
                        <span>Write to @{offer.traderUsername} First</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
