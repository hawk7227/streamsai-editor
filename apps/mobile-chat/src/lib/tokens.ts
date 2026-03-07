/** All design tokens. Import this wherever CSS-in-JS values are needed. */

export const spacing = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const

export const radius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  full: '999px',
} as const

export const shadow = {
  sm: '0 4px 14px rgba(0,0,0,.06)',
  md: '0 10px 30px rgba(0,0,0,.08)',
  lg: '0 18px 60px rgba(0,0,0,.10)',
} as const

export const motion = {
  fast: '150ms',
  normal: '180ms',
  slow: '220ms',
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const

export const color = {
  bg: '#0a0a0f',
  bgPanel: '#111118',
  bgCard: '#16161f',
  bgHover: '#1c1c27',
  bgActive: '#22222f',
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.12)',
  text: '#f0f0f6',
  textMuted: '#8888a0',
  textFaint: '#44445a',
  accent: '#7c6af7',
  accentDim: 'rgba(124,106,247,0.15)',
  accentHover: '#9080ff',
  userBubble: '#1e1b4b',
  userBubbleBorder: 'rgba(124,106,247,0.3)',
  assistantBubble: '#13131a',
  error: '#f87171',
  errorDim: 'rgba(248,113,113,0.12)',
  success: '#34d399',
} as const

export const font = {
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
  size: {
    xs: '11px',
    sm: '13px',
    base: '15px',
    md: '17px',
    lg: '20px',
    xl: '24px',
  },
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const
