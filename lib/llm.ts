import OpenAI from 'openai';

// DeepSeek is OpenAI-compatible — same SDK, different base URL + model
export function createLLMClient() {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com/v1',
  });
}

export const LLM_MODEL = 'deepseek-chat';

export async function callLLM(prompt: string, maxTokens = 256): Promise<string> {
  const client = createLLMClient();
  const res = await client.chat.completions.create({
    model: LLM_MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  return res.choices[0]?.message?.content?.trim() || '';
}
