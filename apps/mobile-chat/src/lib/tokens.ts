/** Design tokens — StreamsAI Chat */

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
} as const

export const radius = {
  xs: '6px',
  sm: '10px',
  md: '14px',
  lg: '18px',
  xl: '22px',
  full: '999px',
} as const

export const shadow = {
  sm: '0 1px 3px rgba(0,0,0,.3)',
  md: '0 4px 16px rgba(0,0,0,.4)',
  lg: '0 12px 40px rgba(0,0,0,.5)',
} as const

export const motion = {
  snap: '120ms',
  fast: '160ms',
  normal: '220ms',
  easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const

export const color = {
  bg:           '#0f0f0f',
  bgElevated:   '#1a1a1a',
  bgCard:       '#222222',
  bgInput:      '#1c1c1e',
  bgHover:      '#2a2a2a',
  border:       'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
  text:         '#f5f5f5',
  textSub:      '#a0a0a0',
  textFaint:    '#4a4a4a',
  userBg:       '#1a7a4a',
  userBgLight:  '#22a060',
  userText:     '#ffffff',
  aiBg:         '#1e1e1e',
  aiBorder:     'rgba(255,255,255,0.07)',
  aiText:       '#f0f0f0',
  accent:       '#22c55e',
  accentDim:    'rgba(34,197,94,0.12)',
  accentGlow:   'rgba(34,197,94,0.25)',
  error:        '#ef4444',
  errorDim:     'rgba(239,68,68,0.12)',
  success:      '#22c55e',
  codeBg:       '#141414',
  codeBar:      '#1c1c1c',
} as const

export const font = {
  sans: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif",
  mono: "'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
  size: {
    xs:   '11px',
    sm:   '13px',
    base: '16px',
    md:   '17px',
    lg:   '20px',
    xl:   '26px',
  },
  weight: {
    normal:   400,
    medium:   500,
    semibold: 600,
    bold:     700,
  },
} as const
