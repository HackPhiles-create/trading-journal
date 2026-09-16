"use client";

import { useEffect, useRef } from "react";
import { useSound } from "@/hooks/use-sound";

// Delegated, single document-level listener rather than wiring onClick into
// every component — covers the whole app (including shadcn primitives) for
// one small addition. Capture phase so a component's stopPropagation() can't
// silently swallow it.
const INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  '[role="button"]',
  '[role="menuitem"]',
  '[role="tab"]',
  '[data-slot="button"]',
  '[data-slot="switch"]',
  '[data-slot="checkbox"]',
  '[data-slot="tabs-trigger"]',
  '[data-slot="select-trigger"]',
  '[data-slot="dropdown-menu-trigger"]',
  '[data-slot="dropdown-menu-item"]',
  '[data-slot="combobox-item"]',
  '[data-slot="combobox-trigger"]',
  "input[type=checkbox]",
  "input[type=radio]",
  "summary",
].join(",");

export function ClickSoundListener() {
  const { playClick } = useSound();
  const playClickRef = useRef(playClick);

  useEffect(() => {
    playClickRef.current = playClick;
  }, [playClick]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest(INTERACTIVE_SELECTOR);
      if (!interactive) return;
      if (interactive.hasAttribute("disabled") || interactive.getAttribute("aria-disabled") === "true") return;
      playClickRef.current();
    }
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
