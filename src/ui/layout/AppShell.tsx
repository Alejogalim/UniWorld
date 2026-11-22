import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation, useOutlet } from 'react-router';
import {
  ListChecks,
  MessageCircle,
  Globe,
  PanelLeftClose,
  Settings,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { useProfile } from '@/store/profile';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';
import { Starfield } from './Starfield';
import { Logo } from './Logo';

const NAV: { to: string; key: string; titleKey: string; icon: LucideIcon }[] = [
  { to: '/onboarding', key: 'nav.onboarding', titleKey: 'screens.onboarding', icon: Sparkles },
  { to: '/counselor', key: 'nav.counselor', titleKey: 'screens.counselor', icon: MessageCircle },
  { to: '/finder', key: 'nav.finder', titleKey: 'screens.finder', icon: Globe },
  { to: '/my-unis', key: 'nav.myUnis', titleKey: 'screens.myUnis', icon: ListChecks },
  { to: '/settings', key: 'nav.settings', titleKey: 'screens.settings', icon: Settings },
];

/**
 * Two columns: the rail (logo row, nav, footer) and the working column (page title over the content).
 * The logo sits in the same spot in both rail states; collapsed, it is the button that opens the rail.
 * The counselor screen has no title: its content fills the whole working column.
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
  // Collapsed, the rail keeps the icons only, like a dock.
  const [railCollapsed, setRailCollapsed] = useState(false);

  const onCounselor = location.pathname.startsWith('/counselor');

  return (
    <div
      className={cn(
        'isolate grid h-screen grid-rows-[minmax(0,1fr)] overflow-hidden bg-background text-foreground',
        railCollapsed ? 'grid-cols-[72px_1fr]' : 'grid-cols-[284px_1fr]',
        !reduceMotion && 'transition-[grid-template-columns] duration-200 ease-out',
      )}
    >
      <Starfield />
      <div className="ambient-haze" aria-hidden="true" />

      <aside className="app-rail flex min-h-0 flex-col gap-4 px-3 py-4">
        <div className="flex h-9 items-center gap-2">
          {railCollapsed ? (
            <button
              type="button"
              onClick={() => setRailCollapsed(false)}
              aria-label={t('nav.expand')}
              title={t('nav.expand')}
              className="grid size-9 shrink-0 place-items-center rounded-control outline-none transition-colors hover:bg-shoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
            >
              <Logo className="size-7" />
            </button>
          ) : (
            <>
              <span className="grid size-9 shrink-0 place-items-center">
                <Logo className="size-7" />
              </span>
              <span className="wordmark shrink-0">{t('appName')}</span>
              <span className="shrink-0 rounded-pill border border-hairline px-2 py-px font-mono text-[10px] leading-[1.3] font-medium text-foreground">
                {t('beta')}
              </span>
              <button
                type="button"
                onClick={() => setRailCollapsed(true)}
                aria-label={t('nav.collapse')}
                title={t('nav.collapse')}
                className="ml-auto grid size-9 shrink-0 place-items-center rounded-control text-chart-grey outline-none transition-colors hover:bg-shoal hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
              >
                <PanelLeftClose className="size-4" strokeWidth={1.75} aria-hidden="true" />
              </button>
            </>
          )}
        </div>

        <nav className="flex flex-col gap-1">
          {visibleNav.map(({ to, key, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={t(key)}
              aria-label={railCollapsed ? t(key) : undefined}
              className={({ isActive }) =>
                cn(
                  'nav-item relative flex h-10 items-center rounded-control font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal',
                  railCollapsed ? 'w-9 justify-center' : 'w-full gap-2 px-3',
                  isActive
                    ? 'rim bg-shoal [--rim-fill:linear-gradient(var(--shoal),var(--shoal))] font-semibold text-foreground'
                    : 'text-chart-grey hover:bg-shoal hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="nav-item__icon size-4" strokeWidth={1.75} aria-hidden="true" />
                  {!railCollapsed && t(key)}
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

        <div className={cn('mt-auto flex gap-2', railCollapsed && 'flex-col items-start')}>
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
      </aside>

      <div className={cn('grid min-h-0 min-w-0', onCounselor ? 'grid-rows-[minmax(0,1fr)]' : 'grid-rows-[auto_minmax(0,1fr)]')}>
        {!onCounselor && (
          <header className="flex items-baseline justify-center bg-transparent px-8 py-4">
            <h1 key={location.pathname} className="screen-title">
              <span className="screen-title__type">{t(active?.titleKey ?? 'appName')}</span>
            </h1>
          </header>
        )}

        <main className="relative min-h-0 overflow-auto">
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
    </div>
  );
}
