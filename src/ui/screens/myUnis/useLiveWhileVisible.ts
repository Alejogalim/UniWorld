import { useEffect, useState, type RefObject } from 'react';

/**
 * True while `enabled`, the element is on screen and the window is visible. Starts false, so looping
 * CSS animations start paused until the first intersection report. No timers, no animation frames.
 */
export function useLiveWhileVisible(ref: RefObject<Element | null>, enabled: boolean): boolean {
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(
    () => typeof document === 'undefined' || !document.hidden,
  );

  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const sync = () => setPageVisible(!document.hidden);
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, [enabled]);

  return enabled && inView && pageVisible;
}
