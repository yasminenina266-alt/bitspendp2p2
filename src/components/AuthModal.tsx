import { Check, Copy, ShieldCheck, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { api, setToken } from '../api';
import type { UserAccount } from '../types';
import { notifyDiscordEvent } from '../utils/discordWebhook';
import { AVATAR_PRESETS, processImageFile } from '../utils/profileMedia';
import { TraderAvatar } from './TraderAvatar';

interface AuthModalProps {
  initialMode: 'login' | 'register';
  onClose: () => void;
  onSuccess: (user: UserAccount) => void;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function AuthModal({ initialMode, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tagline, setTagline] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [pgpKey, setPgpKey] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [provisioningStep, setProvisioningStep] = useState<number | null>(null);
  const [registeredUser, setRegisteredUser] = useState<UserAccount | null>(null);
  const [copiedPhrase, setCopiedPhrase] = useState(false);

  const avatarFileRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const registrationSteps = [
    {
      title: 'Reserving handle in global directory',
      detail: `Claiming @${username.trim() || 'handle'} across the live P2P network`,
      delayMs: 500,
    },
    {
      title: 'Deriving salted PBKDF2 credentials',
      detail: 'Hashing password offline with 100,000 SHA-256 rounds (zero plaintext stored)',
      delayMs: 650,
    },
    {
      title: pgpKey.trim()
        ? 'Validating PGP identity fingerprint'
        : 'Generating PGP identity fingerprint',
      detail: pgpKey.trim()
        ? 'Binding your provided PGP key to escrow terms'
        : 'Creating 40-character signing key fingerprint',
      delayMs: 550,
    },
    {
      title: 'Generating 12-word recovery seed',
      detail: 'Building offline recovery phrase for zero-KYC password recovery',
      delayMs: 550,
    },
    {
      title: 'Deriving multi-chain deposit addresses',
      detail: 'Initializing BTC, XMR, ETH, USDT, LTC, SOL & USDC wallet keys',
      delayMs: 700,
    },
    {
      title: 'Publishing trader profile & opening vault',
      detail: 'Saving zero-KYC trader desk to Cloud Firestore for instant sync',
      delayMs: 500,
    },
  ];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setError('Enter both username and password.');
      return;
    }

    if (mode === 'register') {
      if (!/^[a-zA-Z0-9_]{3,24}$/.test(cleanUsername)) {
        setError('Username must be 3–24 characters using letters, numbers, or underscores only.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        setProvisioningStep(0);
        const [res] = await Promise.all([
          api.register({
            username: cleanUsername,
            password,
            confirmPassword,
            pgpKey,
            bio,
            avatarUrl,
            tagline,
          }),
          sleep(registrationSteps[0].delayMs),
        ]);
        if (!mountedRef.current) return;

        for (let idx = 1; idx < registrationSteps.length; idx++) {
          setProvisioningStep(idx);
          await sleep(registrationSteps[idx].delayMs);
          if (!mountedRef.current) return;
        }

        setToken(res.token);
        setProvisioningStep(null);
        setRegisteredUser(res.user);
        void notifyDiscordEvent({
          title: 'New User Registered',
          color: 0x7fe85b,
          fields: [
            { name: 'Username', value: res.user.username },
            { name: 'Created At', value: res.user.createdAt },
          ],
        });
      } else {
        const res = await api.login({ username: cleanUsername, password });
        if (!mountedRef.current) return;
        setToken(res.token);
        onSuccess(res.user);
        onClose();
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setProvisioningStep(null);
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleCopyPhrase = async () => {
    if (!registeredUser) return;
    try {
      await navigator.clipboard.writeText(registeredUser.recoveryPhrase);
      setCopiedPhrase(true);
      setTimeout(() => setCopiedPhrase(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleAvatarPicked = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const processed = await processImageFile(file, {
        maxWidth: 256,
        maxHeight: 256,
        square: true,
        quality: 0.85,
      });
      setAvatarUrl(processed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load image');
    }
  };

  if (provisioningStep !== null) {
    const progressPct = Math.round(((provisioningStep + 1) / registrationSteps.length) * 100);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-[2px]">
        <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#DCE2E1] bg-white p-4 shadow-xl sm:p-6 dark:border-[#263130] dark:bg-[#131A1A]">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-[#0E1715] dark:text-white">
                Setting Up Your Account
              </h2>
              <span className="font-mono text-xs font-semibold tabular-nums text-[#0B3B2E] dark:text-[#7FE85B]">
                Step {provisioningStep + 1} of {registrationSteps.length}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#5C6665] dark:text-[#98A4A2]">
              Initializing keys, recovery phrase, and multi-chain deposit addresses for{' '}
              <span className="font-mono font-semibold text-[#0E1715] dark:text-white">
                @{username.trim()}
              </span>
            </p>
          </div>

          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[#ECEFEF] dark:bg-[#202B2A]">
            <div
              className="h-full rounded-full bg-[#0B3B2E] transition-all duration-500 ease-out dark:bg-[#7FE85B]"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="mt-5 space-y-2.5">
            {registrationSteps.map((s, idx) => {
              const isDone = idx < provisioningStep;
              const isActive = idx === provisioningStep;
              return (
                <div
                  key={s.title}
                  className={`flex items-start gap-3 rounded-xl border px-3.5 py-2.5 transition-colors ${
                    isActive
                      ? 'border-[#0B3B2E]/30 bg-[#EEF6F2] dark:border-[#7FE85B]/30 dark:bg-[#152B20]'
                      : isDone
                        ? 'border-[#E6EAEA] bg-[#F8FAFA] dark:border-[#202B2A] dark:bg-[#0F1515]'
                        : 'border-transparent bg-transparent opacity-50'
                  }`}
                >
                  <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center">
                    {isDone ? (
                      <Check className="h-4 w-4 text-[#0D6832] dark:text-[#7FE85B]" />
                    ) : isActive ? (
                      <span className="h-2 w-2 rounded-full bg-[#0B3B2E] animate-pulse dark:bg-[#7FE85B]" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#9CA8A6] dark:bg-[#4B5856]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-xs font-semibold ${
                        isActive
                          ? 'text-[#0E1715] dark:text-white'
                          : isDone
                            ? 'text-[#394241] dark:text-[#C5D1CF]'
                            : 'text-[#64706E] dark:text-[#8E9B98]'
                      }`}
                    >
                      {s.title}
                    </div>
                    {isActive && (
                      <div className="mt-0.5 text-[11px] text-[#5C6665] dark:text-[#98A4A2]">
                        {s.detail}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (registeredUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-[2px]">
        <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#DCE2E1] bg-white p-4 shadow-xl sm:p-6 dark:border-[#263130] dark:bg-[#131A1A]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E3F7EB] text-[#0D6832] dark:bg-[#143322] dark:text-[#7FE85B]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-[#0E1715] dark:text-white">
                  Account Created
                </h2>
                <p className="text-xs text-[#5C6665] dark:text-[#98A4A2]">
                  Welcome, @{registeredUser.username} · Wallet initialized &amp; ready
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <p className="text-sm text-[#394241] dark:text-[#C5D1CF]">
              Since OOSAB does not collect email addresses or IDs, save this 12-word recovery phrase offline:
            </p>

            <div className="rounded-xl border border-[#DCE2E1] bg-[#F6F8F8] p-4 dark:border-[#24302E] dark:bg-[#0D1313]">
              <p className="font-mono text-sm leading-relaxed text-[#0E1715] dark:text-[#EDF3F2]">
                {registeredUser.recoveryPhrase}
              </p>
              <button
                type="button"
                onClick={handleCopyPhrase}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B3B2E] hover:underline dark:text-[#7FE85B]"
              >
                {copiedPhrase ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedPhrase ? 'Copied to clipboard' : 'Copy recovery phrase'}</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onSuccess(registeredUser);
              onClose();
            }}
            className="mt-6 w-full rounded-xl bg-[#7FE85B] py-3 text-sm font-semibold text-[#082213] hover:bg-[#6AD845] transition-colors"
          >
            Enter OOSAB
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-[2px]">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#DCE2E1] bg-white p-4 shadow-xl sm:p-6 dark:border-[#263130] dark:bg-[#131A1A]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-[#0E1715] dark:text-white">
              {mode === 'register' ? 'Register on OOSAB' : 'Sign in to OOSAB'}
            </h2>
            <p className="mt-0.5 text-xs text-[#5C6665] dark:text-[#98A4A2]">
              No email · No phone · No KYC or identification required
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-[#5C6665] hover:bg-[#F1F4F3] dark:text-[#98A4A2] dark:hover:bg-[#1E2927]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Switch */}
        <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-[#E3E7E7] bg-[#F5F7F7] p-1 dark:border-[#24302E] dark:bg-[#0E1414]">
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
            }}
            className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
              mode === 'register'
                ? 'bg-white text-[#0E1715] shadow-xs dark:bg-[#1C2625] dark:text-white'
                : 'text-[#5C6665] hover:text-[#111917] dark:text-[#98A4A2]'
            }`}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
              mode === 'login'
                ? 'bg-white text-[#0E1715] shadow-xs dark:bg-[#1C2625] dark:text-white'
                : 'text-[#5C6665] hover:text-[#111917] dark:text-[#98A4A2]'
            }`}
          >
            Sign in
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
              Handle / Username
            </label>
            <input
              type="text"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. cipher_xmr"
              className="h-11 w-full rounded-xl border border-[#DCE2E1] bg-white px-3.5 text-sm text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#0D1313] dark:text-white dark:focus:border-[#7FE85B]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'Minimum 6 characters' : 'Enter password'}
              className="h-11 w-full rounded-xl border border-[#DCE2E1] bg-white px-3.5 text-sm text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#0D1313] dark:text-white dark:focus:border-[#7FE85B]"
            />
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="h-11 w-full rounded-xl border border-[#DCE2E1] bg-white px-3.5 text-sm text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#0D1313] dark:text-white dark:focus:border-[#7FE85B]"
                />
              </div>

              <div className="rounded-xl border border-[#E6EAEA] bg-[#F8FAFA] p-3 dark:border-[#222C2B] dark:bg-[#0F1515]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <TraderAvatar
                      username={username.trim() || 'OO'}
                      avatarUrl={avatarUrl}
                      size={44}
                      rounded="xl"
                    />
                    <div>
                      <div className="text-xs font-semibold text-[#0E1715] dark:text-white">
                        Profile Picture (optional)
                      </div>
                      <div className="text-[11px] text-[#5C6665] dark:text-[#8E9B98]">
                        Upload a photo or pick an icon
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={avatarFileRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarPicked}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => avatarFileRef.current?.click()}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#DCE2E1] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#0E1715] hover:bg-[#EEF6F2] dark:border-[#263130] dark:bg-[#16201F] dark:text-white"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Upload</span>
                    </button>
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {AVATAR_PRESETS.slice(0, 5).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setAvatarUrl(p.url)}
                      className={`rounded-lg p-0.5 ${
                        avatarUrl === p.url
                          ? 'ring-2 ring-[#0B3B2E] dark:ring-[#7FE85B]'
                          : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      <img src={p.url} alt={p.label} className="h-7 w-7 rounded-md object-cover" />
                    </button>
                  ))}
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('')}
                      className="ml-auto text-[11px] font-medium text-[#5C6665] hover:text-red-600 dark:text-[#8E9B98]"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
                  Headline / Tagline (optional)
                </label>
                <input
                  type="text"
                  maxLength={90}
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Instant Zelle & Monero Desk"
                  className="h-11 w-full rounded-xl border border-[#DCE2E1] bg-white px-3.5 text-sm text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#0D1313] dark:text-white dark:focus:border-[#7FE85B]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
                  Public Bio (optional)
                </label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Preferred trading hours or payment notes"
                  className="h-11 w-full rounded-xl border border-[#DCE2E1] bg-white px-3.5 text-sm text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#0D1313] dark:text-white dark:focus:border-[#7FE85B]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
                  PGP Fingerprint (optional — auto-generated if blank)
                </label>
                <input
                  type="text"
                  value={pgpKey}
                  onChange={(e) => setPgpKey(e.target.value)}
                  placeholder="Optional 40-char PGP fingerprint"
                  className="h-11 w-full rounded-xl border border-[#DCE2E1] bg-white px-3.5 font-mono text-xs text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#0D1313] dark:text-white dark:focus:border-[#7FE85B]"
                />
              </div>
            </>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#0B3B2E] py-3 text-sm font-semibold text-white hover:bg-[#082B21] disabled:opacity-60 dark:bg-[#7FE85B] dark:text-[#082213] dark:hover:bg-[#6AD845] transition-colors"
          >
            {loading
              ? 'Please wait...'
              : mode === 'register'
                ? 'Create Account (No KYC)'
                : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
