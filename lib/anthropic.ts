import Anthropic from "@anthropic-ai/sdk";
import { humanizeEnum } from "./utils";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";

// ─────────────────────────────────────────────────────────────
// Ad Generation
// ─────────────────────────────────────────────────────────────

export interface UploadedFileWithDescription {
  url: string;
  type: "image" | "video";
  name: string;
  description: string; // user-supplied description of the creative
}

export interface AdGenerationInput {
  service: string;
  location: string;
  dailyBudget: number;
  offer: string;
  uploadedFiles?: UploadedFileWithDescription[];
}

export interface AdVariant {
  variantLabel: "Variant A" | "Variant B";
  headline: string;       // <= 40 chars
  primaryText: string;    // 400-600 chars, hook in first 125
  description: string;    // <= 30 chars
  ctaButton: "LEARN_MORE" | "GET_QUOTE" | "CONTACT_US" | "BOOK_NOW" | "GET_OFFER";
  imagePrompt: string;    // for Gemini (ignored when upload provided)
  angle: string;          // psychological angle label
}

const AD_GEN_SYSTEM_PROMPT = `You are a senior performance marketer who has spent the last decade running Meta Ads exclusively for general renovations and building contractors. You have personally spent over $40M on contractor ad accounts and you know what converts in 2026.

You write ad copy that follows these NON-NEGOTIABLE rules for the renovations vertical:

1. VALUE-FIRST COPYWRITING
   - Lead with the homeowner's fear, not the offer.
   - The biggest contractor fears in 2026: hidden costs, project running over schedule, contractors disappearing mid-job, poor communication, low-quality finishes, permit problems.
   - Acknowledge the fear in sentence one. Resolve it in sentence two. Offer in sentence three.

2. MICRO-GEOGRAPHIC CALLOUT
   - The first sentence MUST contain the specific neighbourhood, suburb, or city named in the input.
   - Use phrasing like "Homeowners in [Location]" or "[Location] homes built before [year]" — never just "near you".

3. CLEAR HIGH-FRICTION CTA
   - End with a CTA that drives to a lead form, not a phone call.
   - Match the CTA button to the copy.

4. 2026 CONTRACTOR BEST PRACTICES
   - Include at least one trust signal: licensed/insured, years in business, warranty, reviews count.
   - Include a friction-reducing line ("No pushy sales calls", "Fixed price quote", "We answer in 24h").
   - Mention financing if relevant.
   - Avoid superlatives Meta penalises ("best", "#1", "guaranteed lowest") — use specific numbers instead.

5. CHARACTER LIMITS (HARD)
   - headline: max 40 chars
   - primaryText: 400-600 chars total, hook in first 125 chars (mobile cutoff)
   - description: max 30 chars

6. A/B TEST DIVERSITY
   - The two variants MUST test genuinely different psychological angles.
   - Angles to choose from: "Cost transparency / no hidden fees", "Speed / on-time guarantee", "Trust / warranty / years in business", "Financing / low monthly payment", "Scarcity / limited slots", "Social proof / neighbour-just-finished".

WHEN USER-UPLOADED CREATIVES ARE PROVIDED:
- You will be told what each creative shows (e.g. "before and after kitchen reveal", "contractor on site")
- Write copy that directly references or complements that specific visual
- Ad A copy must work with Ad A's creative. Ad B copy must work with Ad B's creative.
- Do NOT write generic copy that ignores the creative context.

IMAGE PROMPT RULES (FOR GEMINI — only used when no upload provided):
Every imagePrompt you write MUST:
- Start with: "Authentic, candid cell-phone style photography of a real home renovation"
- Describe a specific moment: mid-project, finished room with everyday items, contractor on site, before-and-after split
- Include realistic imperfections: dust, natural light, slight motion blur
- Specify: "shot on iPhone, natural lighting, no flash, slight grain, slightly imperfect framing"
- EXPLICITLY FORBID: "Do NOT generate: polished stock photography, 3D renders, CGI, perfectly staged interiors, magazine-style hero shots, AI-looking glossy finishes, fake-looking lighting, model homes."
- Reserve clean area (<20% of frame) for text overlay
- Never include people's faces

Return ONLY valid JSON. No prose, no markdown fences, no explanation.`;

function buildAdGenUserPrompt(input: AdGenerationInput): string {
  const service = humanizeEnum(input.service);
  const offer = humanizeEnum(input.offer);
  const hasUploads = input.uploadedFiles && input.uploadedFiles.length > 0;

  const creativeContext = hasUploads
    ? `
UPLOADED CREATIVES (write copy to match each one):
${input.uploadedFiles!.map((f, i) => `- Ad ${String.fromCharCode(65 + i)} creative: "${f.description}" (${f.type})`).join("\n")}

Write copy for each ad that directly complements its specific creative. Ad A copy is paired with Ad A's creative, Ad B copy with Ad B's.`
    : `No uploads — generate imagePrompts for Gemini following the rules above.`;

  return `Generate exactly 2 ad variants (Variant A and Variant B) for a Meta Ads campaign.

CAMPAIGN INPUTS
- Service: ${service}
- Location (micro-geo): ${input.location}
- Daily budget: £${input.dailyBudget} (split equally — £${(input.dailyBudget / 2).toFixed(2)} per ad)
- Offer: ${offer}
${creativeContext}

The two variants must test genuinely different psychological angles.

Return JSON in this exact shape:

{
  "variants": [
    {
      "variantLabel": "Variant A",
      "headline": "string, max 40 chars",
      "primaryText": "string, 400-600 chars, hook in first 125 chars",
      "description": "string, max 30 chars",
      "ctaButton": "LEARN_MORE" | "GET_QUOTE" | "CONTACT_US" | "BOOK_NOW" | "GET_OFFER",
      "imagePrompt": "string (Gemini prompt if no upload, empty string if upload provided)",
      "angle": "string, 3-6 word psychological angle label"
    },
    { "variantLabel": "Variant B", ... }
  ]
}`;
}

export async function generateAdVariants(input: AdGenerationInput): Promise<AdVariant[]> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: AD_GEN_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildAdGenUserPrompt(input) }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Claude returned no text.");

  const raw = textBlock.text.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  let parsed: { variants: AdVariant[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Claude returned invalid JSON. Raw: ${raw.slice(0, 500)}`);
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
      spend: number; impressions: number; clicks: number; leads: number;
      cpc: number; cpl: number; ctr: number; roas: number;
    };
  }>;
}

export interface AuditOutput {
  reportMarkdown: string;
  recommendation: "SCALE" | "KILL" | "TEST_MORE";
  confidenceScore: number;
  winningVariant: string | null;
}

const AUDIT_SYSTEM_PROMPT = `You are a senior Meta Ads strategist auditing a contractor's A/B test results. You have $40M+ of attributable spend in the home renovations vertical.

CONTRACTOR-VERTICAL BENCHMARKS:
- Healthy CPL for kitchen/bath remodel: £40-£90 (urban), £25-£60 (suburban).
- Healthy CPL for roofing/siding: £20-£50.
- Healthy CTR on Meta for renovations: 1.2%+ is good, 2%+ is great, <0.8% is dying.
- Do not declare a winner with under ~30 leads per variant unless the gap is enormous (3x+).

OUTPUT FORMAT (markdown):
## Verdict
One sentence: SCALE / KILL / TEST_MORE with the winning variant labelled.

## Why this won
Specific reference to the angle and the numbers.

## What to do this week
3-5 bullets, concrete and actionable. Budget recommendations in £.

## Risks & caveats
Sample size? Attribution? Seasonality?

Return JSON:
{
  "reportMarkdown": "## Verdict\\n...",
  "recommendation": "SCALE" | "KILL" | "TEST_MORE",
  "confidenceScore": 0-100,
  "winningVariant": "Variant A" | "Variant B" | null
}`;

export async function generateAuditReport(input: AuditInput): Promise<AuditOutput> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: AUDIT_SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: `Audit this campaign:\n\nCampaign: ${input.campaignName}\nService: ${humanizeEnum(input.service)}\nLocation: ${input.location}\n\nVariants:\n${JSON.stringify(input.variants, null, 2)}\n\nReturn the JSON audit now.`,
    }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Claude returned no text for audit.");
  const raw = textBlock.text.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(raw) as AuditOutput;
  } catch {
    throw new Error(`Claude returned invalid JSON for audit. Raw: ${raw.slice(0, 500)}`);
  }
}
