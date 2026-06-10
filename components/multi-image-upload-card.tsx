import type { ChangeEvent } from "react";
import type { BatchUploadItem } from "../lib/types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Select } from "./ui/select";

export function MultiImageUploadCard({
  explanationLanguage,
  isAnalyzing,
  languages,
  maxFiles,
  queue,
  onFilesSelected,
  onLanguageChange,
  onRemoveItem,
  onStart,
}: {
  explanationLanguage: string;
  isAnalyzing: boolean;
  languages: string[];
  maxFiles: number;
  queue: BatchUploadItem[];
  onFilesSelected: (files: File[]) => void;
  onLanguageChange: (value: string) => void;
  onRemoveItem: (id: string) => void;
  onStart: () => void;
}) {
  const pendingCount = queue.filter((item) => item.status === "pending").length;
  const canStart = pendingCount > 0;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    onFilesSelected(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  return (
    <Card>
      <CardContent className="space-y-5 pt-5 sm:pt-6">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">
            Explanation language
          </span>
          <Select
            value={explanationLanguage}
            onChange={(event) => onLanguageChange(event.target.value)}
          >
            {languages.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </Select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">
            Duolingo screenshots
          </span>
          <Input
            accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
            className="border-dashed bg-slate-50 py-3"
            multiple
            type="file"
            onChange={handleFileChange}
          />
          <span className="block text-xs leading-5 text-slate-500">
            Select up to {maxFiles} images from your computer or phone album.
            PNG, JPG, JPEG, or WEBP. Maximum 8MB per image.
          </span>
        </label>

        <div className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 sm:grid-cols-3">
          <span>1. Select screenshots</span>
          <span>2. Review one by one</span>
          <span>3. Mark mastered or favorite</span>
        </div>

        {queue.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {queue.map((item, index) => (
              <div
                className="flex gap-3 rounded-md border border-slate-200 bg-slate-50 p-3"
                key={item.id}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={`Selected screenshot ${index + 1}`}
                  className="h-20 w-16 shrink-0 rounded-md border border-slate-200 object-cover"
                  src={item.previewUrl}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {item.file.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatFileSize(item.file.size)}
                  </p>
                  <Badge className="mt-2 bg-white" variant="secondary">
                    {getStatusLabel(item.status)}
                  </Badge>
                  {item.error ? (
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-red-600">
                      {item.error}
                    </p>
                  ) : null}
                </div>
                {item.status === "pending" || item.status === "failed" ? (
                  <Button
                    aria-label={`Remove ${item.file.name}`}
                    className="shrink-0 rounded-full"
                    disabled={isAnalyzing}
                    onClick={() => onRemoveItem(item.id)}
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    x
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 sm:w-auto"
          disabled={isAnalyzing || !canStart}
          onClick={onStart}
          type="button"
        >
          {isAnalyzing
            ? "Reading screenshots..."
            : pendingCount > 1
              ? `Analyze ${pendingCount} screenshots`
              : "Analyze screenshot"}
        </Button>
      </CardContent>
    </Card>
  );
}

function getStatusLabel(status: BatchUploadItem["status"]) {
  const labels: Record<BatchUploadItem["status"], string> = {
    failed: "Failed",
    favorited: "Favorited",
    mastered: "Mastered",
    pending: "Pending",
    processing: "Reading",
    ready: "Ready",
  };

  return labels[status];
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
