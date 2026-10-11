/**
 * Lightweight IntersectionObserver hook for scroll-reveal.
 * Adds 'visible' class when element enters viewport.
 * Respects prefers-reduced-motion — skips observation and marks immediately visible.
 */
import { useEffect, useRef } from 'react';

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * @param {Object} options
 * @param {number} options.threshold  - 0–1, default 0.12
 * @param {string} options.rootMargin - default '0px 0px -40px 0px'
 * @returns ref to attach to the element you want to reveal
 */
export function useScrollReveal(options = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Instantly show if user prefers reduced motion
    if (prefersReducedMotion) {
      el.classList.add('visible');
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target); // animate once
        }
      },
      {
        threshold:  options.threshold  ?? 0.12,
        rootMargin: options.rootMargin ?? '0px 0px -40px 0px',
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

/**
 * Reveal multiple elements with individual refs.
 * Returns an array of refs of length `count`.
 */
export function useScrollRevealList(count = 6, options = {}) {
  const refs = Array.from({ length: count }, () => useRef(null));

  useEffect(() => {
    if (prefersReducedMotion) {
      refs.forEach(r => r.current?.classList.add('visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold:  options.threshold  ?? 0.1,
        rootMargin: options.rootMargin ?? '0px 0px -30px 0px',
      }
    );

    refs.forEach(r => { if (r.current) observer.observe(r.current); });
    return () => observer.disconnect();
  }, []);

  return refs;
}
