/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        command: {
          bg: '#0a0f1e',
          panel: '#0d1629',
          border: '#1e3a5f',
          accent: '#00d4ff',
          danger: '#ff3b3b',
          warning: '#ff9f0a',
          success: '#30d158',
          purple: '#bf5af2',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      animation: {
        pulse_slow: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
    },
  },
  plugins: [],
}
