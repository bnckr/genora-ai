import { getCurrentUser } from '@/lib/supabase/queries'

export default async function DashboardPage() {
  const user = await getCurrentUser()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">
        Olá, {user?.full_name ?? 'Criador'} 👋
      </h1>
      {/* Dashboard widgets aqui */}
    </div>
  )
}
