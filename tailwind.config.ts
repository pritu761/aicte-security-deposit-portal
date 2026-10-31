import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1440px" },
    },
    extend: {
      fontFamily: {
        sans: ["Inter Variable", "Inter", "system-ui", "sans-serif"],
        display: ["Source Serif 4 Variable", "Georgia", "serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        navy: {
          50: "#f3f7fc",
          100: "#e4edf7",
          200: "#c6d9ec",
          300: "#9bbdda",
          400: "#679bc2",
          500: "#457ea9",
          600: "#33658d",
          700: "#2c5273",
          800: "#294660",
          900: "#0b2b47",
          950: "#071e33",
        },
        saffron: {
          50: "#fdf8ed",
          100: "#f9ecd0",
          200: "#f2d69d",
          300: "#eabc68",
          400: "#e3a043",
          500: "#d9832a",
          600: "#bf661f",
          700: "#9f4b1d",
          800: "#823d1e",
          900: "#6b331b",
        },
        teal: {
          50: "#effaf8",
          100: "#d7f4ef",
          200: "#b1e8e0",
          300: "#7dd5cb",
          400: "#45bbb2",
          500: "#299f99",
          600: "#1e807d",
          700: "#1c6765",
          800: "#1b5252",
          900: "#194545",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        card: "0 1px 2px rgba(10, 37, 64, 0.04), 0 8px 24px -16px rgba(10, 37, 64, 0.18)",
        lift: "0 12px 40px -20px rgba(10, 37, 64, 0.35)",
        glow: "0 0 0 1px rgba(217, 131, 42, 0.18), 0 18px 48px -24px rgba(217, 131, 42, 0.45)",
        sidebar: "inset -1px 0 0 rgba(255,255,255,0.06)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        rise: {
          from: { opacity: "0", transform: "translateY(12px) scale(0.992)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "page-in": {
          from: { opacity: "0", transform: "translateY(7px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-y": {
          from: { opacity: "0", transform: "scaleY(0.25)" },
          to: { opacity: "1", transform: "scaleY(1)" },
        },
        "grow-x": {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -18px, 0)" },
        },
        "float-slower": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(14px, 12px, 0) scale(1.03)" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "gradient-pan": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "flag-wave": {
          "0%, 100%": { transform: "rotate(-1.5deg) skewY(-0.8deg)" },
          "50%": { transform: "rotate(1.5deg) skewY(0.8deg)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out both",
        "slide-in": "slide-in 0.25s ease-out both",
        rise: "rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both",
        "page-in": "page-in 0.42s cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-y": "scale-y 0.32s cubic-bezier(0.22, 1, 0.36, 1) both",
        "grow-x": "grow-x 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "float-slow": "float-slow 16s ease-in-out infinite",
        "float-slower": "float-slower 24s ease-in-out infinite",
        "spin-slow": "spin-slow 52s linear infinite",
        shimmer: "shimmer 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "gradient-pan": "gradient-pan 10s ease-in-out infinite",
        "flag-wave": "flag-wave 1.8s ease-in-out infinite",
      },
      backgroundImage: {
        "grid-navy":
          "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
