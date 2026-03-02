import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Check, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWebSocketListener, CardColor } from '@/hooks/useWebSocketListener';

interface ApplicationStatusCardProps {
  loanId: string;
  userMsisdn: string;
  initialStatus: string;
  hideTitle?: boolean;
  className?: string;
}

interface Step {
  id: string;
  title: string;
  status: 'waiting' | 'in-progress' | 'completed' | 'rejected';
  color: string;
  text?: string;
}

export const ApplicationStatusCard: React.FC<ApplicationStatusCardProps> = ({ loanId, userMsisdn, initialStatus, hideTitle, className }) => {
  const { latestLoanEvent, kycEvent, nodeEndorsedEvent } = useWebSocketListener(userMsisdn);

  const [steps, setSteps] = useState<Step[]>([
    {
      id: 'node-endorsement',
      title: 'Node Endorsement',
      status: initialStatus === 'AWAITING_ENDORSEMENT' ? 'in-progress' : initialStatus === 'PENDING_VERIFICATION' || initialStatus === 'PENDING' || initialStatus === 'DISBURSING' ? 'completed' : 'waiting',
      color: initialStatus === 'AWAITING_ENDORSEMENT' ? 'pink' : initialStatus === 'PENDING_VERIFICATION' || initialStatus === 'PENDING' || initialStatus === 'DISBURSING' ? 'green' : 'gray'
    },
    {
      id: 'kyc-verification',
      title: 'Identity Verification',
      status: initialStatus === 'PENDING_VERIFICATION' ? 'in-progress' : initialStatus === 'PENDING' || initialStatus === 'DISBURSING' ? 'completed' : 'waiting',
      color: initialStatus === 'PENDING_VERIFICATION' ? 'pink' : initialStatus === 'PENDING' || initialStatus === 'DISBURSING' ? 'green' : 'gray'
    },
    {
      id: 'final-approval',
      title: 'Final Loan Approval',
      status: initialStatus === 'PENDING' ? 'in-progress' : initialStatus === 'DISBURSING' ? 'completed' : 'waiting',
      color: initialStatus === 'PENDING' ? 'pink' : initialStatus === 'DISBURSING' ? 'green' : 'gray'
    }
  ]);

  const updateStep = (id: string, updates: Partial<Step>) => {
    setSteps(prev => prev.map(step => step.id === id ? { ...step, ...updates } : step));
  };

  // Sync state if parent initialStatus changes (e.g. on page refresh & API polling)
  useEffect(() => {
    setSteps([
      {
        id: 'node-endorsement',
        title: 'Node Endorsement',
        status: initialStatus === 'AWAITING_ENDORSEMENT' ? 'in-progress' : initialStatus === 'PENDING_VERIFICATION' || initialStatus === 'PENDING' || initialStatus === 'DISBURSING' ? 'completed' : 'waiting',
        color: initialStatus === 'AWAITING_ENDORSEMENT' ? 'pink' : initialStatus === 'PENDING_VERIFICATION' || initialStatus === 'PENDING' || initialStatus === 'DISBURSING' ? 'green' : 'gray'
      },
      {
        id: 'kyc-verification',
        title: 'Identity Verification',
        status: initialStatus === 'PENDING_VERIFICATION' ? 'in-progress' : initialStatus === 'PENDING' || initialStatus === 'DISBURSING' ? 'completed' : 'waiting',
        color: initialStatus === 'PENDING_VERIFICATION' ? 'pink' : initialStatus === 'PENDING' || initialStatus === 'DISBURSING' ? 'green' : 'gray'
      },
      {
        id: 'final-approval',
        title: 'Final Loan Approval',
        status: initialStatus === 'PENDING' ? 'in-progress' : initialStatus === 'DISBURSING' ? 'completed' : 'waiting',
        color: initialStatus === 'PENDING' ? 'pink' : initialStatus === 'DISBURSING' ? 'green' : 'gray'
      }
    ]);
  }, [initialStatus]);

  // Listeners for WebSocket events mapping to steps
  useEffect(() => {
    if (nodeEndorsedEvent) {
      updateStep('node-endorsement', { status: 'completed', color: 'green' });
      updateStep('kyc-verification', { status: 'in-progress', color: 'pink', text: 'Awaiting KYC Verification' });
    }
  }, [nodeEndorsedEvent]);

  useEffect(() => {
    if (kycEvent) {
      updateStep('kyc-verification', { status: 'completed', color: 'green' });
      updateStep('final-approval', { status: 'in-progress', color: 'pink', text: 'Awaiting Final Approval' });
    }
  }, [kycEvent]);

  useEffect(() => {
    if (latestLoanEvent) {
      if (latestLoanEvent.cardColor === 'green' && latestLoanEvent.status === 'DISBURSING') {
        updateStep('final-approval', { status: 'completed', color: 'green' });
      } else if (latestLoanEvent.cardColor === 'red' && latestLoanEvent.status === 'REJECTED') {
        updateStep('final-approval', { status: 'rejected', color: 'red', text: 'Application Not Approved' });
      }
    }
  }, [latestLoanEvent]);

  const getIcon = (color: CardColor, status: string) => {
    if (status === 'in-progress') return <Clock className="w-5 h-5 text-white" />;
    if (status === 'rejected') return <AlertCircle className="w-5 h-5 text-white" />;
    if (status === 'completed') return <Check className="w-5 h-5 text-white" />;
    return <Clock className="w-5 h-5 text-gray-400" />;
  };

  const getBackgroundColor = (color: string) => {
    switch (color) {
      case 'green': return 'bg-[#82D616]';
      case 'blue': return 'bg-blue-500';
      case 'pink': return 'bg-[#EC1B84]/20';
      case 'yellow': return 'bg-amber-400';
      case 'red': return 'bg-red-500';
      case 'gray':
      default: return 'bg-gray-200';
    }
  };

  const getStatusText = (step: Step) => {
    if (step.text) return step.text;
    switch (step.status) {
      case 'waiting': return 'Waiting';
      case 'in-progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'rejected': return 'Rejected';
      default: return 'Pending';
    }
  };

  return (
    <div className={cn("bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex flex-col gap-6", className)}>
      {!hideTitle && <h3 className="text-lg font-bold text-gray-900">Application Status</h3>}
      <div className="relative">
        {/* Vertical Line Connector */}
        <div className="absolute top-4 bottom-4 left-5 w-0.5 bg-gray-100 -z-10" />

        <div className="flex flex-col gap-6">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex gap-4 items-start z-10">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-[3px] border-white shadow-sm transition-colors duration-500",
                getBackgroundColor(step.color)
              )}>
                {step.status === 'in-progress' && step.color === 'pink' ? (
                  <div className="w-3 h-3 rounded-full bg-[#EC1B84] animate-pulse" />
                ) : (
                  getIcon(step.color as CardColor, step.status)
                )}
              </div>
              <div className="pt-2">
                <p className={cn(
                  "font-bold text-base transition-colors duration-300",
                  step.status === 'waiting' ? "text-gray-400" : "text-gray-900"
                )}>
                  {step.title}
                </p>
                <p className={cn(
                  "text-sm font-medium mt-0.5 transition-colors duration-300",
                  step.color === 'green' ? "text-[#82D616]" :
                  step.color === 'blue' ? "text-blue-600" :
                  step.color === 'pink' ? "text-[#EC1B84]" :
                  step.color === 'yellow' ? "text-amber-600" :
                  step.color === 'red' ? "text-red-600" :
                  "text-gray-400"
                )}>
                  {getStatusText(step)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
