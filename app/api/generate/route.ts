import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateAdVariants } from "@/lib/anthropic";
import { generateAdImage } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

const GeoLocationSchema = z.object({
  id: z.string(),
  label: z.string(),
  lat: z.number(),
  lng: z.number(),
  metaKey: z.string(),
  metaName: z.string(),
  metaCountryCode: z.string(),
  metaRegionId: z.string().optional(),
});

const UploadedFileSchema = z.object({
  url: z.string().url(),
  type: z.enum(["image", "video"]),
  name: z.string(),
  size: z.number(),
});

const InputSchema = z.object({
  campaignName: z.string().min(2).max(120),
  service: z.enum([
    "KITCHEN_REMODEL","BATHROOM_REMODEL","WHOLE_HOME_RENOVATION","ROOM_ADDITION",
    "BASEMENT_FINISHING","ROOFING","SIDING","WINDOWS_DOORS","DECK_PATIO",
    "GARAGE_CONVERSION","ADU_CONSTRUCTION","COMMERCIAL_FITOUT",
  ]),
  location: z.string().min(2).max(500),
  dailyBudget: z.number().min(5).max(10000),
  offer: z.enum([
    "FREE_ESTIMATE","FREE_DESIGN_CONSULTATION","FINANCING_AVAILABLE",
    "LIMITED_SLOTS","SEASONAL_DISCOUNT","FREE_3D_RENDER",
  ]),
  destinationUrl: z.string().url().optional().default(""),
  geoTargeting: z.object({
    locations: z.array(GeoLocationSchema),
    radiusMiles: z.number(),
  }).optional(),
  audience: z.object({
    ageMin: z.number().min(18).max(65),
    ageMax: z.number().min(18).max(65),
    gender: z.enum(["all", "male", "female"]),
  }).optional(),
  publishActive: z.boolean().optional().default(false),
  uploadedFiles: z.array(UploadedFileSchema).max(3).optional().default([]),
});

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }

  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const hasUploads = input.uploadedFiles.length > 0;

  // Generate copy variants from Claude
  let variants;
  try {
    variants = await generateAdVariants(input);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Claude failed." }, { status: 502 });
  }

  function getFileForVariant(index: number) {
    if (!hasUploads) return null;
    return input.uploadedFiles[index % input.uploadedFiles.length];
  }

  // Persist campaign + ads
  const campaign = await prisma.campaign.create({
    data: {
      name: input.campaignName,
      service: input.service,
      location: input.location,
      dailyBudget: input.dailyBudget,
      offer: input.offer,
      destinationUrl: input.destinationUrl ?? "",
      geoTargeting: input.geoTargeting ?? undefined,
      audience: input.audience ?? undefined,
      publishActive: input.publishActive ?? false,
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

  // Generate AI images only if no uploads
  if (!hasUploads) {
    await Promise.allSettled(
      campaign.ads.map(async (ad) => {
        try {
          const imageUrl = await generateAdImage(ad.imagePrompt, `${campaign.id}-${ad.variantLabel}`);
          await prisma.ad.update({ where: { id: ad.id }, data: { imageUrl } });
        } catch (err) {
          console.error(`Image gen failed for ${ad.id}:`, err);
        }
      })
    );
  }

  return NextResponse.json({ campaignId: campaign.id, adIds: campaign.ads.map((a) => a.id) });
}
