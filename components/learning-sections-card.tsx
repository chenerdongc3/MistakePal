import type { SectionKey, SectionState, SentenceAnalysis, UiCopy } from "../lib/types";
import { getSectionCopy, learningSections } from "../lib/ui-copy";
import { InfoBlock } from "./info-block";
import { ListBlock } from "./list-block";
import { Alert } from "./ui/alert";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

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
    <Card>
      <CardHeader>
        <CardTitle>{copy.learnOnDemand}</CardTitle>
        <CardDescription>{copy.learnOnDemandSubtitle}</CardDescription>
      </CardHeader>

      <CardContent className="grid gap-3">
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
      </CardContent>
    </Card>
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
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            {sectionCopy.title}
          </p>
          <p className="mt-1 text-sm text-slate-500">{sectionCopy.description}</p>
        </div>
        <Button
          disabled={state?.isLoading}
          onClick={() => onAnalyzeSection(section.key)}
          size="sm"
          type="button"
        >
          {state?.isLoading
            ? copy.analyzingSection
            : hasContent
              ? copy.refreshSection
              : getSectionActionLabel(section.key, copy.language)}
        </Button>
      </div>

      {state?.error ? (
        <Alert className="mt-3" variant="destructive">{state.error}</Alert>
      ) : null}

      {hasContent ? <div className="mt-4">{content}</div> : null}
    </div>
  );
}

function getSectionActionLabel(section: SectionKey, language: string) {
  if (language === "Chinese") {
    const labels: Record<SectionKey, string> = {
      translation: "查看翻译",
      breakdown: "看句子拆解",
      vocabulary: "学重点单词",
      grammar: "看语法点",
      examples: "生成相似例句",
      tip: "给我复习建议",
    };

    return labels[section];
  }

  const labels: Record<SectionKey, string> = {
    translation: "View translation",
    breakdown: "Break down sentence",
    vocabulary: "Study vocabulary",
    grammar: "View grammar",
    examples: "Generate examples",
    tip: "Get review tip",
  };

  return labels[section];
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
