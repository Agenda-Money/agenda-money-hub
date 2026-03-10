import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

export type CardColor = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'pink';

export interface LoanStatusData {
  loanId: string;
  status: string;
  cardColor: CardColor;
  message: string;
  title?: string;
  timestamp?: string;
  amount?: number;
}

export function useWebSocketListener(
  userMsisdn?: string,
  isAdmin: boolean = false,
  existingSocket?: Socket | null
) {
  // Only manage our own socket when no existing socket is provided
  const [ownSocket, setOwnSocket] = useState<Socket | null>(null);
  
  // Expose these state variables to components for real-time reactivity
  const [latestLoanEvent, setLatestLoanEvent] = useState<LoanStatusData | null>(null);
  const [kycEvent, setKycEvent] = useState<any>(null);
  const [nodeEndorsedEvent, setNodeEndorsedEvent] = useState<any>(null);

  useEffect(() => {
    // If an existing socket is provided, use it directly without opening a new connection
    if (existingSocket) {
      const handleLoanStatusUpdated = (data: any) => {
        if (import.meta.env.DEV) {
          console.log('🎯 Loan Status Updated:', data);
        }
        const cardColor: CardColor =
          data.newStatus === 'DISBURSING' || data.newStatus === 'ACTIVE'
            ? 'green'
            : data.newStatus === 'REJECTED'
              ? 'red'
              : 'pink';
        setLatestLoanEvent({
          loanId: data.loanId,
          message: data.message,
          title: data.title,
          timestamp: data.timestamp,
          status: data.newStatus,
          amount: typeof data.amount === 'number' ? data.amount : undefined,
          cardColor,
        });
      };

      const handleLoanEndorsed = (data: any) => {
        if (import.meta.env.DEV) {
          console.log('🎯 Loan Endorsed:', data);
        }
        setNodeEndorsedEvent(data);
      };

      const handleKycVerified = (data: any) => setKycEvent(data);
      const handleKycVerifiedSuccess = (data: any) => setKycEvent({ ...data, status: 'VERIFIED' });

      existingSocket.on('loan_status_updated', handleLoanStatusUpdated);
      existingSocket.on('loan_endorsed', handleLoanEndorsed);
      existingSocket.on('kyc_verified', handleKycVerified);
      existingSocket.on('KYC_VERIFIED_SUCCESS', handleKycVerifiedSuccess);

      return () => {
        existingSocket.off('loan_status_updated', handleLoanStatusUpdated);
        existingSocket.off('loan_endorsed', handleLoanEndorsed);
        existingSocket.off('kyc_verified', handleKycVerified);
        existingSocket.off('KYC_VERIFIED_SUCCESS', handleKycVerifiedSuccess);
      };
    }

    // No existing socket — create our own (fallback for standalone usage)
    if (!userMsisdn && !isAdmin) return;

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
    
    const newSocket = io(apiUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    // Connection lifecycle
    newSocket.on('connect', () => {
      if (import.meta.env.DEV) {
        console.log('✅ Connected to WebSocket');
      }
      if (userMsisdn) {
        newSocket.emit('join-user-room', userMsisdn);
      }
      if (isAdmin) {
        newSocket.emit('join-admin-room');
      }
    });

    newSocket.on('disconnect', () => {
      if (import.meta.env.DEV) {
        console.log('❌ Disconnected from WebSocket');
      }
    });

    // Loan core events mapping (User side)
    newSocket.on('loan_status_updated', (data: any) => {
      if (import.meta.env.DEV) {
        console.log('🎯 Loan Status Updated:', data);
      }
      
      // Determine card color based on UI logic
      const cardColor: CardColor = data.newStatus === 'DISBURSING' || data.newStatus === 'ACTIVE' 
        ? 'green' 
        : data.newStatus === 'REJECTED' 
          ? 'red' 
          : 'pink';
          
      setLatestLoanEvent({
        loanId: data.loanId,
        message: data.message,
        title: data.title,
        timestamp: data.timestamp,
        status: data.newStatus,
        amount: typeof data.amount === 'number' ? data.amount : undefined,
        cardColor,
      });
    });

    newSocket.on('loan_endorsed', (data: any) => {
      if (import.meta.env.DEV) {
        console.log('🎯 Loan Endorsed:', data);
      }
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
    
    setOwnSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [userMsisdn, isAdmin, existingSocket]);

  return {
    socket: existingSocket ?? ownSocket,
    latestLoanEvent,
    kycEvent,
    nodeEndorsedEvent
  };
}
