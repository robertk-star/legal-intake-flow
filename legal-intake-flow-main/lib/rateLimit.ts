import { NextResponse } from "next/server";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  keyPrefix: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  key: string;
  remaining: number;
  resetAt: number;
  response?: NextResponse;
};

const globalStore = globalThis as typeof globalThis & {
  __lifRateLimitStore?: Map<string, RateLimitBucket>;
};

const store = globalStore.__lifRateLimitStore ?? new Map<string, RateLimitBucket>();
globalStore.__lifRateLimitStore = store;

function clientIpFromRequest(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwardedFor ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export function checkRateLimit(request: Request, options: RateLimitOptions): RateLimitResult {
  if (process.env.LIF_RATE_LIMIT_DISABLED?.trim().toLowerCase() === "true") {
    return { allowed: true, key: "disabled", remaining: options.limit, resetAt: Date.now() + options.windowMs };
  }

  const now = Date.now();
  const ip = clientIpFromRequest(request);
  const key = `${options.keyPrefix}:${ip}`;
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + options.windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, key, remaining: Math.max(0, options.limit - 1), resetAt };
  }

  if (current.count >= options.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    const response = NextResponse.json(
      { error: "Too many requests. Please wait and try again." },
      { status: 429 }
    );
    response.headers.set("Retry-After", String(retryAfterSeconds));
    response.headers.set("X-RateLimit-Limit", String(options.limit));
    response.headers.set("X-RateLimit-Remaining", "0");
    response.headers.set("X-RateLimit-Reset", String(Math.ceil(current.resetAt / 1000)));
    return { allowed: false, key, remaining: 0, resetAt: current.resetAt, response };
  }

  current.count += 1;
  store.set(key, current);
  return {
    allowed: true,
    key,
    remaining: Math.max(0, options.limit - current.count),
    resetAt: current.resetAt,
  };
}

export function rateLimitResponse(request: Request, options: RateLimitOptions) {
  const result = checkRateLimit(request, options);
  return result.allowed ? null : result.response ?? NextResponse.json({ error: "Too many requests." }, { status: 429 });
}
