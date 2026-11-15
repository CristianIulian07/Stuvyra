import React, { useRef, useState } from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Circle,
  FileText,
  Lightbulb,
  Plus,
  Sparkles,
  Upload,
} from 'lucide-react';
import {
  AccountWorkspaceData,
  CourseDocument,
  FacultyExercise,
  LearningInsight,
  StudyScheduleBlock,
} from '../types/study';
import { AppLanguage, TRANSLATIONS } from '../utils/i18n';
import {
  formatIsoDate,
  recordStudyActivity,
} from '../utils/studyLogic';
import { GlassErrorRetry, GlassSkeleton } from './GlassPrimitives';

interface MaterialsScheduleViewProps {
  workspace: AccountWorkspaceData;
  onUpdateWorkspace: (updater: (prev: AccountWorkspaceData) => AccountWorkspaceData) => void;
  language: AppLanguage;
}

export const MaterialsScheduleView: React.FC<MaterialsScheduleViewProps> = ({
  workspace,
  onUpdateWorkspace,
  language,
}) => {
  const t = TRANSLATIONS[language];
  const todayIso = formatIsoDate(new Date());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    workspace.subjects[0]?.id || ''
  );
  const [pdfSummaryInput, setPdfSummaryInput] = useState('');
  const [uploadNotice, setUploadNotice] = useState('');

  // Faculty Exercise Input State
  const [exTitle, setExTitle] = useState('');
  const [exPrompt, setExPrompt] = useState('');
  const [exDifficulty, setExDifficulty] = useState<
    'Foundation' | 'Intermediate' | 'Advanced'
  >('Intermediate');
  const [exError, setExError] = useState('');

  // Per-exercise Hint loading & error states
  const [hintLoadingId, setHintLoadingId] = useState<string | null>(null);
  const [hintErrors, setHintErrors] = useState<Record<string, string>>({});

  // Study Schedule & Insights AI generation state
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const activeSubject =
    workspace.subjects.find((s) => s.id === selectedSubjectId) ||
    workspace.subjects[0];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!activeSubject) {
      setPlanError(t.needSubjectAndPdfErr);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = typeof reader.result === 'string' ? reader.result : '';
      const base64Data = resultStr.includes(',')
        ? resultStr.split(',')[1]
        : undefined;

      const newDoc: CourseDocument = {
        id: `doc-${Date.now()}`,
        subjectId: activeSubject.id,
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: todayIso,
        mimeType: file.type || 'application/pdf',
        base64Data:
          base64Data && base64Data.length < 3_500_000 ? base64Data : undefined,
        extractedText:
          pdfSummaryInput.trim() ||
          (language === 'ro'
            ? `Suport de curs PDF (${file.name}) încărcat pentru ${activeSubject.name}.`
            : `Uploaded course PDF (${file.name}) for ${activeSubject.name}.`),
      };

      onUpdateWorkspace((prev) => ({
        ...prev,
        documents: [newDoc, ...prev.documents],
      }));
      setPdfSummaryInput('');
      setPlanError(null);
      setUploadNotice(
        language === 'ro'
          ? `S-a încărcat „${file.name}” la ${activeSubject.code}`
          : `Uploaded "${file.name}" to ${activeSubject.code}`
      );
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exTitle.trim() || !exPrompt.trim()) {
      setExError(t.exErrReq);
      return;
    }
    setExError('');
    const subjId = activeSubject?.id || workspace.subjects[0]?.id || 'subj-1';

    const newEx: FacultyExercise = {
      id: `ex-${Date.now()}`,
      subjectId: subjId,
      title: exTitle.trim(),
      prompt: exPrompt.trim(),
      difficulty: exDifficulty,
      solved: false,
    };

    onUpdateWorkspace((prev) => ({
      ...prev,
      exercises: [newEx, ...prev.exercises],
    }));
    setExTitle('');
    setExPrompt('');
  };

  const handleToggleExerciseSolved = (exercise: FacultyExercise) => {
    const becomingSolved = !exercise.solved;
    const subj = workspace.subjects.find((s) => s.id === exercise.subjectId);

    onUpdateWorkspace((prev) => {
      const updatedExercises = prev.exercises.map((ex) =>
        ex.id === exercise.id ? { ...ex, solved: becomingSolved } : ex
      );
      const updatedLogs = becomingSolved
        ? recordStudyActivity(prev.dailyLogs, todayIso, {
            minutes: 20,
            exercises: 1,
            sessions: 1,
            subjectName: subj?.name || 'Coursework',
            note:
              language === 'ro'
                ? `Exercițiu de la facultate rezolvat: ${exercise.title}`
                : `Solved faculty exercise: ${exercise.title}`,
          })
        : prev.dailyLogs;

      return {
        ...prev,
        exercises: updatedExercises,
        dailyLogs: updatedLogs,
      };
    });
  };

  const handleRequestExerciseHint = async (
    exercise: FacultyExercise,
    simulateError = false
  ) => {
    setHintLoadingId(exercise.id);
    setHintErrors((prev) => {
      const next = { ...prev };
      delete next[exercise.id];
      return next;
    });

    try {
      const subj = workspace.subjects.find((s) => s.id === exercise.subjectId);
      const response = await fetch('/api/ai/exercise-hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectName: subj?.name || 'University Course',
          exerciseTitle: exercise.title,
          exercisePrompt: exercise.prompt,
          simulateError,
          language,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Could not generate exercise hint.');
      }

      onUpdateWorkspace((prev) => ({
        ...prev,
        exercises: prev.exercises.map((item) =>
          item.id === exercise.id
            ? {
                ...item,
                lastHint: `${data.hint} (${
                  language === 'ro' ? 'Recapitulează' : 'Review'
                }: ${data.keyConceptToReview})`,
              }
            : item
        ),
      }));
    } catch (err: any) {
      setHintErrors((prev) => ({
        ...prev,
        [exercise.id]:
          err?.message ||
          (language === 'ro'
            ? 'Nu am putut prelua indiciul Gemini momentan. Te rugăm să încerci din nou.'
            : 'Unable to fetch Gemini hint right now. Please try again.'),
      }));
    } finally {
      setHintLoadingId(null);
    }
  };

  const handleGenerateStudySchedule = async (simulateError = false) => {
    if (workspace.subjects.length === 0 || workspace.documents.length === 0) {
      setPlanError(t.needSubjectAndPdfErr);
      return;
    }

    setIsGeneratingPlan(true);
    setPlanError(null);
    try {
      const response = await fetch('/api/ai/study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: workspace.profile,
          subjects: workspace.subjects,
          documents: workspace.documents,
          exercises: workspace.exercises,
          todayIso,
          simulateError,
          language,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(
          data.error || 'Failed to generate personalized study schedule.'
        );
      }

      onUpdateWorkspace((prev) => {
        const blocks: StudyScheduleBlock[] = (data.scheduleBlocks || []).map(
          (b: any, idx: number) => {
            const matchedSubj =
              prev.subjects.find(
                (s) =>
                  s.name.toLowerCase() === (b.subjectName || '').toLowerCase()
              ) || prev.subjects[0];
            return {
              id: `sched-ai-${Date.now()}-${idx}`,
              dayLabel: b.dayLabel || 'Upcoming Session',
              date: b.date || todayIso,
              subjectId: matchedSubj?.id || 'subj-1',
              subjectName: b.subjectName || matchedSubj?.name || 'Course',
              topic: b.topic,
              durationMinutes: Number(b.durationMinutes) || 45,
              focusType:
                b.focusType === 'PDF Review' ||
                b.focusType === 'Exercise Drill' ||
                b.focusType === 'Exam Prep' ||
                b.focusType === 'Concept Synthesis'
                  ? b.focusType
                  : 'PDF Review',
              completed: false,
            };
          }
        );

        const insights: LearningInsight[] = (data.learningInsights || []).map(
          (ins: any, idx: number) => ({
            id: `ins-ai-${Date.now()}-${idx}`,
            subjectName: ins.subjectName || prev.subjects[0]?.name || 'Course',
            title: ins.title,
            actionableAdvice: ins.actionableAdvice,
            impactLevel:
              ins.impactLevel === 'Exam Critical' ||
              ins.impactLevel === 'Quick Win'
                ? ins.impactLevel
                : 'High Impact',
          })
        );

        return {
          ...prev,
          scheduleBlocks: blocks.length > 0 ? blocks : prev.scheduleBlocks,
          learningInsights:
            insights.length > 0 ? insights : prev.learningInsights,
        };
      });
    } catch (err: any) {
      setPlanError(
        err?.message ||
          (language === 'ro'
            ? 'A apărut o eroare la generarea orarului de studiu. Te rugăm să încerci din nou.'
            : 'Something went wrong while building your study schedule. Please try again.')
      );
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleToggleScheduleBlock = (block: StudyScheduleBlock) => {
    const becomingCompleted = !block.completed;
    onUpdateWorkspace((prev) => {
      const nextBlocks = prev.scheduleBlocks.map((b) =>
        b.id === block.id ? { ...b, completed: becomingCompleted } : b
      );
      const nextLogs = becomingCompleted
        ? recordStudyActivity(prev.dailyLogs, todayIso, {
            minutes: block.durationMinutes,
            sessions: 1,
            subjectName: block.subjectName,
            note:
              language === 'ro'
                ? `Sesiune din orar finalizată: ${block.topic} (${block.durationMinutes}m)`
                : `Completed study block: ${block.topic} (${block.durationMinutes}m)`,
          })
        : prev.dailyLogs;

      return {
        ...prev,
        scheduleBlocks: nextBlocks,
        dailyLogs: nextLogs,
      };
    });
  };

  return (
    <div className="space-y-8">
      {/* Top Action Header */}
      <div className="liquid-glass rounded-[28px] p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {t.materialsTitle}
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            {t.materialsSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleGenerateStudySchedule(false)}
            disabled={isGeneratingPlan}
            className="liquid-glass-btn-primary px-5 py-3 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {isGeneratingPlan ? t.generatingScheduleBtn : t.generateScheduleBtn}
            </span>
          </button>
        </div>
      </div>

      {/* Upload Course PDFs & Faculty Exercises Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 6 cols: Course PDFs & Subject Exam Date Selector */}
        <div className="lg:col-span-6 liquid-glass rounded-[28px] p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">
              {t.materialsStep1Title}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {t.materialsStep1Subtitle}
            </p>
          </div>

          {/* Subject Selector + Midterm / Final Dates */}
          <div className="liquid-glass-subtle rounded-2xl p-4 space-y-4">
            <div>
              <label
                htmlFor="mat-subject-select"
                className="block text-xs font-semibold text-slate-200 mb-1.5"
              >
                {t.activeSubjectLabel}
              </label>
              <select
                id="mat-subject-select"
                value={activeSubject?.id || ''}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full liquid-glass-input rounded-xl px-3.5 py-2.5 text-sm"
              >
                {workspace.subjects.length === 0 ? (
                  <option value="" className="bg-slate-900 text-slate-300">
                    {t.noSubjectsYet}
                  </option>
                ) : (
                  workspace.subjects.map((s) => (
                    <option
                      key={s.id}
                      value={s.id}
                      className="bg-slate-900 text-white"
                    >
                      {s.code} — {s.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {activeSubject && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="mat-midterm-date"
                    className="block text-xs text-slate-300 mb-1"
                  >
                    {t.midtermDateLabel}
                  </label>
                  <input
                    id="mat-midterm-date"
                    type="date"
                    value={activeSubject.midtermDate}
                    onChange={(e) =>
                      onUpdateWorkspace((prev) => ({
                        ...prev,
                        subjects: prev.subjects.map((s) =>
                          s.id === activeSubject.id
                            ? { ...s, midtermDate: e.target.value }
                            : s
                        ),
                      }))
                    }
                    className="w-full liquid-glass-input rounded-xl px-3 py-2 text-xs font-mono-tabular"
                  />
                </div>

                <div>
                  <label
                    htmlFor="mat-final-date"
                    className="block text-xs text-slate-300 mb-1"
                  >
                    {t.finalDateLabel}
                  </label>
                  <input
                    id="mat-final-date"
                    type="date"
                    value={activeSubject.finalDate}
                    onChange={(e) =>
                      onUpdateWorkspace((prev) => ({
                        ...prev,
                        subjects: prev.subjects.map((s) =>
                          s.id === activeSubject.id
                            ? { ...s, finalDate: e.target.value }
                            : s
                        ),
                      }))
                    }
                    className="w-full liquid-glass-input rounded-xl px-3 py-2 text-xs font-mono-tabular"
                  />
                </div>
              </div>
            )}
          </div>

          {/* PDF Upload Box */}
          <div className="liquid-glass-subtle rounded-2xl p-5 space-y-3">
            <label
              htmlFor="pdf-key-topics"
              className="block text-xs font-semibold text-slate-200"
            >
              {t.pdfTopicsLabel}
            </label>
            <input
              id="pdf-key-topics"
              type="text"
              value={pdfSummaryInput}
              onChange={(e) => setPdfSummaryInput(e.target.value)}
              placeholder={t.pdfTopicsPlaceholder}
              className="w-full liquid-glass-input rounded-xl px-3.5 py-2.5 text-xs"
            />

            <input
              ref={fileInputRef}
              id="course-pdf-upload"
              type="file"
              accept=".pdf,application/pdf,.txt"
              onChange={handleFileUpload}
              className="sr-only"
            />

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="liquid-glass-btn-primary px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{t.uploadPdfBtn}</span>
              </button>
            </div>

            {uploadNotice && (
              <p className="text-xs text-emerald-300" role="status">
                {uploadNotice}
              </p>
            )}
          </div>

          {/* Uploaded PDFs List */}
          <div className="divide-y divide-white/10">
            {workspace.documents.length === 0 ? (
              <p className="text-sm text-slate-300 py-4 text-center">
                {t.noPdfsYet}
              </p>
            ) : (
              workspace.documents.map((doc) => {
                const subj = workspace.subjects.find((s) => s.id === doc.subjectId);
                const sizeKb = Math.max(1, Math.round(doc.fileSize / 1024));
                return (
                  <div
                    key={doc.id}
                    className="py-3.5 first:pt-1 last:pb-1 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <FileText className="w-4 h-4 text-sky-300 mt-1 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {doc.fileName}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-300 mt-0.5">
                          <span>{subj?.code || 'Course'}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular">{sizeKb} KB</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular">{doc.uploadedAt}</span>
                        </div>
                        <p className="text-xs text-slate-300/90 mt-1 leading-relaxed">
                          {doc.extractedText}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 6 cols: Faculty Exercises & AI Hints */}
        <div className="lg:col-span-6 liquid-glass rounded-[28px] p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">
              {t.materialsStep2Title}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {t.materialsStep2Subtitle}
            </p>
          </div>

          {/* Add Faculty Exercise Form */}
          <form
            onSubmit={handleAddExercise}
            noValidate
            className="liquid-glass-subtle rounded-2xl p-4 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8">
                <label htmlFor="ex-title-input" className="sr-only">
                  Exercise Title
                </label>
                <input
                  id="ex-title-input"
                  type="text"
                  value={exTitle}
                  onChange={(e) => setExTitle(e.target.value)}
                  placeholder={t.exTitlePlaceholder}
                  className="w-full liquid-glass-input rounded-xl px-3.5 py-2 text-xs"
                />
              </div>
              <div className="sm:col-span-4">
                <label htmlFor="ex-difficulty-select" className="sr-only">
                  Exercise Difficulty
                </label>
                <select
                  id="ex-difficulty-select"
                  value={exDifficulty}
                  onChange={(e) =>
                    setExDifficulty(
                      e.target.value as 'Foundation' | 'Intermediate' | 'Advanced'
                    )
                  }
                  className="w-full liquid-glass-input rounded-xl px-3 py-2 text-xs"
                >
                  <option value="Foundation" className="bg-slate-900 text-white">
                    Foundation
                  </option>
                  <option value="Intermediate" className="bg-slate-900 text-white">
                    Intermediate
                  </option>
                  <option value="Advanced" className="bg-slate-900 text-white">
                    Advanced
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="ex-prompt-input" className="sr-only">
                Exercise Problem Statement
              </label>
              <textarea
                id="ex-prompt-input"
                rows={2}
                value={exPrompt}
                onChange={(e) => setExPrompt(e.target.value)}
                placeholder={t.exPromptPlaceholder}
                className="w-full liquid-glass-input rounded-xl px-3.5 py-2 text-xs"
              />
            </div>

            {exError && (
              <p className="text-xs text-rose-300" role="alert">
                {exError}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                className="liquid-glass-btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.addExerciseBtn}</span>
              </button>
            </div>
          </form>

          {/* Exercises List with Gemini Hint Support */}
          <div className="divide-y divide-white/10">
            {workspace.exercises.length === 0 ? (
              <p className="text-sm text-slate-300 py-4 text-center">
                {t.noExercisesYet}
              </p>
            ) : (
              workspace.exercises.map((ex) => {
                const subj = workspace.subjects.find((s) => s.id === ex.subjectId);
                const isHintLoading = hintLoadingId === ex.id;
                const hintError = hintErrors[ex.id];

                return (
                  <div key={ex.id} className="py-4 first:pt-1 last:pb-1 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleExerciseSolved(ex)}
                        className="flex items-start gap-2.5 text-left group"
                      >
                        {ex.solved ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-300 mt-0.5 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-400 group-hover:text-sky-300 mt-0.5 shrink-0" />
                        )}
                        <div>
                          <p
                            className={`text-sm font-semibold ${
                              ex.solved ? 'text-emerald-200' : 'text-white'
                            }`}
                          >
                            {ex.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-300 mt-0.5">
                            <span>{subj?.code || 'Course'}</span>
                            <span aria-hidden="true">·</span>
                            <span>{ex.difficulty}</span>
                            <span aria-hidden="true">·</span>
                            <span>{ex.solved ? t.solvedLabel : t.unsolvedLabel}</span>
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRequestExerciseHint(ex, false)}
                        disabled={isHintLoading}
                        className="liquid-glass-btn px-3 py-1.5 rounded-xl text-xs font-medium text-amber-200 flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
                        <span>{isHintLoading ? t.thinkingBtn : t.getHintBtn}</span>
                      </button>
                    </div>

                    <p className="text-xs text-slate-200/90 leading-relaxed pl-6">
                      {ex.prompt}
                    </p>

                    {isHintLoading && (
                      <div className="pl-6">
                        <GlassSkeleton
                          lines={2}
                          label={t.hintSkeletonLabel}
                          language={language}
                        />
                      </div>
                    )}

                    {hintError && (
                      <div className="pl-6">
                        <GlassErrorRetry
                          message={hintError}
                          onRetry={() => handleRequestExerciseHint(ex, false)}
                          language={language}
                        />
                      </div>
                    )}

                    {ex.lastHint && !isHintLoading && (
                      <div className="ml-6 liquid-glass-subtle rounded-2xl p-3.5 text-xs text-amber-100/95">
                        <span className="font-semibold text-amber-200">
                          {t.geminiHintPrefix}{' '}
                        </span>
                        {ex.lastHint}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Personalized AI Study Schedule & Actionable Learning Insights */}
      {isGeneratingPlan ? (
        <GlassSkeleton
          lines={4}
          label={t.planSkeletonLabel}
          language={language}
        />
      ) : planError ? (
        <GlassErrorRetry
          message={planError}
          onRetry={() => handleGenerateStudySchedule(false)}
          onDismiss={() => setPlanError(null)}
          language={language}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Personalized Study Schedule */}
          <div className="lg:col-span-7 liquid-glass rounded-[28px] p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-sky-300" />
                  <h2 className="text-lg font-bold text-white">
                    {t.scheduleCardTitle}
                  </h2>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  {t.scheduleCardSubtitle}
                </p>
              </div>
            </div>

            <div className="divide-y divide-white/10">
              {workspace.scheduleBlocks.length === 0 ? (
                <p className="text-sm text-slate-300 py-6 text-center">
                  {t.noScheduleYet}
                </p>
              ) : (
                workspace.scheduleBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="py-4 first:pt-1 last:pb-1 flex items-start justify-between gap-4"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleScheduleBlock(block)}
                      className="flex items-start gap-3 text-left group"
                    >
                      {block.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-300 mt-1 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-400 group-hover:text-sky-300 mt-1 shrink-0" />
                      )}
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-sky-200/90">
                          <span>{block.dayLabel}</span>
                          <span aria-hidden="true">·</span>
                          <span>{block.subjectName}</span>
                          <span aria-hidden="true">·</span>
                          <span>{block.focusType}</span>
                        </div>
                        <p
                          className={`text-sm font-semibold mt-0.5 ${
                            block.completed
                              ? 'line-through text-slate-400'
                              : 'text-white'
                          }`}
                        >
                          {block.topic}
                        </p>
                      </div>
                    </button>

                    <span className="text-xs font-mono-tabular font-semibold text-sky-200 shrink-0">
                      {block.durationMinutes} min
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Actionable Learning Insights */}
          <div className="lg:col-span-5 liquid-glass rounded-[28px] p-6 sm:p-8 space-y-5">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-300" />
                <h2 className="text-lg font-bold text-white">
                  {t.insightsCardTitle}
                </h2>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {t.insightsCardSubtitle}
              </p>
            </div>

            <div className="divide-y divide-white/10">
              {workspace.learningInsights.length === 0 ? (
                <p className="text-sm text-slate-300 py-6 text-center">
                  {t.noInsightsYet}
                </p>
              ) : (
                workspace.learningInsights.map((insight) => (
                  <div key={insight.id} className="py-4 first:pt-1 last:pb-1 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-indigo-200">
                      <span>{insight.subjectName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-sky-300">
                        {insight.impactLevel}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white">
                      {insight.title}
                    </h3>
                    <p className="text-xs text-slate-200/90 leading-relaxed">
                      {insight.actionableAdvice}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
