import { NextResponse } from "next/server";
import {
  GEMINI_MODEL,
  extractTextFromScreenshot,
  getGeminiApiKey,
} from "../../../lib/server/gemini";
import { checkRateLimit } from "../../../lib/server/rate-limit";
import { uploadScreenshot } from "../../../lib/server/screenshot-storage";

export const runtime = "nodejs";
const maxScreenshotSizeBytes = 8 * 1024 * 1024;
const allowedScreenshotTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export async function POST(request: Request) {
  const startedAt = Date.now();
  const rateLimit = checkRateLimit({
    limit: 20,
    request,
    windowMs: 10 * 60 * 1000,
  });

  if (rateLimit) {
    return NextResponse.json(
      {
        error: "Too many screenshot analyses. Please try again later.",
        code: "RATE_LIMITED",
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
      { status: 429 },
    );
  }

  const formData = await request.formData();
  const image = formData.get("image");
  const explanationLanguage =
    formData.get("explanationLanguage")?.toString() ?? "Chinese";

  if (!(image instanceof File)) {
    return NextResponse.json(
      { error: "An image file is required.", code: "IMAGE_REQUIRED" },
      { status: 400 },
    );
  }

  if (!allowedScreenshotTypes.has(image.type)) {
    return NextResponse.json(
      { error: "Unsupported image type.", code: "UNSUPPORTED_IMAGE_TYPE" },
      { status: 400 },
    );
  }

  if (image.size > maxScreenshotSizeBytes) {
    return NextResponse.json(
      { error: "Image is too large.", code: "IMAGE_TOO_LARGE" },
      { status: 400 },
    );
  }

  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Missing GEMINI_API_KEY. Add it to .env.local and restart the dev server.",
        code: "AI_NOT_CONFIGURED",
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
    const imageUrl = await uploadScreenshot(image, request);
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
        code: "OCR_FAILED",
      },
      { status: 502 },
    );
  }
}
