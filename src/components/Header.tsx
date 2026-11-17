import {
  ArrowLeftRight,
  Bell,
  CheckCheck,
  CreditCard,
  ExternalLink,
  Menu,
  MessageSquare,
  Moon,
  Sun,
  Tag,
  User,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { AppNotification, UserAccount } from '../types';

export type AppTab = 'offers' | 'swap' | 'account' | 'profile';

interface HeaderProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  user: UserAccount | null;
  activeTradesCount: number;
  unreadMessagesCount: number;
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onLogout: () => void;
  onOpenSecretMenu?: () => void;
  onOpenMessages: () => void;
  onViewMyProfile: () => void;
  onMarkNotificationsRead: (id?: string) => void;
  onNotificationClick: (notif: AppNotification) => void;
}

const CRYPTO_CARD_URL = 'https://card.oosab.com';

export function Header({
  activeTab,
  onSelectTab,
  user,
  activeTradesCount,
  unreadMessagesCount,
  notifications,
  unreadNotificationsCount,
  darkMode,
  onToggleDarkMode,
  onOpenAuth,
  onLogout,
  onOpenSecretMenu,
  onOpenMessages,
  onViewMyProfile,
  onMarkNotificationsRead,
  onNotificationClick,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const logoClicksRef = useRef<{ count: number; lastAt: number }>({ count: 0, lastAt: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navItems: { id: Exclude<AppTab, 'profile'>; label: string; icon: typeof Tag }[] = [
    { id: 'offers', label: 'P2P Offers', icon: Tag },
    { id: 'swap', label: 'Swap', icon: ArrowLeftRight },
    { id: 'account', label: user ? 'Wallet & Trades' : 'Trades & Wallet', icon: User },
  ];

  const handleNav = (tab: AppTab) => {
    logoClicksRef.current = { count: 0, lastAt: 0 };
    onSelectTab(tab);
    setMobileMenuOpen(false);
    setNotifOpen(false);
  };

  const handleLogoClick = () => {
    const now = Date.now();
    const prev = logoClicksRef.current;
    const withinWindow = now - prev.lastAt <= 2500;
    const nextCount = withinWindow ? prev.count + 1 : 1;

    if (nextCount >= 5) {
      logoClicksRef.current = { count: 0, lastAt: 0 };
      setMobileMenuOpen(false);
      onOpenSecretMenu?.();
      return;
    }

    logoClicksRef.current = { count: nextCount, lastAt: now };
    onSelectTab('offers');
    setMobileMenuOpen(false);
  };

  const formatRelTime = (iso: string) => {
    try {
      const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return `${Math.floor(hrs / 24)}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[#E3E7E7] bg-white/95 backdrop-blur-sm dark:border-[#1E2726] dark:bg-[#111717]/95">
      <div className="mx-auto flex h-16 max-w-[1380px] items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={handleLogoClick}
          className="flex items-center gap-2.5 whitespace-nowrap shrink-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B3B2E] rounded-md select-none"
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
        <nav className="hidden lg:flex items-center gap-6 h-full">
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

        {/* Zone 3: Messages + Notifications + Theme + Account */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {user && (
            <>
              {/* Messages Button */}
              <button
                type="button"
                onClick={() => {
                  setNotifOpen(false);
                  onOpenMessages();
                }}
                aria-label="Open trade messages"
                className="relative inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#DCE2E1] bg-[#F8FAFA] px-2.5 text-xs font-semibold text-[#111917] hover:bg-[#EEF2F1] sm:px-3 dark:border-[#263130] dark:bg-[#182120] dark:text-[#EDF3F2] dark:hover:bg-[#1F2B2A]"
              >
                <MessageSquare className="h-4 w-4 text-[#0B3B2E] dark:text-[#7FE85B]" />
                <span className="hidden sm:inline">Messages</span>
                {unreadMessagesCount > 0 && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0B3B2E] px-1 font-mono text-[10px] font-bold text-white dark:bg-[#7FE85B] dark:text-[#082213]">
                    {unreadMessagesCount}
                  </span>
                )}
              </button>

              {/* Notifications Bell + Popover */}
              <div ref={notifRef} className="relative">
                <button
                  type="button"
                  onClick={() => setNotifOpen((v) => !v)}
                  aria-label="Toggle notifications"
                  className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[#DCE2E1] bg-[#F8FAFA] text-[#111917] hover:bg-[#EEF2F1] dark:border-[#263130] dark:bg-[#182120] dark:text-[#EDF3F2] dark:hover:bg-[#1F2B2A]"
                >
                  <Bell className="h-4 w-4" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#16A34A] px-1 font-mono text-[10px] font-bold text-white dark:bg-[#7FE85B] dark:text-[#082213]">
                      {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="fixed left-4 right-4 top-16 z-40 mt-2 max-h-[75vh] overflow-hidden rounded-2xl border border-[#DCE2E1] bg-white shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-11 sm:mt-0 sm:w-88 dark:border-[#263130] dark:bg-[#151D1C]">
                    <div className="flex items-center justify-between border-b border-[#ECEFEF] px-4 py-3 dark:border-[#222C2B]">
                      <span className="font-display text-sm font-bold text-[#0E1715] dark:text-white">
                        Notifications
                      </span>
                      {unreadNotificationsCount > 0 && (
                        <button
                          type="button"
                          onClick={() => onMarkNotificationsRead()}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B3B2E] hover:underline dark:text-[#7FE85B]"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                          <span>Mark all read</span>
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 divide-y divide-[#ECEFEF] overflow-y-auto dark:divide-[#222C2B]">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-xs text-[#5C6665] dark:text-[#8E9B98]">
                          No notifications yet. New trades, chat messages, and escrow releases appear here.
                        </div>
                      ) : (
                        notifications.slice(0, 20).map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              setNotifOpen(false);
                              onNotificationClick(n);
                            }}
                            className={`flex w-full items-start justify-between gap-2.5 px-4 py-3 text-left transition-colors hover:bg-[#F5F7F7] dark:hover:bg-[#1C2625] ${
                              !n.read ? 'bg-[#F4FBF6] dark:bg-[#112219]' : ''
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0E1715] dark:text-white">
                                {!n.read && (
                                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#16A34A] dark:bg-[#7FE85B]" />
                                )}
                                <span className="truncate">{n.title}</span>
                              </div>
                              <p className="mt-0.5 line-clamp-2 text-xs text-[#4B5554] dark:text-[#A4B0AE]">
                                {n.body}
                              </p>
                            </div>
                            <span className="shrink-0 font-mono text-[10px] text-[#6C7775] dark:text-[#8E9B98]">
                              {formatRelTime(n.createdAt)}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#4B5554] hover:bg-[#EFF2F2] dark:text-[#A4B0AE] dark:hover:bg-[#1C2625] transition-colors"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={onViewMyProfile}
                title={`View public profile /${user.username}`}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  activeTab === 'profile'
                    ? 'border-[#0B3B2E] bg-[#EEF6F2] text-[#0B3B2E] dark:border-[#7FE85B] dark:bg-[#152B20] dark:text-[#7FE85B]'
                    : 'border-[#DCE2E1] bg-[#F8FAFA] text-[#111917] hover:bg-[#EEF2F1] dark:border-[#263130] dark:bg-[#182120] dark:text-[#EDF3F2] dark:hover:bg-[#1F2B2A]'
                }`}
              >
                <User className="h-4 w-4 text-[#0B3B2E] dark:text-[#7FE85B]" />
                <span>/{user.username}</span>
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="px-2.5 py-2 text-sm font-medium text-[#5C6665] hover:text-[#0E1715] dark:text-[#98A4A2] dark:hover:text-white whitespace-nowrap shrink-0 transition-colors"
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
            className="flex lg:hidden h-10 w-10 items-center justify-center rounded-lg border border-[#E3E7E7] text-[#111917] dark:border-[#263130] dark:text-[#EDF3F2]"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-[#E3E7E7] bg-white px-4 py-4 lg:hidden dark:border-[#1E2726] dark:bg-[#111717]">
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
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onViewMyProfile();
                  }}
                  className="min-h-[44px] truncate rounded-lg border border-[#DCE2E1] px-3 py-2.5 text-center text-sm font-semibold text-[#111917] dark:border-[#263130] dark:text-white"
                >
                  /{user.username}
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
