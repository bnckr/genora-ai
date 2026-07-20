import { GoogleGenAI } from '@google/genai'

export interface ImageInput {
  prompt: string
  // 'nano-banana'      -> gemini-2.5-flash-image      (rápido, barato)
  // 'nano-banana-pro'  -> gemini-3-pro-image-preview   (mais qualidade, mais caro)
  model?: 'nano-banana' | 'nano-banana-pro'
  aspectRatio?: '1:1' | '4:3' | '2:3' | '16:9' | '9:16'
}

export interface GeneratedImageFile {
  base64: string
  mimeType: string
}

export interface GenerationResult {
  jobId: string
  provider: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  images?: GeneratedImageFile[]
  error?: string
}

const MODEL_MAP: Record<NonNullable<ImageInput['model']>, string> = {
  'nano-banana': 'gemini-2.5-flash-image',
  'nano-banana-pro': 'gemini-3-pro-image-preview',
}

export async function generateImage(input: ImageInput): Promise<GenerationResult> {
  if (!process.env.GEMINI_API_KEY) {
    return {
      jobId: crypto.randomUUID(),
      provider: 'gemini',
      status: 'failed',
      error: 'GEMINI_API_KEY is not configured',
    }
  }

  const modelName = MODEL_MAP[input.model ?? 'nano-banana']
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: input.prompt,
      config: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: input.aspectRatio ?? '1:1',
        },
      },
    })

    const parts = response.candidates?.[0]?.content?.parts ?? []

    const images: GeneratedImageFile[] = parts
      .filter((part: any) => part.inlineData?.data)
      .map((part: any) => ({
        base64: part.inlineData.data as string,
        mimeType: (part.inlineData.mimeType as string) || 'image/png',
      }))

    if (images.length === 0) {
      return {
        jobId: crypto.randomUUID(),
        provider: 'gemini',
        status: 'failed',
        error: 'Nenhuma imagem retornada pelo Gemini',
      }
    }

    return {
      jobId: crypto.randomUUID(),
      provider: 'gemini',
      status: 'completed',
      images,
    }
  } catch (err) {
    console.error('[AI] Gemini (nano banana) generation failed', err)
    return {
      jobId: crypto.randomUUID(),
      provider: 'gemini',
      status: 'failed',
      error: String(err),
    }
  }
}