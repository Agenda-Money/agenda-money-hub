import axios from 'axios';

/**
 * TokenRefreshService
 * Handles proactive and reactive token refresh for agent and admin sessions.
 */
export class TokenRefreshService {
  private refreshTimeout: ReturnType<typeof setTimeout> | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;

  /**
   * Start automatic token refresh timer
   * @param expiresAt Timestamp in seconds from Unix epoch
   */
  startRefreshTimer(expiresAt: number) {
    this.stopRefreshTimer();

    if (!expiresAt) return;

    const expiresAtMs = expiresAt * 1000;
    const now = Date.now();
    const timeUntilExpiry = expiresAtMs - now;
    
    // Refresh 5 minutes (300,000ms) before expiry
    // If less than 5 minutes remain, refresh in 10 seconds or immediately
    const refreshTime = Math.max(10000, timeUntilExpiry - 300000);

    console.log(`[TokenRefreshService] Next refresh scheduled in ${Math.round(refreshTime / 1000 / 60)} minutes (${new Date(now + refreshTime).toLocaleTimeString()})`);

    this.refreshTimeout = setTimeout(() => {
      this.refreshAccessToken();
    }, refreshTime);
  }

  /**
   * Refresh the access token using the stored refresh token.
   * Concurrent callers will await the same in-flight promise instead of
   * getting an immediate null and triggering a premature logout.
   */
  async refreshAccessToken(): Promise<string | null> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        // Support both the current and legacy refresh token key names
        const refreshToken =
          localStorage.getItem('refreshToken') || localStorage.getItem('refresh_token');

        if (!refreshToken) {
          console.warn('[TokenRefreshService] No refresh token available');
          this.handleSessionExpired();
          return null;
        }

        console.log('[TokenRefreshService] Attempting to refresh access token...');

        const response = await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/admin/auth/refresh-token`, {
          refreshToken
        });

        if (response.status !== 200 && response.status !== 201) {
          throw new Error('Refresh request failed');
        }

        const { token, refreshToken: newRefreshToken, expiresAt } = response.data;

        // Update storage with new credentials (normalize to current key names)
        localStorage.setItem('accessToken', token);
        if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);
        localStorage.setItem('expiresAt', expiresAt.toString());
        // Remove legacy keys to avoid stale data
        localStorage.removeItem('refresh_token');

        console.log('✅ [TokenRefreshService] Token refreshed successfully');

        // Restart timer with new expiry
        this.startRefreshTimer(expiresAt);

        return token;
      } catch (error) {
        console.error('❌ [TokenRefreshService] Token refresh failed:', error);
        this.handleSessionExpired();
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Handle expired or invalid session by clearing storage and redirecting
   */
  handleSessionExpired() {
    console.warn('[TokenRefreshService] Session expired - cleaning up');
    
    // Clear all auth data (both old and new keys for safety during migration)
    const keysToRemove = [
      'accessToken', 'refreshToken', 'expiresAt', 'user',
      'token', 'refresh_token', 'token_expires_at', 'token_expiry'
    ];
    keysToRemove.forEach(key => localStorage.removeItem(key));
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('agenda_token');

    this.stopRefreshTimer();

    // Redirect to login if we are not already there
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }

  /**
   * Stop the active refresh timer
   */
  stopRefreshTimer() {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }

  /**
   * Initialize service - check if we have a valid session to start timer
   */
  init() {
    const expiresAt = localStorage.getItem('expiresAt');
    const accessToken = localStorage.getItem('accessToken');

    if (expiresAt && accessToken) {
      this.startRefreshTimer(parseInt(expiresAt, 10));
    }

    // Set up multi-tab synchronization
    window.addEventListener('storage', (e) => {
      if (e.key === 'expiresAt' && e.newValue) {
        console.log('[TokenRefreshService] Detected token refresh in another tab');
        this.startRefreshTimer(parseInt(e.newValue, 10));
      }
      if (e.key === 'accessToken' && !e.newValue) {
        console.log('[TokenRefreshService] Detected logout in another tab');
        this.handleSessionExpired();
      }
    });
  }
}

// Export singleton instance
export const tokenRefreshService = new TokenRefreshService();
