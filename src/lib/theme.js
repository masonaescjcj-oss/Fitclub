// Light or dark for the whole app. Light is the default; the choice is kept in
// localStorage and applied to <html data-theme>, which src/theme-light.css
// keys off. index.html applies it before the first paint for the same reason.

import { useEffect, useState } from "react";

const KEY = "fitclub.theme";
const EVENT = "fitclub:theme";

export const THEMES = ["light", "dark"];

export function loadTheme() {
  try {
    const stored = window.localStorage.getItem(KEY);
    if (THEMES.includes(stored)) return stored;
  } catch {
    // Storage unavailable — fall back to the default below.
  }
  return "light";
}

export function applyTheme(theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  root.classList.toggle("dark", theme === "dark");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#0C0D0A" : "#F3F2EC");
}

export function saveTheme(theme) {
  try {
    window.localStorage.setItem(KEY, theme);
  } catch {
    // Still applies for this visit.
  }
  applyTheme(theme);
  window.dispatchEvent(new Event(EVENT));
}

/** Current theme plus a setter; every subscriber re-renders on a change. */
export function useTheme() {
  const [theme, setTheme] = useState(loadTheme);
  useEffect(() => {
    const onChange = () => setTheme(loadTheme());
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
  return [theme, saveTheme];
}
