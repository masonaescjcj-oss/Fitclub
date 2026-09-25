/** @type {import('tailwindcss').Config} */

// "Ink & Volt" tokens. Every colour reads a CSS variable (RGB channels) from
// src/index.css, so night mode and the athlete's accent choice swap them at
// runtime without touching a class.
const token = (name) => `rgb(var(--ui-${name}) / <alpha-value>)`;

module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  // index.html and src/lib/theme.js put .dark on <html> for night mode.
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Ink that stays ink in night mode: accent always sits on it.
        jet: "#121310",
        canvas: token("bg"),
        card: token("card"),
        sunk: token("sunk"),
        line: token("line"),
        hair: token("hair"),
        ink: token("fg"),
        muted: token("muted"),
        faint: token("faint"),
        inv: token("inv"),
        "on-inv": token("on-inv"),
        hero: token("hero"),
        "hero-2": token("hero-2"),
        "hero-fg": token("hero-fg"),
        "hero-muted": token("hero-muted"),
        accent: token("accent"),
        "on-accent": token("on-accent"),
        coach: token("coach"),
        alert: token("alert"),
        bar: token("bar"),
        "bar-edge": token("bar-edge"),
        // Named so they don't shadow Tailwind's violet/amber/sky palettes,
        // which the messenger still uses.
        grape: token("grape"),
        ochre: token("ochre"),
        sand: token("sand"),
        sage: token("sage"),
        mist: token("mist"),
      },
      fontFamily: {
        // The messenger and any screen not yet redesigned keep the original face.
        sans: ["Outfit", "Inter", "system-ui", "-apple-system", "sans-serif"],
        // Geist has no Arabic script, so Persian falls through to Vazirmatn glyph by glyph.
        ui: ["Geist", "Vazirmatn", "system-ui", "-apple-system", "sans-serif"],
        display: ["'Bricolage Grotesque'", "Vazirmatn", "Geist", "system-ui", "sans-serif"],
        mono: ["'Geist Mono'", "Vazirmatn", "ui-monospace", "monospace"],
      },
      borderRadius: {
        "4xl": "28px",
      },
      boxShadow: {
        bar: "0 14px 34px rgba(18, 19, 16, 0.22)",
        lift: "0 1px 3px rgba(18, 19, 16, 0.12)",
        sheet: "0 -12px 40px rgba(18, 19, 16, 0.18)",
      },
      letterSpacing: {
        label: "0.1em",
        display: "-0.04em",
      },
    },
  },
  plugins: [],
}
