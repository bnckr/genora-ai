# Genora AI

> One prompt. Infinite possibilities.

Plataforma de criação com IA — imagens de alta qualidade powered by **Gemini (Nano Banana)**.

## Setup

```bash
npm install
cp .env.example .env.local
# Adicione sua GEMINI_API_KEY

npm run dev
```

Abra http://localhost:3000

## Variáveis de ambiente

Gere em: https://aistudio.google.com/apikey

> Também é necessário um bucket público chamado `generations` no Supabase Storage
> (Storage → New bucket → marcar como público), usado para hospedar as imagens
> geradas pelo Gemini antes de exibi-las na UI.