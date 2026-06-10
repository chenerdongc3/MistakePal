# MistakePal API 成本调研与订阅方案

调研日期：2026-06-10

## 结论

建议先采用“免费 BYOK + 平台额度订阅 + 加量包”的组合：

- 免费用户可以配置个人 API Key 使用个人 agent；平台只赠送少量额度。
- 订阅用户购买 MistakePal 平台额度，覆盖不想配置 API Key 的用户。
- 国内/中转站用户优先支持 OpenAI-compatible base URL。
- 平台默认模型继续使用 Gemini 2.5 Flash；后续可把简单文本分析切到 Gemini 2.5 Flash-Lite 或 DeepSeek 来提高毛利。

推荐上线价格：

| 方案 | 月费 | 平台 AI credits | 适合用户 | 备注 |
| --- | ---: | ---: | --- | --- |
| Free / BYOK | ¥0 | 每月 20 | 有个人 API 或轻度试用 | 个人 API Key 自付；平台额度只用于体验 |
| Starter | ¥9.9 / 月 | 每月 200 | 偶尔整理错题 | 低门槛付费转化 |
| Plus | ¥19.9 / 月 | 每月 600 | 每周高频学习 | 主推档位 |
| Pro | ¥39.9 / 月 | 每月 1,500 | 每日学习 / 重度问答 | 可叠加优先队列 |

加量包：

| 加量包 | 价格 | AI credits | 单价 |
| --- | ---: | ---: | ---: |
| 小包 | ¥6 | 100 | ¥0.060 / credit |
| 标准包 | ¥18 | 400 | ¥0.045 / credit |
| 大包 | ¥45 | 1,200 | ¥0.0375 / credit |

建议规则：

- 订阅额度每月重置，不滚存。
- 加量包额度 12 个月有效，优先消耗即将过期的额度。
- 订阅用户可以继续配置个人 API Key；使用个人 API 时不消耗平台 chat credits。
- OCR 和按需学习分析如果仍走平台模型，应继续消耗平台 credits。

## 官方价格摘要

以下均为官方页面展示的 USD / 1M tokens 价格。价格会变动，上线前需要定期重新确认。

| Provider / Model | Input | Output | 适合 MistakePal 的用途 | 来源 |
| --- | ---: | ---: | --- | --- |
| Google Gemini 2.5 Flash | $0.30 | $2.50 | 默认 OCR、截图理解、学习分析、chat | https://ai.google.dev/gemini-api/docs/pricing |
| Google Gemini 2.5 Flash-Lite | $0.10 | $0.40 | 简单翻译、轻量 chat、低价批量分析 | https://ai.google.dev/gemini-api/docs/pricing |
| DeepSeek v4 Flash | $0.14 cache miss / $0.0028 cache hit | $0.28 | 国内低成本 chat、OpenAI-compatible 中转 | https://api-docs.deepseek.com/quick_start/pricing |
| DeepSeek v4 Pro | $0.435 cache miss / $0.003625 cache hit | $0.87 | 国内高质量问答 | https://api-docs.deepseek.com/quick_start/pricing |
| OpenAI GPT-5.4 mini | $0.75 | $4.50 | 国外用户高级 chat / 质量兜底 | https://openai.com/api/pricing/ |
| Anthropic Claude Haiku 4.5 | $1.00 | $5.00 | 高质量英文解释 / 备选 | https://platform.claude.com/docs/en/about-claude/pricing |
| Anthropic Claude Sonnet 4.6 | $3.00 | $15.00 | 高质量但成本较高，不建议默认使用 | https://platform.claude.com/docs/en/about-claude/pricing |

## 成本估算

内部测算假设：

- 汇率按 `1 USD ~= ¥7.2` 做产品定价估算；财务结算时应按实际账单汇率更新。
- 当前平台默认模型按 Gemini 2.5 Flash 估算。
- 一次截图学习通常包含：
  - OCR / 截图理解 1 次。
  - 用户按需打开 2-5 个学习模块。
  - 可能追问 1-3 轮 chat。
- 由于截图 token 会随图片尺寸变化，以下是保守产品估算，不是精确账单。

### 单次动作成本

| 动作 | Token 假设 | Gemini 2.5 Flash 成本 | 折人民币估算 |
| --- | --- | ---: | ---: |
| 截图 OCR | 1,500 input + 350 output | ~$0.00133 | ~¥0.010 |
| 单个学习模块分析 | 900 input + 450 output | ~$0.00140 | ~¥0.010 |
| 普通 chat 一轮 | 1,200 input + 500 output | ~$0.00161 | ~¥0.012 |
| 带工具调用的 chat 一轮 | 约普通 chat 的 2-3 倍 | ~$0.003-0.005 | ~¥0.02-0.04 |

建议将 `1 AI credit` 定义为“一次平台 AI 调用”，包括：

- 1 次截图 OCR。
- 1 次学习模块分析。
- 1 轮平台 chat。

内部成本预算：

- 平均模型成本：约 ¥0.01-0.03 / credit。
- 含失败重试、支付通道、日志、存储、税费和优惠损耗后，按 ¥0.025-0.04 / credit 做风控预算。

### 用户月度成本场景

| 用户类型 | 月行为 | credits | 估算模型成本 | 适合方案 |
| --- | --- | ---: | ---: | --- |
| 轻度 | 10 张截图，每张 5 次 AI 动作 | 50 | ¥0.5-2 | Free / Starter |
| 普通 | 40 张截图，每张 8 次 AI 动作 | 320 | ¥3-13 | Plus |
| 高频 | 100 张截图，每张 10 次 AI 动作 | 1,000 | ¥10-40 | Pro |
| 重度 | 200 张截图，每张 12 次 AI 动作 | 2,400 | ¥24-96 | Pro + 加量包 |

Plus 档位应作为主推：

- `¥19.9 / 月`、`600 credits`。
- 覆盖约 60-100 张截图学习。
- 对轻中度用户有足够体感价值。
- 即使按偏高成本 ¥0.03 / credit，满额模型成本约 ¥18，仍接近盈亏平衡；实际用户通常不会 100% 用满，且可通过 Flash-Lite / DeepSeek 降低文本分析成本。

## 产品计费建议

### 额度扣减

推荐统一展示为 `AI credits`，不要直接展示 token。

扣减规则：

| 行为 | 扣减 |
| --- | ---: |
| 截图 OCR | 1 credit |
| 分析一个学习模块 | 1 credit |
| chat 一轮 | 1 credit |
| chat 触发工具调用 | 仍按 1 credit，先不要复杂化 |
| 失败请求 | 不扣或自动退回 |
| 个人 API chat | 不扣平台 credit |

后续如果成本压力变大，再引入高级模型倍率：

- 标准模型：1x。
- 高质量模型：2x。
- 长上下文 / 图片高分辨率：2x-5x。

### 免费和 BYOK

Free / BYOK 的定位不是完全免费平台服务，而是降低进入门槛：

- 允许用户配置个人 API Key。
- 平台每月赠送 20 credits，用于体验 OCR 和平台 chat。
- 超出后提示三种路径：
  - 购买 Starter / Plus / Pro。
  - 购买加量包。
  - 配置个人 API Key。

当前代码状态需要注意：

- 个人 API 配置已接入 chat agent。
- 截图 OCR 和按需学习模块仍走平台 Gemini。
- 如果要让 BYOK 完整覆盖所有 AI 调用，需要继续扩展 `analyze-screenshot` 和 `analyze-section` 的 provider 选择。

### 购买入口文案

建议在聊天配置面板中使用：

> 使用平台额度  
> 不想配置自己的 API 时，可以购买 MistakePal 额度继续使用。

按钮：

> 购买额度

额度不足时：

> 平台额度不足。你可以购买 MistakePal 额度，或切换到个人 API Key。

### 风控

上线前建议加以下保护：

- 每用户每日平台 credits 上限。
- 单请求最大图片尺寸和最大输入 tokens。
- 同一用户并发限制。
- 失败请求自动退回，但同一请求最多重试 1 次。
- 记录每次调用的 provider、model、estimated input tokens、estimated output tokens、actual billing metadata（如果 provider 返回）。
- 对中转站 base URL 做 allowlist 或风险提示；避免用户误填恶意 URL 导致 key 泄漏。

## 推荐实施顺序

1. 先上线 `NEXT_PUBLIC_BILLING_URL` 对应的购买入口，跳到人工收款页或 checkout。
2. 增加 `user_ai_credits` 表，记录订阅额度、加量包额度、过期时间。
3. 在 `/api/chat`、`/api/analyze-screenshot`、`/api/analyze-section` 前置扣减额度。
4. 增加失败退回逻辑。
5. 扩展个人 API 到 OCR 和学习模块，做到真正 BYOK。
6. 将文本类学习模块从 Gemini 2.5 Flash 逐步切到 Flash-Lite / DeepSeek，保留 Gemini Flash 做截图 OCR 和质量兜底。

## 最终建议

第一版不要做复杂 token 计费。MistakePal 用户是语言学习用户，不是 API 开发者，应该看到的是“本月还能学多少次”。

建议第一版只展示：

- 当前套餐。
- 剩余 AI credits。
- 购买额度。
- 配置个人 API。

内部再用 provider token 成本做月度核算和动态调整。
