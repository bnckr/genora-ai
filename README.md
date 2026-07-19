# Genora

> One prompt. Infinite possibilities.

Plataforma de criação com IA — imagens de alta qualidade (powered by **Krea**), avatares, voz e música.

**Status atual**: Foco em geração de imagens via Krea AI.  
Vídeo (text-to-video / image-to-video) **desabilitado temporariamente**.

## Stack

- **Frontend**: Next.js 15 (App Router) + Tailwind CSS + shadcn/ui
- **Backend**: Next.js API Routes
- **Banco**: Supabase (PostgreSQL + Storage)
- **Auth**: Supabase Auth
- **Pagamentos**: Stripe
- **AI Images**: Krea AI (Krea 2 Medium / Large)

## Setup rápido

```bash
# 1. Clone e setup
git clone <repo>
cd genora
./setup.sh

# 2. Configure variáveis de ambiente
cp .env.local.example .env.local
# Edite .env.local com suas chaves (obrigatório: KREA_API_KEY)

# 3. Configure o banco de dados
# Cole o conteúdo de schema.sql no Supabase SQL Editor

# 4. Rode o dev
npm run dev
```

## Variáveis importantes

```env
KREA_API_KEY=sua_chave_krea          # Obrigatório para imagens
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Gere sua chave em: https://www.krea.ai/settings/api-tokens

## Planos

| Plano     | Preço/mês | Créditos |
|-----------|-----------|----------|
| Free      | Grátis    | 50       |
| Pro       | R$ 59     | 500      |
| Business  | R$ 199    | 2.000    |

## Estrutura principal

```
genora/
├── app/
│   ├── (public)/          # Landing + Pricing
│   ├── (auth)/            # Login + Signup
│   ├── (dashboard)/       # Dashboard, Studio, Projetos
│   └── api/
│       ├── generate/      # image (Krea), voice, music...
│       ├── credits/
│       ├── projects/
│       └── ...
├── lib/ai/                # image.ts (Krea), voice, music...
└── ...
```

## Integração Krea

O arquivo `lib/ai/image.ts` usa o SDK oficial `@krea-ai/sdk`.

Modelos suportados:
- `krea-2-medium` (padrão, mais rápido e barato)
- `krea-2-large` (maior qualidade)

Feito com ❤️ para criadores.
