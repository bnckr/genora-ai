import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-5xl font-bold text-center mb-4">
        One prompt.<br />Infinite possibilities.
      </h1>
      <p className="text-xl text-muted-foreground text-center mb-8 max-w-lg">
        Gere imagens, vídeos, avatares e muito mais com IA — em segundos.
      </p>
      <div className="flex gap-4">
        <Link
          href="/signup"
          className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors"
        >
          Começar grátis
        </Link>
        <Link
          href="/pricing"
          className="px-6 py-3 border border-border hover:bg-muted rounded-lg font-medium transition-colors"
        >
          Ver planos
        </Link>
      </div>
    </main>
  )
}
