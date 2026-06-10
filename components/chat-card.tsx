import type { FormEvent, KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage, UiCopy } from "../lib/types";

export function ChatCard({
  chatInput,
  copy,
  isChatLoading,
  messages,
  onInputChange,
  onSubmit,
}: {
  chatInput: string;
  copy: UiCopy;
  isChatLoading: boolean;
  messages: ChatMessage[];
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [isOpen, messages.length, isChatLoading]);

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || isChatLoading) {
      return;
    }

    if (!chatInput.trim()) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-end gap-3 px-3 pb-3 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-[calc(100vw-2rem)] sm:px-0 sm:pb-0">
      {isOpen ? (
        <section className="flex h-[52vh] min-h-[360px] max-h-[calc(100vh-5rem)] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 sm:h-[56vh] sm:min-h-[440px] sm:w-[440px] sm:rounded-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-950">
                {copy.askTitle}
              </h2>
              <p className="mt-0.5 truncate text-sm text-slate-500">
                {copy.askSubtitle}
              </p>
            </div>
            <button
              aria-label="Close AI chat"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-lg leading-none text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              ×
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto scroll-smooth p-4">
            {messages.length > 0 ? (
              messages.map((message, index) => (
                <div
                  className={`rounded-xl border p-3 text-sm leading-6 ${
                    message.role === "user"
                      ? "ml-auto border-blue-100 bg-blue-50 text-blue-950"
                      : "mr-auto border-slate-200 bg-slate-50 text-slate-900"
                  } max-w-[92%] whitespace-pre-wrap`}
                  key={`${message.role}-${index}`}
                >
                  {message.content}
                  {message.role === "assistant" &&
                  message.toolEvents?.length ? (
                    <p className="mt-2 border-t border-slate-200 pt-2 text-xs font-medium text-slate-500">
                      Used:{" "}
                      {message.toolEvents
                        .map((toolEvent) =>
                          toolEvent.status === "failed"
                            ? `${toolEvent.label} failed`
                            : toolEvent.label,
                        )
                        .join(", ")}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                {copy.askEmpty}
              </div>
            )}

            {isChatLoading ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                {copy.answering}
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <form
            className="border-t border-slate-200 bg-white p-3"
            onSubmit={onSubmit}
          >
            <div className="flex items-end gap-2">
              <textarea
                className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                disabled={isChatLoading}
                placeholder={copy.askPlaceholder}
                ref={inputRef}
                rows={1}
                value={chatInput}
                onChange={(event) => onInputChange(event.target.value)}
                onKeyDown={handleInputKeyDown}
              />
              <button
                aria-label={copy.askButton}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={isChatLoading || !chatInput.trim()}
                type="submit"
              >
                ↑
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <button
        aria-label={isOpen ? "Close AI chat" : copy.askButton}
        className="flex h-14 min-w-14 items-center justify-center rounded-full bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        {isOpen ? "×" : copy.askButton}
      </button>
    </div>
  );
}
