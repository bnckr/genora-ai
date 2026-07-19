import { Krea } from '@krea-ai/sdk'

export interface ImageInput {
  prompt: string
  model?: 'krea-2-medium' | 'krea-2-large'
  aspectRatio?: '1:1' | '4:3' | '2:3' | '16:9' | '9:16'
}

export interface GenerationResult {
  jobId: string
  provider: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  outputUrls?: string[]
  error?: string
}

export async function generateImage(input: ImageInput): Promise<GenerationResult> {
  if (!process.env.KREA_API_KEY) {
    return {
      jobId: crypto.randomUUID(),
      provider: 'krea',
      status: 'failed',
      error: 'KREA_API_KEY is not configured',
    }
  }

  const krea = new Krea({ apiKey: process.env.KREA_API_KEY })

  const modelPath =
    input.model === 'krea-2-large'
      ? 'image/krea/krea-2/large'
      : 'image/krea/krea-2/medium'

  try {
    const result = await krea.subscribe(modelPath, {
      input: {
        prompt: input.prompt,
        aspect_ratio: input.aspectRatio ?? '1:1',
        resolution: '1K',
      },
    })

    const urls =
      (result as any).data?.urls ??
      (result as any).result?.urls ??
      (result as any).output?.urls ??
      []

    return {
      jobId: (result as any).job_id || crypto.randomUUID(),
      provider: 'krea',
      status: 'completed',
      outputUrls: Array.isArray(urls) ? urls : [],
    }
  } catch (err) {
    console.error('[AI] Krea generation failed', err)
    return {
      jobId: crypto.randomUUID(),
      provider: 'krea',
      status: 'failed',
      error: String(err),
    }
  }
}