import React, { useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { AccountWorkspaceData } from '../types/study';
import { AppLanguage, AppTheme, TRANSLATIONS } from '../utils/i18n';
import {
  addDaysToIso,
  buildSevenDaySeries,
  buildSmoothSvgPath,
  calculateWeeklyTotals,
  formatIsoDate,
  recordStudyActivity,
} from '../utils/studyLogic';

interface WeeklyProgressViewProps {
  workspace: AccountWorkspaceData;
  onUpdateWorkspace: (updater: (prev: AccountWorkspaceData) => AccountWorkspaceData) => void;
  language: AppLanguage;
  theme?: AppTheme;
}

export const WeeklyProgressView: React.FC<WeeklyProgressViewProps> = ({
  workspace,
  onUpdateWorkspace,
  language,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const t = TRANSLATIONS[language];
  const todayIso = formatIsoDate(new Date());
  const [selectedDateIso, setSelectedDateIso] = useState<string>(todayIso);

  // Manual study session log form for selected date
  const [logMinutes, setLogMinutes] = useState('45');
  const [logExercises, setLogExercises] = useState('2');
  const [logSubject, setLogSubject] = useState(
    workspace.subjects[0]?.name || 'Core Subject'
  );
  const [logNote, setLogNote] = useState('');

  const series = buildSevenDaySeries(selectedDateIso, workspace.dailyLogs, language);
  const totals = calculateWeeklyTotals(series);

  const selectedDayLog = workspace.dailyLogs[selectedDateIso] || {
    date: selectedDateIso,
    minutesStudied: 0,
    exercisesSolved: 0,
    sessionsCompleted: 0,
    subjectsTouched: [],
    notes: [],
  };

  // Chart geometry
  const chartWidth = 760;
  const chartHeight = 250;
  const padLeft = 48;
  const padRight = 48;
  const padTop = 28;
  const padBottom = 42;
  const plotWidth = chartWidth - padLeft - padRight;
  const plotHeight = chartHeight - padTop - padBottom;

  const maxMinutes = Math.max(
    120,
    ...series.map((d) => d.minutesStudied)
  );
  const maxExercises = Math.max(
    8,
    ...series.map((d) => d.exercisesSolved)
  );

  const minuteCoords = series.map((item, idx) => {
    const x =
      padLeft +
      (series.length > 1 ? (idx / (series.length - 1)) * plotWidth : plotWidth / 2);
    const y =
      padTop +
      plotHeight -
      (Math.min(item.minutesStudied, maxMinutes) / maxMinutes) * plotHeight;
    return { x, y, item };
  });

  const exerciseCoords = series.map((item, idx) => {
    const x =
      padLeft +
      (series.length > 1 ? (idx / (series.length - 1)) * plotWidth : plotWidth / 2);
    const y =
      padTop +
      plotHeight -
      (Math.min(item.exercisesSolved, maxExercises) / maxExercises) * plotHeight;
    return { x, y, item };
  });

  const smoothMinutesPath = buildSmoothSvgPath(minuteCoords);
  const smoothExercisesPath = buildSmoothSvgPath(exerciseCoords);

  const areaMinutesPath =
    minuteCoords.length > 1
      ? `${smoothMinutesPath} L ${minuteCoords[minuteCoords.length - 1].x.toFixed(1)} ${(
          padTop + plotHeight
        ).toFixed(1)} L ${minuteCoords[0].x.toFixed(1)} ${(
          padTop + plotHeight
        ).toFixed(1)} Z`
      : '';

  const handleLogSession = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = Math.max(0, Number(logMinutes) || 0);
    const exs = Math.max(0, Number(logExercises) || 0);
    if (mins === 0 && exs === 0) return;

    onUpdateWorkspace((prev) => ({
      ...prev,
      dailyLogs: recordStudyActivity(prev.dailyLogs, selectedDateIso, {
        minutes: mins,
        exercises: exs,
        sessions: 1,
        subjectName: logSubject,
        note:
          logNote.trim() ||
          (language === 'ro'
            ? `Sesiune înregistrată: ${mins}m studiu & ${exs} exerciții rezolvate la ${logSubject}.`
            : `Logged ${mins}m study session & ${exs} solved exercises in ${logSubject}.`),
      }),
    }));
    setLogNote('');
  };

  return (
    <div className="space-y-8">
      {/* Header + Date Selector Controls */}
      <div className="liquid-glass rounded-[28px] p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {t.weeklyTitle}
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            {t.weeklySubtitle}
          </p>
        </div>

        {/* Date Selector Bar */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDateIso(addDaysToIso(selectedDateIso, -1))}
              aria-label="Previous day"
              className="liquid-glass-btn p-2.5 rounded-xl text-slate-200 shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <label
              htmlFor="history-date-picker"
              className="sr-only sm:not-sr-only text-xs font-medium text-slate-300 whitespace-nowrap"
            >
              {t.inspectDateLabel}
            </label>
            <input
              id="history-date-picker"
              type="date"
              aria-label="Inspect Date"
              value={selectedDateIso}
              onChange={(e) =>
                e.target.value && setSelectedDateIso(e.target.value)
              }
              className="liquid-glass-input rounded-xl px-3 py-2 text-xs font-mono-tabular"
            />

            <button
              type="button"
              onClick={() => setSelectedDateIso(addDaysToIso(selectedDateIso, 1))}
              aria-label="Next day"
              className="liquid-glass-btn p-2.5 rounded-xl text-slate-200 shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {selectedDateIso !== todayIso && (
            <button
              type="button"
              onClick={() => setSelectedDateIso(todayIso)}
              className="liquid-glass-btn-primary px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0"
            >
              {t.jumpToTodayBtn}
            </button>
          )}
        </div>
      </div>

      {/* Weekly Summary KPIs + Smooth Chart */}
      <div className="liquid-glass rounded-[28px] p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-6 border-b border-white/15">
          <div>
            <p className="text-xs text-slate-300">{t.kpi7DayStudyTime}</p>
            <p className="text-2xl font-bold text-white font-mono-tabular mt-1">
              {totals.totalHoursFormatted}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-300">{t.kpi7DayExercises}</p>
            <p className="text-2xl font-bold text-white font-mono-tabular mt-1">
              {totals.totalExercises}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-300">{t.kpiDailyAverage}</p>
            <p className="text-2xl font-bold text-white font-mono-tabular mt-1">
              {totals.averageDailyMinutes}m / {t.daySuffix}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-300">{t.kpiActiveStudyDays}</p>
            <p className="text-2xl font-bold text-white font-mono-tabular mt-1">
              {totals.activeDays} / 7 {t.daysSuffix}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-300" />
            <h2 className="text-base font-bold text-white">
              {t.curveTitle}
            </h2>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <span className="text-sky-300 font-semibold">
              {t.legendMinutes}
            </span>
            <span className="text-indigo-300 font-semibold">
              {t.legendExercises}
            </span>
          </div>
        </div>

        {/* Smooth SVG Dual-Metric Chart */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-64 overflow-visible"
            role="img"
            aria-label="Smooth weekly chart of time spent studying and exercises solved"
          >
            <defs>
              <linearGradient id="minutesAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.38" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal grid lines */}
            {[0, 0.5, 1].map((ratio, idx) => {
              const y = padTop + ratio * plotHeight;
              const minVal = Math.round((1 - ratio) * maxMinutes);
              return (
                <g key={idx}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={chartWidth - padRight}
                    y2={y}
                    stroke={isLight ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.1)'}
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padLeft - 10}
                    y={y + 4}
                    textAnchor="end"
                    fill={isLight ? 'rgba(51,65,85,0.85)' : 'rgba(203,213,225,0.7)'}
                    fontSize="11"
                  >
                    {minVal}m
                  </text>
                </g>
              );
            })}

            {/* Area fill under Study Minutes */}
            {areaMinutesPath && (
              <path d={areaMinutesPath} fill="url(#minutesAreaGrad)" />
            )}

            {/* Smooth cubic bezier path for Study Minutes */}
            <path
              d={smoothMinutesPath}
              fill="none"
              stroke={isLight ? '#0284c7' : '#38bdf8'}
              strokeWidth="3.2"
              strokeLinecap="round"
            />

            {/* Smooth cubic bezier path for Exercises Solved */}
            <path
              d={smoothExercisesPath}
              fill="none"
              stroke={isLight ? '#7e22ce' : '#c084fc'}
              strokeWidth="2.6"
              strokeDasharray="6 4"
              strokeLinecap="round"
            />

            {/* Interactive Data Points */}
            {minuteCoords.map((pt, idx) => {
              const exPt = exerciseCoords[idx];
              const isSelected = pt.item.date === selectedDateIso;
              return (
                <g
                  key={pt.item.date}
                  className="cursor-pointer"
                  onClick={() => setSelectedDateIso(pt.item.date)}
                >
                  {isSelected && (
                    <line
                      x1={pt.x}
                      y1={padTop}
                      x2={pt.x}
                      y2={padTop + plotHeight}
                      stroke={isLight ? 'rgba(2,132,199,0.45)' : 'rgba(125,211,252,0.45)'}
                      strokeWidth="1.5"
                    />
                  )}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? 6 : 4.5}
                    fill={isLight ? '#ffffff' : '#0f172a'}
                    stroke={isLight ? '#0284c7' : '#38bdf8'}
                    strokeWidth="2.5"
                  />
                  <circle
                    cx={exPt.x}
                    cy={exPt.y}
                    r={isSelected ? 5.5 : 4}
                    fill={isLight ? '#ffffff' : '#0f172a'}
                    stroke={isLight ? '#7e22ce' : '#c084fc'}
                    strokeWidth="2.2"
                  />
                  <text
                    x={pt.x}
                    y={padTop + plotHeight + 20}
                    textAnchor="middle"
                    fill={
                      isSelected
                        ? isLight
                          ? '#0f172a'
                          : '#ffffff'
                        : isLight
                          ? 'rgba(51,65,85,0.9)'
                          : 'rgba(203,213,225,0.85)'
                    }
                    fontWeight={isSelected ? '700' : '500'}
                    fontSize="11"
                  >
                    {pt.item.shortLabel}
                  </text>
                  <text
                    x={pt.x}
                    y={padTop + plotHeight + 34}
                    textAnchor="middle"
                    fill={isLight ? 'rgba(71,85,105,0.85)' : 'rgba(148,163,184,0.8)'}
                    fontSize="10"
                  >
                    {pt.item.fullLabel}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Clickable 7-Day Selector Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-7 gap-2.5 pt-2">
          {series.map((day) => {
            const isSelected = day.date === selectedDateIso;
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedDateIso(day.date)}
                className={`rounded-2xl p-3 text-left transition-all ${
                  isSelected
                    ? 'liquid-glass-btn-primary'
                    : 'liquid-glass-subtle hover:border-white/35'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold">{day.shortLabel}</span>
                  <span className="font-mono-tabular opacity-80">
                    {day.fullLabel}
                  </span>
                </div>
                <p className="text-base font-bold font-mono-tabular mt-1.5">
                  {day.minutesStudied}m
                </p>
                <p className="text-xs opacity-85 font-mono-tabular">
                  {day.exercisesSolved} {t.exercisesWord}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Historical Breakdown + Log Study Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 liquid-glass rounded-[28px] p-6 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/15">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-300" />
                <h2 className="text-lg font-bold text-white">
                  {t.studyRecordForTitle} {selectedDateIso}
                </h2>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {t.studyRecordSubtitle}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono-tabular">
              <div>
                <span className="text-slate-300">{t.studiedShort} </span>
                <span className="font-bold text-white">
                  {selectedDayLog.minutesStudied} min
                </span>
              </div>
              <div>
                <span className="text-slate-300">{t.solvedShort} </span>
                <span className="font-bold text-white">
                  {selectedDayLog.exercisesSolved} ex
                </span>
              </div>
            </div>
          </div>

          {selectedDayLog.subjectsTouched.length > 0 && (
            <div className="text-xs text-sky-200">
              <span className="text-slate-300">{t.subjectsStudiedPrefix} </span>
              {selectedDayLog.subjectsTouched.join(' · ')}
            </div>
          )}

          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold text-slate-300">
              {t.completedSessionsOnTitle} {selectedDateIso}
            </h3>
            {selectedDayLog.notes.length === 0 ? (
              <p className="text-sm text-slate-300 py-4">
                {t.noSessionsOnDate}
              </p>
            ) : (
              <div className="divide-y divide-white/10">
                {selectedDayLog.notes.map((note, idx) => (
                  <div
                    key={idx}
                    className="py-3 first:pt-1 last:pb-1 flex items-start gap-2.5 text-sm text-white"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 mt-0.5 shrink-0" />
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Log Session for Selected Date */}
        <div className="lg:col-span-5 liquid-glass rounded-[28px] p-6 sm:p-8 space-y-5">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-300" />
              <h2 className="text-lg font-bold text-white">
                {t.logSessionForTitle} {selectedDateIso}
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {t.logSessionSubtitle}
            </p>
          </div>

          <form onSubmit={handleLogSession} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="log-minutes-input"
                  className="block text-xs font-semibold text-slate-200 mb-1.5"
                >
                  {t.minutesStudiedLabel}
                </label>
                <input
                  id="log-minutes-input"
                  type="number"
                  min={0}
                  max={600}
                  value={logMinutes}
                  onChange={(e) => setLogMinutes(e.target.value)}
                  className="w-full liquid-glass-input rounded-xl px-3.5 py-2.5 text-sm font-mono-tabular"
                />
              </div>
              <div>
                <label
                  htmlFor="log-exercises-input"
                  className="block text-xs font-semibold text-slate-200 mb-1.5"
                >
                  {t.exercisesSolvedLabel}
                </label>
                <input
                  id="log-exercises-input"
                  type="number"
                  min={0}
                  max={100}
                  value={logExercises}
                  onChange={(e) => setLogExercises(e.target.value)}
                  className="w-full liquid-glass-input rounded-xl px-3.5 py-2.5 text-sm font-mono-tabular"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="log-subject-select"
                className="block text-xs font-semibold text-slate-200 mb-1.5"
              >
                {t.subjectLabel}
              </label>
              <select
                id="log-subject-select"
                value={logSubject}
                onChange={(e) => setLogSubject(e.target.value)}
                className="w-full liquid-glass-input rounded-xl px-3.5 py-2.5 text-sm"
              >
                {workspace.subjects.length === 0 ? (
                  <option
                    value={language === 'ro' ? 'Studiu General' : 'General Study'}
                    className="bg-slate-900 text-white"
                  >
                    {language === 'ro' ? 'Studiu General' : 'General Study'}
                  </option>
                ) : (
                  workspace.subjects.map((s) => (
                    <option
                      key={s.id}
                      value={s.name}
                      className="bg-slate-900 text-white"
                    >
                      {s.code} — {s.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="log-note-input"
                className="block text-xs font-semibold text-slate-200 mb-1.5"
              >
                {t.sessionNoteLabel}
              </label>
              <input
                id="log-note-input"
                type="text"
                value={logNote}
                onChange={(e) => setLogNote(e.target.value)}
                placeholder={t.sessionNotePlaceholder}
                className="w-full liquid-glass-input rounded-xl px-3.5 py-2.5 text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full liquid-glass-btn-primary px-5 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{t.saveStudyLogBtn}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
