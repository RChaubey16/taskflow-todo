import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TaskFlow — Todo List',
  description: 'A beautiful and accessible todo list application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  )
}
