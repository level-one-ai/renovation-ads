import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pauseMetaAdSet } from "@/lib/meta";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const ad = await prisma.ad.findUnique({ where: { id } });
  if (!ad) return NextResponse.json({ error: "Ad not found" }, { status: 404 });

  if (ad.metaAdSetId) {
    try {
      await pauseMetaAdSet(ad.metaAdSetId);
    } catch (err) {
      // Log but don't block — still mark as draft locally
      console.error("Meta pause failed:", err);
    }
  }

  await prisma.ad.update({
    where: { id },
    data: { status: "DRAFT" },
  });

  return NextResponse.json({ ok: true });
}
