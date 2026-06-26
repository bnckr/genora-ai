import type { GenerationResult } from './image'

export interface VideoInput {
  prompt: string
  model: string
  duration?: number
}

export async function generateVideo(input: VideoInput): Promise<GenerationResult> {
  const provider = input.model === 'kling-v1' ? 'kling' : 'runwayml'
  if (provider === 'runwayml') return await runRunway(input)
  return await runKling(input)
}

async function runRunway(input: VideoInput): Promise<GenerationResult> {
  const res = await fetch('https://api.runwayml.com/v1/image_to_video', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt: input.prompt, model: 'gen3a_turbo', duration: input.duration ?? 5 }),
  })
  if (!res.ok) throw new Error(`RunwayML error: ${res.status}`)
  const data = await res.json()
  return { jobId: data.id, provider: 'runwayml', status: 'pending' }
}

async function runKling(_input: VideoInput): Promise<GenerationResult> {
  // Kling API — implementar conforme documentação
  throw new Error('Kling integration pending')
}
