import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  Lock,
  Paperclip,
  Send,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../api';
import { formatCrypto, formatFiat } from '../constants/market';
import type {
  MarketPrices,
  P2POffer,
  TradeOrder,
  TraderProfile,
  UserAccount,
} from '../types';
import { CoinIcon } from './CoinIcon';
import { getOfferUnitPrice } from './OfferRow';

interface TradeModalProps {
  offer?: P2POffer;
  trader?: TraderProfile;
  existingTrade?: TradeOrder;
  prices: MarketPrices;
  initialFiatAmount?: number | null;
  user: UserAccount | null;
  onRequireAuth: () => void;
  onClose: () => void;
  onTradeUpdated: (trade: TradeOrder, updatedUser?: UserAccount) => void;
}

export function TradeModal({
  offer,
  trader,
  existingTrade,
  prices,
  initialFiatAmount,
  user,
  onRequireAuth,
  onClose,
  onTradeUpdated,
}: TradeModalProps) {
  const [trade, setTrade] = useState<TradeOrder | null>(existingTrade ?? null);
  const [fiatInput, setFiatInput] = useState(() => {
    if (offer) {
      if (offer.side === 'swap_crypto' && offer.swapToCrypto) {
        const minS = offer.minSwapAmount ?? offer.minFiat / (prices.usdPrices[offer.swapToCrypto] ?? 1);
        const maxS = offer.maxSwapAmount ?? offer.maxFiat / (prices.usdPrices[offer.swapToCrypto] ?? 1);
        if (initialFiatAmount && initialFiatAmount >= minS && initialFiatAmount <= maxS) {
          return String(initialFiatAmount);
        }
        return String(Number(minS.toFixed(6)));
      }
      if (initialFiatAmount && initialFiatAmount >= offer.minFiat && initialFiatAmount <= offer.maxFiat) {
        return String(initialFiatAmount);
      }
      return String(offer.minFiat);
    }
    return '';
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackPositive, setFeedbackPositive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(1800);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!trade) return;
    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((new Date(trade.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(diff);
    };
    updateTimer();
    const id = setInterval(updateTimer, 1000);
    return () => clearInterval(id);
  }, [trade]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [trade?.messages.length]);

  // Realistic escrow release progression after buyer/taker confirms deposit/payment
  useEffect(() => {
    if (
      !trade ||
      trade.status !== 'payment_sent' ||
      (trade.side !== 'sell_crypto' && trade.side !== 'swap_crypto')
    ) {
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.tradeAction(trade.id, { action: 'release' });
        setTrade(res.trade);
        onTradeUpdated(res.trade, res.user);
      } catch {
        // ignore if already settled or closed
      }
    }, 3500);
    return () => clearTimeout(timer);
  }, [trade?.id, trade?.status, trade?.side, onTradeUpdated]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Phase 1: LocalCoinSwap-Style Offer Review, Terms & Amount Entry
  if (!trade && offer) {
    const isOwnOffer = Boolean(user && offer.traderUsername === user.username);
    const isSwap = offer.side === 'swap_crypto' && !!offer.swapToCrypto;
    const swapTargetAsset = offer.swapToCrypto ?? 'BTC';
    const unitPrice = getOfferUnitPrice(offer, prices);
    const parsedSend = Number(fiatInput) || 0;
    const cryptoAmt = unitPrice > 0 ? parsedSend / unitPrice : 0;
    const isBuyingCrypto = offer.side === 'sell_crypto';

    const minLimit = isSwap
      ? offer.minSwapAmount ?? offer.minFiat / (prices.usdPrices[swapTargetAsset] ?? 1)
      : offer.minFiat;
    const maxLimit = isSwap
      ? offer.maxSwapAmount ?? offer.maxFiat / (prices.usdPrices[swapTargetAsset] ?? 1)
      : offer.maxFiat;

    const handleCryptoInput = (val: string) => {
      const c = Number(val);
      if (Number.isFinite(c) && unitPrice > 0) {
        const prod = c * unitPrice;
        setFiatInput(
          isSwap
            ? String(Number(prod.toFixed(swapTargetAsset === 'USDT' || swapTargetAsset === 'USDC' ? 2 : 6)))
            : prod.toFixed(2)
        );
      }
    };

    const handleOpenTrade = async () => {
      if (isOwnOffer) return;
      if (!user) {
        onRequireAuth();
        return;
      }
      if (!acceptedTerms) {
        setError('Please confirm that you have read and accept the offer terms and conditions.');
        return;
      }
      setError('');
      setBusy(true);
      try {
        const res = await api.openTrade(
          offer.id,
          parsedSend,
          isSwap ? parsedSend : undefined
        );
        setTrade(res.trade);
        onTradeUpdated(res.trade, res.user);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to start trade');
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
        <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#DCE2E1] bg-white p-6 shadow-xl dark:border-[#263130] dark:bg-[#131A1A]">
          <div className="flex items-start justify-between gap-4 border-b border-[#ECEFEF] pb-4 dark:border-[#202B2A]">
            <div className="flex items-center gap-3">
              <CoinIcon symbol={offer.crypto} size={32} />
              <div>
                <h2 className="font-display text-xl font-bold text-[#0E1715] dark:text-white">
                  {isSwap
                    ? `Swap ${swapTargetAsset} for ${offer.crypto}`
                    : isBuyingCrypto
                      ? `Buy ${offer.crypto} via ${offer.paymentMethod}`
                      : `Sell ${offer.crypto} via ${offer.paymentMethod}`}
                </h2>
                <p className="text-xs text-[#5C6665] dark:text-[#98A4A2]">
                  Offer by <span className="font-semibold text-[#0E1715] dark:text-white">{offer.traderUsername}</span>{' '}
                  · {trader?.ratingPct ?? 100}% Trust ({trader?.tradesCount ?? 0} trades) ·{' '}
                  {offer.paymentWindowMinutes}m escrow window
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

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-12">
            {/* Left: Calculator */}
            <div className="space-y-4 rounded-xl border border-[#E3E7E7] bg-[#F8FAFA] p-4 md:col-span-6 dark:border-[#202B2A] dark:bg-[#0F1515]">
              <div>
                <div className="flex items-center justify-between text-xs text-[#5C6665] dark:text-[#98A4A2] mb-1.5">
                  <span>
                    {isSwap
                      ? `How much to send (${swapTargetAsset})`
                      : isBuyingCrypto
                        ? `How much to pay (${offer.fiat})`
                        : `How much to receive (${offer.fiat})`}
                  </span>
                  <span className="font-mono">
                    {minLimit.toLocaleString('en-US', { maximumFractionDigits: 4 })}–
                    {maxLimit.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                  </span>
                </div>
                <input
                  type="number"
                  min={minLimit}
                  max={maxLimit}
                  step="any"
                  value={fiatInput}
                  onChange={(e) => setFiatInput(e.target.value)}
                  className="h-12 w-full rounded-xl border border-[#DCE2E1] bg-white px-3.5 font-mono text-lg font-bold tabular-nums text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                />
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {[
                    { label: 'Min', val: minLimit },
                    { label: '25%', val: minLimit + (maxLimit - minLimit) * 0.25 },
                    { label: '50%', val: minLimit + (maxLimit - minLimit) * 0.5 },
                    { label: 'Max', val: maxLimit },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() =>
                        setFiatInput(
                          isSwap
                            ? String(Number(p.val.toFixed(6)))
                            : String(Math.round(p.val))
                        )
                      }
                      className="rounded-lg border border-[#DCE2E1] bg-white py-1 font-mono text-[11px] font-semibold text-[#394241] hover:border-[#0B3B2E] dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#C5D1CF]"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-[#5C6665] dark:text-[#98A4A2] mb-1.5">
                  {isSwap || isBuyingCrypto
                    ? `You will receive (${offer.crypto})`
                    : `You will sell (${offer.crypto})`}
                </div>
                <div className="flex h-12 items-center justify-between rounded-xl border border-[#E3E7E7] bg-white px-3.5 dark:border-[#263130] dark:bg-[#131A1A]">
                  <input
                    type="number"
                    step="any"
                    value={cryptoAmt.toFixed(offer.crypto === 'USDT' || offer.crypto === 'USDC' ? 2 : 6)}
                    onChange={(e) => handleCryptoInput(e.target.value)}
                    className="w-full bg-transparent font-mono text-lg font-bold tabular-nums text-[#0B3B2E] focus:outline-none dark:text-[#7FE85B]"
                  />
                  <span className="text-xs font-bold text-[#5C6665] dark:text-[#98A4A2]">
                    {offer.crypto}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 border-t border-[#E3E7E7] pt-3 text-xs dark:border-[#202B2A]">
                <div className="flex items-center justify-between">
                  <span className="text-[#5C6665] dark:text-[#98A4A2]">Guaranteed Rate</span>
                  <span className="font-mono font-semibold tabular-nums text-[#0E1715] dark:text-white">
                    {isSwap
                      ? `1 ${offer.crypto} = ${formatCrypto(unitPrice, swapTargetAsset)}`
                      : `1 ${offer.crypto} = ${formatFiat(unitPrice, offer.fiat)}`}
                  </span>
                </div>
                {isSwap && user && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#5C6665] dark:text-[#98A4A2]">
                      Your {swapTargetAsset} Balance
                    </span>
                    <span className="font-mono font-semibold text-[#0E1715] dark:text-white">
                      {formatCrypto(user.balances[swapTargetAsset] ?? 0, swapTargetAsset)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[#5C6665] dark:text-[#98A4A2]">BitSpend P2P Escrow Fee</span>
                  <span className="font-mono font-semibold text-[#0D6832] dark:text-[#7FE85B]">
                    0.00% (Included)
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Generated Terms & Conditions + Escrow Guarantee */}
            <div className="flex flex-col justify-between space-y-4 md:col-span-6">
              <div className="space-y-3">
                <div className="rounded-xl border border-[#E3E7E7] bg-[#F8FAFA] p-4 dark:border-[#202B2A] dark:bg-[#0F1515]">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0E1715] dark:text-white">
                    <FileText className="h-4 w-4 text-[#0B3B2E] dark:text-[#7FE85B]" />
                    <span>
                      Terms & Conditions for {user ? user.username : isSwap ? 'Swapper' : 'Buyer'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[#2D3635] dark:text-[#D1DCDA]">
                    {offer.terms}
                  </p>
                  <ul className="mt-3 space-y-1.5 border-t border-[#E6EAEA] pt-3 text-xs text-[#4B5554] dark:border-[#202B2A] dark:text-[#98A4A2]">
                    {isSwap ? (
                      <>
                        <li>
                          · Both {swapTargetAsset} and {offer.crypto} are secured in multi-asset escrow.
                        </li>
                        <li>· Settlement completes within {offer.paymentWindowMinutes} minutes.</li>
                        <li>· Zero KYC, zero external custody risk.</li>
                      </>
                    ) : (
                      <>
                        <li>· Complete {offer.paymentMethod} transfer within {offer.paymentWindowMinutes} minutes.</li>
                        <li>· Do not mention BitSpend, Bitcoin, Monero, or crypto in payment memos.</li>
                        <li>· {offer.crypto} stays locked in 2-of-3 multi-sig escrow until release.</li>
                      </>
                    )}
                  </ul>
                </div>

                {offer.tags.length > 0 && (
                  <p className="text-xs font-medium text-[#0D6832] dark:text-[#7FE85B]">
                    {offer.tags.join(' · ')}
                  </p>
                )}
              </div>

              {isOwnOffer ? (
                <div className="rounded-xl border border-[#C6E8CF] bg-[#F2FAF4] p-3.5 text-xs leading-relaxed text-[#1E3B2B] dark:border-[#1E3B2B] dark:bg-[#112219] dark:text-[#D1DCDA]">
                  <div className="flex items-center gap-2 font-bold text-[#0D6832] dark:text-[#7FE85B]">
                    <span className="h-2 w-2 rounded-full bg-[#16A34A] dark:bg-[#7FE85B]" />
                    <span>
                      {offer.active ? 'Live Ad View · Active on Market' : 'Ad Preview · Currently Paused'}
                    </span>
                  </div>
                  <p className="mt-1">
                    This is how your published listing appears live to traders. Use the calculator on the left to test amounts and spot-synced rates. You cannot open a trade on your own ad.
                  </p>
                </div>
              ) : (
                <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#DCE2E1] bg-[#F5F9F7] p-3.5 dark:border-[#203029] dark:bg-[#11201A]">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => {
                      setAcceptedTerms(e.target.checked);
                      setError('');
                    }}
                    className="mt-0.5 h-4 w-4 accent-[#0B3B2E] dark:accent-[#7FE85B]"
                  />
                  <span className="text-xs leading-relaxed text-[#202B29] dark:text-[#D1DCDA]">
                    I accept {offer.traderUsername}&apos;s terms &amp; conditions and want to lock{' '}
                    <strong className="font-mono">
                      {isSwap
                        ? `${formatCrypto(parsedSend, swapTargetAsset)} → ${formatCrypto(cryptoAmt, offer.crypto)}`
                        : formatCrypto(cryptoAmt, offer.crypto)}
                    </strong>{' '}
                    in BitSpend P2P escrow.
                  </span>
                </label>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#ECEFEF] pt-4 dark:border-[#202B2A]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-[#5C6665] hover:bg-[#F1F4F3] dark:text-[#98A4A2] dark:hover:bg-[#1E2927]"
            >
              {isOwnOffer ? 'Close' : 'Cancel'}
            </button>
            {isOwnOffer ? (
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-xl border border-[#DCE2E1] bg-[#F1F4F3] px-5 py-2.5 text-sm font-semibold text-[#64706E] dark:border-[#263130] dark:bg-[#1A2423] dark:text-[#8E9B98]"
              >
                Your Own Ad · Self-Trade Disabled
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={handleOpenTrade}
                className="rounded-xl bg-[#7FE85B] px-6 py-2.5 text-sm font-semibold text-[#082213] hover:bg-[#6AD845] disabled:opacity-60 transition-colors"
              >
                {busy
                  ? 'Opening Escrow...'
                  : user
                    ? 'Confirm & Open Trade'
                    : 'Register / Sign in to Confirm'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Phase 2: LocalCoinSwap-Style Active Escrow & Chat Room
  if (!trade) return null;

  const isSwap = trade.side === 'swap_crypto' && !!trade.swapToCrypto;
  const isBuyingCrypto = trade.side === 'sell_crypto';

  const handleSendMsg = async (e: FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || busy) return;
    setBusy(true);
    try {
      const res = await api.sendTradeMessage(trade.id, messageText);
      setTrade(res.trade);
      onTradeUpdated(res.trade);
      setMessageText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setBusy(false);
    }
  };

  const handleAttachReceipt = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await api.sendTradeMessage(
        trade.id,
        `[Payment Proof Attached: ${trade.paymentMethod} transfer receipt #${trade.id}]`
      );
      setTrade(res.trade);
      onTradeUpdated(res.trade);
    } finally {
      setBusy(false);
    }
  };

  const handleAction = async (
    action: 'mark_paid' | 'release' | 'cancel' | 'dispute' | 'feedback'
  ) => {
    setError('');
    setBusy(true);
    try {
      const res = await api.tradeAction(trade.id, {
        action,
        positive: feedbackPositive,
        comment: feedbackComment,
      });
      setTrade(res.trade);
      onTradeUpdated(res.trade, res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(trade.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1800);
    } catch {
      // ignore
    }
  };

  const stepIndex =
    trade.status === 'completed'
      ? 4
      : trade.status === 'payment_sent'
        ? 3
        : trade.status === 'escrow_funded'
          ? 2
          : 1;

  const statusLabel = {
    escrow_funded: 'Escrow Funded · Send Payment',
    payment_sent: 'Payment Sent · Verifying Receipt',
    completed: 'Completed · Crypto Released',
    cancelled: 'Cancelled · Escrow Returned',
    disputed: 'Disputed · Escrow Frozen',
  }[trade.status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#DCE2E1] bg-white shadow-xl dark:border-[#263130] dark:bg-[#131A1A]">
        {/* Top Bar */}
        <div className="flex items-center justify-between border-b border-[#ECEFEF] px-6 py-4 dark:border-[#202B2A]">
          <div className="flex items-center gap-3">
            <CoinIcon symbol={trade.crypto} size={28} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-lg font-bold text-[#0E1715] dark:text-white">
                  Trade {trade.id}
                </h2>
                <span className="font-mono text-xs font-semibold text-[#0D6832] dark:text-[#7FE85B]">
                  {statusLabel}
                </span>
              </div>
              <p className="text-xs text-[#5C6665] dark:text-[#98A4A2]">
                {isSwap && trade.swapToCrypto && trade.swapToAmount ? (
                  <>
                    Swap {formatCrypto(trade.swapToAmount, trade.swapToCrypto)} →{' '}
                    {formatCrypto(trade.cryptoAmount, trade.crypto)} · {trade.paymentMethod} with{' '}
                    {trade.traderUsername}
                  </>
                ) : (
                  <>
                    {formatCrypto(trade.cryptoAmount, trade.crypto)} for{' '}
                    {formatFiat(trade.fiatAmount, trade.fiat)} · {trade.paymentMethod} with{' '}
                    {trade.traderUsername}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {(trade.status === 'escrow_funded' || trade.status === 'payment_sent') && (
              <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-[#DCE2E1] px-2.5 py-1 font-mono text-xs font-semibold text-[#0E1715] dark:border-[#263130] dark:text-white">
                <Clock className="h-3.5 w-3.5 text-[#5C6665]" />
                <span>{formatTimer(secondsLeft)}</span>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close trade room"
              className="rounded-lg p-1.5 text-[#5C6665] hover:bg-[#F1F4F3] dark:text-[#98A4A2] dark:hover:bg-[#1E2927]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 4-Step Escrow Progress Bar */}
        <div className="grid grid-cols-4 border-b border-[#ECEFEF] bg-[#F9FAFA] px-6 py-2.5 text-[11px] font-semibold dark:border-[#202B2A] dark:bg-[#0F1515]">
          {[
            isSwap ? '1. Swap Opened' : '1. Trade Opened',
            '2. Escrow Locked',
            isSwap ? '3. Deposit Confirmed' : '3. Payment Sent',
            isSwap ? '4. Swap Settled' : '4. Crypto Released',
          ].map((label, idx) => {
            const reached = idx + 1 <= stepIndex;
            return (
              <div
                key={label}
                className={
                  reached
                    ? 'text-[#0D6832] dark:text-[#7FE85B]'
                    : 'text-[#8A9593] dark:text-[#586563]'
                }
              >
                {label}
              </div>
            );
          })}
        </div>

        {/* Main Split Body */}
        <div className="grid flex-1 grid-cols-1 overflow-y-auto md:grid-cols-12">
          {/* Left: Escrow Summary, Payment Instructions & Controls */}
          <div className="space-y-4 border-b border-[#ECEFEF] p-5 md:col-span-5 md:border-b-0 md:border-r dark:border-[#202B2A]">
            <div className="rounded-xl border border-[#E3E7E7] bg-[#F8FAFA] p-4 dark:border-[#202B2A] dark:bg-[#0F1515]">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-[#5C6665] dark:text-[#8E9B98]">
                    {isSwap ? 'You Send' : 'Fiat Amount'}
                  </div>
                  <div className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[#0E1715] dark:text-white">
                    {isSwap && trade.swapToCrypto && trade.swapToAmount
                      ? formatCrypto(trade.swapToAmount, trade.swapToCrypto)
                      : formatFiat(trade.fiatAmount, trade.fiat)}
                  </div>
                </div>
                <div>
                  <div className="text-[#5C6665] dark:text-[#8E9B98]">
                    {isSwap ? 'You Receive' : 'Escrow Locked'}
                  </div>
                  <div className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[#0B3B2E] dark:text-[#7FE85B]">
                    {formatCrypto(trade.cryptoAmount, trade.crypto)}
                  </div>
                </div>
                <div>
                  <div className="text-[#5C6665] dark:text-[#8E9B98]">Buyer</div>
                  <div className="mt-0.5 font-semibold text-[#0E1715] dark:text-white">
                    {trade.buyerUsername}
                  </div>
                </div>
                <div>
                  <div className="text-[#5C6665] dark:text-[#8E9B98]">Seller</div>
                  <div className="mt-0.5 font-semibold text-[#0E1715] dark:text-white">
                    {trade.sellerUsername}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Instructions */}
            <div className="rounded-xl border border-[#DCE2E1] bg-white p-3.5 dark:border-[#24302E] dark:bg-[#0F1515]">
              <div className="flex items-center justify-between text-xs font-bold text-[#0E1715] dark:text-white">
                <span>
                  {isSwap ? `Swap Escrow Details` : `Payment Details (${trade.paymentMethod})`}
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0B3B2E] hover:underline dark:text-[#7FE85B]"
                >
                  {copiedId ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedId ? 'Copied Ref' : 'Copy Ref'}</span>
                </button>
              </div>
              <p className="mt-1.5 font-mono text-xs leading-relaxed text-[#394241] dark:text-[#C5D1CF]">
                {trade.paymentDetails || `Reference: ${trade.id}`}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              {trade.status === 'escrow_funded' && (isBuyingCrypto || isSwap) && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleAction('mark_paid')}
                  className="w-full rounded-xl bg-[#7FE85B] py-3 text-sm font-semibold text-[#082213] hover:bg-[#6AD845] transition-colors"
                >
                  {isSwap ? 'Confirm Swap Escrow & Settle' : 'Mark Payment as Paid'}
                </button>
              )}

              {trade.status === 'payment_sent' && (isBuyingCrypto || isSwap) && (
                <div className="rounded-xl border border-[#DCE2E1] bg-[#F5F9F7] p-3.5 text-xs text-[#202B29] dark:border-[#203029] dark:bg-[#11201A] dark:text-[#D1DCDA]">
                  <div className="flex items-center gap-2 font-semibold text-[#0D6832] dark:text-[#7FE85B]">
                    <ShieldCheck className="h-4 w-4" />
                    <span>
                      {isSwap
                        ? `Settling ${trade.swapToCrypto} ↔ ${trade.crypto} swap...`
                        : `Verifying ${trade.paymentMethod} confirmation...`}
                    </span>
                  </div>
                  <p className="mt-1 opacity-85">
                    {trade.traderUsername} is confirming receipt and releasing {trade.crypto} from escrow.
                  </p>
                </div>
              )}

              {(trade.status === 'escrow_funded' || trade.status === 'payment_sent') &&
                !isBuyingCrypto &&
                !isSwap && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleAction('release')}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7FE85B] py-3 text-sm font-semibold text-[#082213] hover:bg-[#6AD845]"
                  >
                    <Lock className="h-4 w-4" />
                    <span>Confirm Payment &amp; Release {trade.crypto}</span>
                  </button>
                )}

              {trade.status === 'escrow_funded' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleAction('cancel')}
                  className="w-full rounded-xl border border-[#DCE2E1] py-2.5 text-sm font-medium text-[#4B5554] hover:bg-[#F5F7F7] dark:border-[#263130] dark:text-[#98A4A2] dark:hover:bg-[#1A2423]"
                >
                  Cancel Trade
                </button>
              )}

              {(trade.status === 'escrow_funded' || trade.status === 'payment_sent') && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleAction('dispute')}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Open Escrow Dispute</span>
                </button>
              )}

              {trade.status === 'completed' && !trade.feedbackGiven && (
                <div className="space-y-3 rounded-xl border border-[#D3EBD9] bg-[#F3FAF5] p-4 dark:border-[#1E3B2B] dark:bg-[#112219]">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#0D6832] dark:text-[#7FE85B]">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Escrow Released · Leave Feedback</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFeedbackPositive(true)}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold border ${
                        feedbackPositive
                          ? 'border-[#16A34A] bg-white text-[#0D6832] dark:bg-[#173022] dark:text-[#7FE85B]'
                          : 'border-transparent text-[#5C6665]'
                      }`}
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                      <span>Positive</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedbackPositive(false)}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold border ${
                        !feedbackPositive
                          ? 'border-red-500 bg-white text-red-600 dark:bg-red-950/40 dark:text-red-300'
                          : 'border-transparent text-[#5C6665]'
                      }`}
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                      <span>Negative</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder="Comment on speed & communication..."
                    className="h-9 w-full rounded-lg border border-[#DCE2E1] bg-white px-3 text-xs text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleAction('feedback')}
                    className="w-full rounded-lg bg-[#0B3B2E] py-2 text-xs font-semibold text-white dark:bg-[#7FE85B] dark:text-[#082213]"
                  >
                    Submit Feedback
                  </button>
                </div>
              )}

              {trade.feedbackGiven && (
                <div className="rounded-xl border border-[#E3E7E7] bg-[#F8FAFA] p-3 text-xs text-[#4B5554] dark:border-[#202B2A] dark:bg-[#0F1515] dark:text-[#98A4A2]">
                  Feedback submitted ({trade.feedbackGiven.positive ? 'Positive' : 'Negative'}): &ldquo;{trade.feedbackGiven.comment}&rdquo;
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </div>
            )}
          </div>

          {/* Right: Escrow Chat */}
          <div className="flex h-[420px] flex-col md:col-span-7 md:h-[500px]">
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {trade.messages.map((m) => {
                const isMe = m.sender === user?.username;
                if (m.isSystem) {
                  return (
                    <div
                      key={m.id}
                      className="rounded-xl border border-[#E3E7E7] bg-[#F6F8F8] px-3.5 py-2.5 text-xs text-[#4B5554] dark:border-[#202B2A] dark:bg-[#0F1515] dark:text-[#98A4A2]"
                    >
                      <span className="font-semibold text-[#0E1715] dark:text-white mr-1.5">
                        Escrow:
                      </span>
                      <span>{m.text}</span>
                    </div>
                  );
                }
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <span className="mb-1 text-[11px] font-medium text-[#6C7775]">
                      {m.sender}
                    </span>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isMe
                          ? 'bg-[#0B3B2E] text-white dark:bg-[#7FE85B] dark:text-[#082213]'
                          : 'border border-[#E3E7E7] bg-[#F8FAFA] text-[#0E1715] dark:border-[#222D2C] dark:bg-[#182120] dark:text-[#EDF3F2]'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>

            <form
              onSubmit={handleSendMsg}
              className="flex items-center gap-2 border-t border-[#ECEFEF] p-3.5 dark:border-[#202B2A]"
            >
              <button
                type="button"
                title="Attach payment receipt"
                onClick={handleAttachReceipt}
                disabled={busy || trade.status === 'completed' || trade.status === 'cancelled'}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DCE2E1] text-[#5C6665] hover:bg-[#F5F7F7] disabled:opacity-40 dark:border-[#263130] dark:text-[#98A4A2]"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Write a message or share payment info..."
                className="h-10 flex-1 rounded-xl border border-[#DCE2E1] bg-white px-3.5 text-sm text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
              />
              <button
                type="submit"
                disabled={busy || !messageText.trim()}
                aria-label="Send message"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B3B2E] text-white hover:bg-[#082B21] disabled:opacity-50 dark:bg-[#7FE85B] dark:text-[#082213]"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
