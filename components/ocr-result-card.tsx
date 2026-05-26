import type { SentenceAnalysis, UiCopy } from "../lib/types";
import { InfoBlock } from "./info-block";

export function OcrResultCard({
  analysis,
  copy,
  isSavingFavorite,
  onSaveFavorite,
}: {
  analysis: SentenceAnalysis;
  copy: UiCopy;
  isSavingFavorite: boolean;
  onSaveFavorite: () => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{copy.ocrResult}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {copy.ocrSubtitle(analysis.sourceLanguage)}
          </p>
        </div>
        <button
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
          disabled={analysis.isFavorite || isSavingFavorite}
          onClick={onSaveFavorite}
          type="button"
        >
          {analysis.isFavorite
            ? copy.saved
            : isSavingFavorite
              ? copy.saving
              : copy.save}
        </button>
      </div>

      <div className="mt-5 grid gap-4">
        <InfoBlock label={copy.originalSentence} value={analysis.originalSentence} />
        <InfoBlock
          label={copy.originalTranslation}
          value={analysis.originalTranslation}
        />
      </div>
    </section>
  );
}
