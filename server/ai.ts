import OpenAI from 'openai';

const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
const directOpenAIKey = process.env.OPENAI_API_KEY?.trim();
const client = openRouterKey
  ? new OpenAI({
      apiKey: openRouterKey,
      baseURL: 'https://openrouter.ai/api/v1',
      timeout: 40000,
      maxRetries: 1,
      defaultHeaders: {
        'HTTP-Referer': process.env.APP_URL || 'https://speakora-ai-3s3a.onrender.com',
        'X-Title': 'Speakora AI',
      },
    })
  : directOpenAIKey ? new OpenAI({ apiKey: directOpenAIKey, timeout:40000, maxRetries:1 }) : null;
const model = openRouterKey
  ? (process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini')
  : (process.env.OPENAI_MODEL || 'gpt-4o-mini');

export async function askAI(system: string, prompt: string, json = false): Promise<string> {
  if (!client) throw Object.assign(new Error('AI provider is not configured. Add OPENROUTER_API_KEY or OPENAI_API_KEY to the backend environment.'),{status:503});
  try{const response = await client.chat.completions.create({model,temperature:.55,response_format:json?{type:'json_object'}:undefined,messages:[{role:'system',content:system},{role:'user',content:prompt}]});return response.choices[0]?.message?.content||'';}catch(error:any){const status=Number(error?.status);const message=status===401?'The configured AI key was rejected. Update OPENROUTER_API_KEY in the backend environment.':status===402?'The AI provider requires an available credit balance.':status===404?'The configured AI model was not found. Check OPENROUTER_MODEL.':status===429?'The AI provider rate limit was reached. Wait briefly and try again.':error?.name==='APIConnectionTimeoutError'?'The AI provider timed out. Please try again.':error?.name==='APIConnectionError'?'The backend could not connect to the AI provider. Check the backend network and provider status.':'The AI provider could not complete this request. Check the backend AI configuration.';throw Object.assign(new Error(message),{status:status>=400&&status<500?status:503});}
}
export async function checkAIConnection():Promise<{configured:boolean;provider:string;model:string;upstream:'healthy'|'failed'|'not-configured'}>{const provider=openRouterKey?'openrouter':directOpenAIKey?'openai':'not-configured';if(!client)return{configured:false,provider,model,upstream:'not-configured'};try{const listed=await client.models.list();const available=listed.data.some((item:any)=>item.id===model);return{configured:true,provider,model,upstream:available?'healthy':'failed'}}catch{return{configured:true,provider,model,upstream:'failed'}}}
export const learningGuide = 'You are Speakora, a kind English communication coach for Hindi speakers. Prefer natural, clear English, never overcomplicate. Explain distinctions in simple Hindi when useful.';

