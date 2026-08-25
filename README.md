# Capstone CRM

An outbound lead-generation and email outreach CRM for small businesses. It finds prospects,
scrapes structured details from their public websites, and sends personalized outreach emails
through a Gmail account you connect and control — replacing a manual Google Sheets + copy-paste
email workflow.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for how the pieces fit together and why certain
decisions were made.

## Features

- **Lead discovery** — run a search query, get back a list of candidate business websites
- **Lead review** — flag directories/irrelevant results, scrape selected leads to extract
  structured business details (name, contact info, services, awards, etc.)
- **AI-generated outreach** — drafts a personalized email per business using its scraped details
  and your own company profile, reviewed before sending
- **Gmail sending** — sends through the Gmail account you connect via OAuth, not a shared server
  address, so replies land in your own inbox
- **Bulk campaigns** — queue outreach across many businesses at once, rate-limited between sends
- **Offers** — reusable promotions (discount, headline, CTA) that can be featured in a campaign
- **Owner profile** — company info, services, and a hand-editable HTML email signature
- **Notifications** — scrape completions, send failures, and campaign completions surfaced in-app

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | React 18, Vite, React Router, Tailwind CSS v4 |
| Backend | Node.js, Express, Prisma ORM |
| Database | PostgreSQL (Supabase) |
| Automation | n8n (self-hosted) — search, scraping, and AI drafting workflows |
| AI | Google Gemini — structured extraction and email copywriting |
| Scraping | Firecrawl — fetching and cleaning website content for the AI to read |
| Email | Gmail API via OAuth 2.0 (`gmail.send` scope only) |

## Project structure

```
carbonelle-crm/
├── frontend/           React/Vite app
│   └── src/
│       ├── pages/      One component per route
│       ├── components/ Shared/reusable UI
│       ├── context/    App-wide state (owner profile, toasts, campaign/scrape trackers)
│       ├── hooks/      Reusable stateful logic
│       ├── api/        One file per backend resource — thin axios wrappers
│       └── lib/        Framework-agnostic helpers (e.g. the signature HTML builder)
├── backend/             Express API
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── src/
│       ├── routes/     One file per resource, mounted under /api/<resource>
│       ├── lib/        Shared logic (Gmail sending, encryption, n8n client, uploads)
│       └── middleware/
└── n8n-workflows/      Exported n8n workflow JSON (search, scraping, AI drafting)
                         — imported into n8n directly, not run by the Express backend
```

## Getting started

### Prerequisites

- Node.js 18+
- A PostgreSQL database (this project uses Supabase)
- A running n8n instance with the workflows in `n8n-workflows/` imported
- A Google Cloud OAuth 2.0 client (Gmail API enabled, `gmail.send` + `userinfo.email` scopes)
- API keys for Firecrawl and Google Gemini, configured on the n8n side

A test Gmail account is available on request for anyone (e.g. a Google OAuth verification
reviewer) who wants to try the Gmail connection flow without using their own account —
credentials aren't published here; contact me directly.

### Install

```bash
cd backend && npm install
cd ../frontend && npm install
```

### Configure environment variables

Copy the variable names below into `backend/.env` (see [Environment variables](#environment-variables)).
The frontend only needs `VITE_API_BASE_URL` set, and only for production builds
(`frontend/.env.production`) — local dev proxies `/api` through `vite.config.js` instead.

### Run locally

```bash
# backend — http://localhost:3000
cd backend && npm run dev

# frontend — http://localhost:5173
cd frontend && npm run dev
```

Prisma migrations apply automatically in CI via `prisma migrate deploy`. For local schema
changes, generate a migration and commit it — see the note on shared databases below before
running anything against `DATABASE_URL` directly.

## Environment variables

All live in `backend/.env` (gitignored). None of these are read by the frontend directly.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `PORT` | Backend port (default 3000) |
| `BACKEND_PUBLIC_URL` | This backend's public origin — used both to build absolute URLs for uploaded images **and** to derive the Google OAuth redirect URI |
| `FRONTEND_PUBLIC_URL` | The frontend's public origin — used to redirect back after the Gmail OAuth flow completes |
| `GEMINI_API_KEY` | Used by n8n workflows for image generation |
| `N8N_BASE_URL` | Base webhook URL of your n8n instance |
| `N8N_WEBHOOK_SCRAPE_SEARCH`, `N8N_WEBHOOK_SCRAPE_WEBSITES`, `N8N_WEBHOOK_GENERATE_EMAIL`, `N8N_WEBHOOK_OWNER_PROFILE_SCRAPE`, `N8N_WEBHOOK_BUSINESS_SCRAPE` | Webhook path IDs, one per n8n workflow |
| `N8N_CALLBACK_SECRET` | Shared secret n8n sends back as `X-N8N-Secret` on callbacks |
| `ENCRYPTION_KEY` | 32 random bytes (hex) used to encrypt Gmail OAuth tokens at rest |
| `ADMIN_RESET_SECRET` | Header secret required to call the private "wipe everything" admin endpoint — leave unset to disable it entirely |
| `PUBLIC_DEMO_RESET_ENABLED` | Set to `true` to enable the public, no-auth "start fresh?" reset any visitor can trigger from the Console page — leave unset on any non-demo deployment |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | From your Google Cloud OAuth client |

`frontend/.env.production` needs one variable: `VITE_API_BASE_URL` (the backend's public
`/api` base, e.g. `https://api.yourdomain.com/api`). Vite bakes this into the build at compile
time — updating it requires a fresh `vite build`, not just a config change.

## Deployment

- **Frontend** — Cloudflare Pages, built via `vite build`
- **Backend** — an EC2 instance running the Express app under pm2, deployed by a GitHub Action
  that triggers on pushes touching `backend/**`: `git pull`, `npm install`, `prisma migrate
  deploy`, `prisma generate`, `pm2 reload`
- **Database** — Supabase Postgres
- **Automation** — n8n running on the same EC2 instance

### Important: local dev and production share one database

`DATABASE_URL` in local `backend/.env` points at the same Supabase database production uses.
There is no separate dev database. Any local `prisma db push`, `prisma migrate dev`, or direct
write affects live data immediately. Schema changes should be generated as a migration file
(`prisma migrate diff --from-schema-datasource ... --to-schema-datamodel ...` in a
non-interactive environment, since `migrate dev` refuses to run non-interactively) and applied
through the normal deploy pipeline (`prisma migrate deploy`) rather than run directly against
the shared database from a local machine.

## Future Improvements

- **Move outreach sending off the Gmail API, onto a dedicated transactional email provider**
  (e.g. Brevo, SendGrid, Amazon SES). Google's OAuth verification rejected this app specifically
  because cold outreach — emailing people who never opted in — isn't a use case Google will
  approve for the Gmail API, no matter how the consent screen/scopes/privacy policy are set up.
  A provider built for bulk/transactional sending sidesteps that review entirely (API key instead
  of OAuth, no Google verification needed), at the cost of losing the "sent from your own Gmail"
  feel — the "From" address becomes a domain you verify with the provider (SPF/DKIM DNS records),
  though replies can still be routed to your own inbox. Note this only removes *Google's* review
  requirement — the underlying responsibility to send outreach lawfully and respectfully (working
  unsubscribe links, accurate sender identification, compliance with regimes like Australia's Spam
  Act) still applies regardless of which provider sends the mail.
- **Reply tracking isn't actually wired up yet.** `POST /api/webhooks/gmail-reply` and the
  `REPLY_RECEIVED` notification type both exist in the backend, but nothing calls that endpoint —
  it's meant to be triggered by an n8n workflow watching the inbox for replies, which was never
  built. It also can't work with the current `gmail.send`-only OAuth scope, which has no inbox
  read access at all; supporting it would mean requesting a broader (more sensitive) scope.
