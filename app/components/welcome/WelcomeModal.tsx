"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import TextType from "./TextType";

const subscribeToModalPreference = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("welcome-modal-preference", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("welcome-modal-preference", callback);
  };
};

const getModalVisibility = () =>
  !window.sessionStorage.getItem("hasSeenLotsoModal");

export default function WelcomeLotsoModal() {
  const [celebrationKey, setCelebrationKey] = useState(0);
  const isVisible = useSyncExternalStore(
    subscribeToModalPreference,
    getModalVisibility,
    () => false
  );

  useEffect(() => {
    if (!isVisible) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, [isVisible]);

  const handleClose = () => {
    sessionStorage.setItem("hasSeenLotsoModal", "true");
    window.dispatchEvent(new Event("welcome-modal-preference"));
  };

  if (!isVisible) return null;

  return (
    <div
      style={{ fontFamily: "Georgia, serif" }}
      className="welcome-backdrop fixed inset-0 z-[9999] flex items-center justify-center p-4"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        className="welcome-modal"
      >
        <div className="welcome-scene">
          <div className="welcome-ring" aria-hidden="true" />
          <span className="welcome-sparkle welcome-sparkle-one" aria-hidden="true">
            ✦
          </span>
          <span className="welcome-sparkle welcome-sparkle-two" aria-hidden="true">
            ✦
          </span>
          <span className="welcome-sparkle welcome-sparkle-three" aria-hidden="true">
            ✦
          </span>
          <button
            type="button"
            className={`welcome-characters ${celebrationKey ? "is-celebrating" : ""}`}
            aria-label="Ajak Lotso melompat dan menyapa"
            onClick={() => setCelebrationKey((key) => key + 1)}
          >
            <span
              key={`jumper-${celebrationKey}`}
              className="welcome-sprite welcome-lotso-jumper"
              aria-hidden="true"
            >
              <Image
                src="/assets/img/lotso2.png"
                alt=""
                width={260}
                height={260}
                priority
                unoptimized
              />
            </span>
            <span
              key={`waver-${celebrationKey}`}
              className="welcome-sprite welcome-lotso-waver"
              aria-hidden="true"
            >
              <Image
                src="/assets/img/lotso4.png"
                alt=""
                width={320}
                height={320}
                priority
                unoptimized
              />
            </span>
            <span
              key={`heart-left-${celebrationKey}`}
              className="welcome-pop-heart welcome-pop-heart-left"
              aria-hidden="true"
            >
              ♥
            </span>
            <span
              key={`heart-right-${celebrationKey}`}
              className="welcome-pop-heart welcome-pop-heart-right"
              aria-hidden="true"
            >
              ♥
            </span>
          </button>
        </div>

        <div className="welcome-copy">
          <p className="welcome-eyebrow">SEBUAH CERITA UNTUKMU</p>
          <h2 id="welcome-title" className="welcome-title">
            Hii, Welcome!
          </h2>

          <div className="welcome-message">
            <TextType
              className="welcome-typewriter"
              text={["Ubur-ubur ikan lele, selamat datang di Altaf Story lee."]}
              typingSpeed={38}
              initialDelay={350}
              pauseDuration={3000}
              loop={false}
              showCursor={true}
              cursorCharacter="|"
            />
          </div>

          <button
            onClick={handleClose}
            className="welcome-cta"
          >
            Mulai Jelajahi! ✨
          </button>
        </div>
      </section>
    </div>
  );
}
