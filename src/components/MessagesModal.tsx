import { MessageSquare, Search, ShieldCheck, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatCrypto, formatFiat } from '../constants/market';
import type { DirectChat, TradeOrder, TraderProfile } from '../types';
import { CoinIcon } from './CoinIcon';
import { TraderAvatar } from './TraderAvatar';

interface MessagesModalProps {
  trades: TradeOrder[];
  directChats?: DirectChat[];
  traders?: Record<string, TraderProfile>;
  currentUsername: string;
  onlineUsers: string[];
  onClose: () => void;
  onSelectTrade: (trade: TradeOrder) => void;
  onSelectDirectChat?: (chat: DirectChat) => void;
}

function getLastReadMs(map: Record<string, string> | undefined, currentUsername?: string): number {
  if (!map || !currentUsername) return 0;
  if (map[currentUsername]) return new Date(map[currentUsername]).getTime();
  const key = Object.keys(map).find((k) => k.toLowerCase() === currentUsername.toLowerCase());
  return key ? new Date(map[key]).getTime() : 0;
}

export function getTradeUnreadCount(trade: TradeOrder, currentUsername?: string): number {
  if (!currentUsername) return 0;
  const lastReadMs = getLastReadMs(trade.lastReadAtBy, currentUsername);
  return trade.messages.filter((m) => {
    if (m.sender.toLowerCase() === currentUsername.toLowerCase()) return false;
    return new Date(m.timestamp).getTime() > lastReadMs;
  }).length;
}

export function getDirectChatUnreadCount(chat: DirectChat, currentUsername?: string): number {
  if (!currentUsername) return 0;
  const lastReadMs = getLastReadMs(chat.lastReadAtBy, currentUsername);
  return chat.messages.filter((m) => {
    if (m.sender.toLowerCase() === currentUsername.toLowerCase()) return false;
    return new Date(m.timestamp).getTime() > lastReadMs;
  }).length;
}

type FilterMode = 'all' | 'trades' | 'direct';

export function MessagesModal({
  trades,
  directChats = [],
  traders = {},
  currentUsername,
  onlineUsers,
  onClose,
  onSelectTrade,
  onSelectDirectChat,
}: MessagesModalProps) {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const combinedItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    const tradeItems = trades
      .filter((t) => {
        if (filterMode === 'direct') return false;
        if (!q) return true;
        const other =
          t.buyerUsername.toLowerCase() === currentUsername.toLowerCase()
            ? t.sellerUsername
            : t.buyerUsername;
        return (
          t.id.toLowerCase().includes(q) ||
          other.toLowerCase().includes(q) ||
          t.crypto.toLowerCase().includes(q) ||
          t.paymentMethod.toLowerCase().includes(q) ||
          t.messages.some((m) => m.text.toLowerCase().includes(q))
        );
      })
      .map((trade) => {
        const lastMsg = trade.messages[trade.messages.length - 1];
        const sortMs = new Date(lastMsg?.timestamp ?? trade.createdAt).getTime();
        return { kind: 'trade' as const, trade, sortMs };
      });

    const chatItems = directChats
      .filter((c) => {
        if (filterMode === 'trades') return false;
        if (!q) return true;
        const other =
          c.participants.find((p) => p.toLowerCase() !== currentUsername.toLowerCase()) ?? '';
        return (
          c.id.toLowerCase().includes(q) ||
          other.toLowerCase().includes(q) ||
          (c.offerId ?? '').toLowerCase().includes(q) ||
          (c.offerSummary ?? '').toLowerCase().includes(q) ||
          c.messages.some((m) => m.text.toLowerCase().includes(q))
        );
      })
      .map((chat) => {
        const lastMsg = chat.messages[chat.messages.length - 1];
        const sortMs = new Date(lastMsg?.timestamp ?? chat.updatedAt ?? chat.createdAt).getTime();
        return { kind: 'direct' as const, chat, sortMs };
      });

    return [...tradeItems, ...chatItems].sort((a, b) => b.sortMs - a.sortMs);
  }, [trades, directChats, search, currentUsername, filterMode]);

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
                Messages &amp; Escrow Chats
              </h2>
              <p className="text-xs text-[#5C6665] dark:text-[#98A4A2]">
                Direct trader messages and active or completed escrow chats
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

        {/* Filter Tabs + Search */}
        <div className="space-y-2.5 border-b border-[#ECEFEF] px-5 py-3 dark:border-[#202B2A]">
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-[#E3E7E7] bg-[#F5F7F7] p-1 dark:border-[#24302E] dark:bg-[#0E1414]">
            {(
              [
                { id: 'all', label: `All (${trades.length + directChats.length})` },
                { id: 'trades', label: `Escrow Trades (${trades.length})` },
                { id: 'direct', label: `Direct (${directChats.length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id)}
                className={`rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                  filterMode === tab.id
                    ? 'bg-white text-[#0E1715] shadow-xs dark:bg-[#1C2625] dark:text-white'
                    : 'text-[#5C6665] hover:text-[#111917] dark:text-[#98A4A2]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex h-10 items-center gap-2 rounded-xl border border-[#DCE2E1] bg-[#F8FAFA] px-3 focus-within:border-[#0B3B2E] dark:border-[#263130] dark:bg-[#0D1313] dark:focus-within:border-[#7FE85B]">
            <Search className="h-4 w-4 text-[#64706E]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username, offer/trade ID, coin, or message..."
              className="w-full bg-transparent text-xs text-[#0E1715] placeholder-[#7B8684] focus:outline-none dark:text-white"
            />
          </div>
        </div>

        {/* Thread List */}
        <div className="flex-1 divide-y divide-[#ECEFEF] overflow-y-auto dark:divide-[#202B2A]">
          {combinedItems.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-[#0E1715] dark:text-white">
                No conversations yet
              </p>
              <p className="mt-1 text-xs text-[#5C6665] dark:text-[#98A4A2]">
                Open an escrow trade or click Message on any trader profile or shared offer link to start chatting.
              </p>
            </div>
          ) : (
            combinedItems.map((item) => {
              if (item.kind === 'direct') {
                const { chat } = item;
                const counterparty =
                  chat.participants.find(
                    (p) => p.toLowerCase() !== currentUsername.toLowerCase()
                  ) ?? chat.participants[0];
                const traderKey = Object.keys(traders).find(
                  (k) => k.toLowerCase() === counterparty.toLowerCase()
                );
                const counterpartyTrader = traderKey ? traders[traderKey] : undefined;
                const unread = getDirectChatUnreadCount(chat, currentUsername);
                const lastMsg = chat.messages[chat.messages.length - 1];
                const isOnline = onlineUsers.some(
                  (u) => u.toLowerCase() === counterparty.toLowerCase()
                );

                return (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelectDirectChat?.(chat);
                    }}
                    className={`flex w-full items-start justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-[#F8FAFA] dark:hover:bg-[#17201F] ${
                      unread > 0 ? 'bg-[#F4FBF6] dark:bg-[#112119]' : ''
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        <TraderAvatar
                          username={counterparty}
                          avatarUrl={counterpartyTrader?.avatarUrl}
                          accentTheme={counterpartyTrader?.accentTheme}
                          size={34}
                          rounded="xl"
                          online={isOnline}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-[#0E1715] dark:text-white">
                            @{counterparty}
                          </span>
                          <span className="rounded bg-[#EEF6F2] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#0B3B2E] dark:bg-[#152B20] dark:text-[#7FE85B]">
                            Direct Message
                          </span>
                          {chat.offerId && (
                            <span className="font-mono text-[11px] text-[#64706E] dark:text-[#8E9B98]">
                              {chat.offerId}
                            </span>
                          )}
                        </div>
                        {chat.offerSummary && (
                          <div className="mt-0.5 font-mono text-[11px] text-[#5C6665] dark:text-[#98A4A2]">
                            {chat.offerSummary}
                          </div>
                        )}
                        {lastMsg ? (
                          <p className="mt-1 truncate text-xs text-[#394241] dark:text-[#C5D1CF]">
                            <span className="font-semibold">
                              {lastMsg.sender.toLowerCase() === currentUsername.toLowerCase()
                                ? 'You'
                                : lastMsg.sender}
                              :
                            </span>{' '}
                            {lastMsg.text}
                          </p>
                        ) : (
                          <p className="mt-1 truncate text-xs italic text-[#64706E] dark:text-[#8E9B98]">
                            No messages yet
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
              }

              const { trade } = item;
              const counterparty =
                trade.buyerUsername.toLowerCase() === currentUsername.toLowerCase()
                  ? trade.sellerUsername
                  : trade.buyerUsername;
              const traderKey = Object.keys(traders).find(
                (k) => k.toLowerCase() === counterparty.toLowerCase()
              );
              const counterpartyTrader = traderKey ? traders[traderKey] : undefined;
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
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#64706E] dark:text-[#8E9B98]">
                          <ShieldCheck className="h-3 w-3 text-[#0D6832] dark:text-[#7FE85B]" />
                          <span>{trade.id}</span>
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
                              : lastMsg.sender.toLowerCase() === currentUsername.toLowerCase()
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
