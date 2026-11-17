import { ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PAYMENT_METHODS, type PaymentMethodCategory } from '../constants/market';

interface PaymentMethodPickerProps {
  value: string;
  onChange: (methodName: string) => void;
}

const CATEGORIES: { key: 'ALL' | PaymentMethodCategory; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'Gift Cards', label: 'Gift Cards' },
  { key: 'Debit & Virtual Cards', label: 'Virtual & Debit Cards' },
  { key: 'Bank & Wire', label: 'Bank & Wire' },
  { key: 'Online Wallets', label: 'Wallets & Mobile' },
  { key: 'Cash & In-Person', label: 'Cash & Remit' },
];

export function PaymentMethodPicker({ value, onChange }: PaymentMethodPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | PaymentMethodCategory>('ALL');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 20);
    }
  }, [open]);

  const selectedDef = useMemo(
    () => PAYMENT_METHODS.find((pm) => pm.name === value),
    [value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PAYMENT_METHODS.filter((pm) => {
      if (categoryFilter !== 'ALL' && pm.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        pm.name.toLowerCase().includes(q) ||
        pm.category.toLowerCase().includes(q) ||
        pm.group.toLowerCase().includes(q) ||
        (pm.region ?? '').toLowerCase().includes(q)
      );
    });
  }, [query, categoryFilter]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-[#DCE2E1] bg-white px-3 text-left text-sm font-medium text-[#0E1715] hover:border-[#BFC9C7] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
      >
        <span className="truncate">
          {value}{' '}
          {selectedDef && (
            <span className="text-xs font-normal text-[#6C7775] dark:text-[#8E9B98]">
              ({selectedDef.category})
            </span>
          )}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[#6C7775]" />
      </button>

      {open && (
        <div className="absolute left-0 top-12 z-40 w-full min-w-[300px] overflow-hidden rounded-xl border border-[#DCE2E1] bg-white shadow-xl dark:border-[#263130] dark:bg-[#131A1A]">
          {/* Search Bar */}
          <div className="border-b border-[#ECEFEF] p-2.5 dark:border-[#202B2A]">
            <div className="flex h-9 items-center rounded-lg border border-[#DCE2E1] bg-[#F8FAFA] px-2.5 focus-within:border-[#0B3B2E] dark:border-[#263130] dark:bg-[#0D1313] dark:focus-within:border-[#7FE85B]">
              <Search className="mr-2 h-3.5 w-3.5 shrink-0 text-[#6C7775]" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${PAYMENT_METHODS.length}+ methods, cards, countries...`}
                className="w-full bg-transparent text-xs text-[#0E1715] placeholder-[#7B8684] focus:outline-none dark:text-white"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="ml-1 text-[#6C7775] hover:text-[#0E1715] dark:hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Category Tabs */}
            <div className="mt-2 flex flex-wrap gap-1">
              {CATEGORIES.map((cat) => {
                const active = categoryFilter === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setCategoryFilter(cat.key)}
                    className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                      active
                        ? 'bg-[#0B3B2E] text-white dark:bg-[#7FE85B] dark:text-[#082213]'
                        : 'bg-[#F2F5F4] text-[#4B5554] hover:bg-[#E7ECEB] dark:bg-[#1A2423] dark:text-[#98A4A2] dark:hover:bg-[#222F2D]'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results List */}
          <div className="max-h-64 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-[#6C7775]">
                No matching payment method found.
              </div>
            ) : (
              filtered.map((pm) => {
                const isSelected = pm.name === value;
                return (
                  <button
                    key={pm.name}
                    type="button"
                    onClick={() => {
                      onChange(pm.name);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                      isSelected
                        ? 'bg-[#EEF6F2] font-semibold text-[#0B3B2E] dark:bg-[#152B20] dark:text-[#7FE85B]'
                        : 'text-[#1E2726] hover:bg-[#F5F7F7] dark:text-[#DCE4E3] dark:hover:bg-[#1C2625]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{pm.name}</div>
                      <div className="truncate text-[10px] text-[#6C7775] dark:text-[#8E9B98]">
                        {pm.group}
                        {pm.region ? ` · ${pm.region}` : ''}
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-[#6C7775] dark:text-[#8E9B98]">
                      {pm.category}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
