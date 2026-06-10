type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();

export function checkRateLimit({
  limit,
  request,
  windowMs,
}: {
  limit: number;
  request: Request;
  windowMs: number;
}) {
  const now = Date.now();
  const key = getRequestKey(request);
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return null;
  }

  if (current.count >= limit) {
    return {
      retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
    };
  }

  current.count += 1;
  return null;
}

function getRequestKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0];
  const realIp = request.headers.get("x-real-ip");
  const authorization = request.headers.get("authorization");

  return authorization ?? forwardedFor ?? realIp ?? "anonymous";
}
