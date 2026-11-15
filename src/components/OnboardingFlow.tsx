import React, { useState } from 'react';
import { BookOpen, GraduationCap, Sparkles, UserCheck, ArrowRight } from 'lucide-react';
import { AccountWorkspaceData, StudentProfile } from '../types/study';
import { AppLanguage, AppTheme, TRANSLATIONS } from '../utils/i18n';
import {
  createEmptyWorkspaceData,
  formatIsoDate,
  validateStudentProfile,
} from '../utils/studyLogic';
import { LanguageToggle, ThemeToggle } from './GlassPrimitives';

interface OnboardingFlowProps {
  existingAccounts: Record<string, AccountWorkspaceData>;
  onCompleteOnboarding: (workspace: AccountWorkspaceData) => void;
  onSelectExistingAccount: (username: string) => void;
  language: AppLanguage;
  onChangeLanguage: (lang: AppLanguage) => void;
  theme: AppTheme;
  onToggleTheme: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  existingAccounts,
  onCompleteOnboarding,
  onSelectExistingAccount,
  language,
  onChangeLanguage,
  theme,
  onToggleTheme,
}) => {
  const t = TRANSLATIONS[language];
  const [username, setUsername] = useState('');
  const [university, setUniversity] = useState('');
  const [faculty, setFaculty] = useState('');
  const [major, setMajor] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [currentSemester, setCurrentSemester] = useState('');
  const [initialSubjectsText, setInitialSubjectsText] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof StudentProfile, string>>>({});

  const existingList = Object.values(existingAccounts);

  const handleFillSample = () => {
    if (language === 'ro') {
      setUsername('andrei_popescu');
      setUniversity('Universitatea Politehnica din București');
      setFaculty('Facultatea de Automatică și Calculatoare');
      setMajor('Calculatoare și Tehnologia Informației');
      setYearOfStudy('Anul 3 (Licență)');
      setCurrentSemester('Semestrul I (Toamnă 2026)');
      setInitialSubjectsText('');
    } else {
      setUsername('elena_vance');
      setUniversity('ETH Zurich');
      setFaculty('Department of Computer Science');
      setMajor('Computer Science & Machine Intelligence');
      setYearOfStudy('Year 3 (Junior)');
      setCurrentSemester('Fall Semester 2026');
      setInitialSubjectsText('');
    }
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const todayIso = formatIsoDate(new Date());
    const candidateProfile: StudentProfile = {
      username: username.trim(),
      university: university.trim(),
      faculty: faculty.trim(),
      major: major.trim(),
      yearOfStudy: yearOfStudy.trim(),
      currentSemester: currentSemester.trim(),
      createdAt: todayIso,
    };

    const validation = validateStudentProfile(candidateProfile, language);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    const emptyWorkspace = createEmptyWorkspaceData(todayIso, candidateProfile, language);

    const customSubjectNames = initialSubjectsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (customSubjectNames.length > 0) {
      const accents: Array<'cyan' | 'indigo' | 'violet' | 'emerald' | 'amber' | 'rose'> = [
        'cyan',
        'indigo',
        'violet',
        'emerald',
        'amber',
        'rose',
      ];
      const customSubjects = customSubjectNames.map((name, idx) => ({
        id: `subj-custom-${idx + 1}`,
        name,
        code: `CRS-${101 + idx}`,
        midtermDate: '',
        finalDate: '',
        colorAccent: accents[idx % accents.length],
        credits: 5,
        masteryPercent: 0,
      }));

      onCompleteOnboarding({
        ...emptyWorkspace,
        profile: candidateProfile,
        subjects: customSubjects,
      });
      return;
    }

    onCompleteOnboarding(emptyWorkspace);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center px-4 py-10 relative z-10">
      <div className="w-full max-w-3xl liquid-glass rounded-[32px] p-6 sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/15">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl liquid-glass-btn-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Stuvyra
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <ThemeToggle
              theme={theme}
              onToggleTheme={onToggleTheme}
              language={language}
            />
            <LanguageToggle
              language={language}
              onChangeLanguage={onChangeLanguage}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-5 pb-6 border-b border-white/15">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {t.onboardTitle}
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              {t.onboardSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={handleFillSample}
            className="liquid-glass-btn px-4 py-2.5 rounded-2xl text-xs font-semibold text-sky-200 flex items-center gap-2 whitespace-nowrap shrink-0 self-start sm:self-center"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-300" />
            <span>{t.fillSampleProfile}</span>
          </button>
        </div>

        {existingList.length > 0 && (
          <div className="mt-6 liquid-glass-subtle rounded-2xl p-4">
            <p className="text-xs font-medium text-slate-300 mb-3">
              {t.savedAccountsTitle}
            </p>
            <div className="flex flex-wrap gap-2.5">
              {existingList.map((acct) => (
                <button
                  key={acct.profile.username}
                  type="button"
                  onClick={() => onSelectExistingAccount(acct.profile.username)}
                  className="liquid-glass-btn px-3.5 py-2 rounded-xl text-xs font-medium text-white flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <UserCheck className="w-3.5 h-3.5 text-sky-300" />
                  <span>@{acct.profile.username}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-300">{acct.profile.university}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="onboard-username"
                className="block text-xs font-semibold text-slate-200 mb-2"
              >
                {t.usernameLabel}
              </label>
              <input
                id="onboard-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t.usernamePlaceholder}
                className="w-full liquid-glass-input rounded-2xl px-4 py-3 text-sm"
              />
              {errors.username && (
                <p className="text-xs text-rose-300 mt-1.5" role="alert">
                  {errors.username}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="onboard-university"
                className="block text-xs font-semibold text-slate-200 mb-2"
              >
                {t.universityLabel}
              </label>
              <input
                id="onboard-university"
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder={t.universityPlaceholder}
                className="w-full liquid-glass-input rounded-2xl px-4 py-3 text-sm"
              />
              {errors.university && (
                <p className="text-xs text-rose-300 mt-1.5" role="alert">
                  {errors.university}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="onboard-faculty"
                className="block text-xs font-semibold text-slate-200 mb-2"
              >
                {t.facultyLabel}
              </label>
              <input
                id="onboard-faculty"
                type="text"
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                placeholder={t.facultyPlaceholder}
                className="w-full liquid-glass-input rounded-2xl px-4 py-3 text-sm"
              />
              {errors.faculty && (
                <p className="text-xs text-rose-300 mt-1.5" role="alert">
                  {errors.faculty}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="onboard-major"
                className="block text-xs font-semibold text-slate-200 mb-2"
              >
                {t.majorLabel}
              </label>
              <input
                id="onboard-major"
                type="text"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                placeholder={t.majorPlaceholder}
                className="w-full liquid-glass-input rounded-2xl px-4 py-3 text-sm"
              />
              {errors.major && (
                <p className="text-xs text-rose-300 mt-1.5" role="alert">
                  {errors.major}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="onboard-year"
                className="block text-xs font-semibold text-slate-200 mb-2"
              >
                {t.yearLabel}
              </label>
              <select
                id="onboard-year"
                value={yearOfStudy}
                onChange={(e) => setYearOfStudy(e.target.value)}
                className="w-full liquid-glass-input rounded-2xl px-4 py-3 text-sm"
              >
                <option value="" className="bg-slate-900 text-slate-300">
                  {t.yearSelectPlaceholder}
                </option>
                {t.yearOptions.map((opt) => (
                  <option
                    key={opt}
                    value={opt}
                    className="bg-slate-900 text-white"
                  >
                    {opt}
                  </option>
                ))}
              </select>
              {errors.yearOfStudy && (
                <p className="text-xs text-rose-300 mt-1.5" role="alert">
                  {errors.yearOfStudy}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="onboard-semester"
                className="block text-xs font-semibold text-slate-200 mb-2"
              >
                {t.semesterLabel}
              </label>
              <select
                id="onboard-semester"
                value={currentSemester}
                onChange={(e) => setCurrentSemester(e.target.value)}
                className="w-full liquid-glass-input rounded-2xl px-4 py-3 text-sm"
              >
                <option value="" className="bg-slate-900 text-slate-300">
                  {t.semesterSelectPlaceholder}
                </option>
                {t.semesterOptions.map((opt) => (
                  <option
                    key={opt}
                    value={opt}
                    className="bg-slate-900 text-white"
                  >
                    {opt}
                  </option>
                ))}
              </select>
              {errors.currentSemester && (
                <p className="text-xs text-rose-300 mt-1.5" role="alert">
                  {errors.currentSemester}
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="onboard-subjects"
              className="block text-xs font-semibold text-slate-200 mb-2"
            >
              {t.initialSubjectsLabel}
            </label>
            <input
              id="onboard-subjects"
              type="text"
              value={initialSubjectsText}
              onChange={(e) => setInitialSubjectsText(e.target.value)}
              placeholder={t.initialSubjectsPlaceholder}
              className="w-full liquid-glass-input rounded-2xl px-4 py-3 text-sm"
            />
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <BookOpen className="w-4 h-4 text-sky-300 shrink-0" />
              <span>{t.browserPersistenceNote}</span>
            </div>

            <button
              type="submit"
              className="liquid-glass-btn-primary px-6 py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <span>{t.createAccountBtn}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
