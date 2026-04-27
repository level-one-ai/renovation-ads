import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateAdVariants } from "@/lib/anthropic";
import { generateAdImage } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

const InputSchema = z.object({
  campaignName: z.string().min(2).max(120),
  service: z.enum([
    "KITCHEN_REMODEL",
    "BATHROOM_REMODEL",
    "WHOLE_HOME_RENOVATION",
    "ROOM_ADDITION",
    "BASEMENT_FINISHING",
    "ROOFING",
    "SIDING",
    "WINDOWS_DOORS",
    "DECK_PATIO",
    "GARAGE_CONVERSION",
    "ADU_CONSTRUCTION",
    "COMMERCIAL_FITOUT",
  ]),
  location: z.string().min(2).max(120),
  dailyBudget: z.number().min(5).max(10000),
  offer: z.enum([
    "FREE_ESTIMATE",
    "FREE_DESIGN_CONSULTATION",
    "FINANCING_AVAILABLE",
    "LIMITED_SLOTS",
    "SEASONAL_DISCOUNT",
    "FREE_3D_RENDER",
  ]),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const input = parsed.data;

  // 1. Ask Claude for 3 variants.
  let variants;
  try {
    variants = await generateAdVariants(input);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Claude generation failed.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // 2. Persist campaign + ads in DRAFT (without images yet).
  const campaign = await prisma.campaign.create({
    data: {
      name: input.campaignName,
      service: input.service,
      location: input.location,
      dailyBudget: input.dailyBudget,
      offer: input.offer,
      status: "DRAFT",
      ads: {
        create: variants.map((v) => ({
          variantLabel: v.variantLabel,
          headline: v.headline,
          primaryText: v.primaryText,
          description: v.description,
          ctaButton: v.ctaButton,
          imagePrompt: v.imagePrompt,
          status: "DRAFT",
        })),
      },
    },
    include: { ads: true },
  });

  // 3. Fire off image generation in parallel — non-blocking on individual failures.
  await Promise.allSettled(
    campaign.ads.map(async (ad) => {
      try {
        const imageUrl = await generateAdImage(
          ad.imagePrompt,
          `${campaign.id}-${ad.variantLabel}`
        );
        await prisma.ad.update({
          where: { id: ad.id },
          data: { imageUrl },
        });
      } catch (err) {
        console.error(`Image generation failed for ad ${ad.id}:`, err);
        // Leave imageUrl null — UI handles this gracefully and the user can re-generate.
      }
    })
  );

  return NextResponse.json({
    campaignId: campaign.id,
    adIds: campaign.ads.map((a) => a.id),
  });
}
