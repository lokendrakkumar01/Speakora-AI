# Speakora AI

Speakora helps Hindi speakers express their own thoughts in natural English. This repository contains a responsive React + TypeScript learning dashboard and an Express + MongoDB API for authentication, published learning content, saved vocabulary, progress, speaking feedback, and admin-authored topics.

## What is implemented

- Responsive dark learning dashboard, category navigation, learning cards, vocabulary cards, daily streak UI, and light theme toggle.
- Browser speech playback and optional browser speech recognition for dictation. Availability depends on the browser and its installed voices.
- JWT registration and login, bcrypt password hashing, profile preferences, admin authorization, request validation, rate limiting, Helmet, and CORS.
- MongoDB models and paginated APIs for topics and vocabulary; learner saved-word and practice-history endpoints.
- AI sentence coaching, speaking prompts and corrections, and admin topic generation through a server-only OpenAI provider adapter. The API returns an explicit configuration error when `OPENAI_API_KEY` is absent.
- Draft/review/published topic workflow and admin topic CRUD. Only published topics and vocabulary are returned from learner endpoints.

The dashboard contains presentational learning examples while the API is being configured. AI-generated results, saved content, and personalized progress are served by the API and are not silently simulated. Media uploads, password recovery email, generated PDF exports, and hosted avatar/video generation still need deployment credentials and provider services before they can be enabled.

## Local development

Requirements: Node.js 20 or later and a MongoDB database (local or Atlas).

```bash
npm install
cp .env.example .env
npm run dev
```

On PowerShell, copy the environment template with `Copy-Item .env.example .env`. Fill in `MONGODB_URI`, a long random `JWT_SECRET`, and optionally `OPENAI_API_KEY`. The Vite app runs on `http://localhost:5173`; the Express API runs on `http://localhost:4000`.

The first registration using the address configured in `ADMIN_EMAIL` receives the admin role. Set this value before creating the intended admin account. All other users receive the learner role; a client-supplied role is never trusted.

## API overview

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login` | Public | Create account / issue token |
| GET | `/api/auth/me`, `/api/progress` | Signed in | Current user and practice summary |
| PATCH | `/api/profile` | Signed in | Update name, interests, avatar preference |
| GET | `/api/topics`, `/api/vocabulary` | Public | Paginated published content |
| POST | `/api/learn/sentence` | Signed in + AI key | Hindi/English sentence coaching |
| POST | `/api/learn/speaking-prompt`, `/api/learn/correct` | Signed in + AI key | Speaking practice |
| POST/PATCH/DELETE | `/api/admin/topics` | Admin | Create, review, publish, edit, archive or delete topics |
| POST | `/api/admin/topics/generate` | Admin + AI key | Generate an editable topic draft |
| POST | `/api/admin/vocabulary` | Admin | Create vocabulary |

Send the JWT as `Authorization: Bearer <token>`. All AI calls are made by the server; keys must never be put in Vite variables or browser code.

## Deploy separately

### API on Render

Create a Web Service from this repository. Use `npm install` as the build command and `npm start` as the start command. Configure `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `CLIENT_ORIGIN`, and (if wanted) `OPENAI_API_KEY` and `OPENAI_MODEL` in the Render environment. Restrict Atlas network access to the service's network policy where possible.

### Frontend on Vercel or Render Static Site

Build with `npm run build` and publish the `dist` directory. Configure a rewrite/proxy for `/api/*` to the API service, or set up a deployment-specific API base URL in a future frontend environment configuration. On Render, the static site can use a rewrite rule to route API requests to the web service. Set `CLIENT_ORIGIN` on the API to the deployed frontend origin.

Do not commit `.env`, generated user data, or secrets. For production, use HTTPS, a persistent email provider for password resets, a managed file/object store for user media, and a dedicated admin provisioning process.
