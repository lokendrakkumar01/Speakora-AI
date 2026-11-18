# Speakora AI

An AI-assisted English communication learning platform for Hindi speakers. The repository includes a React + TypeScript dashboard and an Express + MongoDB API foundation. See the setup and deployment guide below.

## Setup

1. Install Node.js 20 or newer and MongoDB.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and set `MONGODB_URI`, `JWT_SECRET`, and `ADMIN_EMAIL`. Set `OPENAI_API_KEY` to enable server-side AI features.
4. Run `npm run dev`.

The web app runs at `http://localhost:5173` and the API at `http://localhost:4000`. Only the configured admin email receives the admin role during registration. Never put provider secrets in frontend code.

Deployment: run the API as a Render Web Service with `npm start`; deploy the Vite `dist` output to Vercel or Render Static Sites. Set `CLIENT_ORIGIN` to your deployed frontend origin. Configure an API proxy/rewrite for `/api/*`.

Core API: JWT registration/login; learner profiles and progress; paginated published topics and vocabulary; speaking practice and Hindi/English sentence coaching; admin content generation, authoring, and publication workflow. AI APIs return an explicit configuration error until an API key is configured.
