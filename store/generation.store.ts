import { create } from 'zustand'
import type { Generation, GenerationFeature } from '@/types'

interface GenerationStore {
  activeFeature:  GenerationFeature
  pendingJobs:    Record<string, Generation>
  setFeature:     (feature: GenerationFeature) => void
  addJob:         (job: Generation) => void
  updateJob:      (id: string, updates: Partial<Generation>) => void
  removeJob:      (id: string) => void
}

export const useGenerationStore = create<GenerationStore>((set) => ({
  activeFeature: 'image',
  pendingJobs:   {},
  setFeature:    (feature) => set({ activeFeature: feature }),
  addJob:        (job) => set((s) => ({ pendingJobs: { ...s.pendingJobs, [job.id]: job } })),
  updateJob:     (id, updates) =>
    set((s) => ({
      pendingJobs: {
        ...s.pendingJobs,
        [id]: { ...s.pendingJobs[id], ...updates },
      },
    })),
  removeJob:     (id) =>
    set((s) => {
      const { [id]: _, ...rest } = s.pendingJobs
      return { pendingJobs: rest }
    }),
}))
