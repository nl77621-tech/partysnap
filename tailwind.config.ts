import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm paper background — replaces cold gray-50
        paper: "#FAF7F2",
        // Warm neutral scale (brown-tinted, not blue-gray) used for all chrome
        ink: {
          50: "#FAF8F5",
          100: "#F2EEE8",
          200: "#E6DFD6",
          300: "#D2C9BD",
          400: "#ABA093",
          500: "#857A6D",
          600: "#675D52",
          700: "#4A423A",
          800: "#2D2823",
          900: "#1A1613",
        },
        // Brand accent — warm coral, used sparingly for highlights
        accent: {
          50: "#FFF4F1",
          100: "#FFE4DD",
          200: "#FFC9BB",
          300: "#FBA48C",
          400: "#F4785C",
          500: "#E85D3F",
          600: "#D14328",
          700: "#AE341D",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        // Warm-tinted, layered shadows — cool black shadows look dirty on cream
        soft: "0 1px 2px rgba(26,22,19,0.04), 0 4px 12px rgba(26,22,19,0.05)",
        lift: "0 2px 4px rgba(26,22,19,0.04), 0 12px 28px rgba(26,22,19,0.08)",
        float: "0 8px 40px rgba(26,22,19,0.14)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "rise-in": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out both",
        "rise-in": "rise-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
