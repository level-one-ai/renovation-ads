import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchAdInsights } from "@/lib/meta";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET — return cached performance for all live ads (optionally filtered by campaign).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const campaignId = url.searchParams.get("campaign");

  const ads = await prisma.ad.findMany({
    where: {
      status: { in: ["LIVE", "PAUSED"] },
      ...(campaignId ? { campaignId } : {}),
    },
    include: { campaign: true, performance: true },
  });

  return NextResponse.json({ ads });
}

/**
 * POST — pull fresh insights from Meta for all live ads, upsert AdPerformance.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const campaignId = url.searchParams.get("campaign");

  const ads = await prisma.ad.findMany({
    where: {
      status: { in: ["LIVE", "PAUSED"] },
      metaAdId: { not: null },
      ...(campaignId ? { campaignId } : {}),
    },
  });

  const results = await Promise.allSettled(
    ads.map(async (ad) => {
      if (!ad.metaAdId) return null;
      const insights = await fetchAdInsights(ad.metaAdId);
      await prisma.adPerformance.upsert({
        where: { adId: ad.id },
        create: { adId: ad.id, ...insights },
        update: { ...insights, lastSyncedAt: new Date() },
      });
      return ad.id;
    })
  );

  const synced = results.filter((r) => r.status === "fulfilled" && r.value).length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ synced, failed, total: ads.length });
}
