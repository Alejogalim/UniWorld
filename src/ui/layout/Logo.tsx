import { useTheme } from '@/app/theme';
import { cn } from '@/lib/utils';
import lightLogo from '@/assets/logo/uniworld-logo-light.svg';
import darkLogo from '@/assets/logo/uniworld-logo-dark.svg';

/** The UniWorld mark. The dark-ground version shows in dark theme, the light-ground version otherwise. */
export function Logo({ className }: { className?: string }) {
  const resolved = useTheme((s) => s.resolved);
  return (
    <img
      src={resolved === 'dark' ? darkLogo : lightLogo}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={cn('shrink-0 rounded-control', className)}
    />
  );
}
