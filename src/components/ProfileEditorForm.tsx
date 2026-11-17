import { Camera, Check, ImagePlus, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { api } from '../api';
import { PAYMENT_METHODS } from '../constants/market';
import type { ProfileThemeId, TraderProfile, UserAccount } from '../types';
import {
  AVATAR_PRESETS,
  COMMON_LANGUAGES,
  PROFILE_THEMES,
  isSafeImageUrl,
  processImageFile,
} from '../utils/profileMedia';
import { TraderAvatar } from './TraderAvatar';

interface ProfileEditorFormProps {
  user: UserAccount;
  onSaved: (user: UserAccount, trader?: TraderProfile) => void;
  onCancel?: () => void;
  compact?: boolean;
}

const POPULAR_RAILS = [
  'Bank Transfer',
  'SEPA Instant',
  'Zelle',
  'Wise',
  'Revolut',
  'PayPal',
  'Apple Pay',
  'Virtual Visa Card',
  'Amazon Gift Card',
  'Steam Gift Card',
  'M-Pesa',
  'PIX',
  'UPI',
  'GCash',
];

export function ProfileEditorForm({
  user,
  onSaved,
  onCancel,
  compact = false,
}: ProfileEditorFormProps) {
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? '');
  const [bannerUrl, setBannerUrl] = useState(user.bannerUrl ?? '');
  const [accentTheme, setAccentTheme] = useState<ProfileThemeId>(user.accentTheme ?? 'emerald');
  const [tagline, setTagline] = useState(user.tagline ?? '');
  const [location, setLocation] = useState(user.location ?? '');
  const [tradingHours, setTradingHours] = useState(user.tradingHours ?? '');
  const [languages, setLanguages] = useState<string[]>(
    user.languages && user.languages.length > 0 ? user.languages : ['English']
  );
  const [preferredMethods, setPreferredMethods] = useState<string[]>(
    user.preferredMethods ?? []
  );
  const [bio, setBio] = useState(user.bio ?? '');
  const [pgpKey, setPgpKey] = useState(user.pgpKey ?? '');
  const [methodSearch, setMethodSearch] = useState('');

  const [busyAvatar, setBusyAvatar] = useState(false);
  const [busyBanner, setBusyBanner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [error, setError] = useState('');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAvatarUrl(user.avatarUrl ?? '');
    setBannerUrl(user.bannerUrl ?? '');
    setAccentTheme(user.accentTheme ?? 'emerald');
    setTagline(user.tagline ?? '');
    setLocation(user.location ?? '');
    setTradingHours(user.tradingHours ?? '');
    setLanguages(user.languages && user.languages.length > 0 ? user.languages : ['English']);
    setPreferredMethods(user.preferredMethods ?? []);
    setBio(user.bio ?? '');
    setPgpKey(user.pgpKey ?? '');
  }, [user]);

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setBusyAvatar(true);
    try {
      const processed = await processImageFile(file, {
        maxWidth: 256,
        maxHeight: 256,
        square: true,
        quality: 0.86,
      });
      setAvatarUrl(processed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process profile image.');
    } finally {
      setBusyAvatar(false);
    }
  };

  const handleBannerUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setBusyBanner(true);
    try {
      const processed = await processImageFile(file, {
        maxWidth: 1200,
        maxHeight: 320,
        square: false,
        quality: 0.82,
      });
      setBannerUrl(processed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process banner image.');
    } finally {
      setBusyBanner(false);
    }
  };

  const toggleLanguage = (lang: string) => {
    setLanguages((prev) => {
      if (prev.includes(lang)) {
        if (prev.length === 1) return prev; // Keep at least 1 language
        return prev.filter((l) => l !== lang);
      }
      if (prev.length >= 6) return prev;
      return [...prev, lang];
    });
  };

  const toggleMethod = (method: string) => {
    setPreferredMethods((prev) => {
      if (prev.includes(method)) return prev.filter((m) => m !== method);
      if (prev.length >= 6) return prev;
      return [...prev, method];
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSavedMsg(false);

    if (avatarUrl.trim() && !isSafeImageUrl(avatarUrl)) {
      setError('Profile image URL must start with https:// or be an uploaded image.');
      return;
    }
    if (bannerUrl.trim() && !isSafeImageUrl(bannerUrl)) {
      setError('Banner image URL must start with https:// or be an uploaded image.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.updateProfile({
        avatarUrl: avatarUrl.trim(),
        bannerUrl: bannerUrl.trim(),
        accentTheme,
        tagline,
        location,
        tradingHours,
        languages,
        preferredMethods,
        bio,
        pgpKey,
      });
      onSaved(res.user, res.trader);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const themeCfg = PROFILE_THEMES[accentTheme] ?? PROFILE_THEMES.emerald;
  const showBannerImg = isSafeImageUrl(bannerUrl);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Live Cover + Avatar Preview */}
      <div className="overflow-hidden rounded-2xl border border-[#DCE2E1] bg-[#F8FAFA] dark:border-[#24302E] dark:bg-[#0F1515]">
        <div
          className={`relative h-28 w-full overflow-hidden bg-gradient-to-r ${themeCfg.bannerGradient}`}
        >
          {showBannerImg && (
            <img
              src={bannerUrl}
              alt="Profile cover preview"
              className="h-full w-full object-cover"
            />
          )}
          <div className="absolute right-3 top-3 flex items-center gap-1.5">
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              onChange={handleBannerUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              disabled={busyBanner}
              className="inline-flex items-center gap-1 rounded-lg bg-black/55 px-2.5 py-1.5 text-[11px] font-semibold text-white backdrop-blur-xs hover:bg-black/75"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              <span>{busyBanner ? 'Resizing...' : bannerUrl ? 'Change Cover' : 'Add Cover Photo'}</span>
            </button>
            {bannerUrl && (
              <button
                type="button"
                onClick={() => setBannerUrl('')}
                aria-label="Remove cover photo"
                className="rounded-lg bg-black/55 p-1.5 text-white hover:bg-red-600/90"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 px-4 pb-4 pt-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-3.5">
            <div className="-mt-11 relative rounded-2xl ring-4 ring-[#F8FAFA] dark:ring-[#0F1515]">
              <TraderAvatar
                username={user.username}
                avatarUrl={avatarUrl}
                accentTheme={accentTheme}
                size={68}
                rounded="2xl"
              />
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={busyAvatar}
                title="Upload profile photo"
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-[#DCE2E1] bg-white text-[#0B3B2E] shadow-xs hover:bg-[#EEF6F2] dark:border-[#2A3735] dark:bg-[#172120] dark:text-[#7FE85B]"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="min-w-0 pb-0.5">
              <div className="font-display text-base font-bold text-[#0E1715] dark:text-white">
                @{user.username}
              </div>
              <div className="truncate text-xs text-[#5C6665] dark:text-[#98A4A2]">
                {tagline.trim() || 'Add a short headline or trading specialty below'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={busyAvatar}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#DCE2E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#1E2726] hover:bg-[#F1F4F3] dark:border-[#263130] dark:bg-[#141C1B] dark:text-[#DCE4E3] dark:hover:bg-[#1C2625]"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>{busyAvatar ? 'Uploading...' : 'Upload Photo'}</span>
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl('')}
                className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-[#DCE2E1] bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-[#263130] dark:bg-[#141C1B] dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Avatar Quick Presets + Image URL */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
            Avatar Presets
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {AVATAR_PRESETS.map((preset) => {
              const selected = avatarUrl === preset.url;
              return (
                <button
                  key={preset.id}
                  type="button"
                  title={preset.label}
                  onClick={() => setAvatarUrl(preset.url)}
                  className={`rounded-xl p-0.5 transition-all ${
                    selected
                      ? 'ring-2 ring-[#0B3B2E] dark:ring-[#7FE85B]'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  <img
                    src={preset.url}
                    alt={preset.label}
                    className="h-9 w-9 rounded-lg object-cover"
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
            Profile Accent Theme
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(PROFILE_THEMES) as ProfileThemeId[]).map((tid) => {
              const t = PROFILE_THEMES[tid];
              const active = accentTheme === tid;
              return (
                <button
                  key={tid}
                  type="button"
                  onClick={() => setAccentTheme(tid)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? 'border-[#0B3B2E] bg-[#EEF6F2] text-[#0B3B2E] dark:border-[#7FE85B] dark:bg-[#152B20] dark:text-[#7FE85B]'
                      : 'border-[#DCE2E1] bg-white text-[#4B5554] hover:bg-[#F5F7F7] dark:border-[#263130] dark:bg-[#0D1313] dark:text-[#98A4A2]'
                  }`}
                >
                  <span
                    style={{ backgroundColor: t.swatch }}
                    className="h-3 w-3 rounded-full border border-black/15"
                  />
                  <span>{t.label.split(' ')[1] || t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Optional Direct Image URLs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
            Profile Image URL (optional)
          </label>
          <input
            type="text"
            value={avatarUrl.startsWith('data:') ? '' : avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder={
              avatarUrl.startsWith('data:')
                ? 'Uploaded image ready (or paste https:// URL)'
                : 'https://example.com/avatar.jpg'
            }
            className="h-10 w-full rounded-xl border border-[#DCE2E1] bg-white px-3 text-xs text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
            Cover Banner URL (optional)
          </label>
          <input
            type="text"
            value={bannerUrl.startsWith('data:') ? '' : bannerUrl}
            onChange={(e) => setBannerUrl(e.target.value)}
            placeholder={
              bannerUrl.startsWith('data:')
                ? 'Uploaded cover ready (or paste https:// URL)'
                : 'https://example.com/banner.jpg'
            }
            className="h-10 w-full rounded-xl border border-[#DCE2E1] bg-white px-3 text-xs text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
          />
        </div>
      </div>

      {/* Tagline, Location & Hours */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <label className="mb-1 block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
            Profile Headline / Tagline
          </label>
          <input
            type="text"
            maxLength={90}
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="e.g. Fast XMR & Zelle Desk · Zero-KYC Peer Settlements"
            className="h-10 w-full rounded-xl border border-[#DCE2E1] bg-white px-3 text-sm text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
          />
        </div>
        <div className="sm:col-span-1">
          <label className="mb-1 block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
            Region / Timezone
          </label>
          <input
            type="text"
            maxLength={60}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. North America · EST"
            className="h-10 w-full rounded-xl border border-[#DCE2E1] bg-white px-3 text-xs text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
            Trading Hours
          </label>
          <input
            type="text"
            maxLength={60}
            value={tradingHours}
            onChange={(e) => setTradingHours(e.target.value)}
            placeholder="e.g. Daily · 08:00–23:00 EST (Avg release ~5m)"
            className="h-10 w-full rounded-xl border border-[#DCE2E1] bg-white px-3 text-xs text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
          />
        </div>
      </div>

      {/* Bio */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
          Public Bio
        </label>
        <textarea
          rows={compact ? 2 : 3}
          maxLength={320}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell counterparties about your payment instructions, speed, and privacy preferences."
          className="w-full rounded-xl border border-[#DCE2E1] bg-white p-3 text-sm text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
        />
      </div>

      {/* Languages */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
          Languages Spoken ({languages.length}/6)
        </label>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_LANGUAGES.map((lang) => {
            const active = languages.includes(lang);
            return (
              <button
                key={lang}
                type="button"
                onClick={() => toggleLanguage(lang)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'border-[#0B3B2E] bg-[#EEF6F2] text-[#0B3B2E] dark:border-[#7FE85B] dark:bg-[#152B20] dark:text-[#7FE85B]'
                    : 'border-[#DCE2E1] bg-white text-[#5C6665] hover:bg-[#F5F7F7] dark:border-[#263130] dark:bg-[#0D1313] dark:text-[#98A4A2]'
                }`}
              >
                {lang}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preferred Payment Rails */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
          Preferred Payment Methods ({preferredMethods.length}/6)
        </label>
        <input
          type="text"
          value={methodSearch}
          onChange={(e) => setMethodSearch(e.target.value)}
          placeholder={`Search ${PAYMENT_METHODS.length}+ methods (e.g. Virtual Visa, M-Pesa, Steam, BLIK)...`}
          className="mb-2 h-9 w-full rounded-lg border border-[#DCE2E1] bg-white px-3 text-xs text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
        />
        <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto pr-1">
          {(methodSearch.trim()
            ? PAYMENT_METHODS.filter((m) => {
                const q = methodSearch.trim().toLowerCase();
                return (
                  m.name.toLowerCase().includes(q) ||
                  m.category.toLowerCase().includes(q) ||
                  (m.region ?? '').toLowerCase().includes(q)
                );
              })
                .slice(0, 24)
                .map((m) => m.name)
            : Array.from(new Set([...preferredMethods, ...POPULAR_RAILS]))
          ).map((pm) => {
            const active = preferredMethods.includes(pm);
            return (
              <button
                key={pm}
                type="button"
                onClick={() => toggleMethod(pm)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'border-[#0B3B2E] bg-[#EEF6F2] text-[#0B3B2E] dark:border-[#7FE85B] dark:bg-[#152B20] dark:text-[#7FE85B]'
                    : 'border-[#DCE2E1] bg-white text-[#5C6665] hover:bg-[#F5F7F7] dark:border-[#263130] dark:bg-[#0D1313] dark:text-[#98A4A2]'
                }`}
              >
                {pm}
              </button>
            );
          })}
        </div>
      </div>

      {/* PGP Fingerprint */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-[#394241] dark:text-[#C5D1CF]">
          PGP Fingerprint
        </label>
        <input
          type="text"
          value={pgpKey}
          onChange={(e) => setPgpKey(e.target.value)}
          className="h-10 w-full rounded-xl border border-[#DCE2E1] bg-white px-3 font-mono text-xs text-[#0E1715] focus:border-[#0B3B2E] focus:outline-none dark:border-[#263130] dark:bg-[#0D1313] dark:text-white"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ECEFEF] pt-4 dark:border-[#202B2A]">
        <div>
          {savedMsg && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D6832] dark:text-[#7FE85B]">
              <Check className="h-3.5 w-3.5" />
              <span>Public profile updated</span>
            </span>
          )}
        </div>
        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[42px] rounded-xl border border-[#DCE2E1] px-4 py-2 text-xs font-semibold text-[#4B5554] hover:bg-[#F5F7F7] dark:border-[#263130] dark:text-[#98A4A2] dark:hover:bg-[#1B2524]"
            >
              Close
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="min-h-[42px] w-full rounded-xl bg-[#7FE85B] px-6 py-2 text-sm font-semibold text-[#082213] hover:bg-[#6AD845] disabled:opacity-60 sm:w-auto"
          >
            {saving ? 'Saving Profile...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </form>
  );
}
