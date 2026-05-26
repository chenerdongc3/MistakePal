import type { FormEvent } from "react";
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
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">{copy.askTitle}</h2>
        <p className="mt-1 text-sm text-slate-500">{copy.askSubtitle}</p>
      </div>

      <div className="mt-4 space-y-3">
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
      </div>

      <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={onSubmit}>
        <input
          className="min-h-11 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          disabled={isChatLoading}
          placeholder={copy.askPlaceholder}
          value={chatInput}
          onChange={(event) => onInputChange(event.target.value)}
        />
        <button
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={isChatLoading || !chatInput.trim()}
          type="submit"
        >
          {copy.askButton}
        </button>
      </form>
    </section>
  );
}
