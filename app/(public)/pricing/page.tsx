import Link from "next/link";
import { Check, Sparkles, Zap, ArrowRight, X } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "R$ 0",
    period: "para sempre",
    description: "Ideal para experimentar e criar suas primeiras imagens.",
    credits: "50 créditos / mês",
    cta: "Começar grátis",
    href: "/signup",
    highlighted: false,
    features: [
      { text: "50 gerações de imagem", included: true },
      { text: "Modelo Krea 2 Medium", included: true },
      { text: "Resolução até 1K", included: true },
      { text: "Histórico básico", included: true },
      { text: "Modelo Krea 2 Large", included: false },
      { text: "Prioridade na fila", included: false },
      { text: "Suporte prioritário", included: false },
    ],
  },
  {
    name: "Pro",
    price: "R$ 59",
    period: "/mês",
    description: "Para criadores que precisam de volume e mais qualidade.",
    credits: "500 créditos / mês",
    cta: "Assinar Pro",
    href: "/signup?plan=pro",
    highlighted: true,
    features: [
      { text: "500 gerações de imagem", included: true },
      { text: "Modelo Krea 2 Medium", included: true },
      { text: "Modelo Krea 2 Large", included: true },
      { text: "Resolução até 1K", included: true },
      { text: "Prioridade na fila", included: true },
      { text: "Histórico completo", included: true },
      { text: "Suporte prioritário", included: true },
    ],
  },
  {
    name: "Business",
    price: "R$ 199",
    period: "/mês",
    description: "Para equipes e uso profissional intensivo.",
    credits: "2.000 créditos / mês",
    cta: "Assinar Business",
    href: "/signup?plan=business",
    highlighted: false,
    features: [
      { text: "2.000 gerações de imagem", included: true },
      { text: "Todos os modelos Krea", included: true },
      { text: "Resolução máxima", included: true },
      { text: "Prioridade máxima", included: true },
      { text: "Múltiplos usuários", included: true },
      { text: "Acesso à API (em breve)", included: true },
      { text: "Suporte dedicado", included: true },
    ],
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#0D0622] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0D0622]/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img src="/assets/genora-logo.png" alt="Genora" className="h-8 w-auto" />
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="font-display text-sm font-medium px-5 py-2.5 rounded-full border border-white/15 
                         bg-white/5 hover:bg-white/10 hover:border-cyan-400/40 transition-all"
            >
              Entrar
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-20 pb-14 px-4 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-cyan-400 mb-6">
          <Sparkles className="w-4 h-4" />
          Planos simples e transparentes
        </div>

        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-5">
          Planos flexíveis para
          <br />
          <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-violet-300 bg-clip-text text-transparent">
            todo tipo de criador
          </span>
        </h1>

        <p className="text-white/60 text-lg max-w-2xl mx-auto">
          Comece grátis e faça upgrade quando precisar de mais poder e qualidade.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 items-start">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-7 border transition-all ${
                plan.highlighted
                  ? "bg-gradient-to-b from-violet-900/50 to-[#0D0622] border-violet-500/50 shadow-2xl shadow-violet-900/30"
                  : "bg-white/[0.03] border-white/10 hover:border-white/20"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-xs font-semibold shadow-lg">
                    <Zap className="w-3.5 h-3.5" />
                    Mais popular
                  </span>
                </div>
              )}

              <div className="mb-5">
                <h3 className="font-display text-xl font-semibold mb-1">{plan.name}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-end gap-1.5">
                  <span className="font-display text-4xl font-bold tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-white/50 text-sm mb-1.5">{plan.period}</span>
                </div>
                <p className="text-cyan-400 text-sm font-medium mt-1">{plan.credits}</p>
              </div>

              <Link
                href={plan.href}
                className={`font-display w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold transition-all mb-7 ${
                  plan.highlighted
                    ? "bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white shadow-lg shadow-violet-600/30"
                    : "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                }`}
              >
                {plan.cta}
                <ArrowRight className="w-4 h-4" />
              </Link>

              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex items-start gap-3 text-sm">
                    {feature.included ? (
                      <Check className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-white/25 mt-0.5 shrink-0" />
                    )}
                    <span className={feature.included ? "text-white/85" : "text-white/35"}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison note */}
      <section className="pb-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-white/40 text-sm">
            Todos os planos incluem acesso à plataforma e atualizações futuras.
            Você pode fazer upgrade ou cancelar a qualquer momento.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="pb-24 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-center mb-10">
            Perguntas frequentes
          </h2>

          <div className="space-y-3">
            {[
              {
                q: "O que são créditos?",
                a: "Cada geração de imagem consome créditos. O consumo varia conforme o modelo utilizado (Medium ou Large).",
              },
              {
                q: "Posso cancelar a qualquer momento?",
                a: "Sim. Não há fidelidade. Você pode fazer upgrade, downgrade ou cancelar quando quiser.",
              },
              {
                q: "Os créditos acumulam para o próximo mês?",
                a: "No plano Free os créditos renovam mensalmente. Nos planos pagos, o acúmulo de créditos estará disponível em breve.",
              },
              {
                q: "Qual a diferença entre Medium e Large?",
                a: "O modelo Large oferece mais detalhes e qualidade superior, consumindo mais créditos por geração.",
              },
            ].map((item) => (
              <div
                key={item.q}
                className="bg-white/[0.03] border border-white/10 rounded-xl p-5"
              >
                <h4 className="font-medium mb-1.5">{item.q}</h4>
                <p className="text-white/55 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="pb-24 px-4">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-b from-violet-900/30 to-transparent border border-violet-500/20 rounded-3xl px-8 py-14">
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
            Pronto para criar sem limites?
          </h2>
          <p className="text-white/60 mb-8 max-w-lg mx-auto">
            Comece gratuitamente agora e faça upgrade quando precisar de mais poder.
          </p>
          <Link
            href="/signup"
            className="font-display inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-600/30"
          >
            Criar conta grátis
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-4 text-center text-white/40 text-sm">
        © {new Date().getFullYear()} Genora AI. One prompt. Infinite possibilities.
      </footer>
    </main>
  );
}