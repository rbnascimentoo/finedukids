/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      borderRadius: { 'xl': '12px' },
      colors: {
        primary: '#2563EB',
        parentBg: '#F7F8FA',
        childBg: '#EAF2FF',
      },
    },
  },
  plugins: [],
}
