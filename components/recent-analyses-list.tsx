import type { SentenceAnalysis } from "../lib/types";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

export function RecentAnalysesList({
  analyses,
  onSelectAnalysis,
}: {
  analyses: SentenceAnalysis[];
  onSelectAnalysis: (analysis: SentenceAnalysis) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-1 space-y-0 sm:flex-row sm:items-end sm:justify-between">
        <CardTitle>Recent analyses</CardTitle>
        <CardDescription>Latest 10 learning records.</CardDescription>
      </CardHeader>

      {analyses.length > 0 ? (
        <CardContent className="space-y-3">
          {analyses.map((analysis) => (
            <button
              className="w-full rounded-md border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
              key={analysis.id}
              onClick={() => onSelectAnalysis(analysis)}
              type="button"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-950">
                    {analysis.originalSentence}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {analysis.translatedSentence ?? analysis.originalTranslation}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 text-xs text-slate-500 sm:justify-end">
                  <span>{analysis.sourceLanguage}</span>
                  <span>{analysis.explanationLanguage}</span>
                  {analysis.isFavorite ? (
                    <Badge>Favorite</Badge>
                  ) : null}
                  <span>{formatDate(analysis.updatedAt ?? analysis.createdAt)}</span>
                </div>
              </div>
            </button>
          ))}
        </CardContent>
      ) : (
        <CardContent>
        <p className="text-sm text-slate-500">
          OCR results you analyze will appear here automatically.
        </p>
        </CardContent>
      )}
    </Card>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
