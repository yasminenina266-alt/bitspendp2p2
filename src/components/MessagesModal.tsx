import { MessageSquare, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatCrypto, formatFiat } from '../constants/market';
import type { TradeOrder, TraderProfile } from '../types';
import { CoinIcon } from './CoinIcon';
import { TraderAvatar } from './TraderAvatar';

interface MessagesModalProps {
  trades: TradeOrder[];
  traders?: Record<string, TraderProfile>;
  currentUsername: string;
  onlineUsers: string[];
  onClose: () => void;
  onSelectTrade: (trade: TradeOrder) => void;
}

export function getTradeUnreadCount(trade: TradeOrder, currentUsername?: string): number {
  if (!currentUsername) return 0;
  const lastRead = trade.lastReadAtBy?.[currentUsername];
  const lastReadMs = lastRead ? new Date(lastRead).getTime() : 0;
  return trade.messages.filter((m) => {
    if (m.sender === currentUsername) return false;
    return new Date(m.timestamp).getTime() > lastReadMs;
  }).length;
}

export function MessagesModal({
  trades,
  traders = {},
  currentUsername,
  onlineUsers,
  onClose,
  onSelectTrade,
}: MessagesModalProps) {
  const [search, setSearch] = useState('');

  const sortedTrades = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...trades]
      .filter((t) => {
        if (!q) return true;
        const other =
          t.buyerUsername === currentUsername ? t.sellerUsername : t.buyerUsername;
        return (
          t.id.toLowerCase().includes(q) ||
          other.toLowerCase().includes(q) ||
          t.crypto.toLowerCase().includes(q) ||
          t.paymentMethod.toLowerCase().includes(q) ||
          t.messages.some((m) => m.text.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const aLast = a.messages[a.messages.length - 1]?.timestamp ?? a.createdAt;
        const bLast = b.messages[b.messages.length - 1]?.timestamp ?? b.createdAt;
        return new Date(bLast).getTime() - new Date(aLast).getTime();
      });
  }, [trades, search, currentUsername]);

  const formatMsgTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const diffMins = Math.floor((Date.now() - d.getTime()) / 60_000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-[#DCE2E1] bg-white shadow-xl sm:rounded-2xl dark:border-[#263130] dark:bg-[#131A1A]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#ECEFEF] px-5 py-4 dark:border-[#202B2A]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF6F2] text-[#0B3B2E] dark:bg-[#152B20] dark:text-[#7FE85B]">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-[#0E1715] dark:text-white">
                Trade Messages
              </h2>
              <p className="text-xs text-[#5C6665] dark:text-[#98A4A2]">
                Jump in and out of any active or completed escrow chat
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close messages"
            className="rounded-lg p-1.5 text-[#5C6665] hover:bg-[#F1F4F3] dark:text-[#98A4A2] dark:hover:bg-[#1E2927]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-[#ECEFEF] px-5 py-3 dark:border-[#202B2A]">
          <div className="flex h-10 items-center gap-2 rounded-xl border border-[#DCE2E1] bg-[#F8FAFA] px-3 focus-within:border-[#0B3B2E] dark:border-[#263130] dark:bg-[#0D1313] dark:focus-within:border-[#7FE85B]">
            <Search className="h-4 w-4 text-[#64706E]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username, trade ID, coin, or message..."
              className="w-full bg-transparent text-xs text-[#0E1715] placeholder-[#7B8684] focus:outline-none dark:text-white"
            />
          </div>
        </div>

        {/* Thread List */}
        <div className="flex-1 divide-y divide-[#ECEFEF] overflow-y-auto dark:divide-[#202B2A]">
          {sortedTrades.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-[#0E1715] dark:text-white">
                No trade conversations yet
              </p>
              <p className="mt-1 text-xs text-[#5C6665] dark:text-[#98A4A2]">
                Open a trade on any P2P offer to start a live encrypted escrow chat.
              </p>
            </div>
          ) : (
            sortedTrades.map((trade) => {
              const counterparty =
                trade.buyerUsername === currentUsername
                  ? trade.sellerUsername
                  : trade.buyerUsername;
              const counterpartyTrader = traders[counterparty];
              const unread = getTradeUnreadCount(trade, currentUsername);
              const lastMsg = trade.messages[trade.messages.length - 1];
              const isOnline =
                Boolean(trade.counterpartyIsReal) &&
                onlineUsers.some((u) => u.toLowerCase() === counterparty.toLowerCase());

              return (
                <button
                  key={trade.id}
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectTrade(trade);
                  }}
                  className={`flex w-full items-start justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-[#F8FAFA] dark:hover:bg-[#17201F] ${
                    unread > 0 ? 'bg-[#F4FBF6] dark:bg-[#112119]' : ''
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {counterpartyTrader ? (
                        <TraderAvatar
                          username={counterparty}
                          avatarUrl={counterpartyTrader.avatarUrl}
                          accentTheme={counterpartyTrader.accentTheme}
                          size={34}
                          rounded="xl"
                          online={isOnline}
                        />
                      ) : (
                        <div className="relative">
                          <CoinIcon symbol={trade.crypto} size={28} />
                          {isOnline && (
                            <span
                              title={`${counterparty} is online`}
                              className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#16A34A] dark:border-[#131A1A] dark:bg-[#7FE85B]"
                            />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-[#0E1715] dark:text-white">
                          @{counterparty}
                        </span>
                        <span className="font-mono text-[11px] text-[#64706E] dark:text-[#8E9B98]">
                          {trade.id}
                        </span>
                        <span
                          className={`font-mono text-[11px] font-semibold ${
                            trade.status === 'completed'
                              ? 'text-[#0D6832] dark:text-[#7FE85B]'
                              : trade.status === 'cancelled'
                                ? 'text-[#64706E]'
                                : 'text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          · {trade.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="mt-0.5 font-mono text-[11px] text-[#5C6665] dark:text-[#98A4A2]">
                        {formatCrypto(trade.cryptoAmount, trade.crypto)} ·{' '}
                        {formatFiat(trade.fiatAmount, trade.fiat)} via {trade.paymentMethod}
                      </div>

                      {lastMsg && (
                        <p className="mt-1 truncate text-xs text-[#394241] dark:text-[#C5D1CF]">
                          <span className="font-semibold">
                            {lastMsg.isSystem
                              ? 'Escrow'
                              : lastMsg.sender === currentUsername
                                ? 'You'
                                : lastMsg.sender}
                            :
                          </span>{' '}
                          {lastMsg.text}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {lastMsg && (
                      <span className="font-mono text-[11px] text-[#64706E] dark:text-[#8E9B98]">
                        {formatMsgTime(lastMsg.timestamp)}
                      </span>
                    )}
                    {unread > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0B3B2E] px-1.5 font-mono text-[11px] font-bold text-white dark:bg-[#7FE85B] dark:text-[#082213]">
                        {unread}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
