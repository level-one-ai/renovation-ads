import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const maxDuration = 60;

// Max sizes
const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 200;

export async function POST(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN is not configured." },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const adId = formData.get("adId") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");

  if (!isVideo && !isImage) {
    return NextResponse.json(
      { error: "Only image or video files are accepted." },
      { status: 400 }
    );
  }

  const maxBytes = isVideo ? MAX_VIDEO_MB * 1024 * 1024 : MAX_IMAGE_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json(
      {
        error: `File too large. Max ${isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB}MB for ${
          isVideo ? "video" : "image"
        }.`,
      },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop() ?? (isVideo ? "mp4" : "jpg");
  const folder = isVideo ? "videos" : "images";
  const safeName = `${folder}/${adId ?? "upload"}-${Date.now()}.${ext}`;

  try {
    const blob = await put(safeName, file, {
      access: "public",
      contentType: file.type,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json({
      url: blob.url,
      type: isVideo ? "video" : "image",
      size: file.size,
      name: file.name,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
