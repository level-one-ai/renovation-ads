import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createMetaCampaign,
  createMetaAdSet,
  uploadMetaAdImage,
  createMetaAdCreative,
  createMetaAd,
} from "@/lib/meta";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const ad = await prisma.ad.findUnique({
    where: { id },
    include: { campaign: true },
  });

  if (!ad) return NextResponse.json({ error: "Ad not found" }, { status: 404 });

  // Determine which image URL to use
  const finalImageUrl =
    ad.useBeforeAfter && ad.beforeAfterUrl ? ad.beforeAfterUrl : ad.imageUrl;
  if (!finalImageUrl) {
    return NextResponse.json(
      { error: "No image set on this ad. Generate or upload one first." },
      { status: 400 }
    );
  }
  if (finalImageUrl.startsWith("data:")) {
    return NextResponse.json(
      {
        error:
          "Image is a data URL — Meta requires a hosted URL. Configure Vercel Blob or upload a real image.",
      },
      { status: 400 }
    );
  }

  await prisma.ad.update({
    where: { id },
    data: { status: "PUBLISHING" },
  });

  try {
    // 1. Create Meta campaign if not exists for this internal campaign
    let metaCampaignId = ad.campaign.metaCampaignId;
    if (!metaCampaignId) {
      const created = await createMetaCampaign({ name: ad.campaign.name });
      metaCampaignId = created.id;
      await prisma.campaign.update({
        where: { id: ad.campaign.id },
        data: { metaCampaignId },
      });
    }

    // 2. Create ad set (one per ad variant for clean A/B isolation)
    const adSet = await createMetaAdSet({
      name: `${ad.campaign.name} — ${ad.variantLabel}`,
      campaignId: metaCampaignId,
      dailyBudgetUsd: ad.campaign.dailyBudget,
      location: ad.campaign.location,
      pixelId: process.env.META_PIXEL_ID,
    });

    // 3. Upload image, get hash
    const { hash } = await uploadMetaAdImage(finalImageUrl);

    // 4. Create creative
    const creative = await createMetaAdCreative({
      name: `${ad.campaign.name} — ${ad.variantLabel} creative`,
      imageHash: hash,
      headline: ad.headline,
      primaryText: ad.primaryText,
      description: ad.description,
      ctaType: ad.ctaButton,
      destinationUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://example.com",
    });

    // 5. Create ad
    const metaAd = await createMetaAd({
      name: `${ad.campaign.name} — ${ad.variantLabel}`,
      adSetId: adSet.id,
      creativeId: creative.id,
    });

    // 6. Update local DB
    await prisma.ad.update({
      where: { id },
      data: {
        status: "LIVE",
        metaAdId: metaAd.id,
        metaAdSetId: adSet.id,
      },
    });

    if (ad.campaign.status === "DRAFT") {
      await prisma.campaign.update({
        where: { id: ad.campaign.id },
        data: { status: "ACTIVE" },
      });
    }

    return NextResponse.json({
      ok: true,
      metaAdId: metaAd.id,
      metaAdSetId: adSet.id,
      metaCampaignId,
    });
  } catch (err) {
    await prisma.ad.update({
      where: { id },
      data: { status: "DRAFT" },
    });
    const msg = err instanceof Error ? err.message : "Meta publish failed.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
