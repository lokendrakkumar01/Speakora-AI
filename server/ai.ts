import OpenAI from 'openai';

const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
const directOpenAIKey = process.env.OPENAI_API_KEY?.trim();
const client = openRouterKey
  ? new OpenAI({
      apiKey: openRouterKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.APP_URL || 'https://speakora-ai-3s3a.onrender.com',
        'X-Title': 'Speakora AI',
      },
    })
  : directOpenAIKey ? new OpenAI({ apiKey: directOpenAIKey }) : null;
const model = openRouterKey
  ? (process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini')
  : (process.env.OPENAI_MODEL || 'gpt-4o-mini');

export async function askAI(system: string, prompt: string, json = false): Promise<string> {
  if (!client) throw Object.assign(new Error('AI provider is not configured. Add OPENROUTER_API_KEY or OPENAI_API_KEY to the backend environment.'),{status:503});
  const response = await client.chat.completions.create({model,temperature:.55,response_format:json?{type:'json_object'}:undefined,messages:[{role:'system',content:system},{role:'user',content:prompt}]});
  return response.choices[0]?.message?.content||'';
}
export const learningGuide = 'You are Speakora, a kind English communication coach for Hindi speakers. Prefer natural, clear English, never overcomplicate. Explain distinctions in simple Hindi when useful.';

