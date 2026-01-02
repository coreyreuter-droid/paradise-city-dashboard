// components/ui/AnimatedNumber.tsx
"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  duration?: number;
  formatFn?: (value: number) => string;
  className?: string;
};

/**
 * Animated number counter with WCAG 2.1 AA compliance.
 * - Counts from 0 to target value with ease-out easing
 * - Uses requestAnimationFrame for smooth 60fps animation
 * - Respects prefers-reduced-motion for users with vestibular disorders
 * - Only animates on initial mount, not on re-renders
 */
export function AnimatedNumber({
  value,
  duration = 1000,
  formatFn = (v) => v.toLocaleString("en-US"),
  className,
}: Props) {
  const [displayValue, setDisplayValue] = useState(0);
  const hasAnimated = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Only animate once on mount
    if (hasAnimated.current) {
      setDisplayValue(value);
      return;
    }

    // Check for reduced motion preference (WCAG 2.1 AA compliance)
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || value === 0) {
      setDisplayValue(value);
      hasAnimated.current = true;
      return;
    }

    hasAnimated.current = true;
    const startTime = performance.now();
    const startValue = 0;
    const endValue = value;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out: fast start, slow finish
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const current = startValue + (endValue - startValue) * easeOut;
      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [value, duration]);

  return <span className={className}>{formatFn(displayValue)}</span>;
}

export default AnimatedNumber;
