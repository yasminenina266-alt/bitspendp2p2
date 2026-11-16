import { CreditCard, Eye, EyeOff, Lock, Plus, ShoppingBag, Unlock } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { api } from '../api';
import { CRYPTO_ASSETS } from '../constants/market';
import type { CryptoAsset, MarketPrices, UserAccount, VirtualCard } from '../types';
import { CoinIcon } from './CoinIcon';

interface CryptoCardViewProps {
  prices: MarketPrices;
  user: UserAccount | null;
  cards: VirtualCard[];
  onRequireAuth: () => void;
  onCardUpdated: (card: VirtualCard, updatedUser: UserAccount) => void;
}

export function CryptoCardView({
  prices,
  user,
  cards,
  onRequireAuth,
  onCardUpdated,
}: CryptoCardViewProps) {
  const [label, setLabel] = useState('Private Online Card');
  const [type, setType] = useState<'disposable' | 'reloadable'>('reloadable');
  const [fundingCrypto, setFundingCrypto] = useState<CryptoAsset>('XMR');
  const [amountUsd, setAmountUsd] = useState(100);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  const spotUsd = prices.usdPrices[fundingCrypto] ?? 1;
  const cryptoCost = (amountUsd * 1.015) / spotUsd;

  const handleIssue = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await api.createCard({ label, type, fundingCrypto, amountUsd });
      onCardUpdated(res.card, res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to issue card');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCardAction = async (
    cardId: string,
    action: 'toggle_freeze' | 'spend' | 'topup'
  ) => {
    setError('');
    try {
      const res = await api.cardAction(cardId, {
        action,
        amountUsd: action === 'spend' ? 18.5 : 50,
        merchant: action === 'spend' ? 'Proton / Cloud Hosting' : undefined,
      });
      onCardUpdated(res.card, res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-8">
      <div>
        <h1 className="font-display text-xl font-bold text-[#0E1715] sm:text-2xl dark:text-white">
          No-KYC Virtual Crypto Cards
        </h1>
        <p className="mt-1 text-sm text-[#5C6665] dark:text-[#98A4A2]">
          Issue instant prepaid virtual Visa cards funded directly with XMR, BTC, ETH, or USDT. Zero ID verification.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Card Configurator */}
        <form
          onSubmit={handleIssue}
          className="space-y-5 rounded-2xl border border-[#E3E7E7] bg-white p-4 sm:p-6 lg:col-span-5 dark:border-[#202B2A] dark:bg-[#131A1A]"
        >
          <h2 className="font-display text-base font-bold text-[#0E1715] dark:text-white">
            Issue New Card
          </h2>

          <div>
            <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
              Card Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-11 w-full rounded-xl border border-[#DCE2E1] bg-white px-3.5 text-sm text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('reloadable')}
              className={`rounded-xl border px-3 py-2.5 text-left text-xs ${
                type === 'reloadable'
                  ? 'border-[#0B3B2E] bg-[#EEF6F2] font-bold text-[#0E1715] dark:border-[#7FE85B] dark:bg-[#152B20] dark:text-white'
                  : 'border-[#DCE2E1] text-[#5C6665] dark:border-[#263130]'
              }`}
            >
              <div>Reloadable</div>
              <div className="font-normal opacity-75">Top up anytime</div>
            </button>
            <button
              type="button"
              onClick={() => setType('disposable')}
              className={`rounded-xl border px-3 py-2.5 text-left text-xs ${
                type === 'disposable'
                  ? 'border-[#0B3B2E] bg-[#EEF6F2] font-bold text-[#0E1715] dark:border-[#7FE85B] dark:bg-[#152B20] dark:text-white'
                  : 'border-[#DCE2E1] text-[#5C6665] dark:border-[#263130]'
              }`}
            >
              <div>Single-Use</div>
              <div className="font-normal opacity-75">Disposable privacy</div>
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
              Fund With Cryptocurrency
            </label>
            <div className="flex items-center gap-2.5 rounded-xl border border-[#DCE2E1] bg-white px-3.5 h-11 dark:border-[#263130] dark:bg-[#0D1313]">
              <CoinIcon symbol={fundingCrypto} size={20} />
              <select
                value={fundingCrypto}
                onChange={(e) => setFundingCrypto(e.target.value as CryptoAsset)}
                className="w-full bg-transparent text-sm font-semibold text-[#0E1715] focus:outline-none dark:text-white"
              >
                {CRYPTO_ASSETS.map((c) => (
                  <option key={c.symbol} value={c.symbol} className="dark:bg-[#131A1A]">
                    {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
              Card Denomination (USD)
            </label>
            <div className="grid grid-cols-4 gap-2 mb-2.5">
              {[25, 50, 100, 250].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmountUsd(preset)}
                  className={`rounded-lg border py-2 font-mono text-xs font-semibold ${
                    amountUsd === preset
                      ? 'border-[#0B3B2E] bg-[#0B3B2E] text-white dark:border-[#7FE85B] dark:bg-[#7FE85B] dark:text-[#082213]'
                      : 'border-[#DCE2E1] text-[#394241] dark:border-[#263130] dark:text-[#C5D1CF]'
                  }`}
                >
                  ${preset}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={10}
              max={10000}
              value={amountUsd}
              onChange={(e) => setAmountUsd(Number(e.target.value))}
              className="h-11 w-full rounded-xl border border-[#DCE2E1] bg-white px-3.5 font-mono text-sm font-bold text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
            />
          </div>

          <div className="rounded-xl border border-[#E3E7E7] bg-[#F8FAFA] p-3.5 text-xs dark:border-[#202B2A] dark:bg-[#0F1515]">
            <div className="flex items-center justify-between text-[#5C6665] dark:text-[#98A4A2]">
              <span>Required {fundingCrypto} (incl. 1.5% fee)</span>
              <span className="font-mono font-bold text-[#0E1715] dark:text-white">
                {cryptoCost.toFixed(fundingCrypto === 'USDT' || fundingCrypto === 'USDC' ? 2 : 5)}{' '}
                {fundingCrypto}
              </span>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7FE85B] py-3 text-sm font-semibold text-[#082213] hover:bg-[#6AD845] disabled:opacity-60 transition-colors"
          >
            <CreditCard className="h-4 w-4" />
            <span>{submitting ? 'Issuing Card...' : user ? 'Issue Virtual Card' : 'Register / Sign in to Issue'}</span>
          </button>
        </form>

        {/* Active Virtual Cards */}
        <div className="space-y-4 lg:col-span-7">
          {cards.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#D3DADA] bg-white p-8 text-center dark:border-[#263130] dark:bg-[#131A1A]">
              <CreditCard className="h-9 w-9 text-[#8A9593]" />
              <h3 className="mt-3 font-display text-base font-bold text-[#0E1715] dark:text-white">
                No virtual cards issued yet
              </h3>
              <p className="mt-1 max-w-sm text-sm text-[#5C6665] dark:text-[#98A4A2]">
                Configure a disposable or reloadable privacy card on the left and fund it instantly with XMR or BTC.
              </p>
            </div>
          ) : (
            cards.map((card) => {
              const revealed = !!revealedIds[card.id];
              const formattedPan = revealed
                ? card.fullNumber.replace(/(.{4})/g, '$1 ').trim()
                : `•••• •••• •••• ${card.last4}`;

              return (
                <div
                  key={card.id}
                  className="rounded-2xl border border-[#E3E7E7] bg-white p-4 sm:p-5 dark:border-[#202B2A] dark:bg-[#131A1A]"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    {/* Card Visual */}
                    <div
                      className={`w-full sm:w-72 rounded-xl p-4 text-white ${
                        card.frozen
                          ? 'bg-[#3A4443]'
                          : 'bg-gradient-to-br from-[#0B3B2E] via-[#134D3C] to-[#0A251D]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs opacity-80">
                        <span className="font-display font-bold tracking-[0.08em]">OOSAB</span>
                        <span>{card.type}</span>
                      </div>
                      <div className="mt-5 font-mono text-base font-semibold tracking-wider">
                        {formattedPan}
                      </div>
                      <div className="mt-4 flex items-end justify-between text-xs">
                        <div>
                          <div className="opacity-70 text-[10px]">EXP / CVV</div>
                          <div className="font-mono font-semibold">
                            {card.expiry} · {revealed ? card.cvv : '•••'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="opacity-70 text-[10px]">BALANCE</div>
                          <div className="font-mono text-sm font-bold text-[#7FE85B]">
                            ${card.balanceUsd.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Controls */}
                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="font-display text-base font-bold text-[#0E1715] dark:text-white">
                            {card.label}
                          </h3>
                          <span className="font-mono text-xs text-[#5C6665] dark:text-[#98A4A2]">
                            {card.frozen ? 'Frozen' : 'Active'}
                          </span>
                        </div>
                        <p className="text-xs text-[#5C6665] dark:text-[#8E9B98]">
                          Funded via {card.fundingCrypto} · {card.id}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedIds((p) => ({ ...p, [card.id]: !p[card.id] }))
                          }
                          className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-[#DCE2E1] px-3 py-1.5 text-xs font-semibold text-[#1E2726] hover:bg-[#F5F7F7] dark:border-[#263130] dark:text-[#DCE4E3] dark:hover:bg-[#1C2625]"
                        >
                          {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          <span>{revealed ? 'Hide PAN' : 'Reveal PAN'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCardAction(card.id, 'toggle_freeze')}
                          className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-[#DCE2E1] px-3 py-1.5 text-xs font-semibold text-[#1E2726] hover:bg-[#F5F7F7] dark:border-[#263130] dark:text-[#DCE4E3] dark:hover:bg-[#1C2625]"
                        >
                          {card.frozen ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                          <span>{card.frozen ? 'Unfreeze' : 'Freeze'}</span>
                        </button>

                        {card.type === 'reloadable' && (
                          <button
                            type="button"
                            onClick={() => handleCardAction(card.id, 'topup')}
                            className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-[#DCE2E1] px-3 py-1.5 text-xs font-semibold text-[#1E2726] hover:bg-[#F5F7F7] dark:border-[#263130] dark:text-[#DCE4E3] dark:hover:bg-[#1C2625]"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Top up $50</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleCardAction(card.id, 'spend')}
                          className={`inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-[#0B3B2E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#082B21] dark:bg-[#7FE85B] dark:text-[#082213] ${
                            card.type === 'disposable' ? 'col-span-2 sm:col-span-1' : ''
                          }`}
                        >
                          <ShoppingBag className="h-3.5 w-3.5" />
                          <span>Test $18.50 Spend</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card Transactions */}
                  <div className="mt-4 border-t border-[#ECEFEF] pt-3 dark:border-[#202B2A]">
                    <div className="text-xs font-semibold text-[#5C6665] dark:text-[#8E9B98] mb-2">
                      Recent Card Activity
                    </div>
                    <div className="space-y-1.5">
                      {card.transactions.slice(0, 4).map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-[#1E2726] dark:text-[#DCE4E3]">
                            {tx.merchant}
                          </span>
                          <span
                            className={`font-mono font-semibold tabular-nums ${
                              tx.amountUsd >= 0
                                ? 'text-[#0D6832] dark:text-[#7FE85B]'
                                : 'text-[#0E1715] dark:text-white'
                            }`}
                          >
                            {tx.amountUsd >= 0 ? `+$${tx.amountUsd.toFixed(2)}` : `-$${Math.abs(tx.amountUsd).toFixed(2)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
