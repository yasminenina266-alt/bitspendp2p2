import { ChevronDown, ChevronUp, Star } from 'lucide-react';
import { useState } from 'react';
import { CHAIN_OPTIONS, formatCrypto, formatFiat } from '../constants/market';
import type { MarketPrices, P2POffer, TraderProfile } from '../types';
import { ChainIcon, CoinIcon } from './CoinIcon';

interface OfferRowProps {
  offer: P2POffer;
  trader?: TraderProfile;
  prices: MarketPrices;
  enteredAmount: number | null;
  currentUsername?: string;
  onSelectOffer: (offer: P2POffer) => void;
  onSelectTrader: (username: string) => void;
}

export function getOfferUnitPrice(offer: P2POffer, prices: MarketPrices): number {
  if (offer.pricingMode === 'fixed' && offer.fixedPrice && offer.fixedPrice > 0) {
    return offer.fixedPrice;
  }
  if (offer.side === 'swap_crypto' && offer.swapToCrypto) {
    const offerUsd = prices.usdPrices[offer.crypto] ?? 1;
    const wantUsd = prices.usdPrices[offer.swapToCrypto] ?? 1;
    const crossRate = wantUsd > 0 ? offerUsd / wantUsd : 1;
    return crossRate * (1 + offer.marginPct / 100);
  }
  const usdSpot = prices.usdPrices[offer.crypto] ?? 1;
  const fiatRate = prices.fiatRatesFromUsd[offer.fiat] ?? 1;
  return usdSpot * fiatRate * (1 + offer.marginPct / 100);
}

export function OfferRow({
  offer,
  trader,
  prices,
  enteredAmount,
  currentUsername,
  onSelectOffer,
  onSelectTrader,
}: OfferRowProps) {
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const isOwnOffer = Boolean(currentUsername && offer.traderUsername === currentUsername);

  const isSwap = offer.side === 'swap_crypto' && !!offer.swapToCrypto;
  const unitPrice = getOfferUnitPrice(offer, prices);

  const spotBase =
    isSwap && offer.swapToCrypto
      ? (prices.usdPrices[offer.crypto] ?? 1) / (prices.usdPrices[offer.swapToCrypto] ?? 1)
      : (prices.usdPrices[offer.crypto] ?? 1) * (prices.fiatRatesFromUsd[offer.fiat] ?? 1);

  const effectiveMarginPct =
    offer.pricingMode === 'fixed' && spotBase > 0
      ? ((unitPrice - spotBase) / spotBase) * 100
      : offer.marginPct;

  const isBuyingCrypto = offer.side === 'sell_crypto';
  const marginLabel =
    effectiveMarginPct >= 0
      ? `+${effectiveMarginPct.toFixed(effectiveMarginPct % 1 === 0 ? 0 : 1)}%`
      : `${effectiveMarginPct.toFixed(effectiveMarginPct % 1 === 0 ? 0 : 1)}%`;

  const marginIsFavorable =
    isBuyingCrypto || isSwap ? effectiveMarginPct <= 0 : effectiveMarginPct >= 0;

  // Compute sample amounts for either Swap or Fiat offer
  const swapTargetAsset = offer.swapToCrypto ?? 'BTC';
  const minSwap =
    offer.minSwapAmount ?? offer.minFiat / (prices.usdPrices[swapTargetAsset] ?? 1);
  const maxSwap =
    offer.maxSwapAmount ?? offer.maxFiat / (prices.usdPrices[swapTargetAsset] ?? 1);

  const sampleInput = isSwap
    ? enteredAmount && enteredAmount >= minSwap && enteredAmount <= maxSwap
      ? enteredAmount
      : minSwap
    : enteredAmount && enteredAmount >= offer.minFiat && enteredAmount <= offer.maxFiat
      ? enteredAmount
      : offer.minFiat;

  const cryptoReceived = unitPrice > 0 ? sampleInput / unitPrice : 0;
  const marketValueReceived = isSwap
    ? cryptoReceived * (prices.usdPrices[offer.crypto] ?? 1)
    : cryptoReceived * spotBase;
  const swapSendUsdValue = sampleInput * (prices.usdPrices[swapTargetAsset] ?? 1);

  const actionButtonLabel = isOwnOffer
    ? 'View Live Ad'
    : isSwap
      ? `Swap ${offer.crypto}`
      : isBuyingCrypto
        ? `Buy ${offer.crypto}`
        : `Sell ${offer.crypto}`;

  const actionButtonClasses = isOwnOffer
    ? 'border border-[#0B3B2E] bg-[#EEF6F2] text-[#0B3B2E] hover:bg-[#DFF0E6] dark:border-[#7FE85B] dark:bg-[#152B20] dark:text-[#7FE85B] dark:hover:bg-[#1C382A]'
    : offer.active
      ? isBuyingCrypto || isSwap
        ? 'bg-[#7FE85B] text-[#082213] hover:bg-[#6AD845]'
        : 'bg-[#0B3B2E] text-white hover:bg-[#082B21] dark:bg-[#E8EFEA] dark:text-[#082213] dark:hover:bg-white'
      : 'cursor-not-allowed bg-[#E5E9E8] text-[#8A9593] dark:bg-[#1D2625] dark:text-[#5F6C6A]';

  return (
    <div
      className={`group rounded-2xl border bg-white p-4 transition-colors sm:px-5 sm:py-5 dark:bg-[#131A1A] ${
        offer.active
          ? 'border-[#E3E7E7] hover:border-[#B6C4C1] dark:border-[#202B2A] dark:hover:border-[#344643]'
          : 'border-[#E9ECEC] opacity-70 dark:border-[#1B2423]'
      }`}
    >
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.15fr_1.15fr_0.9fr_1.35fr] lg:items-center lg:gap-5">
        {/* Column 1: Trader Profile & Conditions */}
        <div className="min-w-0 space-y-1.5 border-b border-[#F0F3F3] pb-3 lg:border-b-0 lg:pb-0 dark:border-[#1E2726]">
          <div className="flex items-center justify-between gap-2 lg:flex-wrap lg:justify-start">
            <button
              type="button"
              onClick={() => onSelectTrader(offer.traderUsername)}
              className="truncate text-left text-base font-bold text-[#0E1715] hover:text-[#0B3B2E] hover:underline dark:text-[#F1F5F4] dark:hover:text-[#7FE85B]"
            >
              {offer.traderUsername}
            </button>
            <span className="shrink-0 text-xs text-[#64706E] dark:text-[#8E9B98]">
              {trader?.lastSeenMinutes === 0
                ? 'Active now'
                : trader
                  ? `Seen ${trader.lastSeenMinutes}m ago`
                  : 'Active'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#4F5A58] dark:text-[#98A4A2] tabular-nums">
            <Star className="h-3.5 w-3.5 fill-[#16A34A] text-[#16A34A] dark:fill-[#7FE85B] dark:text-[#7FE85B]" />
            <span className="font-semibold text-[#111917] dark:text-[#E5ECEB]">
              {trader?.ratingPct ?? 100}%
            </span>
            <span aria-hidden="true">·</span>
            <span>{(trader?.tradesCount ?? 0).toLocaleString('en-US')} Trades</span>
            {isOwnOffer && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-[#0D6832] dark:text-[#7FE85B]">Your Ad</span>
              </>
            )}
            {!offer.active && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-amber-700 dark:text-amber-400">Paused</span>
              </>
            )}
          </div>

          {offer.tags.length > 0 && (
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setTagsExpanded((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0E1715] hover:text-[#0B3B2E] dark:text-[#C5D1CF] dark:hover:text-[#7FE85B]"
              >
                <span>View tags ({offer.tags.length})</span>
                {tagsExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
              {tagsExpanded && (
                <p className="mt-1 text-xs text-[#5C6665] dark:text-[#8E9B98]">
                  {offer.tags.join(' · ')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Column 2: Asset Price / Swap Rate, Margin & Limits */}
        <div className="flex items-start gap-3 min-w-0">
          {isSwap ? (
            <div className="mt-0.5 flex -space-x-2 shrink-0">
              <CoinIcon symbol={swapTargetAsset} size={24} />
              <CoinIcon symbol={offer.crypto} size={24} />
            </div>
          ) : (
            <div className="mt-0.5 shrink-0">
              <CoinIcon symbol={offer.crypto} size={26} />
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2 lg:justify-start">
              <span className="font-mono text-base font-bold tabular-nums text-[#0E1715] dark:text-[#F1F5F4]">
                {isSwap
                  ? `1 ${offer.crypto} = ${formatCrypto(unitPrice, swapTargetAsset)}`
                  : formatFiat(unitPrice, offer.fiat)}
              </span>
              <span
                className={`rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold tabular-nums ${
                  marginIsFavorable
                    ? 'bg-[#E3F7EB] text-[#0D6832] dark:bg-[#133322] dark:text-[#7FE85B]'
                    : 'bg-[#F2F4F4] text-[#4B5554] dark:bg-[#1F2928] dark:text-[#B4C0BE]'
                }`}
              >
                {marginLabel}
              </span>
              {offer.cryptoChain && CHAIN_OPTIONS[offer.cryptoChain] && (
                <span className="inline-flex items-center gap-1 rounded-md border border-[#DCE2E1] bg-[#F8FAFA] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#394241] dark:border-[#263130] dark:bg-[#172120] dark:text-[#C5D1CF]">
                  <ChainIcon chain={offer.cryptoChain} size={12} />
                  <span>
                    {offer.crypto} {CHAIN_OPTIONS[offer.cryptoChain].standard}
                  </span>
                </span>
              )}
              {isSwap && offer.swapToChain && CHAIN_OPTIONS[offer.swapToChain] && (
                <span className="inline-flex items-center gap-1 rounded-md border border-[#DCE2E1] bg-[#F8FAFA] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#394241] dark:border-[#263130] dark:bg-[#172120] dark:text-[#C5D1CF]">
                  <ChainIcon chain={offer.swapToChain} size={12} />
                  <span>
                    {swapTargetAsset} {CHAIN_OPTIONS[offer.swapToChain].standard}
                  </span>
                </span>
              )}
            </div>
            <div className="font-mono text-xs tabular-nums text-[#64706E] dark:text-[#8E9B98]">
              {isSwap ? (
                <>
                  {minSwap.toLocaleString('en-US', { maximumFractionDigits: 4 })} –{' '}
                  {maxSwap.toLocaleString('en-US', { maximumFractionDigits: 4 })}{' '}
                  {swapTargetAsset}
                </>
              ) : (
                <>
                  {offer.minFiat.toLocaleString('en-US')} – {offer.maxFiat.toLocaleString('en-US')}{' '}
                  {offer.fiat}
                </>
              )}
              {offer.availableCrypto ? (
                <span className="ml-1.5">
                  · {offer.availableCrypto.toLocaleString('en-US')} {offer.crypto} avail
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Columns 3 & 4: Symmetrical 2-column Pay vs Receive breakdown on mobile, inline columns on lg+ */}
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#ECEFEF] bg-[#F8FAFA] p-3 lg:contents dark:border-[#1E2726] dark:bg-[#0F1515]">
          {/* Column 3: Pay / Send Side */}
          <div className="min-w-0 border-r border-[#E4E9E9] pr-2 lg:border-r-0 lg:pr-0 lg:border-l lg:border-[#EDF0F0] lg:pl-5 dark:border-[#202B2A] dark:lg:border-[#202B2A]">
            <div className="text-xs text-[#64706E] dark:text-[#8E9B98] truncate">
              {isSwap ? `Send ${swapTargetAsset}` : isBuyingCrypto ? 'Pay' : 'Receive'}{' '}
              <span className="font-semibold text-[#1E2726] dark:text-[#DCE4E3]">
                {isSwap ? `· ${offer.paymentMethod}` : offer.paymentMethod}
              </span>
            </div>
            <div className="mt-1 truncate font-mono text-base font-semibold tabular-nums text-[#0E1715] sm:text-lg sm:font-medium dark:text-[#F1F5F4]">
              {isSwap
                ? formatCrypto(sampleInput, swapTargetAsset)
                : formatFiat(sampleInput, offer.fiat)}
            </div>
            {isSwap && (
              <div className="truncate font-mono text-[11px] tabular-nums text-[#64706E] dark:text-[#8E9B98]">
                ≈ ${swapSendUsdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </div>
            )}
          </div>

          {/* Column 4: Receive / Sell Side + Desktop Action */}
          <div className="flex min-w-0 items-center justify-between gap-4 lg:border-l lg:border-[#EDF0F0] lg:pl-5 dark:lg:border-[#202B2A]">
            <div className="min-w-0">
              <div className="truncate text-xs text-[#64706E] dark:text-[#8E9B98]">
                {isSwap
                  ? `Receive (${offer.crypto})`
                  : isBuyingCrypto
                    ? `Receive (${offer.crypto})`
                    : `Sell (${offer.crypto})`}
              </div>
              <div className="mt-1 truncate font-mono text-base font-semibold tabular-nums text-[#0E1715] sm:text-lg sm:font-medium dark:text-[#F1F5F4]">
                {isSwap
                  ? formatCrypto(cryptoReceived, offer.crypto)
                  : formatFiat(marketValueReceived, offer.fiat)}
              </div>
              <div className="truncate font-mono text-[11px] tabular-nums text-[#64706E] dark:text-[#8E9B98]">
                {isSwap
                  ? `≈ $${marketValueReceived.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
                  : formatCrypto(cryptoReceived, offer.crypto)}
              </div>
            </div>

            <button
              type="button"
              disabled={!offer.active && !isOwnOffer}
              onClick={() => onSelectOffer(offer)}
              className={`hidden shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap lg:inline-flex ${actionButtonClasses}`}
            >
              {actionButtonLabel}
            </button>
          </div>
        </div>

        {/* Mobile Full-Width Action Button */}
        <button
          type="button"
          disabled={!offer.active && !isOwnOffer}
          onClick={() => onSelectOffer(offer)}
          className={`flex min-h-[44px] w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors lg:hidden ${actionButtonClasses}`}
        >
          {actionButtonLabel}
        </button>
      </div>
    </div>
  );
}
