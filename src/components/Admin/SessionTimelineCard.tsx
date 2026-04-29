import React from 'react';
import { Smartphone, Hash, AlertTriangle } from 'lucide-react';

interface Session {
  channel: 'App' | 'USSD';
  action: string;
  timestamp: string;
  device?: string;
}

interface SessionTimelineCardProps {
  sessions: Session[];
  conflicts: string[]; // List of other User IDs shared on the same device
}

export const SessionTimelineCard: React.FC<SessionTimelineCardProps> = ({ sessions, conflicts }) => {
  return (
    <div className="card-sm-premium">
      <div className="section-title-premium">Device & session timeline</div>
      
      {(conflicts || []).length > 0 && (
        <div className="device-warn-premium">
          <AlertTriangle size={14} color="#E24B4A" />
          <span>Device shared with blocked user <strong className="ml-1">{(conflicts || []).join(', ')}</strong></span>
        </div>
      )}
      
      <div className="flex flex-col">
        {(sessions || []).map((session, idx) => (
          <div key={idx} className="timeline-item-premium">
            <div className={`tl-dot ${(session.channel || 'App') === 'App' ? 'tl-app' : 'tl-ussd'}`}></div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center gap-2">
                <span className="val-premium !text-[12px] truncate">{session.channel || 'App'} · {session.action || 'Login'}</span>
                <span className="muted-premium text-[11px] shrink-0">{session.timestamp || 'N/A'}</span>
              </div>
              <div className="muted-premium text-[11px] truncate">
                {session.channel === 'App' ? `Device: ${session.device || 'N/A'}` : 'Session via *713#'}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-3 text-center">
        <button className="muted-premium text-[11px] cursor-pointer hover:underline border-none bg-transparent">
          Load more sessions
        </button>
      </div>
    </div>
  );
};
