import {
  Award,
  CheckCircle2,
  Coins,
  Database,
  DollarSign,
  Download,
  ExternalLink,
  FileJson,
  MessageSquarePlus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Upload,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { api, type DirectoryUser, type TablesSummaryResponse } from '../api';
import {
  CRYPTO_ASSETS,
  FIAT_CURRENCIES,
  PAYMENT_METHODS,
  formatCrypto,
} from '../constants/market';
import type {
  CryptoAsset,
  FiatCurrency,
  MarketPrices,
  TraderProfile,
  UserAccount,
} from '../types';
import { CoinIcon } from './CoinIcon';

interface SecretCreditModalProps {
  user: UserAccount | null;
  prices: MarketPrices;
  onClose: () => void;
  onRequireAuth: (mode: 'login' | 'register') => void;
  onUserUpdated: (user: UserAccount) => void;
  onProfileUpdated?: (trader: TraderProfile) => void;
  onDataSynced?: () => void;
  onNavigateProfile?: (username: string) => void;
  onOpenWallet: () => void;
}

const USD_PRESETS = [100, 500, 1000, 5000, 10000];

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function SecretCreditModal({
  user,
  prices,
  onClose,
  onRequireAuth,
  onUserUpdated,
  onProfileUpdated,
  onDataSynced,
  onNavigateProfile,
  onOpenWallet,
}: SecretCreditModalProps) {
  const [vaultTab, setVaultTab] = useState<'credit' | 'reputation' | 'tables'>('credit');
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [targetUsername, setTargetUsername] = useState<string>(user?.username ?? '');
  const [userSearch, setUserSearch] = useState('');

  // Saved Tables tab state
  const [tablesSummary, setTablesSummary] = useState<TablesSummaryResponse | null>(null);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [tablesStatus, setTablesStatus] = useState('');
  const [tablesError, setTablesError] = useState('');
  const importInputRef = useRef<HTMLInputElement | null>(null);

  // Balance Credit tab state
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoAsset>('BTC');
  const [inputMode, setInputMode] = useState<'usd' | 'crypto'>('usd');
  const [amountInput, setAmountInput] = useState<string>('1000');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lastCredit, setLastCredit] = useState<{
    target: string;
    crypto: CryptoAsset;
    creditedCrypto: number;
    usdValue: number;
  } | null>(null);

  // Profile Trades & Feedback tab state
  const [addTradesCount, setAddTradesCount] = useState('5');
  const [ratingPct, setRatingPct] = useState('100');
  const [avgReleaseMinutes, setAvgReleaseMinutes] = useState('3');
  const [addVolumeUsd, setAddVolumeUsd] = useState('');
  const [verifiedToggle, setVerifiedToggle] = useState(true);

  const [includeTradeRecord, setIncludeTradeRecord] = useState(true);
  const [recAsset, setRecAsset] = useState<CryptoAsset>('BTC');
  const [recSide, setRecSide] = useState<'Sold' | 'Bought'>('Sold');
  const [recCryptoAmt, setRecCryptoAmt] = useState('0.085');
  const [recFiatAmt, setRecFiatAmt] = useState('4200');
  const [recFiat, setRecFiat] = useState<FiatCurrency>('USD');
  const [recMethod, setRecMethod] = useState(PAYMENT_METHODS[0].name);
  const [recCounterparty, setRecCounterparty] = useState('v***x');

  const [fbAuthor, setFbAuthor] = useState('satoshi_desk');
  const [fbPositive, setFbPositive] = useState(true);
  const [fbAsset, setFbAsset] = useState<CryptoAsset>('BTC');
  const [fbComment, setFbComment] = useState(
    'Instant escrow release and smooth zero-KYC settlement. Highly recommended!'
  );
  const [repBusy, setRepBusy] = useState(false);
  const [repError, setRepError] = useState('');
  const [repSuccess, setRepSuccess] = useState('');

  const loadDirectory = () => {
    api
      .getUserDirectory()
      .then((res) => {
        const users = res.users ?? [];
        setDirectory(users);
        if (!targetUsername) {
          if (user?.username) setTargetUsername(user.username);
          else if (users.length > 0) setTargetUsername(users[0].username);
        }
      })
      .catch(() => undefined);
  };

  const loadTablesSummary = () => {
    setTablesLoading(true);
    setTablesError('');
    api
      .getTablesSummary()
      .then((res) => {
        setTablesSummary(res);
      })
      .catch((err) => {
        setTablesError(err instanceof Error ? err.message : 'Unable to read website tables.');
      })
      .finally(() => {
        setTablesLoading(false);
      });
  };

  useEffect(() => {
    loadDirectory();
    loadTablesSummary();
  }, []);

  useEffect(() => {
    if (vaultTab === 'tables') {
      loadTablesSummary();
    }
  }, [vaultTab]);

  useEffect(() => {
    if (user?.username && !targetUsername) {
      setTargetUsername(user.username);
    }
  }, [user?.username]);

  const filteredDirectory = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return directory;
    return directory.filter((u) => u.username.toLowerCase().includes(q));
  }, [directory, userSearch]);

  const activeTargetUser = useMemo(() => {
    const clean = targetUsername.trim().toLowerCase();
    return directory.find((u) => u.username.toLowerCase() === clean) ?? null;
  }, [directory, targetUsername]);

  const spotUsd = prices.usdPrices[selectedCrypto] ?? 1;
  const currentBalance =
    activeTargetUser?.balances[selectedCrypto] ??
    (user && user.username.toLowerCase() === targetUsername.trim().toLowerCase()
      ? user.balances[selectedCrypto] ?? 0
      : 0);

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

  const resolvedTarget = targetUsername.trim() || user?.username || '';

  const handleSubmitCredit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLastCredit(null);

    if (!resolvedTarget) {
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
        targetUsername: resolvedTarget,
      });
      if (res.isSelf !== false && user && res.user.username === user.username) {
        onUserUpdated(res.user);
      }
      setLastCredit({
        target: res.targetUsername ?? res.user.username,
        crypto: selectedCrypto,
        creditedCrypto: res.creditedCrypto,
        usdValue: res.usdValue,
      });
      loadDirectory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to credit wallet balance.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReputation = async (e: FormEvent) => {
    e.preventDefault();
    setRepError('');
    setRepSuccess('');

    if (!resolvedTarget) {
      setRepError('Select or enter a registered username first.');
      return;
    }

    setRepBusy(true);
    try {
      const res = await api.addSecretProfileStats({
        targetUsername: resolvedTarget,
        addTradesCount: Number(addTradesCount) > 0 ? Number(addTradesCount) : undefined,
        ratingPct: Number(ratingPct) > 0 ? Number(ratingPct) : undefined,
        verified: verifiedToggle,
        avgReleaseMinutes: Number(avgReleaseMinutes) > 0 ? Number(avgReleaseMinutes) : undefined,
        addVolumeUsd: Number(addVolumeUsd) > 0 ? Number(addVolumeUsd) : undefined,
        tradeRecord: includeTradeRecord
          ? {
              asset: recAsset,
              side: recSide,
              cryptoAmount: Number(recCryptoAmt) || 0.05,
              fiatAmount: Number(recFiatAmt) || 500,
              fiat: recFiat,
              paymentMethod: recMethod,
              counterparty: recCounterparty || 'm***8',
            }
          : undefined,
        feedback: fbComment.trim()
          ? {
              author: fbAuthor.trim() || 'anon_trader',
              positive: fbPositive,
              asset: fbAsset,
              comment: fbComment.trim(),
            }
          : undefined,
      });
      onProfileUpdated?.(res.trader);
      setRepSuccess(
        `Updated @${res.trader.username}: ${res.trader.tradesCount} trades · ${res.trader.ratingPct}% trust`
      );
      loadDirectory();
    } catch (err) {
      setRepError(err instanceof Error ? err.message : 'Failed to update profile stats');
    } finally {
      setRepBusy(false);
    }
  };

  const handleSyncTables = async () => {
    setTablesError('');
    setTablesStatus('');
    setSyncBusy(true);
    try {
      const res = await api.syncTablesToServer();
      setTablesStatus(
        `Saved to data/tables/: ${res.totalUsers} account(s) stored (${res.syncedUsers} new user(s), ${res.syncedOffers} ad(s), ${res.syncedTrades} trade(s) synced).`
      );
      loadDirectory();
      loadTablesSummary();
      onDataSynced?.();
    } catch (err) {
      setTablesError(err instanceof Error ? err.message : 'Failed to sync tables.');
    } finally {
      setSyncBusy(false);
    }
  };

  const handleExportTables = async () => {
    setTablesError('');
    setTablesStatus('');
    try {
      const snapshot = await api.exportTablesJson();
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `oosab-tables-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setTablesStatus('Downloaded JSON backup of all website tables.');
    } catch (err) {
      setTablesError(err instanceof Error ? err.message : 'Failed to export backup JSON.');
    }
  };

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setTablesError('');
    setTablesStatus('');
    setImportBusy(true);
    try {
      const rawText = await file.text();
      const parsed = JSON.parse(rawText);
      const res = await api.importTablesJson(parsed);
      setTablesStatus(
        `Restored ${res.importedUsers} account(s) and ${res.importedOffers} custom ad(s) into data/tables/.`
      );
      loadDirectory();
      loadTablesSummary();
      onDataSynced?.();
    } catch (err) {
      setTablesError(err instanceof Error ? err.message : 'Invalid backup JSON file.');
    } finally {
      setImportBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-xs sm:items-center sm:p-4">
      <div className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-[#DCE2E1] bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6 dark:border-[#243230] dark:bg-[#121918]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B3B2E] text-[#7FE85B] dark:bg-[#183828]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold text-[#0E1715] dark:text-white">
                  Vault Admin Console
                </h2>
                <span className="rounded-md bg-[#E8F8EE] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#0B3B2E] dark:bg-[#152D21] dark:text-[#7FE85B]">
                  Instant
                </span>
              </div>
              <p className="text-xs text-[#5C6665] dark:text-[#8E9B98]">
                Credit any registered account or add trades &amp; feedback to public profiles
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

        {/* Mode Switcher Tabs */}
        <div className="mt-4 grid grid-cols-3 gap-1.5 rounded-xl border border-[#DCE2E1] bg-[#F4F6F6] p-1 dark:border-[#24302F] dark:bg-[#0E1413]">
          <button
            type="button"
            onClick={() => setVaultTab('credit')}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors ${
              vaultTab === 'credit'
                ? 'bg-white text-[#0E1715] shadow-xs dark:bg-[#1A2523] dark:text-[#7FE85B]'
                : 'text-[#5C6665] hover:text-[#0E1715] dark:text-[#8E9B98] dark:hover:text-white'
            }`}
          >
            <Wallet className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Credit Balance</span>
          </button>
          <button
            type="button"
            onClick={() => setVaultTab('reputation')}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors ${
              vaultTab === 'reputation'
                ? 'bg-white text-[#0E1715] shadow-xs dark:bg-[#1A2523] dark:text-[#7FE85B]'
                : 'text-[#5C6665] hover:text-[#0E1715] dark:text-[#8E9B98] dark:hover:text-white'
            }`}
          >
            <Award className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Trades &amp; Feedback</span>
          </button>
          <button
            type="button"
            onClick={() => setVaultTab('tables')}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors ${
              vaultTab === 'tables'
                ? 'bg-white text-[#0E1715] shadow-xs dark:bg-[#1A2523] dark:text-[#7FE85B]'
                : 'text-[#5C6665] hover:text-[#0E1715] dark:text-[#8E9B98] dark:hover:text-white'
            }`}
          >
            <Database className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Saved Tables</span>
          </button>
        </div>

        {/* Target Registered Account Picker */}
        {vaultTab !== 'tables' && (
        <div className="mt-4 rounded-xl border border-[#DCE2E1] bg-[#F8FAFA] p-3.5 dark:border-[#222E2C] dark:bg-[#0E1413]">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#1E2726] dark:text-[#DCE4E3]">
              <Users className="h-3.5 w-3.5 text-[#0B3B2E] dark:text-[#7FE85B]" />
              <span>Target Registered Account</span>
            </span>
            <span className="font-mono text-[11px] text-[#5C6665] dark:text-[#8E9B98]">
              {directory.length} account{directory.length === 1 ? '' : 's'} saved
            </span>
          </div>

          {directory.length === 0 && !user ? (
            <div className="rounded-lg border border-dashed border-[#DCE2E1] bg-white p-3 text-center text-xs text-[#5C6665] dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#8E9B98]">
              <ShieldAlert className="mx-auto mb-1.5 h-4 w-4 text-[#0B3B2E] dark:text-[#7FE85B]" />
              No registered user accounts yet.{' '}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequireAuth('register');
                }}
                className="font-semibold text-[#0B3B2E] underline dark:text-[#7FE85B]"
              >
                Register an account
              </button>{' '}
              first.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <select
                  value={targetUsername}
                  onChange={(e) => {
                    setTargetUsername(e.target.value);
                    setLastCredit(null);
                    setRepSuccess('');
                  }}
                  className="h-10 w-full rounded-lg border border-[#DCE2E1] bg-white px-3 text-xs font-semibold text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                >
                  {user && !directory.some((d) => d.username === user.username) && (
                    <option value={user.username}>@{user.username} (You)</option>
                  )}
                  {filteredDirectory.map((acc) => (
                    <option key={acc.username} value={acc.username}>
                      @{acc.username}
                      {user?.username === acc.username ? ' (You)' : ''} · {acc.tradesCount} trades
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Filter accounts by username..."
                  className="h-10 w-full rounded-lg border border-[#DCE2E1] bg-white px-3 text-xs text-[#0E1715] placeholder-[#7B8684] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                />
              </div>
              {activeTargetUser && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-[#5C6665] dark:text-[#8E9B98]">
                  <span>
                    Selected: <strong className="text-[#0E1715] dark:text-white">@{activeTargetUser.username}</strong>
                  </span>
                  <span>
                    · {formatCrypto(activeTargetUser.balances[selectedCrypto] ?? 0, selectedCrypto)}
                  </span>
                  <span>· {activeTargetUser.tradesCount} trades</span>
                  <span>· {activeTargetUser.ratingPct}% trust</span>
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* TAB 1: Credit Crypto or Dollars */}
        {vaultTab === 'credit' && (
          <form onSubmit={handleSubmitCredit} className="mt-4 space-y-4">
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
                      className={`flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${
                        active
                          ? 'border-[#0B3B2E] bg-[#EEF6F2] text-[#0B3B2E] dark:border-[#7FE85B] dark:bg-[#162C22] dark:text-[#7FE85B]'
                          : 'border-[#DCE2E1] bg-[#F8FAFA] text-[#394241] hover:bg-[#EFF3F2] dark:border-[#24302F] dark:bg-[#0E1413] dark:text-[#C8D2D0] dark:hover:bg-[#192322]'
                      }`}
                    >
                      <CoinIcon symbol={coin.symbol} size={18} />
                      <span>{coin.symbol}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Mode Switch (Dollars USD vs Crypto Amount) */}
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

            {/* Calculation Summary */}
            <div className="rounded-xl border border-[#DCE2E1] bg-[#F8FAFA] p-3.5 dark:border-[#222E2C] dark:bg-[#0E1413]">
              <div className="flex items-center justify-between text-xs text-[#5C6665] dark:text-[#8E9B98]">
                <span>Calculated Credit</span>
                <span className="font-mono font-semibold text-[#0D6832] dark:text-[#7FE85B]">
                  +{calculated.cryptoAmount.toLocaleString('en-US', { maximumFractionDigits: 8 })}{' '}
                  {selectedCrypto} (${calculated.usdAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                </span>
              </div>
              <div className="my-2 border-t border-[#E3E7E7] dark:border-[#202B2A]" />
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#1E2726] dark:text-[#DCE4E3]">
                  New {selectedCrypto} Balance (@{resolvedTarget || 'account'})
                </span>
                <span className="font-mono font-bold text-[#0E1715] dark:text-white">
                  {projectedBalance.toLocaleString('en-US', { maximumFractionDigits: 8 })}{' '}
                  {selectedCrypto} (≈ $
                  {projectedUsd.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  )
                </span>
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
                    to @{lastCredit.target}.
                  </span>
                </div>
                {user && lastCredit.target === user.username && (
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
                )}
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
                disabled={submitting || calculated.cryptoAmount <= 0 || !resolvedTarget}
                className="h-10 rounded-xl bg-[#7FE85B] px-5 text-sm font-semibold text-[#082213] hover:bg-[#6AD845] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? 'Crediting...'
                  : `Credit +${calculated.cryptoAmount.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${selectedCrypto}`}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: Profile Trades & Feedback Injection */}
        {vaultTab === 'reputation' && (
          <form onSubmit={handleSubmitReputation} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
                  Add Trades
                </label>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  value={addTradesCount}
                  onChange={(e) => setAddTradesCount(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[#DCE2E1] bg-white px-2.5 font-mono text-xs font-semibold text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
                  Trust %
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={ratingPct}
                  onChange={(e) => setRatingPct(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[#DCE2E1] bg-white px-2.5 font-mono text-xs font-semibold text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
                  Release (min)
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={avgReleaseMinutes}
                  onChange={(e) => setAvgReleaseMinutes(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[#DCE2E1] bg-white px-2.5 font-mono text-xs font-semibold text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
                  +Volume USD
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 5000"
                  value={addVolumeUsd}
                  onChange={(e) => setAddVolumeUsd(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[#DCE2E1] bg-white px-2.5 font-mono text-xs font-semibold text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-[#DCE2E1] bg-[#F8FAFA] px-3.5 py-2.5 text-xs font-semibold text-[#1E2726] dark:border-[#222E2C] dark:bg-[#0E1413] dark:text-[#DCE4E3]">
              <span>Verified High-Volume Badge</span>
              <input
                type="checkbox"
                checked={verifiedToggle}
                onChange={(e) => setVerifiedToggle(e.target.checked)}
                className="h-4 w-4 accent-[#0B3B2E] dark:accent-[#7FE85B]"
              />
            </label>

            {/* Optional Completed Trade Record */}
            <div className="rounded-xl border border-[#DCE2E1] bg-[#F8FAFA] p-3.5 dark:border-[#222E2C] dark:bg-[#0E1413]">
              <label className="flex cursor-pointer items-center justify-between text-xs font-bold text-[#0E1715] dark:text-white">
                <span>Log Completed Trade Entry in History</span>
                <input
                  type="checkbox"
                  checked={includeTradeRecord}
                  onChange={(e) => setIncludeTradeRecord(e.target.checked)}
                  className="h-4 w-4 accent-[#0B3B2E] dark:accent-[#7FE85B]"
                />
              </label>

              {includeTradeRecord && (
                <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  <select
                    value={recSide}
                    onChange={(e) => setRecSide(e.target.value as 'Sold' | 'Bought')}
                    className="h-9 rounded-lg border border-[#DCE2E1] bg-white px-2.5 text-xs font-semibold text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                  >
                    <option value="Sold">Sold</option>
                    <option value="Bought">Bought</option>
                  </select>
                  <select
                    value={recAsset}
                    onChange={(e) => setRecAsset(e.target.value as CryptoAsset)}
                    className="h-9 rounded-lg border border-[#DCE2E1] bg-white px-2.5 text-xs font-semibold text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                  >
                    {CRYPTO_ASSETS.map((c) => (
                      <option key={c.symbol} value={c.symbol}>
                        {c.symbol}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="any"
                    value={recCryptoAmt}
                    onChange={(e) => setRecCryptoAmt(e.target.value)}
                    placeholder="Crypto amt"
                    className="h-9 rounded-lg border border-[#DCE2E1] bg-white px-2.5 font-mono text-xs text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                  />
                  <input
                    type="number"
                    step="any"
                    value={recFiatAmt}
                    onChange={(e) => setRecFiatAmt(e.target.value)}
                    placeholder="Fiat amt"
                    className="h-9 rounded-lg border border-[#DCE2E1] bg-white px-2.5 font-mono text-xs text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                  />
                  <select
                    value={recFiat}
                    onChange={(e) => setRecFiat(e.target.value as FiatCurrency)}
                    className="h-9 rounded-lg border border-[#DCE2E1] bg-white px-2.5 text-xs text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                  >
                    {FIAT_CURRENCIES.map((f) => (
                      <option key={f.code} value={f.code}>
                        {f.code}
                      </option>
                    ))}
                  </select>
                  <select
                    value={recMethod}
                    onChange={(e) => setRecMethod(e.target.value)}
                    className="h-9 rounded-lg border border-[#DCE2E1] bg-white px-2.5 text-xs text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                  >
                    {(
                      [
                        'Bank & Wire',
                        'Debit & Virtual Cards',
                        'Gift Cards',
                        'Online Wallets',
                        'Cash & In-Person',
                      ] as const
                    ).map((cat) => (
                      <optgroup key={cat} label={cat}>
                        {PAYMENT_METHODS.filter((pm) => pm.category === cat).map((pm) => (
                          <option key={pm.name} value={pm.name}>
                            {pm.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={recCounterparty}
                    onChange={(e) => setRecCounterparty(e.target.value)}
                    placeholder="Counterparty (e.g. m***8)"
                    className="col-span-2 h-9 rounded-lg border border-[#DCE2E1] bg-white px-2.5 text-xs text-[#0E1715] sm:col-span-3 dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                  />
                </div>
              )}
            </div>

            {/* Feedback Entry */}
            <div className="space-y-2.5 rounded-xl border border-[#DCE2E1] bg-[#F8FAFA] p-3.5 dark:border-[#222E2C] dark:bg-[#0E1413]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0E1715] dark:text-white">
                <MessageSquarePlus className="h-3.5 w-3.5 text-[#0B3B2E] dark:text-[#7FE85B]" />
                <span>Add Custom Feedback Review (optional)</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input
                  type="text"
                  value={fbAuthor}
                  onChange={(e) => setFbAuthor(e.target.value)}
                  placeholder="Reviewer username"
                  className="h-9 rounded-lg border border-[#DCE2E1] bg-white px-2.5 text-xs text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                />
                <select
                  value={fbAsset}
                  onChange={(e) => setFbAsset(e.target.value as CryptoAsset)}
                  className="h-9 rounded-lg border border-[#DCE2E1] bg-white px-2.5 text-xs text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                >
                  {CRYPTO_ASSETS.map((c) => (
                    <option key={c.symbol} value={c.symbol}>
                      {c.symbol}
                    </option>
                  ))}
                </select>
                <select
                  value={fbPositive ? 'pos' : 'neg'}
                  onChange={(e) => setFbPositive(e.target.value === 'pos')}
                  className="h-9 rounded-lg border border-[#DCE2E1] bg-white px-2.5 text-xs font-semibold text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                >
                  <option value="pos">Positive Review</option>
                  <option value="neg">Negative Review</option>
                </select>
              </div>
              <textarea
                rows={2}
                value={fbComment}
                onChange={(e) => setFbComment(e.target.value)}
                placeholder="Write a review comment (leave blank to skip adding feedback)..."
                className="w-full rounded-lg border border-[#DCE2E1] bg-white p-2.5 text-xs text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
              />
            </div>

            {repError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {repError}
              </div>
            )}

            {repSuccess && (
              <div className="flex items-center gap-2 rounded-xl border border-[#8CE89E] bg-[#EAFBF0] px-3.5 py-3 text-xs font-semibold text-[#0B3B2E] dark:border-[#1E4D33] dark:bg-[#112A1D] dark:text-[#7FE85B]">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{repSuccess}</span>
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
                disabled={repBusy || !resolvedTarget}
                className="h-10 rounded-xl bg-[#7FE85B] px-5 text-sm font-semibold text-[#082213] hover:bg-[#6AD845] disabled:opacity-50"
              >
                {repBusy ? 'Applying...' : `Apply to @${resolvedTarget || 'profile'}`}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: Saved Website JSON Tables */}
        {vaultTab === 'tables' && (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-[#DCE2E1] bg-[#F8FAFA] p-3.5 dark:border-[#222E2C] dark:bg-[#0E1413]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0E1715] dark:text-white">
                    <Database className="h-3.5 w-3.5 text-[#0B3B2E] dark:text-[#7FE85B]" />
                    <span>Permanent Website File Tables</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#5C6665] dark:text-[#8E9B98]">
                    Accounts, balances, custom ads, trades &amp; profiles persist directly to{' '}
                    <code className="rounded bg-[#E9EFEE] px-1 py-0.5 font-mono text-[10px] text-[#0E1715] dark:bg-[#1A2523] dark:text-[#7FE85B]">
                      {tablesSummary?.tablesDir ?? 'data/tables'}/*.json
                    </code>{' '}
                    with automatic browser sync.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadTablesSummary}
                  disabled={tablesLoading}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#DCE2E1] bg-white px-2.5 text-xs font-semibold text-[#1E2726] hover:bg-[#F2F5F5] dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#DCE4E3] dark:hover:bg-[#1A2423]"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${tablesLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={handleSyncTables}
                  disabled={syncBusy}
                  className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#0B3B2E] px-3 text-xs font-semibold text-white hover:bg-[#082E24] disabled:opacity-50 dark:bg-[#7FE85B] dark:text-[#082213] dark:hover:bg-[#6AD845]"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${syncBusy ? 'animate-spin' : ''}`} />
                  <span>{syncBusy ? 'Syncing...' : 'Sync Browser → Tables'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportTables}
                  className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#DCE2E1] bg-white px-3 text-xs font-semibold text-[#0E1715] hover:bg-[#F2F5F5] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white dark:hover:bg-[#1B2524]"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export Backup (.json)</span>
                </button>
                <button
                  type="button"
                  onClick={() => importInputRef.current?.click()}
                  disabled={importBusy}
                  className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#DCE2E1] bg-white px-3 text-xs font-semibold text-[#0E1715] hover:bg-[#F2F5F5] disabled:opacity-50 dark:border-[#263130] dark:bg-[#131A1A] dark:text-white dark:hover:bg-[#1B2524]"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{importBusy ? 'Restoring...' : 'Import Backup (.json)'}</span>
                </button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </div>

              {tablesStatus && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#8CE89E] bg-[#EAFBF0] px-3 py-2 text-xs font-medium text-[#0B3B2E] dark:border-[#1E4D33] dark:bg-[#112A1D] dark:text-[#7FE85B]">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>{tablesStatus}</span>
                </div>
              )}

              {tablesError && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  {tablesError}
                </div>
              )}
            </div>

            {/* Table Files Grid */}
            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-bold text-[#0E1715] dark:text-white">
                  Website Table Files
                </span>
                <span className="font-mono text-[11px] text-[#5C6665] dark:text-[#8E9B98]">
                  {tablesSummary?.customOffersCount ?? 0} custom ad
                  {(tablesSummary?.customOffersCount ?? 0) === 1 ? '' : 's'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(tablesSummary?.tables ?? []).map((tbl) => (
                  <div
                    key={tbl.name}
                    className="rounded-xl border border-[#DCE2E1] bg-white p-2.5 dark:border-[#222E2C] dark:bg-[#0E1413]"
                  >
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#0E1715] dark:text-white">
                      <FileJson className="h-3.5 w-3.5 shrink-0 text-[#0B3B2E] dark:text-[#7FE85B]" />
                      <span className="truncate font-mono">{tbl.name}</span>
                    </div>
                    <div className="mt-1.5 flex items-baseline justify-between font-mono text-[11px] text-[#5C6665] dark:text-[#8E9B98]">
                      <span>{tbl.rows} rows</span>
                      <span>{formatBytes(tbl.sizeBytes)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Saved Accounts List */}
            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-bold text-[#0E1715] dark:text-white">
                  Saved Registered Accounts ({tablesSummary?.savedAccounts.length ?? 0})
                </span>
                <span className="text-[11px] text-[#5C6665] dark:text-[#8E9B98]">
                  Stored in users.json &amp; traders.json
                </span>
              </div>

              {(tablesSummary?.savedAccounts.length ?? 0) === 0 ? (
                <div className="rounded-xl border border-dashed border-[#DCE2E1] bg-[#F8FAFA] p-4 text-center text-xs text-[#5C6665] dark:border-[#24302F] dark:bg-[#0E1413] dark:text-[#8E9B98]">
                  No registered accounts saved yet. Register an account or click{' '}
                  <strong className="text-[#0E1715] dark:text-white">Sync Browser → Tables</strong>{' '}
                  to persist local accounts permanently.
                </div>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {tablesSummary?.savedAccounts.map((acc) => {
                    const approxUsd = Object.entries(acc.balances ?? {}).reduce(
                      (sum, [sym, amt]) =>
                        sum + Number(amt || 0) * (prices.usdPrices[sym as CryptoAsset] ?? 0),
                      0
                    );
                    const isSelf = user?.username.toLowerCase() === acc.username.toLowerCase();
                    return (
                      <div
                        key={acc.username}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#DCE2E1] bg-white px-3 py-2.5 dark:border-[#222E2C] dark:bg-[#0E1413]"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0E1715] dark:text-white">
                            <span>@{acc.username}</span>
                            {isSelf && (
                              <span className="rounded bg-[#E8F8EE] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#0B3B2E] dark:bg-[#152D21] dark:text-[#7FE85B]">
                                You
                              </span>
                            )}
                            {acc.verified && (
                              <span className="rounded bg-[#EFF6FF] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#1D4ED8] dark:bg-[#16233B] dark:text-[#93C5FD]">
                                Verified
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 font-mono text-[11px] text-[#5C6665] dark:text-[#8E9B98]">
                            {acc.tradesCount} trades · {acc.ratingPct}% trust · {acc.offersCount} ads ·{' '}
                            <strong className="text-[#0E1715] dark:text-[#DCE4E3]">
                              $
                              {approxUsd.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setTargetUsername(acc.username);
                              setVaultTab('credit');
                            }}
                            className="h-8 rounded-lg border border-[#DCE2E1] bg-[#F8FAFA] px-2.5 text-[11px] font-semibold text-[#0E1715] hover:border-[#0B3B2E] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white dark:hover:border-[#7FE85B]"
                          >
                            Credit
                          </button>
                          {onNavigateProfile && (
                            <button
                              type="button"
                              onClick={() => onNavigateProfile(acc.username)}
                              className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#DCE2E1] bg-white px-2.5 text-[11px] font-semibold text-[#1E2726] hover:bg-[#F2F5F5] dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#DCE4E3] dark:hover:bg-[#1A2423]"
                            >
                              <span>/{acc.username}</span>
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-1">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-xl border border-[#DCE2E1] px-4 text-sm font-semibold text-[#1E2726] hover:bg-[#F5F7F7] dark:border-[#263130] dark:text-[#DCE4E3] dark:hover:bg-[#1A2423]"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
