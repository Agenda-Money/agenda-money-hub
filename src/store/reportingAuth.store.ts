import { create } from 'zustand';

interface ReportingAuthState {
  token: string | null;
  displayName: string;
  role: string | null;
  isAuthed: boolean;
  login: (token: string, displayName: string) => void;
  logout: () => void;
}

const TOKEN_KEY = 'reporting_token';
const NAME_KEY  = 'reporting_name';

function getRoleFromToken(token: string | null): string | null {
  if (!token) return null;
  try { return JSON.parse(atob(token.split('.')[1])).role; }
  catch { return null; }
}

export const useReportingAuthStore = create<ReportingAuthState>(set => {
  const token = typeof window !== 'undefined'
    ? sessionStorage.getItem(TOKEN_KEY) : null;
  return {
    token,
    displayName: typeof window !== 'undefined'
      ? sessionStorage.getItem(NAME_KEY) ?? '' : '',
    role: getRoleFromToken(token),
    isAuthed: !!token,
    login: (token, displayName) => {
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(NAME_KEY, displayName);
      // Write cookie for potential middleware access
      document.cookie = `${TOKEN_KEY}=${token}; path=/; SameSite=Strict`;
      set({ token, displayName, role: getRoleFromToken(token), isAuthed: true });
    },
    logout: () => {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(NAME_KEY);
      document.cookie = `${TOKEN_KEY}=; Max-Age=0; path=/`;
      set({ token: null, displayName: '', role: null, isAuthed: false });
    },
  };
});
