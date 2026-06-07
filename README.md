# Lead Leak Report

Phase: **Build 2B — More Accurate Scoring + Critical Leak Guardrails**

This is still a Vite/React prototype, not a Next.js app.

Build 2B is a scoring-quality update. It does not add payments, PDFs, databases, or AI. The goal is to make the free preview more honest: decent sites should not be called critical, but they also should not score 90+ unless they show phone, click-to-call, strong CTA, trust proof, local clarity, and no major request-path issues.

## What Build 2B includes

- Multi-niche landing page foundation.
- Business type selector.
- Industry landing pages:
  - `/roofers`
  - `/plumbers`
  - `/electricians`
  - `/hvac`
  - `/landscapers`
  - `/home-services`
- Preview page at `/preview`.
- Serverless analyzer route at `/api/analyze`.
- **Firecrawl-first homepage reading when `FIRECRAWL_API_KEY` is available.**
- Basic fetch fallback if Firecrawl is not configured or temporarily fails.
- Fixed form submission flow: the form runs `/api/analyze` before opening `/preview`.
- Analyzer results are stored in `sessionStorage` so `/preview` displays the real result instead of relying on query-string values.
- Direct visits to `/preview` now show a clean empty state instead of a fake fallback score.
- Rule-based category scoring:
  - Call Readiness
  - 5-Second Service Clarity
  - Trust Proof
  - Request Path
  - Local Visibility
  - Freshness
- Evidence-based preview findings.
- Paid-report recommendation logic:
  - Recommended
  - Manual review recommended
  - Paid report not recommended yet
- Foundational local SEO preview section.
- “Send This to Your Web Person” checklist preview.
- Fallback preview only after a real submitted site cannot be read.
- Stricter scoring guardrails so text-heavy pages do not score as elite unless they confirm real conversion basics.
- Better phone and click-to-call handling.
- Softer handling for sites that are decent but still missing first-screen trust proof.
- Stronger detection for weak trust proof, soft CTAs, placeholder links, and high-friction forms.
- Updated recommendation logic so a site with multiple meaningful warnings can still justify a paid report even if it is not critical.

## What this build does not include yet

- Screenshot or mobile rendering checks.
- AI-generated full reports.
- Stripe payment.
- PDF generation.
- Supabase/database storage.
- Email delivery.
- User accounts.

## Vercel settings

Use these settings in Vercel:

```txt
Framework Preset: Vite
Root Directory: repo root where package.json is
Install Command: pnpm install
Build Command: pnpm build
Output Directory: dist/public
```

Do not use Next.js for this version.

## Environment variables

Recommended for Build 2B:

```txt
FIRECRAWL_API_KEY=your_firecrawl_api_key
```

Optional fallback name also supported:

```txt
FIRECRAWL_API_TOKEN=your_firecrawl_api_key
```

If no Firecrawl key is set, the app still runs using the basic homepage fetch from Build 1B/2.

## SQL migration

None required for Build 2B.

## Local commands

```bash
pnpm install
pnpm check
pnpm build
pnpm dev
```

## Recommended next build

**Build 3 — Screenshot + Mobile First-Screen Checks**

Recommended scope:

- Add a screenshot/mobile-render check.
- Check whether phone/CTA/trust proof appear in the first screen.
- Detect broken-looking images where practical.
- Keep Stripe/PDF/AI out until the preview analyzer feels reliable.
