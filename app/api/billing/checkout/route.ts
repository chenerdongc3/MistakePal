import { NextResponse } from "next/server";
import { createCreemCheckout, normalizePlan } from "../../../../lib/server/billing";
import { getUserFromRequest } from "../../../../lib/supabase-server";

type CheckoutRequest = {
  plan?: string;
};

export async function POST(request: Request) {
  const { supabase, user, error: authError } = await getUserFromRequest(request);

  if (!supabase || !user) {
    return NextResponse.json(
      { error: authError ?? "Login required.", code: "AUTH_REQUIRED" },
      { status: authError === "Missing Supabase configuration." ? 500 : 401 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as CheckoutRequest;
  const plan = normalizePlan(body.plan);

  if (plan === "free") {
    return NextResponse.json(
      { error: "Free plan does not need checkout.", code: "INVALID_PLAN" },
      { status: 400 },
    );
  }

  try {
    const checkoutUrl = await createCreemCheckout({
      customerEmail: user.email,
      plan,
      request,
      userId: user.id,
    });

    return NextResponse.json({ checkoutUrl });
  } catch (error) {
    console.error("[billing/checkout] Creem checkout failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not start checkout.",
        code: "CHECKOUT_FAILED",
      },
      { status: 500 },
    );
  }
}
