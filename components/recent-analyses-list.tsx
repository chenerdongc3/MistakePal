import type { SentenceAnalysis } from "../lib/types";

export function RecentAnalysesList({
  analyses,
  onSelectAnalysis,
}: {
  analyses: SentenceAnalysis[];
  onSelectAnalysis: (analysis: SentenceAnalysis) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-lg font-semibold">Recent analyses</h2>
        <p className="text-xs text-slate-500">Latest 10 learning records.</p>
      </div>

      {analyses.length > 0 ? (
        <div className="mt-4 space-y-3">
          {analyses.map((analysis) => (
            <button
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
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
                    <span className="font-medium text-blue-700">Favorite</span>
                  ) : null}
                  <span>{formatDate(analysis.updatedAt ?? analysis.createdAt)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">
          OCR results you analyze will appear here automatically.
        </p>
      )}
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
