import { ArrowLeftRight, CreditCard, ExternalLink, Menu, Moon, Sun, Tag, User, X } from 'lucide-react';
import { useState } from 'react';
import type { UserAccount } from '../types';

export type AppTab = 'offers' | 'swap' | 'account';

interface HeaderProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  user: UserAccount | null;
  activeTradesCount: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onLogout: () => void;
}

const CRYPTO_CARD_URL = 'https://card.oosab.com';

export function Header({
  activeTab,
  onSelectTab,
  user,
  activeTradesCount,
  darkMode,
  onToggleDarkMode,
  onOpenAuth,
  onLogout,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: AppTab; label: string; icon: typeof Tag }[] = [
    { id: 'offers', label: 'P2P Offers', icon: Tag },
    { id: 'swap', label: 'Swap', icon: ArrowLeftRight },
    { id: 'account', label: user ? 'Profile & Trades' : 'Trades & Wallet', icon: User },
  ];

  const handleNav = (tab: AppTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[#E3E7E7] bg-white/95 backdrop-blur-sm dark:border-[#1E2726] dark:bg-[#111717]/95">
      <div className="mx-auto flex h-16 max-w-[1380px] items-center justify-between gap-3 px-4 sm:gap-6 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNav('offers')}
          className="flex items-center gap-2.5 whitespace-nowrap shrink-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B3B2E] rounded-md"
        >
          <svg
            width="30"
            height="30"
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <path
              d="M 6.33 20.10 A 10.5 10.5 0 0 1 20.10 6.33"
              className="stroke-[#0B3B2E] dark:stroke-[#7FE85B]"
              strokeWidth="4.4"
              strokeLinecap="round"
            />
            <path
              d="M 25.67 11.90 A 10.5 10.5 0 0 1 11.90 25.67"
              stroke="#5EE048"
              strokeWidth="4.4"
              strokeLinecap="round"
            />
            <rect
              x="16"
              y="11.6"
              width="6.2"
              height="6.2"
              rx="1.5"
              transform="rotate(45 16 11.6)"
              className="fill-[#1F6F54] dark:fill-[#E5EFEA]"
            />
          </svg>
          <span className="font-display text-lg font-bold tracking-[0.12em] text-[#0E1715] sm:text-[21px] dark:text-[#F1F5F4]">
            OOSAB
          </span>
        </button>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 h-full">
          {navItems.slice(0, 2).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`relative flex h-full items-center gap-2 whitespace-nowrap shrink-0 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-[#0E1715] dark:text-white'
                    : 'text-[#5C6665] hover:text-[#0E1715] dark:text-[#98A4A2] dark:hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute inset-x-0 bottom-0 h-[2.5px] bg-[#16A34A] dark:bg-[#7FE85B]" />
                )}
              </button>
            );
          })}

          <a
            href={CRYPTO_CARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="relative flex h-full items-center gap-2 whitespace-nowrap shrink-0 text-sm font-medium text-[#5C6665] hover:text-[#0E1715] dark:text-[#98A4A2] dark:hover:text-white transition-colors"
          >
            <CreditCard className="h-4 w-4 shrink-0" />
            <span>Crypto Card</span>
          </a>

          {(() => {
            const accountItem = navItems[2];
            const Icon = accountItem.icon;
            const isActive = activeTab === accountItem.id;
            return (
              <button
                key={accountItem.id}
                type="button"
                onClick={() => handleNav(accountItem.id)}
                className={`relative flex h-full items-center gap-2 whitespace-nowrap shrink-0 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-[#0E1715] dark:text-white'
                    : 'text-[#5C6665] hover:text-[#0E1715] dark:text-[#98A4A2] dark:hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{accountItem.label}</span>
                {activeTradesCount > 0 && (
                  <span className="ml-0.5 font-mono text-xs font-semibold text-[#0B3B2E] dark:text-[#7FE85B]">
                    ({activeTradesCount})
                  </span>
                )}
                {isActive && (
                  <span className="absolute inset-x-0 bottom-0 h-[2.5px] bg-[#16A34A] dark:bg-[#7FE85B]" />
                )}
              </button>
            );
          })()}
        </nav>

        {/* Zone 3: Theme + Primary Auth / Account Action */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#4B5554] hover:bg-[#EFF2F2] dark:text-[#A4B0AE] dark:hover:bg-[#1C2625] transition-colors"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user ? (
            <div className="hidden sm:flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleNav('account')}
                className="flex items-center gap-2 rounded-lg border border-[#DCE2E1] bg-[#F8FAFA] px-3.5 py-2 text-sm font-semibold text-[#111917] hover:bg-[#EEF2F1] dark:border-[#263130] dark:bg-[#182120] dark:text-[#EDF3F2] dark:hover:bg-[#1F2B2A] whitespace-nowrap shrink-0 transition-colors"
              >
                <User className="h-4 w-4 text-[#0B3B2E] dark:text-[#7FE85B]" />
                <span>{user.username}</span>
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="px-3 py-2 text-sm font-medium text-[#5C6665] hover:text-[#0E1715] dark:text-[#98A4A2] dark:hover:text-white whitespace-nowrap shrink-0 transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-3">
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="px-3 py-2 text-sm font-semibold text-[#1E2726] hover:text-[#0B3B2E] dark:text-[#DCE4E3] dark:hover:text-[#7FE85B] whitespace-nowrap shrink-0 transition-colors"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="rounded-full bg-[#171D1C] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0B3B2E] dark:bg-[#7FE85B] dark:text-[#082213] dark:hover:bg-[#6EDB4A] whitespace-nowrap shrink-0 transition-colors"
              >
                Register
              </button>
            </div>
          )}

          {/* Mobile Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            className="flex md:hidden h-10 w-10 items-center justify-center rounded-lg border border-[#E3E7E7] text-[#111917] dark:border-[#263130] dark:text-[#EDF3F2]"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-[#E3E7E7] bg-white px-4 py-4 md:hidden dark:border-[#1E2726] dark:bg-[#111717]">
          <div className="flex flex-col gap-1">
            {navItems.slice(0, 2).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id)}
                  className={`flex items-center justify-between rounded-lg px-3 py-3 text-sm font-medium ${
                    isActive
                      ? 'bg-[#0B3B2E] text-white dark:bg-[#7FE85B] dark:text-[#082213]'
                      : 'text-[#394241] hover:bg-[#F3F5F5] dark:text-[#C8D2D0] dark:hover:bg-[#1A2322]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </span>
                </button>
              );
            })}

            <a
              href={CRYPTO_CARD_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-medium text-[#394241] hover:bg-[#F3F5F5] dark:text-[#C8D2D0] dark:hover:bg-[#1A2322]"
            >
              <span className="flex items-center gap-2.5">
                <CreditCard className="h-4 w-4" />
                <span>Crypto Card</span>
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-[#64706E] dark:text-[#8E9B98]" />
            </a>

            {(() => {
              const accountItem = navItems[2];
              const Icon = accountItem.icon;
              const isActive = activeTab === accountItem.id;
              return (
                <button
                  key={accountItem.id}
                  type="button"
                  onClick={() => handleNav(accountItem.id)}
                  className={`flex items-center justify-between rounded-lg px-3 py-3 text-sm font-medium ${
                    isActive
                      ? 'bg-[#0B3B2E] text-white dark:bg-[#7FE85B] dark:text-[#082213]'
                      : 'text-[#394241] hover:bg-[#F3F5F5] dark:text-[#C8D2D0] dark:hover:bg-[#1A2322]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" />
                    <span>{accountItem.label}</span>
                  </span>
                  {activeTradesCount > 0 && (
                    <span className="font-mono text-xs">{activeTradesCount} active</span>
                  )}
                </button>
              );
            })()}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-[#E3E7E7] pt-4 dark:border-[#1E2726]">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => handleNav('account')}
                  className="min-h-[44px] truncate rounded-lg border border-[#DCE2E1] px-3 py-2.5 text-center text-sm font-semibold text-[#111917] dark:border-[#263130] dark:text-white"
                >
                  {user.username}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="min-h-[44px] rounded-lg border border-[#DCE2E1] px-3 py-2.5 text-center text-sm font-medium text-[#5C6665] dark:border-[#263130] dark:text-[#98A4A2]"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('login');
                  }}
                  className="min-h-[44px] rounded-lg border border-[#DCE2E1] px-4 py-2.5 text-sm font-semibold text-[#111917] dark:border-[#263130] dark:text-white"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('register');
                  }}
                  className="min-h-[44px] rounded-lg bg-[#171D1C] px-4 py-2.5 text-sm font-semibold text-white dark:bg-[#7FE85B] dark:text-[#082213]"
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
