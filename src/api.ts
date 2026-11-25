const apiBase = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://speakora-ai-backend-ypyx.onrender.com' : '')).replace(/\/+$/, '');
export const apiUrl = (path: string) => `${apiBase}${path.startsWith('/') ? path : `/${path}`}`;
