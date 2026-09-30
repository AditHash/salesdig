export default {
  content: [
    './index.html',
    './*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './context/**/*.{js,ts,jsx,tsx}',
    './services/**/*.{js,ts,jsx,tsx}',
  ],
  safelist: [
    'bg-teal-100',
    'bg-cyan-100',
    'bg-green-100',
    'bg-blue-600',
    'bg-cyan-600',
    'bg-amber-500',
    'bg-rose-600',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
