'use client'

import { useState, useCallback, useRef } from 'react'
import { useGenerationStore } from '@/store/generation.store'
import { useUserStore } from '@/store/user.store'
import type { GenerationFeature } from '@/types'

interface GenerateOptions {
  feature:   GenerationFeature
  prompt:    string
  model:     string
  projectId?: string
  metadata?: Record<string, unknown>
}

export function useGeneration() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { addJob, updateJob } = useGenerationStore()
  const { setCredits } = useUserStore()
  const sseRef = useRef<EventSource | null>(null)

  const generate = useCallback(async (options: GenerateOptions) => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/generate/${options.feature}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(options),
      })

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Generation failed')
      }

      const { generation, credits_balance } = await res.json()
      addJob(generation)
      setCredits(credits_balance)

      // Poll status via SSE for async jobs (video, avatar)
      if (generation.status === 'pending') {
        pollStatus(generation.id)
      }

      return generation
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [addJob, setCredits])

  const pollStatus = useCallback((generationId: string) => {
    sseRef.current?.close()
    const sse = new EventSource(`/api/generate/${generationId}/status`)
    sseRef.current = sse

    sse.onmessage = (e) => {
      const data = JSON.parse(e.data)
      updateJob(generationId, data)
      if (data.status === 'completed' || data.status === 'failed') {
        sse.close()
      }
    }

    sse.onerror = () => sse.close()
  }, [updateJob])

  return { generate, isLoading, error }
}
