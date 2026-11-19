import {
  AlertTriangle,
  Award,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Coins,
  Database,
  DollarSign,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileJson,
  Headphones,
  ImagePlus,
  Lock,
  MessageSquare,
  MessageSquarePlus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Upload,
  UserCog,
  UserX,
  Users,
  Volume2,
  VolumeX,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  api,
  enrichTradeMessages,
  type AdminAccountDetails,
  type DirectoryUser,
  type TablesSummaryResponse,
} from '../api';
import {
  CRYPTO_ASSETS,
  FIAT_CURRENCIES,
  PAYMENT_METHODS,
  formatCrypto,
  formatFiat,
} from '../constants/market';
import type {
  CryptoAsset,
  DirectChat,
  DirectMessage,
  FiatCurrency,
  MarketPrices,
  TradeMessage,
  TradeOrder,
  TraderProfile,
  UserAccount,
  WalletTxStatus,
} from '../types';
import { processChatImageFile } from '../utils/profileMedia';
import { playSupportChime, unlockNotificationAudio } from '../utils/notificationSound';
import { CoinIcon } from './CoinIcon';

interface SecretCreditModalProps {
  user: UserAccount | null;
  prices: MarketPrices;
  onClose: () => void;
  onRequireAuth: (mode: 'login' | 'register') => void;
  onUserUpdated: (user: UserAccount) => void;
  onProfileUpdated?: (trader: TraderProfile) => void;
  onAccountRemoved?: (username: string, removedSelf: boolean) => void;
  onDataSynced?: () => void;
  onNavigateProfile?: (username: string) => void;
  onOpenWallet: () => void;
}

const USD_PRESETS = [100, 500, 1000, 5000, 10000];

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function shiftIsoDate(monthsAgo: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return d.toISOString().slice(0, 10);
}

export function SecretCreditModal({
  user,
  prices,
  onClose,
  onRequireAuth,
  onUserUpdated,
  onProfileUpdated,
  onAccountRemoved,
  onDataSynced,
  onNavigateProfile,
  onOpenWallet,
}: SecretCreditModalProps) {
  const [vaultTab, setVaultTab] = useState<'credit' | 'reputation' | 'accounts' | 'trades' | 'support' | 'tables'>('credit');
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [targetUsername, setTargetUsername] = useState<string>(user?.username ?? '');
  const [userSearch, setUserSearch] = useState('');

  // Account Manager & Reviews Moderation tab state
  const [acctDetails, setAcctDetails] = useState<AdminAccountDetails | null>(null);
  const [acctLoading, setAcctLoading] = useState(false);
  const [acctBusy, setAcctBusy] = useState(false);
  const [acctError, setAcctError] = useState('');
  const [acctMsg, setAcctMsg] = useState('');
  const [editJoinedAt, setEditJoinedAt] = useState('');
  const [editTradesCount, setEditTradesCount] = useState('0');
  const [editRatingPct, setEditRatingPct] = useState('100');
  const [editAvgRelease, setEditAvgRelease] = useState('5');
  const [editCompletionPct, setEditCompletionPct] = useState('99.4');
  const [editLastSeen, setEditLastSeen] = useState('0');
  const [editTotalVolUsd, setEditTotalVolUsd] = useState('0');
  const [editVolumeTier, setEditVolumeTier] = useState('Starter');
  const [editFeedbackCount, setEditFeedbackCount] = useState('0');
  const [editVerified, setEditVerified] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editTagline, setEditTagline] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editTradingHours, setEditTradingHours] = useState('');
  const [editBalances, setEditBalances] = useState<Record<CryptoAsset, string>>({
    BTC: '0',
    XMR: '0',
    ETH: '0',
    USDT: '0',
    LTC: '0',
    SOL: '0',
    USDC: '0',
  });
  const [stripAvatar, setStripAvatar] = useState(false);
  const [stripBanner, setStripBanner] = useState(false);
  const [clearWalletHist, setClearWalletHist] = useState(false);
  const [recalcOnReviewDelete, setRecalcOnReviewDelete] = useState(true);
  const [decrementOnHistDelete, setDecrementOnHistDelete] = useState(true);
  const [refundOnInvalidAddr, setRefundOnInvalidAddr] = useState(true);
  const [txAddressDrafts, setTxAddressDrafts] = useState<Record<string, string>>({});
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [newFbComment, setNewFbComment] = useState('');
  const [newFbAuthor, setNewFbAuthor] = useState('');
  const [newFbAsset, setNewFbAsset] = useState<CryptoAsset>('BTC');
  const [newFbPositive, setNewFbPositive] = useState(true);
  const [newFbDate, setNewFbDate] = useState('Just now');
  const [genFbAsset, setGenFbAsset] = useState<CryptoAsset | 'MIXED'>('MIXED');
  const [genFbIncTrades, setGenFbIncTrades] = useState(false);

  // Live Trades Admin tab state
  const [allTrades, setAllTrades] = useState<TradeOrder[]>([]);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [tradesError, setTradesError] = useState('');
  const [tradeSearch, setTradeSearch] = useState('');
  const [tradeStatusFilter, setTradeStatusFilter] = useState<
    'all' | 'active' | 'disputed' | 'completed' | 'cancelled'
  >('all');
  const [selectedTradeId, setSelectedTradeId] = useState<string>('');
  const [selectedTradeRawMsgs, setSelectedTradeRawMsgs] = useState<TradeMessage[]>([]);
  const [adminMsgText, setAdminMsgText] = useState('');
  const [adminPendingImage, setAdminPendingImage] = useState<string | null>(null);
  const [adminMsgRole, setAdminMsgRole] = useState<'admin' | 'system' | 'buyer' | 'seller'>('admin');
  const [adminMsgBusy, setAdminMsgBusy] = useState(false);
  const [tradeActionBusy, setTradeActionBusy] = useState(false);
  const [tradeActionMsg, setTradeActionMsg] = useState('');
  const [tradeActionError, setTradeActionError] = useState('');
  const [adminPreviewImageUrl, setAdminPreviewImageUrl] = useState<string | null>(null);
  const adminImageInputRef = useRef<HTMLInputElement | null>(null);
  const adminChatBottomRef = useRef<HTMLDivElement | null>(null);

  // 24/7 Support Desk Admin tab state
  const [supportChats, setSupportChats] = useState<DirectChat[]>([]);
  const [supportLoading, setSupportLoading] = useState(true);
  const [supportError, setSupportError] = useState('');
  const [supportSearch, setSupportSearch] = useState('');
  const [selectedSupportChatId, setSelectedSupportChatId] = useState<string>('');
  const [selectedSupportMsgs, setSelectedSupportMsgs] = useState<DirectMessage[]>([]);
  const [supportReplyText, setSupportReplyText] = useState('');
  const [supportReplyBusy, setSupportReplyBusy] = useState(false);
  const [supportReplyError, setSupportReplyError] = useState('');
  const [supportSoundEnabled, setSupportSoundEnabled] = useState(true);
  const [supportAlert, setSupportAlert] = useState<{
    chatId: string;
    senderLabel: string;
    preview: string;
    receivedAt: string;
  } | null>(null);
  const adminSupportBottomRef = useRef<HTMLDivElement | null>(null);
  const vaultTabRef = useRef(vaultTab);
  const selectedSupportChatIdRef = useRef(selectedSupportChatId);
  const supportSoundEnabledRef = useRef(supportSoundEnabled);
  const supportInitializedRef = useRef(false);
  const lastSeenVisitorMsgByChatRef = useRef<Record<string, string>>({});

  // Saved Tables tab state
  const [tablesSummary, setTablesSummary] = useState<TablesSummaryResponse | null>(null);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [tablesStatus, setTablesStatus] = useState('');
  const [tablesError, setTablesError] = useState('');
  const importInputRef = useRef<HTMLInputElement | null>(null);

  // Balance Credit tab state
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoAsset>('BTC');
  const [inputMode, setInputMode] = useState<'usd' | 'crypto'>('usd');
  const [amountInput, setAmountInput] = useState<string>('1000');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lastCredit, setLastCredit] = useState<{
    target: string;
    crypto: CryptoAsset;
    creditedCrypto: number;
    usdValue: number;
  } | null>(null);

  // Profile Trades & Feedback tab state
  const [addTradesCount, setAddTradesCount] = useState('5');
  const [ratingPct, setRatingPct] = useState('100');
  const [avgReleaseMinutes, setAvgReleaseMinutes] = useState('3');
  const [addVolumeUsd, setAddVolumeUsd] = useState('');
  const [verifiedToggle, setVerifiedToggle] = useState(true);

  const [includeTradeRecord, setIncludeTradeRecord] = useState(true);
  const [recAsset, setRecAsset] = useState<CryptoAsset>('BTC');
  const [recSide, setRecSide] = useState<'Sold' | 'Bought'>('Sold');
  const [recCryptoAmt, setRecCryptoAmt] = useState('0.085');
  const [recFiatAmt, setRecFiatAmt] = useState('4200');
  const [recFiat, setRecFiat] = useState<FiatCurrency>('USD');
  const [recMethod, setRecMethod] = useState(PAYMENT_METHODS[0].name);
  const [recCounterparty, setRecCounterparty] = useState('v***x');

  const [fbAuthor, setFbAuthor] = useState('Victor7777');
  const [fbPositive, setFbPositive] = useState(true);
  const [fbAsset, setFbAsset] = useState<CryptoAsset>('BTC');
  const [fbComment, setFbComment] = useState(
    'Instant escrow release and smooth zero-KYC settlement. Highly recommended!'
  );
  const [repBusy, setRepBusy] = useState(false);
  const [repError, setRepError] = useState('');
  const [repSuccess, setRepSuccess] = useState('');

  const loadDirectory = () => {
    api
      .getUserDirectory()
      .then((res) => {
        const users = res.users ?? [];
        setDirectory(users);
        if (!targetUsername) {
          if (user?.username) setTargetUsername(user.username);
          else if (users.length > 0) setTargetUsername(users[0].username);
        }
      })
      .catch(() => undefined);
  };

  const loadTablesSummary = (showSuccess = false) => {
    setTablesLoading(true);
    setTablesError('');
    api
      .getTablesSummary()
      .then((res) => {
        setTablesSummary(res);
        if (showSuccess) {
          setTablesStatus(
            `Refreshed Cloud Firestore collections: ${res.savedAccounts.length} account(s), ${res.customOffersCount} custom ad(s).`
          );
        }
      })
      .catch((err) => {
        setTablesError(err instanceof Error ? err.message : 'Unable to read website tables.');
      })
      .finally(() => {
        setTablesLoading(false);
      });
  };

  useEffect(() => {
    loadDirectory();
    loadTablesSummary();
  }, []);

  // Live Firestore listener for ALL platform trades
  useEffect(() => {
    setTradesLoading(true);
    const unsub = api.adminSubscribeAllTrades(
      (list) => {
        setAllTrades(list);
        setTradesLoading(false);
        setTradesError('');
        setSelectedTradeId((prev) => {
          if (prev && list.some((t) => t.id === prev)) return prev;
          return list[0]?.id ?? '';
        });
      },
      (err) => {
        setTradesLoading(false);
        setTradesError(err.message || 'Unable to subscribe to live trades.');
      }
    );
    return () => unsub();
  }, []);

  // Live Firestore subcollection listener for currently selected trade chat
  useEffect(() => {
    if (vaultTab !== 'trades' || !selectedTradeId) {
      setSelectedTradeRawMsgs([]);
      return;
    }
    const unsub = api.adminSubscribeTradeMessages(
      selectedTradeId,
      (msgs) => {
        setSelectedTradeRawMsgs(msgs);
      },
      (err) => {
        setTradeActionError(err.message || 'Unable to subscribe to trade chat.');
      }
    );
    return () => unsub();
  }, [vaultTab, selectedTradeId]);

  useEffect(() => {
    if (vaultTab === 'trades') {
      adminChatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [vaultTab, selectedTradeId, selectedTradeRawMsgs.length]);

  useEffect(() => {
    vaultTabRef.current = vaultTab;
  }, [vaultTab]);

  useEffect(() => {
    selectedSupportChatIdRef.current = selectedSupportChatId;
  }, [selectedSupportChatId]);

  useEffect(() => {
    supportSoundEnabledRef.current = supportSoundEnabled;
  }, [supportSoundEnabled]);

  useEffect(() => {
    unlockNotificationAudio();
  }, []);

  // Live Firestore listener for ALL 24/7 Support Desk threads
  useEffect(() => {
    setSupportLoading(true);
    const unsub = api.adminSubscribeSupportChats(
      (list) => {
        if (!supportInitializedRef.current) {
          const initialMap: Record<string, string> = {};
          for (const c of list) {
            initialMap[c.id] = c.lastReadAtBy?.lastVisitorMsgAt ?? '';
          }
          lastSeenVisitorMsgByChatRef.current = initialMap;
          supportInitializedRef.current = true;
        } else {
          let newestIncoming: DirectChat | null = null;
          let newestIncomingAt = '';

          for (const c of list) {
            const nextVisitorAt = c.lastReadAtBy?.lastVisitorMsgAt ?? '';
            const prevVisitorAt = lastSeenVisitorMsgByChatRef.current[c.id] ?? '';
            if (nextVisitorAt && nextVisitorAt > prevVisitorAt) {
              lastSeenVisitorMsgByChatRef.current[c.id] = nextVisitorAt;
              if (!newestIncomingAt || nextVisitorAt > newestIncomingAt) {
                newestIncoming = c;
                newestIncomingAt = nextVisitorAt;
              }
            }
          }

          if (newestIncoming) {
            if (supportSoundEnabledRef.current) {
              playSupportChime();
            }
            const alreadyViewingThisThread =
              vaultTabRef.current === 'support' &&
              selectedSupportChatIdRef.current === newestIncoming.id;
            if (!alreadyViewingThisThread) {
              setSupportAlert({
                chatId: newestIncoming.id,
                senderLabel:
                  newestIncoming.offerSummary ||
                  newestIncoming.participants[0] ||
                  'Guest Client',
                preview:
                  newestIncoming.lastReadAtBy?.lastVisitorMsgPreview ||
                  'New message waiting in 24/7 Support',
                receivedAt: newestIncomingAt,
              });
            }
          }
        }

        setSupportChats(list);
        setSupportLoading(false);
        setSupportError('');
        setSelectedSupportChatId((prev) => {
          if (prev && list.some((c) => c.id === prev)) return prev;
          return list[0]?.id ?? '';
        });
      },
      (err) => {
        setSupportLoading(false);
        setSupportError(err.message || 'Unable to subscribe to 24/7 support tickets.');
      }
    );
    return () => unsub();
  }, []);

  // Live Firestore listener for selected support chat messages
  useEffect(() => {
    if (vaultTab !== 'support' || !selectedSupportChatId) {
      setSelectedSupportMsgs([]);
      return;
    }
    const unsub = api.subscribeSupportMessages(
      selectedSupportChatId,
      (msgs) => {
        setSelectedSupportMsgs(msgs);
        setSupportReplyError('');
      },
      (err) => {
        setSupportReplyError(err.message || 'Unable to load support thread messages.');
      }
    );
    return () => unsub();
  }, [vaultTab, selectedSupportChatId]);

  useEffect(() => {
    if (vaultTab === 'support') {
      adminSupportBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [vaultTab, selectedSupportChatId, selectedSupportMsgs.length]);

  // Mark support ticket as read by admin when opened or new client message arrives
  useEffect(() => {
    if (vaultTab !== 'support' || !selectedSupportChatId) return;
    if (supportAlert?.chatId === selectedSupportChatId) {
      setSupportAlert(null);
    }
    const chat = supportChats.find((c) => c.id === selectedSupportChatId);
    if (!chat) return;
    const lastClientAt = chat.lastReadAtBy?.lastVisitorMsgAt ?? '';
    const lastAdminRead = chat.lastReadAtBy?.admin ?? '';
    if (lastClientAt && (!lastAdminRead || lastClientAt > lastAdminRead)) {
      void api.markSupportChatRead(selectedSupportChatId, 'admin');
    }
  }, [vaultTab, selectedSupportChatId, supportChats, selectedSupportMsgs.length, supportAlert?.chatId]);

  useEffect(() => {
    if (vaultTab === 'tables') {
      loadTablesSummary();
    }
  }, [vaultTab]);

  useEffect(() => {
    if (user?.username && !targetUsername) {
      setTargetUsername(user.username);
    }
  }, [user?.username]);

  const hydrateAccountForm = (details: AdminAccountDetails) => {
    setAcctDetails(details);
    setEditJoinedAt(details.trader.joinedAt || details.createdAt.slice(0, 10));
    setEditTradesCount(String(details.trader.tradesCount ?? 0));
    setEditRatingPct(String(details.trader.ratingPct ?? 100));
    setEditAvgRelease(String(details.trader.avgReleaseMinutes ?? 5));
    setEditCompletionPct(
      String(details.trader.completionRatePct ?? (details.trader.tradesCount > 0 ? 99.4 : 100))
    );
    setEditLastSeen(String(details.trader.lastSeenMinutes ?? 0));
    setEditTotalVolUsd(
      String(details.trader.totalVolumeUsd ?? (details.trader.tradesCount > 0 ? details.trader.tradesCount * 420 : 0))
    );
    setEditVolumeTier(details.trader.volumeTier || 'Starter');
    setEditFeedbackCount(
      String(details.trader.totalFeedbackCount ?? details.trader.recentFeedback.length)
    );
    setEditVerified(Boolean(details.trader.verified));
    setEditBio(details.trader.bio ?? '');
    setEditTagline(details.trader.tagline ?? '');
    setEditLocation(details.trader.location ?? '');
    setEditTradingHours(details.trader.tradingHours ?? '');
    setEditBalances({
      BTC: String(details.user.balances.BTC ?? 0),
      XMR: String(details.user.balances.XMR ?? 0),
      ETH: String(details.user.balances.ETH ?? 0),
      USDT: String(details.user.balances.USDT ?? 0),
      LTC: String(details.user.balances.LTC ?? 0),
      SOL: String(details.user.balances.SOL ?? 0),
      USDC: String(details.user.balances.USDC ?? 0),
    });
    setStripAvatar(false);
    setStripBanner(false);
    setClearWalletHist(false);
    setConfirmDeleteAccount(false);
    setTxAddressDrafts({});
  };

  const loadSelectedAccountDetails = (usernameToLoad: string, preserveNotice = false) => {
    const clean = usernameToLoad.trim();
    if (!clean) {
      setAcctDetails(null);
      return;
    }
    setAcctLoading(true);
    setAcctError('');
    if (!preserveNotice) setAcctMsg('');
    api
      .adminGetAccountDetails(clean)
      .then((details) => {
        hydrateAccountForm(details);
      })
      .catch((err) => {
        setAcctDetails(null);
        setAcctError(err instanceof Error ? err.message : 'Unable to load account details.');
      })
      .finally(() => {
        setAcctLoading(false);
      });
  };

  useEffect(() => {
    if (vaultTab === 'accounts') {
      const target = targetUsername.trim() || user?.username || '';
      if (target) {
        loadSelectedAccountDetails(target);
      } else {
        setAcctDetails(null);
      }
    }
  }, [vaultTab, targetUsername]);

  const filteredDirectory = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return directory;
    return directory.filter((u) => u.username.toLowerCase().includes(q));
  }, [directory, userSearch]);

  const activeTargetUser = useMemo(() => {
    const clean = targetUsername.trim().toLowerCase();
    return directory.find((u) => u.username.toLowerCase() === clean) ?? null;
  }, [directory, targetUsername]);

  const spotUsd = prices.usdPrices[selectedCrypto] ?? 1;
  const currentBalance =
    activeTargetUser?.balances[selectedCrypto] ??
    (user && user.username.toLowerCase() === targetUsername.trim().toLowerCase()
      ? user.balances[selectedCrypto] ?? 0
      : 0);

  const parsedInput = useMemo(() => {
    const n = Number(amountInput);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [amountInput]);

  const calculated = useMemo(() => {
    if (parsedInput <= 0 || spotUsd <= 0) {
      return { cryptoAmount: 0, usdAmount: 0 };
    }
    if (inputMode === 'usd') {
      const cryptoAmount = Number((parsedInput / spotUsd).toFixed(8));
      const usdAmount = Number(parsedInput.toFixed(2));
      return { cryptoAmount, usdAmount };
    }
    const cryptoAmount = Number(parsedInput.toFixed(8));
    const usdAmount = Number((cryptoAmount * spotUsd).toFixed(2));
    return { cryptoAmount, usdAmount };
  }, [parsedInput, inputMode, spotUsd]);

  const projectedBalance = currentBalance + calculated.cryptoAmount;
  const projectedUsd = projectedBalance * spotUsd;

  const cryptoPresets = useMemo(() => {
    if (selectedCrypto === 'BTC') return ['0.01', '0.05', '0.1', '0.5', '1'];
    if (selectedCrypto === 'ETH') return ['0.1', '0.5', '1', '5', '10'];
    if (selectedCrypto === 'XMR' || selectedCrypto === 'SOL' || selectedCrypto === 'LTC') {
      return ['1', '5', '10', '25', '100'];
    }
    return ['100', '500', '1000', '5000', '10000'];
  }, [selectedCrypto]);

  const resolvedTarget = targetUsername.trim() || user?.username || '';

  const handleSubmitCredit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLastCredit(null);

    if (!resolvedTarget) {
      onClose();
      onRequireAuth('register');
      return;
    }

    if (parsedInput <= 0) {
      setError('Enter a valid amount greater than zero.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.creditWallet({
        crypto: selectedCrypto,
        mode: inputMode,
        amount: parsedInput,
        targetUsername: resolvedTarget,
      });
      if (res.isSelf !== false && user && res.user.username === user.username) {
        onUserUpdated(res.user);
      }
      setLastCredit({
        target: res.targetUsername ?? res.user.username,
        crypto: selectedCrypto,
        creditedCrypto: res.creditedCrypto,
        usdValue: res.usdValue,
      });
      loadDirectory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to credit wallet balance.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReputation = async (e: FormEvent) => {
    e.preventDefault();
    setRepError('');
    setRepSuccess('');

    if (!resolvedTarget) {
      setRepError('Select or enter a registered username first.');
      return;
    }

    setRepBusy(true);
    try {
      const res = await api.addSecretProfileStats({
        targetUsername: resolvedTarget,
        addTradesCount: Number(addTradesCount) > 0 ? Number(addTradesCount) : undefined,
        ratingPct: Number(ratingPct) > 0 ? Number(ratingPct) : undefined,
        verified: verifiedToggle,
        avgReleaseMinutes: Number(avgReleaseMinutes) > 0 ? Number(avgReleaseMinutes) : undefined,
        addVolumeUsd: Number(addVolumeUsd) > 0 ? Number(addVolumeUsd) : undefined,
        tradeRecord: includeTradeRecord
          ? {
              asset: recAsset,
              side: recSide,
              cryptoAmount: Number(recCryptoAmt) || 0.05,
              fiatAmount: Number(recFiatAmt) || 500,
              fiat: recFiat,
              paymentMethod: recMethod,
              counterparty: recCounterparty || 'm***8',
            }
          : undefined,
        feedback: fbComment.trim()
          ? {
              author: fbAuthor.trim() || 'Victor7777',
              positive: fbPositive,
              asset: fbAsset,
              comment: fbComment.trim(),
            }
          : undefined,
      });
      onProfileUpdated?.(res.trader);
      setRepSuccess(
        `Updated @${res.trader.username}: ${res.trader.tradesCount} trades · ${res.trader.ratingPct}% trust`
      );
      loadDirectory();
    } catch (err) {
      setRepError(err instanceof Error ? err.message : 'Failed to update profile stats');
    } finally {
      setRepBusy(false);
    }
  };

  const handleRefreshLiveTables = () => {
    setTablesError('');
    setTablesStatus('');
    loadDirectory();
    loadTablesSummary(true);
    onDataSynced?.();
  };

  const handleExportTables = async () => {
    setTablesError('');
    setTablesStatus('');
    try {
      const snapshot = await api.exportTablesJson();
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `oosab-tables-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setTablesStatus('Downloaded JSON backup of all website tables.');
    } catch (err) {
      setTablesError(err instanceof Error ? err.message : 'Failed to export backup JSON.');
    }
  };

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setTablesError('');
    setTablesStatus('');
    setImportBusy(true);
    try {
      const rawText = await file.text();
      const parsed = JSON.parse(rawText);
      const res = await api.importTablesJson(parsed);
      setTablesStatus(
        `Restored ${res.importedUsers} account(s) and ${res.importedOffers} custom ad(s) into Cloud Firestore.`
      );
      loadDirectory();
      loadTablesSummary();
      onDataSynced?.();
    } catch (err) {
      setTablesError(err instanceof Error ? err.message : 'Invalid backup JSON file.');
    } finally {
      setImportBusy(false);
    }
  };

  const filteredTrades = useMemo(() => {
    const q = tradeSearch.trim().toLowerCase();
    return allTrades.filter((t) => {
      if (tradeStatusFilter === 'active') {
        if (t.status !== 'escrow_funded' && t.status !== 'payment_sent') return false;
      } else if (tradeStatusFilter !== 'all' && t.status !== tradeStatusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        t.id.toLowerCase().includes(q) ||
        t.buyerUsername.toLowerCase().includes(q) ||
        t.sellerUsername.toLowerCase().includes(q) ||
        t.crypto.toLowerCase().includes(q) ||
        t.fiat.toLowerCase().includes(q) ||
        t.paymentMethod.toLowerCase().includes(q)
      );
    });
  }, [allTrades, tradeSearch, tradeStatusFilter]);

  const selectedTrade = useMemo(
    () => allTrades.find((t) => t.id === selectedTradeId) ?? filteredTrades[0] ?? null,
    [allTrades, filteredTrades, selectedTradeId]
  );

  const selectedTradeMessages = useMemo(() => {
    if (!selectedTrade) return [];
    return enrichTradeMessages(selectedTradeRawMsgs, selectedTrade.lastReadAtBy, false, {
      buyerUsername: selectedTrade.buyerUsername,
      sellerUsername: selectedTrade.sellerUsername,
      isAdmin: true,
    });
  }, [selectedTrade, selectedTradeRawMsgs]);

  const activeTradesCount = useMemo(
    () =>
      allTrades.filter(
        (t) => t.status === 'escrow_funded' || t.status === 'payment_sent' || t.status === 'disputed'
      ).length,
    [allTrades]
  );

  const filteredSupportChats = useMemo(() => {
    const q = supportSearch.trim().toLowerCase();
    if (!q) return supportChats;
    return supportChats.filter(
      (c) =>
        c.id.toLowerCase().includes(q) ||
        (c.offerSummary ?? '').toLowerCase().includes(q) ||
        c.participants.some((p) => p.toLowerCase().includes(q))
    );
  }, [supportChats, supportSearch]);

  const selectedSupportChat = useMemo(
    () =>
      supportChats.find((c) => c.id === selectedSupportChatId) ?? filteredSupportChats[0] ?? null,
    [supportChats, filteredSupportChats, selectedSupportChatId]
  );

  const unreadSupportCount = useMemo(
    () =>
      supportChats.filter((c) => {
        const lastClientAt = c.lastReadAtBy?.lastVisitorMsgAt ?? '';
        const lastAdminRead = c.lastReadAtBy?.admin ?? '';
        return Boolean(lastClientAt && (!lastAdminRead || lastClientAt > lastAdminRead));
      }).length,
    [supportChats]
  );

  const handleAdminSendSupportReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedSupportChat || !supportReplyText.trim() || supportReplyBusy) return;
    setSupportReplyBusy(true);
    setSupportReplyError('');
    try {
      await api.adminSendSupportMessage(selectedSupportChat.id, supportReplyText.trim());
      setSupportReplyText('');
    } catch (err) {
      setSupportReplyError(err instanceof Error ? err.message : 'Unable to send support reply.');
    } finally {
      setSupportReplyBusy(false);
    }
  };

  const handleAdminTradeAction = async (
    action: 'fund_escrow' | 'mark_paid' | 'release' | 'cancel' | 'dispute' | 'reopen'
  ) => {
    if (!selectedTrade || tradeActionBusy) return;
    setTradeActionBusy(true);
    setTradeActionError('');
    setTradeActionMsg('');
    try {
      await api.adminTradeAction(selectedTrade.id, action);
      const labelMap = {
        fund_escrow: 'Marked escrow as funded.',
        mark_paid: 'Marked trade as payment sent.',
        release: 'Trade completed & crypto released.',
        cancel: 'Trade closed & cancelled (escrow refunded).',
        dispute: 'Trade frozen in dispute.',
        reopen: 'Trade reopened.',
      };
      setTradeActionMsg(labelMap[action]);
      onDataSynced?.();
    } catch (err) {
      setTradeActionError(err instanceof Error ? err.message : 'Admin trade action failed.');
    } finally {
      setTradeActionBusy(false);
    }
  };

  const handleAdminToggleImageHidden = async (msgId: string, currentlyHidden: boolean) => {
    if (!selectedTrade) return;
    setTradeActionError('');
    setTradeActionMsg('');
    try {
      await api.adminSetTradeMessageImageHidden(selectedTrade.id, msgId, !currentlyHidden);
      setTradeActionMsg(
        !currentlyHidden ? 'Picture hidden from regular users.' : 'Picture made visible to users.'
      );
      onDataSynced?.();
    } catch (err) {
      setTradeActionError(err instanceof Error ? err.message : 'Unable to update image visibility.');
    }
  };

  const handleAdminDeleteMessage = async (msgId: string) => {
    if (!selectedTrade) return;
    setTradeActionError('');
    setTradeActionMsg('');
    try {
      await api.adminDeleteTradeMessage(selectedTrade.id, msgId);
      setTradeActionMsg('Message removed from trade chat.');
      onDataSynced?.();
    } catch (err) {
      setTradeActionError(err instanceof Error ? err.message : 'Unable to remove message.');
    }
  };

  const handleAdminToggleSenderInvisible = async (
    hiddenRole: 'buyer' | 'seller',
    currentlyInvisible: boolean
  ) => {
    if (!selectedTrade || tradeActionBusy) return;
    setTradeActionBusy(true);
    setTradeActionError('');
    setTradeActionMsg('');
    const senderName =
      hiddenRole === 'buyer' ? selectedTrade.buyerUsername : selectedTrade.sellerUsername;
    const targetName =
      hiddenRole === 'buyer' ? selectedTrade.sellerUsername : selectedTrade.buyerUsername;
    try {
      await api.adminSetTradeSenderInvisible(selectedTrade.id, hiddenRole, !currentlyInvisible);
      setTradeActionMsg(
        !currentlyInvisible
          ? `Silenced ON: Old messages stay visible, but new messages from @${senderName} will NOT reach @${targetName}.`
          : `Silenced OFF: @${targetName} can now see new messages from @${senderName}.`
      );
      onDataSynced?.();
    } catch (err) {
      setTradeActionError(
        err instanceof Error ? err.message : 'Unable to update message invisibility.'
      );
    } finally {
      setTradeActionBusy(false);
    }
  };

  const handleAdminSelectImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setTradeActionError('');
    try {
      const dataUrl = await processChatImageFile(file);
      setAdminPendingImage(dataUrl);
    } catch (err) {
      setTradeActionError(err instanceof Error ? err.message : 'Failed to process image.');
    }
  };

  const handleAdminSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTrade || adminMsgBusy) return;
    if (!adminMsgText.trim() && !adminPendingImage) return;
    setAdminMsgBusy(true);
    setTradeActionError('');
    try {
      await api.adminSendTradeMessage(selectedTrade.id, adminMsgText, {
        asRole: adminMsgRole,
        isSystem: adminMsgRole === 'system',
        imageUrl: adminPendingImage ?? undefined,
      });
      setAdminMsgText('');
      setAdminPendingImage(null);
      onDataSynced?.();
    } catch (err) {
      setTradeActionError(err instanceof Error ? err.message : 'Failed to send admin message.');
    } finally {
      setAdminMsgBusy(false);
    }
  };

  const syncAfterAccountChange = (updated: AdminAccountDetails) => {
    hydrateAccountForm(updated);
    if (user && user.username.toLowerCase() === updated.username.toLowerCase()) {
      onUserUpdated(updated.user);
    }
    onProfileUpdated?.(updated.trader);
    loadDirectory();
    loadTablesSummary();
    onDataSynced?.();
  };

  const handleSaveAccountDetails = async (e: FormEvent) => {
    e.preventDefault();
    if (!acctDetails || acctBusy) return;
    setAcctBusy(true);
    setAcctError('');
    setAcctMsg('');
    try {
      const parsedBalances: Partial<Record<CryptoAsset, number>> = {};
      for (const coin of CRYPTO_ASSETS) {
        const val = Number(editBalances[coin.symbol]);
        if (Number.isFinite(val) && val >= 0) {
          parsedBalances[coin.symbol] = val;
        }
      }
      const updated = await api.adminUpdateAccount(acctDetails.username, {
        joinedAt: editJoinedAt.trim() || undefined,
        tradesCount: Number(editTradesCount),
        ratingPct: Number(editRatingPct),
        avgReleaseMinutes: Number(editAvgRelease),
        completionRatePct: Number(editCompletionPct),
        lastSeenMinutes: Number(editLastSeen),
        verified: editVerified,
        totalVolumeUsd: Number(editTotalVolUsd),
        volumeTier: editVolumeTier.trim() || undefined,
        totalFeedbackCount: Number(editFeedbackCount),
        bio: editBio,
        tagline: editTagline,
        location: editLocation,
        tradingHours: editTradingHours,
        balances: parsedBalances,
        clearWalletHistory: clearWalletHist,
        removeAvatar: stripAvatar,
        removeBanner: stripBanner,
      });
      syncAfterAccountChange(updated);
      setAcctMsg(`Saved account profile, creation date & balances for @${updated.username}.`);
    } catch (err) {
      setAcctError(err instanceof Error ? err.message : 'Failed to save account changes.');
    } finally {
      setAcctBusy(false);
    }
  };

  const handleZeroAllBalances = async () => {
    if (!acctDetails || acctBusy) return;
    setAcctBusy(true);
    setAcctError('');
    setAcctMsg('');
    try {
      const updated = await api.adminUpdateAccount(acctDetails.username, {
        balances: { BTC: 0, XMR: 0, ETH: 0, USDT: 0, LTC: 0, SOL: 0, USDC: 0 },
      });
      syncAfterAccountChange(updated);
      setAcctMsg(`Reset all wallet balances to 0 for @${updated.username}.`);
    } catch (err) {
      setAcctError(err instanceof Error ? err.message : 'Unable to reset balances.');
    } finally {
      setAcctBusy(false);
    }
  };

  const handleRemoveFeedbackItem = async (feedbackId: string) => {
    if (!acctDetails || acctBusy) return;
    setAcctBusy(true);
    setAcctError('');
    setAcctMsg('');
    try {
      const res = await api.adminRemoveFeedback(
        acctDetails.username,
        feedbackId,
        recalcOnReviewDelete
      );
      onProfileUpdated?.(res.trader);
      loadDirectory();
      loadSelectedAccountDetails(acctDetails.username, true);
      setAcctMsg('Removed review from account feedback.');
    } catch (err) {
      setAcctError(err instanceof Error ? err.message : 'Unable to remove feedback.');
    } finally {
      setAcctBusy(false);
    }
  };

  const handleRemoveWalletMessage = async (txId: string) => {
    if (!acctDetails || acctBusy) return;
    setAcctBusy(true);
    setAcctError('');
    setAcctMsg('');
    try {
      const updated = await api.adminRemoveWalletMessage(acctDetails.username, txId);
      syncAfterAccountChange(updated);
      setAcctMsg(`Removed saved message from @${updated.username}.`);
    } catch (err) {
      setAcctError(err instanceof Error ? err.message : 'Unable to remove saved message.');
    } finally {
      setAcctBusy(false);
    }
  };

  const handleUpdateWalletTxStatus = async (txId: string, nextStatus: WalletTxStatus) => {
    if (!acctDetails || acctBusy) return;
    setAcctBusy(true);
    setAcctError('');
    setAcctMsg('');
    try {
      const updated = await api.adminUpdateWalletTxStatus(
        acctDetails.username,
        txId,
        nextStatus,
        refundOnInvalidAddr
      );
      syncAfterAccountChange(updated);
      onDataSynced?.();
      setAcctMsg(`Updated transaction ${txId} status to "${nextStatus}" for @${updated.username}.`);
    } catch (err) {
      setAcctError(err instanceof Error ? err.message : 'Unable to update transaction status.');
    } finally {
      setAcctBusy(false);
    }
  };

  const handleUpdateWalletTxAddress = async (txId: string) => {
    if (!acctDetails || acctBusy) return;
    const tx = (acctDetails.user.walletHistory ?? []).find((item) => item.id === txId);
    const nextAddr = (txAddressDrafts[txId] ?? tx?.address ?? '').trim();
    if (!nextAddr || nextAddr.length < 10) {
      setAcctError('Enter a valid destination address (at least 10 characters).');
      return;
    }
    setAcctBusy(true);
    setAcctError('');
    setAcctMsg('');
    try {
      const updated = await api.adminUpdateWalletTxAddress(
        acctDetails.username,
        txId,
        nextAddr
      );
      syncAfterAccountChange(updated);
      onDataSynced?.();
      setAcctMsg(`Updated withdrawal address for ${txId} on @${updated.username}.`);
    } catch (err) {
      setAcctError(err instanceof Error ? err.message : 'Unable to update withdrawal address.');
    } finally {
      setAcctBusy(false);
    }
  };

  const handleClearAllFeedback = async () => {
    if (!acctDetails || acctBusy) return;
    setAcctBusy(true);
    setAcctError('');
    setAcctMsg('');
    try {
      const res = await api.adminClearAllFeedback(acctDetails.username, recalcOnReviewDelete);
      onProfileUpdated?.(res.trader);
      loadDirectory();
      loadSelectedAccountDetails(acctDetails.username, true);
      setAcctMsg(`Cleared all reviews & feedback for @${acctDetails.username}.`);
    } catch (err) {
      setAcctError(err instanceof Error ? err.message : 'Unable to clear feedback.');
    } finally {
      setAcctBusy(false);
    }
  };

  const handleAddCustomFeedback = async () => {
    if (!acctDetails || acctBusy) return;
    if (!newFbComment.trim()) {
      setAcctError('Enter a feedback comment to add.');
      return;
    }
    setAcctBusy(true);
    setAcctError('');
    setAcctMsg('');
    try {
      const res = await api.adminAddFeedback(acctDetails.username, {
        custom: {
          author: newFbAuthor.trim() || undefined,
          comment: newFbComment.trim(),
          positive: newFbPositive,
          asset: newFbAsset,
          date: newFbDate.trim() || 'Just now',
        },
        incrementTradesCount: genFbIncTrades,
        recalcRating: recalcOnReviewDelete,
      });
      setNewFbComment('');
      setNewFbAuthor('');
      onProfileUpdated?.(res.trader);
      loadDirectory();
      loadSelectedAccountDetails(acctDetails.username, true);
      setAcctMsg(`Added feedback comment to @${acctDetails.username}.`);
    } catch (err) {
      setAcctError(err instanceof Error ? err.message : 'Unable to add feedback comment.');
    } finally {
      setAcctBusy(false);
    }
  };

  const handleGenerateRandomFeedback = async (count: number) => {
    const target = acctDetails?.username || resolvedTarget;
    if (!target) return;
    const isAccountsTab = vaultTab === 'accounts';
    if (isAccountsTab) {
      if (acctBusy) return;
      setAcctBusy(true);
      setAcctError('');
      setAcctMsg('');
    } else {
      if (repBusy) return;
      setRepBusy(true);
      setRepError('');
      setRepSuccess('');
    }
    try {
      const res = await api.adminAddFeedback(target, {
        generateCount: count,
        asset: genFbAsset,
        positiveOnly: true,
        incrementTradesCount: genFbIncTrades,
        recalcRating: recalcOnReviewDelete,
      });
      onProfileUpdated?.(res.trader);
      loadDirectory();
      if (isAccountsTab) {
        loadSelectedAccountDetails(target, true);
        setAcctMsg(`Generated ${res.addedCount} random buyer review(s) on @${target}.`);
      } else {
        setRepSuccess(`Added ${res.addedCount} random buyer review(s) to @${res.trader.username}.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to generate reviews.';
      if (isAccountsTab) setAcctError(msg);
      else setRepError(msg);
    } finally {
      if (isAccountsTab) setAcctBusy(false);
      else setRepBusy(false);
    }
  };

  const handleRemoveTradeHistoryItem = async (recordId: string) => {
    if (!acctDetails || acctBusy) return;
    setAcctBusy(true);
    setAcctError('');
    setAcctMsg('');
    try {
      const res = await api.adminRemoveTradeHistoryEntry(
        acctDetails.username,
        recordId,
        decrementOnHistDelete
      );
      onProfileUpdated?.(res.trader);
      loadDirectory();
      loadSelectedAccountDetails(acctDetails.username, true);
      setAcctMsg('Removed trade history entry.');
    } catch (err) {
      setAcctError(err instanceof Error ? err.message : 'Unable to remove trade record.');
    } finally {
      setAcctBusy(false);
    }
  };

  const handleClearTradeHistory = async () => {
    if (!acctDetails || acctBusy) return;
    setAcctBusy(true);
    setAcctError('');
    setAcctMsg('');
    try {
      const res = await api.adminClearTradeHistory(acctDetails.username, decrementOnHistDelete);
      onProfileUpdated?.(res.trader);
      loadDirectory();
      loadSelectedAccountDetails(acctDetails.username, true);
      setAcctMsg(`Cleared trade history for @${acctDetails.username}.`);
    } catch (err) {
      setAcctError(err instanceof Error ? err.message : 'Unable to clear trade history.');
    } finally {
      setAcctBusy(false);
    }
  };

  const handleDeleteUserOffer = async (offerId: string) => {
    if (!acctDetails || acctBusy) return;
    setAcctBusy(true);
    setAcctError('');
    setAcctMsg('');
    try {
      await api.deleteOffer(offerId);
      loadSelectedAccountDetails(acctDetails.username, true);
      loadTablesSummary();
      onDataSynced?.();
      setAcctMsg(`Deleted ad ${offerId}.`);
    } catch (err) {
      setAcctError(err instanceof Error ? err.message : 'Unable to delete offer.');
    } finally {
      setAcctBusy(false);
    }
  };

  const handleRemoveAccount = async () => {
    if (!acctDetails || acctBusy) return;
    const victim = acctDetails.username;
    setAcctBusy(true);
    setAcctError('');
    setAcctMsg('');
    try {
      const res = await api.adminRemoveAccount(victim);
      setConfirmDeleteAccount(false);
      setAcctDetails(null);
      setTargetUsername((prev) =>
        prev.toLowerCase() === victim.toLowerCase()
          ? user && user.username.toLowerCase() !== victim.toLowerCase()
            ? user.username
            : ''
          : prev
      );
      loadDirectory();
      loadTablesSummary();
      onAccountRemoved?.(res.removedUsername, res.removedSelf);
      onDataSynced?.();
      setAcctMsg(
        `Removed account @${res.removedUsername} (${res.deletedOffers} ad${res.deletedOffers === 1 ? '' : 's'} deleted).`
      );
    } catch (err) {
      setAcctError(err instanceof Error ? err.message : 'Unable to remove account.');
    } finally {
      setAcctBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-xs sm:items-center sm:p-4">
      <div
        onMouseDown={unlockNotificationAudio}
        className={`relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-[#DCE2E1] bg-white p-5 shadow-2xl transition-all sm:rounded-2xl sm:p-6 dark:border-[#243230] dark:bg-[#121918] ${
          vaultTab === 'trades' || vaultTab === 'support'
            ? 'max-w-5xl'
            : vaultTab === 'accounts'
              ? 'max-w-4xl'
              : 'max-w-2xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B3B2E] text-[#7FE85B] dark:bg-[#183828]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold text-[#0E1715] dark:text-white">
                  Vault Admin Console
                </h2>
                <span className="rounded-md bg-[#E8F8EE] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#0B3B2E] dark:bg-[#152D21] dark:text-[#7FE85B]">
                  Instant
                </span>
              </div>
              <p className="text-xs text-[#5C6665] dark:text-[#8E9B98]">
                Manage balances, accounts, creation dates, reviews, live trades &amp; escrow chats
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                unlockNotificationAudio();
                setSupportSoundEnabled((prev) => {
                  const next = !prev;
                  if (next) playSupportChime();
                  return next;
                });
              }}
              title={
                supportSoundEnabled
                  ? 'Support alert sound is ON (click to mute)'
                  : 'Support alert sound is muted (click to enable & test chime)'
              }
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition-colors ${
                supportSoundEnabled
                  ? 'border-[#0B3B2E]/25 bg-[#EEF6F2] text-[#0B3B2E] hover:bg-[#E1F0E8] dark:border-[#7FE85B]/30 dark:bg-[#152D21] dark:text-[#7FE85B]'
                  : 'border-[#DCE2E1] bg-[#F8FAFA] text-[#5C6665] hover:text-[#0E1715] dark:border-[#263130] dark:bg-[#17201F] dark:text-[#8E9B98]'
              }`}
            >
              {supportSoundEnabled ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {supportSoundEnabled ? 'Sound On' : 'Muted'}
              </span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close vault menu"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5C6665] hover:bg-[#F2F5F5] hover:text-[#0E1715] dark:text-[#8E9B98] dark:hover:bg-[#1C2625] dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-xl border border-[#DCE2E1] bg-[#F4F6F6] p-1 sm:grid-cols-6 dark:border-[#24302F] dark:bg-[#0E1413]">
          <button
            type="button"
            onClick={() => setVaultTab('credit')}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
              vaultTab === 'credit'
                ? 'bg-white text-[#0E1715] shadow-xs dark:bg-[#1A2523] dark:text-[#7FE85B]'
                : 'text-[#5C6665] hover:text-[#0E1715] dark:text-[#8E9B98] dark:hover:text-white'
            }`}
          >
            <Wallet className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Credit Balance</span>
          </button>
          <button
            type="button"
            onClick={() => setVaultTab('reputation')}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
              vaultTab === 'reputation'
                ? 'bg-white text-[#0E1715] shadow-xs dark:bg-[#1A2523] dark:text-[#7FE85B]'
                : 'text-[#5C6665] hover:text-[#0E1715] dark:text-[#8E9B98] dark:hover:text-white'
            }`}
          >
            <Award className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Trades &amp; Feedback</span>
          </button>
          <button
            type="button"
            onClick={() => setVaultTab('accounts')}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
              vaultTab === 'accounts'
                ? 'bg-white text-[#0E1715] shadow-xs dark:bg-[#1A2523] dark:text-[#7FE85B]'
                : 'text-[#5C6665] hover:text-[#0E1715] dark:text-[#8E9B98] dark:hover:text-white'
            }`}
          >
            <UserCog className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Accounts &amp; Reviews</span>
          </button>
          <button
            type="button"
            onClick={() => setVaultTab('trades')}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
              vaultTab === 'trades'
                ? 'bg-white text-[#0E1715] shadow-xs dark:bg-[#1A2523] dark:text-[#7FE85B]'
                : 'text-[#5C6665] hover:text-[#0E1715] dark:text-[#8E9B98] dark:hover:text-white'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Live Trades</span>
            {allTrades.length > 0 && (
              <span className="rounded-md bg-[#0B3B2E] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#7FE85B] dark:bg-[#7FE85B] dark:text-[#082213]">
                {activeTradesCount > 0 ? activeTradesCount : allTrades.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setVaultTab('support')}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
              vaultTab === 'support'
                ? 'bg-white text-[#0E1715] shadow-xs dark:bg-[#1A2523] dark:text-[#7FE85B]'
                : unreadSupportCount > 0
                  ? 'bg-[#E8F8EE] text-[#0B3B2E] ring-1 ring-[#16A34A]/40 dark:bg-[#152D21] dark:text-[#7FE85B] dark:ring-[#7FE85B]/40'
                  : 'text-[#5C6665] hover:text-[#0E1715] dark:text-[#8E9B98] dark:hover:text-white'
            }`}
          >
            <Headphones className={`h-3.5 w-3.5 shrink-0 ${unreadSupportCount > 0 && vaultTab !== 'support' ? 'animate-pulse' : ''}`} />
            <span className="truncate">Support 24/7</span>
            {(unreadSupportCount > 0 || supportChats.length > 0) && (
              <span
                className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                  unreadSupportCount > 0
                    ? 'bg-emerald-600 text-white dark:bg-[#7FE85B] dark:text-[#082213]'
                    : 'bg-[#0B3B2E] text-[#7FE85B] dark:bg-[#1A3329] dark:text-[#7FE85B]'
                }`}
              >
                {unreadSupportCount > 0 ? unreadSupportCount : supportChats.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setVaultTab('tables')}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
              vaultTab === 'tables'
                ? 'bg-white text-[#0E1715] shadow-xs dark:bg-[#1A2523] dark:text-[#7FE85B]'
                : 'text-[#5C6665] hover:text-[#0E1715] dark:text-[#8E9B98] dark:hover:text-white'
            }`}
          >
            <Database className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Saved Tables</span>
          </button>
        </div>

        {/* Live Cross-Tab Incoming Support Notification Banner */}
        {supportAlert && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#16A34A]/40 bg-[#E8F8EE] px-4 py-3 shadow-sm dark:border-[#7FE85B]/40 dark:bg-[#132B20]">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0B3B2E] text-[#7FE85B] dark:bg-[#7FE85B] dark:text-[#082213]">
                <BellRing className="h-4 w-4 animate-bounce" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#0B3B2E] dark:text-[#7FE85B]">
                  <span>New 24/7 Support Message</span>
                  <span className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-[10px] text-[#0E1715] dark:bg-[#0B1712] dark:text-[#DCE8E4]">
                    {supportAlert.senderLabel}
                  </span>
                  <span className="font-mono text-[10px] font-medium opacity-75">
                    {new Date(supportAlert.receivedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-[#1D3B30] dark:text-[#D5EAE0]">
                  &ldquo;{supportAlert.preview}&rdquo;
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const targetChatId = supportAlert.chatId;
                  setSelectedSupportChatId(targetChatId);
                  setVaultTab('support');
                  setSupportAlert(null);
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#0B3B2E] px-3 text-xs font-bold text-[#7FE85B] hover:bg-[#082B21] dark:bg-[#7FE85B] dark:text-[#082213] dark:hover:bg-[#6EDB4A]"
              >
                <Headphones className="h-3.5 w-3.5" />
                <span>Open Support Chat</span>
              </button>
              <button
                type="button"
                onClick={() => setSupportAlert(null)}
                aria-label="Dismiss support notification"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#0B3B2E]/70 hover:bg-black/5 hover:text-[#0B3B2E] dark:text-[#98C5AF] dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Target Registered Account Picker */}
        {(vaultTab === 'credit' || vaultTab === 'reputation' || vaultTab === 'accounts') && (
        <div className="mt-4 rounded-xl border border-[#DCE2E1] bg-[#F8FAFA] p-3.5 dark:border-[#222E2C] dark:bg-[#0E1413]">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#1E2726] dark:text-[#DCE4E3]">
              <Users className="h-3.5 w-3.5 text-[#0B3B2E] dark:text-[#7FE85B]" />
              <span>Target Registered Account</span>
            </span>
            <span className="font-mono text-[11px] text-[#5C6665] dark:text-[#8E9B98]">
              {directory.length} account{directory.length === 1 ? '' : 's'} saved
            </span>
          </div>

          {directory.length === 0 && !user ? (
            <div className="rounded-lg border border-dashed border-[#DCE2E1] bg-white p-3 text-center text-xs text-[#5C6665] dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#8E9B98]">
              <ShieldAlert className="mx-auto mb-1.5 h-4 w-4 text-[#0B3B2E] dark:text-[#7FE85B]" />
              No registered user accounts yet.{' '}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequireAuth('register');
                }}
                className="font-semibold text-[#0B3B2E] underline dark:text-[#7FE85B]"
              >
                Register an account
              </button>{' '}
              first.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <select
                  value={targetUsername}
                  onChange={(e) => {
                    setTargetUsername(e.target.value);
                    setLastCredit(null);
                    setRepSuccess('');
                  }}
                  className="h-10 w-full rounded-lg border border-[#DCE2E1] bg-white px-3 text-xs font-semibold text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                >
                  {user && !directory.some((d) => d.username === user.username) && (
                    <option value={user.username}>@{user.username} (You)</option>
                  )}
                  {filteredDirectory.map((acc) => (
                    <option key={acc.username} value={acc.username}>
                      @{acc.username}
                      {user?.username === acc.username ? ' (You)' : ''} · {acc.tradesCount} trades
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Filter accounts by username..."
                  className="h-10 w-full rounded-lg border border-[#DCE2E1] bg-white px-3 text-xs text-[#0E1715] placeholder-[#7B8684] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                />
              </div>
              {activeTargetUser && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-[#5C6665] dark:text-[#8E9B98]">
                  <span>
                    Selected: <strong className="text-[#0E1715] dark:text-white">@{activeTargetUser.username}</strong>
                  </span>
                  <span>· Joined {activeTargetUser.joinedAt}</span>
                  <span>
                    · {formatCrypto(activeTargetUser.balances[selectedCrypto] ?? 0, selectedCrypto)}
                  </span>
                  <span>· {activeTargetUser.tradesCount} trades</span>
                  <span>· {activeTargetUser.ratingPct}% trust</span>
                  <span>· {activeTargetUser.feedbackCount} reviews</span>
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* TAB 1: Credit Crypto or Dollars */}
        {vaultTab === 'credit' && (
          <form onSubmit={handleSubmitCredit} className="mt-4 space-y-4">
            {/* Step 1: Choose Crypto Asset */}
            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <label className="font-semibold text-[#1E2726] dark:text-[#DCE4E3]">
                  Select Cryptocurrency
                </label>
                <span className="font-mono text-[#5C6665] dark:text-[#8E9B98]">
                  1 {selectedCrypto} = $
                  {spotUsd.toLocaleString('en-US', {
                    minimumFractionDigits: spotUsd < 10 ? 2 : 0,
                    maximumFractionDigits: spotUsd < 10 ? 4 : 2,
                  })}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {CRYPTO_ASSETS.map((coin) => {
                  const active = selectedCrypto === coin.symbol;
                  return (
                    <button
                      key={coin.symbol}
                      type="button"
                      onClick={() => {
                        setSelectedCrypto(coin.symbol);
                        setLastCredit(null);
                      }}
                      className={`flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${
                        active
                          ? 'border-[#0B3B2E] bg-[#EEF6F2] text-[#0B3B2E] dark:border-[#7FE85B] dark:bg-[#162C22] dark:text-[#7FE85B]'
                          : 'border-[#DCE2E1] bg-[#F8FAFA] text-[#394241] hover:bg-[#EFF3F2] dark:border-[#24302F] dark:bg-[#0E1413] dark:text-[#C8D2D0] dark:hover:bg-[#192322]'
                      }`}
                    >
                      <CoinIcon symbol={coin.symbol} size={18} />
                      <span>{coin.symbol}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Mode Switch (Dollars USD vs Crypto Amount) */}
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#DCE2E1] bg-[#F4F6F6] p-1 dark:border-[#24302F] dark:bg-[#0E1413]">
              <button
                type="button"
                onClick={() => {
                  if (inputMode !== 'usd') {
                    setInputMode('usd');
                    setAmountInput(calculated.usdAmount > 0 ? String(calculated.usdAmount) : '1000');
                    setLastCredit(null);
                  }
                }}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  inputMode === 'usd'
                    ? 'bg-white text-[#0E1715] shadow-xs dark:bg-[#1A2523] dark:text-[#7FE85B]'
                    : 'text-[#5C6665] hover:text-[#0E1715] dark:text-[#8E9B98] dark:hover:text-white'
                }`}
              >
                <DollarSign className="h-3.5 w-3.5" />
                <span>Dollars (USD)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (inputMode !== 'crypto') {
                    setInputMode('crypto');
                    setAmountInput(
                      calculated.cryptoAmount > 0 ? String(calculated.cryptoAmount) : '0.1'
                    );
                    setLastCredit(null);
                  }
                }}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  inputMode === 'crypto'
                    ? 'bg-white text-[#0E1715] shadow-xs dark:bg-[#1A2523] dark:text-[#7FE85B]'
                    : 'text-[#5C6665] hover:text-[#0E1715] dark:text-[#8E9B98] dark:hover:text-white'
                }`}
              >
                <Coins className="h-3.5 w-3.5" />
                <span>Crypto ({selectedCrypto})</span>
              </button>
            </div>

            {/* Step 3: Amount + Presets */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <label
                  htmlFor="secret-credit-amount"
                  className="font-semibold text-[#1E2726] dark:text-[#DCE4E3]"
                >
                  {inputMode === 'usd'
                    ? `Dollar Amount to Convert to ${selectedCrypto}`
                    : `${selectedCrypto} Amount to Credit`}
                </label>
                <span className="text-[#5C6665] dark:text-[#8E9B98]">
                  Current: {formatCrypto(currentBalance, selectedCrypto)}
                </span>
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm font-semibold text-[#5C6665] dark:text-[#8E9B98]">
                  {inputMode === 'usd' ? '$' : selectedCrypto}
                </span>
                <input
                  id="secret-credit-amount"
                  type="number"
                  step="any"
                  min="0"
                  value={amountInput}
                  onChange={(e) => {
                    setAmountInput(e.target.value);
                    setLastCredit(null);
                  }}
                  placeholder={inputMode === 'usd' ? '1000.00' : '0.25'}
                  className={`h-11 w-full rounded-xl border border-[#DCE2E1] bg-white pr-20 font-mono text-sm font-semibold text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#0E1413] dark:text-white dark:focus:border-[#7FE85B] ${
                    inputMode === 'usd' ? 'pl-8' : 'pl-16'
                  }`}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-[#5C6665] dark:text-[#8E9B98]">
                  {inputMode === 'usd' ? 'USD' : selectedCrypto}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {inputMode === 'usd'
                  ? USD_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setAmountInput(String(preset));
                          setLastCredit(null);
                        }}
                        className="rounded-lg border border-[#DCE2E1] bg-[#F8FAFA] px-2.5 py-1 font-mono text-xs font-medium text-[#1E2726] hover:border-[#0B3B2E] hover:bg-[#EEF6F2] dark:border-[#24302F] dark:bg-[#17201F] dark:text-[#DCE4E3] dark:hover:border-[#7FE85B]"
                      >
                        +${preset.toLocaleString('en-US')}
                      </button>
                    ))
                  : cryptoPresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setAmountInput(preset);
                          setLastCredit(null);
                        }}
                        className="rounded-lg border border-[#DCE2E1] bg-[#F8FAFA] px-2.5 py-1 font-mono text-xs font-medium text-[#1E2726] hover:border-[#0B3B2E] hover:bg-[#EEF6F2] dark:border-[#24302F] dark:bg-[#17201F] dark:text-[#DCE4E3] dark:hover:border-[#7FE85B]"
                      >
                        +{preset} {selectedCrypto}
                      </button>
                    ))}
              </div>
            </div>

            {/* Calculation Summary */}
            <div className="rounded-xl border border-[#DCE2E1] bg-[#F8FAFA] p-3.5 dark:border-[#222E2C] dark:bg-[#0E1413]">
              <div className="flex items-center justify-between text-xs text-[#5C6665] dark:text-[#8E9B98]">
                <span>Calculated Credit</span>
                <span className="font-mono font-semibold text-[#0D6832] dark:text-[#7FE85B]">
                  +{calculated.cryptoAmount.toLocaleString('en-US', { maximumFractionDigits: 8 })}{' '}
                  {selectedCrypto} (${calculated.usdAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                </span>
              </div>
              <div className="my-2 border-t border-[#E3E7E7] dark:border-[#202B2A]" />
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#1E2726] dark:text-[#DCE4E3]">
                  New {selectedCrypto} Balance (@{resolvedTarget || 'account'})
                </span>
                <span className="font-mono font-bold text-[#0E1715] dark:text-white">
                  {projectedBalance.toLocaleString('en-US', { maximumFractionDigits: 8 })}{' '}
                  {selectedCrypto} (≈ $
                  {projectedUsd.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  )
                </span>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </div>
            )}

            {lastCredit && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[#8CE89E] bg-[#EAFBF0] px-3.5 py-3 text-xs text-[#0B3B2E] dark:border-[#1E4D33] dark:bg-[#112A1D] dark:text-[#7FE85B]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>
                    Credited{' '}
                    <strong className="font-mono">
                      +{lastCredit.creditedCrypto.toLocaleString('en-US', { maximumFractionDigits: 8 })}{' '}
                      {lastCredit.crypto}
                    </strong>{' '}
                    to @{lastCredit.target}.
                  </span>
                </div>
                {user && lastCredit.target === user.username && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenWallet();
                    }}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#0B3B2E] px-2.5 py-1.5 font-semibold text-white hover:bg-[#135241] dark:bg-[#7FE85B] dark:text-[#082213]"
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    <span>Wallet</span>
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-xl border border-[#DCE2E1] px-4 text-sm font-semibold text-[#1E2726] hover:bg-[#F5F7F7] dark:border-[#263130] dark:text-[#DCE4E3] dark:hover:bg-[#1A2423]"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={submitting || calculated.cryptoAmount <= 0 || !resolvedTarget}
                className="h-10 rounded-xl bg-[#7FE85B] px-5 text-sm font-semibold text-[#082213] hover:bg-[#6AD845] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? 'Crediting...'
                  : `Credit +${calculated.cryptoAmount.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${selectedCrypto}`}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: Profile Trades & Feedback Injection */}
        {vaultTab === 'reputation' && (
          <form onSubmit={handleSubmitReputation} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
                  Add Trades
                </label>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  value={addTradesCount}
                  onChange={(e) => setAddTradesCount(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[#DCE2E1] bg-white px-2.5 font-mono text-xs font-semibold text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
                  Trust %
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={ratingPct}
                  onChange={(e) => setRatingPct(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[#DCE2E1] bg-white px-2.5 font-mono text-xs font-semibold text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
                  Release (min)
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={avgReleaseMinutes}
                  onChange={(e) => setAvgReleaseMinutes(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[#DCE2E1] bg-white px-2.5 font-mono text-xs font-semibold text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
                  +Volume USD
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 5000"
                  value={addVolumeUsd}
                  onChange={(e) => setAddVolumeUsd(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[#DCE2E1] bg-white px-2.5 font-mono text-xs font-semibold text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-[#DCE2E1] bg-[#F8FAFA] px-3.5 py-2.5 text-xs font-semibold text-[#1E2726] dark:border-[#222E2C] dark:bg-[#0E1413] dark:text-[#DCE4E3]">
              <span>Verified High-Volume Badge</span>
              <input
                type="checkbox"
                checked={verifiedToggle}
                onChange={(e) => setVerifiedToggle(e.target.checked)}
                className="h-4 w-4 accent-[#0B3B2E] dark:accent-[#7FE85B]"
              />
            </label>

            {/* Optional Completed Trade Record */}
            <div className="rounded-xl border border-[#DCE2E1] bg-[#F8FAFA] p-3.5 dark:border-[#222E2C] dark:bg-[#0E1413]">
              <label className="flex cursor-pointer items-center justify-between text-xs font-bold text-[#0E1715] dark:text-white">
                <span>Log Completed Trade Entry in History</span>
                <input
                  type="checkbox"
                  checked={includeTradeRecord}
                  onChange={(e) => setIncludeTradeRecord(e.target.checked)}
                  className="h-4 w-4 accent-[#0B3B2E] dark:accent-[#7FE85B]"
                />
              </label>

              {includeTradeRecord && (
                <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  <select
                    value={recSide}
                    onChange={(e) => setRecSide(e.target.value as 'Sold' | 'Bought')}
                    className="h-9 rounded-lg border border-[#DCE2E1] bg-white px-2.5 text-xs font-semibold text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                  >
                    <option value="Sold">Sold</option>
                    <option value="Bought">Bought</option>
                  </select>
                  <select
                    value={recAsset}
                    onChange={(e) => setRecAsset(e.target.value as CryptoAsset)}
                    className="h-9 rounded-lg border border-[#DCE2E1] bg-white px-2.5 text-xs font-semibold text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                  >
                    {CRYPTO_ASSETS.map((c) => (
                      <option key={c.symbol} value={c.symbol}>
                        {c.symbol}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="any"
                    value={recCryptoAmt}
                    onChange={(e) => setRecCryptoAmt(e.target.value)}
                    placeholder="Crypto amt"
                    className="h-9 rounded-lg border border-[#DCE2E1] bg-white px-2.5 font-mono text-xs text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                  />
                  <input
                    type="number"
                    step="any"
                    value={recFiatAmt}
                    onChange={(e) => setRecFiatAmt(e.target.value)}
                    placeholder="Fiat amt"
                    className="h-9 rounded-lg border border-[#DCE2E1] bg-white px-2.5 font-mono text-xs text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                  />
                  <select
                    value={recFiat}
                    onChange={(e) => setRecFiat(e.target.value as FiatCurrency)}
                    className="h-9 rounded-lg border border-[#DCE2E1] bg-white px-2.5 text-xs text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                  >
                    {FIAT_CURRENCIES.map((f) => (
                      <option key={f.code} value={f.code}>
                        {f.code}
                      </option>
                    ))}
                  </select>
                  <select
                    value={recMethod}
                    onChange={(e) => setRecMethod(e.target.value)}
                    className="h-9 rounded-lg border border-[#DCE2E1] bg-white px-2.5 text-xs text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                  >
                    {(
                      [
                        'Bank & Wire',
                        'Debit & Virtual Cards',
                        'Gift Cards',
                        'Online Wallets',
                        'Cash & In-Person',
                      ] as const
                    ).map((cat) => (
                      <optgroup key={cat} label={cat}>
                        {PAYMENT_METHODS.filter((pm) => pm.category === cat).map((pm) => (
                          <option key={pm.name} value={pm.name}>
                            {pm.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={recCounterparty}
                    onChange={(e) => setRecCounterparty(e.target.value)}
                    placeholder="Counterparty (e.g. m***8)"
                    className="col-span-2 h-9 rounded-lg border border-[#DCE2E1] bg-white px-2.5 text-xs text-[#0E1715] sm:col-span-3 dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                  />
                </div>
              )}
            </div>

            {/* Feedback Entry */}
            <div className="space-y-2.5 rounded-xl border border-[#DCE2E1] bg-[#F8FAFA] p-3.5 dark:border-[#222E2C] dark:bg-[#0E1413]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0E1715] dark:text-white">
                  <MessageSquarePlus className="h-3.5 w-3.5 text-[#0B3B2E] dark:text-[#7FE85B]" />
                  <span>Add Custom Feedback Review (optional)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={repBusy || !resolvedTarget}
                    onClick={() => handleGenerateRandomFeedback(5)}
                    className="h-7 rounded-lg border border-[#DCE2E1] bg-white px-2.5 text-[11px] font-semibold text-[#0E1715] hover:border-[#0B3B2E] disabled:opacity-50 dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                  >
                    +5 Random
                  </button>
                  <button
                    type="button"
                    disabled={repBusy || !resolvedTarget}
                    onClick={() => handleGenerateRandomFeedback(10)}
                    className="h-7 rounded-lg border border-[#DCE2E1] bg-white px-2.5 text-[11px] font-semibold text-[#0E1715] hover:border-[#0B3B2E] disabled:opacity-50 dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                  >
                    +10 Random
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input
                  type="text"
                  value={fbAuthor}
                  onChange={(e) => setFbAuthor(e.target.value)}
                  placeholder="Reviewer username"
                  className="h-9 rounded-lg border border-[#DCE2E1] bg-white px-2.5 text-xs text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                />
                <select
                  value={fbAsset}
                  onChange={(e) => setFbAsset(e.target.value as CryptoAsset)}
                  className="h-9 rounded-lg border border-[#DCE2E1] bg-white px-2.5 text-xs text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                >
                  {CRYPTO_ASSETS.map((c) => (
                    <option key={c.symbol} value={c.symbol}>
                      {c.symbol}
                    </option>
                  ))}
                </select>
                <select
                  value={fbPositive ? 'pos' : 'neg'}
                  onChange={(e) => setFbPositive(e.target.value === 'pos')}
                  className="h-9 rounded-lg border border-[#DCE2E1] bg-white px-2.5 text-xs font-semibold text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                >
                  <option value="pos">Positive Review</option>
                  <option value="neg">Negative Review</option>
                </select>
              </div>
              <textarea
                rows={2}
                value={fbComment}
                onChange={(e) => setFbComment(e.target.value)}
                placeholder="Write a review comment (leave blank to skip adding feedback)..."
                className="w-full rounded-lg border border-[#DCE2E1] bg-white p-2.5 text-xs text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
              />
            </div>

            {repError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {repError}
              </div>
            )}

            {repSuccess && (
              <div className="flex items-center gap-2 rounded-xl border border-[#8CE89E] bg-[#EAFBF0] px-3.5 py-3 text-xs font-semibold text-[#0B3B2E] dark:border-[#1E4D33] dark:bg-[#112A1D] dark:text-[#7FE85B]">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{repSuccess}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-xl border border-[#DCE2E1] px-4 text-sm font-semibold text-[#1E2726] hover:bg-[#F5F7F7] dark:border-[#263130] dark:text-[#DCE4E3] dark:hover:bg-[#1A2423]"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={repBusy || !resolvedTarget}
                className="h-10 rounded-xl bg-[#7FE85B] px-5 text-sm font-semibold text-[#082213] hover:bg-[#6AD845] disabled:opacity-50"
              >
                {repBusy ? 'Applying...' : `Apply to @${resolvedTarget || 'profile'}`}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: Account Manager, Creation Date, Balances & Review Removal */}
        {vaultTab === 'accounts' && (
          <div className="mt-4 space-y-4">
            {(() => {
              const accountsWithMessages = directory.filter(
                (d) => (d.walletMessages?.length ?? 0) > 0
              );
              if (accountsWithMessages.length === 0) return null;
              return (
                <div className="rounded-xl border border-[#DCE2E1] bg-[#F8FAFA] p-3.5 dark:border-[#222E2C] dark:bg-[#0E1413]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#0E1715] dark:text-white">
                      <MessageSquare className="h-3.5 w-3.5 text-[#0B3B2E] dark:text-[#7FE85B]" />
                      <span>
                        Saved User Messages / message1 ({accountsWithMessages.reduce((s, a) => s + (a.walletMessages?.length ?? 0), 0)})
                      </span>
                    </div>
                    <span className="text-[11px] text-[#5C6665] dark:text-[#8E9B98]">
                      Click an account to inspect
                    </span>
                  </div>
                  <div className="mt-2.5 space-y-1.5">
                    {accountsWithMessages.map((acc) => {
                      const latest = acc.walletMessages![0];
                      const isSelected = targetUsername.toLowerCase() === acc.username.toLowerCase();
                      return (
                        <button
                          key={acc.username}
                          type="button"
                          onClick={() => setTargetUsername(acc.username)}
                          className={`flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                            isSelected
                              ? 'border-[#0B3B2E] bg-[#EEF6F2] dark:border-[#7FE85B] dark:bg-[#152B20]'
                              : 'border-[#DCE2E1] bg-white hover:bg-[#F3F6F6] dark:border-[#263130] dark:bg-[#131A1A] dark:hover:bg-[#1A2423]'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-mono font-bold text-[#0E1715] dark:text-white">
                                @{acc.username}
                              </span>
                              <span className="rounded bg-[#0B3B2E] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#7FE85B] dark:bg-[#7FE85B] dark:text-[#082213]">
                                {acc.walletMessages!.length} msg{acc.walletMessages!.length === 1 ? '' : 's'}
                              </span>
                              <span className="font-mono text-[10px] text-[#64706E] dark:text-[#8E9B98]">
                                {latest.crypto} · {latest.network}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-[11px] text-[#394241] dark:text-[#DCE4E3]">
                              {latest.message}
                            </p>
                          </div>
                          <span className="shrink-0 font-mono text-[10px] text-[#64706E] dark:text-[#8E9B98]">
                            {new Date(latest.timestamp).toLocaleDateString()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            {acctError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {acctError}
              </div>
            )}
            {acctMsg && (
              <div className="flex items-center gap-2 rounded-xl border border-[#8CE89E] bg-[#EAFBF0] px-3.5 py-2.5 text-xs font-semibold text-[#0B3B2E] dark:border-[#1E4D33] dark:bg-[#112A1D] dark:text-[#7FE85B]">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{acctMsg}</span>
              </div>
            )}

            {acctLoading ? (
              <div className="rounded-xl border border-dashed border-[#DCE2E1] bg-[#F8FAFA] p-6 text-center text-xs text-[#5C6665] dark:border-[#24302F] dark:bg-[#0E1413] dark:text-[#8E9B98]">
                Loading account profile, reviews &amp; history...
              </div>
            ) : !acctDetails ? (
              <div className="rounded-xl border border-dashed border-[#DCE2E1] bg-[#F8FAFA] p-6 text-center text-xs text-[#5C6665] dark:border-[#24302F] dark:bg-[#0E1413] dark:text-[#8E9B98]">
                Select a registered account above to edit its creation date, balances, reviews, or remove the account.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Section A: Creation Date, Stats & Profile Details */}
                <form
                  onSubmit={handleSaveAccountDetails}
                  className="space-y-4 rounded-xl border border-[#DCE2E1] bg-[#F8FAFA] p-4 dark:border-[#222E2C] dark:bg-[#0E1413]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E3E7E7] pb-2.5 dark:border-[#202B2A]">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-[#0B3B2E] dark:text-[#7FE85B]" />
                      <span className="text-xs font-bold text-[#0E1715] dark:text-white">
                        Creation Date, Stats &amp; Profile (@{acctDetails.username})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {onNavigateProfile && (
                        <button
                          type="button"
                          onClick={() => onNavigateProfile(acctDetails.username)}
                          className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#DCE2E1] bg-white px-2.5 text-[11px] font-semibold text-[#1E2726] hover:bg-[#F2F5F5] dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#DCE4E3]"
                        >
                          <span>View /{acctDetails.username}</span>
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => loadSelectedAccountDetails(acctDetails.username)}
                        className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#DCE2E1] bg-white px-2.5 text-[11px] font-semibold text-[#1E2726] hover:bg-[#F2F5F5] dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#DCE4E3]"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>Reload</span>
                      </button>
                    </div>
                  </div>

                  {/* Account Creation / Join Date */}
                  <div className="rounded-xl border border-[#DCE2E1] bg-white p-3 dark:border-[#24302F] dark:bg-[#131A1A]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-xs font-bold text-[#0E1715] dark:text-white">
                        Account Creation / Joined Date (Public &ldquo;Joined&rdquo; Date)
                      </label>
                      <span className="font-mono text-[10px] text-[#5C6665] dark:text-[#8E9B98]">
                        UID: {acctDetails.uid} · Registered: {acctDetails.createdAt.slice(0, 10)}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        type="date"
                        value={/^\d{4}-\d{2}-\d{2}$/.test(editJoinedAt.trim()) ? editJoinedAt.trim() : ''}
                        onChange={(e) => {
                          if (e.target.value) setEditJoinedAt(e.target.value);
                        }}
                        className="h-9 rounded-lg border border-[#DCE2E1] bg-[#F8FAFA] px-2.5 font-mono text-xs font-semibold text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                      />
                      <input
                        type="text"
                        maxLength={32}
                        value={editJoinedAt}
                        onChange={(e) => setEditJoinedAt(e.target.value)}
                        placeholder="e.g. 2021-04-12 or Mar 2020"
                        className="h-9 rounded-lg border border-[#DCE2E1] bg-white px-2.5 font-mono text-xs font-semibold text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[
                        { label: 'Today', val: shiftIsoDate(0) },
                        { label: '-6 months', val: shiftIsoDate(6) },
                        { label: '-1 year', val: shiftIsoDate(12) },
                        { label: '-2 years', val: shiftIsoDate(24) },
                        { label: '-3 years', val: shiftIsoDate(36) },
                        { label: '2020-05-01', val: '2020-05-01' },
                      ].map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setEditJoinedAt(p.val)}
                          className="rounded-md border border-[#DCE2E1] bg-[#F8FAFA] px-2 py-1 font-mono text-[10px] font-semibold text-[#1E2726] hover:border-[#0B3B2E] hover:bg-[#EEF6F2] dark:border-[#24302F] dark:bg-[#17201F] dark:text-[#DCE4E3] dark:hover:border-[#7FE85B]"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Direct Stats Override */}
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#394241] dark:text-[#C5D1CF]">
                        Total Trades
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editTradesCount}
                        onChange={(e) => setEditTradesCount(e.target.value)}
                        className="h-9 w-full rounded-lg border border-[#DCE2E1] bg-white px-2.5 font-mono text-xs font-semibold text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#394241] dark:text-[#C5D1CF]">
                        Trust Score %
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editRatingPct}
                        onChange={(e) => setEditRatingPct(e.target.value)}
                        className="h-9 w-full rounded-lg border border-[#DCE2E1] bg-white px-2.5 font-mono text-xs font-semibold text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#394241] dark:text-[#C5D1CF]">
                        Avg Release (min)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editAvgRelease}
                        onChange={(e) => setEditAvgRelease(e.target.value)}
                        className="h-9 w-full rounded-lg border border-[#DCE2E1] bg-white px-2.5 font-mono text-xs font-semibold text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#394241] dark:text-[#C5D1CF]">
                        Completion %
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={editCompletionPct}
                        onChange={(e) => setEditCompletionPct(e.target.value)}
                        className="h-9 w-full rounded-lg border border-[#DCE2E1] bg-white px-2.5 font-mono text-xs font-semibold text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#394241] dark:text-[#C5D1CF]">
                        Last Seen (min, 0=Now)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editLastSeen}
                        onChange={(e) => setEditLastSeen(e.target.value)}
                        className="h-9 w-full rounded-lg border border-[#DCE2E1] bg-white px-2.5 font-mono text-xs font-semibold text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#394241] dark:text-[#C5D1CF]">
                        Total Volume (USD)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={editTotalVolUsd}
                        onChange={(e) => setEditTotalVolUsd(e.target.value)}
                        className="h-9 w-full rounded-lg border border-[#DCE2E1] bg-white px-2.5 font-mono text-xs font-semibold text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#394241] dark:text-[#C5D1CF]">
                        Volume Tier
                      </label>
                      <input
                        type="text"
                        maxLength={40}
                        value={editVolumeTier}
                        onChange={(e) => setEditVolumeTier(e.target.value)}
                        className="h-9 w-full rounded-lg border border-[#DCE2E1] bg-white px-2.5 text-xs font-semibold text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#394241] dark:text-[#C5D1CF]">
                        Feedback Count
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editFeedbackCount}
                        onChange={(e) => setEditFeedbackCount(e.target.value)}
                        className="h-9 w-full rounded-lg border border-[#DCE2E1] bg-white px-2.5 font-mono text-xs font-semibold text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Profile Metadata */}
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#394241] dark:text-[#C5D1CF]">
                        Tagline
                      </label>
                      <input
                        type="text"
                        maxLength={90}
                        value={editTagline}
                        onChange={(e) => setEditTagline(e.target.value)}
                        placeholder="Headline (optional)"
                        className="h-9 w-full rounded-lg border border-[#DCE2E1] bg-white px-2.5 text-xs text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#394241] dark:text-[#C5D1CF]">
                        Location
                      </label>
                      <input
                        type="text"
                        maxLength={60}
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        placeholder="e.g. Zurich, CH"
                        className="h-9 w-full rounded-lg border border-[#DCE2E1] bg-white px-2.5 text-xs text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#394241] dark:text-[#C5D1CF]">
                        Trading Hours
                      </label>
                      <input
                        type="text"
                        maxLength={60}
                        value={editTradingHours}
                        onChange={(e) => setEditTradingHours(e.target.value)}
                        placeholder="e.g. 24/7 UTC"
                        className="h-9 w-full rounded-lg border border-[#DCE2E1] bg-white px-2.5 text-xs text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#394241] dark:text-[#C5D1CF]">
                      Account Bio
                    </label>
                    <textarea
                      rows={2}
                      maxLength={320}
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      className="w-full rounded-lg border border-[#DCE2E1] bg-white p-2.5 text-xs text-[#0E1715] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                    />
                  </div>

                  {/* Toggles & Cleanup Options */}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-[#DCE2E1] bg-white px-3 py-2 text-xs font-semibold text-[#1E2726] dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#DCE4E3]">
                      <span>Verified High-Volume Badge</span>
                      <input
                        type="checkbox"
                        checked={editVerified}
                        onChange={(e) => setEditVerified(e.target.checked)}
                        className="h-4 w-4 accent-[#0B3B2E] dark:accent-[#7FE85B]"
                      />
                    </label>
                    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-[#DCE2E1] bg-white px-3 py-2 text-xs font-semibold text-[#1E2726] dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#DCE4E3]">
                      <span>Clear Wallet Tx History ({acctDetails.user.walletHistory.length})</span>
                      <input
                        type="checkbox"
                        checked={clearWalletHist}
                        onChange={(e) => setClearWalletHist(e.target.checked)}
                        className="h-4 w-4 accent-[#0B3B2E] dark:accent-[#7FE85B]"
                      />
                    </label>
                    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-[#DCE2E1] bg-white px-3 py-2 text-xs font-semibold text-[#1E2726] dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#DCE4E3]">
                      <span>Remove Profile Avatar</span>
                      <input
                        type="checkbox"
                        checked={stripAvatar}
                        onChange={(e) => setStripAvatar(e.target.checked)}
                        className="h-4 w-4 accent-[#0B3B2E] dark:accent-[#7FE85B]"
                      />
                    </label>
                    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-[#DCE2E1] bg-white px-3 py-2 text-xs font-semibold text-[#1E2726] dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#DCE4E3]">
                      <span>Remove Cover Banner</span>
                      <input
                        type="checkbox"
                        checked={stripBanner}
                        onChange={(e) => setStripBanner(e.target.checked)}
                        className="h-4 w-4 accent-[#0B3B2E] dark:accent-[#7FE85B]"
                      />
                    </label>
                  </div>

                  {/* Wallet Balances Editor */}
                  <div className="rounded-xl border border-[#DCE2E1] bg-white p-3 dark:border-[#24302F] dark:bg-[#131A1A]">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#0E1715] dark:text-white">
                        Wallet Balances (Set Exact or Reset)
                      </span>
                      <button
                        type="button"
                        disabled={acctBusy}
                        onClick={handleZeroAllBalances}
                        className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
                      >
                        Zero All Balances
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                      {CRYPTO_ASSETS.map((coin) => (
                        <div key={coin.symbol}>
                          <label className="mb-1 flex items-center gap-1 text-[10px] font-bold text-[#5C6665] dark:text-[#98A4A2]">
                            <CoinIcon symbol={coin.symbol} size={12} />
                            <span>{coin.symbol}</span>
                          </label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={editBalances[coin.symbol]}
                            onChange={(e) =>
                              setEditBalances((prev) => ({
                                ...prev,
                                [coin.symbol]: e.target.value,
                              }))
                            }
                            className="h-8 w-full rounded-lg border border-[#DCE2E1] bg-[#F8FAFA] px-2 font-mono text-[11px] font-semibold text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={acctBusy}
                      className="h-9 rounded-xl bg-[#7FE85B] px-5 text-xs font-bold text-[#082213] hover:bg-[#6AD845] disabled:opacity-50"
                    >
                      {acctBusy ? 'Saving...' : `Save Account Changes (@${acctDetails.username})`}
                    </button>
                  </div>
                </form>

                {/* Saved Deposit Messages on Selected Account */}
                {(() => {
                  const accountMessages = (acctDetails.user.walletHistory ?? []).filter(
                    (tx) => typeof tx.message === 'string' && tx.message.trim().length > 0
                  );
                  return (
                    <div className="space-y-2.5 rounded-xl border border-[#DCE2E1] bg-[#F8FAFA] p-4 dark:border-[#222E2C] dark:bg-[#0E1413]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="h-4 w-4 text-[#0B3B2E] dark:text-[#7FE85B]" />
                          <h3 className="text-xs font-bold text-[#0E1715] dark:text-white">
                            message1 &amp; Profile Messages ({accountMessages.length})
                          </h3>
                        </div>
                        <span className="font-mono text-[10px] text-[#64706E] dark:text-[#8E9B98]">
                          @{acctDetails.username}
                        </span>
                      </div>

                      {accountMessages.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-[#DCE2E1] bg-white p-3 text-center text-xs text-[#5C6665] dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#8E9B98]">
                          No deposit messages saved by @{acctDetails.username}.
                        </div>
                      ) : (
                        <div className="max-h-56 divide-y divide-[#ECEFEF] overflow-y-auto rounded-xl border border-[#DCE2E1] bg-white dark:divide-[#202B2A] dark:border-[#263130] dark:bg-[#131A1A]">
                          {accountMessages.map((tx) => (
                            <div
                              key={tx.id}
                              className="flex items-start justify-between gap-3 px-3.5 py-2.5 text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="whitespace-pre-wrap break-words text-[#0E1715] dark:text-[#EAF0EF]">
                                  {tx.message}
                                </p>
                                <p className="mt-1 font-mono text-[10px] text-[#64706E] dark:text-[#8E9B98]">
                                  {tx.crypto} · {tx.network} · {new Date(tx.timestamp).toLocaleString()} · {tx.id}
                                </p>
                              </div>
                              <button
                                type="button"
                                disabled={acctBusy}
                                onClick={() => handleRemoveWalletMessage(tx.id)}
                                className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-red-200 bg-white px-2 text-[10px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:bg-[#1A2020] dark:text-red-400 dark:hover:bg-red-950/40"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Remove</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Withdrawals & Wallet History Status Controls */}
                {(() => {
                  const ledgerTxs = (acctDetails.user.walletHistory ?? []).filter(
                    (tx) => tx.amount > 0 || tx.type === 'withdrawal'
                  );
                  return (
                    <div className="space-y-2.5 rounded-xl border border-[#DCE2E1] bg-[#F8FAFA] p-4 dark:border-[#222E2C] dark:bg-[#0E1413]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Coins className="h-4 w-4 text-[#0B3B2E] dark:text-[#7FE85B]" />
                            <h3 className="text-xs font-bold text-[#0E1715] dark:text-white">
                              Withdrawals &amp; Wallet Transactions ({ledgerTxs.length})
                            </h3>
                          </div>
                          <p className="text-[11px] text-[#5C6665] dark:text-[#8E9B98]">
                            Set withdrawal status to Pending, Withdrawn Successfully, or Invalid Address
                          </p>
                        </div>
                        <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-[#394241] dark:text-[#C5D1CF]">
                          <input
                            type="checkbox"
                            checked={refundOnInvalidAddr}
                            onChange={(e) => setRefundOnInvalidAddr(e.target.checked)}
                            className="h-3.5 w-3.5 accent-[#0B3B2E] dark:accent-[#7FE85B]"
                          />
                          <span>Auto-refund balance on Invalid Address</span>
                        </label>
                      </div>

                      {ledgerTxs.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-[#DCE2E1] bg-white p-3 text-center text-xs text-[#5C6665] dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#8E9B98]">
                          No withdrawals or transfers recorded for @{acctDetails.username} yet.
                        </div>
                      ) : (
                        <div className="max-h-96 divide-y divide-[#ECEFEF] overflow-y-auto rounded-xl border border-[#DCE2E1] bg-white dark:divide-[#202B2A] dark:border-[#263130] dark:bg-[#131A1A]">
                          {ledgerTxs.map((tx) => {
                            const statusBadgeClass =
                              tx.status === 'Pending'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : tx.status === 'Invalid Address'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                  : 'bg-[#E8F8EE] text-[#0D6832] dark:bg-[#152D21] dark:text-[#7FE85B]';
                            const addrDraft = txAddressDrafts[tx.id] ?? tx.address;
                            const addrChanged = addrDraft.trim() !== tx.address;
                            return (
                              <div
                                key={tx.id}
                                className="space-y-2 px-3.5 py-3 text-xs"
                              >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="min-w-0 flex-1 space-y-0.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-mono font-bold text-[#0E1715] dark:text-white">
                                        {tx.type === 'withdrawal' ? '-' : '+'}
                                        {formatCrypto(tx.amount, tx.crypto)}
                                      </span>
                                      <span className="text-[11px] font-semibold uppercase text-[#5C6665] dark:text-[#8E9B98]">
                                        {tx.type} · {tx.network}
                                      </span>
                                      <span
                                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${statusBadgeClass}`}
                                      >
                                        {tx.status}
                                        {tx.refunded ? ' · Refunded' : ''}
                                      </span>
                                    </div>
                                    <p className="font-mono text-[10px] text-[#7B8684]">
                                      {tx.id} · {new Date(tx.timestamp).toLocaleString()}
                                    </p>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                    {(
                                      [
                                        'Pending',
                                        'Withdrawn Successfully',
                                        'Invalid Address',
                                      ] as WalletTxStatus[]
                                    ).map((st) => {
                                      const active = tx.status === st;
                                      return (
                                        <button
                                          key={st}
                                          type="button"
                                          disabled={acctBusy || active}
                                          onClick={() => handleUpdateWalletTxStatus(tx.id, st)}
                                          className={`h-7 rounded-md border px-2 text-[10px] font-semibold transition-colors disabled:opacity-60 ${
                                            active
                                              ? st === 'Invalid Address'
                                                ? 'border-red-500 bg-red-600 text-white'
                                                : st === 'Pending'
                                                  ? 'border-amber-500 bg-amber-500 text-white'
                                                  : 'border-[#0B3B2E] bg-[#0B3B2E] text-[#7FE85B]'
                                              : 'border-[#DCE2E1] bg-white text-[#1E2726] hover:bg-[#F3F5F5] dark:border-[#263130] dark:bg-[#192322] dark:text-[#DCE4E3] dark:hover:bg-[#222F2E]'
                                          }`}
                                        >
                                          {st}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {tx.type === 'withdrawal' && tx.status === 'Pending' ? (
                                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                    <input
                                      type="text"
                                      value={addrDraft}
                                      onChange={(e) =>
                                        setTxAddressDrafts((prev) => ({
                                          ...prev,
                                          [tx.id]: e.target.value,
                                        }))
                                      }
                                      placeholder="Corrected destination address (admin only)"
                                      className="h-8 min-w-[220px] flex-1 rounded-lg border border-[#DCE2E1] bg-[#F8FAFA] px-2.5 font-mono text-[11px] text-[#0E1715] focus:border-[#0B3B2E] focus:bg-white focus:outline-none dark:border-[#263130] dark:bg-[#0E1413] dark:text-white"
                                    />
                                    <button
                                      type="button"
                                      disabled={acctBusy || !addrChanged || addrDraft.trim().length < 10}
                                      onClick={() => handleUpdateWalletTxAddress(tx.id)}
                                      className="h-8 rounded-lg bg-[#0B3B2E] px-3 text-[11px] font-semibold text-[#7FE85B] hover:bg-[#082B21] disabled:opacity-45 dark:bg-[#7FE85B] dark:text-[#082213]"
                                    >
                                      Save Address
                                    </button>
                                  </div>
                                ) : (
                                  <p className="break-all font-mono text-[10px] text-[#5C6665] dark:text-[#8E9B98]">
                                    Addr: {tx.address}
                                    {tx.type === 'withdrawal' && (
                                      <span className="ml-2 text-[#7B8684]">
                                        (Permanent · switch to Pending to edit)
                                      </span>
                                    )}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Section B: Reviews & Feedback Moderation (Add, Generate Random, Remove) */}
                <div className="space-y-3 rounded-xl border border-[#DCE2E1] bg-[#F8FAFA] p-4 dark:border-[#222E2C] dark:bg-[#0E1413]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-[#0E1715] dark:text-white">
                        Reviews &amp; Feedback ({acctDetails.trader.recentFeedback.length})
                      </h3>
                      <p className="text-[11px] text-[#5C6665] dark:text-[#8E9B98]">
                        Add custom comments, generate 5 or 10 random buyer reviews, or remove existing reviews on @{acctDetails.username}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-[#394241] dark:text-[#C5D1CF]">
                        <input
                          type="checkbox"
                          checked={recalcOnReviewDelete}
                          onChange={(e) => setRecalcOnReviewDelete(e.target.checked)}
                          className="h-3.5 w-3.5 accent-[#0B3B2E] dark:accent-[#7FE85B]"
                        />
                        <span>Recalculate Trust %</span>
                      </label>
                      {acctDetails.trader.recentFeedback.length > 0 && (
                        <button
                          type="button"
                          disabled={acctBusy}
                          onClick={handleClearAllFeedback}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2.5 text-[11px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Remove All Reviews</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quick Add Feedback Comment + Random Batch Generator */}
                  <div className="space-y-2.5 rounded-xl border border-[#DCE2E1] bg-white p-3 dark:border-[#263130] dark:bg-[#131A1A]">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ECEFEF] pb-2.5 dark:border-[#202B2A]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-[#0E1715] dark:text-white">
                          Quick Random Reviews:
                        </span>
                        <select
                          value={genFbAsset}
                          onChange={(e) => setGenFbAsset(e.target.value as CryptoAsset | 'MIXED')}
                          aria-label="Random review asset"
                          className="h-7 rounded-lg border border-[#DCE2E1] bg-[#F8FAFA] px-2 text-[11px] font-semibold text-[#0E1715] dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                        >
                          <option value="MIXED">Mixed Coins</option>
                          {CRYPTO_ASSETS.map((c) => (
                            <option key={c.symbol} value={c.symbol}>
                              {c.symbol} only
                            </option>
                          ))}
                        </select>
                        <label className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-[#5C6665] dark:text-[#98A4A2]">
                          <input
                            type="checkbox"
                            checked={genFbIncTrades}
                            onChange={(e) => setGenFbIncTrades(e.target.checked)}
                            className="h-3 w-3 accent-[#0B3B2E] dark:accent-[#7FE85B]"
                          />
                          <span>Also +1 trade count each</span>
                        </label>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          disabled={acctBusy}
                          onClick={() => handleGenerateRandomFeedback(1)}
                          className="h-7 rounded-lg border border-[#DCE2E1] bg-[#F8FAFA] px-2.5 text-[11px] font-semibold text-[#0E1715] hover:border-[#0B3B2E] disabled:opacity-50 dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                        >
                          +1 Random
                        </button>
                        <button
                          type="button"
                          disabled={acctBusy}
                          onClick={() => handleGenerateRandomFeedback(5)}
                          className="h-7 rounded-lg border border-[#8CE89E] bg-[#EAFBF0] px-2.5 text-[11px] font-bold text-[#0B3B2E] hover:bg-[#D7F7E2] disabled:opacity-50 dark:border-[#1E4D33] dark:bg-[#112A1D] dark:text-[#7FE85B]"
                        >
                          +5 Random
                        </button>
                        <button
                          type="button"
                          disabled={acctBusy}
                          onClick={() => handleGenerateRandomFeedback(10)}
                          className="h-7 rounded-lg bg-[#7FE85B] px-2.5 text-[11px] font-bold text-[#082213] hover:bg-[#6AD845] disabled:opacity-50"
                        >
                          +10 Random
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                      <input
                        type="text"
                        value={newFbComment}
                        onChange={(e) => setNewFbComment(e.target.value)}
                        placeholder="Add custom feedback comment (e.g. Fast Zelle trade, thanks!)"
                        className="h-8 rounded-lg border border-[#DCE2E1] bg-[#F8FAFA] px-2.5 text-xs text-[#0E1715] sm:col-span-5 dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                      />
                      <input
                        type="text"
                        value={newFbAuthor}
                        onChange={(e) => setNewFbAuthor(e.target.value)}
                        placeholder="Buyer name (blank = random)"
                        className="h-8 rounded-lg border border-[#DCE2E1] bg-[#F8FAFA] px-2.5 text-xs text-[#0E1715] sm:col-span-3 dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                      />
                      <select
                        value={newFbAsset}
                        onChange={(e) => setNewFbAsset(e.target.value as CryptoAsset)}
                        aria-label="Feedback asset"
                        className="h-8 rounded-lg border border-[#DCE2E1] bg-[#F8FAFA] px-2 text-xs text-[#0E1715] sm:col-span-1 dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                      >
                        {CRYPTO_ASSETS.map((c) => (
                          <option key={c.symbol} value={c.symbol}>
                            {c.symbol}
                          </option>
                        ))}
                      </select>
                      <select
                        value={newFbPositive ? 'pos' : 'neg'}
                        onChange={(e) => setNewFbPositive(e.target.value === 'pos')}
                        aria-label="Feedback sentiment"
                        className="h-8 rounded-lg border border-[#DCE2E1] bg-[#F8FAFA] px-2 text-xs font-semibold text-[#0E1715] sm:col-span-1 dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                      >
                        <option value="pos">Pos</option>
                        <option value="neg">Neg</option>
                      </select>
                      <input
                        type="text"
                        value={newFbDate}
                        onChange={(e) => setNewFbDate(e.target.value)}
                        placeholder="Just now"
                        aria-label="Feedback date label"
                        className="h-8 rounded-lg border border-[#DCE2E1] bg-[#F8FAFA] px-2 text-xs text-[#0E1715] sm:col-span-2 dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={acctBusy || !newFbComment.trim()}
                        onClick={handleAddCustomFeedback}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#0B3B2E] px-3 text-xs font-bold text-white hover:bg-[#092F24] disabled:opacity-45 dark:bg-[#7FE85B] dark:text-[#082213] dark:hover:bg-[#6AD845]"
                      >
                        <MessageSquarePlus className="h-3.5 w-3.5" />
                        <span>Add Feedback Comment</span>
                      </button>
                    </div>
                  </div>

                  {acctDetails.trader.recentFeedback.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#DCE2E1] bg-white p-4 text-center text-xs text-[#5C6665] dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#8E9B98]">
                      No reviews or feedback left on @{acctDetails.username}. Use Add Feedback Comment or +5 / +10 Random above.
                    </div>
                  ) : (
                    <div className="max-h-64 divide-y divide-[#ECEFEF] overflow-y-auto rounded-xl border border-[#DCE2E1] bg-white dark:divide-[#202B2A] dark:border-[#263130] dark:bg-[#131A1A]">
                      {acctDetails.trader.recentFeedback.map((fb) => (
                        <div
                          key={fb.id}
                          className="flex items-start justify-between gap-3 px-3.5 py-2.5 text-xs"
                        >
                          <div className="flex min-w-0 flex-1 items-start gap-2.5">
                            {fb.positive ? (
                              <ThumbsUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16A34A] dark:text-[#7FE85B]" />
                            ) : (
                              <ThumbsDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="break-words text-[#0E1715] dark:text-[#EAF0EF]">
                                {fb.comment}
                              </p>
                              <p className="mt-0.5 font-mono text-[10px] text-[#64706E] dark:text-[#8E9B98]">
                                {fb.author} · {fb.asset} · {fb.date} · {fb.id}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={acctBusy}
                            onClick={() => handleRemoveFeedbackItem(fb.id)}
                            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-red-200 bg-white px-2 text-[10px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:bg-[#1A2020] dark:text-red-400 dark:hover:bg-red-950/40"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Remove</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section C: Trade History & Active Offers Removal */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {/* Trade History Entries */}
                  <div className="space-y-2.5 rounded-xl border border-[#DCE2E1] bg-[#F8FAFA] p-4 dark:border-[#222E2C] dark:bg-[#0E1413]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold text-[#0E1715] dark:text-white">
                          Trade History ({acctDetails.trader.tradeHistory?.length ?? 0})
                        </h3>
                        <label className="mt-0.5 inline-flex cursor-pointer items-center gap-1 text-[10px] text-[#5C6665] dark:text-[#8E9B98]">
                          <input
                            type="checkbox"
                            checked={decrementOnHistDelete}
                            onChange={(e) => setDecrementOnHistDelete(e.target.checked)}
                            className="h-3 w-3 accent-[#0B3B2E] dark:accent-[#7FE85B]"
                          />
                          <span>Also subtract/reset trade count</span>
                        </label>
                      </div>
                      {(acctDetails.trader.tradeHistory?.length ?? 0) > 0 && (
                        <button
                          type="button"
                          disabled={acctBusy}
                          onClick={handleClearTradeHistory}
                          className="inline-flex h-7 items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2 text-[10px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Clear History</span>
                        </button>
                      )}
                    </div>

                    {(acctDetails.trader.tradeHistory?.length ?? 0) === 0 ? (
                      <div className="rounded-lg border border-dashed border-[#DCE2E1] bg-white p-3 text-center text-[11px] text-[#5C6665] dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#8E9B98]">
                        No trade history entries logged.
                      </div>
                    ) : (
                      <div className="max-h-48 divide-y divide-[#ECEFEF] overflow-y-auto rounded-lg border border-[#DCE2E1] bg-white dark:divide-[#202B2A] dark:border-[#263130] dark:bg-[#131A1A]">
                        {(acctDetails.trader.tradeHistory ?? []).map((rec) => (
                          <div
                            key={rec.id}
                            className="flex items-center justify-between gap-2 px-3 py-2 text-[11px]"
                          >
                            <div className="min-w-0">
                              <div className="truncate font-mono font-semibold text-[#0E1715] dark:text-white">
                                {rec.side} {formatCrypto(rec.cryptoAmount, rec.asset)} · {rec.fiatAmount} {rec.fiat}
                              </div>
                              <div className="truncate font-mono text-[10px] text-[#64706E] dark:text-[#8E9B98]">
                                {rec.id} · {rec.counterparty} · {rec.completedAt}
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={acctBusy}
                              onClick={() => handleRemoveTradeHistoryItem(rec.id)}
                              className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-red-200 bg-white px-2 text-[10px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:bg-[#1A2020] dark:text-red-400"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Remove</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Custom Offers Posted by Account */}
                  <div className="space-y-2.5 rounded-xl border border-[#DCE2E1] bg-[#F8FAFA] p-4 dark:border-[#222E2C] dark:bg-[#0E1413]">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold text-[#0E1715] dark:text-white">
                          Posted Offers / Ads ({acctDetails.offers.length})
                        </h3>
                        <p className="text-[10px] text-[#5C6665] dark:text-[#8E9B98]">
                          Remove individual ads created by @{acctDetails.username}
                        </p>
                      </div>
                    </div>

                    {acctDetails.offers.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-[#DCE2E1] bg-white p-3 text-center text-[11px] text-[#5C6665] dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#8E9B98]">
                        No custom ads listed by this account.
                      </div>
                    ) : (
                      <div className="max-h-48 divide-y divide-[#ECEFEF] overflow-y-auto rounded-lg border border-[#DCE2E1] bg-white dark:divide-[#202B2A] dark:border-[#263130] dark:bg-[#131A1A]">
                        {acctDetails.offers.map((off) => (
                          <div
                            key={off.id}
                            className="flex items-center justify-between gap-2 px-3 py-2 text-[11px]"
                          >
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-[#0E1715] dark:text-white">
                                {off.side.replace('_', ' ')} · {off.crypto} · {off.paymentMethod}
                              </div>
                              <div className="truncate font-mono text-[10px] text-[#64706E] dark:text-[#8E9B98]">
                                {off.id} · {off.minFiat}–{off.maxFiat} {off.fiat} · {off.active ? 'Live' : 'Paused'}
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={acctBusy}
                              onClick={() => handleDeleteUserOffer(off.id)}
                              className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-red-200 bg-white px-2 text-[10px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:bg-[#1A2020] dark:text-red-400"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Delete Ad</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Section D: Danger Zone - Remove Account */}
                <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 dark:border-red-900/50 dark:bg-red-950/20">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-red-800 dark:text-red-300">
                        <UserX className="h-4 w-4" />
                        <span>Remove Account (@{acctDetails.username})</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-red-700/90 dark:text-red-300/80">
                        Deletes all posted ads, wipes balances, reviews &amp; history, locks login credentials, and removes the profile from the marketplace.
                      </p>
                    </div>

                    {!confirmDeleteAccount ? (
                      <button
                        type="button"
                        disabled={acctBusy}
                        onClick={() => setConfirmDeleteAccount(true)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-300 bg-white px-3.5 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-[#1E1212] dark:text-red-300 dark:hover:bg-red-950/60"
                      >
                        <UserX className="h-3.5 w-3.5" />
                        <span>Remove Account</span>
                      </button>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={acctBusy}
                          onClick={handleRemoveAccount}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-red-600 px-3.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>{acctBusy ? 'Removing...' : `Confirm Remove @${acctDetails.username}`}</span>
                        </button>
                        <button
                          type="button"
                          disabled={acctBusy}
                          onClick={() => setConfirmDeleteAccount(false)}
                          className="h-9 rounded-xl border border-[#DCE2E1] bg-white px-3 text-xs font-semibold text-[#1E2726] hover:bg-[#F5F7F7] dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#DCE4E3]"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end pt-1">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-xl border border-[#DCE2E1] px-4 text-sm font-semibold text-[#1E2726] hover:bg-[#F5F7F7] dark:border-[#263130] dark:text-[#DCE4E3] dark:hover:bg-[#1A2423]"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: Live Trades Admin & Chat Moderation */}
        {vaultTab === 'trades' && (
          <div className="mt-4 space-y-3">
            {tradesError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {tradesError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* Left: Live Trades Feed */}
              <div className="flex flex-col rounded-xl border border-[#DCE2E1] bg-[#F8FAFA] p-3 lg:col-span-5 dark:border-[#222E2C] dark:bg-[#0E1413]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#7B8684]" />
                  <input
                    type="text"
                    value={tradeSearch}
                    onChange={(e) => setTradeSearch(e.target.value)}
                    placeholder="Search ID, buyer, seller, crypto..."
                    className="h-9 w-full rounded-lg border border-[#DCE2E1] bg-white pl-8 pr-3 text-xs text-[#0E1715] placeholder-[#7B8684] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                  />
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1">
                  {(
                    [
                      { id: 'all', label: `All (${allTrades.length})` },
                      { id: 'active', label: 'Active' },
                      { id: 'disputed', label: 'Disputed' },
                      { id: 'completed', label: 'Completed' },
                      { id: 'cancelled', label: 'Closed' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setTradeStatusFilter(f.id)}
                      className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                        tradeStatusFilter === f.id
                          ? 'bg-[#0B3B2E] text-[#7FE85B] dark:bg-[#7FE85B] dark:text-[#082213]'
                          : 'bg-white text-[#5C6665] hover:text-[#0E1715] dark:bg-[#151D1C] dark:text-[#8E9B98] dark:hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="mt-3 max-h-[460px] flex-1 space-y-2 overflow-y-auto pr-1">
                  {tradesLoading ? (
                    <div className="rounded-lg border border-dashed border-[#DCE2E1] bg-white p-4 text-center text-xs text-[#5C6665] dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#8E9B98]">
                      Loading live trades...
                    </div>
                  ) : filteredTrades.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#DCE2E1] bg-white p-4 text-center text-xs text-[#5C6665] dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#8E9B98]">
                      No trades match this filter.
                    </div>
                  ) : (
                    filteredTrades.map((t) => {
                      const isSelected = selectedTrade?.id === t.id;
                      const awaitingFunding =
                        t.status === 'escrow_funded' &&
                        t.lastReadAtBy?.__escrowState === 'awaiting_seller';
                      const photoCount = Object.keys(t.lastReadAtBy ?? {}).filter((k) =>
                        k.startsWith('__img_')
                      ).length;
                      const hiddenPhotoCount = Object.keys(t.lastReadAtBy ?? {}).filter(
                        (k) => k.startsWith('__imgHidden_') && t.lastReadAtBy?.[k] === '1'
                      ).length;

                      const badgeClass =
                        t.status === 'completed'
                          ? 'bg-[#E8F8EE] text-[#0D6832] dark:bg-[#152D21] dark:text-[#7FE85B]'
                          : t.status === 'cancelled'
                            ? 'bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            : t.status === 'disputed'
                              ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                              : awaitingFunding
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';

                      const badgeText = awaitingFunding
                        ? 'Awaiting Escrow'
                        : t.status === 'escrow_funded'
                          ? 'Funded'
                          : t.status === 'payment_sent'
                            ? 'Paid'
                            : t.status === 'completed'
                              ? 'Completed'
                              : t.status === 'cancelled'
                                ? 'Closed'
                                : 'Disputed';

                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSelectedTradeId(t.id);
                            setAdminMsgRole('admin');
                            setTradeActionMsg('');
                            setTradeActionError('');
                          }}
                          className={`w-full rounded-xl border p-3 text-left transition-colors ${
                            isSelected
                              ? 'border-[#0B3B2E] bg-white shadow-xs dark:border-[#7FE85B] dark:bg-[#15221E]'
                              : 'border-[#DCE2E1] bg-white hover:border-[#9EB0AD] dark:border-[#24302F] dark:bg-[#131A1A] dark:hover:border-[#394A48]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs font-bold text-[#0E1715] dark:text-white">
                              {t.id}
                            </span>
                            <span
                              className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold ${badgeClass}`}
                            >
                              {badgeText}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-2 text-xs font-semibold text-[#1E2726] dark:text-[#DCE4E3]">
                            <span className="truncate">
                              @{t.buyerUsername} ↔ @{t.sellerUsername}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-[#5C6665] dark:text-[#8E9B98]">
                            <span>
                              {formatCrypto(t.cryptoAmount, t.crypto)} · {formatFiat(t.fiatAmount, t.fiat)}
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {(t.lastReadAtBy?.__muteFrom_buyer === '1' ||
                                t.lastReadAtBy?.__muteFrom_seller === '1') && (
                                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                  {t.lastReadAtBy?.__muteFrom_buyer === '1' &&
                                  t.lastReadAtBy?.__muteFrom_seller === '1'
                                    ? 'Both silenced'
                                    : t.lastReadAtBy?.__muteFrom_buyer === '1'
                                      ? `@${t.buyerUsername} silenced`
                                      : `@${t.sellerUsername} silenced`}
                                </span>
                              )}
                              {photoCount > 0 && (
                                <span className="text-[10px] font-semibold text-[#0B3B2E] dark:text-[#7FE85B]">
                                  {photoCount} img{photoCount === 1 ? '' : 's'}
                                  {hiddenPhotoCount > 0 ? ` (${hiddenPhotoCount} hidden)` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right: Selected Trade Full Inspector & Live Chat Moderation */}
              <div className="flex flex-col rounded-xl border border-[#DCE2E1] bg-white lg:col-span-7 dark:border-[#222E2C] dark:bg-[#0E1413]">
                {!selectedTrade ? (
                  <div className="flex h-full min-h-[420px] flex-col items-center justify-center p-6 text-center text-xs text-[#5C6665] dark:text-[#8E9B98]">
                    <MessageSquare className="mb-2 h-6 w-6 opacity-50" />
                    <p>Select any live trade on the left to inspect its chat and manage escrow.</p>
                  </div>
                ) : (
                  <>
                    {/* Trade Summary & Full Admin Controls */}
                    <div className="space-y-3 border-b border-[#ECEFEF] p-3.5 dark:border-[#202B2A]">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-bold text-[#0E1715] dark:text-white">
                              {selectedTrade.id}
                            </span>
                            <span className="rounded bg-[#F2F5F5] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-[#394241] dark:bg-[#192322] dark:text-[#C5D1CF]">
                              {selectedTrade.side.replace('_', ' ')}
                            </span>
                            <span className="rounded bg-[#E8F8EE] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#0B3B2E] dark:bg-[#152D21] dark:text-[#7FE85B]">
                              {selectedTrade.lastReadAtBy?.__escrowState === 'awaiting_seller'
                                ? 'Escrow Unfunded'
                                : 'Escrow Funded'}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-[#5C6665] dark:text-[#8E9B98]">
                            Buyer:{' '}
                            <strong className="text-[#0E1715] dark:text-white">
                              @{selectedTrade.buyerUsername}
                            </strong>{' '}
                            · Seller:{' '}
                            <strong className="text-[#0E1715] dark:text-white">
                              @{selectedTrade.sellerUsername}
                            </strong>{' '}
                            · {selectedTrade.paymentMethod}
                          </div>
                          <div className="mt-0.5 font-mono text-[11px] text-[#0D6832] dark:text-[#7FE85B]">
                            {formatCrypto(selectedTrade.cryptoAmount, selectedTrade.crypto)} ↔{' '}
                            {selectedTrade.side === 'swap_crypto' &&
                            selectedTrade.swapToCrypto &&
                            selectedTrade.swapToAmount
                              ? formatCrypto(selectedTrade.swapToAmount, selectedTrade.swapToCrypto)
                              : formatFiat(selectedTrade.fiatAmount, selectedTrade.fiat)}
                          </div>
                        </div>

                        <div className="text-right font-mono text-[10px] text-[#5C6665] dark:text-[#8E9B98]">
                          <div>Status: {selectedTrade.status}</div>
                          <div>Offer: {selectedTrade.offerId}</div>
                        </div>
                      </div>

                      {/* Admin Action Controls */}
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTrade.lastReadAtBy?.__escrowState === 'awaiting_seller' &&
                          selectedTrade.status !== 'cancelled' &&
                          selectedTrade.status !== 'completed' && (
                            <button
                              type="button"
                              disabled={tradeActionBusy}
                              onClick={() => handleAdminTradeAction('fund_escrow')}
                              className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#DCE2E1] bg-[#F8FAFA] px-2.5 text-[11px] font-semibold text-[#0E1715] hover:border-[#0B3B2E] disabled:opacity-50 dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                            >
                              <Lock className="h-3 w-3 text-[#0B3B2E] dark:text-[#7FE85B]" />
                              <span>Mark Escrow Funded</span>
                            </button>
                          )}

                        {selectedTrade.status === 'escrow_funded' && (
                          <button
                            type="button"
                            disabled={tradeActionBusy}
                            onClick={() => handleAdminTradeAction('mark_paid')}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#DCE2E1] bg-[#F8FAFA] px-2.5 text-[11px] font-semibold text-[#0E1715] hover:border-[#0B3B2E] disabled:opacity-50 dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                          >
                            <ShieldCheck className="h-3 w-3 text-[#0B3B2E] dark:text-[#7FE85B]" />
                            <span>Mark Paid</span>
                          </button>
                        )}

                        {selectedTrade.status !== 'completed' && (
                          <button
                            type="button"
                            disabled={tradeActionBusy}
                            onClick={() => handleAdminTradeAction('release')}
                            className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#7FE85B] px-2.5 text-[11px] font-semibold text-[#082213] hover:bg-[#6AD845] disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Complete &amp; Release</span>
                          </button>
                        )}

                        {selectedTrade.status !== 'cancelled' && (
                          <button
                            type="button"
                            disabled={tradeActionBusy}
                            onClick={() => handleAdminTradeAction('cancel')}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2.5 text-[11px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/70"
                          >
                            <XCircle className="h-3 w-3" />
                            <span>Close Trade (Cancel)</span>
                          </button>
                        )}

                        {(selectedTrade.status === 'escrow_funded' ||
                          selectedTrade.status === 'payment_sent') && (
                          <button
                            type="button"
                            disabled={tradeActionBusy}
                            onClick={() => handleAdminTradeAction('dispute')}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            <span>Freeze Dispute</span>
                          </button>
                        )}

                        {(selectedTrade.status === 'completed' ||
                          selectedTrade.status === 'cancelled' ||
                          selectedTrade.status === 'disputed') && (
                          <button
                            type="button"
                            disabled={tradeActionBusy}
                            onClick={() => handleAdminTradeAction('reopen')}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#DCE2E1] bg-white px-2.5 text-[11px] font-semibold text-[#1E2726] hover:bg-[#F2F5F5] disabled:opacity-50 dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#DCE4E3]"
                          >
                            <RefreshCw className="h-3 w-3" />
                            <span>Reopen Trade</span>
                          </button>
                        )}
                      </div>

                      {/* Directional Message Invisibility Toggles */}
                      {(() => {
                        const buyerHiddenFromSeller =
                          selectedTrade.lastReadAtBy?.__muteFrom_buyer === '1';
                        const sellerHiddenFromBuyer =
                          selectedTrade.lastReadAtBy?.__muteFrom_seller === '1';
                        const buyerName = selectedTrade.buyerUsername;
                        const sellerName = selectedTrade.sellerUsername;

                        return (
                          <div className="rounded-xl border border-[#DCE2E1] bg-[#F8FAFA] p-2.5 dark:border-[#24302F] dark:bg-[#131A1A]">
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0E1715] dark:text-white">
                                <EyeOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                <span>Silence New Messages (Old Messages Stay Visible)</span>
                              </span>
                              <span className="text-[10px] text-[#5C6665] dark:text-[#8E9B98]">
                                Admin sees all · Toggle off to reveal new messages
                              </span>
                            </div>

                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <div
                                className={`flex flex-col justify-between gap-2 rounded-lg border p-2.5 ${
                                  buyerHiddenFromSeller
                                    ? 'border-amber-300 bg-amber-50/80 dark:border-amber-800/70 dark:bg-amber-950/30'
                                    : 'border-[#DCE2E1] bg-white dark:border-[#263130] dark:bg-[#0F1515]'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono text-[11px] font-bold text-[#0E1715] dark:text-white">
                                      @{buyerName} → @{sellerName}
                                    </span>
                                    <span
                                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                                        buyerHiddenFromSeller
                                          ? 'bg-amber-200 text-amber-900 dark:bg-amber-900/70 dark:text-amber-200'
                                          : 'bg-[#E8F8EE] text-[#0D6832] dark:bg-[#152D21] dark:text-[#7FE85B]'
                                      }`}
                                    >
                                      {buyerHiddenFromSeller ? 'SILENCED' : 'LIVE'}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-[11px] leading-snug text-[#4B5554] dark:text-[#A9B5B3]">
                                    {buyerHiddenFromSeller ? (
                                      <>
                                        Old messages stay visible, but{' '}
                                        <strong>@{sellerName} CANNOT see new messages</strong> from{' '}
                                        <strong>@{buyerName}</strong>. (Admin sees all)
                                      </>
                                    ) : (
                                      <>
                                        <strong>@{sellerName} CAN see</strong> all messages from{' '}
                                        <strong>@{buyerName}</strong> normally.
                                      </>
                                    )}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  disabled={tradeActionBusy}
                                  onClick={() =>
                                    handleAdminToggleSenderInvisible('buyer', buyerHiddenFromSeller)
                                  }
                                  className={`inline-flex h-7 w-full items-center justify-center gap-1.5 rounded-md border px-2 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                                    buyerHiddenFromSeller
                                      ? 'border-[#0B3B2E] bg-white text-[#0B3B2E] hover:bg-[#EEF6F2] dark:border-[#7FE85B] dark:bg-[#0F1515] dark:text-[#7FE85B]'
                                      : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200 dark:hover:bg-amber-950/80'
                                  }`}
                                >
                                  {buyerHiddenFromSeller ? (
                                    <>
                                      <Eye className="h-3 w-3" />
                                      <span>Unsilence @{buyerName} (Show New)</span>
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff className="h-3 w-3" />
                                      <span>Silence @{buyerName} from @{sellerName}</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              <div
                                className={`flex flex-col justify-between gap-2 rounded-lg border p-2.5 ${
                                  sellerHiddenFromBuyer
                                    ? 'border-amber-300 bg-amber-50/80 dark:border-amber-800/70 dark:bg-amber-950/30'
                                    : 'border-[#DCE2E1] bg-white dark:border-[#263130] dark:bg-[#0F1515]'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono text-[11px] font-bold text-[#0E1715] dark:text-white">
                                      @{sellerName} → @{buyerName}
                                    </span>
                                    <span
                                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                                        sellerHiddenFromBuyer
                                          ? 'bg-amber-200 text-amber-900 dark:bg-amber-900/70 dark:text-amber-200'
                                          : 'bg-[#E8F8EE] text-[#0D6832] dark:bg-[#152D21] dark:text-[#7FE85B]'
                                      }`}
                                    >
                                      {sellerHiddenFromBuyer ? 'SILENCED' : 'LIVE'}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-[11px] leading-snug text-[#4B5554] dark:text-[#A9B5B3]">
                                    {sellerHiddenFromBuyer ? (
                                      <>
                                        Old messages stay visible, but{' '}
                                        <strong>@{buyerName} CANNOT see new messages</strong> from{' '}
                                        <strong>@{sellerName}</strong>. (Admin sees all)
                                      </>
                                    ) : (
                                      <>
                                        <strong>@{buyerName} CAN see</strong> all messages from{' '}
                                        <strong>@{sellerName}</strong> normally.
                                      </>
                                    )}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  disabled={tradeActionBusy}
                                  onClick={() =>
                                    handleAdminToggleSenderInvisible(
                                      'seller',
                                      sellerHiddenFromBuyer
                                    )
                                  }
                                  className={`inline-flex h-7 w-full items-center justify-center gap-1.5 rounded-md border px-2 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                                    sellerHiddenFromBuyer
                                      ? 'border-[#0B3B2E] bg-white text-[#0B3B2E] hover:bg-[#EEF6F2] dark:border-[#7FE85B] dark:bg-[#0F1515] dark:text-[#7FE85B]'
                                      : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200 dark:hover:bg-amber-950/80'
                                  }`}
                                >
                                  {sellerHiddenFromBuyer ? (
                                    <>
                                      <Eye className="h-3 w-3" />
                                      <span>Unsilence @{sellerName} (Show New)</span>
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff className="h-3 w-3" />
                                      <span>Silence @{sellerName} from @{buyerName}</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {tradeActionMsg && (
                        <div className="rounded-lg border border-[#8CE89E] bg-[#EAFBF0] px-2.5 py-1.5 text-[11px] font-semibold text-[#0B3B2E] dark:border-[#1E4D33] dark:bg-[#112A1D] dark:text-[#7FE85B]">
                          {tradeActionMsg}
                        </div>
                      )}
                      {tradeActionError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                          {tradeActionError}
                        </div>
                      )}
                    </div>

                    {/* Live Trade Chat Feed with Moderation */}
                    <div className="max-h-[300px] min-h-[260px] flex-1 space-y-2.5 overflow-y-auto p-3.5">
                      {selectedTradeMessages.length === 0 ? (
                        <div className="py-10 text-center text-xs text-[#5C6665] dark:text-[#8E9B98]">
                          No messages in this trade chat yet.
                        </div>
                      ) : (
                        selectedTradeMessages.map((m) => {
                          const isBuyerSender =
                            m.sender.toLowerCase() === selectedTrade.buyerUsername.toLowerCase();
                          const isSellerSender =
                            m.sender.toLowerCase() === selectedTrade.sellerUsername.toLowerCase();
                          const roleTag = m.isSystem
                            ? 'System'
                            : m.sender === 'Escrow Admin'
                              ? 'Admin'
                              : isBuyerSender
                                ? 'Buyer'
                                : isSellerSender
                                  ? 'Seller'
                                  : 'User';

                          return (
                            <div
                              key={m.id}
                              className={`rounded-xl border p-2.5 text-xs ${
                                m.hiddenFromUsername
                                  ? 'border-amber-300 bg-amber-50/70 text-[#0E1715] dark:border-amber-800/70 dark:bg-amber-950/25 dark:text-[#EAF0EF]'
                                  : m.isSystem
                                    ? 'border-[#E3E7E7] bg-[#F6F8F8] text-[#4B5554] dark:border-[#202B2A] dark:bg-[#131A1A] dark:text-[#98A4A2]'
                                    : 'border-[#DCE2E1] bg-[#FAFCFC] text-[#0E1715] dark:border-[#24302F] dark:bg-[#131B1A] dark:text-[#EAF0EF]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-bold text-[#0E1715] dark:text-white">
                                    {m.sender}
                                  </span>
                                  <span className="rounded bg-[#E9EFEE] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#394241] dark:bg-[#1E2A28] dark:text-[#C5D1CF]">
                                    {roleTag}
                                  </span>
                                  {m.hiddenFromUsername && (
                                    <span className="inline-flex items-center gap-1 rounded bg-amber-200/90 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-950 dark:bg-amber-900/80 dark:text-amber-200">
                                      <EyeOff className="h-2.5 w-2.5" />
                                      <span>Silenced from @{m.hiddenFromUsername} · Admin sees</span>
                                    </span>
                                  )}
                                  {m.spoofedHiddenFromUsername && (
                                    <span className="inline-flex items-center gap-1 rounded bg-indigo-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-900 dark:bg-indigo-950/70 dark:text-indigo-200">
                                      <EyeOff className="h-2.5 w-2.5" />
                                      <span>Sent on @{m.spoofedHiddenFromUsername}&apos;s behalf · Hidden from @{m.spoofedHiddenFromUsername}</span>
                                    </span>
                                  )}
                                  <span className="font-mono text-[10px] text-[#7B8684]">
                                    {new Date(m.timestamp).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1">
                                  {m.imageUrl && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleAdminToggleImageHidden(m.id, Boolean(m.imageHidden))
                                      }
                                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                                        m.imageHidden
                                          ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                          : 'border-[#DCE2E1] bg-white text-[#394241] hover:bg-[#F2F5F5] dark:border-[#263130] dark:bg-[#1A2423] dark:text-[#DCE4E3]'
                                      }`}
                                    >
                                      {m.imageHidden ? (
                                        <>
                                          <Eye className="h-3 w-3" />
                                          <span>Show Picture</span>
                                        </>
                                      ) : (
                                        <>
                                          <EyeOff className="h-3 w-3" />
                                          <span>Hide Picture</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    title="Remove message"
                                    onClick={() => handleAdminDeleteMessage(m.id)}
                                    className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:bg-[#1A2020] dark:text-red-400 dark:hover:bg-red-950/40"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    <span>Remove</span>
                                  </button>
                                </div>
                              </div>

                              {m.imageUrl && (
                                <div className="mt-2 space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                                        m.imageHidden
                                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                          : 'bg-[#E8F8EE] text-[#0D6832] dark:bg-[#152D21] dark:text-[#7FE85B]'
                                      }`}
                                    >
                                      {m.imageHidden ? 'Hidden from users' : 'Visible to users'}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setAdminPreviewImageUrl(m.imageUrl ?? null)}
                                    className="block overflow-hidden rounded-lg border border-[#DCE2E1] bg-black/5 dark:border-[#263130]"
                                  >
                                    <img
                                      src={m.imageUrl}
                                      alt="Trade chat upload"
                                      className={`max-h-40 w-auto max-w-full rounded-lg object-contain ${
                                        m.imageHidden ? 'opacity-65' : ''
                                      }`}
                                    />
                                  </button>
                                </div>
                              )}

                              {!(m.imageUrl && m.text === '[Photo uploaded]') && (
                                <p className="mt-1.5 break-words leading-relaxed">{m.text}</p>
                              )}
                            </div>
                          );
                        })
                      )}
                      <div ref={adminChatBottomRef} />
                    </div>

                    {/* Admin Message Composer */}
                    <div className="border-t border-[#ECEFEF] p-3 dark:border-[#202B2A]">
                      {adminPendingImage && (
                        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-[#DCE2E1] bg-[#F8FAFA] px-2.5 py-1.5 dark:border-[#263130] dark:bg-[#131A1A]">
                          <div className="flex items-center gap-2">
                            <img
                              src={adminPendingImage}
                              alt="Admin upload preview"
                              className="h-10 w-10 rounded object-cover"
                            />
                            <span className="text-[11px] font-medium text-[#394241] dark:text-[#C5D1CF]">
                              Admin image ready
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAdminPendingImage(null)}
                            className="text-[11px] font-semibold text-red-600 hover:underline dark:text-red-400"
                          >
                            Remove
                          </button>
                        </div>
                      )}

                      <form onSubmit={handleAdminSendMessage} className="space-y-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-[#5C6665] dark:text-[#8E9B98]">
                            Write as:
                          </span>
                          {(
                            [
                              { id: 'admin', label: 'Escrow Admin' },
                              { id: 'system', label: 'Escrow System' },
                              {
                                id: 'buyer',
                                label: `@${selectedTrade.buyerUsername} (Buyer)`,
                              },
                              {
                                id: 'seller',
                                label: `@${selectedTrade.sellerUsername} (Seller)`,
                              },
                            ] as const
                          ).map((opt) => {
                            const active = adminMsgRole === opt.id;
                            const isImpersonating = opt.id === 'buyer' || opt.id === 'seller';
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setAdminMsgRole(opt.id)}
                                className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors ${
                                  active
                                    ? isImpersonating
                                      ? 'border-[#0B3B2E] bg-[#EEF6F2] text-[#0B3B2E] dark:border-[#7FE85B] dark:bg-[#152D21] dark:text-[#7FE85B]'
                                      : 'border-[#0B3B2E] bg-[#0B3B2E] text-white dark:border-[#7FE85B] dark:bg-[#7FE85B] dark:text-[#082213]'
                                    : 'border-[#DCE2E1] bg-white text-[#394241] hover:bg-[#F2F5F5] dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#C5D1CF] dark:hover:bg-[#1A2423]'
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>

                        {((adminMsgRole === 'buyer' &&
                          selectedTrade.lastReadAtBy?.__muteFrom_buyer === '1') ||
                          (adminMsgRole === 'seller' &&
                            selectedTrade.lastReadAtBy?.__muteFrom_seller === '1')) && (
                          <div className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-200">
                            Heads up:{' '}
                            <strong>
                              @
                              {adminMsgRole === 'buyer'
                                ? selectedTrade.buyerUsername
                                : selectedTrade.sellerUsername}
                            </strong>{' '}
                            is currently silenced — old messages stay visible, but this new message
                            won&apos;t reach{' '}
                            <strong>
                              @
                              {adminMsgRole === 'buyer'
                                ? selectedTrade.sellerUsername
                                : selectedTrade.buyerUsername}
                            </strong>{' '}
                            until you unsilence them.
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <input
                            ref={adminImageInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAdminSelectImage}
                            className="hidden"
                          />
                          <button
                            type="button"
                            title="Attach picture"
                            onClick={() => adminImageInputRef.current?.click()}
                            disabled={adminMsgBusy}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#DCE2E1] bg-white text-[#5C6665] hover:bg-[#F2F5F5] dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#98A4A2]"
                          >
                            <ImagePlus className="h-4 w-4" />
                          </button>
                          <input
                            type="text"
                            value={adminMsgText}
                            onChange={(e) => setAdminMsgText(e.target.value)}
                            placeholder={`Write into ${selectedTrade.id} chat as ${
                              adminMsgRole === 'buyer'
                                ? `@${selectedTrade.buyerUsername} (Buyer)`
                                : adminMsgRole === 'seller'
                                  ? `@${selectedTrade.sellerUsername} (Seller)`
                                  : adminMsgRole === 'system'
                                    ? 'Escrow System'
                                    : 'Escrow Admin'
                            }...`}
                            className="h-9 flex-1 rounded-lg border border-[#DCE2E1] bg-white px-3 text-xs text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                          />
                          <button
                            type="submit"
                            disabled={adminMsgBusy || (!adminMsgText.trim() && !adminPendingImage)}
                            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#0B3B2E] px-3 text-xs font-semibold text-white hover:bg-[#082E24] disabled:opacity-50 dark:bg-[#7FE85B] dark:text-[#082213]"
                          >
                            <Send className="h-3.5 w-3.5" />
                            <span>
                              {adminMsgRole === 'buyer'
                                ? `Send as @${selectedTrade.buyerUsername}`
                                : adminMsgRole === 'seller'
                                  ? `Send as @${selectedTrade.sellerUsername}`
                                  : 'Send'}
                            </span>
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#5C6665] dark:text-[#8E9B98]">
                            {adminMsgRole === 'buyer'
                              ? `Writing on @${selectedTrade.buyerUsername}'s behalf — @${selectedTrade.sellerUsername} will see it, @${selectedTrade.buyerUsername} will NOT see it.`
                              : adminMsgRole === 'seller'
                                ? `Writing on @${selectedTrade.sellerUsername}'s behalf — @${selectedTrade.buyerUsername} will see it, @${selectedTrade.sellerUsername} will NOT see it.`
                                : adminMsgRole === 'system'
                                  ? 'Posting an official Escrow System notice.'
                                  : 'Posting as Escrow Admin moderator.'}
                          </span>
                          <button
                            type="button"
                            onClick={onClose}
                            className="font-semibold text-[#5C6665] hover:text-[#0E1715] dark:text-[#8E9B98] dark:hover:text-white"
                          >
                            Close Console
                          </button>
                        </div>
                      </form>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Live 24/7 Support Desk */}
        {vaultTab === 'support' && (
          <div className="mt-4 space-y-3">
            {supportError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {supportError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* Left: Live Support Threads */}
              <div className="flex flex-col rounded-xl border border-[#DCE2E1] bg-[#F8FAFA] p-3 lg:col-span-5 dark:border-[#222E2C] dark:bg-[#0E1413]">
                <div className="flex items-center justify-between gap-2 pb-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0E1715] dark:text-white">
                    <Headphones className="h-3.5 w-3.5 text-[#0B3B2E] dark:text-[#7FE85B]" />
                    <span>24/7 Support Inbox ({supportChats.length})</span>
                  </span>
                  {unreadSupportCount > 0 && (
                    <span className="rounded-md bg-emerald-600 px-2 py-0.5 font-mono text-[10px] font-bold text-white dark:bg-[#7FE85B] dark:text-[#082213]">
                      {unreadSupportCount} unread
                    </span>
                  )}
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#7B8684]" />
                  <input
                    type="text"
                    value={supportSearch}
                    onChange={(e) => setSupportSearch(e.target.value)}
                    placeholder="Search client handle, session ID..."
                    className="h-9 w-full rounded-lg border border-[#DCE2E1] bg-white pl-8 pr-3 text-xs text-[#0E1715] placeholder-[#7B8684] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                  />
                </div>

                <div className="mt-3 max-h-[460px] flex-1 space-y-2 overflow-y-auto pr-1">
                  {supportLoading ? (
                    <div className="rounded-lg border border-dashed border-[#DCE2E1] bg-white p-4 text-center text-xs text-[#5C6665] dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#8E9B98]">
                      Loading 24/7 support threads...
                    </div>
                  ) : filteredSupportChats.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#DCE2E1] bg-white p-5 text-center text-xs text-[#5C6665] dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#8E9B98]">
                      No client support messages yet. When a client writes from the top banner or mobile menu, it appears live here.
                    </div>
                  ) : (
                    filteredSupportChats.map((c) => {
                      const isSelected = selectedSupportChat?.id === c.id;
                      const lastClientAt = c.lastReadAtBy?.lastVisitorMsgAt ?? '';
                      const lastAdminRead = c.lastReadAtBy?.admin ?? '';
                      const hasUnread = Boolean(
                        lastClientAt && (!lastAdminRead || lastClientAt > lastAdminRead)
                      );
                      const displayLabel = c.offerSummary || c.participants[0] || 'Guest Client';

                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedSupportChatId(c.id)}
                          className={`w-full rounded-xl border p-3 text-left transition-colors ${
                            isSelected
                              ? 'border-[#0B3B2E] bg-[#EEF6F2] dark:border-[#7FE85B] dark:bg-[#152B20]'
                              : 'border-[#DCE2E1] bg-white hover:bg-[#F5F7F7] dark:border-[#222E2C] dark:bg-[#131A1A] dark:hover:bg-[#192322]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="truncate text-xs font-bold text-[#0E1715] dark:text-white">
                              {displayLabel}
                            </span>
                            {hasUnread && (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded bg-emerald-600 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white dark:bg-[#7FE85B] dark:text-[#082213]">
                                New
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[10px] text-[#6C7775] dark:text-[#8E9B98]">
                            <span className="truncate">{c.id}</span>
                            <span className="shrink-0">
                              {new Date(c.updatedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right: Selected Support Thread + Live Reply Composer */}
              <div className="flex flex-col rounded-xl border border-[#DCE2E1] bg-white lg:col-span-7 dark:border-[#222E2C] dark:bg-[#0E1413]">
                {!selectedSupportChat ? (
                  <div className="flex min-h-[420px] flex-col items-center justify-center p-6 text-center text-xs text-[#5C6665] dark:text-[#8E9B98]">
                    <Headphones className="mb-2 h-6 w-6 opacity-60" />
                    <p>Select a support ticket on the left to read messages and reply live.</p>
                  </div>
                ) : (
                  <>
                    {/* Thread Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ECEFEF] px-4 py-3 dark:border-[#202B2A]">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-display text-sm font-bold text-[#0E1715] dark:text-white">
                            {selectedSupportChat.offerSummary || selectedSupportChat.participants[0]}
                          </span>
                          <span className="rounded bg-[#E8F8EE] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#0B3B2E] dark:bg-[#152D21] dark:text-[#7FE85B]">
                            Live
                          </span>
                        </div>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-[#5C6665] dark:text-[#8E9B98]">
                          Thread ID: {selectedSupportChat.id} · Started{' '}
                          {new Date(selectedSupportChat.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="min-h-[280px] max-h-[360px] flex-1 space-y-2.5 overflow-y-auto p-4">
                      {selectedSupportMsgs.length === 0 ? (
                        <div className="py-12 text-center text-xs text-[#5C6665] dark:text-[#8E9B98]">
                          No messages in this support thread yet.
                        </div>
                      ) : (
                        selectedSupportMsgs.map((m) => {
                          const isSupportAdmin = m.senderUid === 'support_admin';
                          return (
                            <div
                              key={m.id}
                              className={`flex flex-col ${
                                isSupportAdmin ? 'items-end' : 'items-start'
                              }`}
                            >
                              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[#6C7775]">
                                <span>
                                  {isSupportAdmin ? 'OOSAB Support (You)' : m.sender || 'Client'}
                                </span>
                                <span className="font-mono text-[10px] opacity-75">
                                  {new Date(m.timestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <div
                                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                                  isSupportAdmin
                                    ? 'bg-[#0B3B2E] text-white dark:bg-[#7FE85B] dark:text-[#082213]'
                                    : 'border border-[#DCE2E1] bg-[#F8FAFA] text-[#0E1715] dark:border-[#263130] dark:bg-[#151D1C] dark:text-[#EDF3F2]'
                                }`}
                              >
                                {m.text}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={adminSupportBottomRef} />
                    </div>

                    {supportReplyError && (
                      <div className="mx-4 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                        {supportReplyError}
                      </div>
                    )}

                    {/* Quick Templates + Reply Composer */}
                    <div className="border-t border-[#ECEFEF] p-3 dark:border-[#202B2A]">
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {[
                          'Hi! Please share your username so we can check your account right away.',
                          'We are checking this now and will update you shortly.',
                        ].map((tpl) => (
                          <button
                            key={tpl}
                            type="button"
                            onClick={() => setSupportReplyText(tpl)}
                            className="rounded-md border border-[#DCE2E1] bg-[#F8FAFA] px-2 py-1 text-[10px] font-medium text-[#394241] hover:border-[#0B3B2E] dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#C5D1CF] dark:hover:border-[#7FE85B]"
                          >
                            {tpl}
                          </button>
                        ))}
                      </div>
                      <form onSubmit={handleAdminSendSupportReply} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={supportReplyText}
                          onChange={(e) => setSupportReplyText(e.target.value)}
                          maxLength={2000}
                          placeholder="Reply live to client as OOSAB Support..."
                          className="h-10 flex-1 rounded-lg border border-[#DCE2E1] bg-white px-3 text-xs text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#131A1A] dark:text-white"
                        />
                        <button
                          type="submit"
                          disabled={supportReplyBusy || !supportReplyText.trim()}
                          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-[#0B3B2E] px-3.5 text-xs font-semibold text-white hover:bg-[#082E24] disabled:opacity-50 dark:bg-[#7FE85B] dark:text-[#082213]"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>{supportReplyBusy ? 'Sending...' : 'Reply'}</span>
                        </button>
                      </form>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: Saved Website JSON Tables */}
        {vaultTab === 'tables' && (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-[#DCE2E1] bg-[#F8FAFA] p-3.5 dark:border-[#222E2C] dark:bg-[#0E1413]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0E1715] dark:text-white">
                    <Database className="h-3.5 w-3.5 text-[#0B3B2E] dark:text-[#7FE85B]" />
                    <span>Cloud Firestore Live Collections</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#5C6665] dark:text-[#8E9B98]">
                    Accounts, balances, custom ads, trades, direct chats &amp; profiles sync in real time across browsers in{' '}
                    <code className="rounded bg-[#E9EFEE] px-1 py-0.5 font-mono text-[10px] text-[#0E1715] dark:bg-[#1A2523] dark:text-[#7FE85B]">
                      Cloud Firestore
                    </code>
                    .
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => loadTablesSummary(true)}
                  disabled={tablesLoading}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#DCE2E1] bg-white px-2.5 text-xs font-semibold text-[#1E2726] hover:bg-[#F2F5F5] dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#DCE4E3] dark:hover:bg-[#1A2423]"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${tablesLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={handleRefreshLiveTables}
                  disabled={tablesLoading}
                  className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#0B3B2E] px-3 text-xs font-semibold text-white hover:bg-[#082E24] disabled:opacity-50 dark:bg-[#7FE85B] dark:text-[#082213] dark:hover:bg-[#6AD845]"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${tablesLoading ? 'animate-spin' : ''}`} />
                  <span>{tablesLoading ? 'Refreshing...' : 'Refresh Live Tables'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportTables}
                  className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#DCE2E1] bg-white px-3 text-xs font-semibold text-[#0E1715] hover:bg-[#F2F5F5] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white dark:hover:bg-[#1B2524]"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export Backup (.json)</span>
                </button>
                <button
                  type="button"
                  onClick={() => importInputRef.current?.click()}
                  disabled={importBusy}
                  className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#DCE2E1] bg-white px-3 text-xs font-semibold text-[#0E1715] hover:bg-[#F2F5F5] disabled:opacity-50 dark:border-[#263130] dark:bg-[#131A1A] dark:text-white dark:hover:bg-[#1B2524]"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{importBusy ? 'Restoring...' : 'Import Backup (.json)'}</span>
                </button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </div>

              {tablesStatus && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#8CE89E] bg-[#EAFBF0] px-3 py-2 text-xs font-medium text-[#0B3B2E] dark:border-[#1E4D33] dark:bg-[#112A1D] dark:text-[#7FE85B]">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>{tablesStatus}</span>
                </div>
              )}

              {tablesError && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  {tablesError}
                </div>
              )}
            </div>

            {/* Table Files Grid */}
            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-bold text-[#0E1715] dark:text-white">
                  Cloud Firestore Collections
                </span>
                <span className="font-mono text-[11px] text-[#5C6665] dark:text-[#8E9B98]">
                  {tablesSummary?.customOffersCount ?? 0} custom ad
                  {(tablesSummary?.customOffersCount ?? 0) === 1 ? '' : 's'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(tablesSummary?.tables ?? []).map((tbl) => (
                  <div
                    key={tbl.name}
                    className="rounded-xl border border-[#DCE2E1] bg-white p-2.5 dark:border-[#222E2C] dark:bg-[#0E1413]"
                  >
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#0E1715] dark:text-white">
                      <FileJson className="h-3.5 w-3.5 shrink-0 text-[#0B3B2E] dark:text-[#7FE85B]" />
                      <span className="truncate font-mono">{tbl.name}</span>
                    </div>
                    <div className="mt-1.5 flex items-baseline justify-between font-mono text-[11px] text-[#5C6665] dark:text-[#8E9B98]">
                      <span>{tbl.rows} rows</span>
                      <span>{formatBytes(tbl.sizeBytes)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Saved Accounts List */}
            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-bold text-[#0E1715] dark:text-white">
                  Saved Registered Accounts ({tablesSummary?.savedAccounts.length ?? 0})
                </span>
                <span className="text-[11px] text-[#5C6665] dark:text-[#8E9B98]">
                  Stored in Cloud Firestore (/users &amp; /traders)
                </span>
              </div>

              {(tablesSummary?.savedAccounts.length ?? 0) === 0 ? (
                <div className="rounded-xl border border-dashed border-[#DCE2E1] bg-[#F8FAFA] p-4 text-center text-xs text-[#5C6665] dark:border-[#24302F] dark:bg-[#0E1413] dark:text-[#8E9B98]">
                  No registered accounts loaded yet. Register or sign in to initialize your{' '}
                  <span className="font-mono text-[#0E1715] dark:text-white">/users</span> &amp;{' '}
                  <span className="font-mono text-[#0E1715] dark:text-white">/traders</span>{' '}
                  documents in Cloud Firestore.
                </div>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {tablesSummary?.savedAccounts.map((acc) => {
                    const approxUsd = Object.entries(acc.balances ?? {}).reduce(
                      (sum, [sym, amt]) =>
                        sum + Number(amt || 0) * (prices.usdPrices[sym as CryptoAsset] ?? 0),
                      0
                    );
                    const isSelf = user?.username.toLowerCase() === acc.username.toLowerCase();
                    return (
                      <div
                        key={acc.username}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#DCE2E1] bg-white px-3 py-2.5 dark:border-[#222E2C] dark:bg-[#0E1413]"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0E1715] dark:text-white">
                            <span>@{acc.username}</span>
                            {isSelf && (
                              <span className="rounded bg-[#E8F8EE] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#0B3B2E] dark:bg-[#152D21] dark:text-[#7FE85B]">
                                You
                              </span>
                            )}
                            {acc.verified && (
                              <span className="rounded bg-[#EFF6FF] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#1D4ED8] dark:bg-[#16233B] dark:text-[#93C5FD]">
                                Verified
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 font-mono text-[11px] text-[#5C6665] dark:text-[#8E9B98]">
                            {acc.tradesCount} trades · {acc.ratingPct}% trust · {acc.offersCount} ads ·{' '}
                            <strong className="text-[#0E1715] dark:text-[#DCE4E3]">
                              $
                              {approxUsd.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setTargetUsername(acc.username);
                              setVaultTab('accounts');
                            }}
                            className="h-8 rounded-lg border border-[#DCE2E1] bg-white px-2.5 text-[11px] font-semibold text-[#0E1715] hover:border-[#0B3B2E] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white dark:hover:border-[#7FE85B]"
                          >
                            Manage
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTargetUsername(acc.username);
                              setVaultTab('credit');
                            }}
                            className="h-8 rounded-lg border border-[#DCE2E1] bg-[#F8FAFA] px-2.5 text-[11px] font-semibold text-[#0E1715] hover:border-[#0B3B2E] dark:border-[#263130] dark:bg-[#131A1A] dark:text-white dark:hover:border-[#7FE85B]"
                          >
                            Credit
                          </button>
                          {onNavigateProfile && (
                            <button
                              type="button"
                              onClick={() => onNavigateProfile(acc.username)}
                              className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#DCE2E1] bg-white px-2.5 text-[11px] font-semibold text-[#1E2726] hover:bg-[#F2F5F5] dark:border-[#263130] dark:bg-[#131A1A] dark:text-[#DCE4E3] dark:hover:bg-[#1A2423]"
                            >
                              <span>/{acc.username}</span>
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-1">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-xl border border-[#DCE2E1] px-4 text-sm font-semibold text-[#1E2726] hover:bg-[#F5F7F7] dark:border-[#263130] dark:text-[#DCE4E3] dark:hover:bg-[#1A2423]"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {adminPreviewImageUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setAdminPreviewImageUrl(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-2xl bg-[#0E1715] p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setAdminPreviewImageUrl(null)}
              aria-label="Close picture preview"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={adminPreviewImageUrl}
              alt="Admin inspection preview"
              className="max-h-[85vh] w-auto max-w-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
