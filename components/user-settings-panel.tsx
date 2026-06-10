import type {
  BillingProfile,
  PersonalAgentConfig,
  SubscriptionPlan,
} from "../lib/types";

const planOptions: {
  id: SubscriptionPlan;
  name: string;
  description: string;
}[] = [
  {
    id: "free",
    name: "Free",
    description: "适合先体验截图 OCR、收藏和基础学习流程。",
  },
  {
    id: "plus",
    name: "Plus",
    description: "每月 300 次 OCR、1000 次 AI 学习分析。",
  },
  {
    id: "pro",
    name: "Pro",
    description: "每月 1000 次 OCR、3000 次 AI 学习分析。",
  },
];

const providerPresets: {
  label: string;
  config: Pick<
    PersonalAgentConfig,
    "mode" | "provider" | "region" | "baseUrl" | "model"
  >;
}[] = [
  {
    label: "平台额度",
    config: {
      mode: "platform",
      provider: "gemini",
      region: "global",
      baseUrl: "",
      model: "gemini-2.5-flash",
    },
  },
  {
    label: "Gemini",
    config: {
      mode: "personal",
      provider: "gemini",
      region: "global",
      baseUrl: "",
      model: "gemini-2.5-flash",
    },
  },
  {
    label: "OpenAI",
    config: {
      mode: "personal",
      provider: "openai-compatible",
      region: "global",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
    },
  },
  {
    label: "DeepSeek",
    config: {
      mode: "personal",
      provider: "openai-compatible",
      region: "china",
      baseUrl: "https://api.deepseek.com/v1",
      model: "deepseek-chat",
    },
  },
  {
    label: "通义千问",
    config: {
      mode: "personal",
      provider: "openai-compatible",
      region: "china",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      model: "qwen-plus",
    },
  },
  {
    label: "中转站",
    config: {
      mode: "personal",
      provider: "openai-compatible",
      region: "proxy",
      baseUrl: "",
      model: "gpt-4o-mini",
    },
  },
];

export function UserSettingsPanel({
  agentConfig,
  billingError,
  billingProfile,
  billingStatus,
  billingUrl,
  isBillingLoading,
  plan,
  onAgentConfigChange,
  onBack,
  onCheckout,
  onPlanChange,
}: {
  agentConfig: PersonalAgentConfig;
  billingError: string;
  billingProfile: BillingProfile | null;
  billingStatus: string;
  billingUrl: string;
  isBillingLoading: boolean;
  plan: SubscriptionPlan;
  onAgentConfigChange: (value: PersonalAgentConfig) => void;
  onBack: () => void;
  onCheckout: (plan: Exclude<SubscriptionPlan, "free">) => void;
  onPlanChange: (value: SubscriptionPlan) => void;
}) {
  const isUsingPlatformQuota = agentConfig.mode === "platform";

  function updateAgentConfig(nextConfig: Partial<PersonalAgentConfig>) {
    onAgentConfigChange({
      ...agentConfig,
      ...nextConfig,
    });
  }

  function applyPreset(
    preset: (typeof providerPresets)[number]["config"],
  ) {
    onAgentConfigChange({
      ...agentConfig,
      ...preset,
      apiKey: preset.mode === "platform" ? "" : agentConfig.apiKey,
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">我的</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            Settings
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            选择当前计划，并配置聊天 Agent 使用的 API。
          </p>
        </div>
        <button
          className="w-fit rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          onClick={onBack}
          type="button"
        >
          返回学习
        </button>
      </div>

      <div className="mt-6 space-y-8">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Plan</h3>
          {billingError ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {billingError}
            </div>
          ) : null}
          {billingStatus ? (
            <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
              {billingStatus}
            </div>
          ) : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {planOptions.map((option) => {
              const currentPlan = billingProfile?.plan ?? plan;
              const isSelected = currentPlan === option.id;
              const isPaidPlan = option.id !== "free";

              return (
                <div
                  className={`rounded-xl border p-4 text-left transition ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 shadow-sm"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                  key={option.id}
                >
                  <span
                    className={`text-sm font-semibold ${
                      isSelected ? "text-blue-800" : "text-slate-950"
                    }`}
                  >
                    {option.name}
                  </span>
                  {isSelected ? (
                    <span className="mt-2 inline-flex rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                      Current
                    </span>
                  ) : null}
                  {isPaidPlan ? (
                    <span className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      Creem
                    </span>
                  ) : null}
                  <span className="mt-2 block text-sm leading-6 text-slate-600">
                    {option.description}
                  </span>
                  {isPaidPlan ? (
                    <button
                      className="mt-4 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                      disabled={isBillingLoading}
                      onClick={() =>
                        onCheckout(option.id as Exclude<SubscriptionPlan, "free">)
                      }
                      type="button"
                    >
                      {isBillingLoading ? "Starting..." : `Upgrade to ${option.name}`}
                    </button>
                  ) : (
                    <button
                      className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      onClick={() => onPlanChange("free")}
                      type="button"
                    >
                      Use Free
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {billingProfile ? (
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Usage this period: OCR {billingProfile.usedOcrCount}/
              {billingProfile.monthlyOcrQuota}, AI {billingProfile.usedAiCount}/
              {billingProfile.monthlyAiQuota}. Status:{" "}
              {billingProfile.subscriptionStatus}.
            </p>
          ) : null}
          {billingUrl ? (
            <a
              className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              href={billingUrl}
              rel="noreferrer"
              target="_blank"
            >
              Manage subscription
            </a>
          ) : null}
        </div>

        <div>
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold text-slate-950">
              Agent API
            </h3>
            <p className="text-sm leading-6 text-slate-600">
              默认使用平台配置。选择个人 API 后，聊天提问会使用这里的设置。
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {providerPresets.map((preset) => (
              <button
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  agentConfig.mode === preset.config.mode &&
                  agentConfig.provider === preset.config.provider &&
                  agentConfig.region === preset.config.region &&
                  (!preset.config.baseUrl ||
                    agentConfig.baseUrl === preset.config.baseUrl)
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                }`}
                key={preset.label}
                onClick={() => applyPreset(preset.config)}
                type="button"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {isUsingPlatformQuota ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">当前使用平台额度</p>
              <p className="mt-1 leading-6">
                不配置个人 API 时，聊天 Agent 会使用服务端默认模型配置。
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-600">
                  API Key
                </span>
                <input
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="sk-..."
                  type="password"
                  value={agentConfig.apiKey}
                  onChange={(event) =>
                    updateAgentConfig({ apiKey: event.target.value })
                  }
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-slate-600">
                    Provider
                  </span>
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={agentConfig.provider}
                    onChange={(event) =>
                      updateAgentConfig({
                        provider: event.target
                          .value as PersonalAgentConfig["provider"],
                      })
                    }
                  >
                    <option value="gemini">Gemini</option>
                    <option value="openai-compatible">
                      OpenAI-compatible
                    </option>
                  </select>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-slate-600">
                    区域
                  </span>
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={agentConfig.region}
                    onChange={(event) =>
                      updateAgentConfig({
                        region: event.target
                          .value as PersonalAgentConfig["region"],
                      })
                    }
                  >
                    <option value="global">国外</option>
                    <option value="china">国内</option>
                    <option value="proxy">中转站</option>
                  </select>
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-600">
                  Base URL
                </span>
                <input
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  disabled={agentConfig.provider === "gemini"}
                  placeholder="https://api.example.com/v1"
                  value={agentConfig.baseUrl}
                  onChange={(event) =>
                    updateAgentConfig({ baseUrl: event.target.value })
                  }
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-600">
                  模型
                </span>
                <input
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder={
                    agentConfig.provider === "gemini"
                      ? "gemini-2.5-flash"
                      : "gpt-4o-mini"
                  }
                  value={agentConfig.model}
                  onChange={(event) =>
                    updateAgentConfig({ model: event.target.value })
                  }
                />
              </label>

              <p className="text-xs leading-5 text-slate-500">
                API Key 只保存在本机浏览器 localStorage，并随聊天请求发送到本服务端调用。
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
