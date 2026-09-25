// The athlete's accent colour. Volt is the default; the pick is kept in
// localStorage and written to --ui-accent on <html>, which every redesigned
// screen reads through Tailwind's `accent` colour. index.html applies it
// before the first paint for the same reason the theme does.

import { useEffect, useState } from "react";

const KEY = "fitclub.accent";
const EVENT = "fitclub:accent";

export const ACCENTS = [
  { id: "volt", hex: "#D4FF3F", rgb: "212 255 63", en: "Volt", fa: "ولت" },
  { id: "lilac", hex: "#CDBDFF", rgb: "205 189 255", en: "Lilac", fa: "یاسی" },
  { id: "peach", hex: "#FFB38A", rgb: "255 179 138", en: "Peach", fa: "هلویی" },
  { id: "mint", hex: "#8FF0CF", rgb: "143 240 207", en: "Mint", fa: "نعنایی" },
];

export function loadAccent() {
  try {
    const stored = window.localStorage.getItem(KEY);
    if (ACCENTS.some((a) => a.id === stored)) return stored;
  } catch {
    // Storage unavailable — fall back to the default below.
  }
  return "volt";
}

export function applyAccent(id) {
  const accent = ACCENTS.find((a) => a.id === id) || ACCENTS[0];
  document.documentElement.style.setProperty("--ui-accent", accent.rgb);
}

export function saveAccent(id) {
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    // Still applies for this visit.
  }
  applyAccent(id);
  window.dispatchEvent(new Event(EVENT));
}

/** Current accent id plus a setter; every subscriber re-renders on a change. */
export function useAccent() {
  const [accent, setAccent] = useState(loadAccent);
  useEffect(() => {
    const onChange = () => setAccent(loadAccent());
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
  return [accent, saveAccent];
}
