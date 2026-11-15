import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDaysToIso,
  buildSevenDaySeries,
  buildSmoothSvgPath,
  calculateDaysUntil,
  calculateWeeklyTotals,
  createDemoWorkspaceData,
  createEmptyWorkspaceData,
  recordStudyActivity,
  sortRemindersByUrgency,
  validateStudentProfile,
} from './studyLogic';

test('validateStudentProfile enforces all required onboarding fields', () => {
  const emptyCheck = validateStudentProfile({});
  assert.equal(emptyCheck.valid, false);
  assert.ok(emptyCheck.errors.username);
  assert.ok(emptyCheck.errors.university);
  assert.ok(emptyCheck.errors.faculty);
  assert.ok(emptyCheck.errors.major);
  assert.ok(emptyCheck.errors.yearOfStudy);
  assert.ok(emptyCheck.errors.currentSemester);

  const validCheck = validateStudentProfile({
    username: 'elena_vance',
    university: 'ETH Zurich',
    faculty: 'Computer Science',
    major: 'Machine Intelligence',
    yearOfStudy: 'Year 3',
    currentSemester: 'Fall 2026',
  });
  assert.equal(validCheck.valid, true);
  assert.equal(Object.keys(validCheck.errors).length, 0);
});

test('date math helpers calculate ISO offsets and countdown days accurately', () => {
  const base = '2026-10-26';
  const nextWeek = addDaysToIso(base, 7);
  assert.equal(nextWeek, '2026-11-02');
  assert.equal(calculateDaysUntil(nextWeek, base), 7);
  assert.equal(calculateDaysUntil('2026-10-20', base), -6);
});

test('new user workspace starts completely empty with zero pre-populated items or weekly progress', () => {
  const today = '2026-10-26';
  const emptyWorkspace = createDemoWorkspaceData(today);
  assert.equal(emptyWorkspace.subjects.length, 0);
  assert.equal(emptyWorkspace.documents.length, 0);
  assert.equal(emptyWorkspace.exercises.length, 0);
  assert.equal(emptyWorkspace.reminders.length, 0);
  assert.equal(emptyWorkspace.scheduleBlocks.length, 0);
  assert.equal(emptyWorkspace.learningInsights.length, 0);
  assert.equal(emptyWorkspace.examSessions.length, 0);
  assert.equal(Object.keys(emptyWorkspace.dailyLogs).length, 0);
  assert.equal(emptyWorkspace.dailyAiInsight, undefined);
  assert.equal(emptyWorkspace.academicOverview, undefined);

  const series = buildSevenDaySeries(today, emptyWorkspace.dailyLogs);
  assert.equal(series.length, 7);
  assert.equal(series[6].date, today);
  assert.equal(series[6].minutesStudied, 0);
  assert.equal(series[6].exercisesSolved, 0);

  const totals = calculateWeeklyTotals(series);
  assert.equal(totals.totalMinutes, 0);
  assert.equal(totals.totalHoursFormatted, '0m');
  assert.equal(totals.totalExercises, 0);
  assert.equal(totals.activeDays, 0);
});

test('recordStudyActivity immutably updates daily log minutes, exercises, and notes', () => {
  const initial = createEmptyWorkspaceData('2026-10-26').dailyLogs;
  const afterFirst = recordStudyActivity(initial, '2026-10-26', {
    minutes: 45,
    exercises: 2,
    sessions: 1,
    subjectName: 'Numerical Linear Algebra',
    note: 'Solved SVD exercises',
    examScorePercent: 90,
  });

  assert.equal(afterFirst['2026-10-26'].minutesStudied, 45);
  assert.equal(afterFirst['2026-10-26'].exercisesSolved, 2);
  assert.equal(afterFirst['2026-10-26'].subjectsTouched.length, 1);
  assert.equal(afterFirst['2026-10-26'].examScorePercent, 90);
});

test('sortRemindersByUrgency places incomplete earliest deadlines first', () => {
  const sorted = sortRemindersByUrgency([
    {
      id: '1',
      subjectId: 's1',
      title: 'Done item',
      dueDate: '2026-10-25',
      category: 'milestone',
      completed: true,
      priority: 'high',
    },
    {
      id: '2',
      subjectId: 's1',
      title: 'Later active item',
      dueDate: '2026-10-30',
      category: 'assignment',
      completed: false,
      priority: 'medium',
    },
    {
      id: '3',
      subjectId: 's1',
      title: 'Sooner active item',
      dueDate: '2026-10-27',
      category: 'midterm',
      completed: false,
      priority: 'high',
    },
  ]);

  assert.equal(sorted[0].id, '3');
  assert.equal(sorted[1].id, '2');
  assert.equal(sorted[2].id, '1');
});

test('buildSmoothSvgPath generates cubic bezier SVG path string', () => {
  const path = buildSmoothSvgPath([
    { x: 10, y: 100 },
    { x: 50, y: 60 },
    { x: 90, y: 80 },
  ]);
  assert.ok(path.startsWith('M 10.0 100.0 C'));
});

test('Romanian localization formats validation errors and 7-day labels in Romanian', () => {
  const roValidation = validateStudentProfile({}, 'ro');
  assert.equal(roValidation.valid, false);
  assert.equal(roValidation.errors.username, 'Te rugăm să introduci un nume de utilizator.');

  const seriesRo = buildSevenDaySeries('2026-10-26', {}, 'ro');
  assert.equal(seriesRo.length, 7);
  assert.equal(seriesRo[6].shortLabel, 'Lun');
  assert.equal(seriesRo[6].fullLabel, '26 Oct');
});
