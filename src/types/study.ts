export interface StudentProfile {
  username: string;
  university: string;
  faculty: string;
  major: string;
  yearOfStudy: string;
  currentSemester: string;
  createdAt: string;
}

export interface CourseDocument {
  id: string;
  subjectId: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  mimeType: string;
  /** Optional base64 payload (truncated/stored safely for PDF multimodal prompts) */
  base64Data?: string;
  /** Extracted or summarized text / topic notes */
  extractedText: string;
}

export interface FacultyExercise {
  id: string;
  subjectId: string;
  title: string;
  prompt: string;
  difficulty: 'Foundation' | 'Intermediate' | 'Advanced';
  solved: boolean;
  lastHint?: string;
  userNotes?: string;
}

export interface SubjectItem {
  id: string;
  name: string;
  code: string;
  professor?: string;
  midtermDate: string; // YYYY-MM-DD
  finalDate: string;   // YYYY-MM-DD
  colorAccent: 'cyan' | 'indigo' | 'violet' | 'emerald' | 'amber' | 'rose';
  credits: number;
  masteryPercent: number;
}

export interface StudyReminder {
  id: string;
  subjectId: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
  category: 'assignment' | 'milestone' | 'midterm' | 'final';
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface StudyScheduleBlock {
  id: string;
  dayLabel: string; // e.g., "Monday", "Tuesday" or YYYY-MM-DD
  date: string;     // YYYY-MM-DD
  subjectId: string;
  subjectName: string;
  topic: string;
  durationMinutes: number;
  focusType: 'PDF Review' | 'Exercise Drill' | 'Exam Prep' | 'Concept Synthesis';
  completed: boolean;
}

export interface LearningInsight {
  id: string;
  subjectName: string;
  title: string;
  actionableAdvice: string;
  impactLevel: 'High Impact' | 'Quick Win' | 'Exam Critical';
}

export interface SimulatedExamQuestion {
  id: string;
  questionNumber: number;
  topic: string;
  difficulty: 'Foundation' | 'Intermediate' | 'Advanced';
  prompt: string;
  points: number;
  sampleSolution: string;
  gradingCriteria: string;
  userAnswer?: string;
  aiHint?: string;
  awardedPoints?: number;
  aiFeedback?: string;
}

export interface SimulatedExamSession {
  id: string;
  subjectId: string;
  subjectName: string;
  createdAt: string;
  durationMinutes: number;
  questions: SimulatedExamQuestion[];
  submitted: boolean;
  totalScore?: number;
  maxScore: number;
  overallFeedback?: string;
}

export interface DailyStudyLog {
  date: string; // YYYY-MM-DD
  minutesStudied: number;
  exercisesSolved: number;
  sessionsCompleted: number;
  subjectsTouched: string[];
  notes: string[];
  examScorePercent?: number;
}

export interface DailyAiInsight {
  date: string;
  generatedAt: string;
  summaryOfDay: string;
  nextSessionSuggestion: string;
  focusSubject: string;
  recommendedMinutes: number;
}

export interface AcademicOverviewResult {
  welcomeHeadline: string;
  semesterStrategy: string;
  suggestedReminders: Array<{
    subjectName: string;
    title: string;
    dueDate: string;
    category: 'assignment' | 'milestone' | 'midterm' | 'final';
    priority: 'high' | 'medium' | 'low';
  }>;
}

export interface AccountWorkspaceData {
  profile: StudentProfile;
  subjects: SubjectItem[];
  documents: CourseDocument[];
  exercises: FacultyExercise[];
  reminders: StudyReminder[];
  scheduleBlocks: StudyScheduleBlock[];
  learningInsights: LearningInsight[];
  examSessions: SimulatedExamSession[];
  dailyLogs: Record<string, DailyStudyLog>; // keyed by YYYY-MM-DD
  dailyAiInsight?: DailyAiInsight;
  academicOverview?: AcademicOverviewResult;
}
