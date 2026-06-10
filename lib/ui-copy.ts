import type { SectionKey, UiCopy } from "./types";

export const explanationLanguages = [
  "Chinese",
  "English",
  "Japanese",
  "Korean",
  "Spanish",
  "French",
];

export const learningSections: { key: SectionKey }[] = [
  { key: "breakdown" },
  { key: "vocabulary" },
  { key: "grammar" },
  { key: "examples" },
  { key: "tip" },
];

export function getSectionCopy(section: SectionKey, copy: UiCopy) {
  const labels: Record<
    string,
    Record<SectionKey, { title: string; description: string }>
  > = {
    Chinese: {
      breakdown: {
        title: "句子拆解",
        description: "把句子拆成更容易理解的小块。",
      },
      vocabulary: {
        title: "重点词汇",
        description: "学习这个句子里最值得记住的词。",
      },
      grammar: {
        title: "语法点",
        description: "解释这个句子里值得注意的语法结构。",
      },
      examples: {
        title: "相似例句",
        description: "生成相似句子，帮助你迁移练习。",
      },
      tip: {
        title: "学习提示",
        description: "获得一个简短的复习建议。",
      },
      translation: {
        title: "翻译",
        description: "翻译成你的解释语言。",
      },
    },
    English: {
      breakdown: {
        title: "Sentence breakdown",
        description: "Break the sentence into understandable chunks.",
      },
      vocabulary: {
        title: "Key vocabulary",
        description: "Study the important words in this sentence.",
      },
      grammar: {
        title: "Grammar points",
        description: "Explain the grammar patterns worth noticing.",
      },
      examples: {
        title: "Similar examples",
        description: "Generate similar sentences for practice.",
      },
      tip: {
        title: "Learner tip",
        description: "Get one compact review tip for this sentence.",
      },
      translation: {
        title: "Translation",
        description: "Translate the sentence into your explanation language.",
      },
    },
    Japanese: {
      breakdown: {
        title: "文の分解",
        description: "文を理解しやすい単位に分けます。",
      },
      vocabulary: {
        title: "重要語彙",
        description: "この文で大事な単語を学びます。",
      },
      grammar: {
        title: "文法ポイント",
        description: "注目すべき文法を説明します。",
      },
      examples: {
        title: "似た例文",
        description: "練習用の似た文を作ります。",
      },
      tip: {
        title: "学習のヒント",
        description: "短い復習アドバイスを表示します。",
      },
      translation: {
        title: "翻訳",
        description: "選択した説明言語に翻訳します。",
      },
    },
    Korean: {
      breakdown: {
        title: "문장 분석",
        description: "문장을 이해하기 쉬운 단위로 나눕니다.",
      },
      vocabulary: {
        title: "핵심 어휘",
        description: "이 문장에서 중요한 단어를 학습합니다.",
      },
      grammar: {
        title: "문법 포인트",
        description: "주목할 만한 문법 구조를 설명합니다.",
      },
      examples: {
        title: "비슷한 예문",
        description: "연습용 비슷한 문장을 생성합니다.",
      },
      tip: {
        title: "학습 팁",
        description: "짧은 복습 팁을 제공합니다.",
      },
      translation: {
        title: "번역",
        description: "선택한 설명 언어로 번역합니다.",
      },
    },
    Spanish: {
      breakdown: {
        title: "Desglose de la oración",
        description: "Divide la oración en partes fáciles de entender.",
      },
      vocabulary: {
        title: "Vocabulario clave",
        description: "Estudia las palabras importantes de esta oración.",
      },
      grammar: {
        title: "Puntos gramaticales",
        description: "Explica las estructuras gramaticales relevantes.",
      },
      examples: {
        title: "Ejemplos similares",
        description: "Genera oraciones similares para practicar.",
      },
      tip: {
        title: "Consejo de estudio",
        description: "Muestra un consejo breve de repaso.",
      },
      translation: {
        title: "Traducción",
        description: "Traduce a tu idioma de explicación.",
      },
    },
    French: {
      breakdown: {
        title: "Découpage de la phrase",
        description: "Découpe la phrase en blocs faciles à comprendre.",
      },
      vocabulary: {
        title: "Vocabulaire clé",
        description: "Étudie les mots importants de cette phrase.",
      },
      grammar: {
        title: "Points de grammaire",
        description: "Explique les structures grammaticales importantes.",
      },
      examples: {
        title: "Exemples similaires",
        description: "Génère des phrases similaires pour t'entraîner.",
      },
      tip: {
        title: "Conseil d'apprentissage",
        description: "Affiche un court conseil de révision.",
      },
      translation: {
        title: "Traduction",
        description: "Traduis dans ta langue d'explication.",
      },
    },
  };

  return labels[copy.language]?.[section] ?? labels.English[section];
}

export function getUiCopy(language: string): UiCopy {
  const copies: Record<string, UiCopy> = {
    Chinese: {
      language: "Chinese",
      analyzing: "正在扫描截图...",
      analyzeButton: "分析截图",
      readingButton: "正在读取截图...",
      ocrDone: (seconds) => `OCR 已完成，用时 ${seconds} 秒。`,
      empty: "上传 Duolingo 截图，开始第一次句子识别。",
      ocrResult: "OCR 识别结果",
      ocrSubtitle: (detectedLanguage) => `已在截图中识别到 ${detectedLanguage} 句子`,
      originalSentence: "原句",
      originalTranslation: "截图中的英文翻译",
      learnOnDemand: "按需学习",
      learnOnDemandSubtitle: "只打开你现在想学习的部分。",
      analyzeSection: "分析",
      refreshSection: "重新分析",
      analyzingSection: "分析中...",
      askTitle: "围绕这个句子提问",
      askSubtitle: "趁印象还新，问一个追问。",
      askPlaceholder: "输入你关于这个句子的问题...",
      askButton: "问 AI",
      answering: "AI 正在调用学习工具...",
      askEmpty: "可以问某个词为什么变形、这个短语怎么用，或者要更多例句。",
      save: "收藏",
      saved: "已收藏",
      saving: "保存中...",
      favorites: "收藏",
      favoritesEmpty: "收藏的分析会显示在这里。",
    },
    English: {
      language: "English",
      analyzing: "Reading screenshot with OCR...",
      analyzeButton: "Analyze Screenshot",
      readingButton: "Reading screenshot...",
      ocrDone: (seconds) => `OCR completed in ${seconds}s.`,
      empty: "Upload a Duolingo screenshot to get your first OCR result.",
      ocrResult: "OCR result",
      ocrSubtitle: (detectedLanguage) =>
        `${detectedLanguage} sentence found in the screenshot`,
      originalSentence: "Original sentence",
      originalTranslation: "English translation from screenshot",
      learnOnDemand: "Learn on demand",
      learnOnDemandSubtitle: "Open only the parts you want to study right now.",
      analyzeSection: "Analyze",
      refreshSection: "Refresh",
      analyzingSection: "Analyzing...",
      askTitle: "Ask about this sentence",
      askSubtitle: "Ask a follow-up question while the sentence is fresh.",
      askPlaceholder: "Ask a question about this sentence...",
      askButton: "Ask AI",
      answering: "AI is using learning tools...",
      askEmpty:
        "Try asking why a word changes form, how to use the phrase, or for more examples.",
      save: "Save to Favorites",
      saved: "Saved to Favorites",
      saving: "Saving...",
      favorites: "Favorites",
      favoritesEmpty: "Saved analyses will appear here.",
    },
  };

  return copies[language] ?? copies.English;
}
