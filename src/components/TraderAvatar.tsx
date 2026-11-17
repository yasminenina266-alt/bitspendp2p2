import { useEffect, useState } from 'react';
import type { ProfileThemeId } from '../types';
import { PROFILE_THEMES, isSafeImageUrl } from '../utils/profileMedia';

interface TraderAvatarProps {
  username: string;
  avatarUrl?: string;
  accentTheme?: ProfileThemeId;
  size?: number;
  online?: boolean;
  rounded?: 'xl' | '2xl' | 'full' | 'lg';
  className?: string;
}

export function TraderAvatar({
  username,
  avatarUrl,
  accentTheme = 'emerald',
  size = 40,
  online = false,
  rounded = 'xl',
  className = '',
}: TraderAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [avatarUrl]);

  const theme = PROFILE_THEMES[accentTheme] ?? PROFILE_THEMES.emerald;
  const showImage = !imgFailed && isSafeImageUrl(avatarUrl);
  const roundedClass =
    rounded === 'full'
      ? 'rounded-full'
      : rounded === '2xl'
        ? 'rounded-2xl'
        : rounded === 'lg'
          ? 'rounded-lg'
          : 'rounded-xl';

  const initials = (username || 'OO').slice(0, 2).toUpperCase();
  const fontSize = Math.max(10, Math.round(size * 0.34));
  const dotSize = size >= 64 ? 'h-3.5 w-3.5' : size >= 34 ? 'h-2.5 w-2.5' : 'h-2 w-2';

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0 select-none ${className}`}
    >
      {showImage ? (
        <img
          src={avatarUrl}
          alt={`${username} avatar`}
          onError={() => setImgFailed(true)}
          className={`h-full w-full ${roundedClass} border border-black/10 object-cover dark:border-white/15`}
        />
      ) : (
        <div
          style={{ fontSize }}
          className={`flex h-full w-full items-center justify-center ${roundedClass} ${theme.avatarBg} ${theme.avatarText} font-display font-bold tracking-tight`}
        >
          {initials}
        </div>
      )}

      {online && (
        <span
          title={`${username} is online`}
          className={`absolute -bottom-0.5 -right-0.5 ${dotSize} rounded-full border-2 border-white bg-[#16A34A] dark:border-[#131A1A] dark:bg-[#7FE85B]`}
        />
      )}
    </div>
  );
}
