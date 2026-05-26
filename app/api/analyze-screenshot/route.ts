import { NextResponse } from "next/server";
import {
  GEMINI_MODEL,
  extractTextFromScreenshot,
  getGeminiApiKey,
} from "../../../lib/server/gemini";
import {
  getScreenshotBucketName,
  getSupabaseAdminClient,
} from "../../../lib/supabase-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const formData = await request.formData();
  const image = formData.get("image");
  const explanationLanguage =
    formData.get("explanationLanguage")?.toString() ?? "Chinese";

  if (!(image instanceof File)) {
    return NextResponse.json(
      { error: "An image file is required." },
      { status: 400 },
    );
  }

  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Missing GEMINI_API_KEY. Add it to .env.local and restart the dev server.",
      },
      { status: 500 },
    );
  }

  try {
    console.log(
      `[analyze-screenshot] Starting OCR: language=${explanationLanguage}, image=${image.name}, type=${image.type}`,
    );

    const extraction = await extractTextFromScreenshot({
      apiKey,
      image,
    });
    const imageUrl = await uploadScreenshot(image);
    const elapsedMs = Date.now() - startedAt;

    console.log(
      `[analyze-screenshot] OCR completed in ${elapsedMs}ms: ${extraction.sourceLanguage} | ${extraction.originalSentence}`,
    );

    return NextResponse.json({
      id: crypto.randomUUID(),
      imageUrl: imageUrl ?? "",
      explanationLanguage,
      isFavorite: false,
      createdAt: new Date().toISOString(),
      debug: {
        provider: "google-ai-studio",
        model: GEMINI_MODEL,
        elapsedMs,
        ocrElapsedMs: elapsedMs,
        rawOcrText: extraction.rawOcrText,
      },
      ...extraction,
    });
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    console.error(`[analyze-screenshot] OCR failed after ${elapsedMs}ms:`, error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not read the screenshot. Please try again.",
      },
      { status: 502 },
    );
  }
}

async function uploadScreenshot(image: File) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const extension = getFileExtension(image);
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
  const bucket = getScreenshotBucketName();
  const { error } = await supabase.storage.from(bucket).upload(path, image, {
    contentType: image.type || "image/png",
    upsert: false,
  });

  if (error) {
    console.warn(
      "[analyze-screenshot] Supabase storage upload skipped:",
      error.message,
    );
    return null;
  }

  const { data: signedUrlData } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 24 * 30);

  if (signedUrlData?.signedUrl) {
    return signedUrlData.signedUrl;
  }

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicUrlData.publicUrl;
}

function getFileExtension(image: File) {
  const fromName = image.name.split(".").pop()?.toLowerCase();

  if (fromName && ["png", "jpg", "jpeg", "webp"].includes(fromName)) {
    return fromName;
  }

  if (image.type === "image/jpeg") {
    return "jpg";
  }

  if (image.type === "image/webp") {
    return "webp";
  }

  return "png";
}
