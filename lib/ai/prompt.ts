export async function enhancePrompt(prompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a creative AI prompt engineer. Enhance the user\'s prompt to be more detailed, vivid, and effective for image/video generation. Return only the enhanced prompt, no explanation.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 300,
    }),
  })
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`)
  const data = await res.json()
  return data.choices[0].message.content.trim()
}
