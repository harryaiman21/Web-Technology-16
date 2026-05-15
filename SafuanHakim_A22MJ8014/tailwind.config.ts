import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f2328",
        freight: "#2f6f73",
        dhlRed: "#d40511",
        dhlYellow: "#ffcc00",
        paper: "#f8f7f2"
      },
      boxShadow: {
        panel: "0 18px 60px rgba(31, 35, 40, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
