import type { ProfileThemeId } from '../types';

export interface ProfileThemeConfig {
  id: ProfileThemeId;
  label: string;
  bannerGradient: string;
  avatarBg: string;
  avatarText: string;
  swatch: string;
}

export const PROFILE_THEMES: Record<ProfileThemeId, ProfileThemeConfig> = {
  emerald: {
    id: 'emerald',
    label: 'Forest Emerald',
    bannerGradient: 'from-[#0B3B2E] via-[#125341] to-[#1F6F54]',
    avatarBg: 'bg-[#0B3B2E] dark:bg-[#163427]',
    avatarText: 'text-[#7FE85B]',
    swatch: '#0B3B2E',
  },
  midnight: {
    id: 'midnight',
    label: 'Midnight Blue',
    bannerGradient: 'from-[#0F172A] via-[#1E293B] to-[#0F4C5C]',
    avatarBg: 'bg-[#1E293B] dark:bg-[#1A2639]',
    avatarText: 'text-[#7DD3FC]',
    swatch: '#1E293B',
  },
  amber: {
    id: 'amber',
    label: 'Bitcoin Amber',
    bannerGradient: 'from-[#451A03] via-[#78350F] to-[#B45309]',
    avatarBg: 'bg-[#78350F] dark:bg-[#3A220B]',
    avatarText: 'text-[#FCD34D]',
    swatch: '#B45309',
  },
  violet: {
    id: 'violet',
    label: 'Cipher Violet',
    bannerGradient: 'from-[#2E1065] via-[#4C1D95] to-[#6D28D9]',
    avatarBg: 'bg-[#4C1D95] dark:bg-[#2B174D]',
    avatarText: 'text-[#DDD6FE]',
    swatch: '#6D28D9',
  },
  slate: {
    id: 'slate',
    label: 'Monolith Slate',
    bannerGradient: 'from-[#18181B] via-[#27272A] to-[#3F3F46]',
    avatarBg: 'bg-[#27272A] dark:bg-[#22252A]',
    avatarText: 'text-[#E4E4E7]',
    swatch: '#3F3F46',
  },
};

function encodeSvgDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export const AVATAR_PRESETS: { id: string; label: string; url: string }[] = [
  {
    id: 'vault',
    label: 'Emerald Vault',
    url: encodeSvgDataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0B3B2E"/><stop offset="100%" stop-color="#1D6B52"/></linearGradient></defs><rect width="128" height="128" rx="28" fill="url(#g1)"/><circle cx="64" cy="64" r="34" fill="none" stroke="#7FE85B" stroke-width="8" stroke-dasharray="150 64"/><rect x="52" y="52" width="24" height="24" rx="5" transform="rotate(45 64 64)" fill="#7FE85B"/></svg>`
    ),
  },
  {
    id: 'cipher',
    label: 'Cipher Grid',
    url: encodeSvgDataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#0F172A"/><path d="M24 40h80M24 64h80M24 88h80M40 24v80M64 24v80M88 24v80" stroke="#1E293B" stroke-width="3"/><circle cx="64" cy="64" r="26" fill="#0EA5E9" fill-opacity="0.22" stroke="#38BDF8" stroke-width="5"/><circle cx="64" cy="64" r="9" fill="#38BDF8"/></svg>`
    ),
  },
  {
    id: 'amber_orb',
    label: 'Sovereign Gold',
    url: encodeSvgDataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="g3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#451A03"/><stop offset="100%" stop-color="#B45309"/></linearGradient></defs><rect width="128" height="128" rx="28" fill="url(#g3)"/><polygon points="64,22 102,64 64,106 26,64" fill="none" stroke="#FCD34D" stroke-width="6"/><circle cx="64" cy="64" r="14" fill="#FDE68A"/></svg>`
    ),
  },
  {
    id: 'prism',
    label: 'Monero Prism',
    url: encodeSvgDataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#18181B"/><circle cx="64" cy="64" r="38" fill="#27272A" stroke="#F97316" stroke-width="6"/><path d="M36 78V48l28 28 28-28v30" fill="none" stroke="#FDBA74" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    ),
  },
  {
    id: 'nebula',
    label: 'Obsidian Wave',
    url: encodeSvgDataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="g5" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#2E1065"/><stop offset="100%" stop-color="#6D28D9"/></linearGradient></defs><rect width="128" height="128" rx="28" fill="url(#g5)"/><path d="M20 80 Q 44 40, 64 64 T 108 48" fill="none" stroke="#DDD6FE" stroke-width="7" stroke-linecap="round"/><circle cx="64" cy="64" r="10" fill="#A78BFA"/></svg>`
    ),
  },
  {
    id: 'minimal',
    label: 'Clean Emerald',
    url: encodeSvgDataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#ECFDF5"/><circle cx="64" cy="50" r="20" fill="#0B3B2E"/><path d="M28 106c6-20 20-30 36-30s30 10 36 30" fill="#10B981"/></svg>`
    ),
  },
];

export const COMMON_LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Arabic',
  'Portuguese',
  'Japanese',
  'Chinese',
  'Hindi',
  'Turkish',
  'Italian',
  'Russian',
];

export function isSafeImageUrl(value?: string): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^https?:\/\/\S+/i.test(trimmed)) return true;
  if (/^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,[a-zA-Z0-9+/=]+$/i.test(trimmed)) {
    return trimmed.length <= 450_000;
  }
  return false;
}

export function processImageFile(
  file: File,
  opts: { maxWidth: number; maxHeight: number; square?: boolean; quality?: number }
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select a PNG, JPEG, WebP, or GIF image file.'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error('Image file must be smaller than 10 MB.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid or corrupted image file.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Browser canvas is unavailable.'));
          return;
        }

        if (opts.square) {
          const targetSize = opts.maxWidth;
          canvas.width = targetSize;
          canvas.height = targetSize;
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetSize, targetSize);
        } else {
          const targetRatio = opts.maxWidth / opts.maxHeight;
          const srcRatio = img.width / img.height;
          let sx = 0;
          let sy = 0;
          let sw = img.width;
          let sh = img.height;
          if (srcRatio > targetRatio) {
            sw = img.height * targetRatio;
            sx = (img.width - sw) / 2;
          } else {
            sh = img.width / targetRatio;
            sy = (img.height - sh) / 2;
          }
          const outW = Math.min(opts.maxWidth, Math.round(sw));
          const outH = Math.round(outW / targetRatio);
          canvas.width = outW;
          canvas.height = outH;
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
        }

        const quality = opts.quality ?? 0.84;
        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
