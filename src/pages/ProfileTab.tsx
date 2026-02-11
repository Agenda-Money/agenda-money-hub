import React, { useState } from "react";
import { 
  Bell, 
  FileText, 
  Lock, 
  HelpCircle, 
  LogOut, 
  ChevronRight, 
  CheckCircle2,
  ShieldCheck
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfileTabProps {
  onboardingData: any;
  userData: any;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ onboardingData, userData }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // Handle potential field mismatches (Agent onboarding uses fullName, Self uses firstName)
  const firstName = userData?.firstName || userData?.fullName || onboardingData?.firstName || "User";
  const surname = userData?.surname || onboardingData?.surname || "Name";
  const fullName = `${firstName} ${surname}`.toUpperCase();
  const initials = `${firstName?.[0] || ""}${surname?.[0] || ""}`.toUpperCase();
  const phone = userData?.mobileNumber || userData?.msisdn || onboardingData?.mobileNumber || "+233 -- --- ----";

  const menuItems = [
    { icon: FileText, label: "Terms & Conditions", action: () => {} },
    { icon: Lock, label: "Privacy Policy", action: () => {} },
    { icon: HelpCircle, label: "Help", action: () => {} },
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

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm">
            <span className="text-xs font-bold text-gray-700">ID Verified</span>
            <ShieldCheck className="w-4 h-4 text-gray-600" fill="#e5e7eb" /> 
        </div>
      </div>

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
      <div className="bg-white rounded-[24px] overflow-hidden shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] border border-gray-100 divide-y divide-gray-100">
         {menuItems.map((item, index) => (
             <button 
                key={index}
                onClick={item.action}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors text-left"
             >
                <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-700 font-medium">{item.label}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
             </button>
         ))}
      </div>

      {/* 4. Logout Button */}
      <button 
        onClick={() => {
            globalThis.localStorage.removeItem("agenda_token");
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
