import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/queries'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar component aqui */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
