import Link from "next/link";
import {
  Sparkles,
  Image as ImageIcon,
  Mic,
  Music,
  Zap,
  ArrowRight,
} from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0D0622] text-white overflow-hidden">
      {/* ===== HEADER / NAV ===== */}
      <header className="absolute top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img
              src="/assets/genora-logo.png"
              alt="Genora"
              className="h-8 w-auto"
            />
          </Link>

          <Link
            href="/login"
            className="font-display text-sm font-medium px-5 py-2.5 rounded-full border border-white/15 
                 bg-white/5 hover:bg-white/10 hover:border-cyan-400/40 
                 transition-all backdrop-blur-sm"
          >
            Entrar
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-32">
        {/* ===== BACKGROUND IMAGE ===== */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('/assets/bg-hero.png')] bg-cover bg-center opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0D0622]/70 via-[#0D0622]/50 to-[#0D0622]" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-violet-600/15 rounded-full blur-[140px] pointer-events-none" />
        </div>

        {/* Conteúdo */}
        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-cyan-400 mb-8 backdrop-blur-sm">
            <Sparkles className="w-4 h-4" />
            Powered by Krea AI
          </div>

          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6">
            One prompt.
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-violet-300 bg-clip-text text-transparent">
              Infinite possibilities.
            </span>
          </h1>

          <p className="font-display text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-10">
            Crie imagens incríveis com IA de última geração. Avatares, voz e
            música em um só lugar. Simples. Rápido. Poderoso.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="font-display inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-600/30"
            >
              Começar grátis
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/pricing"
              className="font-display inline-flex items-center justify-center px-8 py-4 border border-white/20 hover:bg-white/5 text-white font-medium rounded-xl transition-colors backdrop-blur-sm"
            >
              Ver planos
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-center mb-4">
            Tudo o que você precisa para criar
          </h2>
          <p className="font-display text-white/60 text-center mb-16 max-w-xl mx-auto">
            Foque em imagens de alta qualidade com Krea. Mais modalidades em
            breve.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<ImageIcon className="w-6 h-6" />}
              title="Imagens com Krea"
              description="Gere imagens fotorealistas ou artísticas com o modelo Krea 2. Aspect ratios flexíveis e qualidade 1K."
              highlight
            />
            <FeatureCard
              icon={<Mic className="w-6 h-6" />}
              title="Voz & Avatares"
              description="Crie vozes naturais e avatares realistas. Em breve integrado ao seu fluxo de trabalho."
            />
            <FeatureCard
              icon={<Music className="w-6 h-6" />}
              title="Música"
              description="Componha trilhas originais a partir de um simples prompt. Disponível em breve."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center bg-white/5 border border-white/10 rounded-3xl p-12">
          <Zap className="w-12 h-12 text-cyan-400 mx-auto mb-6" />
          <h2 className="font-display text-3xl font-bold mb-4">
            Pronto para criar?
          </h2>
          <p className="font-display text-white/70 mb-8">
            50 créditos grátis no plano Free. Sem cartão de crédito.
          </p>
          <Link
            href="/signup"
            className="font-display inline-flex items-center gap-2 px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-xl transition-colors"
          >
            Criar conta grátis
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-4 text-center text-white/40 text-sm">
        © {new Date().getFullYear()} Genora AI. One prompt. Infinite
        possibilities.
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  highlight = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-6 rounded-2xl border transition-all ${
        highlight
          ? "bg-gradient-to-b from-violet-900/50 to-transparent border-violet-500/40 shadow-lg shadow-violet-900/20"
          : "bg-white/5 border-white/10 hover:border-white/20"
      }`}
    >
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
          highlight ? "bg-cyan-500/20 text-cyan-400" : "bg-white/10 text-white"
        }`}
      >
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-white/60 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
