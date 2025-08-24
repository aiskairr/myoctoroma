/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))", // Замените на нужный цвет
        background: "hsl(var(--background))", // Или "gray-50", или любой другой цвет
        foreground: "hsl(var(--foreground))", 
      },
    },
  },
  plugins: [],
}
