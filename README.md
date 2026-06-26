# Genora

> One prompt. Infinite possibilities.

Plataforma all-in-one de criação com IA — imagens, vídeos, avatares, voz e música.

## Stack

- **Frontend**: Next.js 15 (App Router) + Tailwind CSS + shadcn/ui
- **Backend**: Next.js API Routes
- **Banco**: Supabase (PostgreSQL + Storage)
- **Auth**: Supabase Auth
- **Pagamentos**: Stripe
- **AI**: Replicate, fal.ai, RunwayML, ElevenLabs, OpenAI

## Setup rápido

```bash
# 1. Clone e setup
git clone <repo>
cd genora
./setup.sh

# 2. Configure variáveis de ambiente
cp .env.local.example .env.local
# Edite .env.local com suas chaves

# 3. Configure o banco de dados
# Cole o conteúdo de schema.sql no Supabase SQL Editor

# 4. Rode o dev
npm run dev
```

## Estrutura de pastas

```
genora/
├── app/
│   ├── (public)/          # Landing + Pricing (sem auth)
│   ├── (auth)/            # Login + Signup
│   ├── (dashboard)/       # Dashboard, Studio, Projetos, Conta
│   └── api/               # API Routes
│       ├── auth/          # Supabase auth callback
│       ├── generate/      # image, video, avatar, voice, music
│       ├── credits/       # Saldo de créditos
│       ├── plans/         # Listagem de planos
│       ├── projects/      # CRUD de projetos
│       ├── checkout/      # Stripe Checkout Session
│       └── webhooks/      # Stripe Webhooks
├── components/
│   ├── ui/                # shadcn/ui
│   ├── studio/            # Editores por feature
│   ├── gallery/           # Grid de resultados
│   ├── layout/            # Header, Sidebar, Footer
│   └── modals/            # UpgradeModal, etc.
├── hooks/                 # useGeneration, useCredits, useProjects
├── lib/
│   ├── supabase/          # client, server, admin, queries
│   ├── ai/                # image, video, voice, music, prompt
│   ├── stripe/            # checkout e webhooks
│   └── utils/             # cn, withAuth, withCredits
├── store/                 # Zustand (user, generation)
├── types/                 # TypeScript types globais
└── middleware.ts           # Auth + redirect guard
```

## Variáveis de ambiente

Veja `.env.local.example` para a lista completa.

## Planos

| Plano    | Preço/mês | Créditos |
|----------|-----------|----------|
| Free     | Grátis    | 50       |
| Pro      | R$ 59     | 500      |
| Business | R$ 199    | 2.000    |
