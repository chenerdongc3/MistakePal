import type { SentenceAnalysis, UiCopy } from "../lib/types";

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
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-lg font-semibold">{copy.favorites}</h2>
        <p className="text-xs text-slate-500">Showing latest 5 for now.</p>
      </div>
      {favorites.length > 0 ? (
        <div className="mt-4 space-y-3">
          {favorites.map((favorite) => (
            <article
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50/40"
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
                  <button
                    className="font-medium text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:text-slate-400"
                    disabled={deletingFavoriteId === favorite.id}
                    onClick={() => onDeleteFavorite(favorite.id)}
                    type="button"
                  >
                    {deletingFavoriteId === favorite.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">{copy.favoritesEmpty}</p>
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
