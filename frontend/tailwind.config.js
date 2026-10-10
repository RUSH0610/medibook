/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0369a1",
        secondary: "#38bdf8",
        accent: "#059669",
        dark: "#171717",
        muted: "#737373",
        surface: "#fafafa",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
