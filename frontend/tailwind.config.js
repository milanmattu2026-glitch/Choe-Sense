/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F3E6DA',
        'bg-end': '#EAD7C8',
        ink: '#1C1C1C',
        muted: '#A8A29E',
        accent: {
          DEFAULT: '#FF8A1F',
          soft: '#FFB36B',
        },
        'white-card': '#FFFFFF',
        'border-glass': 'rgba(255, 255, 255, 0.5)',
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
        sans: ['"Outfit"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      boxShadow: {
        glass: '0 10px 40px rgba(120, 80, 50, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
        'glass-strong': '0 14px 44px rgba(120, 80, 50, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        'white-card': '0 10px 30px rgba(120, 80, 50, 0.08)',
        'dark-card': '0 16px 40px rgba(0, 0, 0, 0.22)',
      },
      borderRadius: {
        '28': '28px',
        '24': '24px',
        '22': '22px',
      },
      animation: {
        'float-slow': 'float 7s ease-in-out infinite',
        'float-slow-reverse': 'float-reverse 8s ease-in-out infinite',
        'fade-up': 'fadeUp 0.5s ease-out forwards',
        pulse_slow: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '50%': { transform: 'translate(20px, -20px) scale(1.06)' },
        },
        'float-reverse': {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '50%': { transform: 'translate(-20px, 20px) scale(0.95)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
