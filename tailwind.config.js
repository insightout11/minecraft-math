/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts}"],
  theme: {
    extend: {
      fontFamily: {
        game: ["'Trebuchet MS'", "'Comic Sans MS'", "system-ui", "sans-serif"],
        pixel: ["'Courier New'", "monospace"]
      },
      boxShadow: {
        block: "0 6px 0 rgba(0,0,0,0.35), 0 10px 24px rgba(0,0,0,0.35)",
        "block-sm": "0 4px 0 rgba(0,0,0,0.35)",
        glow: "0 0 24px rgba(255,210,63,0.7)"
      }
    }
  },
  plugins: []
};
