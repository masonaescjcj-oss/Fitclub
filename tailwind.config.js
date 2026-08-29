/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf4ff",
          100: "#fae8ff",
          500: "#844783", // Main brand purple
          600: "#70396f",
          700: "#5c2d5b",
        },
        accent: "#844783",
        dark: {
          bg: "#09090b",
          card: "#121215",
          border: "#27272a"
        }
      },
      fontFamily: {
        sans: ["Outfit", "Inter", "system-ui", "-apple-system", "sans-serif"]
      }
    },
  },
  plugins: [],
}
