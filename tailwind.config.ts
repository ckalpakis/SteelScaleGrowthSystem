import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"],
      },
      colors: {
        // Default system brand (marketing/login shell). Per-client sites
        // override their accent via the --brand CSS variable.
        brand: {
          DEFAULT: "#1e3a8a",
          dark: "#172554",
        },
        // Secondary dark color — driven by the --ink CSS variable so each
        // client can customize it (defaults to a deep navy).
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          800: "rgb(var(--ink-800, var(--ink)) / <alpha-value>)",
          700: "rgb(var(--ink-700, var(--ink)) / <alpha-value>)",
        },
      },
      maxWidth: {
        content: "1536px",
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)",
        "card-hover": "0 18px 40px -12px rgba(16,24,40,0.18)",
        float: "0 24px 60px -15px rgba(16,24,40,0.35)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s ease-out both",
        marquee: "marquee 28s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
