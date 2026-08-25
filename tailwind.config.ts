import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#FAFAF9",
          2: "#F5F3EE",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          2: "#FBFAF8",
        },
        line: {
          DEFAULT: "#E8E6E3",
          strong: "#DAD7D1",
        },
        ink: {
          DEFAULT: "#1A1D1F",
          2: "#43484D",
          3: "#6F767E",
          4: "#8B9096",
        },
        accent: {
          DEFAULT: "#0F3D3E",
          hover: "#0B3031",
          soft: "#E8F0EB",
        },
        lime: {
          DEFAULT: "#C7F284",
          soft: "#F4FBE2",
        },
        success: {
          DEFAULT: "#1E874B",
          soft: "#E4F2E9",
        },
        danger: {
          DEFAULT: "#D64545",
          soft: "#FAE9E8",
        },
        warning: {
          DEFAULT: "#C98A1E",
          soft: "#F8EFDC",
        },
        info: {
          DEFAULT: "#3B6EA5",
          soft: "#E7EEF6",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        secondary: ["var(--font-secondary)", "var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgba(26,29,31,0.04), 0 1px 3px 0 rgba(26,29,31,0.06)",
        lift: "0 2px 4px -1px rgba(26,29,31,0.05), 0 8px 20px -6px rgba(26,29,31,0.12)",
        pop: "0 12px 32px -8px rgba(26,29,31,0.18)",
      },
      letterSpacing: {
        tightest: "-0.03em",
      },
    },
  },
  plugins: [],
};

export default config;
