import { CheckCircle2, Clock, KeyRound, Star, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { formatCrypto, formatFiat, formatLastSeen } from '../constants/market';
import type { MarketPrices, P2POffer, TraderProfile } from '../types';
import { CoinIcon } from './CoinIcon';
import { getOfferUnitPrice } from './OfferRow';

interface TraderProfileModalProps {
  trader: TraderProfile;
  offers: P2POffer[];
  prices: MarketPrices;
  currentUsername?: string;
  onClose: () => void;
  onSelectOffer: (offer: P2POffer) => void;
}

export function TraderProfileModal({
  trader: initialTrader,
  offers,
  prices,
  currentUsername,
  onClose,
  onSelectOffer,
}: TraderProfileModalProps) {
  const [trader, setTrader] = useState<TraderProfile>(initialTrader);
  const [activeTab, setActiveTab] = useState<'history' | 'offers' | 'feedback'>('history');
  const [loadingMoreTrades, setLoadingMoreTrades] = useState(false);
  const [loadingMoreFeedback, setLoadingMoreFeedback] = useState(false);
  const [offersLimit, setOffersLimit] = useState(12);

  useEffect(() => {
    let mounted = true;
    setTrader(initialTrader);
    setOffersLimit(12);
    api
      .getTrader(initialTrader.username)
      .then((res) => {
        if (mounted) setTrader(res.trader);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [initialTrader]);

  const activeOffers = offers.filter((o) => o.traderUsername === trader.username && o.active);
  const tradeHistory = trader.tradeHistory ?? [];
  const feedbackList = trader.recentFeedback ?? [];
  const totalTrades = Math.max(tradeHistory.length, trader.tradesCount);
  const totalFeedback = Math.max(
    feedbackList.length,
    trader.totalFeedbackCount ?? feedbackList.length
  );

  const handleLoadMoreTrades = async () => {
    if (loadingMoreTrades || tradeHistory.length >= totalTrades) return;
    setLoadingMoreTrades(true);
    try {
      const res = await api.getTraderTrades(trader.username, tradeHistory.length, 20);
      setTrader((prev) => {
        const existing = prev.tradeHistory ?? [];
        const seen = new Set(existing.map((r) => r.id));
        const nextItems = res.items.filter((r) => !seen.has(r.id));
        return {
          ...prev,
          tradeHistory: [...existing, ...nextItems],
        };
      });
    } finally {
      setLoadingMoreTrades(false);
    }
  };

  const handleLoadMoreFeedback = async () => {
    if (loadingMoreFeedback || feedbackList.length >= totalFeedback) return;
    setLoadingMoreFeedback(true);
    try {
      const res = await api.getTraderFeedback(trader.username, feedbackList.length, 20);
      setTrader((prev) => {
        const existing = prev.recentFeedback ?? [];
        const seen = new Set(existing.map((f) => f.id));
        const nextItems = res.items.filter((f) => !seen.has(f.id));
        return {
          ...prev,
          totalFeedbackCount: res.total,
          recentFeedback: [...existing, ...nextItems],
        };
      });
    } finally {
      setLoadingMoreFeedback(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-[2px]">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#DCE2E1] bg-white p-4 shadow-xl sm:p-6 dark:border-[#263130] dark:bg-[#131A1A]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#ECEFEF] pb-5 dark:border-[#202B2A]">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-display text-2xl font-bold text-[#0E1715] dark:text-white">
                {trader.username}
              </h2>
              {trader.verified && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0D6832] dark:text-[#7FE85B]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>High-Volume Desk</span>
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-[#5C6665] dark:text-[#98A4A2]">
              Joined {trader.joinedAt} · {formatLastSeen(trader.lastSeenMinutes)} · Languages:{' '}
              {trader.languages.join(', ')}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#2D3635] dark:text-[#D1DCDA]">
              {trader.bio}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile"
            className="rounded-lg p-1.5 text-[#5C6665] hover:bg-[#F1F4F3] dark:text-[#98A4A2] dark:hover:bg-[#1E2927]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Key Stats Grid */}
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-5 sm:gap-3">
          <div className="rounded-xl border border-[#E6EAEA] bg-[#F8FAFA] p-3 sm:p-3.5 dark:border-[#202B2A] dark:bg-[#0F1515]">
            <div className="text-xs text-[#5C6665] dark:text-[#8E9B98]">Trust Score</div>
            <div className="mt-1 flex items-center gap-1 font-mono text-lg font-bold tabular-nums text-[#0E1715] dark:text-white">
              <Star className="h-4 w-4 fill-[#16A34A] text-[#16A34A] dark:fill-[#7FE85B] dark:text-[#7FE85B]" />
              <span>{trader.ratingPct}%</span>
            </div>
          </div>
          <div className="rounded-xl border border-[#E6EAEA] bg-[#F8FAFA] p-3 sm:p-3.5 dark:border-[#202B2A] dark:bg-[#0F1515]">
            <div className="text-xs text-[#5C6665] dark:text-[#8E9B98]">Total Trades</div>
            <div className="mt-1 font-mono text-lg font-bold tabular-nums text-[#0E1715] dark:text-white">
              {trader.tradesCount.toLocaleString('en-US')}
            </div>
          </div>
          <div className="rounded-xl border border-[#E6EAEA] bg-[#F8FAFA] p-3 sm:p-3.5 dark:border-[#202B2A] dark:bg-[#0F1515]">
            <div className="text-xs text-[#5C6665] dark:text-[#8E9B98]">Est. Volume</div>
            <div className="mt-1 font-mono text-lg font-bold tabular-nums text-[#0B3B2E] dark:text-[#7FE85B]">
              ${((trader.totalVolumeUsd ?? trader.tradesCount * 420) / 1000).toFixed(1)}k
            </div>
          </div>
          <div className="rounded-xl border border-[#E6EAEA] bg-[#F8FAFA] p-3 sm:p-3.5 dark:border-[#202B2A] dark:bg-[#0F1515]">
            <div className="text-xs text-[#5C6665] dark:text-[#8E9B98]">Avg. Release</div>
            <div className="mt-1 flex items-center gap-1 font-mono text-lg font-bold tabular-nums text-[#0E1715] dark:text-white">
              <Clock className="h-4 w-4 text-[#5C6665]" />
              <span>{trader.avgReleaseMinutes}m</span>
            </div>
          </div>
          <div className="col-span-2 flex items-center justify-between rounded-xl border border-[#E6EAEA] bg-[#F8FAFA] p-3 sm:col-span-1 sm:block sm:p-3.5 dark:border-[#202B2A] dark:bg-[#0F1515]">
            <div className="text-xs text-[#5C6665] dark:text-[#8E9B98]">Completion</div>
            <div className="font-mono text-lg font-bold tabular-nums text-[#0E1715] sm:mt-1 dark:text-white">
              {trader.completionRatePct ?? 99.4}%
            </div>
          </div>
        </div>

        {/* PGP Fingerprint */}
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-[#E6EAEA] bg-[#F8FAFA] px-3.5 py-2.5 dark:border-[#202B2A] dark:bg-[#0F1515]">
          <KeyRound className="h-4 w-4 shrink-0 text-[#5C6665]" />
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#4B5554] dark:text-[#98A4A2] mr-2">
              PGP Fingerprint:
            </span>
            <span className="font-mono text-xs text-[#0E1715] dark:text-[#DCE4E3] break-all">
              {trader.pgpFingerprint}
            </span>
          </div>
        </div>

        {/* Sub-navigation tabs */}
        <div className="mt-6 grid grid-cols-3 border-b border-[#ECEFEF] sm:flex sm:items-center sm:gap-1 dark:border-[#202B2A]">
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`border-b-2 px-1.5 py-2.5 text-center text-[11px] font-bold transition-colors sm:px-4 sm:text-xs ${
              activeTab === 'history'
                ? 'border-[#0B3B2E] text-[#0E1715] dark:border-[#7FE85B] dark:text-white'
                : 'border-transparent text-[#5C6665] hover:text-[#0E1715] dark:text-[#98A4A2]'
            }`}
          >
            <span className="sm:hidden">Trades ({totalTrades.toLocaleString('en-US')})</span>
            <span className="hidden sm:inline">Recent Trades ({totalTrades.toLocaleString('en-US')})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('offers')}
            className={`border-b-2 px-1.5 py-2.5 text-center text-[11px] font-bold transition-colors sm:px-4 sm:text-xs ${
              activeTab === 'offers'
                ? 'border-[#0B3B2E] text-[#0E1715] dark:border-[#7FE85B] dark:text-white'
                : 'border-transparent text-[#5C6665] hover:text-[#0E1715] dark:text-[#98A4A2]'
            }`}
          >
            <span className="sm:hidden">Offers ({activeOffers.length})</span>
            <span className="hidden sm:inline">Active Offers ({activeOffers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('feedback')}
            className={`border-b-2 px-1.5 py-2.5 text-center text-[11px] font-bold transition-colors sm:px-4 sm:text-xs ${
              activeTab === 'feedback'
                ? 'border-[#0B3B2E] text-[#0E1715] dark:border-[#7FE85B] dark:text-white'
                : 'border-transparent text-[#5C6665] hover:text-[#0E1715] dark:text-[#98A4A2]'
            }`}
          >
            Feedback ({totalFeedback.toLocaleString('en-US')})
          </button>
        </div>

        {/* Tab 1: Trade History Ledger */}
        {activeTab === 'history' && (
          <div className="mt-4 space-y-3">
            {tradeHistory.length === 0 ? (
              <p className="text-sm text-[#5C6665]">No completed trades logged yet.</p>
            ) : (
              <>
                {/* Mobile Card List */}
                <div className="divide-y divide-[#ECEFEF] rounded-xl border border-[#E6EAEA] sm:hidden dark:divide-[#202B2A] dark:border-[#202B2A]">
                  {tradeHistory.map((rec) => (
                    <div key={rec.id} className="space-y-1.5 px-3.5 py-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-mono font-semibold text-[#0E1715] dark:text-white">
                          <CoinIcon symbol={rec.asset} size={16} />
                          <span>
                            {rec.side} {formatCrypto(rec.cryptoAmount, rec.asset)}
                          </span>
                        </div>
                        <span className="font-mono font-semibold tabular-nums text-[#0B3B2E] dark:text-[#7FE85B]">
                          ${rec.fiatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-[#64706E] dark:text-[#8E9B98]">
                        <span className="truncate">
                          {rec.counterparty} · {rec.paymentMethod}
                        </span>
                        <span className="shrink-0">{rec.completedAt}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden overflow-x-auto rounded-xl border border-[#E6EAEA] sm:block dark:border-[#202B2A]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFA] text-[#5C6665] dark:bg-[#0F1515] dark:text-[#8E9B98]">
                      <tr>
                        <th className="px-3.5 py-2.5 font-semibold">Trade</th>
                        <th className="px-3.5 py-2.5 font-semibold">Asset & Amount</th>
                        <th className="px-3.5 py-2.5 font-semibold">Fiat Value</th>
                        <th className="px-3.5 py-2.5 font-semibold">Method</th>
                        <th className="px-3.5 py-2.5 font-semibold text-right">Settled</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ECEFEF] dark:divide-[#202B2A]">
                      {tradeHistory.map((rec) => (
                        <tr key={rec.id} className="hover:bg-[#FAFBFB] dark:hover:bg-[#17201F]">
                          <td className="px-3.5 py-2.5 font-mono text-[#5C6665] dark:text-[#98A4A2]">
                            {rec.id} · {rec.counterparty}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <div className="flex items-center gap-2 font-mono font-semibold text-[#0E1715] dark:text-white">
                              <CoinIcon symbol={rec.asset} size={16} />
                              <span>
                                {rec.side} {formatCrypto(rec.cryptoAmount, rec.asset)}
                              </span>
                            </div>
                          </td>
                          <td className="px-3.5 py-2.5 font-mono font-semibold tabular-nums text-[#0B3B2E] dark:text-[#7FE85B]">
                            ${rec.fiatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3.5 py-2.5 text-[#394241] dark:text-[#C5D1CF]">
                            {rec.paymentMethod}
                          </td>
                          <td className="px-3.5 py-2.5 text-right text-[#64706E] dark:text-[#8E9B98]">
                            {rec.completedAt}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-2.5 pt-1 text-xs text-[#5C6665] sm:flex-row sm:items-center sm:justify-between dark:text-[#8E9B98]">
                  <span className="font-mono tabular-nums">
                    Showing {tradeHistory.length.toLocaleString('en-US')} of{' '}
                    {totalTrades.toLocaleString('en-US')} trades
                  </span>
                  {tradeHistory.length < totalTrades && (
                    <button
                      type="button"
                      disabled={loadingMoreTrades}
                      onClick={handleLoadMoreTrades}
                      className="min-h-[40px] w-full rounded-xl border border-[#DCE2E1] bg-white px-4 py-2 text-xs font-semibold text-[#0E1715] hover:bg-[#F5F7F7] disabled:opacity-60 sm:w-auto dark:border-[#263130] dark:bg-[#0F1515] dark:text-white dark:hover:bg-[#1A2423]"
                    >
                      {loadingMoreTrades
                        ? 'Loading trades...'
                        : `See more trades (${(totalTrades - tradeHistory.length).toLocaleString('en-US')} remaining)`}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab 2: Active Offers */}
        {activeTab === 'offers' && (
          <div className="mt-4 space-y-2">
            {activeOffers.length === 0 ? (
              <p className="text-sm text-[#5C6665]">No active offers right now.</p>
            ) : (
              <>
                {activeOffers.slice(0, offersLimit).map((offer) => {
                  const unitPrice = getOfferUnitPrice(offer, prices);
                  const isBuy = offer.side === 'sell_crypto';
                  const isSwap = offer.side === 'swap_crypto' && !!offer.swapToCrypto;
                  return (
                    <div
                      key={offer.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#E6EAEA] px-3.5 py-3 dark:border-[#202B2A]"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <CoinIcon symbol={offer.crypto} size={22} />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[#0E1715] dark:text-white">
                            {isSwap
                              ? `Swap ${offer.swapToCrypto} → ${offer.crypto}`
                              : `${isBuy ? `Buy ${offer.crypto}` : `Sell ${offer.crypto}`} · ${offer.paymentMethod}`}
                          </div>
                          <div className="font-mono text-xs tabular-nums text-[#5C6665] dark:text-[#98A4A2]">
                            {isSwap && offer.swapToCrypto
                              ? `1 ${offer.crypto} = ${formatCrypto(unitPrice, offer.swapToCrypto)} · Limits ${offer.minSwapAmount ?? 0}–${offer.maxSwapAmount ?? 0} ${offer.swapToCrypto}`
                              : `${formatFiat(unitPrice, offer.fiat)} · Limits ${offer.minFiat}–${offer.maxFiat} ${offer.fiat}`}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectOffer(offer);
                        }}
                        className="shrink-0 rounded-lg bg-[#7FE85B] px-3.5 py-2 text-xs font-semibold text-[#082213] hover:bg-[#6AD845]"
                      >
                        {currentUsername && offer.traderUsername === currentUsername
                          ? 'View Live'
                          : 'Trade'}
                      </button>
                    </div>
                  );
                })}
                {activeOffers.length > offersLimit && (
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setOffersLimit((n) => n + 12)}
                      className="min-h-[40px] w-full rounded-xl border border-[#DCE2E1] bg-white px-4 py-2 text-xs font-semibold text-[#0E1715] hover:bg-[#F5F7F7] sm:w-auto dark:border-[#263130] dark:bg-[#0F1515] dark:text-white dark:hover:bg-[#1A2423]"
                    >
                      See more offers ({activeOffers.length - offersLimit} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab 3: Feedback */}
        {activeTab === 'feedback' && (
          <div className="mt-4 space-y-3">
            {feedbackList.length === 0 ? (
              <p className="text-sm text-[#5C6665]">No feedback recorded yet.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E6EAEA] bg-[#F8FAFA] px-4 py-2.5 text-xs dark:border-[#202B2A] dark:bg-[#0F1515]">
                  <span className="font-semibold text-[#0E1715] dark:text-white">
                    {totalFeedback.toLocaleString('en-US')} verified counterparty reviews
                  </span>
                  <span className="font-mono text-[#0D6832] dark:text-[#7FE85B]">
                    {trader.ratingPct}% positive · {totalTrades.toLocaleString('en-US')} completed trades
                  </span>
                </div>

                <div className="divide-y divide-[#ECEFEF] rounded-xl border border-[#E6EAEA] dark:divide-[#202B2A] dark:border-[#202B2A]">
                  {feedbackList.map((fb) => (
                    <div key={fb.id} className="flex items-start gap-3 px-4 py-3">
                      {fb.positive ? (
                        <ThumbsUp className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A] dark:text-[#7FE85B]" />
                      ) : (
                        <ThumbsDown className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[#1E2726] dark:text-[#DCE4E3]">{fb.comment}</p>
                        <p className="mt-1 text-xs text-[#64706E] dark:text-[#8E9B98]">
                          {fb.author} · {fb.asset} · {fb.date}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2.5 pt-1 text-xs text-[#5C6665] sm:flex-row sm:items-center sm:justify-between dark:text-[#8E9B98]">
                  <span className="font-mono tabular-nums">
                    Showing {feedbackList.length.toLocaleString('en-US')} of{' '}
                    {totalFeedback.toLocaleString('en-US')} reviews
                  </span>
                  {feedbackList.length < totalFeedback && (
                    <button
                      type="button"
                      disabled={loadingMoreFeedback}
                      onClick={handleLoadMoreFeedback}
                      className="min-h-[40px] w-full rounded-xl border border-[#DCE2E1] bg-white px-4 py-2 text-xs font-semibold text-[#0E1715] hover:bg-[#F5F7F7] disabled:opacity-60 sm:w-auto dark:border-[#263130] dark:bg-[#0F1515] dark:text-white dark:hover:bg-[#1A2423]"
                    >
                      {loadingMoreFeedback
                        ? 'Loading feedback...'
                        : `See more feedback (${(totalFeedback - feedbackList.length).toLocaleString('en-US')} remaining)`}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
