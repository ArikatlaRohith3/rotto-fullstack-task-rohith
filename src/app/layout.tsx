import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rotto — Find the right people',
  description: 'AI-powered candidate search for recruiters',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
