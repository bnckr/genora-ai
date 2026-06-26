'use client'

import { useQuery } from '@tanstack/react-query'
import { useUserStore } from '@/store/user.store'

export function useCredits() {
  const { credits, setCredits } = useUserStore()

  const { data, isLoading } = useQuery({
    queryKey: ['credits'],
    queryFn:  async () => {
      const res = await fetch('/api/credits')
      if (!res.ok) throw new Error('Failed to fetch credits')
      return res.json() as Promise<{ balance: number }>
    },
    refetchInterval: 30_000, // atualiza a cada 30s
    staleTime:       10_000,
  })

  // Sincroniza store quando query retorna
  if (data && data.balance !== credits) {
    setCredits(data.balance)
  }

  return { credits: data?.balance ?? credits, isLoading }
}
