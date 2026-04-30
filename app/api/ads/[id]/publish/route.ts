import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createMetaCampaign, createMetaAdSet, uploadMetaAdImage,
  uploadMetaAdVideo, createMetaAdCreative, createMetaVideoAdCreative, createMetaAd,
} from "@/lib/meta";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const ad = await prisma.ad.findUnique({
    where: { id },
    include: { campaign: true },
  });

  if (!ad) return NextResponse.json({ error: "Ad not found" }, { status: 404 });

  const isVideoAd = ad.useVideo && ad.videoUrl;
  const finalImageUrl = !isVideoAd
    ? (ad.useBeforeAfter && ad.beforeAfterUrl ? ad.beforeAfterUrl : ad.imageUrl)
    : null;

  if (!isVideoAd && !finalImageUrl)
    return NextResponse.json({ error: "No image set. Generate or upload one first." }, { status: 400 });
  if (isVideoAd && !ad.videoUrl)
    return NextResponse.json({ error: "No video set. Upload a video first." }, { status: 400 });
  if (finalImageUrl?.startsWith("data:"))
    return NextResponse.json({ error: "Image is a data URL — Meta requires a hosted URL. Configure Vercel Blob." }, { status: 400 });

  await prisma.ad.update({ where: { id }, data: { status: "PUBLISHING" } });

  // Read campaign-level settings
  const campaign = ad.campaign;
  // Per-ad geo targeting takes priority over campaign-level
  const adGeoTargeting = (ad as Record<string, unknown>).adGeoTargeting as {
    locations: Array<{ metaKey: string; metaName: string; metaCountryCode: string; metaRegionId?: string }>;
    radiusMiles: number;
  } | null;
  const geoTargeting = adGeoTargeting ?? campaign.geoTargeting as {
    locations: Array<{ metaKey: string; metaName: string; metaCountryCode: string; metaRegionId?: string }>;
    radiusMiles: number;
  } | null;
  const audience = campaign.audience as {
    ageMin: number; ageMax: number; gender: string;
  } | null;
  const destinationUrl = campaign.destinationUrl || process.env.NEXT_PUBLIC_APP_URL || "https://example.com";
  const publishStatus = campaign.publishActive ? "ACTIVE" : "PAUSED";

  try {
    // 1. Create or reuse Meta campaign
    let metaCampaignId = campaign.metaCampaignId;
    if (!metaCampaignId) {
      const created = await createMetaCampaign({ name: campaign.name, status: publishStatus });
      metaCampaignId = created.id;
      await prisma.campaign.update({ where: { id: campaign.id }, data: { metaCampaignId } });
    }

    // 2. Create ad set with full targeting
    const adSet = await createMetaAdSet({
      name: `${campaign.name} — ${ad.variantLabel}`,
      campaignId: metaCampaignId,
      // Split budget equally across all active + this ad being published
      dailyBudgetUsd: await (async () => {
        const activeCount = await prisma.ad.count({
          where: { campaignId: campaign.id, status: { in: ["LIVE", "PUBLISHING"] } }
        });
        const totalAds = activeCount + 1; // +1 for this ad
        return Math.max(5, campaign.dailyBudget / totalAds);
      })(),
      location: campaign.location,
      geoTargeting: geoTargeting ?? undefined,
      audience: audience ?? undefined,
      pixelId: process.env.META_PIXEL_ID,
      status: publishStatus,
    });

    // 3. Upload creative + create Meta ad
    let creative: { id: string };
    if (isVideoAd && ad.videoUrl) {
      const metaVideo = await uploadMetaAdVideo(ad.videoUrl, `${campaign.name} ${ad.variantLabel}`);
      creative = await createMetaVideoAdCreative({
        name: `${campaign.name} — ${ad.variantLabel} creative`,
        metaVideoId: metaVideo.id,
        headline: ad.headline,
        primaryText: ad.primaryText,
        description: ad.description,
        ctaType: ad.ctaButton,
        destinationUrl,
      });
      await prisma.ad.update({ where: { id }, data: { metaVideoId: metaVideo.id } });
    } else {
      const { hash } = await uploadMetaAdImage(finalImageUrl!);
      creative = await createMetaAdCreative({
        name: `${campaign.name} — ${ad.variantLabel} creative`,
        imageHash: hash,
        headline: ad.headline,
        primaryText: ad.primaryText,
        description: ad.description,
        ctaType: ad.ctaButton,
        destinationUrl,
      });
    }

    const metaAd = await createMetaAd({
      name: `${campaign.name} — ${ad.variantLabel}`,
      adSetId: adSet.id,
      creativeId: creative.id,
      status: publishStatus,
    });

    await prisma.ad.update({
      where: { id },
      data: { status: publishStatus === "ACTIVE" ? "LIVE" : "LIVE", metaAdId: metaAd.id, metaAdSetId: adSet.id },
    });

    if (campaign.status === "DRAFT") {
      await prisma.campaign.update({ where: { id: campaign.id }, data: { status: "ACTIVE" } });
    }

    return NextResponse.json({ ok: true, metaAdId: metaAd.id, metaAdSetId: adSet.id, metaCampaignId, status: publishStatus });
  } catch (err) {
    await prisma.ad.update({ where: { id }, data: { status: "DRAFT" } });
    return NextResponse.json({ error: err instanceof Error ? err.message : "Meta publish failed." }, { status: 502 });
  }
}
