import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Clock, User, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export type CallState = 'CONNECTING' | 'RINGING' | 'IN_CALL' | 'ENDED';

interface DialerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  borrowerName: string;
  borrowerNumber: string;
  onCallComplete: (duration: string, timestamp: Date) => void;
}

export function DialerOverlay({
  isOpen,
  onClose,
  borrowerName,
  borrowerNumber,
  onCallComplete,
}: DialerOverlayProps) {
  const [state, setState] = useState<CallState>('CONNECTING');
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  useEffect(() => {
    if (isOpen) {
      setState('CONNECTING');
      setDuration(0);
      startTimeRef.current = new Date();
      
      // Auto-trigger the system dialer
      window.location.href = `tel:${borrowerNumber}`;

      // Simulate call flow
      const connectingTimeout = setTimeout(() => setState('RINGING'), 1500);
      const ringingTimeout = setTimeout(() => setState('IN_CALL'), 4000);

      return () => {
        clearTimeout(connectingTimeout);
        clearTimeout(ringingTimeout);
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [isOpen, borrowerNumber]);

  useEffect(() => {
    if (state === 'IN_CALL') {
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else if (state === 'ENDED' && timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleHangUp = () => {
    const finalDuration = formatDuration(duration);
    setState('ENDED');
    setTimeout(() => {
      onCallComplete(finalDuration, startTimeRef.current || new Date());
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
          onClick={state !== 'ENDED' ? handleHangUp : undefined}
        />

        {/* Dialer Card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-[320px] bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden text-center p-8"
        >
          {/* Animated Rings */}
          <div className="relative flex justify-center mb-8">
            <AnimatePresence>
              {(state === 'CONNECTING' || state === 'RINGING') && (
                <>
                  <motion.div
                    key="ring1"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full bg-pink-500/20"
                  />
                  <motion.div
                    key="ring2"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeOut", delay: 1 }}
                    className="absolute inset-0 rounded-full bg-pink-500/10"
                  />
                </>
              )}
            </AnimatePresence>
            <div className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-gray-800">
              {state === 'ENDED' ? (
                <CheckCircle2 className="h-10 w-10 text-white" />
              ) : (
                <Phone className={cn("h-10 w-10 text-white", (state === 'CONNECTING' || state === 'RINGING') && "animate-pulse")} />
              )}
            </div>
          </div>

          <div className="space-y-2 mb-10">
            <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
              {borrowerName}
            </h3>
            <p className="text-sm font-mono text-gray-500 dark:text-gray-400 font-bold">
              {borrowerNumber}
            </p>
            <div className="pt-2">
              <span className={cn(
                "text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full",
                state === 'CONNECTING' && "bg-gray-100 text-gray-500",
                state === 'RINGING' && "bg-amber-100 text-amber-600",
                state === 'IN_CALL' && "bg-green-100 text-green-600 animate-pulse",
                state === 'ENDED' && "bg-blue-100 text-blue-600",
              )}>
                {state.replace('_', ' ')}
              </span>
            </div>
          </div>

          {state === 'IN_CALL' && (
            <div className="flex items-center justify-center gap-2 mb-10 text-2xl font-black font-mono text-gray-900 dark:text-gray-100">
              <Clock className="h-5 w-5 text-gray-400" />
              {formatDuration(duration)}
            </div>
          )}

          {state === 'ENDED' && (
            <p className="text-sm text-muted-foreground mb-10 font-bold">
              Call logged with duration: {formatDuration(duration)}
            </p>
          )}

          <div className="flex flex-col items-center gap-4">
            {state !== 'ENDED' ? (
              <Button
                variant="destructive"
                size="lg"
                className="w-16 h-16 rounded-full shadow-xl shadow-red-500/30 hover:scale-105 active:scale-95 transition-all p-0"
                onClick={handleHangUp}
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            ) : (
              <div className="h-16 w-16" />
            )}

            <button 
              onClick={() => {
                navigator.clipboard.writeText(borrowerNumber);
                toast.success('Number copied to clipboard');
              }}
              className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              Copy Number Fallback
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
