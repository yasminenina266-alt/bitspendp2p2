import { ArrowUpDown, ChevronDown, Lock, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from './api';
import { AccountView } from './components/AccountView';
import { AuthModal } from './components/AuthModal';
import { CoinIcon } from './components/CoinIcon';
import { CreateOfferModal } from './components/CreateOfferModal';
import { CryptoCardView } from './components/CryptoCardView';
import { Header, type AppTab } from './components/Header';
import { OfferFilterBar, type OfferFilters } from './components/OfferFilterBar';
import { OfferRow, getOfferUnitPrice } from './components/OfferRow';
import { SwapView } from './components/SwapView';
import { TradeModal } from './components/TradeModal';
import { TraderProfileModal } from './components/TraderProfileModal';
import { CRYPTO_ASSETS } from './constants/market';
import type {
  MarketPrices,
  P2POffer,
  SwapOrder,
  TradeOrder,
  TraderProfile,
  UserAccount,
  VirtualCard,
} from './types';

type SortOption = 'best' | 'price_asc' | 'price_desc' | 'trades' | 'rating';

const INITIAL_FILTERS: OfferFilters = {
  intent: 'buy',
  crypto: 'ALL',
  paymentMethod: '',
  fiat: 'ALL',
  country: 'ALL',
  amount: '',
  hideInactive: true,
  verifiedOnly: false,
  minRating: 0,
  selectedTags: [],
};

const FALLBACK_PRICES: MarketPrices = {
  usdPrices: {
    BTC: 91250,
    XMR: 184.6,
    ETH: 3140,
    USDT: 1,
    LTC: 86.4,
    SOL: 214.5,
    USDC: 1,
  },
  fiatRatesFromUsd: {
    USD: 1,
    EUR: 0.925,
    GBP: 0.788,
    BHD: 0.376,
    IDR: 15850,
    CAD: 1.395,
    AUD: 1.535,
    CHF: 0.882,
    SGD: 1.338,
    AED: 3.6725,
    JPY: 154.2,
    BRL: 5.76,
    INR: 84.4,
    NGN: 1665,
    TRY: 34.4,
    MXN: 20.35,
  },
  changes24h: {
    BTC: 2.1,
    XMR: 3.4,
    ETH: 1.8,
    USDT: 0,
    LTC: 0.9,
    SOL: 4.1,
    USDC: 0,
  },
  source: 'Loading live rates...',
  updatedAt: 0,
};

function normalizePrices(raw?: Partial<MarketPrices> | null): MarketPrices {
  if (!raw || typeof raw !== 'object') return FALLBACK_PRICES;
  return {
    usdPrices: {
      ...FALLBACK_PRICES.usdPrices,
      ...(raw.usdPrices && typeof raw.usdPrices === 'object' ? raw.usdPrices : {}),
    },
    fiatRatesFromUsd: {
      ...FALLBACK_PRICES.fiatRatesFromUsd,
      ...(raw.fiatRatesFromUsd && typeof raw.fiatRatesFromUsd === 'object'
        ? raw.fiatRatesFromUsd
        : {}),
    },
    changes24h: {
      ...FALLBACK_PRICES.changes24h,
      ...(raw.changes24h && typeof raw.changes24h === 'object' ? raw.changes24h : {}),
    },
    source: typeof raw.source === 'string' && raw.source ? raw.source : FALLBACK_PRICES.source,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
  };
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem('bitspend_theme') === 'dark';
    } catch {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState<AppTab>('offers');
  const [prices, setPrices] = useState<MarketPrices>(FALLBACK_PRICES);
  const [refreshingPrices, setRefreshingPrices] = useState(false);

  const [offers, setOffers] = useState<P2POffer[]>([]);
  const [traders, setTraders] = useState<Record<string, TraderProfile>>({});
  const [loadingOffers, setLoadingOffers] = useState(true);

  const [filters, setFilters] = useState<OfferFilters>(INITIAL_FILTERS);
  const [sortBy, setSortBy] = useState<SortOption>('best');
  const [visibleCount, setVisibleCount] = useState(20);

  // Auth & User State
  const [user, setUser] = useState<UserAccount | null>(null);
  const [trades, setTrades] = useState<TradeOrder[]>([]);
  const [swaps, setSwaps] = useState<SwapOrder[]>([]);
  const [cards, setCards] = useState<VirtualCard[]>([]);

  // Modals
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null);
  const [createOfferOpen, setCreateOfferOpen] = useState(false);
  const [selectedTrader, setSelectedTrader] = useState<TraderProfile | null>(null);
  const [tradeModalState, setTradeModalState] = useState<{
    offer?: P2POffer;
    existingTrade?: TradeOrder;
  } | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    try {
      localStorage.setItem('bitspend_theme', darkMode ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [darkMode]);

  const loadPrices = useCallback(async (force = false) => {
    setRefreshingPrices(true);
    try {
      const data = await api.getPrices(force);
      if (data?.usdPrices && typeof data.usdPrices.BTC === 'number') {
        setPrices(normalizePrices(data));
      }
    } catch {
      // keep existing prices
    } finally {
      setRefreshingPrices(false);
    }
  }, []);

  const loadMarketplace = useCallback(async () => {
    try {
      const data = await api.getOffers();
      if (Array.isArray(data?.offers)) setOffers(data.offers);
      if (data?.traders && typeof data.traders === 'object') setTraders(data.traders);
    } catch {
      // keep existing offers/traders on transient error
    } finally {
      setLoadingOffers(false);
    }
  }, []);

  const loadUserWorkspace = useCallback(async () => {
    if (!getToken()) return;
    try {
      const [meRes, tradesRes, swapsRes, cardsRes] = await Promise.all([
        api.getMe(),
        api.getTrades(),
        api.getSwaps(),
        api.getCards(),
      ]);
      if (meRes?.user) {
        setUser(meRes.user);
        setTrades(Array.isArray(tradesRes?.trades) ? tradesRes.trades : []);
        setSwaps(Array.isArray(swapsRes?.swaps) ? swapsRes.swaps : []);
        setCards(Array.isArray(cardsRes?.cards) ? cardsRes.cards : []);
      }
    } catch {
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    loadPrices(false);
    loadMarketplace();
    loadUserWorkspace();
    const timer = setInterval(() => loadPrices(false), 60_000);
    return () => clearInterval(timer);
  }, [loadPrices, loadMarketplace, loadUserWorkspace]);

  const handleAuthSuccess = (authedUser: UserAccount) => {
    setUser(authedUser);
    loadMarketplace();
    loadUserWorkspace();
  };

  const handleLogout = async () => {
    await api.logout().catch(() => undefined);
    setToken(null);
    setUser(null);
    setTrades([]);
    setSwaps([]);
    setCards([]);
  };

  const handleSelectTrader = async (username: string) => {
    if (traders[username]) {
      setSelectedTrader(traders[username]);
      return;
    }
    try {
      const res = await api.getTrader(username);
      setSelectedTrader(res.trader);
    } catch {
      // ignore
    }
  };

  const parsedAmount = useMemo(() => {
    const n = Number(filters.amount);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [filters.amount]);

  const filteredOffers = useMemo(() => {
    const targetSide =
      filters.intent === 'buy'
        ? 'sell_crypto'
        : filters.intent === 'sell'
          ? 'buy_crypto'
          : 'swap_crypto';
    const pmQuery = filters.paymentMethod.trim().toLowerCase();

    const list = offers.filter((offer) => {
      if (offer.side !== targetSide) return false;
      if (filters.hideInactive && !offer.active) return false;
      if (filters.crypto !== 'ALL') {
        if (targetSide === 'swap_crypto') {
          if (offer.crypto !== filters.crypto && offer.swapToCrypto !== filters.crypto) {
            return false;
          }
        } else if (offer.crypto !== filters.crypto) {
          return false;
        }
      }
      if (targetSide !== 'swap_crypto') {
        if (filters.fiat !== 'ALL' && offer.fiat !== filters.fiat) return false;
        if (filters.country !== 'ALL' && offer.country !== filters.country) return false;
      }
      if (pmQuery && !offer.paymentMethod.toLowerCase().includes(pmQuery)) return false;
      if (parsedAmount !== null) {
        if (offer.side === 'swap_crypto' && offer.swapToCrypto) {
          const minS = offer.minSwapAmount ?? offer.minFiat / (prices.usdPrices[offer.swapToCrypto] ?? 1);
          const maxS = offer.maxSwapAmount ?? offer.maxFiat / (prices.usdPrices[offer.swapToCrypto] ?? 1);
          if (parsedAmount < minS || parsedAmount > maxS) return false;
        } else if (parsedAmount < offer.minFiat || parsedAmount > offer.maxFiat) {
          return false;
        }
      }

      const trader = traders[offer.traderUsername];
      if (filters.verifiedOnly && !trader?.verified) return false;
      if (filters.minRating > 0 && (trader?.ratingPct ?? 100) < filters.minRating) return false;
      if (
        filters.selectedTags.length > 0 &&
        !filters.selectedTags.every((tag) => offer.tags.includes(tag))
      ) {
        return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      const traderA = traders[a.traderUsername];
      const traderB = traders[b.traderUsername];
      if (sortBy === 'trades') {
        return (traderB?.tradesCount ?? 0) - (traderA?.tradesCount ?? 0);
      }
      if (sortBy === 'rating') {
        return (traderB?.ratingPct ?? 100) - (traderA?.ratingPct ?? 100);
      }
      if (sortBy === 'price_asc' || sortBy === 'price_desc') {
        const usdA =
          a.side === 'swap_crypto' && a.swapToCrypto
            ? getOfferUnitPrice(a, prices) * (prices.usdPrices[a.swapToCrypto] ?? 1)
            : getOfferUnitPrice(a, prices) / (prices.fiatRatesFromUsd[a.fiat] ?? 1);
        const usdB =
          b.side === 'swap_crypto' && b.swapToCrypto
            ? getOfferUnitPrice(b, prices) * (prices.usdPrices[b.swapToCrypto] ?? 1)
            : getOfferUnitPrice(b, prices) / (prices.fiatRatesFromUsd[b.fiat] ?? 1);
        return sortBy === 'price_asc' ? usdA - usdB : usdB - usdA;
      }
      // 'best': favorable margin + online + trade reputation
      const score = (o: P2POffer, t?: TraderProfile) => {
        const marginScore = o.side === 'sell_crypto' || o.side === 'swap_crypto' ? -o.marginPct : o.marginPct;
        const onlineBonus = t?.lastSeenMinutes === 0 ? 5 : 0;
        const repBonus = Math.min((t?.tradesCount ?? 0) / 500, 5);
        return marginScore + onlineBonus + repBonus;
      };
      return score(b, traderB) - score(a, traderA);
    });
  }, [offers, traders, filters, parsedAmount, sortBy, prices]);

  const activeTradesCount = trades.filter(
    (t) => t.status === 'escrow_funded' || t.status === 'payment_sent' || t.status === 'disputed'
  ).length;

  const myOffers = user ? offers.filter((o) => o.traderUsername === user.username) : [];

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F5F5] text-[#111817] dark:bg-[#0B1010] dark:text-[#EAF0EF]">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        user={user}
        activeTradesCount={activeTradesCount}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((d) => !d)}
        onOpenAuth={(mode) => setAuthModal(mode)}
        onLogout={handleLogout}
      />

      <main className="mx-auto w-full max-w-[1380px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {activeTab === 'offers' && (
          <div className="space-y-6">
            {/* Filter Toolbar */}
            <OfferFilterBar
              filters={filters}
              onChange={(next) => {
                setFilters(next);
                setVisibleCount(20);
              }}
              onReset={() => {
                setFilters({ ...INITIAL_FILTERS, intent: filters.intent });
                setVisibleCount(20);
              }}
              prices={prices}
            />

            {/* Live Spot Rates Strip (Powered by CoinGecko / CryptoCompare / Kraken) */}
            <div className="rounded-xl border border-[#E3E7E7] bg-white p-3 text-xs sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:px-4 sm:py-2.5 dark:border-[#1E2726] dark:bg-[#131A1A]">
              {/* Mobile Top Status Bar */}
              <div className="mb-2.5 flex items-center justify-between border-b border-[#ECEFEF] pb-2 text-[#5C6665] sm:hidden dark:border-[#202B2A] dark:text-[#8E9B98]">
                <span className="inline-flex items-center gap-1 font-medium">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#0D6832] dark:text-[#7FE85B]" />
                  <span>Zero KYC</span>
                </span>
                <button
                  type="button"
                  onClick={() => loadPrices(true)}
                  className="inline-flex items-center gap-1.5 font-medium hover:text-[#0E1715] dark:hover:text-white"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshingPrices ? 'animate-spin' : ''}`} />
                  <span className="truncate max-w-[180px]">{prices.source}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2">
                {CRYPTO_ASSETS.slice(0, 5).map((coin, idx) => {
                  const price = prices?.usdPrices?.[coin.symbol] ?? 0;
                  const chg = prices?.changes24h?.[coin.symbol] ?? 0;
                  const active = filters.crypto === coin.symbol;
                  return (
                    <button
                      key={coin.symbol}
                      type="button"
                      onClick={() =>
                        setFilters((f) => ({
                          ...f,
                          crypto: f.crypto === coin.symbol ? 'ALL' : coin.symbol,
                        }))
                      }
                      className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 transition-colors sm:justify-start sm:border-transparent sm:px-2 sm:py-1 ${
                        idx === 0 ? 'col-span-2 sm:col-span-1' : ''
                      } ${
                        active
                          ? 'border-[#0B3B2E]/25 bg-[#EEF6F2] font-bold text-[#0B3B2E] sm:border-transparent dark:border-[#7FE85B]/30 dark:bg-[#162C22] dark:text-[#7FE85B]'
                          : 'border-[#ECEFEF] bg-[#F9FAFA] hover:bg-[#F5F7F7] sm:bg-transparent dark:border-[#1E2726] dark:bg-[#0F1515] dark:hover:bg-[#1B2423] dark:sm:bg-transparent'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <CoinIcon symbol={coin.symbol} size={16} />
                        <span className="font-semibold">{coin.symbol}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="font-mono tabular-nums text-[#0E1715] dark:text-white">
                          ${price.toLocaleString('en-US', {
                            minimumFractionDigits: price < 10 ? 2 : 0,
                            maximumFractionDigits: price < 10 ? 2 : 0,
                          })}
                        </span>
                        <span
                          className={`font-mono text-[11px] tabular-nums ${
                            chg >= 0
                              ? 'text-[#0D6832] dark:text-[#7FE85B]'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {chg >= 0 ? `+${chg.toFixed(1)}%` : `${chg.toFixed(1)}%`}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="hidden sm:flex items-center gap-3 text-[#5C6665] dark:text-[#8E9B98]">
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#0D6832] dark:text-[#7FE85B]" />
                  <span>Zero KYC</span>
                </span>
                <button
                  type="button"
                  onClick={() => loadPrices(true)}
                  className="inline-flex items-center gap-1.5 font-medium hover:text-[#0E1715] dark:hover:text-white"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshingPrices ? 'animate-spin' : ''}`} />
                  <span>{prices.source}</span>
                </button>
              </div>
            </div>

            {/* Results Header Row */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center justify-between gap-3 sm:justify-start">
                <h1 className="font-display text-xl font-bold tracking-tight text-[#0E1715] sm:text-2xl dark:text-white">
                  {filters.intent === 'buy'
                    ? 'Buying offers'
                    : filters.intent === 'sell'
                      ? 'Selling offers'
                      : 'Crypto swap offers'}
                </h1>
                <span className="rounded-lg border border-[#DCE2E1] bg-white px-2.5 py-1 font-mono text-xs font-medium tabular-nums text-[#4B5554] dark:border-[#232E2D] dark:bg-[#131A1A] dark:text-[#98A4A2]">
                  {filteredOffers.length} Results
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:flex sm:items-center sm:gap-3">
                {/* Sort Selector */}
                <div className="relative">
                  <ArrowUpDown className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#5C6665]" />
                  <select
                    aria-label="Sort offers"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="h-10 w-full appearance-none rounded-xl border border-[#DCE2E1] bg-white pl-9 pr-8 text-sm font-medium text-[#111917] focus:border-[#0B3B2E] focus:outline-none sm:w-auto dark:border-[#232E2D] dark:bg-[#131A1A] dark:text-[#EDF3F2]"
                  >
                    <option value="best">Best</option>
                    <option value="price_asc">Lowest Price</option>
                    <option value="price_desc">Highest Price</option>
                    <option value="trades">Most Trades</option>
                    <option value="rating">Highest Trust</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-[#5C6665]" />
                </div>

                {/* Primary Lime CTA */}
                <button
                  type="button"
                  onClick={() => setCreateOfferOpen(true)}
                  className="h-10 w-full rounded-xl bg-[#7FE85B] px-5 text-sm font-semibold text-[#082213] hover:bg-[#6AD845] sm:w-auto whitespace-nowrap shrink-0 transition-colors"
                >
                  Create Offer
                </button>
              </div>
            </div>

            {/* Offers List */}
            {loadingOffers ? (
              <div className="space-y-3.5">
                {[1, 2, 3, 4].map((idx) => (
                  <div
                    key={idx}
                    className="h-28 animate-pulse rounded-2xl border border-[#E3E7E7] bg-white dark:border-[#202B2A] dark:bg-[#131A1A]"
                  />
                ))}
              </div>
            ) : filteredOffers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#D3DADA] bg-white p-8 text-center sm:p-12 dark:border-[#263130] dark:bg-[#131A1A]">
                <h2 className="font-display text-lg font-bold text-[#0E1715] dark:text-white">
                  No offers match your filters
                </h2>
                <p className="mt-1.5 text-sm text-[#5C6665] dark:text-[#98A4A2]">
                  Try clearing the amount, payment method, or currency filters to explore all BTC and XMR listings.
                </p>
                <div className="mt-5 grid grid-cols-1 gap-2.5 sm:flex sm:justify-center sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setFilters({ ...INITIAL_FILTERS, intent: filters.intent })}
                    className="min-h-[44px] w-full rounded-xl bg-[#0B3B2E] px-5 py-2.5 text-sm font-semibold text-white sm:w-auto dark:bg-[#7FE85B] dark:text-[#082213]"
                  >
                    Reset Filters
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateOfferOpen(true)}
                    className="min-h-[44px] w-full rounded-xl border border-[#DCE2E1] px-5 py-2.5 text-sm font-semibold text-[#0E1715] sm:w-auto dark:border-[#263130] dark:text-white"
                  >
                    Post This Offer Yourself
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredOffers
                  .slice(0, user ? visibleCount : 10)
                  .map((offer) => (
                    <OfferRow
                      key={offer.id}
                      offer={offer}
                      trader={traders[offer.traderUsername]}
                      prices={prices}
                      enteredAmount={parsedAmount}
                      currentUsername={user?.username}
                      onSelectOffer={(o) => setTradeModalState({ offer: o })}
                      onSelectTrader={handleSelectTrader}
                    />
                  ))}

                {!user && filteredOffers.length > 10 && (
                  <div className="rounded-2xl border border-[#DCE2E1] bg-white p-8 text-center dark:border-[#202B2A] dark:bg-[#131A1A]">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF6F2] text-[#0B3B2E] dark:bg-[#152B20] dark:text-[#7FE85B]">
                      <Lock className="h-5 w-5" />
                    </div>
                    <h2 className="mt-3 font-display text-xl font-bold text-[#0E1715] dark:text-white">
                      Register to view all {filteredOffers.length} offers
                    </h2>
                    <p className="mx-auto mt-1.5 max-w-md text-sm text-[#5C6665] dark:text-[#98A4A2]">
                      Guests can preview the top 10 listings. Create a free anonymous BitSpend P2P account in seconds to unlock all {filteredOffers.length} offers — no KYC or ID required.
                    </p>
                    <div className="mt-5 grid grid-cols-1 gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-3">
                      <button
                        type="button"
                        onClick={() => setAuthModal('register')}
                        className="min-h-[44px] w-full rounded-xl bg-[#7FE85B] px-6 py-2.5 text-sm font-semibold text-[#082213] hover:bg-[#6AD845] sm:w-auto"
                      >
                        Register Free (No KYC)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthModal('login')}
                        className="min-h-[44px] w-full rounded-xl border border-[#DCE2E1] px-6 py-2.5 text-sm font-semibold text-[#0E1715] hover:bg-[#F5F7F7] sm:w-auto dark:border-[#263130] dark:text-white dark:hover:bg-[#1A2423]"
                      >
                        Sign in
                      </button>
                    </div>
                  </div>
                )}

                {user && filteredOffers.length > visibleCount && (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((c) => c + 25)}
                      className="min-h-[44px] w-full rounded-xl border border-[#DCE2E1] bg-white px-6 py-2.5 text-sm font-semibold text-[#0E1715] hover:bg-[#F5F7F7] sm:w-auto dark:border-[#263130] dark:bg-[#131A1A] dark:text-white dark:hover:bg-[#1A2423]"
                    >
                      Show more offers ({filteredOffers.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'swap' && (
          <SwapView
            prices={prices}
            user={user}
            swaps={swaps}
            onRequireAuth={() => setAuthModal('register')}
            onRefreshPrices={() => loadPrices(true)}
            onSwapCreated={(swap, updatedUser) => {
              setSwaps((prev) => [swap, ...prev]);
              setUser(updatedUser);
            }}
          />
        )}

        {activeTab === 'card' && (
          <CryptoCardView
            prices={prices}
            user={user}
            cards={cards}
            onRequireAuth={() => setAuthModal('register')}
            onCardUpdated={(card, updatedUser) => {
              setCards((prev) => {
                const exists = prev.some((c) => c.id === card.id);
                return exists ? prev.map((c) => (c.id === card.id ? card : c)) : [card, ...prev];
              });
              setUser(updatedUser);
            }}
          />
        )}

        {activeTab === 'account' && (
          <AccountView
            user={user}
            prices={prices}
            trades={trades}
            myOffers={myOffers}
            onOpenAuth={(mode) => setAuthModal(mode)}
            onOpenTrade={(trade) => setTradeModalState({ existingTrade: trade })}
            onViewOffer={(offer) => setTradeModalState({ offer })}
            onOpenCreateOffer={() => setCreateOfferOpen(true)}
            onUserUpdated={setUser}
            onOfferUpdated={(updated) =>
              setOffers((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
            }
            onOfferDeleted={(offerId) =>
              setOffers((prev) => prev.filter((o) => o.id !== offerId))
            }
          />
        )}
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-[#E3E7E7] bg-white py-6 dark:border-[#1E2726] dark:bg-[#111717]">
        <div className="mx-auto flex max-w-[1380px] flex-col items-center justify-between gap-4 px-4 text-center text-xs text-[#5C6665] sm:flex-row sm:px-6 sm:text-left lg:px-8 dark:text-[#8E9B98]">
          <div>
            <span className="font-display font-bold text-[#0E1715] dark:text-white mr-2">
              BitSpend P2P
            </span>
            <span>Peer-to-peer escrow marketplace · Part of BitSpend · Zero KYC required</span>
          </div>
          <div className="grid w-full max-w-xs grid-cols-2 gap-x-6 gap-y-2.5 sm:flex sm:w-auto sm:max-w-none sm:flex-wrap sm:items-center sm:gap-5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('offers');
                setFilters((f) => ({ ...f, crypto: 'XMR' }));
              }}
              className="hover:text-[#0E1715] dark:hover:text-white"
            >
              Monero (XMR) Market
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('offers');
                setFilters((f) => ({ ...f, crypto: 'BTC' }));
              }}
              className="hover:text-[#0E1715] dark:hover:text-white"
            >
              Bitcoin (BTC) Market
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('swap')}
              className="hover:text-[#0E1715] dark:hover:text-white"
            >
              Instant Swap
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('card')}
              className="hover:text-[#0E1715] dark:hover:text-white"
            >
              Privacy Cards
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {createOfferOpen && (
        <CreateOfferModal
          prices={prices}
          user={user}
          onUserUpdated={setUser}
          onRequireAuth={() => setAuthModal('register')}
          onOpenWallet={() => setActiveTab('account')}
          onClose={() => setCreateOfferOpen(false)}
          onCreated={(offer) => {
            setOffers((prev) => [offer, ...prev]);
            setActiveTab('offers');
            setFilters({
              ...INITIAL_FILTERS,
              intent:
                offer.side === 'sell_crypto'
                  ? 'buy'
                  : offer.side === 'buy_crypto'
                    ? 'sell'
                    : 'swap',
            });
            loadMarketplace();
          }}
        />
      )}

      {selectedTrader && (
        <TraderProfileModal
          trader={selectedTrader}
          offers={offers}
          prices={prices}
          currentUsername={user?.username}
          onClose={() => setSelectedTrader(null)}
          onSelectOffer={(offer) => setTradeModalState({ offer })}
        />
      )}

      {tradeModalState && (
        <TradeModal
          offer={tradeModalState.offer}
          trader={
            tradeModalState.offer
              ? traders[tradeModalState.offer.traderUsername]
              : tradeModalState.existingTrade
                ? traders[tradeModalState.existingTrade.traderUsername]
                : undefined
          }
          existingTrade={tradeModalState.existingTrade}
          prices={prices}
          initialFiatAmount={parsedAmount}
          user={user}
          onRequireAuth={() => setAuthModal('register')}
          onClose={() => setTradeModalState(null)}
          onTradeUpdated={(updatedTrade, updatedUser) => {
            setTrades((prev) => {
              const exists = prev.some((t) => t.id === updatedTrade.id);
              return exists
                ? prev.map((t) => (t.id === updatedTrade.id ? updatedTrade : t))
                : [updatedTrade, ...prev];
            });
            if (updatedUser) setUser(updatedUser);
            loadMarketplace();
          }}
        />
      )}

      {authModal && (
        <AuthModal
          initialMode={authModal}
          onClose={() => setAuthModal(null)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
}
