import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

export function BatchReviewActions({
  currentIndex,
  isSavingFavorite,
  totalCount,
  onFavoriteNext,
  onMarkMastered,
}: {
  currentIndex: number;
  isSavingFavorite: boolean;
  totalCount: number;
  onFavoriteNext: () => void;
  onMarkMastered: () => void;
}) {
  const isLast = currentIndex >= totalCount - 1;

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="pt-5 sm:pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-blue-950">
            Finish this screenshot
          </h2>
          <p className="mt-1 text-sm leading-6 text-blue-800">
            Mark it mastered or save it as a favorite, then continue to the next
            screenshot.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:min-w-48">
          <Button
            className="border-blue-200 text-blue-800 hover:bg-blue-100"
            disabled={isSavingFavorite}
            onClick={onMarkMastered}
            type="button"
            variant="outline"
          >
            {isLast ? "已掌握并完成" : "已掌握，下一张"}
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
            disabled={isSavingFavorite}
            onClick={onFavoriteNext}
            type="button"
          >
            {isSavingFavorite
              ? "收藏中..."
              : isLast
                ? "收藏并完成"
                : "收藏并下一张"}
          </Button>
        </div>
      </div>
      </CardContent>
    </Card>
  );
}
