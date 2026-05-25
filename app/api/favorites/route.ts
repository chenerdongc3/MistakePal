import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json([
    {
      id: "mock-favorite-1",
      imageUrl: "/mock-uploads/favorite-1.png",
      sourceLanguage: "German",
      explanationLanguage: "Chinese",
      originalSentence: "Welche Farbe hat Ihr Koffer?",
      originalTranslation: "What color is your suitcase?",
      translatedSentence: "您的行李箱是什么颜色？",
      sentenceBreakdown: [
        {
          part: "Welche Farbe",
          explanation: "what color",
        },
        {
          part: "hat",
          explanation: "has / does ... have",
        },
      ],
      vocabulary: [
        {
          word: "Koffer",
          meaning: "suitcase",
          note: "masculine noun",
        },
      ],
      grammarPoints: [
        {
          title: 'German often uses "Welche Farbe hat..."',
          explanation: 'This structure asks "What color is..." in English.',
        },
      ],
      similarExamples: [
        {
          sentence: "Welche Farbe hat Ihr Auto?",
          translation: "What color is your car?",
        },
      ],
      learnerTip:
        'In German, questions about color often use the structure "Welche Farbe hat...?"',
      isFavorite: true,
      createdAt: new Date().toISOString(),
    },
  ]);
}
