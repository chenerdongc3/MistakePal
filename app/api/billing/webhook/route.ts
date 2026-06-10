import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import {
  getPlanFromProductId,
  normalizePlan,
  normalizeSubscriptionStatus,
  planQuotas,
} from "../../../../lib/server/billing";
import { getSupabaseAdminClient } from "../../../../lib/supabase-server";

type CreemWebhookPayload = {
  eventType?: string;
  type?: string;
  object?: {
    customer?: {
      id?: string;
    };
    id?: string;
    metadata?: {
      plan?: string;
      userId?: string;
    };
    product?: {
      id?: string;
    };
    product_id?: string;
    status?: string;
    subscription?: {
      id?: string;
    };
    current_period_end?: string;
  };
};

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!isValidCreemWebhook(request, rawBody)) {
    return NextResponse.json(
      { error: "Invalid webhook signature.", code: "INVALID_SIGNATURE" },
      { status: 401 },
    );
  }

  const payload = JSON.parse(rawBody) as CreemWebhookPayload;
  const eventObject = payload.object ?? {};
  const userId = eventObject.metadata?.userId;

  if (!userId) {
    return NextResponse.json({ received: true, skipped: "missing userId" });
  }

  const metadataPlan = normalizePlan(eventObject.metadata?.plan);
  const productPlan = getPlanFromProductId(
    eventObject.product?.id ?? eventObject.product_id,
  );
  const plan = metadataPlan === "free" ? productPlan : metadataPlan;
  const subscriptionStatus = normalizeSubscriptionStatus(eventObject.status);
  const quotas = planQuotas[plan];
  const quotaPeriodStart = new Date().toISOString();
  const quotaPeriodEnd =
    eventObject.current_period_end ??
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Missing Supabase service role key.", code: "SUPABASE_NOT_CONFIGURED" },
      { status: 500 },
    );
  }

  const { error } = await supabase.from("user_billing_profiles").upsert({
    user_id: userId,
    plan,
    subscription_status:
      subscriptionStatus === "inactive" && plan !== "free"
        ? "active"
        : subscriptionStatus,
    creem_customer_id: eventObject.customer?.id ?? null,
    creem_subscription_id:
      eventObject.subscription?.id ?? eventObject.id ?? null,
    current_period_end: eventObject.current_period_end ?? null,
    quota_period_start: quotaPeriodStart,
    quota_period_end: quotaPeriodEnd,
    monthly_ocr_quota: quotas.monthlyOcrQuota,
    monthly_ai_quota: quotas.monthlyAiQuota,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("[billing/webhook] Supabase upsert failed:", error.message);
    return NextResponse.json(
      { error: "Could not update billing profile.", code: "BILLING_UPDATE_FAILED" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

function isValidCreemWebhook(request: Request, rawBody: string) {
  const secret = process.env.CREEM_WEBHOOK_SECRET;

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const signature =
    request.headers.get("creem-signature") ??
    request.headers.get("x-creem-signature") ??
    request.headers.get("webhook-signature");

  if (!signature) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = signature.replace(/^sha256=/, "");

  if (received.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}
