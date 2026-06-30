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
        // Deep navy used for dark emphasis bands across the template.
        ink: {
          DEFAULT: "#0c2340",
          800: "#102a4c",
          700: "#173461",
        },
      },
      maxWidth: {
        content: "1280px",
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
