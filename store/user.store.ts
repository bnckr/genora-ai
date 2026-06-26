import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Plan } from '@/types'

interface UserStore {
  user:    User | null
  plan:    Plan | null
  credits: number
  setUser:    (user: User, plan: Plan) => void
  setCredits: (credits: number) => void
  clear:      () => void
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user:    null,
      plan:    null,
      credits: 0,
      setUser: (user, plan) => set({ user, plan, credits: user.credits_balance }),
      setCredits: (credits) =>
        set((state) => ({ credits, user: state.user ? { ...state.user, credits_balance: credits } : null })),
      clear: () => set({ user: null, plan: null, credits: 0 }),
    }),
    { name: 'genora-user', partialize: (s) => ({ credits: s.credits }) },
  ),
)
