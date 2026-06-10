import { NextResponse } from "next/server";
import {
  getDefaultBillingProfile,
  mapBillingProfileRow,
  planQuotas,
} from "../../../../lib/server/billing";
import {
  getSupabaseAdminClient,
  getUserFromRequest,
} from "../../../../lib/supabase-server";

export async function GET(request: Request) {
  const { supabase, user, error: authError } = await getUserFromRequest(request);

  if (!supabase || !user) {
    return NextResponse.json(
      { error: authError ?? "Login required.", code: "AUTH_REQUIRED" },
      { status: authError === "Missing Supabase configuration." ? 500 : 401 },
    );
  }

  const { data, error } = await supabase
    .from("user_billing_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[billing/profile] Supabase read failed:", error.message);
    return NextResponse.json(
      { error: "Could not load billing profile.", code: "BILLING_READ_FAILED" },
      { status: 500 },
    );
  }

  if (data) {
    return NextResponse.json(mapBillingProfileRow(data));
  }

  const defaults = getDefaultBillingProfile();
  const adminClient = getSupabaseAdminClient();

  if (adminClient) {
    await adminClient.from("user_billing_profiles").upsert({
      user_id: user.id,
      plan: defaults.plan,
      subscription_status: defaults.subscriptionStatus,
      quota_period_start: defaults.quotaPeriodStart,
      quota_period_end: defaults.quotaPeriodEnd,
      monthly_ocr_quota: planQuotas.free.monthlyOcrQuota,
      monthly_ai_quota: planQuotas.free.monthlyAiQuota,
      updated_at: new Date().toISOString(),
    });
  }

  return NextResponse.json(defaults);
}
