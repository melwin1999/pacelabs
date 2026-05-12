import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class', 
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        'bg-card': 'var(--bg-card)',
        text: 'var(--text)',
        'text-muted': 'var(--text-muted)',
        border: 'var(--border)',
        accent: '#F97316',
        success: '#22C55E',
        'phase-base': '#60A5FA',
        'phase-build': '#FB923C',
        'phase-peak': '#F87171',
        'phase-taper': '#A3A3A3',
        'long-run': '#FBBF24',
      },
      fontFamily: {
        sans: ['var(--font-inter)'],
      },
    },
  },
  plugins: [],
};
export default config;