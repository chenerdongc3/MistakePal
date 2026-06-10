import type { BillingProfile, SubscriptionPlan } from "../types";
import { getSupabaseAdminClient, getUserFromRequest } from "../supabase-server";

export const planQuotas: Record<
  SubscriptionPlan,
  {
    monthlyAiQuota: number;
    monthlyOcrQuota: number;
  }
> = {
  free: {
    monthlyAiQuota: 50,
    monthlyOcrQuota: 20,
  },
  plus: {
    monthlyAiQuota: 1000,
    monthlyOcrQuota: 300,
  },
  pro: {
    monthlyAiQuota: 3000,
    monthlyOcrQuota: 1000,
  },
};

export function getDefaultBillingProfile(): BillingProfile {
  const period = getNextQuotaPeriod();

  return {
    plan: "free",
    subscriptionStatus: "inactive",
    quotaPeriodStart: period.start,
    quotaPeriodEnd: period.end,
    monthlyOcrQuota: planQuotas.free.monthlyOcrQuota,
    monthlyAiQuota: planQuotas.free.monthlyAiQuota,
    usedOcrCount: 0,
    usedAiCount: 0,
  };
}

export async function checkBillingUsage(
  request: Request,
  usageType: "ai" | "ocr",
) {
  const { profile, status, error } = await getBillingProfileForRequest(request);

  if (!profile) {
    return {
      allowed: false,
      error,
      status,
    };
  }

  const usedCount =
    usageType === "ocr" ? profile.usedOcrCount : profile.usedAiCount;
  const quota =
    usageType === "ocr" ? profile.monthlyOcrQuota : profile.monthlyAiQuota;

  if (usedCount >= quota) {
    return {
      allowed: false,
      error:
        usageType === "ocr"
          ? "Monthly OCR quota reached. Upgrade your plan to continue."
          : "Monthly AI quota reached. Upgrade your plan to continue.",
      status: 402,
    };
  }

  return {
    allowed: true,
    profile,
  };
}

export async function recordBillingUsage(
  request: Request,
  usageType: "ai" | "ocr",
) {
  const { supabase: userClient, user, error: authError } =
    await getUserFromRequest(request);
  const adminClient = getSupabaseAdminClient();

  if (!userClient || !user) {
    return {
      recorded: false,
      error: authError ?? "Login required.",
      status: authError === "Missing Supabase configuration." ? 500 : 401,
    };
  }

  if (!adminClient) {
    return {
      recorded: false,
      error: "Missing Supabase service role key.",
      status: 500,
    };
  }

  const { profile } = await getBillingProfileForRequest(request);
  const nextProfile = profile ?? getDefaultBillingProfile();
  const nextOcrCount =
    usageType === "ocr"
      ? nextProfile.usedOcrCount + 1
      : nextProfile.usedOcrCount;
  const nextAiCount =
    usageType === "ai"
      ? nextProfile.usedAiCount + 1
      : nextProfile.usedAiCount;

  const { error: updateError } = await adminClient
    .from("user_billing_profiles")
    .upsert({
      user_id: user.id,
      plan: nextProfile.plan,
      subscription_status: nextProfile.subscriptionStatus,
      current_period_end: nextProfile.currentPeriodEnd ?? null,
      quota_period_start: nextProfile.quotaPeriodStart,
      quota_period_end: nextProfile.quotaPeriodEnd,
      monthly_ocr_quota: nextProfile.monthlyOcrQuota,
      monthly_ai_quota: nextProfile.monthlyAiQuota,
      used_ocr_count: nextOcrCount,
      used_ai_count: nextAiCount,
      updated_at: new Date().toISOString(),
    });

  if (updateError) {
    console.error("[billing] Usage profile update failed:", updateError.message);
    return {
      recorded: false,
      error: "Could not update billing usage.",
      status: 500,
    };
  }

  return {
    recorded: true,
    profile: {
      ...nextProfile,
      usedOcrCount: nextOcrCount,
      usedAiCount: nextAiCount,
    },
  };
}

export async function getBillingProfileForRequest(request: Request) {
  const { supabase, user, error: authError } = await getUserFromRequest(request);

  if (!supabase || !user) {
    return {
      profile: null,
      error: authError ?? "Login required.",
      status: authError === "Missing Supabase configuration." ? 500 : 401,
    };
  }

  const { data, error } = await supabase
    .from("user_billing_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[billing] Profile read failed:", error.message);
    return {
      profile: null,
      error: "Could not verify billing profile.",
      status: 500,
    };
  }

  const profile = data ? mapBillingProfileRow(data) : getDefaultBillingProfile();

  if (!profile.quotaPeriodEnd || Date.parse(profile.quotaPeriodEnd) > Date.now()) {
    return {
      profile,
      user,
    };
  }

  const resetProfile = {
    ...profile,
    ...getNextQuotaPeriod(),
    usedOcrCount: 0,
    usedAiCount: 0,
  };

  const adminClient = getSupabaseAdminClient();

  if (adminClient) {
    await adminClient.from("user_billing_profiles").upsert({
      user_id: user.id,
      plan: resetProfile.plan,
      subscription_status: resetProfile.subscriptionStatus,
      current_period_end: resetProfile.currentPeriodEnd ?? null,
      quota_period_start: resetProfile.quotaPeriodStart,
      quota_period_end: resetProfile.quotaPeriodEnd,
      monthly_ocr_quota: resetProfile.monthlyOcrQuota,
      monthly_ai_quota: resetProfile.monthlyAiQuota,
      used_ocr_count: 0,
      used_ai_count: 0,
      updated_at: new Date().toISOString(),
    });
  }

  return {
    profile: resetProfile,
    user,
  };
}

export function getPlanFromProductId(productId?: string | null): SubscriptionPlan {
  if (productId && productId === process.env.CREEM_PRO_PRODUCT_ID) {
    return "pro";
  }

  if (productId && productId === process.env.CREEM_PLUS_PRODUCT_ID) {
    return "plus";
  }

  return "free";
}

export function getProductIdForPlan(plan: SubscriptionPlan) {
  if (plan === "plus") {
    return process.env.CREEM_PLUS_PRODUCT_ID;
  }

  if (plan === "pro") {
    return process.env.CREEM_PRO_PRODUCT_ID;
  }

  return "";
}

export function mapBillingProfileRow(row: Record<string, unknown>): BillingProfile {
  const plan = normalizePlan(row.plan);
  const quotas = planQuotas[plan];

  return {
    plan,
    subscriptionStatus: normalizeSubscriptionStatus(row.subscription_status),
    currentPeriodEnd:
      typeof row.current_period_end === "string"
        ? row.current_period_end
        : undefined,
    quotaPeriodStart:
      typeof row.quota_period_start === "string"
        ? row.quota_period_start
        : undefined,
    quotaPeriodEnd:
      typeof row.quota_period_end === "string"
        ? row.quota_period_end
        : undefined,
    monthlyOcrQuota: Number(row.monthly_ocr_quota ?? quotas.monthlyOcrQuota),
    monthlyAiQuota: Number(row.monthly_ai_quota ?? quotas.monthlyAiQuota),
    usedOcrCount: Number(row.used_ocr_count ?? 0),
    usedAiCount: Number(row.used_ai_count ?? 0),
  };
}

function getNextQuotaPeriod() {
  const start = new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  return {
    quotaPeriodStart: start.toISOString(),
    quotaPeriodEnd: end.toISOString(),
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export function normalizePlan(value: unknown): SubscriptionPlan {
  return value === "plus" || value === "pro" ? value : "free";
}

export function normalizeSubscriptionStatus(value: unknown) {
  if (
    value === "active" ||
    value === "trialing" ||
    value === "past_due" ||
    value === "canceled"
  ) {
    return value;
  }

  return "inactive";
}

export async function createCreemCheckout({
  customerEmail,
  plan,
  request,
  userId,
}: {
  customerEmail?: string | null;
  plan: SubscriptionPlan;
  request: Request;
  userId: string;
}) {
  const apiKey = process.env.CREEM_API_KEY;
  const productId = getProductIdForPlan(plan);

  if (!apiKey || !productId) {
    throw new Error("Creem billing is not configured.");
  }

  const appUrl = getAppUrl(request);
  const response = await fetch(getCreemApiUrl("/v1/checkouts"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      product_id: productId,
      success_url: `${appUrl}/billing/success`,
      metadata: {
        plan,
        userId,
      },
      customer: customerEmail
        ? {
            email: customerEmail,
          }
        : undefined,
    }),
  });

  const data = (await response.json().catch(() => null)) as
    | {
        checkout_url?: string;
        checkoutUrl?: string;
        url?: string;
      }
    | null;

  if (!response.ok) {
    throw new Error("Could not create Creem checkout.");
  }

  const checkoutUrl = data?.checkout_url ?? data?.checkoutUrl ?? data?.url;

  if (!checkoutUrl) {
    throw new Error("Creem checkout did not return a checkout URL.");
  }

  return checkoutUrl;
}

function getCreemApiUrl(path: string) {
  const baseUrl =
    process.env.CREEM_API_BASE_URL ??
    (process.env.CREEM_API_KEY?.startsWith("creem_test_")
      ? "https://test-api.creem.io"
      : "https://api.creem.io");

  return `${baseUrl}${path}`;
}

function getAppUrl(request: Request) {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}
