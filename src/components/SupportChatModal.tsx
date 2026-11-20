import { Headphones, KeyRound, Send, ShieldCheck, UserCheck, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  api,
  getOrCreateSupportVisitorId,
  getSavedSupportContactLabel,
  getSupportChatId,
  isQuotaExceededError,
  saveSupportContactLabel,
} from '../api';
import type { DirectChat, DirectMessage, UserAccount } from '../types';

interface SupportChatModalProps {
  user: UserAccount | null;
  onClose: () => void;
}

const QUICK_PROMPTS = [
  'I lost access to my account and need recovery help',
  'Question about my XMR / crypto withdrawal',
  'Help needed with an active P2P escrow trade',
];

export function SupportChatModal({ user, onClose }: SupportChatModalProps) {
  const visitorId = useMemo(() => getOrCreateSupportVisitorId(), []);
  const chatId = useMemo(() => getSupportChatId(visitorId), [visitorId]);

  const [chatDoc, setChatDoc] = useState<DirectChat | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [contactLabel, setContactLabel] = useState<string>(() => {
    const saved = getSavedSupportContactLabel();
    if (saved) return saved;
    return user?.username ? `@${user.username}` : '';
  });
  const [labelSavedNotice, setLabelSavedNotice] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMarkedAdminMsgAtRef = useRef<string>('');

  useEffect(() => {
    if (user?.username && !contactLabel.trim()) {
      setContactLabel(`@${user.username}`);
    }
  }, [user?.username]);

  useEffect(() => {
    const unsubDoc = api.subscribeSupportChatDoc(
      chatId,
      (docData) => {
        setChatDoc(docData);
      },
      (err) => {
        setError(
          isQuotaExceededError(err)
            ? 'Temporarily experiencing server issues. Your account and messages remain safe — please try again shortly.'
            : err.message || 'Unable to connect to live support.'
        );
      }
    );
    const unsubMsgs = api.subscribeSupportMessages(
      chatId,
      (msgs) => {
        setMessages(msgs);
        setError('');
      },
      (err) => {
        setError(
          isQuotaExceededError(err)
            ? 'Temporarily experiencing server issues. Please try again shortly.'
            : err.message || 'Unable to load support messages.'
        );
      }
    );
    return () => {
      unsubDoc();
      unsubMsgs();
    };
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (!chatDoc) return;
    const lastAdminMsgAt = chatDoc.lastReadAtBy?.lastAdminMsgAt ?? '';
    const lastVisitorRead = chatDoc.lastReadAtBy?.visitor ?? '';
    if (
      lastAdminMsgAt &&
      lastMarkedAdminMsgAtRef.current !== lastAdminMsgAt &&
      (!lastVisitorRead || lastAdminMsgAt > lastVisitorRead)
    ) {
      lastMarkedAdminMsgAtRef.current = lastAdminMsgAt;
      void api.markSupportChatRead(chatId, 'visitor').catch(() => undefined);
    }
  }, [chatDoc, chatId, messages.length]);

  const handleSaveLabel = async () => {
    saveSupportContactLabel(contactLabel);
    if (chatDoc) {
      try {
        await api.updateSupportContactLabel(visitorId, contactLabel, user?.username);
      } catch {
        // non-blocking
      }
    }
    setLabelSavedNotice(true);
    setTimeout(() => setLabelSavedNotice(false), 1800);
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const clean = text.trim();
    if (!clean || sending) return;
    setError('');
    setSending(true);
    try {
      await api.sendSupportMessage({
        visitorId,
        text: clean,
        contactLabel: contactLabel.trim(),
        currentUsername: user?.username,
      });
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send support message.');
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-[#DCE2E1] bg-white shadow-2xl sm:rounded-2xl dark:border-[#263130] dark:bg-[#131A1A]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#ECEFEF] bg-[#0B3B2E] px-5 py-4 text-white dark:border-[#202B2A] dark:bg-[#0D2720]">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7FE85B] text-[#082213]">
              <Headphones className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate font-display text-base font-bold text-white">
                  OOSAB Support 24/7
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#154D3D] px-2 py-0.5 text-[10px] font-semibold text-[#7FE85B]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#7FE85B]" />
                  Live Desk
                </span>
              </div>
              <p className="truncate text-xs text-[#CFE7DC]">
                Direct encrypted connection to OOSAB Admin · No login required
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close 24/7 support chat"
            className="rounded-lg p-1.5 text-[#CFE7DC] hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Lost-Access / Account Identification Bar */}
        <div className="border-b border-[#ECEFEF] bg-[#F8FAFA] px-4 py-3 dark:border-[#202B2A] dark:bg-[#0F1515]">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-[#394241] dark:text-[#C5D1CF]">
            <span className="inline-flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-[#0B3B2E] dark:text-[#7FE85B]" />
              <span>Your account username or contact note (helps if you lost access)</span>
            </span>
            {labelSavedNotice && (
              <span className="inline-flex items-center gap-1 text-[#0D6832] dark:text-[#7FE85B]">
                <UserCheck className="h-3 w-3" />
                Saved
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="text"
              value={contactLabel}
              onChange={(e) => setContactLabel(e.target.value)}
              onBlur={handleSaveLabel}
              maxLength={140}
              placeholder="e.g. @oldusername or email / Telegram handle"
              className="h-9 flex-1 rounded-lg border border-[#DCE2E1] bg-white px-3 text-xs text-[#0E1715] placeholder-[#7B8684] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
            />
            <button
              type="button"
              onClick={handleSaveLabel}
              className="h-9 rounded-lg border border-[#DCE2E1] bg-white px-3 text-xs font-semibold text-[#0E1715] hover:bg-[#EEF6F2] dark:border-[#263130] dark:bg-[#182120] dark:text-white dark:hover:bg-[#1F2B2A]"
            >
              Set Info
            </button>
          </div>
        </div>

        {/* Messages Feed */}
        <div className="min-h-[290px] max-h-[52vh] flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[230px] flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF6F2] text-[#0B3B2E] dark:bg-[#152B20] dark:text-[#7FE85B]">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <p className="mt-3 font-display text-sm font-bold text-[#0E1715] dark:text-white">
                How can OOSAB Support help you today?
              </p>
              <p className="mt-1 max-w-sm text-xs text-[#5C6665] dark:text-[#98A4A2]">
                Write your message below. Messages go straight to the admin desk and replies appear live right here — even if you cannot sign in.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setText(prompt)}
                    className="rounded-lg border border-[#DCE2E1] bg-[#F8FAFA] px-3 py-1.5 text-left text-xs font-medium text-[#1E2726] hover:border-[#0B3B2E] hover:bg-[#EEF6F2] dark:border-[#263130] dark:bg-[#182120] dark:text-[#DCE4E3] dark:hover:border-[#7FE85B]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const isSupportAdmin = m.senderUid === 'support_admin';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isSupportAdmin ? 'items-start' : 'items-end'}`}
                >
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[#6C7775]">
                    {isSupportAdmin ? (
                      <span className="inline-flex items-center gap-1 rounded bg-[#E8F8EE] px-1.5 py-0.5 font-semibold text-[#0B3B2E] dark:bg-[#152D21] dark:text-[#7FE85B]">
                        <Headphones className="h-3 w-3" />
                        OOSAB Support
                      </span>
                    ) : (
                      <span>{m.sender || 'You'}</span>
                    )}
                    <span className="font-mono text-[10px] opacity-75">
                      {formatClock(m.timestamp)}
                    </span>
                  </div>
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      isSupportAdmin
                        ? 'border border-[#DCE2E1] bg-[#F8FAFA] text-[#0E1715] dark:border-[#263130] dark:bg-[#182120] dark:text-[#EDF3F2]'
                        : 'bg-[#0B3B2E] text-white dark:bg-[#7FE85B] dark:text-[#082213]'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="mx-4 mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Composer */}
        <div className="border-t border-[#ECEFEF] bg-white p-3.5 dark:border-[#202B2A] dark:bg-[#131A1A]">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={2000}
              placeholder="Write to OOSAB 24/7 Support..."
              className="h-11 flex-1 rounded-xl border border-[#DCE2E1] bg-white px-3.5 text-sm text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              aria-label="Send message to 24/7 support"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0B3B2E] text-white hover:bg-[#082B21] disabled:opacity-50 dark:bg-[#7FE85B] dark:text-[#082213]"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-2 text-[11px] text-[#64706E] dark:text-[#8E9B98]">
            Session ID <span className="font-mono">{visitorId}</span> stays saved in this browser so you can reopen Support 24/7 anytime for replies.
          </p>
        </div>
      </div>
    </div>
  );
}
