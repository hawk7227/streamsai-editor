import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'EditorPro — Visual Device Editor',
  description: '30 devices, browser modes, safe zones, click-to-inspect, visual editing',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#050607' }}>{children}</body>
    </html>
  )
}
