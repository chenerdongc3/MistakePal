import { useState } from "react";
import type { SentenceAnalysis, UiCopy } from "../lib/types";
import { InfoBlock } from "./info-block";

export function OcrResultCard({
  analysis,
  copy,
  isSavingFavorite,
  onUpdateOcr,
  onSaveFavorite,
}: {
  analysis: SentenceAnalysis;
  copy: UiCopy;
  isSavingFavorite: boolean;
  onUpdateOcr: (nextValues: {
    originalSentence: string;
    originalTranslation: string;
  }) => void;
  onSaveFavorite: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [originalSentence, setOriginalSentence] = useState(
    analysis.originalSentence,
  );
  const [originalTranslation, setOriginalTranslation] = useState(
    analysis.originalTranslation,
  );

  function startEditing() {
    setOriginalSentence(analysis.originalSentence);
    setOriginalTranslation(analysis.originalTranslation);
    setIsEditing(true);
  }

  function saveEdit() {
    onUpdateOcr({
      originalSentence: originalSentence.trim(),
      originalTranslation: originalTranslation.trim(),
    });
    setIsEditing(false);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{copy.ocrResult}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {copy.ocrSubtitle(analysis.sourceLanguage)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
            onClick={isEditing ? saveEdit : startEditing}
            type="button"
          >
            {isEditing ? copy.saveEdit : copy.editOcr}
          </button>
          {isEditing ? (
            <button
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              onClick={() => setIsEditing(false)}
              type="button"
            >
              {copy.cancelEdit}
            </button>
          ) : null}
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
      </div>

      <div className="mt-5 grid gap-4">
        {isEditing ? (
          <>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">
                {copy.originalSentence}
              </span>
              <textarea
                className="min-h-24 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={originalSentence}
                onChange={(event) => setOriginalSentence(event.target.value)}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">
                {copy.originalTranslation}
              </span>
              <textarea
                className="min-h-24 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={originalTranslation}
                onChange={(event) => setOriginalTranslation(event.target.value)}
              />
            </label>
          </>
        ) : (
          <>
            <InfoBlock
              label={copy.originalSentence}
              value={analysis.originalSentence}
            />
            <InfoBlock
              label={copy.originalTranslation}
              value={analysis.originalTranslation}
            />
          </>
        )}
      </div>
    </section>
  );
}
