import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  EyeOff,
  FileText,
  ImagePlus,
  Link2,
  Lock,
  MessageSquare,
  Minimize2,
  Paperclip,
  Send,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { api, enrichTradeMessages } from '../api';
import { CHAIN_OPTIONS, formatCrypto, formatFiat } from '../constants/market';
import { processChatImageFile } from '../utils/profileMedia';
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

interface TradeModalProps {
  offer?: P2POffer;
  trader?: TraderProfile;
  existingTrade?: TradeOrder;
  prices: MarketPrices;
  initialFiatAmount?: number | null;
  user: UserAccount | null;
  onlineUsers?: string[];
  typingByTrade?: Record<string, string | null>;
  onTyping?: (tradeId: string, isTyping: boolean) => void;
  onMarkRead?: (tradeId: string) => void;
  onSelectTrader?: (username: string) => void;
  onMessageTrader?: (username: string, offer: P2POffer) => void;
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
  onlineUsers = [],
  typingByTrade = {},
  onTyping,
  onMarkRead,
  onSelectTrader,
  onMessageTrader,
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
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackPositive, setFeedbackPositive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [copiedOfferUrl, setCopiedOfferUrl] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(1800);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (existingTrade) {
      setTrade(existingTrade);
    }
  }, [existingTrade]);

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
  }, [trade?.messages.length, trade?.id]);

  // Mark trade messages read whenever trade opens or incoming messages arrive
  useEffect(() => {
    if (!trade || !user) return;
    onMarkRead?.(trade.id);
  }, [trade?.id, trade?.messages.length, user?.username]);

  // Simulate NPC step progression only when counterpartyIsReal is false
  useEffect(() => {
    if (!trade || trade.counterpartyIsReal) return;

    const escrowPending =
      trade.status === 'escrow_funded' &&
      trade.lastReadAtBy?.__escrowState === 'awaiting_seller';

    if (trade.side === 'buy_crypto' && trade.status === 'escrow_funded' && !escrowPending) {
      const timer = setTimeout(async () => {
        try {
          const res = await api.tradeAction(trade.id, { action: 'mark_paid' });
          setTrade(res.trade);
          onTradeUpdated(res.trade, res.user);
        } catch {
          // ignore if already updated
        }
      }, 2500);
      return () => clearTimeout(timer);
    }

    if (
      trade.status === 'payment_sent' &&
      (trade.side === 'sell_crypto' || trade.side === 'swap_crypto')
    ) {
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
    }
  }, [
    trade?.id,
    trade?.status,
    trade?.side,
    trade?.counterpartyIsReal,
    trade?.lastReadAtBy?.__escrowState,
    onTradeUpdated,
  ]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatMsgClock = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Phase 1: Offer Review, Terms & Amount Entry
  if (!trade && offer) {
    const isOwnOffer = Boolean(
      user && offer.traderUsername.toLowerCase() === user.username.toLowerCase()
    );
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

    const handleCopyOfferUrl = async () => {
      try {
        await navigator.clipboard.writeText(`${window.location.origin}/offer/${offer.id}`);
        setCopiedOfferUrl(true);
        setTimeout(() => setCopiedOfferUrl(false), 1800);
      } catch {
        // ignore
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-[2px]">
        <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#DCE2E1] bg-white p-4 shadow-xl sm:p-6 dark:border-[#263130] dark:bg-[#131A1A]">
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
                <p className="flex flex-wrap items-center gap-1.5 text-xs text-[#5C6665] dark:text-[#98A4A2]">
                  <span className="inline-flex items-center gap-1.5">
                    <span>Offer by</span>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectTrader?.(offer.traderUsername);
                      }}
                      className="inline-flex items-center gap-1.5 font-semibold text-[#0E1715] hover:underline dark:text-white"
                    >
                      <TraderAvatar
                        username={offer.traderUsername}
                        avatarUrl={trader?.avatarUrl}
                        accentTheme={trader?.accentTheme}
                        size={18}
                        rounded="lg"
                      />
                      <span>/{offer.traderUsername}</span>
                    </button>{' '}
                    · {trader?.ratingPct ?? 100}% Trust ({trader?.tradesCount ?? 0} trades) ·{' '}
                    {offer.paymentWindowMinutes}m escrow
                  </span>
                  {offer.cryptoChain && CHAIN_OPTIONS[offer.cryptoChain] && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-[#DCE2E1] bg-[#F8FAFA] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#394241] dark:border-[#263130] dark:bg-[#172120] dark:text-[#C5D1CF]">
                      <ChainIcon chain={offer.cryptoChain} size={12} />
                      <span>
                        {offer.crypto} on {CHAIN_OPTIONS[offer.cryptoChain].name} ({CHAIN_OPTIONS[offer.cryptoChain].standard})
                      </span>
                    </span>
                  )}
                  {isSwap && offer.swapToChain && CHAIN_OPTIONS[offer.swapToChain] && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-[#DCE2E1] bg-[#F8FAFA] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#394241] dark:border-[#263130] dark:bg-[#172120] dark:text-[#C5D1CF]">
                      <ChainIcon chain={offer.swapToChain} size={12} />
                      <span>
                        {swapTargetAsset} on {CHAIN_OPTIONS[offer.swapToChain].name} ({CHAIN_OPTIONS[offer.swapToChain].standard})
                      </span>
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyOfferUrl}
                className="inline-flex items-center gap-1 rounded-lg border border-[#DCE2E1] px-2.5 py-1.5 font-mono text-[11px] font-semibold text-[#394241] hover:bg-[#F5F7F7] dark:border-[#263130] dark:text-[#C5D1CF] dark:hover:bg-[#1E2927]"
              >
                {copiedOfferUrl ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#0D6832] dark:text-[#7FE85B]" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Link2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Share Offer</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="rounded-lg p-1.5 text-[#5C6665] hover:bg-[#F1F4F3] dark:text-[#98A4A2] dark:hover:bg-[#1E2927]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
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
                  <span className="text-[#5C6665] dark:text-[#98A4A2]">OOSAB Escrow Fee</span>
                  <span className="font-mono font-semibold text-[#0D6832] dark:text-[#7FE85B]">
                    0.00% (Included)
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Terms & Conditions */}
            <div className="flex flex-col justify-between space-y-4 md:col-span-6">
              <div className="space-y-3">
                <div className="rounded-xl border border-[#E3E7E7] bg-[#F8FAFA] p-4 dark:border-[#202B2A] dark:bg-[#0F1515]">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0E1715] dark:text-white">
                    <FileText className="h-4 w-4 text-[#0B3B2E] dark:text-[#7FE85B]" />
                    <span>
                      Terms & Conditions for {user ? user.username : isSwap ? 'Swapper' : 'Trader'}
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
                        <li>· Do not mention OOSAB, Bitcoin, Monero, or crypto in payment memos.</li>
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
                    This is how your published listing appears live to traders. Copy your share link above so others can open and trade with you directly.
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
                    in OOSAB escrow.
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

          <div className="mt-6 flex flex-col-reverse gap-2.5 border-t border-[#ECEFEF] pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3 dark:border-[#202B2A]">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] w-full rounded-xl border border-[#DCE2E1] px-4 py-2.5 text-sm font-medium text-[#5C6665] hover:bg-[#F1F4F3] sm:w-auto sm:border-transparent dark:border-[#263130] dark:text-[#98A4A2] dark:hover:bg-[#1E2927]"
            >
              {isOwnOffer ? 'Close' : 'Cancel'}
            </button>
            {isOwnOffer ? (
              <button
                type="button"
                disabled
                className="min-h-[44px] w-full cursor-not-allowed rounded-xl border border-[#DCE2E1] bg-[#F1F4F3] px-5 py-2.5 text-sm font-semibold text-[#64706E] sm:w-auto dark:border-[#263130] dark:bg-[#1A2423] dark:text-[#8E9B98]"
              >
                Your Own Ad · Self-Trade Disabled
              </button>
            ) : (
              <>
                {onMessageTrader && (
                  <button
                    type="button"
                    onClick={() => onMessageTrader(offer.traderUsername, offer)}
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#DCE2E1] bg-white px-4 py-2.5 text-sm font-semibold text-[#0E1715] hover:bg-[#F5F7F7] sm:w-auto dark:border-[#263130] dark:bg-[#0F1515] dark:text-white dark:hover:bg-[#1A2423]"
                  >
                    <MessageSquare className="h-4 w-4 text-[#0B3B2E] dark:text-[#7FE85B]" />
                    <span>Message @{offer.traderUsername}</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleOpenTrade}
                  className="min-h-[44px] w-full rounded-xl bg-[#7FE85B] px-6 py-2.5 text-sm font-semibold text-[#082213] hover:bg-[#6AD845] disabled:opacity-60 sm:w-auto transition-colors"
                >
                  {busy
                    ? 'Opening Escrow...'
                    : user
                      ? 'Confirm & Open Trade'
                      : 'Register / Sign in to Confirm'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Phase 2: Active Multi-User Escrow & Live Chat Room
  if (!trade) return null;

  const isSwap = trade.side === 'swap_crypto' && !!trade.swapToCrypto;
  const isBuyer = Boolean(
    user && trade.buyerUsername.toLowerCase() === user.username.toLowerCase()
  );
  const isSeller = Boolean(
    user && trade.sellerUsername.toLowerCase() === user.username.toLowerCase()
  );
  const counterparty = user
    ? trade.buyerUsername.toLowerCase() === user.username.toLowerCase()
      ? trade.sellerUsername
      : trade.buyerUsername
    : trade.traderUsername;

  const counterpartyOnline = trade.counterpartyIsReal
    ? onlineUsers.some((u) => u.toLowerCase() === counterparty.toLowerCase())
    : true;
  const counterpartyTyping =
    (typingByTrade[trade.id] ?? '').toLowerCase() === counterparty.toLowerCase();

  const emitTypingChange = (nextVal: string) => {
    setMessageText(nextVal);
    if (!onTyping) return;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (nextVal.trim().length > 0) {
      onTyping(trade.id, true);
      typingTimerRef.current = setTimeout(() => {
        onTyping(trade.id, false);
      }, 1500);
    } else {
      onTyping(trade.id, false);
    }
  };

  const handleSelectImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setImageBusy(true);
    try {
      const dataUrl = await processChatImageFile(file);
      setPendingImage(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to attach picture.');
    } finally {
      setImageBusy(false);
    }
  };

  const handleSendMsg = async (e: FormEvent) => {
    e.preventDefault();
    if ((!messageText.trim() && !pendingImage) || busy || imageBusy) return;
    setBusy(true);
    setError('');
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    onTyping?.(trade.id, false);
    try {
      const res = await api.sendTradeMessage(
        trade.id,
        messageText,
        pendingImage ?? undefined
      );
      setTrade(res.trade);
      onTradeUpdated(res.trade);
      setMessageText('');
      setPendingImage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setBusy(false);
    }
  };

  const handleQuickReply = async (text: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await api.sendTradeMessage(trade.id, text);
      setTrade(res.trade);
      onTradeUpdated(res.trade);
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
    action: 'fund_escrow' | 'mark_paid' | 'release' | 'cancel' | 'dispute' | 'feedback'
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

  const awaitingSellerEscrow =
    trade.status === 'escrow_funded' &&
    trade.lastReadAtBy?.__escrowState === 'awaiting_seller';
  const escrowIsFunded = !awaitingSellerEscrow;

  const stepIndex =
    trade.status === 'completed'
      ? 4
      : trade.status === 'payment_sent'
        ? 3
        : trade.status === 'escrow_funded' && escrowIsFunded
          ? 2
          : 1;

  const statusLabel = awaitingSellerEscrow
    ? 'Awaiting Escrow Funding'
    : {
        escrow_funded: 'Escrow Funded · Active',
        payment_sent: 'Payment Sent · Pending Release',
        completed: 'Completed · Crypto Released',
        cancelled: 'Cancelled · Escrow Returned',
        disputed: 'Disputed · Escrow Frozen',
      }[trade.status];

  const quickReplies = isBuyer
    ? [
        `Where should I send ${trade.paymentMethod}?`,
        `Sending ${formatFiat(trade.fiatAmount, trade.fiat)} now.`,
        `Payment sent via ${trade.paymentMethod} with ref ${trade.id}.`,
      ]
    : [
        `Send ${formatFiat(trade.fiatAmount, trade.fiat)} via ${trade.paymentMethod} (${trade.paymentDetails}).`,
        `Checking ${trade.paymentMethod} receipt now.`,
        `Payment confirmed, releasing ${trade.crypto} now!`,
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-[2px]">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#DCE2E1] bg-white shadow-xl dark:border-[#263130] dark:bg-[#131A1A]">
        {/* Top Bar */}
        <div className="flex items-start justify-between gap-3 border-b border-[#ECEFEF] px-4 py-3.5 sm:items-center sm:px-6 sm:py-4 dark:border-[#202B2A]">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative shrink-0">
              <TraderAvatar
                username={counterparty}
                avatarUrl={trader?.avatarUrl}
                accentTheme={trader?.accentTheme}
                size={36}
                online={counterpartyOnline}
                rounded="xl"
              />
              <span className="absolute -bottom-1 -left-1 rounded-full bg-white p-0.5 shadow-sm dark:bg-[#131A1A]">
                <CoinIcon symbol={trade.crypto} size={14} />
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <h2 className="font-display text-base font-bold text-[#0E1715] sm:text-lg dark:text-white">
                  Trade {trade.id}
                </h2>
                <span className="font-mono text-xs font-semibold text-[#0D6832] dark:text-[#7FE85B]">
                  {statusLabel}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 text-xs text-[#5C6665] dark:text-[#98A4A2]">
                <span>
                  {isSwap && trade.swapToCrypto && trade.swapToAmount ? (
                    <>
                      Swap {formatCrypto(trade.swapToAmount, trade.swapToCrypto)} →{' '}
                      {formatCrypto(trade.cryptoAmount, trade.crypto)} · {trade.paymentMethod} with{' '}
                    </>
                  ) : (
                    <>
                      {formatCrypto(trade.cryptoAmount, trade.crypto)} for{' '}
                      {formatFiat(trade.fiatAmount, trade.fiat)} · {trade.paymentMethod} with{' '}
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelectTrader?.(counterparty);
                    }}
                    className="font-semibold text-[#0E1715] hover:underline dark:text-white"
                  >
                    @{counterparty}
                  </button>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      counterpartyOnline ? 'bg-[#16A34A] dark:bg-[#7FE85B]' : 'bg-[#9CA8A6]'
                    }`}
                  />
                  <span>{counterpartyOnline ? 'Online' : 'Offline'}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {(trade.status === 'escrow_funded' || trade.status === 'payment_sent') && (
              <div className="flex items-center gap-1 rounded-lg border border-[#DCE2E1] px-2 py-1 font-mono text-[11px] font-semibold text-[#0E1715] sm:gap-1.5 sm:px-2.5 sm:text-xs dark:border-[#263130] dark:text-white">
                <Clock className="h-3 w-3 text-[#5C6665] sm:h-3.5 sm:w-3.5" />
                <span>{formatTimer(secondsLeft)}</span>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              title="Exit chat and keep browsing (return via Messages button)"
              className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-[#DCE2E1] px-2.5 py-1.5 text-xs font-semibold text-[#4B5554] hover:bg-[#F1F4F3] dark:border-[#263130] dark:text-[#C5D1CF] dark:hover:bg-[#1E2927]"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              <span>Minimize</span>
            </button>
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
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-b border-[#ECEFEF] bg-[#F9FAFA] px-4 py-2.5 text-[11px] font-semibold sm:grid-cols-4 sm:px-6 dark:border-[#202B2A] dark:bg-[#0F1515]">
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
          <div className="space-y-4 border-b border-[#ECEFEF] p-4 sm:p-5 md:col-span-5 md:border-b-0 md:border-r dark:border-[#202B2A]">
            <div className="rounded-xl border border-[#E3E7E7] bg-[#F8FAFA] p-4 dark:border-[#202B2A] dark:bg-[#0F1515]">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-[#5C6665] dark:text-[#8E9B98]">
                    {isSwap ? 'Swap Input' : 'Fiat Amount'}
                  </div>
                  <div className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[#0E1715] dark:text-white">
                    {isSwap && trade.swapToCrypto && trade.swapToAmount
                      ? formatCrypto(trade.swapToAmount, trade.swapToCrypto)
                      : formatFiat(trade.fiatAmount, trade.fiat)}
                  </div>
                </div>
                <div>
                  <div className="text-[#5C6665] dark:text-[#8E9B98]">
                    {isSwap
                      ? 'Swap Output'
                      : awaitingSellerEscrow
                        ? 'Escrow Required'
                        : 'Escrow Locked'}
                  </div>
                  <div className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[#0B3B2E] dark:text-[#7FE85B]">
                    {formatCrypto(trade.cryptoAmount, trade.crypto)}
                  </div>
                </div>
                <div>
                  <div className="text-[#5C6665] dark:text-[#8E9B98]">
                    Buyer {isBuyer ? '(You)' : ''}
                  </div>
                  <div className="mt-0.5 font-semibold text-[#0E1715] dark:text-white">
                    {trade.buyerUsername}
                  </div>
                </div>
                <div>
                  <div className="text-[#5C6665] dark:text-[#8E9B98]">
                    Seller {isSeller ? '(You)' : ''}
                  </div>
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
                  {isSwap ? 'Swap Escrow Details' : `Payment Details (${trade.paymentMethod})`}
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

            {/* Role-Aware Action Buttons */}
            <div className="space-y-2.5">
              {awaitingSellerEscrow && isSeller && (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleAction('fund_escrow')}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7FE85B] py-3 text-sm font-semibold text-[#082213] hover:bg-[#6AD845] disabled:opacity-60 transition-colors"
                  >
                    <Lock className="h-4 w-4" />
                    <span>
                      Fund Escrow ({formatCrypto(trade.cryptoAmount, trade.crypto)})
                    </span>
                  </button>
                  <div className="flex items-center justify-between px-1 text-[11px] text-[#5C6665] dark:text-[#98A4A2]">
                    <span>Your {trade.crypto} balance:</span>
                    <span className="font-mono font-semibold text-[#0E1715] dark:text-white">
                      {formatCrypto(user?.balances?.[trade.crypto] ?? 0, trade.crypto)}
                    </span>
                  </div>
                </div>
              )}

              {awaitingSellerEscrow && isBuyer && !isSeller && (
                <div className="rounded-xl border border-[#DCE2E1] bg-[#F8FAFA] p-3.5 text-xs text-[#202B29] dark:border-[#24302E] dark:bg-[#0F1515] dark:text-[#D1DCDA]">
                  <div className="flex items-center gap-2 font-semibold text-[#0B3B2E] dark:text-[#7FE85B]">
                    <Clock className="h-4 w-4" />
                    <span>
                      Waiting for @{trade.sellerUsername} to fund escrow...
                    </span>
                  </div>
                  <p className="mt-1 opacity-85">
                    @{trade.sellerUsername} must lock {formatCrypto(trade.cryptoAmount, trade.crypto)} into escrow before you send payment.
                  </p>
                </div>
              )}

              {trade.status === 'escrow_funded' &&
                escrowIsFunded &&
                (isBuyer || (!trade.counterpartyIsReal && isSwap)) && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleAction('mark_paid')}
                    className="w-full rounded-xl bg-[#7FE85B] py-3 text-sm font-semibold text-[#082213] hover:bg-[#6AD845] transition-colors"
                  >
                    {isSwap ? 'Confirm Swap Escrow & Settle' : 'Mark Payment as Paid'}
                  </button>
                )}

              {trade.status === 'payment_sent' && isBuyer && (
                <div className="rounded-xl border border-[#DCE2E1] bg-[#F5F9F7] p-3.5 text-xs text-[#202B29] dark:border-[#203029] dark:bg-[#11201A] dark:text-[#D1DCDA]">
                  <div className="flex items-center gap-2 font-semibold text-[#0D6832] dark:text-[#7FE85B]">
                    <ShieldCheck className="h-4 w-4" />
                    <span>
                      {isSwap
                        ? `Waiting for ${counterparty} to finalize swap...`
                        : `Waiting for ${counterparty} to release ${trade.crypto}...`}
                    </span>
                  </div>
                  <p className="mt-1 opacity-85">
                    {trade.counterpartyIsReal
                      ? `@${counterparty} received your payment confirmation notification and can release escrow after verifying.`
                      : `${counterparty} is confirming receipt and releasing ${trade.crypto} from escrow.`}
                  </p>
                </div>
              )}

              {(trade.status === 'escrow_funded' || trade.status === 'payment_sent') &&
                escrowIsFunded &&
                isSeller && (
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
                    <span>Escrow Released · Leave Feedback for @{counterparty}</span>
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

          {/* Right: Dynamic Live Escrow Chat */}
          <div className="flex h-[380px] flex-col sm:h-[440px] md:col-span-7 md:h-[520px]">
            <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
              {enrichTradeMessages(trade.messages, trade.lastReadAtBy, false).map((m) => {
                const isMe = Boolean(
                  user && m.sender.toLowerCase() === user.username.toLowerCase()
                );
                if (m.isSystem) {
                  return (
                    <div
                      key={m.id}
                      className="rounded-xl border border-[#E3E7E7] bg-[#F6F8F8] px-3.5 py-2.5 text-xs text-[#4B5554] dark:border-[#202B2A] dark:bg-[#0F1515] dark:text-[#98A4A2]"
                    >
                      <span className="mr-1.5 font-semibold text-[#0E1715] dark:text-white">
                        Escrow:
                      </span>
                      <span>{m.text}</span>
                      <span className="ml-2 font-mono text-[10px] opacity-70">
                        {formatMsgClock(m.timestamp)}
                      </span>
                    </div>
                  );
                }
                const hasImage = Boolean(m.imageUrl);
                const showCaption =
                  Boolean(m.text) && !(hasImage && m.text === '[Photo uploaded]');
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[#6C7775]">
                      <span>{m.sender}</span>
                      <span className="font-mono text-[10px] opacity-75">
                        {formatMsgClock(m.timestamp)}
                      </span>
                    </div>
                    <div
                      className={`max-w-[85%] space-y-2 rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isMe
                          ? 'bg-[#0B3B2E] text-white dark:bg-[#7FE85B] dark:text-[#082213]'
                          : 'border border-[#E3E7E7] bg-[#F8FAFA] text-[#0E1715] dark:border-[#222D2C] dark:bg-[#182120] dark:text-[#EDF3F2]'
                      }`}
                    >
                      {hasImage && m.imageHidden && (
                        <div
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${
                            isMe
                              ? 'border-white/25 bg-black/20 text-white/90 dark:border-[#082213]/25 dark:bg-black/10 dark:text-[#082213]'
                              : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-300'
                          }`}
                        >
                          <EyeOff className="h-3.5 w-3.5 shrink-0" />
                          <span>Picture hidden by Escrow Admin</span>
                        </div>
                      )}
                      {hasImage && !m.imageHidden && m.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewImageUrl(m.imageUrl ?? null)}
                          className="block overflow-hidden rounded-xl border border-black/10 bg-black/5 dark:border-white/10"
                        >
                          <img
                            src={m.imageUrl}
                            alt="Uploaded chat attachment"
                            className="max-h-56 w-auto max-w-full rounded-xl object-contain"
                          />
                        </button>
                      )}
                      {showCaption && <div className="break-words">{m.text}</div>}
                    </div>
                  </div>
                );
              })}

              {counterpartyTyping && (
                <div className="flex items-center gap-2 text-xs italic text-[#5C6665] dark:text-[#8E9B98]">
                  <span>@{counterparty} is typing...</span>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {(trade.status === 'escrow_funded' || trade.status === 'payment_sent') && (
              <div className="flex flex-wrap gap-1.5 border-t border-[#ECEFEF] bg-[#FAFCFC] px-3.5 py-2 dark:border-[#202B2A] dark:bg-[#0F1515]">
                {quickReplies.map((qr) => (
                  <button
                    key={qr}
                    type="button"
                    disabled={busy}
                    onClick={() => handleQuickReply(qr)}
                    className="rounded-lg border border-[#DCE2E1] bg-white px-2.5 py-1 text-[11px] font-medium text-[#394241] hover:border-[#0B3B2E] hover:text-[#0B3B2E] dark:border-[#263130] dark:bg-[#151D1C] dark:text-[#C5D1CF] dark:hover:border-[#7FE85B] dark:hover:text-[#7FE85B]"
                  >
                    {qr}
                  </button>
                ))}
              </div>
            )}

            {pendingImage && (
              <div className="flex items-center justify-between gap-3 border-t border-[#ECEFEF] bg-[#F8FAFA] px-3.5 py-2 dark:border-[#202B2A] dark:bg-[#0F1515]">
                <div className="flex items-center gap-2.5">
                  <img
                    src={pendingImage}
                    alt="Pending upload preview"
                    className="h-12 w-12 rounded-lg border border-[#DCE2E1] object-cover dark:border-[#263130]"
                  />
                  <span className="text-xs font-medium text-[#394241] dark:text-[#C5D1CF]">
                    Picture ready to send
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingImage(null)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#DCE2E1] px-2 py-1 text-xs font-semibold text-[#5C6665] hover:bg-white dark:border-[#263130] dark:text-[#98A4A2] dark:hover:bg-[#1A2423]"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            )}

            <form
              onSubmit={handleSendMsg}
              className="flex items-center gap-2 border-t border-[#ECEFEF] p-3.5 dark:border-[#202B2A]"
            >
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleSelectImage}
                className="hidden"
              />
              <button
                type="button"
                title="Upload picture or screenshot"
                onClick={() => imageInputRef.current?.click()}
                disabled={busy || imageBusy || trade.status === 'completed' || trade.status === 'cancelled'}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DCE2E1] text-[#5C6665] hover:bg-[#F5F7F7] disabled:opacity-40 dark:border-[#263130] dark:text-[#98A4A2]"
              >
                <ImagePlus className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Attach payment receipt note"
                onClick={handleAttachReceipt}
                disabled={busy || trade.status === 'completed' || trade.status === 'cancelled'}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DCE2E1] text-[#5C6665] hover:bg-[#F5F7F7] disabled:opacity-40 dark:border-[#263130] dark:text-[#98A4A2]"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <input
                type="text"
                value={messageText}
                onChange={(e) => emitTypingChange(e.target.value)}
                placeholder={
                  pendingImage
                    ? 'Add an optional caption for this picture...'
                    : `Message @${counterparty} or share payment info...`
                }
                className="h-10 flex-1 rounded-xl border border-[#DCE2E1] bg-white px-3.5 text-sm text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
              />
              <button
                type="submit"
                disabled={busy || imageBusy || (!messageText.trim() && !pendingImage)}
                aria-label="Send message"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B3B2E] text-white hover:bg-[#082B21] disabled:opacity-50 dark:bg-[#7FE85B] dark:text-[#082213]"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {previewImageUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-2xl bg-[#0E1715] p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              aria-label="Close picture preview"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={previewImageUrl}
              alt="Full size chat picture"
              className="max-h-[85vh] w-auto max-w-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
