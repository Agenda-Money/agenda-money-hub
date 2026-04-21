import React, { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlagModalProps {
  userId: string;
  onClose: () => void;
  onSaved: (flags: any[]) => void;
}

export const FlagModal: React.FC<FlagModalProps> = ({ userId, onClose, onSaved }) => {
  const [level, setLevel] = useState('medium');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!reason.trim()) return setError('Reason is required');
    setSaving(true);
    setError('');
    
    try {
      const res = await fetch(`/api/admin/users/${userId}/flag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ level, reason })
      });
      
      const data = await res.json();
      setSaving(false);
      
      if (res.ok) {
        onSaved(data.flags);
      } else {
        setError(data.message || data.error || 'Failed to save flag');
      }
    } catch (err) {
      setSaving(false);
      setError('A network error occurred');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Premium Backdrop Overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={onClose}
      />
      
      <div className="relative bg-white border border-slate-200 rounded-[24px] w-full max-w-[520px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden animate-slide-up-premium">
        <div className="p-8 pb-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Flag this user</h3>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
              <X size={24} />
            </button>
          </div>
  
          <div className="space-y-6">
            <div>
              <label className="label-premium block mb-2 text-slate-500">Risk Assessment Level</label>
              <div className="grid grid-cols-3 gap-3">
                {['normal', 'medium', 'high'].map((l) => (
                  <button
                    key={l}
                    onClick={() => setLevel(l)}
                    className={cn(
                      "py-3 px-4 rounded-xl border-2 text-[14px] font-bold transition-all uppercase tracking-wider",
                      level === l 
                        ? (l === 'high' ? "bg-red-50 border-red-600 text-red-700 shadow-sm" : l === 'medium' ? "bg-amber-50 border-amber-600 text-amber-700 shadow-sm" : "bg-slate-50 border-slate-600 text-slate-700 shadow-sm")
                        : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
  
            <div>
              <label className="label-premium block mb-2 text-slate-500">Reason for flagging (Internal only)</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="What did you observe? (e.g., mismatched documents, inconsistent behavior...)"
                rows={4}
                className="w-full p-4 bg-slate-50 border-0 rounded-2xl text-[15px] text-slate-900 focus:ring-2 focus:ring-pink-500/20 focus:bg-white transition-all resize-none shadow-inner"
              />
            </div>
  
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl animate-shake">
                <p className="text-[13px] text-red-700 font-medium">{error}</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 pt-4 flex gap-4">
          <button 
            onClick={onClose} 
            className="flex-1 py-4 px-6 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all text-[15px] shadow-sm"
          >
            Cancel
          </button>
          <button 
            onClick={save} 
            disabled={saving}
            className="flex-1 py-4 px-6 rounded-2xl bg-[#1D9E75] text-white font-bold hover:bg-[#168a65] disabled:opacity-50 transition-all text-[15px] shadow-lg shadow-emerald-700/20 active:scale-95"
          >
            {saving ? 'Processing...' : 'Securely Save Flag'}
          </button>
        </div>
      </div>
    </div>
  );
};
