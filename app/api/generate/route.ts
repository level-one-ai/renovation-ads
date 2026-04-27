import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateAdVariants } from "@/lib/anthropic";
import { generateAdImage } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

const UploadedFileSchema = z.object({
  url: z.string().url(),
  type: z.enum(["image", "video"]),
  name: z.string(),
  size: z.number(),
});

const InputSchema = z.object({
  campaignName: z.string().min(2).max(120),
  service: z.enum([
    "KITCHEN_REMODEL", "BATHROOM_REMODEL", "WHOLE_HOME_RENOVATION", "ROOM_ADDITION",
    "BASEMENT_FINISHING", "ROOFING", "SIDING", "WINDOWS_DOORS", "DECK_PATIO",
    "GARAGE_CONVERSION", "ADU_CONSTRUCTION", "COMMERCIAL_FITOUT",
  ]),
  location: z.string().min(2).max(120),
  dailyBudget: z.number().min(5).max(10000),
  offer: z.enum([
    "FREE_ESTIMATE", "FREE_DESIGN_CONSULTATION", "FINANCING_AVAILABLE",
    "LIMITED_SLOTS", "SEASONAL_DISCOUNT", "FREE_3D_RENDER",
  ]),
  uploadedFiles: z.array(UploadedFileSchema).max(3).optional().default([]),
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
  const hasUploads = input.uploadedFiles.length > 0;

  // 1. Ask Claude for 3 variants
  let variants;
  try {
    variants = await generateAdVariants(input);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Claude generation failed.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // 2. Assign uploaded files to variants (round-robin if fewer files than variants)
  function getFileForVariant(index: number) {
    if (!hasUploads) return null;
    return input.uploadedFiles[index % input.uploadedFiles.length];
  }

  // 3. Persist campaign + ads
  const campaign = await prisma.campaign.create({
    data: {
      name: input.campaignName,
      service: input.service,
      location: input.location,
      dailyBudget: input.dailyBudget,
      offer: input.offer,
      status: "DRAFT",
      ads: {
        create: variants.map((v, i) => {
          const file = getFileForVariant(i);
          const isVideo = file?.type === "video";
          const isImage = file?.type === "image";
          return {
            variantLabel: v.variantLabel,
            headline: v.headline,
            primaryText: v.primaryText,
            description: v.description,
            ctaButton: v.ctaButton,
            imagePrompt: v.imagePrompt,
            // Pre-fill with uploaded files if provided
            imageUrl: isImage ? file.url : null,
            beforeAfterUrl: isImage ? file.url : null,
            useBeforeAfter: isImage,
            videoUrl: isVideo ? file.url : null,
            useVideo: isVideo,
            creativeType: isVideo ? "VIDEO" : "IMAGE",
            status: "DRAFT",
          };
        }),
      },
    },
    include: { ads: true },
  });

  // 4. Generate AI images only for ads that don't have an uploaded file
  if (!hasUploads) {
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
        }
      })
    );
  }

  return NextResponse.json({
    campaignId: campaign.id,
    adIds: campaign.ads.map((a) => a.id),
    creativeSource: hasUploads ? "uploaded" : "ai",
  });
}
