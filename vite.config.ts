import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import type { Config } from "tailwindcss";

// https://vite.dev/config/
const tailwindConfig: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {},
  },
  plugins: [],
};

export default defineConfig({
  plugins: [react(), tailwindcss({ config: tailwindConfig })],
});
