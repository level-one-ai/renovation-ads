# Renovation Ads

AI-powered Meta (Facebook & Instagram) Ads management system, purpose-built for general renovations and building contractors. Generates ad copy with Claude, renders authentic cell-phone-style creative with Gemini, and audits performance with contractor-vertical benchmarks — all behind a draft-and-approve workflow so nothing publishes without your sign-off.

## What it does

1. **Generate** — Pick a service, location, daily budget, and offer. Claude drafts 3 A/B variants, each testing a different psychological angle (cost transparency, scarcity, trust, financing). Gemini renders an authentic-looking creative for each.
2. **Review** — Variants land in a Drafts queue with a real mobile-feed preview. Edit copy, tweak the CTA, swap the AI image for a real Before/After job photo.
3. **Approve & Publish** — One click pushes to the Meta Marketing API. Campaign, ad set, creative, and ad are created in `PAUSED` state so you can do a final check in Ads Manager.
4. **Audit** — Sync Meta insights, then ask Claude to read the variants and tell you which to scale and which to kill, with $ recommendations grounded in contractor-vertical CPL benchmarks.

## Tech stack

- **Framework**: Next.js 15 (App Router) on Node.js
- **Frontend**: React 19, TypeScript, Tailwind CSS v4
- **UI**: shadcn/ui (New York style), Lucide icons, Framer Motion
- **Database**: PostgreSQL via Prisma
- **AI**: Anthropic SDK (Claude Sonnet 4) for copy + audit, `@google/genai` (Gemini 2.0 Flash) for images
- **Ads**: Meta Marketing API v21.0
- **Storage**: Vercel Blob (with data-URL fallback for local dev)
- **Charts**: Recharts
- **Toasts**: Sonner

## Project structure

```
renovation-ads/
├── app/
│   ├── (dashboard)/             # Authenticated dashboard routes
│   │   ├── layout.tsx           # Sidebar shell
│   │   ├── page.tsx             # Overview
│   │   ├── generate/            # Ad generation form
│   │   ├── drafts/              # Approval queue + mobile preview
│   │   ├── campaigns/           # Campaign list + detail
│   │   ├── analytics/           # Performance + AI audit
│   │   └── settings/            # Env config status
│   ├── api/
│   │   ├── generate/            # POST: Claude → DB → Gemini
│   │   ├── ads/                 # GET / PATCH / DELETE / publish
│   │   ├── analytics/           # GET cached / POST sync from Meta
│   │   └── audit/               # POST Claude audit
│   ├── globals.css              # Tailwind v4 + theme tokens
│   └── layout.tsx
├── components/
│   ├── ui/                      # shadcn primitives
│   ├── dashboard/               # Sidebar, header, stats cards
│   ├── generate/                # Generation form
│   ├── drafts/                  # Mobile preview, edit drawer, drafts client
│   └── analytics/               # Performance chart, audit report
├── lib/
│   ├── anthropic.ts             # Claude prompts (ad-gen + audit)
│   ├── gemini.ts                # Gemini image generation
│   ├── meta.ts                  # Meta Marketing API wrapper
│   ├── prisma.ts                # Prisma singleton
│   └── utils.ts                 # cn helper, formatters
├── prisma/
│   └── schema.prisma
└── types/
    └── index.ts                 # Shared enums + option lists
```

## Database schema

Five tables: `Campaign` (top-level grouping), `Ad` (variants A/B/C), `AdPerformance` (Meta insights cache), `AuditReport` (Claude reports). Full relations and enums are in `prisma/schema.prisma`.

Key fields worth noting:
- `Ad.imagePrompt` — the full Gemini prompt Claude generated, kept so you can re-render.
- `Ad.beforeAfterUrl` + `Ad.useBeforeAfter` — the toggle for swapping in a real job photo before publish.
- `Campaign.metaCampaignId` / `Ad.metaAdId` / `Ad.metaAdSetId` — populated only after a successful publish.

## Required environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/renovation_ads"

# Anthropic
ANTHROPIC_API_KEY="sk-ant-..."
ANTHROPIC_MODEL="claude-sonnet-4-20250514"

# Gemini
GEMINI_API_KEY="AIza..."
GEMINI_IMAGE_MODEL="gemini-2.0-flash-preview-image-generation"

# Meta
META_APP_ID="..."
META_APP_SECRET="..."
META_ACCESS_TOKEN="..."        # Long-lived System User token
META_AD_ACCOUNT_ID="act_..."
META_PAGE_ID="..."
META_PIXEL_ID="..."
META_API_VERSION="v21.0"

# Storage
BLOB_READ_WRITE_TOKEN="..."    # Required to publish to Meta (Meta needs hosted URLs)

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
```

The Settings page (`/settings`) shows you which keys are set without exposing the values.

## Local development

```bash
# 1. Install
npm install

# 2. Set up env
cp .env.example .env.local
# (fill in real values)

# 3. Push schema to your Postgres
npx prisma db push
npx prisma generate

# 4. Run
npm run dev
```

Then open http://localhost:3000.

## How the Claude prompts are tuned

The system prompt in `lib/anthropic.ts` enforces 2026 contractor marketing best practices as non-negotiable rules:

1. **Value-first copywriting** — lead with the homeowner's fear (hidden costs, contractors disappearing, schedule overruns), resolve it, then present the offer.
2. **Micro-geographic callouts** — the location must appear in the first sentence (not "near you").
3. **High-friction CTAs** — drive to a lead form, not a phone call.
4. **Trust signals** — licensed/insured, years in business, warranty, BBB.
5. **A/B angle diversity** — each of the 3 variants must test a genuinely different psychological angle, not three rewrites of the same one.
6. **Hard character limits** — 40 / 600 / 30 for headline / primary / description.
7. **Image prompt rules** — every Gemini prompt explicitly demands authentic cell-phone photography and explicitly forbids polished stock, 3D renders, and CGI.

The audit prompt in the same file applies contractor-vertical benchmarks ($40-$90 CPL urban, 1.2%+ CTR healthy) and refuses to call a winner with under ~30 leads per variant unless the gap is huge.

## Deploying

Designed for Vercel. Push the repo, connect, set env vars in the Vercel dashboard. The `build` script runs `prisma generate` automatically.

For the database, Vercel Postgres, Neon, or Supabase all work — just paste the connection string into `DATABASE_URL`.

## Roadmap

- [ ] Auth (NextAuth) — currently single-tenant
- [ ] Webhook listener for Meta lead events to sync leads in real time
- [ ] Geo target resolver (call `/search?type=adgeolocation` to convert free-text into proper geo objects)
- [ ] Bulk re-generation on a single click
- [ ] Multi-account support (one DB, many Meta ad accounts)

## Notes on the Meta integration

- Campaigns are created with `OUTCOME_LEADS` and the `HOUSING` special ad category (contractor work falls under this in most regions).
- Each variant gets its own ad set for clean A/B isolation.
- All ads are published in `PAUSED` state — you have to flip them on in Ads Manager. This is intentional.
- The `location` field is sent to Meta as a free-text city name; if Meta can't resolve it, you'll see the error in the Drafts page. A future improvement is to use the targeting search API to convert it into a geo object first.

## License

Private. All rights reserved.
