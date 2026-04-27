import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const PatchSchema = z.object({
  headline: z.string().max(40).optional(),
  primaryText: z.string().max(2000).optional(),
  description: z.string().max(30).optional(),
  ctaButton: z
    .enum(["LEARN_MORE", "GET_QUOTE", "CONTACT_US", "BOOK_NOW", "GET_OFFER"])
    .optional(),
  beforeAfterUrl: z.string().url().nullable().optional(),
  useBeforeAfter: z.boolean().optional(),
  status: z
    .enum(["DRAFT", "PENDING_APPROVAL", "APPROVED", "PUBLISHING", "LIVE", "PAUSED", "REJECTED"])
    .optional(),
});

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const ad = await prisma.ad.findUnique({
    where: { id },
    include: { campaign: true, performance: true, auditReports: true },
  });
  if (!ad) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ad });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const ad = await prisma.ad.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json({ ad });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await prisma.ad.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
