/**
 * Minimal Meta Marketing API wrapper for the renovation-ads workflow.
 * Covers: create campaign, create ad set, upload image, create ad creative, create ad, fetch insights.
 *
 * Auth: long-lived System User token in META_ACCESS_TOKEN.
 * All endpoints use META_API_VERSION (default v21.0).
 */

const API_VERSION = process.env.META_API_VERSION ?? "v21.0";
const BASE = `https://graph.facebook.com/${API_VERSION}`;

function token() {
  const t = process.env.META_ACCESS_TOKEN;
  if (!t) throw new Error("META_ACCESS_TOKEN is not set.");
  return t;
}

function adAccount() {
  const id = process.env.META_AD_ACCOUNT_ID;
  if (!id) throw new Error("META_AD_ACCOUNT_ID is not set.");
  return id; // expected format: act_123456789
}

function pageId() {
  const id = process.env.META_PAGE_ID;
  if (!id) throw new Error("META_PAGE_ID is not set.");
  return id;
}

async function metaFetch<T>(
  path: string,
  init: RequestInit & { params?: Record<string, string> } = {}
): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (init.params) {
    for (const [k, v] of Object.entries(init.params)) {
      url.searchParams.set(k, v);
    }
  }
  url.searchParams.set("access_token", token());

  const res = await fetch(url.toString(), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const json = await res.json();
  if (!res.ok) {
    const msg = json?.error?.message ?? `Meta API error ${res.status}`;
    throw new Error(`Meta API: ${msg}`);
  }
  return json as T;
}

// ─────────────────────────────────────────────────────────────
// Campaign / Ad Set / Ad creation
// ─────────────────────────────────────────────────────────────

export async function createMetaCampaign(params: {
  name: string;
  objective?: string;
  status?: "ACTIVE" | "PAUSED";
}): Promise<{ id: string }> {
  const body = {
    name: params.name,
    objective: params.objective ?? "OUTCOME_LEADS",
    status: params.status ?? "PAUSED",
    special_ad_categories: JSON.stringify(["HOUSING"]), // contractors fall under housing
    buying_type: "AUCTION",
  };

  return metaFetch<{ id: string }>(`/${adAccount()}/campaigns`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function createMetaAdSet(params: {
  name: string;
  campaignId: string;
  dailyBudgetUsd: number;
  location: string; // free-text, will be resolved to a geo target by Meta best-effort
  pixelId?: string;
}): Promise<{ id: string }> {
  // Note: a production system would use the Targeting Search API to convert
  // `location` into a geo_locations object. We send it as a city name for the
  // location field — Meta will return an error if it can't resolve it, which
  // surfaces clearly in the UI.
  const targeting = {
    geo_locations: {
      // Best-effort: assume US/UK city. In production, resolve via /search?type=adgeolocation
      cities: [{ name: params.location }],
    },
    age_min: 30,
    age_max: 65,
    flexible_spec: [
      {
        interests: [
          { id: "6003397425735", name: "Home improvement" },
          { id: "6002977954103", name: "Home renovation" },
        ],
      },
    ],
    publisher_platforms: ["facebook", "instagram"],
    facebook_positions: ["feed", "marketplace"],
    instagram_positions: ["stream", "story"],
  };

  const body: Record<string, unknown> = {
    name: params.name,
    campaign_id: params.campaignId,
    daily_budget: Math.round(params.dailyBudgetUsd * 100), // cents
    billing_event: "IMPRESSIONS",
    optimization_goal: "LEAD_GENERATION",
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
    targeting: JSON.stringify(targeting),
    status: "PAUSED",
    start_time: new Date(Date.now() + 60_000).toISOString(),
    destination_type: "ON_AD",
  };

  if (params.pixelId) {
    body.promoted_object = JSON.stringify({
      pixel_id: params.pixelId,
      custom_event_type: "LEAD",
    });
  }

  return metaFetch<{ id: string }>(`/${adAccount()}/adsets`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function uploadMetaAdImage(imageUrl: string): Promise<{ hash: string }> {
  // Meta's /adimages endpoint accepts either bytes or a URL. We use URL.
  const params = new URLSearchParams({
    url: imageUrl,
    access_token: token(),
  });

  const res = await fetch(`${BASE}/${adAccount()}/adimages?${params.toString()}`, {
    method: "POST",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? "Image upload failed");

  // Response shape: { images: { "<filename>": { hash, url } } }
  const images = json.images ?? {};
  const first = Object.values(images)[0] as { hash?: string } | undefined;
  if (!first?.hash) throw new Error("Meta did not return an image hash.");
  return { hash: first.hash };
}

export async function createMetaAdCreative(params: {
  name: string;
  imageHash: string;
  headline: string;
  primaryText: string;
  description: string;
  ctaType: string; // LEARN_MORE | GET_QUOTE etc.
  destinationUrl: string;
}): Promise<{ id: string }> {
  const objectStorySpec = {
    page_id: pageId(),
    link_data: {
      message: params.primaryText,
      link: params.destinationUrl,
      name: params.headline,
      description: params.description,
      image_hash: params.imageHash,
      call_to_action: {
        type: params.ctaType,
        value: { link: params.destinationUrl },
      },
    },
  };

  return metaFetch<{ id: string }>(`/${adAccount()}/adcreatives`, {
    method: "POST",
    body: JSON.stringify({
      name: params.name,
      object_story_spec: JSON.stringify(objectStorySpec),
    }),
  });
}

export async function createMetaAd(params: {
  name: string;
  adSetId: string;
  creativeId: string;
}): Promise<{ id: string }> {
  return metaFetch<{ id: string }>(`/${adAccount()}/ads`, {
    method: "POST",
    body: JSON.stringify({
      name: params.name,
      adset_id: params.adSetId,
      creative: JSON.stringify({ creative_id: params.creativeId }),
      status: "PAUSED",
    }),
  });
}

// ─────────────────────────────────────────────────────────────
// Insights (performance)
// ─────────────────────────────────────────────────────────────

export interface MetaInsights {
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  cpc: number;
  cpl: number;
  ctr: number;
  roas: number;
}

export async function fetchAdInsights(metaAdId: string): Promise<MetaInsights> {
  const fields = [
    "spend",
    "impressions",
    "clicks",
    "cpc",
    "ctr",
    "actions",
    "cost_per_action_type",
    "purchase_roas",
  ].join(",");

  const json = await metaFetch<{ data: Array<Record<string, unknown>> }>(
    `/${metaAdId}/insights`,
    { params: { fields, date_preset: "last_30d" } }
  );

  const row = json.data?.[0] ?? {};
  const actions = (row.actions as Array<{ action_type: string; value: string }>) ?? [];
  const costPerAction =
    (row.cost_per_action_type as Array<{ action_type: string; value: string }>) ?? [];
  const roasArr = (row.purchase_roas as Array<{ value: string }>) ?? [];

  const leadsAction = actions.find((a) => a.action_type === "lead");
  const leadCpa = costPerAction.find((a) => a.action_type === "lead");

  return {
    spend: Number(row.spend ?? 0),
    impressions: Number(row.impressions ?? 0),
    clicks: Number(row.clicks ?? 0),
    leads: Number(leadsAction?.value ?? 0),
    cpc: Number(row.cpc ?? 0),
    cpl: Number(leadCpa?.value ?? 0),
    ctr: Number(row.ctr ?? 0),
    roas: Number(roasArr[0]?.value ?? 0),
  };
}
