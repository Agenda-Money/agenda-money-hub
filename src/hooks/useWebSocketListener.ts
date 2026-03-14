import { useEffect, useState } from 'react';
import { useSocketContext } from '@/contexts/SocketContext';

export type CardColor = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'pink';

export interface LoanStatusData {
  loanId: string;
  status: string;
  cardColor: CardColor;
  message: string;
  title?: string;
  timestamp?: string;
  loanReference?: string;
}

export function useWebSocketListener(userMsisdn?: string, isAdmin: boolean = false) {
  const { socket } = useSocketContext();
  
  const [latestLoanEvent, setLatestLoanEvent] = useState<LoanStatusData | null>(null);
  const [kycEvent, setKycEvent] = useState<any>(null);
  const [nodeEndorsedEvent, setNodeEndorsedEvent] = useState<any>(null);

  useEffect(() => {
    if (!socket) return;

    if (isAdmin) {
      socket.emit('join-admin-room');
    }

    const handleLoanStatusUpdated = (data: any) => {

      
      let cardColor: CardColor = 'pink';
      if (['DISBURSING', 'ACTIVE', 'COMPLETED'].includes(data.newStatus)) {
          cardColor = 'green';
      } else if (['REJECTED', 'CANCELLED', 'OVERDUE'].includes(data.newStatus)) {
          cardColor = 'red';
      }
          
      setLatestLoanEvent({
        loanId: data.loanId,
        loanReference: data.loanReference,
        status: data.newStatus,
        message: data.message,
        title: data.title,
        timestamp: data.timestamp,
        cardColor
      });
    };

    const handleLoanEndorsed = (data: any) => {

      setNodeEndorsedEvent(data);
    };

    // Support both kyc_verified and KYC_VERIFIED_SUCCESS
    const handleKycEvent = (data: any) => {

      setKycEvent(data);
    };

    socket.on('loan_status_updated', handleLoanStatusUpdated);
    socket.on('loan_endorsed', handleLoanEndorsed);
    socket.on('kyc_verified', handleKycEvent);
    socket.on('KYC_VERIFIED_SUCCESS', handleKycEvent);
    socket.on('KYC_REJECTED', handleKycEvent);

    return () => {
      socket.off('loan_status_updated', handleLoanStatusUpdated);
      socket.off('loan_endorsed', handleLoanEndorsed);
      socket.off('kyc_verified', handleKycEvent);
      socket.off('KYC_VERIFIED_SUCCESS', handleKycEvent);
      socket.off('KYC_REJECTED', handleKycEvent);
    };
  }, [socket, isAdmin]);

  return {
    socket,
    latestLoanEvent,
    kycEvent,
    nodeEndorsedEvent
  };
}
