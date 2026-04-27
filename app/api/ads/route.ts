import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const campaignId = url.searchParams.get("campaign");
  const status = url.searchParams.get("status");

  const where: Record<string, string> = {};
  if (campaignId) where.campaignId = campaignId;
  if (status) where.status = status;

  const ads = await prisma.ad.findMany({
    where,
    include: { campaign: true, performance: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ads });
}
