import { useTheme } from '@/app/theme';
import { cn } from '@/lib/utils';
import lightMark from '@/assets/logo/uniworld-mark-light.svg';
import darkMark from '@/assets/logo/uniworld-mark-dark.svg';

/** The UniWorld mark, transparent and cropped for UI use. The dark-ground version shows in dark theme, the light-ground version otherwise. */
export function Logo({ className }: { className?: string }) {
  const resolved = useTheme((s) => s.resolved);
  return (
    <img
      src={resolved === 'dark' ? darkMark : lightMark}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={cn('shrink-0', className)}
    />
  );
}
