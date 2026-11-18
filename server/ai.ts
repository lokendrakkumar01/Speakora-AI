import OpenAI from 'openai';

const client = process.env.OPENAI_API_KEY ? new OpenAI({apiKey:process.env.OPENAI_API_KEY}) : null;
export async function askAI(system: string, prompt: string, json = false): Promise<string> {
  if (!client) throw Object.assign(new Error('AI provider is not configured. Add OPENAI_API_KEY on the server to enable this feature.'),{status:503});
  const response = await client.chat.completions.create({model:process.env.OPENAI_MODEL||'gpt-4o-mini',temperature:.55,response_format:json?{type:'json_object'}:undefined,messages:[{role:'system',content:system},{role:'user',content:prompt}]});
  return response.choices[0]?.message?.content||'';
}
export const learningGuide = 'You are Speakora, a kind English communication coach for Hindi speakers. Prefer natural, clear English, never overcomplicate. Explain distinctions in simple Hindi when useful.';
