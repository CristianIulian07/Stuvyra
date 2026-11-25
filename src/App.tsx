/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { AccountWorkspaceData } from './types/study';
import {
  AppLanguage,
  AppTheme,
  getSavedLanguage,
  getSavedTheme,
  saveLanguagePreference,
  saveThemePreference,
  TRANSLATIONS,
} from './utils/i18n';
import {
  exportWorkspaceAsJson,
  fetchServerWorkspaces,
  initializeWorkspaceFromBrowser,
  loadAllAccounts,
  saveAccountWorkspace,
  saveAllAccounts,
  setActiveUsername,
} from './utils/storage';
import { Download } from 'lucide-react';
import { LanguageToggle, ThemeToggle } from './components/GlassPrimitives';
import { OnboardingFlow } from './components/OnboardingFlow';
import { DashboardView } from './components/DashboardView';
import { MaterialsScheduleView } from './components/MaterialsScheduleView';
import { ExamSimulatorView } from './components/ExamSimulatorView';
import { WeeklyProgressView } from './components/WeeklyProgressView';

type ActiveTab = 'dashboard' | 'materials' | 'simulator' | 'weekly';

export default function App() {
  const [workspace, setWorkspace] = useState<AccountWorkspaceData | null>(null);
  const [allAccounts, setAllAccounts] = useState<
    Record<string, AccountWorkspaceData>
  >({});
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [language, setLanguage] = useState<AppLanguage>('en');
  const [theme, setTheme] = useState<AppTheme>('dark');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const savedLang = getSavedLanguage();
    setLanguage(savedLang);
    const savedTheme = getSavedTheme();
    setTheme(savedTheme);
    const { activeWorkspace, allAccounts: loaded } =
      initializeWorkspaceFromBrowser();
    setWorkspace(activeWorkspace);
    setAllAccounts(loaded);
    setInitialized(true);

    fetchServerWorkspaces().then((serverAccounts) => {
      if (Object.keys(serverAccounts).length > 0) {
        const merged = { ...serverAccounts, ...loadAllAccounts() };
        saveAllAccounts(merged);
        setAllAccounts(merged);
      }
    });
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark');
      document.body.style.backgroundColor =
        theme === 'light' ? '#eef6ff' : '#070b19';
    }
  }, [theme]);

  const handleChangeLanguage = (nextLang: AppLanguage) => {
    setLanguage(nextLang);
    saveLanguagePreference(nextLang);
  };

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const next: AppTheme = prev === 'dark' ? 'light' : 'dark';
      saveThemePreference(next);
      return next;
    });
  };

  const handleCompleteOnboarding = (newWorkspace: AccountWorkspaceData) => {
    saveAccountWorkspace(newWorkspace);
    setWorkspace(newWorkspace);
    setAllAccounts(loadAllAccounts());
    setActiveTab('dashboard');
  };

  const handleSelectExistingAccount = (username: string) => {
    const accounts = loadAllAccounts();
    const target = accounts[username];
    if (target) {
      setActiveUsername(username);
      setWorkspace(target);
      setAllAccounts(accounts);
      setActiveTab('dashboard');
    }
  };

  const handleUpdateWorkspace = (
    updater: (prev: AccountWorkspaceData) => AccountWorkspaceData
  ) => {
    setWorkspace((prev) => {
      if (!prev) return prev;
      const updated = updater(prev);
      saveAccountWorkspace(updated);
      setAllAccounts(loadAllAccounts());
      return updated;
    });
  };

  const handleSwitchAccount = () => {
    setActiveUsername(null);
    setWorkspace(null);
    setAllAccounts(loadAllAccounts());
  };

  if (!initialized) {
    return null;
  }

  const t = TRANSLATIONS[language];
  const isLight = theme === 'light';

  return (
    <div
      data-theme={theme}
      className={`min-h-screen w-full relative overflow-x-hidden transition-colors duration-300 ${
        isLight
          ? 'theme-light bg-gradient-to-br from-[#eef6ff] via-[#e2eeff] to-[#f1e6ff] text-slate-900'
          : 'theme-dark dark bg-gradient-to-br from-[#070b1d] via-[#0d1738] to-[#190e36] text-slate-100'
      }`}
    >
      {/* Subtle Floating Liquid Glass Color Blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        <div
          className={`ambient-blob-a absolute -top-28 -left-24 w-[520px] h-[520px] rounded-full blur-[130px] transition-colors duration-500 ${
            isLight ? 'bg-sky-400/35' : 'bg-sky-500/22'
          }`}
        />
        <div
          className={`ambient-blob-b absolute top-1/4 -right-28 w-[560px] h-[560px] rounded-full blur-[140px] transition-colors duration-500 ${
            isLight ? 'bg-indigo-400/30' : 'bg-indigo-500/24'
          }`}
        />
        <div
          className={`ambient-blob-a absolute -bottom-32 left-1/3 w-[500px] h-[500px] rounded-full blur-[135px] transition-colors duration-500 ${
            isLight ? 'bg-fuchsia-400/28' : 'bg-fuchsia-500/18'
          }`}
        />
      </div>

      {!workspace ? (
        <OnboardingFlow
          existingAccounts={allAccounts}
          onCompleteOnboarding={handleCompleteOnboarding}
          onSelectExistingAccount={handleSelectExistingAccount}
          language={language}
          onChangeLanguage={handleChangeLanguage}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
      ) : (
        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Top Navigation Bar with System Theme Toggle */}
          <header className="sticky top-0 z-30 liquid-glass border-b border-white/15 px-4 sm:px-8 py-3.5">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
              {/* Zone 1: Single text element wordmark */}
              <a
                href="#top"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('dashboard');
                }}
                className="text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0"
              >
                Stuvyra
              </a>

              {/* Zone 2: 4 concise single-line navigation links */}
              <nav
                aria-label="Primary Navigation"
                className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300"
              >
                <a
                  href="#dashboard"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('dashboard');
                  }}
                  className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                    activeTab === 'dashboard'
                      ? 'text-white font-semibold border-b-2 border-sky-400'
                      : 'hover:text-white'
                  }`}
                >
                  {t.navDashboard}
                </a>
                <a
                  href="#materials"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('materials');
                  }}
                  className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                    activeTab === 'materials'
                      ? 'text-white font-semibold border-b-2 border-sky-400'
                      : 'hover:text-white'
                  }`}
                >
                  {t.navMaterials}
                </a>
                <a
                  href="#simulator"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('simulator');
                  }}
                  className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                    activeTab === 'simulator'
                      ? 'text-white font-semibold border-b-2 border-sky-400'
                      : 'hover:text-white'
                  }`}
                >
                  {t.navSimulator}
                </a>
                <a
                  href="#weekly"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('weekly');
                  }}
                  className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                    activeTab === 'weekly'
                      ? 'text-white font-semibold border-b-2 border-sky-400'
                      : 'hover:text-white'
                  }`}
                >
                  {t.navWeekly}
                </a>
              </nav>

              {/* Zone 3: System Theme Toggle + Backup + Account Switcher */}
              <div className="flex items-center gap-2 shrink-0">
                <ThemeToggle
                  theme={theme}
                  onToggleTheme={handleToggleTheme}
                  language={language}
                />
                <button
                  type="button"
                  onClick={() => exportWorkspaceAsJson(workspace)}
                  title={
                    language === 'ro'
                      ? 'Exportă copie de siguranță (.json)'
                      : 'Export workspace backup (.json)'
                  }
                  className="liquid-glass-btn px-3 py-2 rounded-xl text-xs font-semibold text-sky-200 flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Backup</span>
                </button>
                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  className="liquid-glass-btn px-4 py-2 rounded-xl text-xs font-semibold text-white whitespace-nowrap shrink-0"
                >
                  {t.switchAccount} (@{workspace.profile.username})
                </button>
              </div>
            </div>
          </header>

          {/* Workspace Language & Mobile Navigation Toolbar */}
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-8 pt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <div className="text-xs text-slate-300 truncate">
                <span className="font-semibold text-white">
                  @{workspace.profile.username}
                </span>
                <span aria-hidden="true"> · </span>
                <span>{workspace.profile.university}</span>
              </div>

              <LanguageToggle
                language={language}
                onChangeLanguage={handleChangeLanguage}
              />
            </div>

            {/* Mobile Responsive Segmented Navigation */}
            <div
              role="navigation"
              aria-label="Mobile Section Navigation"
              className="md:hidden liquid-glass-subtle rounded-2xl p-1.5 grid grid-cols-2 sm:grid-cols-4 gap-1.5"
            >
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 ${
                  activeTab === 'dashboard'
                    ? 'liquid-glass-btn-primary'
                    : 'text-slate-300'
                }`}
              >
                {t.navDashboard}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('materials')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 ${
                  activeTab === 'materials'
                    ? 'liquid-glass-btn-primary'
                    : 'text-slate-300'
                }`}
              >
                {t.navMaterialsShort}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('simulator')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 ${
                  activeTab === 'simulator'
                    ? 'liquid-glass-btn-primary'
                    : 'text-slate-300'
                }`}
              >
                {t.navSimulator}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('weekly')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 ${
                  activeTab === 'weekly'
                    ? 'liquid-glass-btn-primary'
                    : 'text-slate-300'
                }`}
              >
                {t.navWeekly}
              </button>
            </div>
          </div>

          {/* Main Workspace Container */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-5 sm:py-6">
            {activeTab === 'dashboard' && (
              <DashboardView
                workspace={workspace}
                onUpdateWorkspace={handleUpdateWorkspace}
                onNavigateTab={setActiveTab}
                language={language}
              />
            )}

            {activeTab === 'materials' && (
              <MaterialsScheduleView
                workspace={workspace}
                onUpdateWorkspace={handleUpdateWorkspace}
                language={language}
              />
            )}

            {activeTab === 'simulator' && (
              <ExamSimulatorView
                workspace={workspace}
                onUpdateWorkspace={handleUpdateWorkspace}
                language={language}
              />
            )}

            {activeTab === 'weekly' && (
              <WeeklyProgressView
                workspace={workspace}
                onUpdateWorkspace={handleUpdateWorkspace}
                language={language}
                theme={theme}
              />
            )}
          </main>
        </div>
      )}
    </div>
  );
}
