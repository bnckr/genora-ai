import type { GenerationResult } from './image'

export interface VoiceInput {
  text: string
  model: string
  voiceId?: string
}

export async function generateVoice(input: VoiceInput): Promise<GenerationResult> {
  if (input.model === 'openai-tts') return await runOpenAITTS(input)
  return await runElevenLabs(input)
}

async function runElevenLabs(input: VoiceInput): Promise<GenerationResult> {
  const voiceId = input.voiceId ?? 'pNInz6obpgDQGcFmaJgB'
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key':   process.env.ELEVENLABS_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: input.text, model_id: 'eleven_multilingual_v2' }),
  })
  if (!res.ok) throw new Error(`ElevenLabs error: ${res.status}`)
  return { jobId: crypto.randomUUID(), provider: 'elevenlabs', status: 'completed' }
}

async function runOpenAITTS(input: VoiceInput): Promise<GenerationResult> {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'tts-1', input: input.text, voice: 'nova' }),
  })
  if (!res.ok) throw new Error(`OpenAI TTS error: ${res.status}`)
  return { jobId: crypto.randomUUID(), provider: 'openai', status: 'completed' }
}
