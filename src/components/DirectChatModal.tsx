import { ExternalLink, MessageSquare, Send, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../api';
import type { DirectChat, TraderProfile, UserAccount } from '../types';
import { TraderAvatar } from './TraderAvatar';

interface DirectChatModalProps {
  chat: DirectChat;
  trader?: TraderProfile;
  user: UserAccount;
  onlineUsers: string[];
  typingUsername?: string | null;
  onTyping: (chatId: string, isTyping: boolean) => void;
  onMarkRead: (chatId: string) => void;
  onChatUpdated: (chat: DirectChat) => void;
  onSelectTrader: (username: string) => void;
  onOpenOffer?: (offerId: string) => void;
  onClose: () => void;
}

export function DirectChatModal({
  chat: initialChat,
  trader,
  user,
  onlineUsers,
  typingUsername,
  onTyping,
  onMarkRead,
  onChatUpdated,
  onSelectTrader,
  onOpenOffer,
  onClose,
}: DirectChatModalProps) {
  const [chat, setChat] = useState<DirectChat>(initialChat);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setChat(initialChat);
  }, [initialChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages.length, chat.id]);

  useEffect(() => {
    onMarkRead(chat.id);
  }, [chat.id, chat.messages.length]);

  const counterparty =
    chat.participants.find((p) => p.toLowerCase() !== user.username.toLowerCase()) ??
    chat.participants[0];

  const isOnline = onlineUsers.some((u) => u.toLowerCase() === counterparty.toLowerCase());

  const handleInputChange = (nextVal: string) => {
    setText(nextVal);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (nextVal.trim().length > 0) {
      onTyping(chat.id, true);
      typingTimerRef.current = setTimeout(() => {
        onTyping(chat.id, false);
      }, 1500);
    } else {
      onTyping(chat.id, false);
    }
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setError('');
    setSending(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    onTyping(chat.id, false);
    try {
      const res = await api.sendDirectMessage(chat.id, text.trim(), chat.offerId);
      setChat(res.chat);
      onChatUpdated(res.chat);
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatClock = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-[#DCE2E1] bg-white shadow-xl sm:rounded-2xl dark:border-[#263130] dark:bg-[#131A1A]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#ECEFEF] px-5 py-4 dark:border-[#202B2A]">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                onSelectTrader(counterparty);
              }}
              className="shrink-0 rounded-xl focus:outline-none"
            >
              <TraderAvatar
                username={counterparty}
                avatarUrl={trader?.avatarUrl}
                accentTheme={trader?.accentTheme}
                size={38}
                rounded="xl"
                online={isOnline}
              />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectTrader(counterparty);
                  }}
                  className="truncate font-display text-base font-bold text-[#0E1715] hover:underline dark:text-white"
                >
                  @{counterparty}
                </button>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5C6665] dark:text-[#98A4A2]">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isOnline ? 'bg-[#16A34A] dark:bg-[#7FE85B]' : 'bg-[#9CA8A6]'
                    }`}
                  />
                  <span>{isOnline ? 'Online' : 'Offline'}</span>
                </span>
              </div>
              <p className="truncate text-xs text-[#5C6665] dark:text-[#98A4A2]">
                Direct trader conversation · Zero KYC
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close direct chat"
            className="rounded-lg p-1.5 text-[#5C6665] hover:bg-[#F1F4F3] dark:text-[#98A4A2] dark:hover:bg-[#1E2927]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Linked Offer Context Banner */}
        {chat.offerId && (
          <div className="flex items-center justify-between gap-2 border-b border-[#ECEFEF] bg-[#F8FAFA] px-5 py-2.5 text-xs dark:border-[#202B2A] dark:bg-[#0F1515]">
            <div className="min-w-0 truncate text-[#394241] dark:text-[#C5D1CF]">
              <span className="font-mono font-bold text-[#0B3B2E] dark:text-[#7FE85B]">
                /offer/{chat.offerId}
              </span>
              {chat.offerSummary && <span className="ml-2">{chat.offerSummary}</span>}
            </div>
            {onOpenOffer && (
              <button
                type="button"
                onClick={() => {
                  const targetId = chat.offerId!;
                  onClose();
                  onOpenOffer(targetId);
                }}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#DCE2E1] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0E1715] hover:bg-[#EEF6F2] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
              >
                <span>View Ad</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* Messages Feed */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5 min-h-[280px] max-h-[55vh]">
          {chat.messages.length === 0 ? (
            <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF6F2] text-[#0B3B2E] dark:bg-[#152B20] dark:text-[#7FE85B]">
                <MessageSquare className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-semibold text-[#0E1715] dark:text-white">
                Start a conversation with @{counterparty}
              </p>
              <p className="mt-1 max-w-xs text-xs text-[#5C6665] dark:text-[#98A4A2]">
                Ask about payment details, availability, or custom trade amounts before locking escrow.
              </p>
            </div>
          ) : (
            chat.messages.map((m) => {
              const isMe = m.sender.toLowerCase() === user.username.toLowerCase();
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[#6C7775]">
                    <span>@{m.sender}</span>
                    <span className="font-mono text-[10px] opacity-75">
                      {formatClock(m.timestamp)}
                    </span>
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      isMe
                        ? 'bg-[#0B3B2E] text-white dark:bg-[#7FE85B] dark:text-[#082213]'
                        : 'border border-[#E3E7E7] bg-[#F8FAFA] text-[#0E1715] dark:border-[#222D2C] dark:bg-[#182120] dark:text-[#EDF3F2]'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })
          )}

          {typingUsername && (
            <div className="text-xs italic text-[#5C6665] dark:text-[#8E9B98]">
              @{typingUsername} is typing...
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="mx-4 mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Composer */}
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 border-t border-[#ECEFEF] p-3.5 dark:border-[#202B2A]"
        >
          <input
            type="text"
            value={text}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={`Write a message to @${counterparty}...`}
            className="h-11 flex-1 rounded-xl border border-[#DCE2E1] bg-white px-3.5 text-sm text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            aria-label="Send direct message"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0B3B2E] text-white hover:bg-[#082B21] disabled:opacity-50 dark:bg-[#7FE85B] dark:text-[#082213]"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
