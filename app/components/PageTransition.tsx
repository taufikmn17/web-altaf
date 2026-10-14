"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const TRANSITION_MESSAGES = [
  "Heii, tunggu yaa! Lotso lagi bukain pintu ceritanya...",
  "Sebentar, Lotso lagi pemanasan lari ke halaman baru!",
  "Jangan ke mana-mana, Lotso lagi nyari cerita paling gemas buatmu.",
  "Halaman baru otw! Lotso bilang: siap-siap senyum yaa.",
];
const TRANSITION_DISPLAY_MS = 3000;
const TRANSITION_FALLBACK_MS = 12000;

export default function PageTransition() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const messageIndex = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [message, setMessage] = useState(TRANSITION_MESSAGES[0]);

  useEffect(() => {
    const startTransition = () => {
      setMessage(
        TRANSITION_MESSAGES[messageIndex.current % TRANSITION_MESSAGES.length]
      );
      messageIndex.current += 1;
      setIsTransitioning(true);

      if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
      fallbackTimer.current = setTimeout(() => {
        setIsTransitioning(false);
      }, TRANSITION_FALLBACK_MS);
    };

    const handleNavigationClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      const link = target instanceof Element
        ? target.closest<HTMLAnchorElement>("a[href]")
        : null;

      if (!link || link.hasAttribute("download") || link.target === "_blank") {
        return;
      }

      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      ) {
        return;
      }

      startTransition();
    };

    const handleHistoryNavigation = () => startTransition();

    document.addEventListener("click", handleNavigationClick, true);
    window.addEventListener("popstate", handleHistoryNavigation);
    return () => {
      document.removeEventListener("click", handleNavigationClick, true);
      window.removeEventListener("popstate", handleHistoryNavigation);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    };
  }, []);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;

    if (!isTransitioning) return;
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    hideTimer.current = setTimeout(() => {
      setIsTransitioning(false);
    }, TRANSITION_DISPLAY_MS);
  }, [pathname, isTransitioning]);

  return (
    <div
      className={`page-transition ${isTransitioning ? "is-active" : ""}`}
      role="status"
      aria-live="polite"
      aria-hidden={!isTransitioning}
    >
      <div className="page-transition-scene">
        <div className="page-transition-art" aria-hidden="true">
          <span className="page-transition-orbit page-transition-orbit-one" />
          <span className="page-transition-orbit page-transition-orbit-two" />
          <span className="page-transition-sparkle page-transition-sparkle-one">✦</span>
          <span className="page-transition-sparkle page-transition-sparkle-two">✦</span>
          {isTransitioning && (
            <Image
              src="/assets/img/lotso.png"
              alt=""
              width={260}
              height={260}
              priority
              unoptimized
              className="page-transition-lotso"
            />
          )}
        </div>
        <p className="page-transition-eyebrow">CERITANYA LAGI DISIAPKAN</p>
        <p className="page-transition-message">{message}</p>
        <div className="page-transition-loader" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
