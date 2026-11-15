import { ArrowDownUp, CheckCircle2, RefreshCw } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { api } from '../api';
import { CRYPTO_ASSETS, formatCrypto } from '../constants/market';
import type { CryptoAsset, MarketPrices, SwapOrder, UserAccount } from '../types';
import { CoinIcon } from './CoinIcon';

interface SwapViewProps {
  prices: MarketPrices;
  user: UserAccount | null;
  swaps: SwapOrder[];
  onRequireAuth: () => void;
  onRefreshPrices: () => void;
  onSwapCreated: (swap: SwapOrder, updatedUser: UserAccount) => void;
}

export function SwapView({
  prices,
  user,
  swaps,
  onRequireAuth,
  onRefreshPrices,
  onSwapCreated,
}: SwapViewProps) {
  const [fromCrypto, setFromCrypto] = useState<CryptoAsset>('BTC');
  const [toCrypto, setToCrypto] = useState<CryptoAsset>('XMR');
  const [fromAmount, setFromAmount] = useState('0.025');
  const [mode, setMode] = useState<'floating' | 'fixed'>('floating');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [latestSwap, setLatestSwap] = useState<SwapOrder | null>(null);

  const fromUsd = prices.usdPrices[fromCrypto] ?? 1;
  const toUsd = prices.usdPrices[toCrypto] ?? 1;
  const feePct = mode === 'fixed' ? 0.009 : 0.004;
  const rate = (fromUsd / toUsd) * (1 - feePct);
  const parsedAmount = Number(fromAmount) || 0;
  const receiveAmount = parsedAmount * rate;

  const handleFlip = () => {
    setFromCrypto(toCrypto);
    setToCrypto(fromCrypto);
  };

  const handleSwap = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await api.createSwap({
        fromCrypto,
        toCrypto,
        fromAmount: parsedAmount,
        mode,
        destinationAddress,
      });
      setLatestSwap(res.swap);
      onSwapCreated(res.swap, res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Swap failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1060px] space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-[#0E1715] sm:text-2xl dark:text-white">
            Instant Cross-Chain Swap
          </h1>
          <p className="mt-1 text-sm text-[#5C6665] dark:text-[#98A4A2]">
            Convert BTC, XMR, ETH, USDT, LTC, and SOL directly without accounts or identity checks.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefreshPrices}
          className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border border-[#DCE2E1] bg-white px-3.5 py-2 text-xs font-semibold text-[#1E2726] hover:bg-[#F5F7F7] sm:w-auto dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#DCE4E3]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Rates: {prices.source}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Swap Form */}
        <form
          onSubmit={handleSwap}
          className="space-y-5 rounded-2xl border border-[#E3E7E7] bg-white p-4 sm:p-6 lg:col-span-7 dark:border-[#202B2A] dark:bg-[#131A1A]"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs font-semibold text-[#5C6665] dark:text-[#98A4A2]">
              Rate Mode
            </span>
            <div className="grid w-full grid-cols-2 rounded-xl border border-[#DCE2E1] bg-[#F5F7F7] p-1 sm:inline-flex sm:w-auto dark:border-[#263130] dark:bg-[#0D1313]">
              <button
                type="button"
                onClick={() => setMode('floating')}
                className={`rounded-lg px-2.5 py-2 text-xs font-semibold sm:px-3 sm:py-1.5 ${
                  mode === 'floating'
                    ? 'bg-white text-[#0E1715] shadow-xs dark:bg-[#1C2625] dark:text-white'
                    : 'text-[#5C6665]'
                }`}
              >
                Floating (0.4% fee)
              </button>
              <button
                type="button"
                onClick={() => setMode('fixed')}
                className={`rounded-lg px-2.5 py-2 text-xs font-semibold sm:px-3 sm:py-1.5 ${
                  mode === 'fixed'
                    ? 'bg-white text-[#0E1715] shadow-xs dark:bg-[#1C2625] dark:text-white'
                    : 'text-[#5C6665]'
                }`}
              >
                Fixed Rate (0.9% fee)
              </button>
            </div>
          </div>

          {/* Send Box */}
          <div className="rounded-xl border border-[#E3E7E7] bg-[#F8FAFA] p-4 dark:border-[#202B2A] dark:bg-[#0F1515]">
            <div className="flex items-center justify-between text-xs text-[#5C6665] dark:text-[#98A4A2] mb-2">
              <span>You send</span>
              {user && (
                <button
                  type="button"
                  onClick={() => setFromAmount(String(user.balances[fromCrypto] ?? 0))}
                  className="font-mono hover:underline"
                >
                  Bal: {formatCrypto(user.balances[fromCrypto] ?? 0, fromCrypto)}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                step="any"
                min="0"
                required
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="min-w-0 flex-1 bg-transparent font-mono text-xl font-bold tabular-nums text-[#0E1715] focus:outline-none sm:text-2xl dark:text-white"
              />
              <div className="flex items-center gap-2 rounded-xl border border-[#DCE2E1] bg-white px-3 py-2 dark:border-[#263130] dark:bg-[#131A1A] shrink-0">
                <CoinIcon symbol={fromCrypto} size={20} />
                <select
                  aria-label="Send cryptocurrency"
                  value={fromCrypto}
                  onChange={(e) => {
                    const next = e.target.value as CryptoAsset;
                    if (next === toCrypto) setToCrypto(fromCrypto);
                    setFromCrypto(next);
                  }}
                  className="bg-transparent text-sm font-bold text-[#0E1715] focus:outline-none dark:text-white"
                >
                  {CRYPTO_ASSETS.map((c) => (
                    <option key={c.symbol} value={c.symbol} className="dark:bg-[#131A1A]">
                      {c.symbol}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-1 font-mono text-xs text-[#64706E] dark:text-[#8E9B98]">
              ≈ ${(parsedAmount * fromUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </div>
          </div>

          {/* Flip Button */}
          <div className="flex justify-center -my-2 relative z-10">
            <button
              type="button"
              onClick={handleFlip}
              aria-label="Flip swap assets"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DCE2E1] bg-white text-[#0E1715] hover:bg-[#F5F7F7] dark:border-[#263130] dark:bg-[#182120] dark:text-white"
            >
              <ArrowDownUp className="h-4 w-4" />
            </button>
          </div>

          {/* Receive Box */}
          <div className="rounded-xl border border-[#E3E7E7] bg-[#F8FAFA] p-4 dark:border-[#202B2A] dark:bg-[#0F1515]">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-1 text-xs text-[#5C6665] dark:text-[#98A4A2]">
              <span>You receive (estimated)</span>
              <span className="font-mono">
                1 {fromCrypto} ≈ {rate.toFixed(6)} {toCrypto}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1 truncate font-mono text-xl font-bold tabular-nums text-[#0B3B2E] sm:text-2xl dark:text-[#7FE85B]">
                {receiveAmount.toFixed(toCrypto === 'USDT' || toCrypto === 'USDC' ? 2 : 5)}
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-[#DCE2E1] bg-white px-3 py-2 dark:border-[#263130] dark:bg-[#131A1A] shrink-0">
                <CoinIcon symbol={toCrypto} size={20} />
                <select
                  aria-label="Receive cryptocurrency"
                  value={toCrypto}
                  onChange={(e) => {
                    const next = e.target.value as CryptoAsset;
                    if (next === fromCrypto) setFromCrypto(toCrypto);
                    setToCrypto(next);
                  }}
                  className="bg-transparent text-sm font-bold text-[#0E1715] focus:outline-none dark:text-white"
                >
                  {CRYPTO_ASSETS.map((c) => (
                    <option key={c.symbol} value={c.symbol} className="dark:bg-[#131A1A]">
                      {c.symbol}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
              Destination {toCrypto} Wallet Address (optional for internal BitSpend wallet)
            </label>
            <input
              type="text"
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              placeholder={`Leave blank to credit your BitSpend ${toCrypto} balance`}
              className="h-11 w-full rounded-xl border border-[#DCE2E1] bg-white px-3.5 font-mono text-xs text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || parsedAmount <= 0}
            className="w-full rounded-xl bg-[#7FE85B] py-3.5 text-sm font-semibold text-[#082213] hover:bg-[#6AD845] disabled:opacity-60 transition-colors"
          >
            {submitting
              ? 'Settling Swap...'
              : user
                ? `Swap ${fromCrypto} to ${toCrypto}`
                : 'Register / Sign in to Swap'}
          </button>
        </form>

        {/* Right: Latest Receipt & History */}
        <div className="space-y-5 lg:col-span-5">
          {latestSwap && (
            <div className="rounded-2xl border border-[#C6E8CF] bg-[#F2FAF4] p-5 dark:border-[#1E3B2B] dark:bg-[#112219]">
              <div className="flex items-center gap-2 text-sm font-bold text-[#0D6832] dark:text-[#7FE85B]">
                <CheckCircle2 className="h-4 w-4" />
                <span>Swap {latestSwap.id} Completed</span>
              </div>
              <p className="mt-2 font-mono text-sm font-semibold text-[#0E1715] dark:text-white">
                {formatCrypto(latestSwap.fromAmount, latestSwap.fromCrypto)} →{' '}
                {formatCrypto(latestSwap.toAmount, latestSwap.toCrypto)}
              </p>
              <p className="mt-1 font-mono text-xs text-[#5C6665] dark:text-[#98A4A2] break-all">
                Destination: {latestSwap.destinationAddress}
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-[#E3E7E7] bg-white p-5 dark:border-[#202B2A] dark:bg-[#131A1A]">
            <h2 className="font-display text-base font-bold text-[#0E1715] dark:text-white">
              Recent Swaps
            </h2>
            {swaps.length === 0 ? (
              <p className="mt-3 text-sm text-[#5C6665] dark:text-[#8E9B98]">
                {user
                  ? 'No swaps executed yet. Convert any supported crypto instantaneously.'
                  : 'Sign in or register with a username to track your instant swaps.'}
              </p>
            ) : (
              <div className="mt-3 divide-y divide-[#ECEFEF] dark:divide-[#202B2A]">
                {swaps.slice(0, 6).map((sw) => (
                  <div key={sw.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-mono text-xs font-bold text-[#0E1715] dark:text-white">
                        {formatCrypto(sw.fromAmount, sw.fromCrypto)} →{' '}
                        {formatCrypto(sw.toAmount, sw.toCrypto)}
                      </div>
                      <div className="text-[11px] text-[#64706E] dark:text-[#8E9B98]">
                        {sw.id} · {sw.mode} rate
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[#0D6832] dark:text-[#7FE85B]">
                      Settled
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
