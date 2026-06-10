import { useState } from "react";
import type { SentenceAnalysis, UiCopy } from "../lib/types";
import { InfoBlock } from "./info-block";
import { ListBlock } from "./list-block";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

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
  const [selectedFavoriteId, setSelectedFavoriteId] = useState("");
  const selectedFavorite =
    favorites.find((favorite) => favorite.id === selectedFavoriteId) ?? null;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-2 space-y-0 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>{copy.favorites}</CardTitle>
            <CardDescription>
              保存过的句子会集中在这里，点击卡片查看学习内容。
            </CardDescription>
          </div>
          <Badge>{favorites.length} saved</Badge>
        </CardHeader>
        {favorites.length > 0 ? (
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {favorites.map((favorite) => (
              <FavoriteCard
                deletingFavoriteId={deletingFavoriteId}
                favorite={favorite}
                key={favorite.id}
                onDeleteFavorite={onDeleteFavorite}
                onOpen={() => setSelectedFavoriteId(favorite.id)}
              />
            ))}
          </CardContent>
        ) : (
          <CardContent>
            <p className="text-sm text-slate-500">{copy.favoritesEmpty}</p>
          </CardContent>
        )}
      </Card>

      {selectedFavorite ? (
        <FavoriteDrawer
          deletingFavoriteId={deletingFavoriteId}
          favorite={selectedFavorite}
          onClose={() => setSelectedFavoriteId("")}
          onDeleteFavorite={onDeleteFavorite}
          onOpenInLearn={() => onSelectFavorite(selectedFavorite)}
        />
      ) : null}
    </>
  );
}

function FavoriteCard({
  deletingFavoriteId,
  favorite,
  onDeleteFavorite,
  onOpen,
}: {
  deletingFavoriteId: string;
  favorite: SentenceAnalysis;
  onDeleteFavorite: (id: string) => void;
  onOpen: () => void;
}) {
  return (
    <article className="flex min-h-52 flex-col overflow-hidden rounded-md border border-slate-200 bg-slate-50 transition hover:border-blue-200 hover:bg-blue-50/40">
      <button
        className="flex min-h-0 flex-1 flex-col justify-between p-4 text-left"
        onClick={onOpen}
        type="button"
      >
        <span>
          <span className="line-clamp-3 text-sm font-semibold leading-6 text-slate-950">
            {favorite.originalSentence}
          </span>
          <span className="mt-2 line-clamp-2 block text-sm leading-6 text-slate-600">
            {favorite.translatedSentence ?? favorite.originalTranslation}
          </span>
        </span>
        <span className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <Badge variant="secondary">{favorite.sourceLanguage}</Badge>
          <span>{favorite.explanationLanguage}</span>
          <span>{formatDate(favorite.createdAt)}</span>
        </span>
      </button>
      <div className="flex justify-end border-t border-slate-200 bg-white/70 px-3 py-2">
        <Button
          className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:text-slate-400"
          disabled={deletingFavoriteId === favorite.id}
          onClick={() => onDeleteFavorite(favorite.id)}
          type="button"
          variant="ghost"
        >
          {deletingFavoriteId === favorite.id ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </article>
  );
}

function FavoriteDrawer({
  deletingFavoriteId,
  favorite,
  onClose,
  onDeleteFavorite,
  onOpenInLearn,
}: {
  deletingFavoriteId: string;
  favorite: SentenceAnalysis;
  onClose: () => void;
  onDeleteFavorite: (id: string) => void;
  onOpenInLearn: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Close favorite details"
        className="absolute inset-0 bg-slate-950/30"
        onClick={onClose}
        type="button"
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl">
        <header className="border-b border-slate-200 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Favorite
              </p>
              <h2 className="mt-2 text-lg font-semibold leading-7 text-slate-950">
                {favorite.originalSentence}
              </h2>
            </div>
            <Button onClick={onClose} type="button" variant="outline">
              Close
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
            <Badge variant="secondary">{favorite.sourceLanguage}</Badge>
            <span>{favorite.explanationLanguage}</span>
            <span>{formatDate(favorite.createdAt)}</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-4">
            {favorite.imageUrl ? (
              <img
                alt="Saved screenshot"
                className="max-h-80 w-full rounded-md border border-slate-200 object-contain"
                src={favorite.imageUrl}
              />
            ) : null}

            <InfoBlock
              label="Original translation"
              value={favorite.originalTranslation}
            />

            {favorite.translatedSentence ? (
              <InfoBlock label="Translation" value={favorite.translatedSentence} />
            ) : null}

            {favorite.sentenceBreakdown?.length ? (
              <DrawerSection title="句子拆解">
                <ListBlock
                  items={favorite.sentenceBreakdown}
                  renderItem={(item) => (
                    <>
                      <span className="font-medium text-slate-950">
                        {item.part}
                      </span>
                      <span className="text-slate-600"> = {item.explanation}</span>
                    </>
                  )}
                />
              </DrawerSection>
            ) : null}

            {favorite.vocabulary?.length ? (
              <DrawerSection title="重点单词">
                <ListBlock
                  items={favorite.vocabulary}
                  renderItem={(item) => (
                    <>
                      <span className="font-medium text-slate-950">
                        {item.word}
                      </span>
                      <span className="text-slate-600">: {item.meaning}</span>
                      {item.note ? (
                        <span className="text-slate-500"> ({item.note})</span>
                      ) : null}
                    </>
                  )}
                />
              </DrawerSection>
            ) : null}

            {favorite.grammarPoints?.length ? (
              <DrawerSection title="语法点">
                <ListBlock
                  items={favorite.grammarPoints}
                  renderItem={(item) => (
                    <>
                      <span className="font-medium text-slate-950">
                        {item.title}
                      </span>
                      <span className="text-slate-600">: {item.explanation}</span>
                    </>
                  )}
                />
              </DrawerSection>
            ) : null}

            {favorite.similarExamples?.length ? (
              <DrawerSection title="相似例句">
                <ListBlock
                  items={favorite.similarExamples}
                  renderItem={(item) => (
                    <>
                      <span className="font-medium text-slate-950">
                        {item.sentence}
                      </span>
                      <span className="text-slate-600"> = {item.translation}</span>
                    </>
                  )}
                />
              </DrawerSection>
            ) : null}

            {favorite.learnerTip ? (
              <InfoBlock label="复习建议" value={favorite.learnerTip} />
            ) : null}
          </div>
        </div>

        <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 p-4">
          <Button
            disabled={deletingFavoriteId === favorite.id}
            onClick={() => onDeleteFavorite(favorite.id)}
            type="button"
            variant="outline"
          >
            {deletingFavoriteId === favorite.id ? "Deleting..." : "Delete"}
          </Button>
          <Button onClick={onOpenInLearn} type="button">
            去学习页继续
          </Button>
        </footer>
      </aside>
    </div>
  );
}

function DrawerSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <div className="mt-3">{children}</div>
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
