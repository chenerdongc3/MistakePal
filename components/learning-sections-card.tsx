import type { SectionKey, SectionState, SentenceAnalysis, UiCopy } from "../lib/types";
import { getSectionCopy, learningSections } from "../lib/ui-copy";
import { InfoBlock } from "./info-block";
import { ListBlock } from "./list-block";

export function LearningSectionsCard({
  analysis,
  copy,
  sectionStates,
  onAnalyzeSection,
}: {
  analysis: SentenceAnalysis;
  copy: UiCopy;
  sectionStates: Partial<Record<SectionKey, SectionState>>;
  onAnalyzeSection: (section: SectionKey) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">{copy.learnOnDemand}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {copy.learnOnDemandSubtitle}
        </p>
      </div>

      <div className="mt-5 grid gap-3">
        {learningSections.map((section) => (
          <OnDemandSection
            analysis={analysis}
            copy={copy}
            key={section.key}
            section={section}
            state={sectionStates[section.key]}
            onAnalyzeSection={onAnalyzeSection}
          />
        ))}
      </div>
    </section>
  );
}

function OnDemandSection({
  analysis,
  copy,
  section,
  state,
  onAnalyzeSection,
}: {
  analysis: SentenceAnalysis;
  copy: UiCopy;
  section: {
    key: SectionKey;
  };
  state?: SectionState;
  onAnalyzeSection: (section: SectionKey) => void;
}) {
  const content = getSectionContent(analysis, section.key);
  const hasContent = content !== null;
  const sectionCopy = getSectionCopy(section.key, copy);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            {sectionCopy.title}
          </p>
          <p className="mt-1 text-sm text-slate-500">{sectionCopy.description}</p>
        </div>
        <button
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={state?.isLoading}
          onClick={() => onAnalyzeSection(section.key)}
          type="button"
        >
          {state?.isLoading
            ? copy.analyzingSection
            : hasContent
              ? copy.refreshSection
              : copy.analyzeSection}
        </button>
      </div>

      {state?.error ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      {hasContent ? <div className="mt-4">{content}</div> : null}
    </div>
  );
}

function getSectionContent(analysis: SentenceAnalysis, section: SectionKey) {
  if (section === "translation" && analysis.translatedSentence) {
    return <InfoBlock label="Translation" value={analysis.translatedSentence} />;
  }

  if (section === "breakdown" && analysis.sentenceBreakdown?.length) {
    return (
      <ListBlock
        items={analysis.sentenceBreakdown}
        renderItem={(item) => (
          <>
            <span className="font-medium text-slate-950">{item.part}</span>
            <span className="text-slate-600"> = {item.explanation}</span>
          </>
        )}
      />
    );
  }

  if (section === "vocabulary" && analysis.vocabulary?.length) {
    return (
      <ListBlock
        items={analysis.vocabulary}
        renderItem={(item) => (
          <>
            <span className="font-medium text-slate-950">{item.word}</span>
            <span className="text-slate-600">: {item.meaning}</span>
            {item.note ? (
              <span className="text-slate-500"> ({item.note})</span>
            ) : null}
          </>
        )}
      />
    );
  }

  if (section === "grammar" && analysis.grammarPoints?.length) {
    return (
      <ListBlock
        items={analysis.grammarPoints}
        renderItem={(item) => (
          <>
            <span className="font-medium text-slate-950">{item.title}</span>
            <span className="text-slate-600">: {item.explanation}</span>
          </>
        )}
      />
    );
  }

  if (section === "examples" && analysis.similarExamples?.length) {
    return (
      <ListBlock
        items={analysis.similarExamples}
        renderItem={(item) => (
          <>
            <span className="font-medium text-slate-950">{item.sentence}</span>
            <span className="text-slate-600"> = {item.translation}</span>
          </>
        )}
      />
    );
  }

  if (section === "tip" && analysis.learnerTip) {
    return <InfoBlock label="Learner tip" value={analysis.learnerTip} />;
  }

  return null;
}
