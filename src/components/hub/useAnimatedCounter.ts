import { useEffect, useRef, useState } from 'react';

/**
 * Smoothly interpolates numeric HUD counters (XP, Byte Coins, Streak)
 * while respecting prefers-reduced-motion.
 */
export function useAnimatedCounter(targetValue: number, durationMs = 420): number {
  const [displayValue, setDisplayValue] = useState<number>(targetValue);
  const prevRef = useRef<number>(targetValue);

  useEffect(() => {
    const startValue = prevRef.current;
    if (startValue === targetValue) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced || durationMs <= 0) {
      prevRef.current = targetValue;
      setDisplayValue(targetValue);
      return;
    }

    let rafId = 0;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(startValue + (targetValue - startValue) * eased);
      setDisplayValue(next);

      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        prevRef.current = targetValue;
        setDisplayValue(targetValue);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafId);
      prevRef.current = targetValue;
    };
  }, [targetValue, durationMs]);

  return displayValue;
}
