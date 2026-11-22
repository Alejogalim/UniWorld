import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation, useOutlet } from 'react-router';
import { ListChecks, MessageCircle, Globe, Settings, Sparkles, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { useProfile } from '@/store/profile';
import { initStars, useStars } from '@/app/stars';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';
import { StarsSwitcher } from './StarsSwitcher';
import { Starfield } from './Starfield';

const NAV: { to: string; key: string; titleKey: string; icon: LucideIcon }[] = [
  { to: '/onboarding', key: 'nav.onboarding', titleKey: 'screens.onboarding', icon: Sparkles },
  { to: '/counselor', key: 'nav.counselor', titleKey: 'screens.counselor', icon: MessageCircle },
  { to: '/finder', key: 'nav.finder', titleKey: 'screens.finder', icon: Globe },
  { to: '/my-unis', key: 'nav.myUnis', titleKey: 'screens.myUnis', icon: ListChecks },
  { to: '/settings', key: 'nav.settings', titleKey: 'screens.settings', icon: Settings },
];

/**
 * Four quadrants: logo corner | top bar (page title), sidebar | content.
 * The two left cells carry the same rail surface, so it reads as one column.
 */
export function AppShell() {
  const { t } = useTranslation('common');
  const location = useLocation();
  const outlet = useOutlet();
  const reduceMotion = useReducedMotion();
  const hasProfile = useProfile((s) => s.profile !== null);
  const active = NAV.find((item) => location.pathname.startsWith(item.to));
  // Onboarding is the first-run step; once a profile exists it is no longer a destination.
  const visibleNav = NAV.filter((item) => !(hasProfile && item.to === '/onboarding'));
  const starsOn = useStars((s) => s.on);

  useEffect(() => {
    initStars();
  }, []);

  // The counselor screen owns a right sidebar; the title is centered in what is left of it.
  const rightRail = location.pathname.startsWith('/counselor');

  return (
    <div className="isolate grid h-screen grid-cols-[220px_1fr] grid-rows-[auto_1fr] overflow-hidden bg-background text-foreground">
      <Starfield enabled={starsOn} />
      <div className="ambient-haze" aria-hidden="true" />
      <div className="app-rail flex items-baseline gap-2 self-stretch px-4 py-4">
        <span className="wordmark">{t('appName')}</span>
        <span className="rounded-pill border border-hairline px-2 py-px font-mono text-[10px] leading-[1.3] font-medium text-foreground">
          {t('beta')}
        </span>
      </div>

      <header
        className={cn(
          'flex items-baseline justify-center self-stretch bg-transparent px-8 py-4',
          rightRail && 'min-[900px]:pr-[272px]',
        )}
      >
        <h1 key={location.pathname} className="screen-title">
          <span className="screen-title__type">{t(active?.titleKey ?? 'appName')}</span>
        </h1>
      </header>

      <aside className="app-rail flex flex-col px-4 pb-4">
        <nav className="flex flex-col gap-1">
          {visibleNav.map(({ to, key, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'nav-item relative flex h-10 items-center gap-2 rounded-control px-3 font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal',
                  isActive
                    ? 'rim bg-shoal [--rim-fill:linear-gradient(var(--shoal),var(--shoal))] font-semibold text-foreground'
                    : 'text-chart-grey hover:bg-shoal hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="nav-item__icon size-4" strokeWidth={1.75} aria-hidden="true" />
                  {t(key)}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="nav-item__fix absolute -left-2 top-1/2 size-[3px] -translate-y-1/2 rounded-full bg-signal"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex gap-2">
          <LanguageSwitcher />
          <ThemeSwitcher />
          <StarsSwitcher />
        </div>
      </aside>

      <main className="relative overflow-auto">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            className="h-full"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 8 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -8 }}
            transition={{ duration: 0.18 }}
          >
            <ErrorBoundary>{outlet}</ErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
