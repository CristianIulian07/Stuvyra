import {
  AccountWorkspaceData,
  DailyStudyLog,
  StudentProfile,
  StudyReminder,
} from '../types/study';

export function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysToIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + days);
  return formatIsoDate(dt);
}

export function calculateDaysUntil(targetIsoDate: string, fromIsoDate: string): number {
  if (!targetIsoDate || !fromIsoDate) return 0;
  const [ty, tm, td] = targetIsoDate.split('-').map(Number);
  const [fy, fm, fd] = fromIsoDate.split('-').map(Number);
  const target = Date.UTC(ty, (tm || 1) - 1, td || 1);
  const from = Date.UTC(fy, (fm || 1) - 1, fd || 1);
  return Math.round((target - from) / (1000 * 60 * 60 * 24));
}

export interface OnboardingValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof StudentProfile, string>>;
}

export function validateStudentProfile(
  profile: Partial<StudentProfile>,
  lang: 'en' | 'ro' = 'en'
): OnboardingValidationResult {
  const errors: Partial<Record<keyof StudentProfile, string>> = {};
  const isRo = lang === 'ro';

  const username = (profile.username || '').trim();
  if (!username) {
    errors.username = isRo
      ? 'Te rugăm să introduci un nume de utilizator.'
      : 'Please enter a username for your account.';
  } else if (username.length < 2) {
    errors.username = isRo
      ? 'Numele de utilizator trebuie să aibă cel puțin 2 caractere.'
      : 'Username must be at least 2 characters.';
  }

  if (!(profile.university || '').trim()) {
    errors.university = isRo
      ? 'Te rugăm să introduci numele universității.'
      : 'Please enter your university name.';
  }
  if (!(profile.faculty || '').trim()) {
    errors.faculty = isRo
      ? 'Te rugăm să introduci numele facultății.'
      : 'Please enter your faculty or school name.';
  }
  if (!(profile.major || '').trim()) {
    errors.major = isRo
      ? 'Te rugăm să introduci specializarea.'
      : 'Please enter your major or degree program.';
  }
  if (!(profile.yearOfStudy || '').trim()) {
    errors.yearOfStudy = isRo
      ? 'Te rugăm să selectezi anul de studiu.'
      : 'Please select your year of study.';
  }
  if (!(profile.currentSemester || '').trim()) {
    errors.currentSemester = isRo
      ? 'Te rugăm să selectezi semestrul curent.'
      : 'Please select your current semester.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface WeeklyDayPoint {
  date: string;
  shortLabel: string; // e.g., "Mon" or "Lun"
  fullLabel: string;  // e.g., "Oct 26" or "26 Oct"
  minutesStudied: number;
  exercisesSolved: number;
  sessionsCompleted: number;
}

const SHORT_WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHORT_WEEKDAYS_RO = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];
const SHORT_MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SHORT_MONTHS_RO = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function buildSevenDaySeries(
  anchorIsoDate: string,
  dailyLogs: Record<string, DailyStudyLog>,
  lang: 'en' | 'ro' = 'en'
): WeeklyDayPoint[] {
  const series: WeeklyDayPoint[] = [];
  const weekdays = lang === 'ro' ? SHORT_WEEKDAYS_RO : SHORT_WEEKDAYS_EN;
  const months = lang === 'ro' ? SHORT_MONTHS_RO : SHORT_MONTHS_EN;

  for (let offset = -6; offset <= 0; offset++) {
    const iso = addDaysToIso(anchorIsoDate, offset);
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    const log = dailyLogs[iso];
    series.push({
      date: iso,
      shortLabel: weekdays[dt.getDay()],
      fullLabel:
        lang === 'ro'
          ? `${dt.getDate()} ${months[dt.getMonth()]}`
          : `${months[dt.getMonth()]} ${dt.getDate()}`,
      minutesStudied: log ? log.minutesStudied : 0,
      exercisesSolved: log ? log.exercisesSolved : 0,
      sessionsCompleted: log ? log.sessionsCompleted : 0,
    });
  }
  return series;
}

export function calculateWeeklyTotals(series: WeeklyDayPoint[]): {
  totalMinutes: number;
  totalHoursFormatted: string;
  totalExercises: number;
  totalSessions: number;
  averageDailyMinutes: number;
  activeDays: number;
} {
  const totalMinutes = series.reduce((acc, item) => acc + item.minutesStudied, 0);
  const totalExercises = series.reduce((acc, item) => acc + item.exercisesSolved, 0);
  const totalSessions = series.reduce((acc, item) => acc + item.sessionsCompleted, 0);
  const activeDays = series.filter((item) => item.minutesStudied > 0 || item.exercisesSolved > 0).length;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const totalHoursFormatted = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  const averageDailyMinutes = series.length > 0 ? Math.round(totalMinutes / series.length) : 0;

  return {
    totalMinutes,
    totalHoursFormatted,
    totalExercises,
    totalSessions,
    averageDailyMinutes,
    activeDays,
  };
}

export function recordStudyActivity(
  dailyLogs: Record<string, DailyStudyLog>,
  isoDate: string,
  delta: {
    minutes?: number;
    exercises?: number;
    sessions?: number;
    subjectName?: string;
    note?: string;
    examScorePercent?: number;
  }
): Record<string, DailyStudyLog> {
  const existing: DailyStudyLog = dailyLogs[isoDate] || {
    date: isoDate,
    minutesStudied: 0,
    exercisesSolved: 0,
    sessionsCompleted: 0,
    subjectsTouched: [],
    notes: [],
  };

  const nextSubjects = delta.subjectName && !existing.subjectsTouched.includes(delta.subjectName)
    ? [...existing.subjectsTouched, delta.subjectName]
    : existing.subjectsTouched;

  const nextNotes = delta.note
    ? [delta.note, ...existing.notes].slice(0, 12)
    : existing.notes;

  const updated: DailyStudyLog = {
    ...existing,
    minutesStudied: Math.max(0, existing.minutesStudied + (delta.minutes || 0)),
    exercisesSolved: Math.max(0, existing.exercisesSolved + (delta.exercises || 0)),
    sessionsCompleted: Math.max(0, existing.sessionsCompleted + (delta.sessions || 0)),
    subjectsTouched: nextSubjects,
    notes: nextNotes,
    examScorePercent:
      delta.examScorePercent !== undefined ? delta.examScorePercent : existing.examScorePercent,
  };

  return {
    ...dailyLogs,
    [isoDate]: updated,
  };
}

export function buildSmoothSvgPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const controlX1 = curr.x + (next.x - curr.x) * 0.45;
    const controlY1 = curr.y;
    const controlX2 = curr.x + (next.x - curr.x) * 0.55;
    const controlY2 = next.y;
    path += ` C ${controlX1.toFixed(1)} ${controlY1.toFixed(1)}, ${controlX2.toFixed(1)} ${controlY2.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
  }
  return path;
}

export function sortRemindersByUrgency(reminders: StudyReminder[]): StudyReminder[] {
  return [...reminders].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    return a.dueDate.localeCompare(b.dueDate);
  });
}

export function createEmptyWorkspaceData(
  todayIso: string,
  customProfile?: StudentProfile,
  lang: 'en' | 'ro' = 'en'
): AccountWorkspaceData {
  const isRo = lang === 'ro';
  const profile: StudentProfile = customProfile || {
    username: isRo ? 'student_nou' : 'new_student',
    university: isRo ? 'Universitatea Politehnica din București' : 'University',
    faculty: isRo ? 'Facultatea de Automatică și Calculatoare' : 'Faculty',
    major: isRo ? 'Calculatoare și Tehnologia Informației' : 'Computer Science',
    yearOfStudy: isRo ? 'Anul 1 (Licență)' : 'Year 1 (Freshman)',
    currentSemester: isRo ? 'Semestrul I (Toamnă 2026)' : 'Fall Semester 2026',
    createdAt: todayIso,
  };

  return {
    profile,
    subjects: [],
    documents: [],
    exercises: [],
    reminders: [],
    scheduleBlocks: [],
    learningInsights: [],
    examSessions: [],
    dailyLogs: {},
    dailyAiInsight: undefined,
    academicOverview: undefined,
  };
}

export function createDemoWorkspaceData(
  todayIso: string,
  customProfile?: StudentProfile,
  lang: 'en' | 'ro' = 'en'
): AccountWorkspaceData {
  return createEmptyWorkspaceData(todayIso, customProfile, lang);
}
