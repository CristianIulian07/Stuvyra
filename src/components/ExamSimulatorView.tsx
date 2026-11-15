import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  Lightbulb,
  Play,
} from 'lucide-react';
import {
  AccountWorkspaceData,
  SimulatedExamQuestion,
  SimulatedExamSession,
} from '../types/study';
import { AppLanguage, TRANSLATIONS } from '../utils/i18n';
import { formatIsoDate, recordStudyActivity } from '../utils/studyLogic';
import { GlassErrorRetry, GlassSkeleton } from './GlassPrimitives';

interface ExamSimulatorViewProps {
  workspace: AccountWorkspaceData;
  onUpdateWorkspace: (updater: (prev: AccountWorkspaceData) => AccountWorkspaceData) => void;
  language: AppLanguage;
}

export const ExamSimulatorView: React.FC<ExamSimulatorViewProps> = ({
  workspace,
  onUpdateWorkspace,
  language,
}) => {
  const t = TRANSLATIONS[language];
  const todayIso = formatIsoDate(new Date());
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    workspace.subjects[0]?.id || ''
  );
  const [customExerciseContext, setCustomExerciseContext] = useState('');

  const [isSimulating, setIsSimulating] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  const [isGrading, setIsGrading] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);

  const [questionHintLoading, setQuestionHintLoading] = useState<string | null>(
    null
  );
  const [questionHintErrors, setQuestionHintErrors] = useState<
    Record<string, string>
  >({});

  const activeExam: SimulatedExamSession | undefined =
    workspace.examSessions[0];

  const activeSubject =
    workspace.subjects.find((s) => s.id === selectedSubjectId) ||
    workspace.subjects[0];

  const handleGenerateExam = async (simulateError = false) => {
    const targetSubject = activeSubject || {
      id: 'subj-general',
      name: language === 'ro' ? 'Disciplină Universitară' : 'University Subject',
      code: 'CRS-101',
      midtermDate: '',
      finalDate: '',
      colorAccent: 'cyan' as const,
      credits: 5,
      masteryPercent: 0,
    };

    setIsSimulating(true);
    setSimError(null);

    try {
      const subjectExercises = workspace.exercises.filter(
        (e) => e.subjectId === targetSubject.id
      );
      const extraExercises = customExerciseContext.trim()
        ? [
            {
              title:
                language === 'ro'
                  ? 'Exercițiu Suplimentar de la Facultate'
                  : 'Custom Faculty Exercise Input',
              prompt: customExerciseContext.trim(),
              difficulty: 'Intermediate',
            },
            ...subjectExercises,
          ]
        : subjectExercises.length > 0
          ? subjectExercises
          : workspace.exercises;

      const subjectDocs = workspace.documents.filter(
        (d) => d.subjectId === targetSubject.id
      );

      const response = await fetch('/api/ai/simulate-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: targetSubject,
          exercises: extraExercises,
          documents: subjectDocs,
          questionCount: 3,
          simulateError,
          language,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to generate simulated exam.');
      }

      const questions: SimulatedExamQuestion[] = (data.questions || []).map(
        (q: any, idx: number) => ({
          id: `sim-q-${Date.now()}-${idx}`,
          questionNumber: q.questionNumber || idx + 1,
          topic: q.topic || `${targetSubject.name} Problem ${idx + 1}`,
          difficulty:
            q.difficulty === 'Foundation' || q.difficulty === 'Advanced'
              ? q.difficulty
              : 'Intermediate',
          prompt: q.prompt,
          points: Number(q.points) || 10,
          sampleSolution: q.sampleSolution || '',
          gradingCriteria: q.gradingCriteria || '',
          userAnswer: '',
        })
      );

      const maxScore = questions.reduce((sum, q) => sum + q.points, 0);
      const newSession: SimulatedExamSession = {
        id: `exam-${Date.now()}`,
        subjectId: targetSubject.id,
        subjectName: targetSubject.name,
        createdAt: todayIso,
        durationMinutes: Number(data.durationMinutes) || 45,
        questions,
        submitted: false,
        maxScore,
      };

      onUpdateWorkspace((prev) => ({
        ...prev,
        examSessions: [newSession, ...prev.examSessions],
      }));
    } catch (err: any) {
      setSimError(
        err?.message ||
          (language === 'ro'
            ? 'Gemini nu a putut genera simularea de examen momentan. Te rugăm să încerci din nou.'
            : 'Gemini could not generate the simulated exam right now. Please try again.')
      );
    } finally {
      setIsSimulating(false);
    }
  };

  const handleAnswerChange = (questionId: string, answerText: string) => {
    if (!activeExam) return;
    onUpdateWorkspace((prev) => ({
      ...prev,
      examSessions: prev.examSessions.map((sess, idx) =>
        idx === 0
          ? {
              ...sess,
              questions: sess.questions.map((q) =>
                q.id === questionId ? { ...q, userAnswer: answerText } : q
              ),
            }
          : sess
      ),
    }));
  };

  const handleRequestQuestionHint = async (
    question: SimulatedExamQuestion,
    simulateError = false
  ) => {
    if (!activeExam) return;
    setQuestionHintLoading(question.id);
    setQuestionHintErrors((prev) => {
      const next = { ...prev };
      delete next[question.id];
      return next;
    });

    try {
      const response = await fetch('/api/ai/exercise-hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectName: activeExam.subjectName,
          exerciseTitle: question.topic,
          exercisePrompt: question.prompt,
          currentAttempt: question.userAnswer || '',
          simulateError,
          language,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Could not generate hint.');
      }

      onUpdateWorkspace((prev) => ({
        ...prev,
        examSessions: prev.examSessions.map((sess, idx) =>
          idx === 0
            ? {
                ...sess,
                questions: sess.questions.map((q) =>
                  q.id === question.id
                    ? {
                        ...q,
                        aiHint: `${data.hint} (${
                          language === 'ro' ? 'Concept cheie' : 'Key concept'
                        }: ${data.keyConceptToReview})`,
                      }
                    : q
                ),
              }
            : sess
        ),
      }));
    } catch (err: any) {
      setQuestionHintErrors((prev) => ({
        ...prev,
        [question.id]:
          err?.message ||
          (language === 'ro'
            ? 'Nu am putut prelua indiciul Gemini. Te rugăm să încerci din nou.'
            : 'Unable to fetch Gemini hint. Please try again.'),
      }));
    } finally {
      setQuestionHintLoading(null);
    }
  };

  const handleSubmitAndGradeExam = async (simulateError = false) => {
    if (!activeExam) return;
    setIsGrading(true);
    setGradeError(null);

    try {
      const response = await fetch('/api/ai/grade-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectName: activeExam.subjectName,
          questions: activeExam.questions,
          simulateError,
          language,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Unable to grade exam.');
      }

      const gradedMap = new Map<number, { awardedPoints: number; aiFeedback: string }>();
      (data.gradedQuestions || []).forEach((gq: any) => {
        gradedMap.set(Number(gq.questionNumber), {
          awardedPoints: Number(gq.awardedPoints) || 7,
          aiFeedback: gq.aiFeedback || 'Reviewed by Gemini.',
        });
      });

      onUpdateWorkspace((prev) => {
        const current = prev.examSessions[0];
        if (!current) return prev;

        const updatedQuestions = current.questions.map((q) => {
          const grade = gradedMap.get(q.questionNumber);
          return {
            ...q,
            awardedPoints: grade ? grade.awardedPoints : 8,
            aiFeedback: grade
              ? grade.aiFeedback
              : language === 'ro'
                ? 'Demonstrație solidă și raționament clar.'
                : 'Solid derivation and clear reasoning.',
          };
        });

        const totalScore = updatedQuestions.reduce(
          (sum, q) => sum + (q.awardedPoints || 0),
          0
        );
        const pct =
          current.maxScore > 0
            ? Math.round((totalScore / current.maxScore) * 100)
            : 85;

        const updatedSession: SimulatedExamSession = {
          ...current,
          questions: updatedQuestions,
          submitted: true,
          totalScore,
          overallFeedback:
            data.overallFeedback ||
            `Scored ${totalScore}/${current.maxScore} (${pct}%).`,
        };

        const nextLogs = recordStudyActivity(prev.dailyLogs, todayIso, {
          minutes: 35,
          exercises: updatedQuestions.length,
          sessions: 1,
          subjectName: current.subjectName,
          note:
            language === 'ro'
              ? `Simulare de Examen finalizată la ${current.subjectName}: ${totalScore}/${current.maxScore} (${pct}%)`
              : `Completed Simulated Exam in ${current.subjectName}: ${totalScore}/${current.maxScore} (${pct}%)`,
          examScorePercent: pct,
        });

        return {
          ...prev,
          examSessions: [updatedSession, ...prev.examSessions.slice(1)],
          dailyLogs: nextLogs,
        };
      });
    } catch (err: any) {
      setGradeError(
        err?.message ||
          (language === 'ro'
            ? 'A apărut o eroare la evaluarea examenului. Apasă pe Încearcă din nou.'
            : 'Something went wrong while grading your exam. Please click Try Again.')
      );
    } finally {
      setIsGrading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Simulator Configuration Card */}
      <div className="liquid-glass rounded-[28px] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {t.simulatorTitle}
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              {t.simulatorSubtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleGenerateExam(false)}
            disabled={isSimulating}
            className="liquid-glass-btn-primary px-5 py-3 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 self-start"
          >
            <Play className="w-4 h-4" />
            <span>
              {isSimulating ? t.assemblingExamBtn : t.simulateNewExamBtn}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2 border-t border-white/15">
          <div className="md:col-span-4">
            <label
              htmlFor="sim-subject-select"
              className="block text-xs font-semibold text-slate-200 mb-1.5"
            >
              {t.targetSubjectSimLabel}
            </label>
            <select
              id="sim-subject-select"
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

          <div className="md:col-span-8">
            <label
              htmlFor="sim-custom-exercises"
              className="block text-xs font-semibold text-slate-200 mb-1.5"
            >
              {t.extraExercisesSimLabel}
            </label>
            <input
              id="sim-custom-exercises"
              type="text"
              value={customExerciseContext}
              onChange={(e) => setCustomExerciseContext(e.target.value)}
              placeholder={t.extraExercisesSimPlaceholder}
              className="w-full liquid-glass-input rounded-xl px-3.5 py-2.5 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Loading or Error States for Exam Generation */}
      {isSimulating ? (
        <GlassSkeleton
          lines={5}
          label={t.simSkeletonLabel}
          language={language}
        />
      ) : simError ? (
        <GlassErrorRetry
          message={simError}
          onRetry={() => handleGenerateExam(false)}
          onDismiss={() => setSimError(null)}
          language={language}
        />
      ) : !activeExam ? (
        <div className="liquid-glass rounded-[28px] p-8 text-center">
          <p className="text-sm text-slate-300 max-w-xl mx-auto">
            {t.noExamSimulatedYet}
          </p>
        </div>
      ) : null}

      {/* Active Simulated Exam Paper */}
      {activeExam && !isSimulating && (
        <div className="liquid-glass rounded-[28px] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/15">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-sky-200">
                <span>{t.simulatedExamBadge}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">
                  {activeExam.durationMinutes} {t.minTargetSuffix}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">
                  {activeExam.maxScore} {t.totalPointsSuffix}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1">
                {activeExam.subjectName}
              </h2>
            </div>

            {activeExam.submitted && (
              <div className="liquid-glass-subtle rounded-2xl px-4 py-2.5 flex items-center gap-3">
                <Award className="w-5 h-5 text-emerald-300" />
                <div>
                  <p className="text-xs text-slate-300">{t.examScoreLabel}</p>
                  <p className="text-lg font-bold text-white font-mono-tabular">
                    {activeExam.totalScore}/{activeExam.maxScore} pts
                  </p>
                </div>
              </div>
            )}
          </div>

          {activeExam.submitted && activeExam.overallFeedback && (
            <div className="liquid-glass-subtle rounded-2xl p-4 text-sm text-emerald-100">
              <span className="font-semibold text-emerald-300">
                {t.examinerSummaryPrefix}{' '}
              </span>
              {activeExam.overallFeedback}
            </div>
          )}

          <div className="divide-y divide-white/15">
            {activeExam.questions.map((question) => {
              const isHintBusy = questionHintLoading === question.id;
              const qHintErr = questionHintErrors[question.id];

              return (
                <div
                  key={question.id}
                  className="py-6 first:pt-2 last:pb-2 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-sky-200">
                      <span className="font-mono-tabular font-bold text-white">
                        {t.questionLabel} {question.questionNumber}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{question.topic}</span>
                      <span aria-hidden="true">·</span>
                      <span>{question.difficulty}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">
                        {question.points} pts
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRequestQuestionHint(question, false)}
                      disabled={isHintBusy}
                      className="liquid-glass-btn px-3.5 py-1.5 rounded-xl text-xs font-medium text-amber-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start"
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
                      <span>
                        {isHintBusy ? t.generatingHintBtn : t.getGeminiHintBtn}
                      </span>
                    </button>
                  </div>

                  <p className="text-sm text-white leading-relaxed">
                    {question.prompt}
                  </p>

                  {isHintBusy && (
                    <GlassSkeleton
                      lines={2}
                      label={t.questionHintSkeleton}
                      language={language}
                    />
                  )}

                  {qHintErr && (
                    <GlassErrorRetry
                      message={qHintErr}
                      onRetry={() => handleRequestQuestionHint(question, false)}
                      language={language}
                    />
                  )}

                  {question.aiHint && !isHintBusy && (
                    <div className="liquid-glass-subtle rounded-2xl p-4 text-xs text-amber-100">
                      <span className="font-semibold text-amber-300">
                        {t.geminiHintPrefix}{' '}
                      </span>
                      {question.aiHint}
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor={`ans-${question.id}`}
                      className="block text-xs font-medium text-slate-300 mb-1.5"
                    >
                      {t.yourSolutionForLabel} {question.questionNumber}
                    </label>
                    <textarea
                      id={`ans-${question.id}`}
                      rows={3}
                      value={question.userAnswer || ''}
                      onChange={(e) =>
                        handleAnswerChange(question.id, e.target.value)
                      }
                      placeholder={t.solutionPlaceholder}
                      className="w-full liquid-glass-input rounded-2xl px-4 py-3 text-sm"
                    />
                  </div>

                  {activeExam.submitted && (
                    <div className="liquid-glass-subtle rounded-2xl p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-emerald-200 font-semibold">
                        <span>{t.gradingFeedbackTitle}</span>
                        <span className="font-mono-tabular">
                          {t.awardedLabel} {question.awardedPoints ?? 8} / {question.points} pts
                        </span>
                      </div>
                      <p className="text-slate-200">{question.aiFeedback}</p>
                      <div className="pt-2 border-t border-white/10 text-slate-300">
                        <span className="font-semibold text-sky-200">
                          {t.referenceSolutionPrefix}{' '}
                        </span>
                        {question.sampleSolution}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {isGrading && (
            <GlassSkeleton
              lines={3}
              label={t.gradingSkeletonLabel}
              language={language}
            />
          )}

          {gradeError && (
            <GlassErrorRetry
              message={gradeError}
              onRetry={() => handleSubmitAndGradeExam(false)}
              onDismiss={() => setGradeError(null)}
              language={language}
            />
          )}

          <div className="pt-4 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Clock className="w-4 h-4 text-sky-300" />
              <span>{t.submitExamNote}</span>
            </div>

            <button
              type="button"
              onClick={() => handleSubmitAndGradeExam(false)}
              disabled={isGrading}
              className="liquid-glass-btn-primary px-6 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isGrading
                  ? t.gradingBtn
                  : activeExam.submitted
                    ? t.reGradeBtn
                    : t.submitGradeBtn}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
