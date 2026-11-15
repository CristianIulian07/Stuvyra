import React, { useState } from 'react';
import {
  Bell,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  ArrowUpRight,
} from 'lucide-react';
import {
  AccountWorkspaceData,
  StudyReminder,
  SubjectItem,
} from '../types/study';
import { AppLanguage, TRANSLATIONS } from '../utils/i18n';
import {
  calculateDaysUntil,
  formatIsoDate,
  sortRemindersByUrgency,
} from '../utils/studyLogic';
import { GlassErrorRetry, GlassSkeleton } from './GlassPrimitives';

interface DashboardViewProps {
  workspace: AccountWorkspaceData;
  onUpdateWorkspace: (updater: (prev: AccountWorkspaceData) => AccountWorkspaceData) => void;
  onNavigateTab: (tab: 'dashboard' | 'materials' | 'simulator' | 'weekly') => void;
  language: AppLanguage;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  workspace,
  onUpdateWorkspace,
  onNavigateTab,
  language,
}) => {
  const t = TRANSLATIONS[language];
  const todayIso = formatIsoDate(new Date());
  const todayLog = workspace.dailyLogs[todayIso] || {
    date: todayIso,
    minutesStudied: 0,
    exercisesSolved: 0,
    sessionsCompleted: 0,
    subjectsTouched: [],
    notes: [],
  };

  // Add Subject state - no pre-generated random exam dates
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [newMidtermDate, setNewMidtermDate] = useState('');
  const [newFinalDate, setNewFinalDate] = useState('');
  const [subjectError, setSubjectError] = useState('');

  // Add Reminder state - no pre-generated random due date
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderSubjectId, setNewReminderSubjectId] = useState(
    workspace.subjects[0]?.id || ''
  );
  const [newReminderDate, setNewReminderDate] = useState('');
  const [newReminderCategory, setNewReminderCategory] = useState<
    'assignment' | 'milestone' | 'midterm' | 'final'
  >('assignment');
  const [reminderError, setReminderError] = useState('');

  // Gemini AI states
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  const [isGeneratingOverview, setIsGeneratingOverview] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const handleRefreshDailyInsight = async (simulateError = false) => {
    setIsGeneratingInsight(true);
    setInsightError(null);
    try {
      const response = await fetch('/api/ai/daily-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: workspace.profile,
          todayLog,
          subjects: workspace.subjects,
          reminders: workspace.reminders,
          simulateError,
          language,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Unable to generate Daily AI Insight.');
      }

      onUpdateWorkspace((prev) => ({
        ...prev,
        dailyAiInsight: {
          date: todayIso,
          generatedAt: language === 'ro' ? 'Chiar acum' : 'Just now',
          summaryOfDay: data.summaryOfDay,
          nextSessionSuggestion: data.nextSessionSuggestion,
          focusSubject: data.focusSubject,
          recommendedMinutes: data.recommendedMinutes || 40,
        },
      }));
    } catch (err: any) {
      setInsightError(
        err?.message ||
          (language === 'ro'
            ? 'Nu ne-am putut conecta la Gemini pentru rezumatul zilei. Te rugăm să încerci din nou.'
            : 'We could not connect to Gemini for your daily summary. Please try again.')
      );
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  const handleGenerateAcademicOverview = async (simulateError = false) => {
    setIsGeneratingOverview(true);
    setOverviewError(null);
    try {
      const response = await fetch('/api/ai/academic-overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: workspace.profile,
          subjects: workspace.subjects,
          todayIso,
          simulateError,
          language,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Could not generate academic dashboard.');
      }

      onUpdateWorkspace((prev) => ({
        ...prev,
        academicOverview: {
          welcomeHeadline: data.welcomeHeadline,
          semesterStrategy: data.semesterStrategy,
          suggestedReminders: [],
        },
      }));
    } catch (err: any) {
      setOverviewError(
        err?.message ||
          (language === 'ro'
            ? 'Gemini nu a putut actualiza panoul academic. Te rugăm să încerci din nou.'
            : 'Gemini could not update your academic dashboard. Please try again.')
      );
    } finally {
      setIsGeneratingOverview(false);
    }
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) {
      setSubjectError(t.subjectNameErr);
      return;
    }
    setSubjectError('');
    const accents: Array<'cyan' | 'indigo' | 'violet' | 'emerald' | 'amber' | 'rose'> = [
      'cyan',
      'indigo',
      'violet',
      'emerald',
      'amber',
      'rose',
    ];
    const newId = `subj-${Date.now()}`;
    const trimmedMidterm = newMidtermDate.trim();
    const trimmedFinal = newFinalDate.trim();
    const newSubj: SubjectItem = {
      id: newId,
      name: newSubjectName.trim(),
      code: newSubjectCode.trim() || `CRS-${workspace.subjects.length + 101}`,
      midtermDate: trimmedMidterm,
      finalDate: trimmedFinal,
      colorAccent: accents[workspace.subjects.length % accents.length],
      credits: 5,
      masteryPercent: 0,
    };

    onUpdateWorkspace((prev) => {
      const nextReminders = trimmedMidterm
        ? [
            {
              id: `rem-mid-${Date.now()}`,
              subjectId: newId,
              title:
                language === 'ro'
                  ? `${newSubj.code} Examen Parțial: ${newSubj.name}`
                  : `${newSubj.code} Midterm Exam: ${newSubj.name}`,
              dueDate: trimmedMidterm,
              category: 'midterm' as const,
              completed: false,
              priority: 'high' as const,
            },
            ...prev.reminders,
          ]
        : prev.reminders;

      return {
        ...prev,
        subjects: [...prev.subjects, newSubj],
        reminders: nextReminders,
      };
    });

    setNewSubjectName('');
    setNewSubjectCode('');
    setNewMidtermDate('');
    setNewFinalDate('');
  };

  const handleUpdateSubjectDate = (
    subjectId: string,
    field: 'midtermDate' | 'finalDate',
    value: string
  ) => {
    onUpdateWorkspace((prev) => ({
      ...prev,
      subjects: prev.subjects.map((s) =>
        s.id === subjectId ? { ...s, [field]: value } : s
      ),
    }));
  };

  const handleDeleteSubject = (subjectId: string) => {
    onUpdateWorkspace((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((s) => s.id !== subjectId),
    }));
  };

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderTitle.trim()) {
      setReminderError(t.reminderTitleErr);
      return;
    }
    setReminderError('');
    const rem: StudyReminder = {
      id: `rem-${Date.now()}`,
      subjectId: newReminderSubjectId || workspace.subjects[0]?.id || 'subj-1',
      title: newReminderTitle.trim(),
      dueDate: newReminderDate || todayIso,
      category: newReminderCategory,
      completed: false,
      priority:
        newReminderCategory === 'midterm' || newReminderCategory === 'final'
          ? 'high'
          : 'medium',
    };

    onUpdateWorkspace((prev) => ({
      ...prev,
      reminders: [rem, ...prev.reminders],
    }));
    setNewReminderTitle('');
    setNewReminderDate('');
  };

  const handleToggleReminder = (reminderId: string) => {
    onUpdateWorkspace((prev) => ({
      ...prev,
      reminders: prev.reminders.map((r) =>
        r.id === reminderId ? { ...r, completed: !r.completed } : r
      ),
    }));
  };

  const sortedReminders = sortRemindersByUrgency(workspace.reminders);

  const defaultOverviewHeadline =
    language === 'ro'
      ? `Centrul Academic de Comandă — ${workspace.profile.currentSemester}`
      : workspace.academicOverview?.welcomeHeadline ||
        `${workspace.profile.currentSemester} Dashboard`;

  const hasLoggedToday =
    todayLog.minutesStudied > 0 || todayLog.exercisesSolved > 0;

  return (
    <div className="space-y-8">
      {/* Row 1: Student Academic Context Header + AI Daily Insights Glass Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 cols: Academic Overview & Today's KPI Metrics */}
        <div className="lg:col-span-7 liquid-glass rounded-[28px] p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-sky-200/90">
              <span>{workspace.profile.university}</span>
              <span aria-hidden="true">·</span>
              <span>{workspace.profile.faculty}</span>
              <span aria-hidden="true">·</span>
              <span>{workspace.profile.major}</span>
              <span aria-hidden="true">·</span>
              <span>{workspace.profile.yearOfStudy}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {defaultOverviewHeadline}
              </h1>
              <button
                type="button"
                onClick={() => handleGenerateAcademicOverview(false)}
                disabled={isGeneratingOverview}
                className="liquid-glass-btn px-4 py-2 rounded-xl text-xs font-semibold text-sky-200 flex items-center gap-2 whitespace-nowrap shrink-0 self-start"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-300" />
                <span>
                  {isGeneratingOverview
                    ? t.synthesizingBtn
                    : t.buildAcademicPlanBtn}
                </span>
              </button>
            </div>

            {isGeneratingOverview ? (
              <div className="mt-4">
                <GlassSkeleton
                  lines={2}
                  label={t.overviewSkeleton}
                  language={language}
                />
              </div>
            ) : overviewError ? (
              <div className="mt-4">
                <GlassErrorRetry
                  message={overviewError}
                  onRetry={() => handleGenerateAcademicOverview(false)}
                  onDismiss={() => setOverviewError(null)}
                  language={language}
                />
              </div>
            ) : (
              <p className="text-sm text-slate-200/90 mt-3 leading-relaxed">
                {workspace.academicOverview?.semesterStrategy ||
                  t.defaultSemesterStrategy}
              </p>
            )}
          </div>

          {/* Today's Key Study Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/15">
            <div>
              <p className="text-xs text-slate-300">{t.kpiTodayStudyTime}</p>
              <p className="text-2xl font-bold text-white font-mono-tabular mt-1">
                {todayLog.minutesStudied}m
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-300">{t.kpiExercisesSolvedToday}</p>
              <p className="text-2xl font-bold text-white font-mono-tabular mt-1">
                {todayLog.exercisesSolved}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-300">{t.kpiSemesterSubjects}</p>
              <p className="text-2xl font-bold text-white font-mono-tabular mt-1">
                {workspace.subjects.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-300">{t.kpiCoursePdfsUploaded}</p>
              <p className="text-2xl font-bold text-white font-mono-tabular mt-1">
                {workspace.documents.length}
              </p>
            </div>
          </div>
        </div>

        {/* Right 5 cols: AI Daily Insights Glass Card */}
        <div className="lg:col-span-5 liquid-glass rounded-[28px] p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-300 shrink-0" />
                <h2 className="text-base font-bold text-white">
                  {t.aiDailyInsightsTitle}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRefreshDailyInsight(false)}
                  disabled={isGeneratingInsight}
                  className="liquid-glass-btn px-3 py-1.5 rounded-xl text-xs font-medium text-slate-200 flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  aria-label="Refresh AI Daily Insights"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      isGeneratingInsight ? 'animate-spin' : ''
                    }`}
                  />
                  <span>{t.refreshBtn}</span>
                </button>
              </div>
            </div>

            {isGeneratingInsight ? (
              <div className="mt-4">
                <GlassSkeleton
                  lines={3}
                  label={t.insightSkeleton}
                  language={language}
                />
              </div>
            ) : insightError ? (
              <div className="mt-4">
                <GlassErrorRetry
                  message={insightError}
                  onRetry={() => handleRefreshDailyInsight(false)}
                  onDismiss={() => setInsightError(null)}
                  language={language}
                />
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs font-medium text-sky-200/80">
                    {t.summaryOfDayLabel}
                  </p>
                  <p className="text-sm text-white mt-1 leading-relaxed">
                    {workspace.dailyAiInsight?.summaryOfDay ||
                      (hasLoggedToday
                        ? language === 'ro'
                          ? `Ai înregistrat ${todayLog.minutesStudied} minute și ai rezolvat ${todayLog.exercisesSolved} exerciții astăzi.`
                          : `You have logged ${todayLog.minutesStudied} minutes and solved ${todayLog.exercisesSolved} exercises today.`
                        : t.emptyDailyInsightSummary)}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/15">
                  <p className="text-xs font-medium text-indigo-200/90">
                    {t.nextSessionSuggestionLabel}
                  </p>
                  <p className="text-sm text-slate-200 mt-1 leading-relaxed">
                    {workspace.dailyAiInsight?.nextSessionSuggestion ||
                      t.emptyDailyInsightSuggestion}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-white/15 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-300">
              <span>{t.recommendedLabel} </span>
              <span className="font-mono-tabular font-semibold text-white">
                {workspace.dailyAiInsight?.recommendedMinutes ?? 0} min
              </span>
              <span> · </span>
              <span className="text-sky-200">
                {workspace.dailyAiInsight?.focusSubject ||
                  workspace.subjects[0]?.name ||
                  t.dateNotSet}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('materials')}
              className="liquid-glass-btn-primary px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <span>{t.openStudyPlanBtn}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Semester Subjects & Exam Dates + Upcoming Deadlines & Study Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 cols: Current Semester Subjects & Exam Dates */}
        <div className="lg:col-span-7 liquid-glass rounded-[28px] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">
                {t.subjectsSectionTitle}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {t.subjectsSectionSubtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('materials')}
              className="liquid-glass-btn px-3.5 py-2 rounded-xl text-xs font-medium text-sky-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{t.uploadPdfsShortcutBtn}</span>
            </button>
          </div>

          {/* Add Subject Form */}
          <form
            onSubmit={handleAddSubject}
            noValidate
            className="liquid-glass-subtle rounded-2xl p-4 sm:p-5 space-y-4"
          >
            <p className="text-xs font-semibold text-slate-200">
              {t.addSubjectFormTitle} {workspace.profile.currentSemester}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8">
                <label
                  htmlFor="subj-name"
                  className="block text-xs text-slate-300 mb-1"
                >
                  {t.subjectNameLabel}
                </label>
                <input
                  id="subj-name"
                  type="text"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder={t.subjectNamePlaceholder}
                  className="w-full liquid-glass-input rounded-xl px-3.5 py-2.5 text-xs"
                />
              </div>
              <div className="sm:col-span-4">
                <label
                  htmlFor="subj-code"
                  className="block text-xs text-slate-300 mb-1"
                >
                  {t.courseCodeLabel}
                </label>
                <input
                  id="subj-code"
                  type="text"
                  value={newSubjectCode}
                  onChange={(e) => setNewSubjectCode(e.target.value)}
                  placeholder={t.courseCodePlaceholder}
                  className="w-full liquid-glass-input rounded-xl px-3.5 py-2.5 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-4">
                <label
                  htmlFor="subj-midterm"
                  className="block text-xs text-slate-300 mb-1"
                >
                  {t.midtermDateLabel}
                </label>
                <input
                  id="subj-midterm"
                  type="date"
                  aria-label="New subject midterm exam date"
                  value={newMidtermDate}
                  onChange={(e) => setNewMidtermDate(e.target.value)}
                  className="w-full liquid-glass-input rounded-xl px-3 py-2 text-xs font-mono-tabular"
                />
              </div>
              <div className="sm:col-span-4">
                <label
                  htmlFor="subj-final"
                  className="block text-xs text-slate-300 mb-1"
                >
                  {t.finalDateLabel}
                </label>
                <input
                  id="subj-final"
                  type="date"
                  aria-label="New subject final exam date"
                  value={newFinalDate}
                  onChange={(e) => setNewFinalDate(e.target.value)}
                  className="w-full liquid-glass-input rounded-xl px-3 py-2 text-xs font-mono-tabular"
                />
              </div>
              <div className="sm:col-span-4 flex justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto liquid-glass-btn-primary px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.addSubjectBtn}</span>
                </button>
              </div>
            </div>
            {subjectError && (
              <p className="text-xs text-rose-300" role="alert">
                {subjectError}
              </p>
            )}
          </form>

          {/* Subjects List */}
          <div className="divide-y divide-white/10">
            {workspace.subjects.length === 0 ? (
              <p className="text-sm text-slate-300 py-6 text-center">
                {t.noSubjectsYet}
              </p>
            ) : (
              workspace.subjects.map((subject) => {
                const hasMidterm = Boolean(subject.midtermDate);
                const hasFinal = Boolean(subject.finalDate);
                const daysToMidterm = hasMidterm
                  ? calculateDaysUntil(subject.midtermDate, todayIso)
                  : 0;
                const daysToFinal = hasFinal
                  ? calculateDaysUntil(subject.finalDate, todayIso)
                  : 0;
                const pdfCount = workspace.documents.filter(
                  (d) => d.subjectId === subject.id
                ).length;
                const exCount = workspace.exercises.filter(
                  (e) => e.subjectId === subject.id
                ).length;

                return (
                  <div
                    key={subject.id}
                    className="py-4 first:pt-1 last:pb-1 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-base font-semibold text-white">
                          {subject.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-sky-200/90 mt-1">
                          <span className="font-mono-tabular font-semibold">
                            {subject.code}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {pdfCount} {t.pdfsCountLabel}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {exCount} {t.exercisesCountLabel}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular">
                            {t.midtermInLabel}{' '}
                            {!hasMidterm
                              ? t.dateNotSet
                              : daysToMidterm >= 0
                                ? `${daysToMidterm}d`
                                : t.pastLabel}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular">
                            {t.finalInLabel}{' '}
                            {!hasFinal
                              ? t.dateNotSet
                              : daysToFinal >= 0
                                ? `${daysToFinal}d`
                                : t.pastLabel}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteSubject(subject.id)}
                        aria-label={`Remove subject ${subject.name}`}
                        className="liquid-glass-btn p-2 rounded-xl text-slate-300 hover:text-rose-300 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor={`midterm-${subject.id}`}
                          className="text-xs text-slate-300 whitespace-nowrap"
                        >
                          {t.midtermShort}
                        </label>
                        <input
                          id={`midterm-${subject.id}`}
                          type="date"
                          value={subject.midtermDate}
                          onChange={(e) =>
                            handleUpdateSubjectDate(
                              subject.id,
                              'midtermDate',
                              e.target.value
                            )
                          }
                          className="liquid-glass-input rounded-xl px-3 py-1.5 text-xs font-mono-tabular"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <label
                          htmlFor={`final-${subject.id}`}
                          className="text-xs text-slate-300 whitespace-nowrap"
                        >
                          {t.finalShort}
                        </label>
                        <input
                          id={`final-${subject.id}`}
                          type="date"
                          value={subject.finalDate}
                          onChange={(e) =>
                            handleUpdateSubjectDate(
                              subject.id,
                              'finalDate',
                              e.target.value
                            )
                          }
                          className="liquid-glass-input rounded-xl px-3 py-1.5 text-xs font-mono-tabular"
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 5 cols: Reminders for Upcoming Assignment Deadlines & Study Milestones */}
        <div className="lg:col-span-5 liquid-glass rounded-[28px] p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-sky-300 shrink-0" />
                <h2 className="text-lg font-bold text-white">
                  {t.remindersSectionTitle}
                </h2>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {t.remindersSectionSubtitle}
              </p>
            </div>
          </div>

          {/* Add Reminder Form */}
          <form
            onSubmit={handleAddReminder}
            noValidate
            className="liquid-glass-subtle rounded-2xl p-4 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-7">
                <label htmlFor="rem-title" className="sr-only">
                  Reminder Title
                </label>
                <input
                  id="rem-title"
                  type="text"
                  value={newReminderTitle}
                  onChange={(e) => setNewReminderTitle(e.target.value)}
                  placeholder={t.reminderInputPlaceholder}
                  className="w-full liquid-glass-input rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div className="sm:col-span-5">
                <label htmlFor="rem-subject" className="sr-only">
                  Reminder Subject
                </label>
                <select
                  id="rem-subject"
                  value={newReminderSubjectId}
                  onChange={(e) => setNewReminderSubjectId(e.target.value)}
                  className="w-full liquid-glass-input rounded-xl px-3 py-2 text-xs"
                >
                  {workspace.subjects.length === 0 ? (
                    <option value="" className="bg-slate-900 text-slate-300">
                      {t.dateNotSet}
                    </option>
                  ) : (
                    workspace.subjects.map((s) => (
                      <option
                        key={s.id}
                        value={s.id}
                        className="bg-slate-900 text-white"
                      >
                        {s.code} · {s.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <label htmlFor="rem-category" className="sr-only">
                  Reminder Type
                </label>
                <select
                  id="rem-category"
                  value={newReminderCategory}
                  onChange={(e) =>
                    setNewReminderCategory(
                      e.target.value as 'assignment' | 'milestone' | 'midterm' | 'final'
                    )
                  }
                  className="liquid-glass-input rounded-xl px-2.5 py-1.5 text-xs"
                >
                  <option value="assignment" className="bg-slate-900 text-white">
                    {t.catAssignment}
                  </option>
                  <option value="milestone" className="bg-slate-900 text-white">
                    {t.catMilestone}
                  </option>
                  <option value="midterm" className="bg-slate-900 text-white">
                    {t.catMidterm}
                  </option>
                  <option value="final" className="bg-slate-900 text-white">
                    {t.catFinal}
                  </option>
                </select>

                <label htmlFor="rem-date" className="sr-only">
                  Due Date
                </label>
                <input
                  id="rem-date"
                  type="date"
                  aria-label="Reminder due date"
                  value={newReminderDate}
                  onChange={(e) => setNewReminderDate(e.target.value)}
                  className="liquid-glass-input rounded-xl px-2.5 py-1.5 text-xs font-mono-tabular"
                />
              </div>

              <button
                type="submit"
                className="liquid-glass-btn-primary px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.addReminderBtn}</span>
              </button>
            </div>
            {reminderError && (
              <p className="text-xs text-rose-300" role="alert">
                {reminderError}
              </p>
            )}
          </form>

          {/* Reminders List */}
          <div className="divide-y divide-white/10">
            {sortedReminders.length === 0 ? (
              <p className="text-sm text-slate-300 py-6 text-center">
                {t.noRemindersYet}
              </p>
            ) : (
              sortedReminders.map((rem) => {
                const daysLeft = calculateDaysUntil(rem.dueDate, todayIso);
                const subj = workspace.subjects.find((s) => s.id === rem.subjectId);
                const urgencyLabel =
                  daysLeft < 0
                    ? t.overdueLabel
                    : daysLeft === 0
                      ? t.dueTodayLabel
                      : `${t.inDaysPrefix} ${daysLeft}d`;

                return (
                  <div
                    key={rem.id}
                    className="py-3.5 first:pt-1 last:pb-1 flex items-start justify-between gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleReminder(rem.id)}
                      className="flex items-start gap-3 text-left group"
                    >
                      {rem.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-300 mt-0.5 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-400 group-hover:text-sky-300 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            rem.completed
                              ? 'line-through text-slate-400'
                              : 'text-white'
                          }`}
                        >
                          {rem.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-300 mt-0.5">
                          <span>{subj?.code || 'Course'}</span>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize">{rem.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular">{rem.dueDate}</span>
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 text-xs font-mono-tabular shrink-0">
                      <Clock className="w-3.5 h-3.5 text-sky-300" />
                      <span
                        className={
                          rem.completed
                            ? 'text-slate-400'
                            : daysLeft <= 3
                              ? 'text-amber-300 font-semibold'
                              : 'text-sky-200'
                        }
                      >
                        {rem.completed ? t.doneLabel : urgencyLabel}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
