import type { GenerationResult } from './image'

export interface MusicInput { prompt: string; model: string; duration?: number }

export async function generateMusic(input: MusicInput): Promise<GenerationResult> {
  // Suno / Mubert — placeholder para integração
  void input
  throw new Error('Music generation not yet implemented')
}
