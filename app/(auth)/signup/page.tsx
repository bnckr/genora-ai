import type { Metadata } from 'next'
import { SignupForm } from '@/components/auth/SignupForm'

export const metadata: Metadata = { title: 'Criar conta' }

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-white">Crie sua conta</h1>
        <p className="text-sm text-white/40">50 créditos grátis para começar. Sem cartão.</p>
      </div>
      <SignupForm />
    </div>
  )
}
