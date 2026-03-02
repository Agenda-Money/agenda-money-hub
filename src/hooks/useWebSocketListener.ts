import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

export type CardColor = 'green' | 'red' | 'yellow' | 'blue' | 'gray';

export interface LoanStatusData {
  loanId: string;
  status: string;
  cardColor: CardColor;
  message: string;
  timestamp?: string;
}

export function useWebSocketListener(userMsisdn?: string, isAdmin: boolean = false) {
  const [socket, setSocket] = useState<Socket | null>(null);
  
  // Expose these state variables to components for real-time reactivity
  const [latestLoanEvent, setLatestLoanEvent] = useState<LoanStatusData | null>(null);
  const [kycEvent, setKycEvent] = useState<any>(null);
  const [nodeEndorsedEvent, setNodeEndorsedEvent] = useState<any>(null);

  useEffect(() => {
    // Determine the user identifier to listen to
    if (!userMsisdn && !isAdmin) return;

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
    
    const newSocket = io(apiUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    // Connection lifecycle
    newSocket.on('connect', () => {
      console.log('✅ Connected to WebSocket');
      if (userMsisdn) {
        newSocket.emit('join-user-room', userMsisdn);
      }
      if (isAdmin) {
        newSocket.emit('join-admin-room');
      }
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from WebSocket');
    });

    // Loan core events mapping (User side)
    newSocket.on('loan_status_update', (data: LoanStatusData) => {
      setLatestLoanEvent(data);
    });

    newSocket.on('loan_endorsed', (data: any) => {
      setNodeEndorsedEvent(data);
    });

    newSocket.on('kyc_verified', (data: any) => {
      setKycEvent(data);
    });

    newSocket.on('KYC_VERIFIED_SUCCESS', (data: any) => {
      // The old backend format might only send { msisdn, name }
      // Map it to ensure the dashboard reacts
      setKycEvent({ ...data, status: 'VERIFIED' });
    });

    // Admin events mapping could be added here later...
    
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [userMsisdn, isAdmin]);

  return {
    socket,
    latestLoanEvent,
    kycEvent,
    nodeEndorsedEvent
  };
}
