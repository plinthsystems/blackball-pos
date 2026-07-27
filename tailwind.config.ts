import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1a73e8",
        surface: "#ffffff",
        background: "#f8fafd",
        outline: "#dadce0",
        success: "#188038",
        warning: "#f9ab00",
        danger: "#d93025"
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
