import { useEffect, useState } from "react";

import coverHero from "@/assets/cover-hero.jpg";

const SESSION_KEY = "heritage-cover-seen";

export function IntroCover() {
  const [mounted, setMounted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(true);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      seen = false;
    }
    if (seen) return;
    setGone(false);
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    setLeaving((already) => {
      if (already) return already;
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* ignore */
      }
      window.setTimeout(() => setGone(true), 1100);
      return true;
    });
  }

  if (gone) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Enter the heritage map"
      onClick={dismiss}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") dismiss();
      }}
      className="fixed inset-0 z-[999] cursor-pointer overflow-hidden bg-[oklch(0.18_0.03_40)] text-[oklch(0.98_0.012_85)]"
      style={{
        animation: mounted
          ? leaving
            ? "cover-lift 1.05s cubic-bezier(0.76, 0, 0.24, 1) forwards"
            : "cover-drop 1.1s cubic-bezier(0.16, 1, 0.3, 1) both"
          : undefined,
      }}
    >
      <img
        src={coverHero}
        alt=""
        width={1920}
        height={1280}
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
        style={{ animation: "cover-pan 9s ease-out both" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,oklch(0.18_0.03_40/0.55),oklch(0.15_0.03_40/0.35)_45%,oklch(0.14_0.03_40/0.92))]" />

      <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
        <p
          className="text-[0.7rem] uppercase tracking-[0.42em] opacity-0"
          style={{ animation: "cover-rise 0.9s ease-out 0.35s both" }}
        >
          Living Heritage of India
        </p>

        <h1
          className="mt-4 max-w-4xl text-balance text-4xl leading-[1.05] opacity-0 sm:text-6xl lg:text-7xl"
          style={{ animation: "cover-rise 1s ease-out 0.55s both" }}
        >
          Every place here
          <br />
          remembers something.
        </h1>

        <span
          className="mt-7 block h-px w-40 origin-left scale-x-0 bg-[oklch(0.98_0.012_85/0.55)]"
          style={{ animation: "cover-line 1s ease-out 0.9s both" }}
        />

        <p
          className="mt-6 max-w-md text-sm opacity-0 sm:text-base"
          style={{ animation: "cover-rise 1s ease-out 1.05s both" }}
        >
          Monuments, festivals, crafts and the quiet local stories behind them —
          mapped across the country.
        </p>

        <span
          className="mt-10 inline-flex items-center gap-2 rounded-full border border-[oklch(0.98_0.012_85/0.4)] px-5 py-2 text-xs uppercase tracking-[0.28em] opacity-0"
          style={{ animation: "cover-rise 1s ease-out 1.3s both" }}
        >
          Tap anywhere to explore
        </span>
      </div>
    </div>
  );
}
