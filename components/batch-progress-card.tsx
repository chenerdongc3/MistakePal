import type { BatchUploadItem } from "../lib/types";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Progress } from "./ui/progress";

export function BatchProgressCard({
  activeItemId,
  queue,
}: {
  activeItemId: string;
  queue: BatchUploadItem[];
}) {
  if (queue.length === 0) {
    return null;
  }

  const completedCount = queue.filter((item) =>
    ["mastered", "favorited", "failed"].includes(item.status),
  ).length;
  const activeIndex = queue.findIndex((item) => item.id === activeItemId);
  const failedCount = queue.filter((item) => item.status === "failed").length;
  const isComplete = completedCount === queue.length;

  return (
    <Card>
      <CardContent className="pt-5 sm:pt-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Batch progress
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {isComplete
              ? "All selected screenshots are finished."
              : activeIndex >= 0
                ? `Reviewing ${activeIndex + 1} of ${queue.length}.`
                : `Ready to process ${queue.length} screenshots.`}
          </p>
        </div>
        <Badge>{completedCount}/{queue.length} done</Badge>
      </div>

      <div className="mt-4">
        <Progress value={Math.round((completedCount / queue.length) * 100)} />
      </div>

      {failedCount > 0 ? (
        <p className="mt-3 text-sm text-red-600">
          {failedCount} screenshot{failedCount > 1 ? "s" : ""} failed and can be
          skipped automatically.
        </p>
      ) : null}
      </CardContent>
    </Card>
  );
}
