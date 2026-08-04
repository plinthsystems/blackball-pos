import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#12613d",
        surface: "#ffffff",
        background: "#f4f6f2",
        outline: "#d8ded6",
        success: "#12613d",
        warning: "#b98922",
        danger: "#b42318",
        brass: "#b98922",
        charcoal: "#17211c",
        felt: "#12613d"
      },
      borderRadius: {
        material: "8px"
      },
      boxShadow: {
        material: "0 1px 2px rgb(60 64 67 / 0.18), 0 1px 3px rgb(60 64 67 / 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
