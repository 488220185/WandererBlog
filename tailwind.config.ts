import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#07090f',
          900: '#0b0e17',
          850: '#10141f',
          800: '#151a27',
          750: '#1b2130',
          700: '#232a3b',
          600: '#333c52',
        },
        accent: {
          DEFAULT: '#4ade80',
          dim: '#22c55e',
          soft: 'rgba(74, 222, 128, 0.12)',
        },
        cyan: {
          DEFAULT: '#22d3ee',
          soft: 'rgba(34, 211, 238, 0.12)',
        },
        amber2: '#fbbf24',
      },
      fontFamily: {
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'JetBrains Mono',
          'Menlo',
          'Consolas',
          'monospace',
        ],
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'sans-serif',
        ],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out both',
        blink: 'blink 1.1s steps(1) infinite',
      },
    },
  },
  plugins: [],
}

export default config
