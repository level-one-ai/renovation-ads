import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAuditReport } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { campaignId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: body.campaignId },
    include: {
      ads: {
        include: { performance: true },
      },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const variantsForAudit = campaign.ads
    .filter((ad) => ad.performance)
    .map((ad) => ({
      variantLabel: ad.variantLabel,
      headline: ad.headline,
      primaryText: ad.primaryText,
      performance: {
        spend: ad.performance!.spend,
        impressions: ad.performance!.impressions,
        clicks: ad.performance!.clicks,
        leads: ad.performance!.leads,
        cpc: ad.performance!.cpc,
        cpl: ad.performance!.cpl,
        ctr: ad.performance!.ctr,
        roas: ad.performance!.roas,
      },
    }));

  if (variantsForAudit.length === 0) {
    return NextResponse.json(
      { error: "No performance data to audit yet. Sync Meta insights first." },
      { status: 400 }
    );
  }

  let audit;
  try {
    audit = await generateAuditReport({
      campaignName: campaign.name,
      service: campaign.service,
      location: campaign.location,
      variants: variantsForAudit,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Audit generation failed.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // Save the audit against the winning ad if we can identify it; otherwise the first ad.
  const targetAd =
    (audit.winningVariant
      ? campaign.ads.find((a) => a.variantLabel === audit.winningVariant)
      : null) ?? campaign.ads[0];

  if (targetAd) {
    await prisma.auditReport.create({
      data: {
        adId: targetAd.id,
        reportMarkdown: audit.reportMarkdown,
        recommendation: audit.recommendation,
        confidenceScore: audit.confidenceScore,
      },
    });
  }

  return NextResponse.json(audit);
}
