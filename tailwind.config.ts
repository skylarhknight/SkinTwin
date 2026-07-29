import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sf: {
          // Warm luminous neutrals
          bg: "#faf6f1",
          surface: "#fffdfb",
          ink: "#33262e",
          muted: "#8c8088",
          line: "#e7ddd3",
          // Primary accent family (retargeted from "blue" -> plum/mauve; keys kept for back-compat)
          blue: {
            DEFAULT: "#8a6e86",
            deep: "#6e5570",
            soft: "#ede4ee",
            lighter: "#c9b8de",
            pale: "#f5eff4",
          },
          // Warm accent family (retargeted from "yellow" -> champagne/blush)
          yellow: {
            DEFAULT: "#e9c9a0",
            soft: "#f6e7d6",
          },
          // Named skincare-neutral aliases for new work
          rose: {
            DEFAULT: "#d98a82",
            soft: "#f4dcd6",
          },
          sage: {
            DEFAULT: "#9db39a",
            soft: "#e4ece1",
          },
          plum: {
            DEFAULT: "#6e5570",
            soft: "#ede4ee",
          },
          champagne: {
            DEFAULT: "#d9b892",
            soft: "#f6e7d6",
          },
          lilac: "#c9b8de",
          peach: "#f4c9a8",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
      },
      boxShadow: {
        sf: "0 28px 60px -24px rgba(74, 54, 66, 0.28), 0 10px 24px -16px rgba(74, 54, 66, 0.16)",
        "sf-sm": "0 12px 30px -18px rgba(74, 54, 66, 0.24), 0 4px 12px -8px rgba(74, 54, 66, 0.14)",
        glow: "0 0 0 1px rgba(255,255,255,0.5) inset, 0 20px 50px -24px rgba(110, 85, 112, 0.4)",
      },
      borderRadius: {
        card: "1.75rem",
      },
      backgroundImage: {
        "grad-aurora": "linear-gradient(120deg, #f4c9a8 0%, #c9b8de 48%, #9db39a 100%)",
        "grad-cta": "linear-gradient(120deg, #6e5570 0%, #a06a7e 55%, #d98a82 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
