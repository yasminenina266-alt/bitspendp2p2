import { ChevronDown, Search, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  COUNTRIES,
  CRYPTO_ASSETS,
  FIAT_CURRENCIES,
  OFFER_TAGS,
  PAYMENT_METHODS,
} from '../constants/market';
import type { CryptoAsset, FiatCurrency, MarketPrices, OfferTag } from '../types';
import { CoinIcon } from './CoinIcon';

export interface OfferFilters {
  intent: 'buy' | 'sell' | 'swap'; // 'buy' = sell_crypto, 'sell' = buy_crypto, 'swap' = swap_crypto
  crypto: CryptoAsset | 'ALL';
  paymentMethod: string;
  fiat: FiatCurrency | 'ALL';
  country: string;
  amount: string;
  hideInactive: boolean;
  verifiedOnly: boolean;
  minRating: number;
  selectedTags: OfferTag[];
}

interface OfferFilterBarProps {
  filters: OfferFilters;
  onChange: (next: OfferFilters) => void;
  onReset: () => void;
  prices: MarketPrices;
}

export function OfferFilterBar({ filters, onChange, onReset, prices }: OfferFilterBarProps) {
  const [openMenu, setOpenMenu] = useState<'crypto' | 'payment' | 'advanced' | 'tags' | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedCryptoMeta = CRYPTO_ASSETS.find((c) => c.symbol === filters.crypto);

  const filteredPayments = PAYMENT_METHODS.filter((pm) =>
    pm.name.toLowerCase().includes(filters.paymentMethod.trim().toLowerCase())
  );

  const toggleTag = (tag: OfferTag) => {
    const exists = filters.selectedTags.includes(tag);
    onChange({
      ...filters,
      selectedTags: exists
        ? filters.selectedTags.filter((t) => t !== tag)
        : [...filters.selectedTags, tag],
    });
  };

  const advancedActiveCount =
    (filters.hideInactive ? 1 : 0) +
    (filters.verifiedOnly ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0);

  const hasActiveChips =
    filters.crypto !== 'ALL' ||
    filters.paymentMethod.trim() !== '' ||
    filters.fiat !== 'ALL' ||
    filters.country !== 'ALL' ||
    filters.amount.trim() !== '' ||
    filters.hideInactive ||
    filters.verifiedOnly ||
    filters.minRating > 0 ||
    filters.selectedTags.length > 0;

  return (
    <div ref={barRef} className="space-y-3.5">
      {/* Main Filter Controls */}
      <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center">
        {/* Buy / Sell / Swap Segmented Switch */}
        <div className="col-span-2 grid h-11 grid-cols-3 items-center rounded-xl border border-[#DCE2E1] bg-white p-1 sm:col-span-1 sm:inline-flex sm:w-auto dark:border-[#232E2D] dark:bg-[#131A1A] shrink-0">
          <button
            type="button"
            onClick={() => onChange({ ...filters, intent: 'buy' })}
            className={`flex h-full items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors whitespace-nowrap ${
              filters.intent === 'buy'
                ? 'bg-[#0B3B2E] text-white dark:bg-[#7FE85B] dark:text-[#082213]'
                : 'text-[#4B5554] hover:text-[#111917] dark:text-[#98A4A2] dark:hover:text-white'
            }`}
          >
            Buy
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...filters, intent: 'sell' })}
            className={`flex h-full items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors whitespace-nowrap ${
              filters.intent === 'sell'
                ? 'bg-[#0B3B2E] text-white dark:bg-[#7FE85B] dark:text-[#082213]'
                : 'text-[#4B5554] hover:text-[#111917] dark:text-[#98A4A2] dark:hover:text-white'
            }`}
          >
            Sell
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...filters, intent: 'swap' })}
            className={`flex h-full items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors whitespace-nowrap ${
              filters.intent === 'swap'
                ? 'bg-[#0B3B2E] text-white dark:bg-[#7FE85B] dark:text-[#082213]'
                : 'text-[#4B5554] hover:text-[#111917] dark:text-[#98A4A2] dark:hover:text-white'
            }`}
          >
            Swap
          </button>
        </div>

        {/* Crypto Dropdown */}
        <div className="relative col-span-2 sm:col-span-1 sm:w-auto">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === 'crypto' ? null : 'crypto')}
            className="flex h-11 w-full items-center justify-between gap-2.5 rounded-xl border border-[#DCE2E1] bg-white px-3.5 text-sm font-medium text-[#111917] hover:border-[#BFC9C7] sm:w-auto sm:min-w-[178px] dark:border-[#232E2D] dark:bg-[#131A1A] dark:text-[#EDF3F2] dark:hover:border-[#344442] whitespace-nowrap"
          >
            <span className="flex items-center gap-2">
              {selectedCryptoMeta ? (
                <>
                  <CoinIcon symbol={selectedCryptoMeta.symbol} size={20} />
                  <span>{selectedCryptoMeta.name}</span>
                </>
              ) : (
                <span>All Cryptos</span>
              )}
            </span>
            <span className="flex items-center gap-1">
              {filters.crypto !== 'ALL' && (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Reset crypto filter"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange({ ...filters, crypto: 'ALL' });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation();
                      onChange({ ...filters, crypto: 'ALL' });
                    }
                  }}
                  className="rounded p-0.5 text-[#6C7775] hover:bg-[#EFF2F2] hover:text-[#111917] dark:hover:bg-[#222D2C] dark:hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              )}
              <ChevronDown className="h-4 w-4 text-[#6C7775]" />
            </span>
          </button>

          {openMenu === 'crypto' && (
            <div className="absolute left-0 top-12 z-30 w-full rounded-xl border border-[#DCE2E1] bg-white p-1.5 shadow-lg sm:w-64 dark:border-[#263130] dark:bg-[#151D1C]">
              <button
                type="button"
                onClick={() => {
                  onChange({ ...filters, crypto: 'ALL' });
                  setOpenMenu(null);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm ${
                  filters.crypto === 'ALL'
                    ? 'bg-[#EFF4F2] font-semibold text-[#0B3B2E] dark:bg-[#1E2A28] dark:text-[#7FE85B]'
                    : 'text-[#202928] hover:bg-[#F5F7F7] dark:text-[#D9E2E0] dark:hover:bg-[#1C2625]'
                }`}
              >
                <span>All Cryptocurrencies</span>
                <span className="font-mono text-xs text-[#6C7775]">7 assets</span>
              </button>
              <div className="my-1 border-t border-[#ECEFEF] dark:border-[#222C2B]" />
              {CRYPTO_ASSETS.map((coin) => {
                const spot = prices.usdPrices[coin.symbol] ?? 0;
                const active = filters.crypto === coin.symbol;
                return (
                  <button
                    key={coin.symbol}
                    type="button"
                    onClick={() => {
                      onChange({ ...filters, crypto: coin.symbol });
                      setOpenMenu(null);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm ${
                      active
                        ? 'bg-[#EFF4F2] font-semibold text-[#0B3B2E] dark:bg-[#1E2A28] dark:text-[#7FE85B]'
                        : 'text-[#202928] hover:bg-[#F5F7F7] dark:text-[#D9E2E0] dark:hover:bg-[#1C2625]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <CoinIcon symbol={coin.symbol} size={20} />
                      <span>
                        {coin.name} <span className="text-xs text-[#6C7775]">({coin.symbol})</span>
                      </span>
                    </span>
                    <span className="font-mono text-xs tabular-nums text-[#5C6665] dark:text-[#98A4A2]">
                      ${spot.toLocaleString('en-US', { maximumFractionDigits: spot < 10 ? 2 : 0 })}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Search Payment Methods */}
        <div className="relative col-span-2 sm:col-span-1 sm:flex-1 sm:min-w-[230px] sm:max-w-[300px]">
          <div className="flex h-11 items-center rounded-xl border border-[#DCE2E1] bg-white px-3.5 focus-within:border-[#0B3B2E] dark:border-[#232E2D] dark:bg-[#131A1A] dark:focus-within:border-[#7FE85B]">
            <input
              type="text"
              value={filters.paymentMethod}
              onFocus={() => setOpenMenu('payment')}
              onChange={(e) => {
                onChange({ ...filters, paymentMethod: e.target.value });
                setOpenMenu('payment');
              }}
              placeholder="Search 30+ Payment Methods"
              className="w-full bg-transparent text-sm text-[#111917] placeholder-[#7B8684] focus:outline-none dark:text-[#EDF3F2] dark:placeholder-[#71807D]"
            />
            {filters.paymentMethod ? (
              <button
                type="button"
                aria-label="Clear payment search"
                onClick={() => onChange({ ...filters, paymentMethod: '' })}
                className="ml-1.5 text-[#6C7775] hover:text-[#111917] dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <Search className="ml-1.5 h-4 w-4 shrink-0 text-[#6C7775]" />
            )}
          </div>

          {openMenu === 'payment' && (
            <div className="absolute left-0 top-12 z-30 max-h-72 w-full overflow-y-auto rounded-xl border border-[#DCE2E1] bg-white p-2 shadow-lg sm:w-80 dark:border-[#263130] dark:bg-[#151D1C]">
              <div className="px-2 py-1 text-xs font-semibold text-[#6C7775]">
                Popular payment methods
              </div>
              {filteredPayments.length === 0 ? (
                <div className="px-3 py-3 text-xs text-[#6C7775]">
                  No matching methods. Press Esc or clear to view all.
                </div>
              ) : (
                filteredPayments.map((pm) => (
                  <button
                    key={pm.name}
                    type="button"
                    onClick={() => {
                      onChange({ ...filters, paymentMethod: pm.name });
                      setOpenMenu(null);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-[#1E2726] hover:bg-[#F5F7F7] dark:text-[#DCE4E3] dark:hover:bg-[#1C2625]"
                  >
                    <span>{pm.name}</span>
                    <span className="text-xs text-[#7B8684]">{pm.category}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Currency Select */}
        <div className="relative col-span-1">
          <select
            aria-label="Filter by currency"
            value={filters.fiat}
            onChange={(e) => onChange({ ...filters, fiat: e.target.value as FiatCurrency | 'ALL' })}
            className="h-11 w-full appearance-none rounded-xl border border-[#DCE2E1] bg-white pl-3.5 pr-9 text-sm font-medium text-[#111917] hover:border-[#BFC9C7] focus:border-[#0B3B2E] focus:outline-none sm:w-auto dark:border-[#232E2D] dark:bg-[#131A1A] dark:text-[#EDF3F2]"
          >
            <option value="ALL">Any currency</option>
            {FIAT_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-[#6C7775]" />
        </div>

        {/* Country Select */}
        <div className="relative col-span-1">
          <select
            aria-label="Filter by country"
            value={filters.country}
            onChange={(e) => onChange({ ...filters, country: e.target.value })}
            className="h-11 w-full appearance-none rounded-xl border border-[#DCE2E1] bg-white pl-3.5 pr-9 text-sm font-medium text-[#111917] hover:border-[#BFC9C7] focus:border-[#0B3B2E] focus:outline-none sm:w-auto dark:border-[#232E2D] dark:bg-[#131A1A] dark:text-[#EDF3F2]"
          >
            <option value="ALL">Any country</option>
            {COUNTRIES.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-[#6C7775]" />
        </div>

        {/* Amount Input */}
        <div className="col-span-2 flex h-11 w-full items-center rounded-xl border border-[#DCE2E1] bg-white px-3.5 focus-within:border-[#0B3B2E] sm:col-span-1 sm:w-[142px] dark:border-[#232E2D] dark:bg-[#131A1A] dark:focus-within:border-[#7FE85B]">
          <input
            type="number"
            min="0"
            step="any"
            value={filters.amount}
            onChange={(e) => onChange({ ...filters, amount: e.target.value })}
            placeholder="Any amount"
            className="w-full bg-transparent font-mono text-sm tabular-nums text-[#111917] placeholder-[#7B8684] focus:outline-none dark:text-[#EDF3F2] dark:placeholder-[#71807D]"
          />
        </div>

        {/* Advanced Popover */}
        <div className="relative col-span-1">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === 'advanced' ? null : 'advanced')}
            className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-[#DCE2E1] bg-white px-3.5 text-sm font-medium text-[#111917] hover:border-[#BFC9C7] sm:w-auto sm:justify-start dark:border-[#232E2D] dark:bg-[#131A1A] dark:text-[#EDF3F2] whitespace-nowrap"
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#5C6665] dark:text-[#98A4A2]" />
              <span>Advanced</span>
              {advancedActiveCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-[#0B3B2E] px-1.5 font-mono text-xs font-semibold text-white dark:bg-[#7FE85B] dark:text-[#082213]">
                  {advancedActiveCount}
                </span>
              )}
            </span>
            <ChevronDown className="h-4 w-4 text-[#6C7775]" />
          </button>

          {openMenu === 'advanced' && (
            <div className="absolute left-0 top-12 z-30 w-[calc(100vw-2rem)] max-w-[300px] rounded-xl border border-[#DCE2E1] bg-white p-4 shadow-lg sm:left-auto sm:right-0 sm:w-72 dark:border-[#263130] dark:bg-[#151D1C]">
              <div className="space-y-3.5">
                <label className="flex cursor-pointer items-center justify-between text-sm text-[#1E2726] dark:text-[#DCE4E3]">
                  <span>Hide inactive offers</span>
                  <input
                    type="checkbox"
                    checked={filters.hideInactive}
                    onChange={(e) => onChange({ ...filters, hideInactive: e.target.checked })}
                    className="h-4 w-4 accent-[#0B3B2E] dark:accent-[#7FE85B]"
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between text-sm text-[#1E2726] dark:text-[#DCE4E3]">
                  <span>Verified high-volume traders</span>
                  <input
                    type="checkbox"
                    checked={filters.verifiedOnly}
                    onChange={(e) => onChange({ ...filters, verifiedOnly: e.target.checked })}
                    className="h-4 w-4 accent-[#0B3B2E] dark:accent-[#7FE85B]"
                  />
                </label>

                <div>
                  <label className="block text-xs font-medium text-[#5C6665] dark:text-[#98A4A2] mb-1.5">
                    Minimum trader trust score
                  </label>
                  <select
                    value={filters.minRating}
                    onChange={(e) => onChange({ ...filters, minRating: Number(e.target.value) })}
                    className="h-9 w-full rounded-lg border border-[#DCE2E1] bg-[#F8FAFA] px-2.5 text-sm text-[#111917] dark:border-[#263130] dark:bg-[#111717] dark:text-[#EDF3F2]"
                  >
                    <option value={0}>Any rating</option>
                    <option value={95}>95% or higher</option>
                    <option value={98}>98% or higher</option>
                    <option value={100}>100% only</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tags Popover */}
        <div className="relative col-span-1">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === 'tags' ? null : 'tags')}
            className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-[#DCE2E1] bg-white px-3.5 text-sm font-medium text-[#111917] hover:border-[#BFC9C7] sm:w-auto sm:justify-start dark:border-[#232E2D] dark:bg-[#131A1A] dark:text-[#EDF3F2] whitespace-nowrap"
          >
            <span className="flex items-center gap-2">
              <span>Tags</span>
              {filters.selectedTags.length > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-[#0B3B2E] px-1.5 font-mono text-xs font-semibold text-white dark:bg-[#7FE85B] dark:text-[#082213]">
                  {filters.selectedTags.length}
                </span>
              )}
            </span>
            <ChevronDown className="h-4 w-4 text-[#6C7775]" />
          </button>

          {openMenu === 'tags' && (
            <div className="absolute right-0 top-12 z-30 w-[calc(100vw-2rem)] max-w-[280px] rounded-xl border border-[#DCE2E1] bg-white p-2 shadow-lg sm:w-64 dark:border-[#263130] dark:bg-[#151D1C]">
              <div className="px-2 py-1 text-xs font-semibold text-[#6C7775]">
                Offer conditions
              </div>
              {OFFER_TAGS.map((tag) => {
                const checked = filters.selectedTags.includes(tag);
                return (
                  <label
                    key={tag}
                    className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-sm text-[#1E2726] hover:bg-[#F5F7F7] dark:text-[#DCE4E3] dark:hover:bg-[#1C2625]"
                  >
                    <span>{tag}</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTag(tag)}
                      className="h-4 w-4 accent-[#0B3B2E] dark:accent-[#7FE85B]"
                    />
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Active Removable Filter Summary */}
      {hasActiveChips && (
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {filters.crypto !== 'ALL' && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, crypto: 'ALL' })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4DCDC] bg-white px-2.5 py-1 text-xs font-medium text-[#1E2726] hover:border-[#9CA8A6] dark:border-[#263130] dark:bg-[#151D1C] dark:text-[#DCE4E3]"
            >
              <span>{CRYPTO_ASSETS.find((c) => c.symbol === filters.crypto)?.name}</span>
              <X className="h-3.5 w-3.5 text-[#6C7775]" />
            </button>
          )}
          {filters.paymentMethod.trim() !== '' && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, paymentMethod: '' })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4DCDC] bg-white px-2.5 py-1 text-xs font-medium text-[#1E2726] hover:border-[#9CA8A6] dark:border-[#263130] dark:bg-[#151D1C] dark:text-[#DCE4E3]"
            >
              <span>{filters.paymentMethod}</span>
              <X className="h-3.5 w-3.5 text-[#6C7775]" />
            </button>
          )}
          {filters.fiat !== 'ALL' && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, fiat: 'ALL' })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4DCDC] bg-white px-2.5 py-1 text-xs font-medium text-[#1E2726] hover:border-[#9CA8A6] dark:border-[#263130] dark:bg-[#151D1C] dark:text-[#DCE4E3]"
            >
              <span>{filters.fiat}</span>
              <X className="h-3.5 w-3.5 text-[#6C7775]" />
            </button>
          )}
          {filters.country !== 'ALL' && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, country: 'ALL' })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4DCDC] bg-white px-2.5 py-1 text-xs font-medium text-[#1E2726] hover:border-[#9CA8A6] dark:border-[#263130] dark:bg-[#151D1C] dark:text-[#DCE4E3]"
            >
              <span>{filters.country}</span>
              <X className="h-3.5 w-3.5 text-[#6C7775]" />
            </button>
          )}
          {filters.amount.trim() !== '' && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, amount: '' })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4DCDC] bg-white px-2.5 py-1 text-xs font-medium text-[#1E2726] hover:border-[#9CA8A6] dark:border-[#263130] dark:bg-[#151D1C] dark:text-[#DCE4E3]"
            >
              <span>Amount: {filters.amount}</span>
              <X className="h-3.5 w-3.5 text-[#6C7775]" />
            </button>
          )}
          {filters.hideInactive && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, hideInactive: false })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4DCDC] bg-white px-2.5 py-1 text-xs font-medium text-[#1E2726] hover:border-[#9CA8A6] dark:border-[#263130] dark:bg-[#151D1C] dark:text-[#DCE4E3]"
            >
              <span>Hide inactive</span>
              <X className="h-3.5 w-3.5 text-[#6C7775]" />
            </button>
          )}
          {filters.verifiedOnly && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, verifiedOnly: false })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4DCDC] bg-white px-2.5 py-1 text-xs font-medium text-[#1E2726] hover:border-[#9CA8A6] dark:border-[#263130] dark:bg-[#151D1C] dark:text-[#DCE4E3]"
            >
              <span>Verified traders</span>
              <X className="h-3.5 w-3.5 text-[#6C7775]" />
            </button>
          )}
          {filters.selectedTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4DCDC] bg-white px-2.5 py-1 text-xs font-medium text-[#1E2726] hover:border-[#9CA8A6] dark:border-[#263130] dark:bg-[#151D1C] dark:text-[#DCE4E3]"
            >
              <span>{tag}</span>
              <X className="h-3.5 w-3.5 text-[#6C7775]" />
            </button>
          ))}

          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B3B2E] px-3 py-1 text-xs font-semibold text-white hover:bg-[#082B21] dark:bg-[#1E3A2F] dark:text-[#7FE85B] dark:hover:bg-[#264A3B]"
          >
            <Trash2 className="h-3 w-3" />
            <span>Clear All</span>
          </button>
        </div>
      )}
    </div>
  );
}
