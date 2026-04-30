/**
 * POST /api/capi
 *
 * Receives a lead event from the client's website and forwards it to
 * Meta's Conversions API (server-side tracking).
 *
 * The client's website should POST to this endpoint when a lead form
 * is submitted. Example payload:
 *
 * {
 *   "event_name": "Lead",
 *   "event_source_url": "https://groverenovations.co.uk/contact",
 *   "user_data": {
 *     "em": "sha256_hashed_email",
 *     "ph": "sha256_hashed_phone",
 *     "client_ip_address": "1.2.3.4",
 *     "client_user_agent": "Mozilla/5.0...",
 *     "fbc": "fb.1.1234567890.abc",
 *     "fbp": "fb.1.1234567890.xyz"
 *   },
 *   "custom_data": {
 *     "currency": "GBP",
 *     "value": 1.00,
 *     "content_name": "Kitchen Remodel Quote"
 *   },
 *   "event_id": "unique-event-id"
 * }
 */

import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const UserDataSchema = z.object({
  em: z.string().optional(),
  ph: z.string().optional(),
  fn: z.string().optional(),
  ln: z.string().optional(),
  client_ip_address: z.string().optional(),
  client_user_agent: z.string().optional(),
  fbc: z.string().optional(),
  fbp: z.string().optional(),
  external_id: z.string().optional(),
}).passthrough();

const LeadEventSchema = z.object({
  event_name: z.string().default("Lead"),
  event_time: z.number().optional(),
  action_source: z.string().default("website"),
  event_source_url: z.string().optional(),
  user_data: UserDataSchema.optional().default({}),
  custom_data: z.record(z.unknown()).optional().default({}),
  event_id: z.string().optional(),
});

const API_VERSION = process.env.META_API_VERSION ?? "v21.0";

export async function POST(req: Request) {
  const capiSecret = process.env.META_CAPI_SECRET;
  if (capiSecret) {
    const authHeader = req.headers.get("x-capi-secret");
    if (authHeader !== capiSecret) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }

  const parsed = LeadEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload.", details: parsed.error.flatten() }, { status: 400 });
  }

  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    return NextResponse.json({ error: "META_PIXEL_ID or META_ACCESS_TOKEN not configured." }, { status: 500 });
  }

  const event = parsed.data;

  const capiPayload = {
    data: [
      {
        event_name: event.event_name,
        event_time: event.event_time ?? Math.floor(Date.now() / 1000),
        action_source: event.action_source,
        event_source_url: event.event_source_url,
        event_id: event.event_id ?? `lead-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        user_data: {
          ...event.user_data,
          client_ip_address:
            event.user_data?.client_ip_address ??
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
            "0.0.0.0",
          client_user_agent:
            event.user_data?.client_user_agent ??
            req.headers.get("user-agent") ?? "",
        },
        custom_data: event.custom_data,
      },
    ],
  };

  try {
    const metaRes = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${pixelId}/events?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(capiPayload),
      }
    );

    const metaJson = await metaRes.json();

    if (!metaRes.ok) {
      console.error("Meta CAPI error:", metaJson);
      return NextResponse.json({ error: "Meta CAPI rejected the event.", details: metaJson }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      events_received: metaJson.events_received ?? 1,
      fbtrace_id: metaJson.fbtrace_id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "CAPI request failed.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export async function GET() {
  const configured = !!(process.env.META_PIXEL_ID && process.env.META_ACCESS_TOKEN);
  return NextResponse.json({
    ok: true,
    configured,
    pixelId: process.env.META_PIXEL_ID ? "set" : "missing",
    accessToken: process.env.META_ACCESS_TOKEN ? "set" : "missing",
    capiSecret: process.env.META_CAPI_SECRET ? "set" : "not set — add META_CAPI_SECRET for security",
    endpoint: "POST /api/capi",
    example_payload: {
      event_name: "Lead",
      event_source_url: "https://yoursite.co.uk/contact",
      user_data: {
        client_ip_address: "1.2.3.4",
        client_user_agent: "Mozilla/5.0...",
        em: "sha256_hashed_email_lowercase",
        ph: "sha256_hashed_phone_digits_only",
        fbc: "fb.1.1234567890.abc123",
      },
      custom_data: { currency: "GBP", value: 1, content_name: "Kitchen Remodel Quote" },
      event_id: "unique-deduplication-id",
    },
  });
}
