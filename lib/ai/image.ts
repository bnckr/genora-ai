export interface ImageInput {
  prompt: string
  model: string
  width?: number
  height?: number
  seed?: number
}

export interface GenerationResult {
  jobId: string
  provider: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  outputUrls?: string[]
  error?: string
}

const PROVIDERS: Record<string, string> = {
  'flux-schnell': 'replicate',
  'flux-dev':     'replicate',
  'sdxl':         'replicate',
  'dall-e-3':     'openai',
}

export async function generateImage(input: ImageInput): Promise<GenerationResult> {
  const provider = PROVIDERS[input.model] ?? 'replicate'

  try {
    if (provider === 'replicate') return await runReplicate(input)
    if (provider === 'openai')    return await runDallE(input)
    throw new Error(`Unknown provider: ${provider}`)
  } catch (err) {
    // Fallback: replicate → fal.ai
    if (provider === 'replicate') {
      console.warn('[AI] Replicate failed, falling back to fal.ai', err)
      return await runFal(input)
    }
    throw err
  }
}

async function runReplicate(input: ImageInput): Promise<GenerationResult> {
  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: getReplicateVersion(input.model),
      input: { prompt: input.prompt, width: input.width ?? 1024, height: input.height ?? 1024 },
    }),
  })
  if (!res.ok) throw new Error(`Replicate error: ${res.status}`)
  const data = await res.json()
  return { jobId: data.id, provider: 'replicate', status: 'pending' }
}

async function runFal(input: ImageInput): Promise<GenerationResult> {
  const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
    method: 'POST',
    headers: {
      Authorization: `Key ${process.env.FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt: input.prompt }),
  })
  if (!res.ok) throw new Error(`fal.ai error: ${res.status}`)
  const data = await res.json()
  return { jobId: data.request_id, provider: 'fal', status: 'pending' }
}

async function runDallE(input: ImageInput): Promise<GenerationResult> {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'dall-e-3', prompt: input.prompt, n: 1, size: '1024x1024' }),
  })
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`)
  const data = await res.json()
  return {
    jobId:      crypto.randomUUID(),
    provider:   'openai',
    status:     'completed',
    outputUrls: [data.data[0].url],
  }
}

function getReplicateVersion(model: string): string {
  const versions: Record<string, string> = {
    'flux-schnell': 'black-forest-labs/flux-schnell',
    'flux-dev':     'black-forest-labs/flux-dev',
    'sdxl':         'stability-ai/sdxl:39ed52f2319f9d96b0fc5ced24f4507097e88e2b8d0b29c6e38c5e5b7e1e3f5e',
  }
  return versions[model] ?? 'black-forest-labs/flux-schnell'
}
