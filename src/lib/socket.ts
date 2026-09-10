import { io, Socket } from 'socket.io-client';
import { getApiBaseUrl } from './domain';

const API_URL = getApiBaseUrl() || 'http://localhost:3000';

/**
 * The JWT this browser is holding.
 *
 * Read at connect time rather than at module load — this file is imported
 * before anyone has logged in, so a value captured here would always be null.
 * Admin subdomains keep theirs in localStorage, the apply flow in
 * sessionStorage; either may be present depending on which app is running.
 */
export const getSocketToken = (): string | null => {
  try {
    return (
      globalThis.localStorage?.getItem('accessToken') ||
      globalThis.localStorage?.getItem('token') ||
      globalThis.sessionStorage?.getItem('token') ||
      globalThis.sessionStorage?.getItem('agenda_token') ||
      null
    );
  } catch {
    return null;
  }
};

// Create a singleton socket instance with autoConnect: false to prevent connection spam
// We explicitly connect when we have a valid user session (MSISDN)
export const socket: Socket = io(API_URL, {
  autoConnect: false,
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  query: {},
});

/**
 * Joins the room this user's events are published to.
 *
 * The server requires an authenticated socket before it will let anyone into a
 * user room, and it accepts the token either on the handshake or alongside the
 * join. Nothing here sent one at all — the emit carried a bare msisdn string,
 * which the server cannot read a token out of — so every join was refused with
 * "Unauthorized user-room join attempt" and no borrower was ever in their own
 * room. Loan status changes, repayments and endorsements were all published to
 * an empty room, which is why the app only ever updated on a manual refresh.
 */
export const joinUserRooms = (msisdn: string) => {
  if (!socket.connected) return;
  socket.emit('join-user-room', { msisdn, token: getSocketToken() ?? undefined });
};
