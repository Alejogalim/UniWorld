import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { motion, useReducedMotion } from 'framer-motion';
import type { Fact, UniResult, UiLang } from '@/core/contracts';
import { languageName } from '@/ui/data/languages';
import { countryName } from '@/ui/data/countries';
import { Badge } from '@/ui/components/Chip';
import { Flag } from '@/ui/components/Flag';
import { SourceMarker } from '@/ui/components/FactLine';
import { isWebUrl } from '@/lib/url';

/** A value is shown only when it has a source URL; otherwise the missing treatment is used. */
export function factValue<T>(fact: Fact<T>): T | null {
  if (fact.value === null || fact.sourceUrl === null || !isWebUrl(fact.sourceUrl)) return null;
  if (typeof fact.value === 'string' && fact.value.trim() === '') return null;
  if (Array.isArray(fact.value) && fact.value.length === 0) return null;
  return fact.value;
}

const EASE = [0.2, 0, 0, 1] as const;

interface ResultRowProps {
  uni: UniResult;
  rank: number;
  /** Position in the list, used for the 24ms entrance stagger (capped at eight rows). */
  index: number;
}

/** DESIGN.md "Result row": a ranked hairline row, not a card. */
export function ResultRow({ uni, rank, index }: ResultRowProps) {
  const { t, i18n } = useTranslation('finder');
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const uiLang = (i18n.resolvedLanguage ?? 'en') as UiLang;

  const open = () =>
    navigate(`/finder/uni/${encodeURIComponent(uni.rorId)}?program=${encodeURIComponent(uni.program)}`, { state: { uni } });
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      open();
    }
  };

  const overview = factValue(uni.overview);
  const languages = factValue(uni.languages);
  const tuition = factValue(uni.tuition);
  const usualLevel = uni.needToLearn ? factValue(uni.needToLearn.usualLevel) : null;
  const place = [uni.city, countryName(uni.countryCode, uiLang)].filter(Boolean).join(', ');
  const { fit } = uni;
  const cost = typeof fit.cost === 'number' ? String(Math.round(fit.cost * 100)) : '?';

  // Markers are numbered in the order they appear on the row. A value without a source gets none.
  let markerCount = 0;
  const marker = (fact: Fact<unknown>) => {
    if (factValue(fact) === null || fact.sourceUrl === null) return null;
    markerCount += 1;
    const index = markerCount;
    // The row is a link: a click or key on the marker must open its popover, not the detail page.
    const stop = (e: { stopPropagation(): void }) => e.stopPropagation();
    return (
      <span onClick={stop} onKeyDown={stop} className="inline-flex">
        <SourceMarker index={index} sourceUrl={fact.sourceUrl} sourceKind={fact.sourceKind} quote={fact.quote} />
      </span>
    );
  };
  const overviewMarker = marker(uni.overview);
  const languagesMarker = marker(uni.languages);
  const tuitionMarker = marker(uni.tuition);

  return (
    <motion.li
      layout="position"
      transition={{ layout: { duration: 0.18, ease: EASE } }}
      initial={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 8) * 0.024, duration: 0.18, ease: EASE } }}
      className="border-b border-hairline last:border-b-0"
    >
      <div
        role="link"
        tabIndex={0}
        onClick={open}
        onKeyDown={onKeyDown}
        className="grid cursor-pointer grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-popover py-3 pr-3 pl-2 outline-none transition-colors duration-[120ms] hover:bg-shoal focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-signal min-[720px]:grid-cols-[2.25rem_minmax(0,1fr)_11rem]"
      >
        <span className="numeral-ember pt-0.5 text-[1.75rem] leading-none font-semibold tabular-nums">
          {t('row.rank', { rank })}
        </span>

        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex min-w-0 items-center gap-2">
            <Flag code={uni.countryCode} />
            <h3 className="min-w-0 text-[1.0625rem] leading-[1.35] font-semibold tracking-[-0.005em] break-words text-foreground">
              {uni.name}
            </h3>
          </div>
          <p className="text-sm leading-[1.55] text-chart-grey">{place}</p>
          <p className="text-sm leading-[1.55] text-foreground">{uni.program}</p>
          <p className="text-sm leading-[1.55] text-foreground">
            {overview ?? (
              <span className="border-b border-dashed border-chart-grey text-chart-grey">
                {t('row.overviewMissing')}
              </span>
            )}
            {overviewMarker}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {languages?.map((code) => (
              <Badge key={code}>{languageName(code, uiLang)}</Badge>
            ))}
            {languagesMarker}
            <Badge>{tuition ?? t('row.tuitionUnknown')}</Badge>
            {tuitionMarker}
          </div>
          <p className="text-sm leading-[1.55] text-foreground">
            <span className="text-chart-grey">{t('row.why')}: </span>
            {uni.whyFits}
          </p>
          {uni.needToLearn && (
            <p className="text-sm leading-[1.55] text-chart-grey">
              {t('row.needToLearn', { language: languageName(uni.needToLearn.lang, uiLang) })}
              {usualLevel && ` (${t('row.usualLevel', { level: usualLevel })})`}
            </p>
          )}
        </div>

        <div className="col-span-2 flex flex-wrap items-center gap-1.5 min-[720px]:col-span-1 min-[720px]:col-start-3 min-[720px]:row-start-1 min-[720px]:flex-col min-[720px]:items-end">
          <div className="flex flex-wrap gap-1.5 min-[720px]:justify-end">
            <Badge className="font-mono text-[11px] tabular-nums">
              {t('fit.car')} {Math.round(fit.career * 100)}
            </Badge>
            <Badge className="font-mono text-[11px] tabular-nums">
              {t('fit.adm')} {t(`admission.${fit.admission}`)}
            </Badge>
            <Badge className="font-mono text-[11px] tabular-nums">
              {t('fit.lng')} {Math.round(fit.language * 100)}
            </Badge>
            <Badge
              className="font-mono text-[11px] tabular-nums"
              title={typeof fit.cost === 'number' ? undefined : t('row.costDepends')}
            >
              {t('fit.cst')} {cost}
            </Badge>
          </div>
          <span className="font-mono text-xs text-chart-grey tabular-nums">
            {t('row.sources', { count: uni.sourceCount })}
          </span>
        </div>
      </div>
    </motion.li>
  );
}
