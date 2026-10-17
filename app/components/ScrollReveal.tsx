"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const REVEAL_SELECTOR =
  'main :is(section, article), main [class*="grid-cols-"] > div, main [data-scroll-reveal-target], main #about .container > div, main #virtualWish .container > div';

export default function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reducedMotion || !("IntersectionObserver" in window)) {
      return;
    }

    const observedTargets = new WeakSet<HTMLElement>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          (entry.target as HTMLElement).dataset.scrollReveal = "visible";
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.01 },
    );

    const observeTargets = (root: ParentNode) => {
      const targets = Array.from(
        root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR),
      );

      if (root instanceof HTMLElement && root.matches(REVEAL_SELECTOR)) {
        targets.unshift(root);
      }

      targets.forEach((target) => {
        if (observedTargets.has(target)) return;

        observedTargets.add(target);
        target.dataset.scrollReveal = "pending";
        observer.observe(target);
      });
    };

    const mutations = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) observeTargets(node);
        });
      });
    });

    mutations.observe(main, { childList: true, subtree: true });
    observeTargets(main);

    return () => {
      mutations.disconnect();
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}