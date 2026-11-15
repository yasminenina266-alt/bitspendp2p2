import { Check, Copy, ShieldCheck, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, setToken } from '../api';
import type { UserAccount } from '../types';

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
  const [bio, setBio] = useState('');
  const [pgpKey, setPgpKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [provisioningStep, setProvisioningStep] = useState<number | null>(null);
  const [registeredUser, setRegisteredUser] = useState<UserAccount | null>(null);
  const [copiedPhrase, setCopiedPhrase] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const registrationSteps = [
    {
      title: 'Verifying handle availability',
      detail: `Checking @${username.trim() || 'handle'} across the P2P directory`,
      delayMs: 650,
    },
    {
      title: 'Deriving salted scrypt credentials',
      detail: 'Generating local salt and 64-byte scrypt password hash',
      delayMs: 900,
    },
    {
      title: pgpKey.trim()
        ? 'Validating PGP identity fingerprint'
        : 'Generating PGP identity fingerprint',
      detail: pgpKey.trim()
        ? 'Binding your provided PGP key to escrow terms'
        : 'Creating 40-character signing key fingerprint',
      delayMs: 850,
    },
    {
      title: 'Generating 12-word recovery seed',
      detail: 'Building offline recovery phrase for zero-email account access',
      delayMs: 800,
    },
    {
      title: 'Deriving multi-chain deposit addresses',
      detail: 'Initializing BTC, XMR, ETH, USDT, LTC, SOL & USDC wallet keys',
      delayMs: 1150,
    },
    {
      title: 'Finalizing escrow profile & session',
      detail: 'Registering zero-KYC trader profile and opening encrypted session',
      delayMs: 650,
    },
  ];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match. Please enter the same password twice.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'register') {
        setProvisioningStep(0);
        const [res] = await Promise.all([
          api.register({
            username,
            password,
            confirmPassword,
            pgpKey,
            bio,
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
      } else {
        const res = await api.login({ username, password });
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

  if (provisioningStep !== null) {
    const progressPct = Math.round(((provisioningStep + 1) / registrationSteps.length) * 100);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
        <div className="w-full max-w-md rounded-2xl border border-[#DCE2E1] bg-white p-6 shadow-xl dark:border-[#263130] dark:bg-[#131A1A]">
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
                {username.trim()}
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
            {registrationSteps.map((step, idx) => {
              const isDone = idx < provisioningStep;
              const isActive = idx === provisioningStep;
              return (
                <div
                  key={step.title}
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
                      {step.title}
                    </div>
                    {isActive && (
                      <div className="mt-0.5 text-[11px] text-[#5C6665] dark:text-[#98A4A2]">
                        {step.detail}
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
        <div className="w-full max-w-md rounded-2xl border border-[#DCE2E1] bg-white p-6 shadow-xl dark:border-[#263130] dark:bg-[#131A1A]">
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
                  Welcome, {registeredUser.username} · Wallet initialized & ready
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <p className="text-sm text-[#394241] dark:text-[#C5D1CF]">
              BitSpend P2P requires zero email, phone number, or ID. Save your 12-word recovery phrase below to recover your account if needed:
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
            Enter BitSpend P2P
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-2xl border border-[#DCE2E1] bg-white p-6 shadow-xl dark:border-[#263130] dark:bg-[#131A1A]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-[#0E1715] dark:text-white">
              {mode === 'register' ? 'Register on BitSpend P2P' : 'Sign in to BitSpend P2P'}
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
            <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
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
            <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="h-11 w-full rounded-xl border border-[#DCE2E1] bg-white px-3.5 text-sm text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#0D1313] dark:text-white dark:focus:border-[#7FE85B]"
            />
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="h-11 w-full rounded-xl border border-[#DCE2E1] bg-white px-3.5 text-sm text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#0D1313] dark:text-white dark:focus:border-[#7FE85B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
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
                <label className="block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF] mb-1.5">
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
              ? 'Processing...'
              : mode === 'register'
                ? 'Create Account (No KYC)'
                : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
