import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.06)",
        "card-hover": "0 2px 4px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.1)",
      },
      colors: {
        // Brand palette per PRD Section 53 — Blue + Green + natural landscapes
        brand: {
          blue: {
            50: "#eef4ff",
            100: "#d9e6ff",
            200: "#b3ccff",
            300: "#80a8ff",
            400: "#4d7fff",
            500: "#1f56f5",
            600: "#1642c2",
            700: "#123499",
            800: "#0f2a7a",
            900: "#0c2264",
          },
          green: {
            50: "#eefbf0",
            100: "#d3f5db",
            200: "#a6ebb7",
            300: "#71db8f",
            400: "#43c56a",
            500: "#26a84d",
            600: "#1c863d",
            700: "#186a33",
            800: "#15542b",
            900: "#124524",
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
