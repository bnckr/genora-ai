#!/usr/bin/env bash
set -e

echo ""
echo "  ╔════════════════════════════════╗"
echo "  ║   Genora — Setup Completo      ║"
echo "  ╚════════════════════════════════╝"
echo ""

# 1. Dependências
echo "→ Instalando dependências..."
npm install

# 2. shadcn/ui
echo ""
echo "→ Inicializando shadcn/ui..."
npx shadcn@latest init --yes --defaults

# 3. Componentes shadcn essenciais
echo ""
echo "→ Instalando componentes shadcn..."
npx shadcn@latest add button input label card badge dialog sheet toast --yes

# 4. .env.local
if [ ! -f .env.local ]; then
  cp .env.local.example .env.local
  echo ""
  echo "→ .env.local criado — preencha as variáveis antes de rodar o dev"
fi

echo ""
echo "✅ Setup concluído!"
echo ""
echo "  Próximos passos:"
echo "  1. Preencha .env.local com suas chaves"
echo "  2. Rode o schema SQL no Supabase SQL Editor"
echo "  3. npm run dev"
echo ""
