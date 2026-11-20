import {
  ArrowLeft,
  CalendarClock,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  KeyRound,
  Link2,
  MapPin,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Settings,
  Star,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '../api';
import { CHAIN_OPTIONS, formatCrypto, formatFiat } from '../constants/market';
import type { MarketPrices, P2POffer, TraderProfile, UserAccount } from '../types';
import { PROFILE_THEMES, isSafeImageUrl } from '../utils/profileMedia';
import { ChainIcon, CoinIcon } from './CoinIcon';
import { getOfferUnitPrice } from './OfferRow';
import { ProfileEditorForm } from './ProfileEditorForm';
import { TraderAvatar } from './TraderAvatar';

interface ProfileViewProps {
  username: string;
  initialTrader?: TraderProfile;
  offers: P2POffer[];
  prices: MarketPrices;
  currentUsername?: string;
  currentUser?: UserAccount | null;
  onlineUsers?: string[];
  refreshKey?: number;
  onBackToMarketplace: () => void;
  onSelectOffer: (offer: P2POffer) => void;
  onMessageTrader?: (username: string) => void;
  onOpenAccountSettings: () => void;
  onOpenCreateOffer: () => void;
  onTraderLoaded?: (trader: TraderProfile) => void;
  onUserUpdated?: (user: UserAccount) => void;
}

export function ProfileView({
  username,
  initialTrader,
  offers,
  prices,
  currentUsername,
  currentUser,
  onlineUsers = [],
  refreshKey = 0,
  onBackToMarketplace,
  onSelectOffer,
  onMessageTrader,
  onOpenAccountSettings,
  onOpenCreateOffer,
  onTraderLoaded,
  onUserUpdated,
}: ProfileViewProps) {
  const [trader, setTrader] = useState<TraderProfile | null>(initialTrader ?? null);
  const [traderOffers, setTraderOffers] = useState<P2POffer[]>([]);
  const [isOnlineServer, setIsOnlineServer] = useState<boolean>(false);
  const [isRegisteredUser, setIsRegisteredUser] = useState<boolean>(false);
  const [loading, setLoading] = useState(!initialTrader);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [activeTab, setActiveTab] = useState<'offers' | 'history' | 'feedback'>('offers');
  const [loadingMoreTrades, setLoadingMoreTrades] = useState(false);
  const [loadingMoreFeedback, setLoadingMoreFeedback] = useState(false);
  const [copiedProfileUrl, setCopiedProfileUrl] = useState(false);
  const [copiedOfferId, setCopiedOfferId] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [bannerError, setBannerError] = useState(false);

  useEffect(() => {
    setBannerError(false);
  }, [trader?.bannerUrl]);

  const fetchTraderProfile = useCallback(
    async (showLoader: boolean, force = false) => {
      setNotFound(false);
      setLoadError('');
      if (showLoader) setLoading(true);
      try {
        const res = await api.getTrader(username, force);
        setTrader(res.trader);
        setTraderOffers(res.offers ?? []);
        setIsOnlineServer(Boolean(res.isOnline));
        setIsRegisteredUser(Boolean(res.isRegisteredUser));
        onTraderLoaded?.(res.trader);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setTrader(null);
          setNotFound(true);
        } else {
          setLoadError(
            err instanceof Error ? err.message : 'Unable to load trader profile from server.'
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [username]
  );

  useEffect(() => {
    const hasInitial = Boolean(
      initialTrader && initialTrader.username.toLowerCase() === username.toLowerCase()
    );
    void fetchTraderProfile(!hasInitial, refreshKey > 0);
  }, [username, refreshKey, fetchTraderProfile]);

  const isOwnProfile = Boolean(
    currentUsername && trader && currentUsername.toLowerCase() === trader.username.toLowerCase()
  );

  const isLiveOnline = Boolean(
    trader &&
      (onlineUsers.some((u) => u.toLowerCase() === trader.username.toLowerCase()) ||
        isOnlineServer ||
        trader.lastSeenMinutes === 0)
  );

  const mergedActiveOffers = trader
    ? offers.filter((o) => o.traderUsername.toLowerCase() === trader.username.toLowerCase() && o.active)
    : [];
  const activeOffers = mergedActiveOffers.length > 0 ? mergedActiveOffers : traderOffers;

  const handleCopyProfileLink = async () => {
    if (!trader) return;
    const url = `${window.location.origin}/${encodeURIComponent(trader.username)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedProfileUrl(true);
      setTimeout(() => setCopiedProfileUrl(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyOfferLink = async (offerId: string) => {
    const url = `${window.location.origin}/offer/${encodeURIComponent(offerId)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedOfferId(offerId);
      setTimeout(() => setCopiedOfferId(null), 1800);
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
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#4B5554] hover:text-[#0E1715] dark:text-[#98A4A2] dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Marketplace</span>
        </button>
        <div className="h-56 animate-pulse rounded-2xl border border-[#E3E7E7] bg-white dark:border-[#202B2A] dark:bg-[#131A1A]" />
      </div>
    );
  }

  if (!trader) {
    if (loadError && !notFound) {
      return (
        <div className="mx-auto max-w-xl rounded-2xl border border-[#E3E7E7] bg-white p-8 text-center dark:border-[#202B2A] dark:bg-[#131A1A]">
          <h1 className="font-display text-xl font-bold text-[#0E1715] dark:text-white">
            Unable to Load /{username}
          </h1>
          <p className="mt-2 text-sm text-[#5C6665] dark:text-[#98A4A2]">{loadError}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            <button
              type="button"
              onClick={() => void fetchTraderProfile(true)}
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
              <span>Return to P2P Offers</span>
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-[#E3E7E7] bg-white p-8 text-center dark:border-[#202B2A] dark:bg-[#131A1A]">
        <h1 className="font-display text-xl font-bold text-[#0E1715] dark:text-white">
          Trader @{username} Not Found
        </h1>
        <p className="mt-2 text-sm text-[#5C6665] dark:text-[#98A4A2]">
          No trader profile or registered account exists at /{username}.
        </p>
        <button
          type="button"
          onClick={onBackToMarketplace}
          className="mt-5 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#7FE85B] px-5 py-2.5 text-sm font-semibold text-[#082213] hover:bg-[#6AD845]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to P2P Offers</span>
        </button>
      </div>
    );
  }

  const tradeHistory = trader.tradeHistory ?? [];
  const feedbackList = trader.recentFeedback ?? [];
  const totalTrades = Math.max(tradeHistory.length, trader.tradesCount);
  const totalFeedback = Math.max(
    feedbackList.length,
    trader.totalFeedbackCount ?? feedbackList.length
  );
  const volumeUsd = trader.totalVolumeUsd ?? (trader.tradesCount > 0 ? trader.tradesCount * 420 : 0);

  const handleLoadMoreTrades = async () => {
    if (loadingMoreTrades || tradeHistory.length >= totalTrades) return;
    setLoadingMoreTrades(true);
    try {
      const res = await api.getTraderTrades(trader.username, tradeHistory.length, 20);
      setTrader((prev) => {
        if (!prev) return prev;
        const existing = prev.tradeHistory ?? [];
        const seen = new Set(existing.map((r) => r.id));
        const nextItems = res.items.filter((r) => !seen.has(r.id));
        return { ...prev, tradeHistory: [...existing, ...nextItems] };
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
        if (!prev) return prev;
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
    <div className="space-y-6">
      {/* Top Breadcrumb Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToMarketplace}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#DCE2E1] bg-white px-3.5 py-2 text-xs font-semibold text-[#1E2726] hover:bg-[#F5F7F7] dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#DCE4E3] dark:hover:bg-[#1B2423]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>All P2P Offers</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyProfileLink}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#DCE2E1] bg-white px-3.5 py-2 font-mono text-xs font-semibold text-[#0E1715] hover:bg-[#F5F7F7] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white dark:hover:bg-[#1B2423]"
          >
            {copiedProfileUrl ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#0D6832] dark:text-[#7FE85B]" />
                <span>Copied /{trader.username}</span>
              </>
            ) : (
              <>
                <Link2 className="h-3.5 w-3.5 text-[#0B3B2E] dark:text-[#7FE85B]" />
                <span>Copy /{trader.username}</span>
              </>
            )}
          </button>

          {!isOwnProfile && onMessageTrader && (
            <button
              type="button"
              onClick={() => onMessageTrader(trader.username)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#7FE85B] px-4 py-2 text-xs font-semibold text-[#082213] hover:bg-[#6AD845]"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Message @{trader.username}</span>
            </button>
          )}

          {isOwnProfile && (
            <>
              {currentUser && (
                <button
                  type="button"
                  onClick={() => setEditingProfile(true)}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#0B3B2E] bg-[#EEF6F2] px-3.5 py-2 text-xs font-semibold text-[#0B3B2E] hover:bg-[#DFF0E6] dark:border-[#7FE85B]/50 dark:bg-[#152B20] dark:text-[#7FE85B] dark:hover:bg-[#1B3729]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Customize Profile</span>
                </button>
              )}
              <button
                type="button"
                onClick={onOpenAccountSettings}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#DCE2E1] bg-white px-3.5 py-2 text-xs font-semibold text-[#1E2726] hover:bg-[#F5F7F7] dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#DCE4E3] dark:hover:bg-[#1B2423]"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Wallet &amp; Settings</span>
              </button>
              <button
                type="button"
                onClick={onOpenCreateOffer}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#7FE85B] px-4 py-2 text-xs font-semibold text-[#082213] hover:bg-[#6AD845]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Offer</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Profile Header Card with Cover Banner + Avatar */}
      {(() => {
        const themeCfg = PROFILE_THEMES[trader.accentTheme ?? 'emerald'] ?? PROFILE_THEMES.emerald;
        const showBanner = !bannerError && isSafeImageUrl(trader.bannerUrl);
        return (
          <div className="overflow-hidden rounded-2xl border border-[#E3E7E7] bg-white dark:border-[#202B2A] dark:bg-[#131A1A]">
            {/* Cover Banner */}
            <div className={`relative h-32 w-full sm:h-40 bg-gradient-to-r ${themeCfg.bannerGradient}`}>
              {showBanner && (
                <img
                  src={trader.bannerUrl}
                  alt={`${trader.username} banner`}
                  onError={() => setBannerError(true)}
                  className="h-full w-full object-cover"
                />
              )}
              {isOwnProfile && currentUser && (
                <button
                  type="button"
                  onClick={() => setEditingProfile(true)}
                  className="absolute right-4 top-3 inline-flex items-center gap-1.5 rounded-lg bg-black/50 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-xs hover:bg-black/70"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>Edit Cover &amp; Photo</span>
                </button>
              )}
            </div>

            <div className="p-5 sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="-mt-14 relative self-start rounded-2xl ring-4 ring-white dark:ring-[#131A1A] sm:-mt-16">
                    <TraderAvatar
                      username={trader.username}
                      avatarUrl={trader.avatarUrl}
                      accentTheme={trader.accentTheme}
                      size={88}
                      rounded="2xl"
                      online={isLiveOnline}
                    />
                    {isOwnProfile && currentUser && (
                      <button
                        type="button"
                        onClick={() => setEditingProfile(true)}
                        title="Change profile image"
                        className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-full border border-[#DCE2E1] bg-white text-[#0B3B2E] shadow-xs hover:bg-[#EEF6F2] dark:border-[#2A3735] dark:bg-[#172120] dark:text-[#7FE85B]"
                      >
                        <Camera className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="min-w-0 pt-0.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h1 className="font-display text-2xl font-bold tracking-tight text-[#0E1715] sm:text-3xl dark:text-white">
                        {trader.username}
                      </h1>
                      {trader.verified && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0D6832] dark:text-[#7FE85B]">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Verified High-Volume</span>
                        </span>
                      )}
                      {isOwnProfile && (
                        <span className="text-xs font-semibold text-[#0B3B2E] dark:text-[#7FE85B]">
                          · Your Public Profile
                        </span>
                      )}
                    </div>

                    {trader.tagline && (
                      <p className="mt-1 text-sm font-medium text-[#0B3B2E] dark:text-[#7FE85B]">
                        {trader.tagline}
                      </p>
                    )}

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#5C6665] dark:text-[#98A4A2]">
                      <span className="font-medium text-[#1E2726] dark:text-[#DCE4E3]">
                        {isLiveOnline
                          ? 'Online now'
                          : `Last seen ${trader.lastSeenMinutes}m ago`}
                      </span>
                      <span>· Joined {trader.joinedAt}</span>
                      <span>· Languages: {trader.languages.join(', ')}</span>
                      {trader.location && (
                        <span className="inline-flex items-center gap-1">
                          · <MapPin className="h-3.5 w-3.5" />
                          <span>{trader.location}</span>
                        </span>
                      )}
                      {trader.tradingHours && (
                        <span className="inline-flex items-center gap-1">
                          · <CalendarClock className="h-3.5 w-3.5" />
                          <span>{trader.tradingHours}</span>
                        </span>
                      )}
                      {isRegisteredUser && <span>· Member Account</span>}
                    </div>

                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#2D3635] dark:text-[#D1DCDA]">
                      {trader.bio}
                    </p>

                    {trader.preferredMethods && trader.preferredMethods.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#4F5A58] dark:text-[#98A4A2]">
                        <span className="font-semibold text-[#0E1715] dark:text-white">
                          Preferred Payment Rails:
                        </span>
                        <span>{trader.preferredMethods.join(' · ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

        {/* Key Stats Row */}
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-5 sm:gap-3">
          <div className="rounded-xl border border-[#E6EAEA] bg-[#F8FAFA] p-3.5 dark:border-[#202B2A] dark:bg-[#0F1515]">
            <div className="text-xs text-[#5C6665] dark:text-[#8E9B98]">Trust Score</div>
            <div className="mt-1 flex items-center gap-1 font-mono text-lg font-bold tabular-nums text-[#0E1715] dark:text-white">
              <Star className="h-4 w-4 fill-[#16A34A] text-[#16A34A] dark:fill-[#7FE85B] dark:text-[#7FE85B]" />
              <span>{trader.ratingPct}%</span>
            </div>
          </div>
          <div className="rounded-xl border border-[#E6EAEA] bg-[#F8FAFA] p-3.5 dark:border-[#202B2A] dark:bg-[#0F1515]">
            <div className="text-xs text-[#5C6665] dark:text-[#8E9B98]">Total Trades</div>
            <div className="mt-1 font-mono text-lg font-bold tabular-nums text-[#0E1715] dark:text-white">
              {trader.tradesCount.toLocaleString('en-US')}
            </div>
          </div>
          <div className="rounded-xl border border-[#E6EAEA] bg-[#F8FAFA] p-3.5 dark:border-[#202B2A] dark:bg-[#0F1515]">
            <div className="text-xs text-[#5C6665] dark:text-[#8E9B98]">Est. Volume</div>
            <div className="mt-1 font-mono text-lg font-bold tabular-nums text-[#0B3B2E] dark:text-[#7FE85B]">
              {volumeUsd >= 1000
                ? `$${(volumeUsd / 1000).toFixed(1)}k`
                : `$${volumeUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
            </div>
          </div>
          <div className="rounded-xl border border-[#E6EAEA] bg-[#F8FAFA] p-3.5 dark:border-[#202B2A] dark:bg-[#0F1515]">
            <div className="text-xs text-[#5C6665] dark:text-[#8E9B98]">Avg. Release</div>
            <div className="mt-1 flex items-center gap-1 font-mono text-lg font-bold tabular-nums text-[#0E1715] dark:text-white">
              <Clock className="h-4 w-4 text-[#5C6665]" />
              <span>{trader.avgReleaseMinutes}m</span>
            </div>
          </div>
          <div className="col-span-2 flex items-center justify-between rounded-xl border border-[#E6EAEA] bg-[#F8FAFA] p-3.5 sm:col-span-1 sm:block dark:border-[#202B2A] dark:bg-[#0F1515]">
            <div className="text-xs text-[#5C6665] dark:text-[#8E9B98]">Completion</div>
            <div className="font-mono text-lg font-bold tabular-nums text-[#0E1715] sm:mt-1 dark:text-white">
              {trader.completionRatePct ?? (trader.tradesCount > 0 ? 99.4 : 100)}%
            </div>
          </div>
        </div>

        {/* PGP Fingerprint */}
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-[#E6EAEA] bg-[#F8FAFA] px-3.5 py-2.5 dark:border-[#202B2A] dark:bg-[#0F1515]">
          <KeyRound className="h-4 w-4 shrink-0 text-[#5C6665]" />
          <div className="min-w-0">
            <span className="mr-2 text-xs font-semibold text-[#4B5554] dark:text-[#98A4A2]">
              PGP Fingerprint:
            </span>
            <span className="break-all font-mono text-xs text-[#0E1715] dark:text-[#DCE4E3]">
              {trader.pgpFingerprint}
            </span>
          </div>
        </div>
            </div>
          </div>
        );
      })()}

      {/* Tabs Card: Active Offers | Trade History | Feedback */}
      <div className="rounded-2xl border border-[#E3E7E7] bg-white p-4 sm:p-6 dark:border-[#202B2A] dark:bg-[#131A1A]">
        <div className="grid grid-cols-3 border-b border-[#ECEFEF] sm:flex sm:items-center sm:gap-2 dark:border-[#202B2A]">
          <button
            type="button"
            onClick={() => setActiveTab('offers')}
            className={`border-b-2 px-2 py-2.5 text-center text-xs font-bold transition-colors sm:px-4 ${
              activeTab === 'offers'
                ? 'border-[#0B3B2E] text-[#0E1715] dark:border-[#7FE85B] dark:text-white'
                : 'border-transparent text-[#5C6665] hover:text-[#0E1715] dark:text-[#98A4A2]'
            }`}
          >
            Active Offers ({activeOffers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`border-b-2 px-2 py-2.5 text-center text-xs font-bold transition-colors sm:px-4 ${
              activeTab === 'history'
                ? 'border-[#0B3B2E] text-[#0E1715] dark:border-[#7FE85B] dark:text-white'
                : 'border-transparent text-[#5C6665] hover:text-[#0E1715] dark:text-[#98A4A2]'
            }`}
          >
            Trades ({totalTrades.toLocaleString('en-US')})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('feedback')}
            className={`border-b-2 px-2 py-2.5 text-center text-xs font-bold transition-colors sm:px-4 ${
              activeTab === 'feedback'
                ? 'border-[#0B3B2E] text-[#0E1715] dark:border-[#7FE85B] dark:text-white'
                : 'border-transparent text-[#5C6665] hover:text-[#0E1715] dark:text-[#98A4A2]'
            }`}
          >
            Feedback ({totalFeedback.toLocaleString('en-US')})
          </button>
        </div>

        {/* Active Offers Tab */}
        {activeTab === 'offers' && (
          <div className="mt-4 space-y-2.5">
            {activeOffers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#DCE2E1] p-6 text-center dark:border-[#24302F]">
                <p className="text-sm text-[#5C6665] dark:text-[#98A4A2]">
                  {isOwnProfile
                    ? "You don't have any active P2P offers listed right now."
                    : `${trader.username} doesn't have any active offers right now.`}
                </p>
                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={onOpenCreateOffer}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#7FE85B] px-4 py-2 text-xs font-semibold text-[#082213] hover:bg-[#6AD845]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create Your First Offer</span>
                  </button>
                )}
              </div>
            ) : (
              activeOffers.map((offer) => {
                const unitPrice = getOfferUnitPrice(offer, prices);
                const isBuy = offer.side === 'sell_crypto';
                const isSwap = offer.side === 'swap_crypto' && !!offer.swapToCrypto;
                const offerCopied = copiedOfferId === offer.id;
                return (
                  <div
                    key={offer.id}
                    className="flex flex-col gap-3 rounded-xl border border-[#E6EAEA] p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4 dark:border-[#202B2A]"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <CoinIcon symbol={offer.crypto} size={24} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-[#0E1715] dark:text-white">
                          <span>
                            {isSwap
                              ? `Swap ${offer.swapToCrypto} → ${offer.crypto}`
                              : `${isBuy ? `Buy ${offer.crypto}` : `Sell ${offer.crypto}`} · ${offer.paymentMethod}`}
                          </span>
                          {offer.cryptoChain && CHAIN_OPTIONS[offer.cryptoChain] && (
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-[#5C6665] dark:text-[#98A4A2]">
                              <ChainIcon chain={offer.cryptoChain} size={12} />
                              <span>{CHAIN_OPTIONS[offer.cryptoChain].standard}</span>
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 font-mono text-xs tabular-nums text-[#5C6665] dark:text-[#98A4A2]">
                          {isSwap && offer.swapToCrypto
                            ? `1 ${offer.crypto} = ${formatCrypto(unitPrice, offer.swapToCrypto)} · Limits ${offer.minSwapAmount ?? 0}–${offer.maxSwapAmount ?? 0} ${offer.swapToCrypto}`
                            : `${formatFiat(unitPrice, offer.fiat)} · Limits ${offer.minFiat}–${offer.maxFiat} ${offer.fiat}`}{' '}
                          · {offer.id}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyOfferLink(offer.id)}
                        className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-[#DCE2E1] px-3 py-1.5 text-xs font-semibold text-[#394241] hover:bg-[#F5F7F7] dark:border-[#263130] dark:text-[#C5D1CF] dark:hover:bg-[#1B2423]"
                      >
                        {offerCopied ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-[#0D6832] dark:text-[#7FE85B]" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Share Link</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectOffer(offer)}
                        className="min-h-[38px] rounded-lg bg-[#7FE85B] px-4 py-1.5 text-xs font-semibold text-[#082213] hover:bg-[#6AD845]"
                      >
                        {isOwnProfile ? 'View Live' : 'Trade'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Trade History Tab */}
        {activeTab === 'history' && (
          <div className="mt-4 space-y-3">
            {tradeHistory.length === 0 ? (
              <p className="text-sm text-[#5C6665] dark:text-[#98A4A2]">
                No completed trades logged yet.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-[#E6EAEA] dark:border-[#202B2A]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFA] text-[#5C6665] dark:bg-[#0F1515] dark:text-[#8E9B98]">
                      <tr>
                        <th className="px-3.5 py-2.5 font-semibold">Trade</th>
                        <th className="px-3.5 py-2.5 font-semibold">Asset &amp; Amount</th>
                        <th className="px-3.5 py-2.5 font-semibold">Fiat Value</th>
                        <th className="px-3.5 py-2.5 font-semibold">Method</th>
                        <th className="px-3.5 py-2.5 text-right font-semibold">Settled</th>
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
                            {rec.fiatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                            {rec.fiat}
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

                {tradeHistory.length < totalTrades && (
                  <div className="flex items-center justify-between text-xs text-[#5C6665] dark:text-[#8E9B98]">
                    <span className="font-mono tabular-nums">
                      Showing {tradeHistory.length.toLocaleString('en-US')} of{' '}
                      {totalTrades.toLocaleString('en-US')} trades
                    </span>
                    <button
                      type="button"
                      disabled={loadingMoreTrades}
                      onClick={handleLoadMoreTrades}
                      className="rounded-xl border border-[#DCE2E1] bg-white px-4 py-2 text-xs font-semibold text-[#0E1715] hover:bg-[#F5F7F7] disabled:opacity-60 dark:border-[#263130] dark:bg-[#0F1515] dark:text-white"
                    >
                      {loadingMoreTrades
                        ? 'Loading...'
                        : `Load more (${(totalTrades - tradeHistory.length).toLocaleString('en-US')})`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Feedback Tab */}
        {activeTab === 'feedback' && (
          <div className="mt-4 space-y-3">
            {feedbackList.length === 0 ? (
              <p className="text-sm text-[#5C6665] dark:text-[#98A4A2]">
                No feedback reviews recorded yet.
              </p>
            ) : (
              <>
                <div className="divide-y divide-[#ECEFEF] rounded-xl border border-[#E6EAEA] dark:divide-[#202B2A] dark:border-[#202B2A]">
                  {feedbackList.map((fb) => (
                    <div key={fb.id} className="flex items-start gap-3 px-4 py-3.5">
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

                {feedbackList.length < totalFeedback && (
                  <div className="flex items-center justify-between text-xs text-[#5C6665] dark:text-[#8E9B98]">
                    <span className="font-mono tabular-nums">
                      Showing {feedbackList.length.toLocaleString('en-US')} of{' '}
                      {totalFeedback.toLocaleString('en-US')} reviews
                    </span>
                    <button
                      type="button"
                      disabled={loadingMoreFeedback}
                      onClick={handleLoadMoreFeedback}
                      className="rounded-xl border border-[#DCE2E1] bg-white px-4 py-2 text-xs font-semibold text-[#0E1715] hover:bg-[#F5F7F7] disabled:opacity-60 dark:border-[#263130] dark:bg-[#0F1515] dark:text-white"
                    >
                      {loadingMoreFeedback
                        ? 'Loading...'
                        : `See more feedback (${(totalFeedback - feedbackList.length).toLocaleString('en-US')})`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Inline Profile Customization Modal */}
      {editingProfile && currentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-[2px] sm:p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#DCE2E1] bg-white p-4 shadow-xl sm:p-6 dark:border-[#263130] dark:bg-[#131A1A]">
            <div className="mb-4 flex items-center justify-between border-b border-[#ECEFEF] pb-3.5 dark:border-[#202B2A]">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0E1715] dark:text-white">
                  Customize Your Public Profile
                </h2>
                <p className="text-xs text-[#5C6665] dark:text-[#98A4A2]">
                  Add a profile photo, cover banner, headline, theme, and preferred payment methods
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProfile(false)}
                aria-label="Close profile editor"
                className="rounded-lg p-1.5 text-[#5C6665] hover:bg-[#F1F4F3] dark:text-[#98A4A2] dark:hover:bg-[#1E2927]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ProfileEditorForm
              user={currentUser}
              onSaved={(updatedUser, updatedTrader) => {
                onUserUpdated?.(updatedUser);
                if (updatedTrader) {
                  setTrader(updatedTrader);
                  onTraderLoaded?.(updatedTrader);
                }
                setEditingProfile(false);
              }}
              onCancel={() => setEditingProfile(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
