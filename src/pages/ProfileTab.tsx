import React, { useState } from "react";
import {
  Bell,
  FileText,
  Lock,
  HelpCircle,
  LogOut,
  ChevronRight,
  ShieldCheck,
  CheckCircle,
  Clock,
  XCircle,
  Share2,
  Copy,
  Gift, // Added Gift icon
  Users // Added Users icon
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfileTabProps {
  onboardingData?: any; // Made optional
  userData?: any; // Made optional
  onShowTerms?: () => void; // Made optional
  onShowPrivacy?: () => void; // Made optional
  onHelp?: () => void; // Made optional
  isGraduatedNode?: boolean;
  onEndorsements?: () => void;
  onRewards?: () => void; // Added
  onNetwork?: () => void; // Added
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  onboardingData,
  userData,
  onShowTerms,
  onShowPrivacy,
  onHelp,
  isGraduatedNode,
  onEndorsements,
  onRewards, // Added
  onNetwork // Added
}) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Handle potential field mismatches (Agent onboarding uses fullName, Self uses firstName)
  // Handle potential field mismatches
  const rawFirstName = userData?.firstName || onboardingData?.firstName;
  // Check for surname OR lastName
  const rawSurname = userData?.surname || userData?.lastName || onboardingData?.surname || onboardingData?.lastName;
  const rawFullName = userData?.fullName || "";

  let displayFirstName = rawFirstName;
  let displaySurname = rawSurname;

  if (!displayFirstName && rawFullName) {
    displayFirstName = rawFullName.split(" ")[0];
  }
  if (!displaySurname && rawFullName) {
    const parts = rawFullName.split(" ");
    if (parts.length > 1) displaySurname = parts.slice(1).join(" ");
  }

  const firstName = displayFirstName || "User";
  const surname = displaySurname || ""; // Removed "Name" default
  const fullName = `${firstName} ${surname}`.trim().toUpperCase();
  const initials = `${firstName?.[0] || ""}${surname?.[0] || ""}`.toUpperCase();
  const phone = userData?.mobileNumber || userData?.msisdn || onboardingData?.mobileNumber || "+233 -- --- ----";
  const personalNodeCode = userData?.personalNodeCode || (userData as any)?.user?.personalNodeCode || userData?.nodeCode;

  const handleShare = async () => {
    if (!personalNodeCode) return;
    const text = `Hey! Use my referral code ${personalNodeCode} to get a fast loan. Apply here: https://apply.agendamoney.com`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Agenda Money',
          text: text,
          url: 'https://apply.agendamoney.com'
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      navigator.clipboard.writeText(personalNodeCode);
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const isNodeUser = isGraduatedNode && !!personalNodeCode;
  const canShareNodeFeatures = (userData as any)?.canShareNodeFeatures === true;

  const menuItems = [
    ...(isNodeUser ? [{ 
      icon: Gift, 
      label: "My Rewards", 
      action: canShareNodeFeatures ? onRewards : undefined,
      locked: !canShareNodeFeatures,
      lockedMessage: "Unlock Tier 2 to access rewards"
    }] : []),
    ...(isNodeUser ? [{ 
      icon: Users, 
      label: "My Network", 
      action: canShareNodeFeatures ? onNetwork : undefined,
      locked: !canShareNodeFeatures,
      lockedMessage: "Unlock Tier 2 to build network"
    }] : []),
    ...(isNodeUser ? [{ 
      icon: Clock, 
      label: "Pending Endorsements", 
      action: canShareNodeFeatures ? onEndorsements : undefined,
      locked: !canShareNodeFeatures,
      lockedMessage: "Unlock Tier 2 to endorse"
    }] : []),
    { icon: FileText, label: "Terms & Conditions", action: onShowTerms },
    { icon: Lock, label: "Privacy Policy", action: onShowPrivacy },
    { icon: HelpCircle, label: "Help", action: onHelp },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500 pt-8 pb-32">
      
      {/* 1. Header Section */}
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="relative">
             <Avatar className="h-24 w-24 border-4 border-white shadow-sm">
                <AvatarImage src="" /> {/* Add image if available */}
                <AvatarFallback className="bg-gray-100 text-gray-500 text-3xl font-bold">
                    {initials}
                </AvatarFallback>
             </Avatar>
        </div>
        
        <div>
            <h2 className="text-lg font-bold text-gray-900 tracking-wide">{fullName}</h2>
            <p className="text-gray-400 text-sm font-medium mt-0.5">{phone}</p>
        </div>

        {(() => {
          const status = (userData?.kycStatus || onboardingData?.kycStatus || "UNVERIFIED").toUpperCase();
          let label = "ID Unverified";
          let colorClass = "text-gray-500 bg-gray-100 border-gray-200";
          let Icon = ShieldCheck;

          if (status === "VERIFIED" || status === "APPROVED") {
            label = "ID Verified";
            colorClass = "text-green-700 bg-green-50 border-green-200";
            Icon = CheckCircle;
          } else if (status === "PENDING" || status === "REVIEW") {
            label = "ID Pending";
            colorClass = "text-amber-700 bg-amber-50 border-amber-200";
            Icon = Clock;
          } else if (status === "REJECTED") {
            label = "ID Rejected";
            colorClass = "text-red-700 bg-red-50 border-red-200";
            Icon = XCircle;
          }

          return (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-full shadow-sm ${colorClass}`}>
                <span className="text-xs font-bold">{label}</span>
                <Icon className="w-4 h-4" /> 
            </div>
          );
        })()}
      </div>

      {/* 1.5 Node Code Section */}
      {isNodeUser && canShareNodeFeatures && (
         <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-[24px] p-6 shadow-lg text-white relative overflow-hidden mt-6 mb-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            
            <div className="flex justify-between items-start mb-4 relative z-10">
               <div>
                  <h3 className="text-white/80 text-sm font-medium mb-1">Your Node Code</h3>
                  <div className="flex items-center gap-3">
                     <span className="text-2xl font-black tracking-wider">{personalNodeCode}</span>
                     <button onClick={() => {
                        navigator.clipboard.writeText(personalNodeCode);
                     }} className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-95">
                        <Copy className="w-4 h-4 text-white/80" />
                     </button>
                  </div>
               </div>
               <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 shadow-inner">
                  <Share2 className="w-5 h-5 text-white" />
               </div>
            </div>

            <button 
               onClick={handleShare}
               className="w-full bg-white text-gray-900 font-bold py-3.5 rounded-xl hover:bg-gray-50 transition-colors active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"
            >
               <Share2 className="w-4 h-4" />
               Share Node Code
            </button>
         </div>
      )}
      {isNodeUser && !canShareNodeFeatures && (
         <div className="bg-gray-50 border border-gray-200 rounded-[24px] p-5 text-center flex flex-col items-center mt-6 mb-6">
            <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center mb-2">
               <Lock className="h-4 w-4 text-gray-400" />
            </div>
            <h3 className="text-gray-900 font-bold text-sm">Node Sharing Locked</h3>
            <p className="text-gray-500 text-xs mt-1 max-w-[200px]">Unlock Tier 2 to share your Node Code and earn rewards.</p>
         </div>
      )}

      {/* 2. Notification Toggle */}
      <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] border border-gray-100 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="text-gray-700 font-medium">Notifications</span>
         </div>
         <Switch 
            checked={notificationsEnabled} 
            onCheckedChange={setNotificationsEnabled} 
            className="data-[state=checked]:bg-gray-900"
         />
      </div>

      {/* 3. Settings List */}
      <div className="bg-white rounded-[24px] overflow-hidden shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] border border-gray-100 divide-y divide-gray-100 mt-6">
         {menuItems.map((item: any, index: number) => (
             <button 
                key={index}
                onClick={item.action}
                disabled={item.locked}
                className={`w-full flex items-center justify-between p-5 transition-colors text-left ${item.locked ? 'opacity-60 bg-gray-50/50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
             >
                <div className="flex items-center gap-3">
                    <item.icon className={`w-5 h-5 ${item.locked ? 'text-gray-400' : 'text-gray-600'}`} />
                    <div className="flex flex-col">
                      <span className={`font-medium ${item.locked ? 'text-gray-500' : 'text-gray-700'}`}>{item.label}</span>
                      {item.locked && item.lockedMessage && (
                        <span className="text-[10px] text-gray-500 font-medium mt-0.5">{item.lockedMessage}</span>
                      )}
                    </div>
                </div>
                {item.locked ? (
                  <Lock className="w-4 h-4 text-gray-300" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                )}
             </button>
         ))}
      </div>

      {/* 4. Logout Button */}
      <button 
        onClick={() => {
            // Standard cleanup for all possible token keys
            const keys = ["accessToken", "refreshToken", "expiresAt", "user", "token", "refresh_token", "agenda_token", "token_expiry"];
            keys.forEach(k => {
                globalThis.localStorage.removeItem(k);
                globalThis.sessionStorage.removeItem(k);
            });
            globalThis.sessionStorage.removeItem("applicant_user");
            window.location.reload();
        }}
        className="w-full bg-white rounded-[24px] p-5 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] border border-gray-100 flex items-center gap-3 hover:bg-gray-50 transition-colors"
      >
         <LogOut className="w-5 h-5 text-gray-900" />
         <span className="text-gray-900 font-medium">Logout</span>
      </button>
    </div>
  );
};
