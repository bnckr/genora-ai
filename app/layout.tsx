import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Genora AI — One prompt. Infinite possibilities.',
  description: 'Crie imagens incríveis com IA de última geração. Powered by Krea.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-[#0D0622] text-white`}>
        {children}
      </body>
    </html>
  )
}
