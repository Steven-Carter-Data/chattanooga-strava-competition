import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Art Deco Dark Luxury Palette
        background: "#0A0A0A", // Obsidian Black
        foreground: "#F2F0E4", // Champagne Cream
        card: "#141414", // Rich Charcoal
        gold: {
          DEFAULT: "#D4AF37", // Metallic Gold
          light: "#F2E8C4", // Light Gold (hover)
          dark: "#B8960C", // Dark Gold
        },
        midnight: "#1E3D59", // Midnight Blue
        muted: "#888888", // Pewter
        // Keep zone colors for HR zones (slightly muted for Art Deco)
        zone: {
          1: "#3B82F6", // Blue
          2: "#10B981", // Emerald
          3: "#EAB308", // Yellow/Gold
          4: "#F97316", // Orange
          5: "#DC2626", // Red
        },
      },
      fontFamily: {
        display: ["Marcellus", "Georgia", "serif"],
        body: ["Josefin Sans", "Inter", "sans-serif"],
      },
      letterSpacing: {
        "widest": "0.2em",
        "wider": "0.1em",
      },
      boxShadow: {
        "gold-glow": "0 0 15px rgba(212, 175, 55, 0.2)",
        "gold-glow-lg": "0 0 25px rgba(212, 175, 55, 0.3)",
        "gold-glow-xl": "0 0 35px rgba(212, 175, 55, 0.4)",
      },
      borderRadius: {
        "none": "0px",
        "sm": "2px",
      },
      transitionDuration: {
        "400": "400ms",
        "500": "500ms",
      },
    },
  },
  plugins: [],
} satisfies Config;
