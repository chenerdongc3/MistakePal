import { useState } from "react";
import type { SentenceAnalysis, UiCopy } from "../lib/types";
import { InfoBlock } from "./info-block";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Textarea } from "./ui/textarea";

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
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>{copy.ocrResult}</CardTitle>
          <CardDescription>
            {copy.ocrSubtitle(analysis.sourceLanguage)}
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={isEditing ? saveEdit : startEditing}
            type="button"
            variant="outline"
          >
            {isEditing ? copy.saveEdit : copy.editOcr}
          </Button>
          {isEditing ? (
            <Button
              onClick={() => setIsEditing(false)}
              type="button"
              variant="outline"
            >
              {copy.cancelEdit}
            </Button>
          ) : null}
          <Button
            disabled={analysis.isFavorite || isSavingFavorite}
            onClick={onSaveFavorite}
            type="button"
            variant="outline"
          >
            {analysis.isFavorite
              ? copy.saved
              : isSavingFavorite
                ? copy.saving
                : copy.save}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4">
        {isEditing ? (
          <>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">
                {copy.originalSentence}
              </span>
              <Textarea
                value={originalSentence}
                onChange={(event) => setOriginalSentence(event.target.value)}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">
                {copy.originalTranslation}
              </span>
              <Textarea
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
      </CardContent>
    </Card>
  );
}
