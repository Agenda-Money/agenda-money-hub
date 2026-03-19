import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export interface RecentPage {
  path: string;
  name: string;
  timestamp: number;
}

const STORAGE_KEY = 'agent_recent_pages';

const getPageName = (path: string): string => {
  if (path === '/agent') return 'Dashboard';
  if (path === '/agent/dashboard') return 'Dashboard';
  if (path.includes('/agent/portfolio')) return 'Portfolio';
  if (path.includes('/agent/endorsements')) return 'Pending Endorsements';
  if (path.includes('/agent/commissions')) return 'Commissions';
  if (path.includes('/agent/profile')) return 'Profile';
  if (path.includes('/agent/onboard')) return 'Onboard Client';
  if (path.includes('/agent/clients/')) return 'Client Details';
  return '';
};

export function useRecentAgentPagesTracker() {
  const location = useLocation();

  useEffect(() => {
    if (!location.pathname.startsWith('/agent')) return;
    
    const pageName = getPageName(location.pathname);
    // Don't track dashboard itself as a "recent" page to go back to from the dashboard, or unknown pages
    if (!pageName || pageName === 'Dashboard') return; 

    const newPage: RecentPage = {
      path: location.pathname,
      name: pageName,
      timestamp: Date.now(),
    };

    const stored = localStorage.getItem(STORAGE_KEY);
    let history: RecentPage[] = stored ? JSON.parse(stored) : [];

    // Filter out the same path to avoid duplicates, keep last 3 unique pages
    history = history.filter(p => p.path !== location.pathname);
    history.unshift(newPage);
    if (history.length > 3) {
      history = history.slice(0, 3);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [location.pathname]);
}

export function useRecentAgentPages() {
  const [recentPages, setRecentPages] = useState<RecentPage[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
         setRecentPages(JSON.parse(stored));
      } catch(e) {
         setRecentPages([]);
      }
    }
  }, []);

  return recentPages;
}
