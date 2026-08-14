import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#84cc16",
        surface: "#0f1a18",
        background: "#07110f",
        outline: "#233833",
        success: "#a3e635",
        warning: "#f59e0b",
        danger: "#f43f5e",
        brass: "#f59e0b",
        charcoal: "#ecfff7",
        felt: "#14532d",
        console: "#07110f",
        neon: "#bef264",
        cyan: "#22d3ee"
      },
      borderRadius: {
        material: "8px"
      },
      boxShadow: {
        material: "0 0 0 1px rgb(132 204 22 / 0.12), 0 18px 44px rgb(0 0 0 / 0.32)"
      }
    }
  },
  plugins: []
};

export default config;
