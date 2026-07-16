import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sf: {
          bg: "#f1f2f6",
          surface: "#fcfcff",
          ink: "#3d4a63",
          muted: "#7f8aa3",
          blue: {
            DEFAULT: "#76a3de",
            deep: "#5e8fce",
            soft: "#e6effb",
            lighter: "#c9dcf5",
            pale: "#f4f8ff",
          },
          yellow: {
            DEFAULT: "#f1de77",
            soft: "#fff8dc",
          },
        },
      },
      fontFamily: {
        sans: ["var(--font-nunito)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        sf: "0 14px 40px -18px rgba(96, 125, 170, 0.36), 0 3px 10px -4px rgba(96, 125, 170, 0.22)",
        "sf-sm": "0 6px 16px -10px rgba(96, 125, 170, 0.28), 0 2px 6px -3px rgba(96, 125, 170, 0.2)",
      },
      borderRadius: {
        card: "1.2rem",
      },
    },
  },
  plugins: [],
};
export default config;
