"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function BillingSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      router.replace("/settings?billing=success");
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-blue-700">Payment complete</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          正在更新你的订阅
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          支付已完成，稍后会回到我的页面查看额度和订阅状态。
        </p>
        <Link
          className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          href="/settings?billing=success"
        >
          返回我的
        </Link>
      </section>
    </main>
  );
}
