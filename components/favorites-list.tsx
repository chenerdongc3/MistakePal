import type { SentenceAnalysis, UiCopy } from "../lib/types";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

export function FavoritesList({
  copy,
  deletingFavoriteId,
  favorites,
  onDeleteFavorite,
  onSelectFavorite,
}: {
  copy: UiCopy;
  deletingFavoriteId: string;
  favorites: SentenceAnalysis[];
  onDeleteFavorite: (id: string) => void;
  onSelectFavorite: (favorite: SentenceAnalysis) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-1 space-y-0 sm:flex-row sm:items-end sm:justify-between">
        <CardTitle>{copy.favorites}</CardTitle>
        <CardDescription>Showing latest 5 for now.</CardDescription>
      </CardHeader>
      {favorites.length > 0 ? (
        <CardContent className="space-y-3">
          {favorites.map((favorite) => (
            <article
              className="rounded-md border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50/40"
              key={favorite.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => onSelectFavorite(favorite)}
                  type="button"
                >
                  <p className="text-sm font-medium text-slate-950">
                    {favorite.originalSentence}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {favorite.translatedSentence ?? favorite.originalTranslation}
                  </p>
                  <p className="mt-2 text-xs font-medium text-blue-700">
                    Open saved analysis
                  </p>
                </button>
                <div className="flex flex-wrap gap-2 text-xs text-slate-500 sm:justify-end">
                  <span>{favorite.sourceLanguage}</span>
                  <span>{favorite.explanationLanguage}</span>
                  <span>{formatDate(favorite.createdAt)}</span>
                  <Button
                    className="h-auto p-0 text-red-600 hover:bg-transparent hover:text-red-700 disabled:text-slate-400"
                    disabled={deletingFavoriteId === favorite.id}
                    onClick={() => onDeleteFavorite(favorite.id)}
                    type="button"
                    variant="ghost"
                  >
                    {deletingFavoriteId === favorite.id ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </CardContent>
      ) : (
        <CardContent>
          <p className="text-sm text-slate-500">{copy.favoritesEmpty}</p>
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
