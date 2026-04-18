"use client";

import React, { useRef, useEffect, useState } from "react";

type Props = {
  children: React.ReactNode;
  /** Animation variant */
  variant?: "fade-up" | "fade-in" | "slide-left" | "slide-right";
  /** Delay in ms */
  delay?: number;
  /** Duration in ms */
  duration?: number;
  /** Only animate once */
  once?: boolean;
  /** Custom className */
  className?: string;
  /** As what element to render */
  as?: "div" | "section" | "article";
};

export default function ScrollReveal({
  children,
  variant = "fade-up",
  delay = 0,
  duration = 500,
  once = true,
  className = "",
  as: Tag = "div",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      requestAnimationFrame(() => setIsVisible(true));
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once, prefersReducedMotion]);

  const getTransform = () => {
    if (prefersReducedMotion) return "none";
    if (isVisible) return "none";

    switch (variant) {
      case "fade-up":
        return "translateY(16px)";
      case "slide-left":
        return "translateX(-16px)";
      case "slide-right":
        return "translateX(16px)";
      default:
        return "none";
    }
  };

  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={className}
      style={{
        opacity: prefersReducedMotion ? 1 : isVisible ? 1 : 0,
        transform: getTransform(),
        transition: prefersReducedMotion
          ? "none"
          : `opacity ${duration}ms ease-out ${delay}ms, transform ${duration}ms ease-out ${delay}ms`,
        willChange: isVisible ? "auto" : "opacity, transform",
      }}
    >
      {children}
    </Tag>
  );
}
