import React from 'react';
import { AlertCircle, Globe, Moon, RefreshCw, Sun } from 'lucide-react';
import { AppLanguage, AppTheme, TRANSLATIONS } from '../utils/i18n';

interface ThemeToggleProps {
  theme: AppTheme;
  onToggleTheme: () => void;
  language: AppLanguage;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  theme,
  onToggleTheme,
  language,
}) => {
  const t = TRANSLATIONS[language];
  const isLight = theme === 'light';

  return (
    <button
      type="button"
      onClick={onToggleTheme}
      aria-label={t.themeToggleAria}
      aria-pressed={isLight}
      className="liquid-glass-btn px-3.5 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-2 whitespace-nowrap shrink-0"
    >
      {isLight ? (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>{t.themeLightLabel}</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-sky-300 shrink-0" />
          <span>{t.themeDarkLabel}</span>
        </>
      )}
    </button>
  );
};

interface LanguageToggleProps {
  language: AppLanguage;
  onChangeLanguage: (lang: AppLanguage) => void;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({
  language,
  onChangeLanguage,
}) => {
  return (
    <div
      role="group"
      aria-label="Language selector"
      className="liquid-glass-subtle rounded-2xl p-1 inline-flex items-center gap-1 shrink-0"
    >
      <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 whitespace-nowrap shrink-0">
        <Globe className="w-3.5 h-3.5 text-sky-300 shrink-0" />
        <span className="hidden sm:inline">{TRANSLATIONS[language].langLabel}:</span>
      </div>
      <button
        type="button"
        onClick={() => onChangeLanguage('en')}
        aria-pressed={language === 'en'}
        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
          language === 'en'
            ? 'liquid-glass-btn-primary text-white'
            : 'text-slate-300 hover:text-white'
        }`}
      >
        EN · English
      </button>
      <button
        type="button"
        onClick={() => onChangeLanguage('ro')}
        aria-pressed={language === 'ro'}
        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
          language === 'ro'
            ? 'liquid-glass-btn-primary text-white'
            : 'text-slate-300 hover:text-white'
        }`}
      >
        RO · Română
      </button>
    </div>
  );
};

interface GlassSkeletonProps {
  lines?: number;
  label?: string;
  language?: AppLanguage;
}

export const GlassSkeleton: React.FC<GlassSkeletonProps> = ({
  lines = 3,
  label,
  language = 'en',
}) => {
  const t = TRANSLATIONS[language];
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="liquid-glass-subtle rounded-3xl p-6 space-y-4 animate-pulse"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-sky-200/80 tracking-wide">
          {label || t.skeletonDefault}
        </span>
        <span className="text-xs font-mono-tabular text-slate-400">
          {t.synthesizing}
        </span>
      </div>
      <div className="h-5 w-2/3 rounded-xl bg-slate-400/20" />
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, idx) => (
          <div
            key={idx}
            className={`h-3.5 rounded-lg bg-slate-400/15 ${
              idx === lines - 1 ? 'w-3/4' : 'w-full'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

interface GlassErrorRetryProps {
  message: string;
  onRetry: () => void;
  onDismiss?: () => void;
  language?: AppLanguage;
}

export const GlassErrorRetry: React.FC<GlassErrorRetryProps> = ({
  message,
  onRetry,
  onDismiss,
  language = 'en',
}) => {
  const t = TRANSLATIONS[language];
  return (
    <div
      role="alert"
      className="liquid-glass rounded-3xl p-5 border border-rose-400/40 bg-rose-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="flex items-start gap-3.5">
        <div className="p-2 rounded-2xl bg-rose-400/15 border border-rose-400/30 text-rose-300 shrink-0">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white">
            {t.errorHeadline}
          </h4>
          <p className="text-xs text-slate-200/85 mt-1 leading-relaxed">
            {message}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="liquid-glass-btn px-3.5 py-2 rounded-xl text-xs font-medium text-slate-200 whitespace-nowrap shrink-0"
          >
            {t.dismiss}
          </button>
        )}
        <button
          type="button"
          onClick={onRetry}
          className="liquid-glass-btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{t.tryAgain}</span>
        </button>
      </div>
    </div>
  );
};
