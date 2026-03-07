import axios from 'axios';

/**
 * TokenRefreshService
 * Handles proactive and reactive token refresh for agent and admin sessions.
 */
export class TokenRefreshService {
  private refreshTimeout: ReturnType<typeof setTimeout> | null = null;
  private isRefreshing = false;

  /**
   * Start automatic token refresh timer
   * @param expiresAtInput Expiration time as an ISO 8601 string, numeric string, or Unix timestamp in milliseconds or seconds
   */
  startRefreshTimer(expiresAtInput: string | number) {
    this.stopRefreshTimer();

    if (!expiresAtInput) return;

    let expiresAtMs: number;
    if (typeof expiresAtInput === 'string') {
      // Check if it's an ISO string or numeric string
      const parsed = isNaN(Number(expiresAtInput)) 
        ? new Date(expiresAtInput).getTime() 
        : Number(expiresAtInput);
      expiresAtMs = parsed;
    } else {
      expiresAtMs = expiresAtInput;
    }

    // Some backends return expiresAt in seconds instead of ms depending on the JWT structure
    // If the timestamp is unreasonably small (e.g. year 1970), assume it's in seconds
    if (expiresAtMs < Date.now() / 10) {
      expiresAtMs = expiresAtMs * 1000;
    }

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
   * Refresh the access token using the stored refresh token
   */
  async refreshAccessToken(): Promise<string | null> {
    if (this.isRefreshing) return null;
    
    try {
      this.isRefreshing = true;
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        console.warn('[TokenRefreshService] No refresh token available');
        this.handleSessionExpired();
        return null;
      }

      console.log('[TokenRefreshService] Attempting to refresh access token...');
      
      const response = await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/admin/auth/refresh`, {
        refreshToken
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status !== 200 && response.status !== 201) {
        throw new Error('Refresh request failed');
      }

      const responseData = response.data.data || response.data;
      const token = responseData.token || responseData.accessToken;
      const newRefreshToken = responseData.refreshToken;
      
      let expiresAtMs = Date.now() + 86400 * 1000;
      if (responseData.expiresAt) {
        expiresAtMs = new Date(responseData.expiresAt).getTime();
      } else if (responseData.expiresIn) {
        const expiresIn = responseData.expiresIn;
        if (typeof expiresIn === 'string') {
          if (expiresIn.endsWith('h')) expiresAtMs = Date.now() + parseInt(expiresIn, 10) * 3600 * 1000;
          else if (expiresIn.endsWith('d')) expiresAtMs = Date.now() + parseInt(expiresIn, 10) * 86400 * 1000;
          else if (expiresIn.endsWith('m')) expiresAtMs = Date.now() + parseInt(expiresIn, 10) * 60 * 1000;
          else expiresAtMs = Date.now() + parseInt(expiresIn, 10) * 1000;
        } else if (typeof expiresIn === 'number') {
          expiresAtMs = Date.now() + expiresIn * 1000;
        }
      }
      const expiresAt = new Date(expiresAtMs).toISOString();

      // Update storage with new credentials
      localStorage.setItem('accessToken', token);
      if (newRefreshToken) {
        localStorage.setItem('refreshToken', newRefreshToken);
      }
      localStorage.setItem('expiresAt', expiresAt);

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
    }
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
      this.startRefreshTimer(expiresAt);
    }

    // Set up multi-tab synchronization
    window.addEventListener('storage', (e) => {
      if (e.key === 'expiresAt' && e.newValue) {
        console.log('[TokenRefreshService] Detected token refresh in another tab');
        this.startRefreshTimer(e.newValue);
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
