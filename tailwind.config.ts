import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Every color reads a CSS variable painted by ThemeProvider.
        // Change ONE hex → every token below updates.
        accent: 'var(--accent)',
        'accent-light': 'var(--accent-light)',
        'accent-dark': 'var(--accent-dark)',
        'accent-soft': 'var(--accent-soft)',
        'accent-muted': 'var(--accent-muted)',
        canvas: 'var(--background)',
        'canvas-deep': 'var(--background-deep)',
        surface: 'var(--surface)',
        'surface-strong': 'var(--surface-strong)',
        glass: 'var(--glass)',
        'glass-strong': 'var(--glass-strong)',
        'glass-tint': 'var(--glass-tint)',
        'glass-border': 'var(--glass-border)',
        'glass-border-strong': 'var(--glass-border-strong)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        'text-muted': 'var(--text-muted)',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['Inter', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        window: '18px',
        panel: '20px',
        dock: '32px',
      },
      boxShadow: {
        glow: '0 20px 60px var(--accent-glow-soft), 0 0 0 1px var(--glass-border)',
        'glow-strong': '0 30px 80px var(--accent-glow), 0 0 0 1px var(--glass-border-strong)',
        soft: 'var(--shadow-soft)',
        lift: 'var(--shadow-lift)',
        dock: 'var(--shadow-dock)',
      },
      backdropBlur: {
        xs: '4px',
      },
      animation: {
        'aurora-drift': 'aurora-drift 24s ease-in-out infinite',
        'aurora-pan': 'aurora-pan 36s linear infinite',
        'pulse-soft': 'pulse-soft 3.5s ease-in-out infinite',
        'spin-slow': 'spin 18s linear infinite',
        'fade-in': 'fade-in 0.4s ease-out both',
        'lift-in': 'lift-in 0.5s cubic-bezier(.2,.9,.3,1.2) both',
      },
      keyframes: {
        'aurora-drift': {
          '0%, 100%': { transform: 'translate3d(-6%, -4%, 0) scale(1)' },
          '50%': { transform: 'translate3d(6%, 4%, 0) scale(1.05)' },
        },
        'aurora-pan': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.85' },
          '50%': { opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'lift-in': {
          from: { opacity: '0', transform: 'translateY(20px) scale(.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
