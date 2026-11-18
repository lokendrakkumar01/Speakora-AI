# Speakora AI

Speakora helps Hindi speakers express their own thoughts in natural English. This repository contains a responsive React + TypeScript learning dashboard and an Express + MongoDB API for authentication, published learning content, saved vocabulary, progress, speaking feedback, and admin-authored topics.

## What is implemented

- Responsive dark learning dashboard, category navigation, learning cards, vocabulary cards, daily streak UI, and light theme toggle.
- Browser speech playback and optional browser speech recognition for dictation. Availability depends on the browser and its installed voices.
- Eight guided speaking prompts with sample answers, browser voice input/playback, word-count coaching, and device-local speaking history.
- JWT registration and login, bcrypt password hashing, profile preferences, admin authorization, request validation, rate limiting, Helmet, and CORS.
- MongoDB models and paginated APIs for topics and vocabulary; learner saved-word and practice-history endpoints.
- AI sentence coaching (including vocabulary suggestions), generated speaking prompts/corrections, and admin lesson/vocabulary drafts through a server-only OpenRouter adapter. `OPENROUTER_API_KEY` is preferred; `OPENAI_API_KEY` remains a fallback. The key is never sent to the browser.
- Draft/review/published topic workflow and admin topic CRUD. Only published topics and vocabulary are returned from learner endpoints.
- GATE practice area with 2009–2026 year selection, 30 current paper choices, shared General Aptitude filtering, MCQ/MSQ/NAT metadata, paginated verified questions, answer/solution reveal, and an admin question editor with draft review, publish/delete, and JSON batch import.

The dashboard contains presentational learning examples while the API is being configured. AI-generated results, saved content, and personalized progress are served by the API and are not silently simulated. Media uploads, password recovery email, generated PDF exports, and hosted avatar/video generation still need deployment credentials and provider services before they can be enabled.

The GATE bank starts empty; question records require an admin import or entry, including the verified answer, worked solution, and source. The official [GATE 2026 download archive](https://gate2026.iitg.ac.in/download.html) links bulk previous-year papers for 2007–2025 and year-wise papers for 2021–2025. GATE 2026 master papers and answer keys are listed separately on the [official 2026 paper/key page](https://gate2026.iitg.ac.in/QPs-answer-keys.html). Official keys provide answers, not necessarily step-by-step worked explanations. Import only content you are permitted to republish; do not treat a question as verified without checking its official key.

## Local development

Requirements: Node.js 20 or later and a MongoDB database (local or Atlas).

```bash
npm install
cp .env.example .env
npm run dev
```

On PowerShell, copy the environment template with `Copy-Item .env.example .env`. Replace `<db_password>` in `MONGODB_URI` with the MongoDB database user's actual password. Set a long random `JWT_SECRET`, and optionally `OPENROUTER_API_KEY` with `OPENROUTER_MODEL=openai/gpt-4o-mini` (or use the OpenAI fallback). Configure `CLOUDINARY_URL` on the server from the Cloudinary Console; keep credentials in the ignored `.env` file. The Vite app runs on `http://localhost:5173`; the Express API runs on `http://localhost:4000`.

Only the account whose email exactly matches `ADMIN_EMAIL` receives the admin role. Set this Render environment variable to the intended admin email. Create the account from the app's **Admin sign in → Need an admin account?** flow; choose its password there. Passwords are hashed in MongoDB and must not be added as a Render environment variable. If this email already has a learner account, the next sign-in (or session check) upgrades it to admin. All other users remain learners, and the API checks the stored role before allowing question changes.

## API overview

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login` | Public | Create account / issue token |
| GET | `/api/auth/me`, `/api/progress` | Signed in | Current user and practice summary |
| PATCH | `/api/profile` | Signed in | Update name, interests, avatar preference |
| GET | `/api/topics`, `/api/vocabulary`, `/api/gate/questions` | Public | Paginated published content and GATE questions |
| GET | `/api/gate/questions/:id/solution` | Public | Verified answer and worked solution for a published question |
| POST | `/api/learn/sentence` | Signed in + AI key | Hindi/English sentence coaching |
| POST | `/api/learn/speaking-prompt`, `/api/learn/correct` | Signed in + AI key | Speaking practice |
| POST/PATCH/DELETE | `/api/admin/topics` | Admin | Create, review, publish, edit, archive or delete topics |
| POST | `/api/admin/topics/generate` | Admin + AI key | Generate an editable topic draft |
| POST | `/api/admin/vocabulary` | Admin | Create vocabulary |
| POST | `/api/admin/media` | Admin + Cloudinary | Upload a JPG, PNG, WebP, PDF, or MP4 (max 20 MB) to the `speakora/learning` Cloudinary folder |
| GET/POST | `/api/admin/gate/questions` | Admin | Review question bank and create a question draft |
| POST | `/api/admin/gate/questions/import` | Admin | Import up to 250 question objects from JSON as drafts |
| PATCH/DELETE | `/api/admin/gate/questions/:id` | Admin | Publish, edit, archive, or delete a question |

Send the JWT as `Authorization: Bearer <token>`. All AI calls are made by the server; keys must never be put in Vite variables or browser code.

## Deploy separately

### API on Render

### Deploy both services with Render

The included [`render.yaml`](./render.yaml) defines a Node API and a Vite static site. In Render, choose **New → Blueprint**, connect this GitHub repository, and select the `render.yaml` Blueprint. Render prompts for each `sync: false` value. Put secret values in the Render Dashboard, never in the YAML or frontend build.

For a manual deployment instead:

1. Create a Render **Web Service** from the repository for the API. Set Build Command to `npm ci && npm run build:server` and Start Command to `npm start`. Set `MONGODB_URI` to the MongoDB URI with the real database password, `JWT_SECRET` to a generated random secret, `CLOUDINARY_URL` to the server-side Cloudinary URL, `CLOUDINARY_CLOUD_NAME=dc6yyzex4`, `ADMIN_EMAIL` to the admin account email, and `NODE_ENV=production`. Set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL=openai/gpt-4o-mini` on this backend service only; `OPENAI_API_KEY` is an optional fallback. Set `CLIENT_ORIGIN` after the frontend service has its Render URL. The service health check is `/api/health`.
2. Create a Render **Static Site** from the same repository. Build Command: `npm ci && npm run build`. Publish Directory: `dist`. Set build-time `VITE_API_URL` to the API's full Render origin, such as `https://<your-api-service>.onrender.com` (no trailing slash). The frontend API client uses this origin for `/api/*` requests.
3. Copy the static site's exact `https://...onrender.com` origin into the API's `CLIENT_ORIGIN`, save, and redeploy the API. Keep the static site's SPA rewrite to `/index.html` for client-side routes.
4. In MongoDB Atlas, allow network access from Render as appropriate for your Atlas plan, then redeploy/check `/api/health` until it reports `database: connected`. In Cloudinary, use the API environment URL from the Console. Uploads are sent from the authenticated backend; the API secret is never put in Vite variables.

Render Blueprints prompt for secret `sync: false` values and preserve those values across later Blueprint syncs. Keep the API origin in `VITE_API_URL` public; never put database passwords, JWT secrets, OpenAI keys, or Cloudinary API secrets in frontend `VITE_*` variables.

### Frontend on Vercel or Render Static Site

Build with `npm run build` and publish the `dist` directory. Configure a rewrite/proxy for `/api/*` to the API service, or set up a deployment-specific API base URL in a future frontend environment configuration. On Render, the static site can use a rewrite rule to route API requests to the web service. Set `CLIENT_ORIGIN` on the API to the deployed frontend origin.

Do not commit `.env`, generated user data, or secrets. For production, use HTTPS, a persistent email provider for password resets, a managed file/object store for user media, and a dedicated admin provisioning process.

