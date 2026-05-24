import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export const geminiFlash = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-preview-05-20',
})

export async function generateContent(prompt: string): Promise<string> {
  const result = await geminiFlash.generateContent(prompt)
  return result.response.text()
}

export async function streamContent(prompt: string) {
  const result = await geminiFlash.generateContentStream(prompt)
  return result.stream
}
