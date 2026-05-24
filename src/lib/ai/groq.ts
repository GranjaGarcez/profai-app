import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function reviewCode(code: string, task: string): Promise<string> {
  const response = await groq.chat.completions.create({
    model: 'qwen-qwq-32b',
    messages: [
      {
        role: 'user',
        content: `Review this code for task: "${task}"\n\nCode:\n${code}\n\nReply ONLY with APPROVED or a numbered list of specific issues to fix.`,
      },
    ],
    max_tokens: 500,
  })
  return response.choices[0]?.message?.content ?? 'APPROVED'
}
