"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const REVEAL_SELECTOR =
  'main :is(section, article), main [class*="grid-cols-"] > div';

export default function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR),
    );

    if (targets.length === 0) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reducedMotion || !("IntersectionObserver" in window)) {
      targets.forEach((target) => {
        target.dataset.scrollReveal = "visible";
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          (entry.target as HTMLElement).dataset.scrollReveal = "visible";
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0 },
    );

    targets.forEach((target) => {
      target.dataset.scrollReveal = "pending";
    });

    const frame = window.requestAnimationFrame(() => {
      targets.forEach((target) => observer.observe(target));
    });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}