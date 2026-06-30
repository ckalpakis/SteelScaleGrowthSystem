import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Default system brand (used by the marketing/login shell).
        // Per-client sites override their accent via inline CSS variables.
        brand: {
          DEFAULT: "#1e3a8a",
          dark: "#172554",
        },
      },
    },
  },
  plugins: [],
};

export default config;
