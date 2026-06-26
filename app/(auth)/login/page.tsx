import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata: Metadata = { title: 'Entrar' }

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-white">Bem-vindo de volta</h1>
        <p className="text-sm text-white/40">Entre na sua conta para continuar criando.</p>
      </div>
      <LoginForm />
    </div>
  )
}
