import {
  getScreenshotBucketName,
  getSupabaseAdminClient,
  getSupabaseUserClient,
} from "../supabase-server";

export async function uploadScreenshot(image: File, request: Request) {
  const accessToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  const userClient = accessToken ? getSupabaseUserClient(accessToken) : null;
  const supabase = getSupabaseAdminClient() ?? userClient;

  if (!supabase) {
    console.warn(
      "[screenshot-storage] Supabase storage upload skipped: missing service role key and user access token.",
    );
    return null;
  }

  const {
    data: { user },
  } = userClient
    ? await userClient.auth.getUser(accessToken)
    : { data: { user: null } };

  const extension = getFileExtension(image);
  const ownerPrefix = user?.id ?? "server";
  const path = `${ownerPrefix}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
  const bucket = getScreenshotBucketName();
  const { error } = await supabase.storage.from(bucket).upload(path, image, {
    contentType: image.type || "image/png",
    upsert: false,
  });

  if (error) {
    console.warn("[screenshot-storage] Supabase storage upload skipped:", error.message);
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
