import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        actual:   "#3b82f6",  // blue-500
        forecast: "#22c55e",  // green-500
      },
    },
  },
  plugins: [],
};

export default config;
