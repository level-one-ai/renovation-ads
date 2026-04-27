import { GoogleGenAI, Modality } from "@google/genai";
import { put } from "@vercel/blob";

const apiKey = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.0-flash-preview-image-generation";

let client: GoogleGenAI | null = null;
function getClient() {
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

/**
 * Generate an ad creative image using Gemini.
 * Returns a publicly accessible URL (uploaded to Vercel Blob).
 */
export async function generateAdImage(prompt: string, filenameHint: string): Promise<string> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
    },
  });

  const candidates = response.candidates ?? [];
  for (const candidate of candidates) {
    const parts = candidate.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        const buffer = Buffer.from(part.inlineData.data, "base64");
        const mimeType = part.inlineData.mimeType ?? "image/png";
        const ext = mimeType.split("/")[1] ?? "png";

        // Upload to Vercel Blob (or return a data URL fallback if no token)
        if (process.env.BLOB_READ_WRITE_TOKEN) {
          const safeName = filenameHint.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
          const blob = await put(`ads/${safeName}-${Date.now()}.${ext}`, buffer, {
            access: "public",
            contentType: mimeType,
            token: process.env.BLOB_READ_WRITE_TOKEN,
          });
          return blob.url;
        }

        // Fallback: return as data URL (large but works in dev)
        return `data:${mimeType};base64,${part.inlineData.data}`;
      }
    }
  }

  throw new Error("Gemini returned no image data.");
}
