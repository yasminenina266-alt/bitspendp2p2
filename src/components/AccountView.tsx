import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Copy,
  Eye,
  MessageSquare,
  Pause,
  Play,
  Plus,
  QrCode,
  RefreshCw,
  Settings,
  Shield,
  Trash2,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState, type FormEvent } from 'react';
import { api } from '../api';
import {
  ASSET_CHAINS,
  CRYPTO_ASSETS,
  FIAT_CURRENCIES,
  formatCrypto,
  formatFiat,
  type ChainId,
} from '../constants/market';
import type { CryptoAsset, FiatCurrency, MarketPrices, P2POffer, TradeOrder, UserAccount } from '../types';
import { ChainIcon, CoinIcon } from './CoinIcon';
import { getOfferUnitPrice } from './OfferRow';

interface AccountViewProps {
  user: UserAccount | null;
  prices: MarketPrices;
  trades: TradeOrder[];
  myOffers: P2POffer[];
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenTrade: (trade: TradeOrder) => void;
  onViewOffer: (offer: P2POffer) => void;
  onOpenCreateOffer: () => void;
  onUserUpdated: (user: UserAccount) => void;
  onOfferUpdated: (offer: P2POffer) => void;
  onOfferDeleted: (offerId: string) => void;
}

export function AccountView({
  user,
  prices,
  trades,
  myOffers,
  onOpenAuth,
  onOpenTrade,
  onViewOffer,
  onOpenCreateOffer,
  onUserUpdated,
  onOfferUpdated,
  onOfferDeleted,
}: AccountViewProps) {
  const [subTab, setSubTab] = useState<'wallet' | 'trades' | 'settings'>('wallet');

  // Profile & Settings state
  const [bioInput, setBioInput] = useState(user?.bio ?? '');
  const [pgpInput, setPgpInput] = useState(user?.pgpKey ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [preferredCurrency, setPreferredCurrency] = useState<FiatCurrency>(
    user?.settings?.preferredCurrency ?? 'USD'
  );
  const [defaultPaymentWindow, setDefaultPaymentWindow] = useState(
    user?.settings?.defaultPaymentWindow ?? 30
  );
  const [autoPgpSign, setAutoPgpSign] = useState(user?.settings?.autoPgpSign ?? true);
  const [hideOnlineStatus, setHideOnlineStatus] = useState(
    user?.settings?.hideOnlineStatus ?? false
  );
  const [torFriendlyMode, setTorFriendlyMode] = useState(
    user?.settings?.torFriendlyMode ?? false
  );
  const [escrowAlerts, setEscrowAlerts] = useState(user?.settings?.escrowAlerts ?? true);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [settingsMsg, setSettingsMsg] = useState('');
  const [settingsErr, setSettingsErr] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Deposit / Withdraw Modal state
  const [walletModal, setWalletModal] = useState<{
    mode: 'deposit' | 'withdraw';
    asset: CryptoAsset;
  } | null>(null);
  const [selectedChain, setSelectedChain] = useState<ChainId>('ETH');
  const [withdrawAddr, setWithdrawAddr] = useState('');
  const [withdrawAmt, setWithdrawAmt] = useState('');
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletError, setWalletError] = useState('');
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedPhrase, setCopiedPhrase] = useState(false);

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-[#E3E7E7] bg-white p-8 text-center dark:border-[#202B2A] dark:bg-[#131A1A]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF6F2] text-[#0B3B2E] dark:bg-[#152B20] dark:text-[#7FE85B]">
          <User className="h-6 w-6" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-[#0E1715] dark:text-white">
          Manage Your BitSpend P2P Profile &amp; Wallet
        </h1>
        <p className="mt-2 text-sm text-[#5C6665] dark:text-[#98A4A2]">
          Register an anonymous handle in seconds — zero email, zero phone number, and zero KYC required. Access multi-asset wallets, QR deposit addresses, escrow trades, and account settings.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onOpenAuth('register')}
            className="rounded-xl bg-[#7FE85B] px-6 py-3 text-sm font-semibold text-[#082213] hover:bg-[#6AD845]"
          >
            Register Account
          </button>
          <button
            type="button"
            onClick={() => onOpenAuth('login')}
            className="rounded-xl border border-[#DCE2E1] px-6 py-3 text-sm font-semibold text-[#0E1715] hover:bg-[#F5F7F7] dark:border-[#263130] dark:text-white dark:hover:bg-[#1A2423]"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  const totalUsdValue = CRYPTO_ASSETS.reduce((acc, c) => {
    return acc + (user.balances[c.symbol] ?? 0) * (prices.usdPrices[c.symbol] ?? 0);
  }, 0);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSaved(false);
    try {
      const res = await api.updateProfile({ bio: bioInput, pgpKey: pgpInput });
      onUserUpdated(res.user);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setSettingsErr('');
    setSettingsMsg('');
    if (newPassword && newPassword !== confirmNewPassword) {
      setSettingsErr('New passwords do not match.');
      return;
    }
    setSavingSettings(true);
    try {
      const res = await api.updateSettings({
        preferredCurrency,
        defaultPaymentWindow,
        autoPgpSign,
        hideOnlineStatus,
        torFriendlyMode,
        escrowAlerts,
        newPassword: newPassword || undefined,
        confirmNewPassword: confirmNewPassword || undefined,
      });
      onUserUpdated(res.user);
      setNewPassword('');
      setConfirmNewPassword('');
      setSettingsMsg('Settings updated.');
      setTimeout(() => setSettingsMsg(''), 2500);
    } catch (err) {
      setSettingsErr(err instanceof Error ? err.message : 'Unable to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRotateAddress = async (asset: CryptoAsset) => {
    setWalletBusy(true);
    setWalletError('');
    try {
      const res = await api.newDepositAddress(asset);
      onUserUpdated(res.user);
    } catch (err) {
      setWalletError(err instanceof Error ? err.message : 'Failed to generate new address');
    } finally {
      setWalletBusy(false);
    }
  };

  const handleWithdrawSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!walletModal) return;
    setWalletBusy(true);
    setWalletError('');
    try {
      const meta = CRYPTO_ASSETS.find((c) => c.symbol === walletModal.asset);
      const chains = ASSET_CHAINS[walletModal.asset];
      const chainOpt = chains?.find((c) => c.id === selectedChain) ?? chains?.[0];
      const networkLabel = chainOpt
        ? `${chainOpt.name} (${chainOpt.standard})`
        : meta?.networkName;
      const res = await api.withdrawCrypto(
        walletModal.asset,
        Number(withdrawAmt),
        withdrawAddr,
        networkLabel
      );
      onUserUpdated(res.user);
      setWithdrawAddr('');
      setWithdrawAmt('');
      setWalletModal(null);
    } catch (err) {
      setWalletError(err instanceof Error ? err.message : 'Withdrawal failed');
    } finally {
      setWalletBusy(false);
    }
  };

  const handleCopy = async (text: string, which: 'addr' | 'phrase') => {
    try {
      await navigator.clipboard.writeText(text);
      if (which === 'addr') {
        setCopiedAddr(true);
        setTimeout(() => setCopiedAddr(false), 2000);
      } else {
        setCopiedPhrase(true);
        setTimeout(() => setCopiedPhrase(false), 2000);
      }
    } catch {
      // ignore
    }
  };

  const activeMeta = walletModal
    ? CRYPTO_ASSETS.find((c) => c.symbol === walletModal.asset)
    : undefined;

  const activeChains = walletModal ? ASSET_CHAINS[walletModal.asset] : undefined;
  const activeChainOption = activeChains
    ? activeChains.find((c) => c.id === selectedChain) ?? activeChains[0]
    : undefined;

  const activeAddress = walletModal
    ? activeChainOption
      ? activeChainOption.address
      : user.depositAddresses?.[walletModal.asset] ?? ''
    : '';

  return (
    <div className="space-y-6">
      {/* Header Portfolio Summary & Sub-Tabs */}
      <div className="rounded-2xl border border-[#E3E7E7] bg-white p-6 dark:border-[#202B2A] dark:bg-[#131A1A]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-[#5C6665] dark:text-[#8E9B98]">
              BitSpend P2P Account · {user.username}
            </div>
            <div className="mt-1 font-mono text-3xl font-bold tabular-nums text-[#0E1715] dark:text-white">
              ${totalUsdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              <span className="text-sm font-normal text-[#5C6665]">USD total</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSubTab('wallet')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                subTab === 'wallet'
                  ? 'bg-[#0B3B2E] text-white dark:bg-[#7FE85B] dark:text-[#082213]'
                  : 'border border-[#DCE2E1] text-[#394241] hover:bg-[#F5F7F7] dark:border-[#263130] dark:text-[#C5D1CF]'
              }`}
            >
              <Wallet className="h-3.5 w-3.5" />
              <span>Wallets &amp; Transfers</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('trades')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                subTab === 'trades'
                  ? 'bg-[#0B3B2E] text-white dark:bg-[#7FE85B] dark:text-[#082213]'
                  : 'border border-[#DCE2E1] text-[#394241] hover:bg-[#F5F7F7] dark:border-[#263130] dark:text-[#C5D1CF]'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Trades &amp; My Ads ({trades.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('settings')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                subTab === 'settings'
                  ? 'bg-[#0B3B2E] text-white dark:bg-[#7FE85B] dark:text-[#082213]'
                  : 'border border-[#DCE2E1] text-[#394241] hover:bg-[#F5F7F7] dark:border-[#263130] dark:text-[#C5D1CF]'
              }`}
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Profile &amp; Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: Wallets (All Cryptos + Deposit / Withdraw + QR + Ledger) */}
      {subTab === 'wallet' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#E3E7E7] bg-white overflow-hidden dark:border-[#202B2A] dark:bg-[#131A1A]">
            <div className="flex items-center justify-between border-b border-[#ECEFEF] px-6 py-4 dark:border-[#202B2A]">
              <h2 className="font-display text-lg font-bold text-[#0E1715] dark:text-white">
                Multi-Currency Wallets
              </h2>
              <span className="text-xs text-[#5C6665] dark:text-[#8E9B98]">
                7 Supported Networks · Zero KYC Custody
              </span>
            </div>

            <div className="divide-y divide-[#ECEFEF] dark:divide-[#202B2A]">
              {CRYPTO_ASSETS.map((coin) => {
                const bal = user.balances[coin.symbol] ?? 0;
                const usdVal = bal * (prices.usdPrices[coin.symbol] ?? 0);
                const chains = ASSET_CHAINS[coin.symbol];
                return (
                  <div
                    key={coin.symbol}
                    className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 hover:bg-[#FAFBFB] dark:hover:bg-[#17201F]"
                  >
                    <div className="flex items-center gap-3.5 min-w-[220px]">
                      <CoinIcon symbol={coin.symbol} size={32} />
                      <div>
                        <div className="text-sm font-bold text-[#0E1715] dark:text-white">
                          {coin.name}{' '}
                          <span className="font-mono text-xs font-medium text-[#64706E] dark:text-[#8E9B98]">
                            ({coin.symbol})
                          </span>
                        </div>
                        {chains ? (
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[#64706E] dark:text-[#8E9B98]">
                            {chains.map((ch) => (
                              <span
                                key={ch.id}
                                title={`${ch.name} (${ch.standard})`}
                                className="inline-flex items-center gap-1"
                              >
                                <ChainIcon chain={ch.id} size={14} />
                                <span className="text-[11px] font-medium">{ch.shortName}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-[#64706E] dark:text-[#8E9B98]">
                            {coin.networkName}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right min-w-[140px]">
                      <div className="font-mono text-sm font-bold tabular-nums text-[#0E1715] dark:text-white">
                        {formatCrypto(bal, coin.symbol)}
                      </div>
                      <div className="font-mono text-xs tabular-nums text-[#5C6665] dark:text-[#8E9B98]">
                        ${usdVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setWalletError('');
                          setSelectedChain('ETH');
                          setWalletModal({ mode: 'deposit', asset: coin.symbol });
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#7FE85B] px-3.5 py-2 text-xs font-semibold text-[#082213] hover:bg-[#6AD845]"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        <span>Deposit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setWalletError('');
                          setSelectedChain('ETH');
                          setWithdrawAddr('');
                          setWithdrawAmt('');
                          setWalletModal({ mode: 'withdraw', asset: coin.symbol });
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE2E1] bg-white px-3.5 py-2 text-xs font-semibold text-[#0E1715] hover:bg-[#F5F7F7] dark:border-[#263130] dark:bg-[#0F1515] dark:text-white dark:hover:bg-[#1B2524]"
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        <span>Withdraw</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Deposit & Withdrawal Ledger */}
          <div className="rounded-2xl border border-[#E3E7E7] bg-white p-6 dark:border-[#202B2A] dark:bg-[#131A1A]">
            <h3 className="font-display text-base font-bold text-[#0E1715] dark:text-white">
              Deposit &amp; Withdrawal History
            </h3>
            {(!user.walletHistory || user.walletHistory.length === 0) ? (
              <p className="mt-2.5 text-sm text-[#5C6665] dark:text-[#8E9B98]">
                No deposits or withdrawals recorded yet. Use Deposit or Withdraw on any asset above to generate an address, QR code, or external transfer.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-[#ECEFEF] dark:divide-[#202B2A]">
                {user.walletHistory.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          tx.type === 'deposit'
                            ? 'bg-[#E3F7EB] text-[#0D6832] dark:bg-[#133322] dark:text-[#7FE85B]'
                            : 'bg-[#F2F4F4] text-[#394241] dark:bg-[#1C2625] dark:text-[#DCE4E3]'
                        }`}
                      >
                        {tx.type === 'deposit' ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-[#0E1715] dark:text-white">
                          {tx.type === 'deposit' ? 'Deposit' : 'Withdrawal'} · {tx.network}
                        </div>
                        <div className="font-mono text-[11px] text-[#64706E] dark:text-[#8E9B98]">
                          {tx.id} · {tx.address.slice(0, 14)}...{tx.address.slice(-6)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-mono font-bold tabular-nums ${
                          tx.type === 'deposit'
                            ? 'text-[#0D6832] dark:text-[#7FE85B]'
                            : 'text-[#0E1715] dark:text-white'
                        }`}
                      >
                        {tx.type === 'deposit' ? '+' : '-'}
                        {formatCrypto(tx.amount, tx.crypto)}
                      </div>
                      <div className="text-[11px] text-[#64706E] dark:text-[#8E9B98]">
                        {tx.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: P2P Trades & Published Ads */}
      {subTab === 'trades' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-2xl border border-[#E3E7E7] bg-white p-6 lg:col-span-6 dark:border-[#202B2A] dark:bg-[#131A1A]">
            <h2 className="font-display text-lg font-bold text-[#0E1715] dark:text-white">
              My P2P Escrow Trades ({trades.length})
            </h2>
            {trades.length === 0 ? (
              <p className="mt-3 text-sm text-[#5C6665] dark:text-[#98A4A2]">
                No trades opened yet. Select any offer in P2P Offers to review terms and start an escrow trade.
              </p>
            ) : (
              <div className="mt-4 space-y-2.5">
                {trades.map((trade) => (
                  <button
                    key={trade.id}
                    type="button"
                    onClick={() => onOpenTrade(trade)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E6EAEA] p-4 text-left hover:border-[#B6C4C1] dark:border-[#202B2A] dark:hover:border-[#344643]"
                  >
                    <div className="flex items-center gap-3">
                      <CoinIcon symbol={trade.crypto} size={24} />
                      <div>
                        <div className="text-sm font-bold text-[#0E1715] dark:text-white">
                          {trade.id} ·{' '}
                          {trade.side === 'swap_crypto' && trade.swapToCrypto && trade.swapToAmount
                            ? `Swap ${formatCrypto(trade.swapToAmount, trade.swapToCrypto)} → ${formatCrypto(trade.cryptoAmount, trade.crypto)}`
                            : `${trade.side === 'sell_crypto' ? 'Buy' : 'Sell'} ${formatCrypto(trade.cryptoAmount, trade.crypto)}`}
                        </div>
                        <div className="text-xs text-[#5C6665] dark:text-[#98A4A2]">
                          {trade.side === 'swap_crypto'
                            ? `${trade.paymentMethod} · with ${trade.traderUsername}`
                            : `${formatFiat(trade.fiatAmount, trade.fiat)} via ${trade.paymentMethod} · with ${trade.traderUsername}`}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`font-mono text-xs font-semibold ${
                        trade.status === 'completed'
                          ? 'text-[#0D6832] dark:text-[#7FE85B]'
                          : trade.status === 'cancelled'
                            ? 'text-[#64706E]'
                            : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {trade.status.replace('_', ' ')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#E3E7E7] bg-white p-6 lg:col-span-6 dark:border-[#202B2A] dark:bg-[#131A1A]">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#0E1715] dark:text-white">
                My Published Offer Ads ({myOffers.length})
              </h2>
              <button
                type="button"
                onClick={onOpenCreateOffer}
                className="inline-flex items-center gap-1 rounded-xl bg-[#7FE85B] px-3.5 py-2 text-xs font-semibold text-[#082213] hover:bg-[#6AD845]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Offer</span>
              </button>
            </div>

            {myOffers.length === 0 ? (
              <p className="mt-3 text-sm text-[#5C6665] dark:text-[#98A4A2]">
                You haven&apos;t published any P2P offer ads yet.
              </p>
            ) : (
              <div className="mt-4 space-y-2.5">
                {myOffers.map((offer) => {
                  const unitPrice = getOfferUnitPrice(offer, prices);
                  return (
                    <div
                      key={offer.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E6EAEA] p-4 transition-colors hover:border-[#B6C4C1] dark:border-[#202B2A] dark:hover:border-[#344643]"
                    >
                      <button
                        type="button"
                        onClick={() => onViewOffer(offer)}
                        className="flex flex-1 min-w-[200px] items-center gap-3 text-left"
                      >
                        <CoinIcon symbol={offer.crypto} size={22} />
                        <div>
                          <div className="text-sm font-bold text-[#0E1715] hover:text-[#0B3B2E] dark:text-white dark:hover:text-[#7FE85B]">
                            {offer.side === 'swap_crypto' && offer.swapToCrypto
                              ? `Swapping ${offer.crypto} for ${offer.swapToCrypto}`
                              : `${offer.side === 'sell_crypto' ? 'Selling' : 'Buying'} ${offer.crypto} · ${offer.paymentMethod}`}
                          </div>
                          <div className="font-mono text-xs text-[#5C6665] dark:text-[#98A4A2]">
                            {offer.side === 'swap_crypto' && offer.swapToCrypto
                              ? `1 ${offer.crypto} = ${formatCrypto(unitPrice, offer.swapToCrypto)} · Limits ${offer.minSwapAmount ?? 0}–${offer.maxSwapAmount ?? 0} ${offer.swapToCrypto}`
                              : `${formatFiat(unitPrice, offer.fiat)} · Limits ${offer.minFiat}–${offer.maxFiat} ${offer.fiat}`}{' '}
                            · {offer.active ? 'Live' : 'Paused'}
                          </div>
                        </div>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onViewOffer(offer)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#EEF6F2] px-2.5 py-1.5 text-xs font-semibold text-[#0B3B2E] hover:bg-[#DFF0E6] dark:bg-[#152B20] dark:text-[#7FE85B] dark:hover:bg-[#1C382A]"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View Live</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await api.updateOffer(offer.id, { active: !offer.active });
                            onOfferUpdated(res.offer);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#DCE2E1] px-2.5 py-1.5 text-xs font-semibold text-[#1E2726] hover:bg-[#F5F7F7] dark:border-[#263130] dark:text-[#DCE4E3]"
                        >
                          {offer.active ? (
                            <>
                              <Pause className="h-3.5 w-3.5" />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-3.5 w-3.5" />
                              <span>Activate</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          aria-label="Delete offer"
                          onClick={async () => {
                            await api.deleteOffer(offer.id);
                            onOfferDeleted(offer.id);
                          }}
                          className="rounded-lg border border-[#DCE2E1] p-1.5 text-red-600 hover:bg-red-50 dark:border-[#263130] dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: User Profile & Settings */}
      {subTab === 'settings' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Account Settings & Security */}
          <form
            onSubmit={handleSaveSettings}
            className="space-y-5 rounded-2xl border border-[#E3E7E7] bg-white p-6 lg:col-span-7 dark:border-[#202B2A] dark:bg-[#131A1A]"
          >
            <div className="flex items-center gap-2.5 border-b border-[#ECEFEF] pb-4 dark:border-[#202B2A]">
              <Shield className="h-5 w-5 text-[#0B3B2E] dark:text-[#7FE85B]" />
              <div>
                <h2 className="font-display text-lg font-bold text-[#0E1715] dark:text-white">
                  Account &amp; Privacy Settings
                </h2>
                <p className="text-xs text-[#5C6665] dark:text-[#98A4A2]">
                  Configure defaults, anonymity preferences, and credentials
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
                  Preferred Display Currency
                </label>
                <select
                  value={preferredCurrency}
                  onChange={(e) => setPreferredCurrency(e.target.value as FiatCurrency)}
                  className="h-10 w-full rounded-xl border border-[#DCE2E1] bg-white px-3 text-sm text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                >
                  {FIAT_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
                  Default Payment Window
                </label>
                <select
                  value={defaultPaymentWindow}
                  onChange={(e) => setDefaultPaymentWindow(Number(e.target.value))}
                  className="h-10 w-full rounded-xl border border-[#DCE2E1] bg-white px-3 text-sm text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-[#E6EAEA] bg-[#F8FAFA] p-4 dark:border-[#202B2A] dark:bg-[#0F1515]">
              <label className="flex cursor-pointer items-center justify-between text-sm text-[#1E2726] dark:text-[#DCE4E3]">
                <span>Auto-sign escrow terms with PGP fingerprint</span>
                <input
                  type="checkbox"
                  checked={autoPgpSign}
                  onChange={(e) => setAutoPgpSign(e.target.checked)}
                  className="h-4 w-4 accent-[#0B3B2E] dark:accent-[#7FE85B]"
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between text-sm text-[#1E2726] dark:text-[#DCE4E3]">
                <span>Hide &ldquo;Active now&rdquo; online status on public ads</span>
                <input
                  type="checkbox"
                  checked={hideOnlineStatus}
                  onChange={(e) => setHideOnlineStatus(e.target.checked)}
                  className="h-4 w-4 accent-[#0B3B2E] dark:accent-[#7FE85B]"
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between text-sm text-[#1E2726] dark:text-[#DCE4E3]">
                <span>Prioritize Tor-friendly &amp; cash-ready offers</span>
                <input
                  type="checkbox"
                  checked={torFriendlyMode}
                  onChange={(e) => setTorFriendlyMode(e.target.checked)}
                  className="h-4 w-4 accent-[#0B3B2E] dark:accent-[#7FE85B]"
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between text-sm text-[#1E2726] dark:text-[#DCE4E3]">
                <span>Escrow state &amp; release notifications</span>
                <input
                  type="checkbox"
                  checked={escrowAlerts}
                  onChange={(e) => setEscrowAlerts(e.target.checked)}
                  className="h-4 w-4 accent-[#0B3B2E] dark:accent-[#7FE85B]"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 border-t border-[#ECEFEF] pt-4 sm:grid-cols-2 dark:border-[#202B2A]">
              <div>
                <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
                  Change Password (optional)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="h-10 w-full rounded-xl border border-[#DCE2E1] bg-white px-3 text-sm text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="h-10 w-full rounded-xl border border-[#DCE2E1] bg-white px-3 text-sm text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                />
              </div>
            </div>

            {settingsErr && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                {settingsErr}
              </div>
            )}

            <div className="flex items-center justify-between">
              {settingsMsg ? (
                <span className="text-xs font-semibold text-[#0D6832] dark:text-[#7FE85B]">
                  {settingsMsg}
                </span>
              ) : (
                <span />
              )}
              <button
                type="submit"
                disabled={savingSettings}
                className="rounded-xl bg-[#7FE85B] px-6 py-2.5 text-sm font-semibold text-[#082213] hover:bg-[#6AD845]"
              >
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>

          {/* Right: Public Trader Bio & Recovery Seed */}
          <div className="space-y-6 lg:col-span-5">
            <form
              onSubmit={handleSaveProfile}
              className="space-y-4 rounded-2xl border border-[#E3E7E7] bg-white p-6 dark:border-[#202B2A] dark:bg-[#131A1A]"
            >
              <h2 className="font-display text-lg font-bold text-[#0E1715] dark:text-white">
                Public Trader Bio &amp; PGP
              </h2>

              <div>
                <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
                  Bio
                </label>
                <textarea
                  rows={3}
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  className="w-full rounded-xl border border-[#DCE2E1] bg-white p-3 text-sm text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
                  PGP Fingerprint
                </label>
                <input
                  type="text"
                  value={pgpInput}
                  onChange={(e) => setPgpInput(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#DCE2E1] bg-white px-3 font-mono text-xs text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                />
              </div>

              <div className="flex items-center justify-between">
                {profileSaved ? (
                  <span className="text-xs font-semibold text-[#0D6832] dark:text-[#7FE85B]">
                    Profile updated
                  </span>
                ) : (
                  <span />
                )}
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-xl bg-[#0B3B2E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#082B21] dark:bg-[#E8EFEA] dark:text-[#082213]"
                >
                  {savingProfile ? 'Saving...' : 'Update Bio'}
                </button>
              </div>
            </form>

            <div className="rounded-2xl border border-[#E3E7E7] bg-white p-6 dark:border-[#202B2A] dark:bg-[#131A1A]">
              <h3 className="font-display text-sm font-bold text-[#0E1715] dark:text-white">
                Anonymous Recovery Seed
              </h3>
              <p className="mt-1 text-xs text-[#5C6665] dark:text-[#98A4A2]">
                No email is attached to your BitSpend P2P account. Back up this 12-word phrase offline.
              </p>
              <div className="mt-3 rounded-xl border border-[#E6EAEA] bg-[#F8FAFA] p-3.5 dark:border-[#202B2A] dark:bg-[#0F1515]">
                <p className="font-mono text-xs leading-relaxed text-[#0E1715] dark:text-[#DCE4E3]">
                  {user.recoveryPhrase}
                </p>
                <button
                  type="button"
                  onClick={() => handleCopy(user.recoveryPhrase, 'phrase')}
                  className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B3B2E] hover:underline dark:text-[#7FE85B]"
                >
                  {copiedPhrase ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedPhrase ? 'Copied' : 'Copy phrase'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEPOSIT / WITHDRAW MODAL WITH QR GENERATOR */}
      {walletModal && activeMeta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#DCE2E1] bg-white p-6 shadow-xl dark:border-[#263130] dark:bg-[#131A1A]">
            <div className="flex items-center justify-between border-b border-[#ECEFEF] pb-4 dark:border-[#202B2A]">
              <div className="flex items-center gap-2.5">
                <CoinIcon symbol={activeMeta.symbol} size={26} />
                <div>
                  <h2 className="font-display text-lg font-bold text-[#0E1715] dark:text-white">
                    {walletModal.mode === 'deposit' ? 'Deposit' : 'Withdraw'} {activeMeta.name}
                  </h2>
                  <p className="text-xs text-[#5C6665] dark:text-[#98A4A2]">
                    {activeChainOption
                      ? `${activeChainOption.name} (${activeChainOption.standard})`
                      : activeMeta.networkName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWalletModal(null)}
                aria-label="Close wallet dialog"
                className="rounded-lg p-1.5 text-[#5C6665] hover:bg-[#F1F4F3] dark:text-[#98A4A2] dark:hover:bg-[#1E2927]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Chain selector for USDT & USDC */}
            {activeChains && activeChainOption && (
              <div className="mt-4">
                <label className="mb-2 block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
                  Select Network / Chain
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {activeChains.map((ch) => {
                    const isSelected = ch.id === activeChainOption.id;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => {
                          setSelectedChain(ch.id);
                          setCopiedAddr(false);
                        }}
                        className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs transition-colors ${
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

            {walletModal.mode === 'deposit' ? (
              <div className="mt-5 space-y-4">
                <div className="flex flex-col items-center rounded-xl border border-[#E3E7E7] bg-white p-5 dark:border-[#24302E] dark:bg-white">
                  <QRCodeSVG
                    value={activeAddress || `${activeMeta.symbol}:bitspend`}
                    size={168}
                    level="M"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-[#5C6665] dark:text-[#98A4A2] mb-1.5">
                    <span className="inline-flex items-center gap-1.5">
                      {activeChainOption && <ChainIcon chain={activeChainOption.id} size={14} />}
                      <span>
                        {activeMeta.symbol} Deposit Address
                        {activeChainOption ? ` (${activeChainOption.name})` : ''}
                      </span>
                    </span>
                    {activeMeta.symbol === 'XMR' && (
                      <button
                        type="button"
                        disabled={walletBusy}
                        onClick={() => handleRotateAddress(activeMeta.symbol)}
                        className="inline-flex items-center gap-1 font-semibold text-[#0B3B2E] hover:underline dark:text-[#7FE85B]"
                      >
                        <RefreshCw className={`h-3 w-3 ${walletBusy ? 'animate-spin' : ''}`} />
                        <span>Generate New Address</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-[#DCE2E1] bg-[#F8FAFA] px-3 py-2.5 dark:border-[#263130] dark:bg-[#0D1313]">
                    <span className="flex-1 font-mono text-xs text-[#0E1715] dark:text-white break-all">
                      {activeAddress}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(activeAddress, 'addr')}
                      aria-label="Copy address"
                      className="shrink-0 rounded-lg p-1.5 text-[#0B3B2E] hover:bg-[#E7EEEC] dark:text-[#7FE85B] dark:hover:bg-[#1A2623]"
                    >
                      {copiedAddr ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-[#E3E7E7] bg-[#F8FAFA] p-3.5 text-xs leading-relaxed text-[#4B5554] dark:border-[#202B2A] dark:bg-[#0F1515] dark:text-[#98A4A2]">
                  Send only{' '}
                  <strong className="text-[#0E1715] dark:text-white">
                    {activeMeta.name} ({activeMeta.symbol})
                  </strong>{' '}
                  on{' '}
                  <strong className="text-[#0E1715] dark:text-white">
                    {activeChainOption
                      ? `${activeChainOption.name} (${activeChainOption.standard})`
                      : activeMeta.networkName}
                  </strong>{' '}
                  to this address. Funds are credited automatically after network confirmation.
                </div>

                {walletError && (
                  <p className="text-xs text-red-600 dark:text-red-400">{walletError}</p>
                )}
              </div>
            ) : (
              <form onSubmit={handleWithdrawSubmit} className="mt-5 space-y-4">
                <div className="flex items-center justify-between text-xs text-[#5C6665] dark:text-[#98A4A2]">
                  <span>Available Balance</span>
                  <span className="font-mono font-bold text-[#0E1715] dark:text-white">
                    {formatCrypto(user.balances[activeMeta.symbol] ?? 0, activeMeta.symbol)}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
                    Destination {activeMeta.symbol} Address
                    {activeChainOption ? ` (${activeChainOption.name} · ${activeChainOption.standard})` : ''}
                  </label>
                  <input
                    type="text"
                    required
                    value={withdrawAddr}
                    onChange={(e) => setWithdrawAddr(e.target.value)}
                    placeholder={`Paste external ${activeMeta.symbol} wallet address`}
                    className="h-11 w-full rounded-xl border border-[#DCE2E1] bg-white px-3.5 font-mono text-xs text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-[#394241] dark:text-[#C5D1CF]">
                      Amount ({activeMeta.symbol})
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setWithdrawAmt(String(user.balances[activeMeta.symbol] ?? 0))
                      }
                      className="font-mono font-semibold text-[#0B3B2E] hover:underline dark:text-[#7FE85B]"
                    >
                      Max
                    </button>
                  </div>
                  <input
                    type="number"
                    step="any"
                    min="0.0001"
                    required
                    value={withdrawAmt}
                    onChange={(e) => setWithdrawAmt(e.target.value)}
                    placeholder="0.00"
                    className="h-11 w-full rounded-xl border border-[#DCE2E1] bg-white px-3.5 font-mono text-sm font-bold text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#F8FAFA] px-3.5 py-2.5 text-xs dark:bg-[#0F1515]">
                  <span className="text-[#5C6665] dark:text-[#8E9B98]">Estimated Network Fee</span>
                  <span className="font-mono font-semibold text-[#0E1715] dark:text-white">
                    {activeMeta.networkFee} {activeMeta.symbol}
                  </span>
                </div>

                {walletError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                    {walletError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={walletBusy}
                  className="w-full rounded-xl bg-[#0B3B2E] py-3 text-sm font-semibold text-white hover:bg-[#082B21] dark:bg-[#7FE85B] dark:text-[#082213]"
                >
                  {walletBusy ? 'Broadcasting...' : `Withdraw ${activeMeta.symbol}`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
