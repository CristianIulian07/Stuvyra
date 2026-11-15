import { AccountWorkspaceData } from '../types/study';
import { createEmptyWorkspaceData, formatIsoDate } from './studyLogic';

const ACCOUNTS_STORAGE_KEY = 'stuvyra_accounts_v2';
const ACTIVE_USER_STORAGE_KEY = 'stuvyra_active_username_v2';

export function loadAllAccounts(): Record<string, AccountWorkspaceData> {
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
    return {};
  } catch {
    return {};
  }
}

export function saveAllAccounts(accounts: Record<string, AccountWorkspaceData>): void {
  try {
    window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    // Handle storage quota gracefully
  }
}

export function getActiveUsername(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setActiveUsername(username: string | null): void {
  try {
    if (!username) {
      window.localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
    } else {
      window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, username);
    }
  } catch {
    // Ignore storage error
  }
}

export function saveAccountWorkspace(workspace: AccountWorkspaceData): void {
  const accounts = loadAllAccounts();
  accounts[workspace.profile.username] = workspace;
  saveAllAccounts(accounts);
  setActiveUsername(workspace.profile.username);
}

export function initializeWorkspaceFromBrowser(): {
  activeWorkspace: AccountWorkspaceData | null;
  allAccounts: Record<string, AccountWorkspaceData>;
} {
  const params = new URLSearchParams(window.location.search);
  const isAutostart = params.get('autostart') === '1';
  const accounts = loadAllAccounts();
  const activeUsername = getActiveUsername();

  if (activeUsername && accounts[activeUsername]) {
    return {
      activeWorkspace: accounts[activeUsername],
      allAccounts: accounts,
    };
  }

  if (isAutostart) {
    const todayIso = formatIsoDate(new Date());
    const emptyWorkspace = createEmptyWorkspaceData(todayIso);
    accounts[emptyWorkspace.profile.username] = emptyWorkspace;
    saveAllAccounts(accounts);
    setActiveUsername(emptyWorkspace.profile.username);
    return {
      activeWorkspace: emptyWorkspace,
      allAccounts: accounts,
    };
  }

  return {
    activeWorkspace: null,
    allAccounts: accounts,
  };
}
