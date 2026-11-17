import { CheckCircle2, Coins, DollarSign, ShieldAlert, Sparkles, Wallet, X } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { api } from '../api';
import { CRYPTO_ASSETS, formatCrypto } from '../constants/market';
import type { CryptoAsset, MarketPrices, UserAccount } from '../types';
import { CoinIcon } from './CoinIcon';

interface SecretCreditModalProps {
  user: UserAccount | null;
  prices: MarketPrices;
  onClose: () => void;
  onRequireAuth: (mode: 'login' | 'register') => void;
  onUserUpdated: (user: UserAccount) => void;
  onOpenWallet: () => void;
}

const USD_PRESETS = [100, 500, 1000, 5000, 10000];

export function SecretCreditModal({
  user,
  prices,
  onClose,
  onRequireAuth,
  onUserUpdated,
  onOpenWallet,
}: SecretCreditModalProps) {
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoAsset>('BTC');
  const [inputMode, setInputMode] = useState<'usd' | 'crypto'>('usd');
  const [amountInput, setAmountInput] = useState<string>('1000');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lastCredit, setLastCredit] = useState<{
    crypto: CryptoAsset;
    creditedCrypto: number;
    usdValue: number;
  } | null>(null);

  const spotUsd = prices.usdPrices[selectedCrypto] ?? 1;
  const currentBalance = user?.balances[selectedCrypto] ?? 0;

  const parsedInput = useMemo(() => {
    const n = Number(amountInput);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [amountInput]);

  const calculated = useMemo(() => {
    if (parsedInput <= 0 || spotUsd <= 0) {
      return { cryptoAmount: 0, usdAmount: 0 };
    }
    if (inputMode === 'usd') {
      const cryptoAmount = Number((parsedInput / spotUsd).toFixed(8));
      const usdAmount = Number(parsedInput.toFixed(2));
      return { cryptoAmount, usdAmount };
    }
    const cryptoAmount = Number(parsedInput.toFixed(8));
    const usdAmount = Number((cryptoAmount * spotUsd).toFixed(2));
    return { cryptoAmount, usdAmount };
  }, [parsedInput, inputMode, spotUsd]);

  const projectedBalance = currentBalance + calculated.cryptoAmount;
  const projectedUsd = projectedBalance * spotUsd;

  const cryptoPresets = useMemo(() => {
    if (selectedCrypto === 'BTC') return ['0.01', '0.05', '0.1', '0.5', '1'];
    if (selectedCrypto === 'ETH') return ['0.1', '0.5', '1', '5', '10'];
    if (selectedCrypto === 'XMR' || selectedCrypto === 'SOL' || selectedCrypto === 'LTC') {
      return ['1', '5', '10', '25', '100'];
    }
    return ['100', '500', '1000', '5000', '10000'];
  }, [selectedCrypto]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLastCredit(null);

    if (!user) {
      onClose();
      onRequireAuth('register');
      return;
    }

    if (parsedInput <= 0) {
      setError('Enter a valid amount greater than zero.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.creditWallet({
        crypto: selectedCrypto,
        mode: inputMode,
        amount: parsedInput,
      });
      onUserUpdated(res.user);
      setLastCredit({
        crypto: selectedCrypto,
        creditedCrypto: res.creditedCrypto,
        usdValue: res.usdValue,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to credit wallet balance.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-xs sm:items-center sm:p-4">
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[#DCE2E1] bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6 dark:border-[#243230] dark:bg-[#121918]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B3B2E] text-[#7FE85B] dark:bg-[#183828]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold text-[#0E1715] dark:text-white">
                  Vault Balance Credit
                </h2>
                <span className="rounded-md bg-[#E8F8EE] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#0B3B2E] dark:bg-[#152D21] dark:text-[#7FE85B]">
                  Instant
                </span>
              </div>
              <p className="text-xs text-[#5C6665] dark:text-[#8E9B98]">
                Auto-calculated at live market rates and credited straight to your profile
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close vault menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5C6665] hover:bg-[#F2F5F5] hover:text-[#0E1715] dark:text-[#8E9B98] dark:hover:bg-[#1C2625] dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!user ? (
          <div className="mt-5 rounded-xl border border-[#DCE2E1] bg-[#F8FAFA] p-5 text-center dark:border-[#222E2C] dark:bg-[#0E1413]">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF6F2] text-[#0B3B2E] dark:bg-[#152B20] dark:text-[#7FE85B]">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <h3 className="mt-3 font-display text-base font-bold text-[#0E1715] dark:text-white">
              Sign in to credit your profile
            </h3>
            <p className="mt-1 text-xs text-[#5C6665] dark:text-[#8E9B98]">
              You need an active OOSAB profile so calculated crypto or dollar funds can be credited to your wallet.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequireAuth('login');
                }}
                className="rounded-xl border border-[#DCE2E1] bg-white px-4 py-2.5 text-sm font-semibold text-[#0E1715] hover:bg-[#F3F5F5] dark:border-[#263130] dark:bg-[#151E1D] dark:text-white"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequireAuth('register');
                }}
                className="rounded-xl bg-[#7FE85B] px-4 py-2.5 text-sm font-semibold text-[#082213] hover:bg-[#6AD845]"
              >
                Register Free
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Step 1: Choose Crypto Asset */}
            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <label className="font-semibold text-[#1E2726] dark:text-[#DCE4E3]">
                  Select Cryptocurrency
                </label>
                <span className="font-mono text-[#5C6665] dark:text-[#8E9B98]">
                  1 {selectedCrypto} = $
                  {spotUsd.toLocaleString('en-US', {
                    minimumFractionDigits: spotUsd < 10 ? 2 : 0,
                    maximumFractionDigits: spotUsd < 10 ? 4 : 2,
                  })}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {CRYPTO_ASSETS.map((coin) => {
                  const active = selectedCrypto === coin.symbol;
                  return (
                    <button
                      key={coin.symbol}
                      type="button"
                      onClick={() => {
                        setSelectedCrypto(coin.symbol);
                        setLastCredit(null);
                      }}
                      className={`flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors ${
                        active
                          ? 'border-[#0B3B2E] bg-[#EEF6F2] text-[#0B3B2E] dark:border-[#7FE85B] dark:bg-[#162C22] dark:text-[#7FE85B]'
                          : 'border-[#DCE2E1] bg-[#F8FAFA] text-[#394241] hover:bg-[#EFF3F2] dark:border-[#24302F] dark:bg-[#0E1413] dark:text-[#C8D2D0] dark:hover:bg-[#192322]'
                      }`}
                    >
                      <CoinIcon symbol={coin.symbol} size={20} />
                      <span>{coin.symbol}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Mode Switch (Dollars USD vs Crypto Amount) */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-[#1E2726] dark:text-[#DCE4E3]">
                Credit Input Mode
              </label>
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#DCE2E1] bg-[#F4F6F6] p-1 dark:border-[#24302F] dark:bg-[#0E1413]">
                <button
                  type="button"
                  onClick={() => {
                    if (inputMode !== 'usd') {
                      setInputMode('usd');
                      setAmountInput(calculated.usdAmount > 0 ? String(calculated.usdAmount) : '1000');
                      setLastCredit(null);
                    }
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    inputMode === 'usd'
                      ? 'bg-white text-[#0E1715] shadow-xs dark:bg-[#1A2523] dark:text-[#7FE85B]'
                      : 'text-[#5C6665] hover:text-[#0E1715] dark:text-[#8E9B98] dark:hover:text-white'
                  }`}
                >
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>Dollars (USD)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (inputMode !== 'crypto') {
                      setInputMode('crypto');
                      setAmountInput(
                        calculated.cryptoAmount > 0 ? String(calculated.cryptoAmount) : '0.1'
                      );
                      setLastCredit(null);
                    }
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    inputMode === 'crypto'
                      ? 'bg-white text-[#0E1715] shadow-xs dark:bg-[#1A2523] dark:text-[#7FE85B]'
                      : 'text-[#5C6665] hover:text-[#0E1715] dark:text-[#8E9B98] dark:hover:text-white'
                  }`}
                >
                  <Coins className="h-3.5 w-3.5" />
                  <span>Crypto ({selectedCrypto})</span>
                </button>
              </div>
            </div>

            {/* Step 3: Amount + Presets */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <label
                  htmlFor="secret-credit-amount"
                  className="font-semibold text-[#1E2726] dark:text-[#DCE4E3]"
                >
                  {inputMode === 'usd'
                    ? `Dollar Amount to Convert to ${selectedCrypto}`
                    : `${selectedCrypto} Amount to Credit`}
                </label>
                <span className="text-[#5C6665] dark:text-[#8E9B98]">
                  Current: {formatCrypto(currentBalance, selectedCrypto)}
                </span>
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm font-semibold text-[#5C6665] dark:text-[#8E9B98]">
                  {inputMode === 'usd' ? '$' : selectedCrypto}
                </span>
                <input
                  id="secret-credit-amount"
                  type="number"
                  step="any"
                  min="0"
                  value={amountInput}
                  onChange={(e) => {
                    setAmountInput(e.target.value);
                    setLastCredit(null);
                  }}
                  placeholder={inputMode === 'usd' ? '1000.00' : '0.25'}
                  className={`h-11 w-full rounded-xl border border-[#DCE2E1] bg-white pr-20 font-mono text-sm font-semibold text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#0E1413] dark:text-white dark:focus:border-[#7FE85B] ${
                    inputMode === 'usd' ? 'pl-8' : 'pl-16'
                  }`}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-[#5C6665] dark:text-[#8E9B98]">
                  {inputMode === 'usd' ? 'USD' : selectedCrypto}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {inputMode === 'usd'
                  ? USD_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setAmountInput(String(preset));
                          setLastCredit(null);
                        }}
                        className="rounded-lg border border-[#DCE2E1] bg-[#F8FAFA] px-2.5 py-1 font-mono text-xs font-medium text-[#1E2726] hover:border-[#0B3B2E] hover:bg-[#EEF6F2] dark:border-[#24302F] dark:bg-[#17201F] dark:text-[#DCE4E3] dark:hover:border-[#7FE85B]"
                      >
                        +${preset.toLocaleString('en-US')}
                      </button>
                    ))
                  : cryptoPresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setAmountInput(preset);
                          setLastCredit(null);
                        }}
                        className="rounded-lg border border-[#DCE2E1] bg-[#F8FAFA] px-2.5 py-1 font-mono text-xs font-medium text-[#1E2726] hover:border-[#0B3B2E] hover:bg-[#EEF6F2] dark:border-[#24302F] dark:bg-[#17201F] dark:text-[#DCE4E3] dark:hover:border-[#7FE85B]"
                      >
                        +{preset} {selectedCrypto}
                      </button>
                    ))}
              </div>
            </div>

            {/* Automated Live Calculation Preview */}
            <div className="rounded-xl border border-[#DCE2E1] bg-[#F8FAFA] p-4 dark:border-[#222E2C] dark:bg-[#0E1413]">
              <div className="flex items-center justify-between text-xs text-[#5C6665] dark:text-[#8E9B98]">
                <span>Calculated Credit</span>
                <span className="font-mono font-semibold text-[#0D6832] dark:text-[#7FE85B]">
                  +{calculated.cryptoAmount.toLocaleString('en-US', { maximumFractionDigits: 8 })}{' '}
                  {selectedCrypto}
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs text-[#5C6665] dark:text-[#8E9B98]">
                <span>Dollar Equivalent</span>
                <span className="font-mono font-semibold text-[#0E1715] dark:text-white">
                  +$
                  {calculated.usdAmount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  USD
                </span>
              </div>
              <div className="my-2.5 border-t border-[#E3E7E7] dark:border-[#202B2A]" />
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#1E2726] dark:text-[#DCE4E3]">
                  New {selectedCrypto} Balance ({user.username})
                </span>
                <div className="text-right font-mono">
                  <div className="font-bold text-[#0E1715] dark:text-white">
                    {projectedBalance.toLocaleString('en-US', { maximumFractionDigits: 8 })}{' '}
                    {selectedCrypto}
                  </div>
                  <div className="text-[11px] text-[#5C6665] dark:text-[#8E9B98]">
                    ≈ $
                    {projectedUsd.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    USD
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </div>
            )}

            {lastCredit && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[#8CE89E] bg-[#EAFBF0] px-3.5 py-3 text-xs text-[#0B3B2E] dark:border-[#1E4D33] dark:bg-[#112A1D] dark:text-[#7FE85B]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>
                    Credited{' '}
                    <strong className="font-mono">
                      +{lastCredit.creditedCrypto.toLocaleString('en-US', { maximumFractionDigits: 8 })}{' '}
                      {lastCredit.crypto}
                    </strong>{' '}
                    ($
                    {lastCredit.usdValue.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    ) to @{user.username}.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenWallet();
                  }}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#0B3B2E] px-2.5 py-1.5 font-semibold text-white hover:bg-[#135241] dark:bg-[#7FE85B] dark:text-[#082213]"
                >
                  <Wallet className="h-3.5 w-3.5" />
                  <span>Wallet</span>
                </button>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-xl border border-[#DCE2E1] px-4 text-sm font-semibold text-[#1E2726] hover:bg-[#F5F7F7] dark:border-[#263130] dark:text-[#DCE4E3] dark:hover:bg-[#1A2423]"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={submitting || calculated.cryptoAmount <= 0}
                className="h-10 rounded-xl bg-[#7FE85B] px-5 text-sm font-semibold text-[#082213] hover:bg-[#6AD845] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? 'Crediting...'
                  : `Credit +${calculated.cryptoAmount.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${selectedCrypto}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
