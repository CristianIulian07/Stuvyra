import { AccountWorkspaceData } from '../types/study';
import { createEmptyWorkspaceData, formatIsoDate } from './studyLogic';

const ACCOUNTS_STORAGE_KEY = 'stuvyra_accounts_v2';
const ACTIVE_USER_STORAGE_KEY = 'stuvyra_active_username_v2';

function stripDocumentBlobs(
  accounts: Record<string, AccountWorkspaceData>
): Record<string, AccountWorkspaceData> {
  const lightCopy: Record<string, AccountWorkspaceData> = {};
  for (const [username, ws] of Object.entries(accounts)) {
    lightCopy[username] = {
      ...ws,
      documents: (ws.documents || []).map((doc) => ({
        ...doc,
        base64Data: undefined,
      })),
    };
  }
  return lightCopy;
}

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
    // Fallback if PDF base64 payloads exceed localStorage 5MB limit: preserve all metadata & extracted text
    try {
      const compact = stripDocumentBlobs(accounts);
      window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(compact));
    } catch {
      // Ignore storage error
    }
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

export function syncWorkspaceToServer(workspace: AccountWorkspaceData): void {
  const username = workspace.profile?.username;
  if (!username) return;
  fetch(`/api/workspaces/${encodeURIComponent(username)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workspace),
  }).catch(() => {
    // Offline / static fallback silently uses localStorage
  });
}

export async function fetchServerWorkspaces(): Promise<Record<string, AccountWorkspaceData>> {
  try {
    const res = await fetch('/api/workspaces');
    if (!res.ok) return {};
    const data = await res.json();
    if (data?.accounts && typeof data.accounts === 'object') {
      return data.accounts as Record<string, AccountWorkspaceData>;
    }
    return {};
  } catch {
    return {};
  }
}

export function saveAccountWorkspace(workspace: AccountWorkspaceData): void {
  const accounts = loadAllAccounts();
  accounts[workspace.profile.username] = workspace;
  saveAllAccounts(accounts);
  setActiveUsername(workspace.profile.username);
  syncWorkspaceToServer(workspace);
}

export function deleteAccountWorkspace(username: string): Record<string, AccountWorkspaceData> {
  const accounts = loadAllAccounts();
  delete accounts[username];
  saveAllAccounts(accounts);
  if (getActiveUsername() === username) {
    setActiveUsername(null);
  }
  fetch(`/api/workspaces/${encodeURIComponent(username)}`, {
    method: 'DELETE',
  }).catch(() => {});
  return accounts;
}

export function exportWorkspaceAsJson(workspace: AccountWorkspaceData): void {
  const cleanExport: AccountWorkspaceData = {
    ...workspace,
    documents: workspace.documents.map((d) => ({ ...d, base64Data: undefined })),
  };
  const blob = new Blob([JSON.stringify(cleanExport, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stuvyra-${workspace.profile.username}-${formatIsoDate(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseImportedWorkspaceJson(raw: string): AccountWorkspaceData | null {
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.profile &&
      typeof parsed.profile.username === 'string' &&
      Array.isArray(parsed.subjects)
    ) {
      return parsed as AccountWorkspaceData;
    }
    return null;
  } catch {
    return null;
  }
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
