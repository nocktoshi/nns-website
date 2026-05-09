import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Scroll the main document to the top (e.g. after submitting search).
 * Uses document.scrollingElement + fallbacks (Safari/WebKit often ignore window.scrollTo alone).
 * Deferred by two animation frames so it runs after React commits new search UI (otherwise scroll can be lost).
 */
export function scrollWindowTop(behavior = "instant") {
  if (typeof window === "undefined") return;

  const scroll = () => {
    const root = document.scrollingElement ?? document.documentElement;
    const opts = { top: 0, left: 0, behavior };

    try {
      root.scrollTo(opts);
      window.scrollTo(opts);
    } catch {
      root.scrollTop = 0;
      window.scrollTo(0, 0);
    }

    root.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(scroll);
  });
}