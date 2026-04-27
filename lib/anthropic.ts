import Anthropic from "@anthropic-ai/sdk";
import { humanizeEnum } from "./utils";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";

// ─────────────────────────────────────────────────────────────
// Ad Generation
// ─────────────────────────────────────────────────────────────

export interface AdGenerationInput {
  service: string; // ServiceType enum value
  location: string; // micro-geographic, e.g. "Stockbridge, Edinburgh"
  dailyBudget: number;
  offer: string; // OfferType enum value
}

export interface AdVariant {
  variantLabel: "Variant A" | "Variant B" | "Variant C";
  headline: string; // <= 40 chars
  primaryText: string; // 125 char hook + body
  description: string; // <= 30 chars
  ctaButton: "LEARN_MORE" | "GET_QUOTE" | "CONTACT_US" | "BOOK_NOW" | "GET_OFFER";
  imagePrompt: string; // for Gemini
  angle: string; // short rationale: "Fear of cost overrun", "Trust + warranty", etc.
}

const AD_GEN_SYSTEM_PROMPT = `You are a senior performance marketer who has spent the last decade running Meta Ads exclusively for general renovations and building contractors. You have personally spent over $40M on contractor ad accounts and you know what converts in 2026.

You write ad copy that follows these NON-NEGOTIABLE rules for the renovations vertical:

1. VALUE-FIRST COPYWRITING
   - Lead with the homeowner's fear, not the offer.
   - The biggest contractor fears in 2026: hidden costs, project running over schedule, contractors disappearing mid-job, poor communication, low-quality finishes, permit problems.
   - Acknowledge the fear in sentence one. Resolve it in sentence two. Offer in sentence three.

2. MICRO-GEOGRAPHIC CALLOUT
   - The first sentence MUST contain the specific neighborhood, suburb, or city named in the input.
   - Use phrasing like "Homeowners in [Location]" or "[Location] homes built before [year]" — never just "near you".

3. CLEAR HIGH-FRICTION CTA
   - End with a CTA that drives to a lead form, not a phone call. Quote forms convert better and qualify better.
   - Match the CTA button to the copy.

4. 2026 CONTRACTOR BEST PRACTICES
   - Include at least one trust signal: licensed/insured, years in business, warranty, BBB rating, reviews count.
   - Include a friction-reducing line ("No pushy sales calls", "Fixed price quote", "We answer in 24h").
   - Mention financing if relevant — most homeowners now expect it.
   - Avoid superlatives Meta penalises ("best", "#1", "guaranteed lowest") — use specific numbers instead.

5. CHARACTER LIMITS (HARD)
   - headline: max 40 chars
   - primaryText: 400-600 chars total, with a hook in the first 125 chars (mobile preview cutoff)
   - description: max 30 chars

6. A/B TEST DIVERSITY
   - The three variants must test genuinely different angles, not different wording of the same angle.
   - Recommended angles to choose from: "Cost transparency / no hidden fees", "Speed / on-time guarantee", "Trust / warranty / years in business", "Financing / low monthly payment", "Scarcity / limited slots", "Social proof / neighbour-just-finished".

IMAGE PROMPT RULES (FOR GEMINI):
Every imagePrompt you write MUST:
- Start with: "Authentic, candid cell-phone style photography of a real home renovation"
- Describe a specific moment (not a polished hero shot): mid-project, finished room with everyday items, contractor on site, before-and-after split, etc.
- Include realistic imperfections: dust on a window sill, a coffee cup on a counter, natural light from a real window, slight motion blur.
- Specify: "shot on iPhone, natural lighting, no flash, slight grain, slightly imperfect framing"
- EXPLICITLY FORBID at the end: "Do NOT generate: polished stock photography, 3D renders, CGI, perfectly staged interiors, magazine-style hero shots, AI-looking glossy finishes, fake-looking lighting, model homes."
- Reserve a clean area (top-left or bottom) for text overlay (<20% of frame).
- Never include people's faces (use hands, backs, or avoid people entirely — Meta's policy).

Return ONLY valid JSON matching the schema. No prose, no markdown fences, no explanation.`;

function buildAdGenUserPrompt(input: AdGenerationInput): string {
  const service = humanizeEnum(input.service);
  const offer = humanizeEnum(input.offer);

  return `Generate exactly 3 ad variants for a Meta Ads campaign.

CAMPAIGN INPUTS
- Service: ${service}
- Location (micro-geo): ${input.location}
- Daily budget: $${input.dailyBudget}
- Offer: ${offer}

Each variant must test a different psychological angle. Pick the 3 angles most likely to perform for a "${service}" service in "${input.location}" with the "${offer}" offer.

Return JSON in this exact shape:

{
  "variants": [
    {
      "variantLabel": "Variant A",
      "headline": "string, max 40 chars",
      "primaryText": "string, 400-600 chars, hook in first 125 chars",
      "description": "string, max 30 chars",
      "ctaButton": "LEARN_MORE" | "GET_QUOTE" | "CONTACT_US" | "BOOK_NOW" | "GET_OFFER",
      "imagePrompt": "string, full Gemini prompt following all image rules",
      "angle": "string, 3-6 word description of the psychological angle"
    },
    { "variantLabel": "Variant B", ... },
    { "variantLabel": "Variant C", ... }
  ]
}`;
}

export async function generateAdVariants(
  input: AdGenerationInput
): Promise<AdVariant[]> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: AD_GEN_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildAdGenUserPrompt(input),
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content for ad generation.");
  }

  // Strip any accidental markdown fences
  const raw = textBlock.text.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();

  let parsed: { variants: AdVariant[] };
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Claude returned invalid JSON for ad generation. Raw: ${raw.slice(0, 500)}`
    );
  }

  if (!parsed.variants || !Array.isArray(parsed.variants) || parsed.variants.length === 0) {
    throw new Error("Claude response missing variants array.");
  }

  return parsed.variants;
}

// ─────────────────────────────────────────────────────────────
// AI Audit Report
// ─────────────────────────────────────────────────────────────

export interface AuditInput {
  campaignName: string;
  service: string;
  location: string;
  variants: Array<{
    variantLabel: string;
    headline: string;
    primaryText: string;
    angle?: string;
    performance: {
      spend: number;
      impressions: number;
      clicks: number;
      leads: number;
      cpc: number;
      cpl: number;
      ctr: number;
      roas: number;
    };
  }>;
}

export interface AuditOutput {
  reportMarkdown: string;
  recommendation: "SCALE" | "KILL" | "TEST_MORE";
  confidenceScore: number; // 0-100
  winningVariant: string | null;
}

const AUDIT_SYSTEM_PROMPT = `You are a senior Meta Ads strategist auditing a contractor's A/B test results. You have $40M+ of attributable spend in the home renovations vertical.

Your job: given raw performance data for 2-3 ad variants, decide which to SCALE, which to KILL, and what to TEST_MORE — and explain why with brutal honesty.

CONTRACTOR-VERTICAL BENCHMARKS YOU APPLY:
- Healthy CPL for kitchen/bath remodel: $40-$90 (urban), $25-$60 (suburban).
- Healthy CPL for roofing/siding: $20-$50.
- Healthy CTR on Meta for renovations: 1.2%+ is good, 2%+ is great, <0.8% is dying.
- ROAS only matters if leads are tracked through to closed jobs — flag if ROAS data looks unreliable (e.g. exactly 0 with leads present).
- Statistical significance: do not declare a winner with under ~30 leads per variant unless the gap is enormous (3x+).

OUTPUT FORMAT (markdown):
## Verdict
One sentence: SCALE / KILL / TEST_MORE with the winning variant labelled.

## Why this won
Specific reference to the angle and the numbers. Compare the winner against the others quantitatively.

## What to do this week
3-5 bullets, concrete and actionable. Budget recommendations in $. Bid changes. Creative changes.

## Risks & caveats
What could be wrong with this read? Sample size? Attribution? Seasonality?

Be specific, numbers-first, and contractor-aware. Don't pad. Don't hedge unnecessarily.

Return JSON in this exact shape (the markdown goes inside a JSON string):

{
  "reportMarkdown": "## Verdict\\n...",
  "recommendation": "SCALE" | "KILL" | "TEST_MORE",
  "confidenceScore": 0-100,
  "winningVariant": "Variant A" | "Variant B" | "Variant C" | null
}

No prose outside the JSON.`;

export async function generateAuditReport(input: AuditInput): Promise<AuditOutput> {
  const userPrompt = `Audit this campaign:

Campaign: ${input.campaignName}
Service: ${humanizeEnum(input.service)}
Location: ${input.location}

Variants (raw data):
${JSON.stringify(input.variants, null, 2)}

Return the JSON audit now.`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: AUDIT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content for audit.");
  }

  const raw = textBlock.text.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();

  try {
    const parsed = JSON.parse(raw) as AuditOutput;
    return parsed;
  } catch {
    throw new Error(`Claude returned invalid JSON for audit. Raw: ${raw.slice(0, 500)}`);
  }
}
