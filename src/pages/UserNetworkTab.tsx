import React from "react";
import { ArrowLeft, Share2, Copy, Users, UserCheck, ShieldCheck, CheckCircle2, ChevronRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getUserNetworkSummary } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

interface UserNetworkTabProps {
  onBack: () => void;
  userMsisdn?: string;
  personalNodeCode?: string;
}

export const UserNetworkTab: React.FC<UserNetworkTabProps> = ({ onBack, userMsisdn, personalNodeCode }) => {
  const { toast } = useToast();

  const { data: networkResponse, isLoading } = useQuery({
    queryKey: ["userNetwork", userMsisdn],
    queryFn: async () => {
      const res = await getUserNetworkSummary();
      return res.data;
    }
  });

  const networkData = networkResponse;

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
      toast({
         title: "Code Copied",
         description: "Node code copied to clipboard!",
      });
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const calculateProgress = () => {
    if (!networkData?.networkCapacity) return 0;
    const { current, max } = networkData.networkCapacity;
    if (!max || max === 0) return 0;
    return (current / max) * 100;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
         <div className="flex flex-col gap-4">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-[150px] w-full rounded-2xl" />
            <Skeleton className="h-[300px] w-full rounded-2xl" />
         </div>
      </div>
    );
  }

  const progressPercent = calculateProgress();
  const activeReferralsCount = networkData?.networkCapacity?.current || 0;
  const capacityValue = networkData?.networkCapacity?.max || 3;
  const availableSlots = networkData?.networkCapacity?.available ?? Math.max(0, capacityValue - activeReferralsCount);

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24 animate-in fade-in slide-in-from-right-8 duration-500">
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 flex items-center px-4 z-40 max-w-md mx-auto">
        <Button variant="ghost" onClick={onBack} className="h-10 w-10 p-0 rounded-full shrink-0">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Button>
        <h1 className="text-base font-bold text-gray-900 ml-2">Your Network</h1>
      </header>

      <main className="pt-20 px-4 space-y-5 max-w-md mx-auto">
         
         {/* Referrer Info */}
         {networkData?.referrer && (
            <div className="bg-white rounded-[20px] p-4 flex items-center justify-between shadow-sm border border-gray-100">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold relative">
                     {networkData.referrer.fullName?.[0] || 'U'}
                     <div className="absolute -bottom-1 -right-1 bg-white p-[2px] rounded-full">
                        <ShieldCheck className="w-4 h-4 text-blue-500" />
                     </div>
                  </div>
                  <div>
                     <p className="text-xs text-gray-500 font-medium">Referred By</p>
                     <p className="text-sm font-bold text-gray-900">{networkData.referrer.fullName}</p>
                  </div>
               </div>
               {networkData.referrer.nodeCode && (
                 <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold font-mono tracking-wider border border-blue-100/50">
                    {networkData.referrer.nodeCode}
                 </div>
               )}
            </div>
         )}

         {/* Capacity Card */}
         <div className="bg-white rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden relative">
            <h2 className="text-sm font-bold text-gray-900 mb-2">Network Capacity</h2>
            <div className="flex items-end justify-between mb-4">
               <div>
                  <p className="text-2xl font-black text-[#EC1B84]">{activeReferralsCount}<span className="text-gray-400 text-lg">/{capacityValue}</span></p>
                  <p className="text-xs font-medium text-gray-500 mt-1">Active Loans</p>
               </div>
               <div className="text-right">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${availableSlots > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                     {availableSlots} {availableSlots === 1 ? 'Slot' : 'Slots'} Available
                  </span>
               </div>
            </div>
            
            <div className="space-y-2">
               <Progress value={progressPercent} className="h-3 bg-gray-100" indicatorClassName="bg-[#EC1B84]" />
            </div>
         </div>

         {/* Referrals List */}
         <div>
            <h3 className="text-sm font-bold text-gray-900 mb-4 px-1 flex items-center justify-between">
               Your Referrals
               <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                  {networkData?.referrals?.length || 0} Total
               </span>
            </h3>

            <div className="space-y-3">
               {!networkData?.referrals || networkData.referrals.length === 0 ? (
                  <div className="bg-white rounded-[24px] p-8 text-center text-gray-400 text-sm border border-gray-100 border-dashed">
                     <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                     <p className="font-medium text-gray-500 mb-1">Your network is empty</p>
                     <p className="text-xs">Share your code to earn up to GHS 15 per referral!</p>
                  </div>
               ) : (
                  networkData.referrals.map((user: any, idx: number) => {
                     const isRepaid = user.status === "REPAID" || user.loanStatus === "REPAID";
                     return (
                        <div key={user.id || idx} className={`bg-white rounded-2xl p-4 border transition-all ${isRepaid ? 'border-gray-100 opacity-80' : 'border-pink-50 shadow-sm relative overflow-hidden'}`}>
                           
                           {/* Highlight active indicator */}
                           {!isRepaid && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-pink-400 to-amber-400"></div>
                           )}

                           <div className="flex justify-between items-start mb-3">
                              <div className="flex gap-3">
                                 <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isRepaid ? 'bg-gray-100 text-gray-500' : 'bg-pink-50 text-pink-600'}`}>
                                    {isRepaid ? <CheckCircle2 className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                                 </div>
                                 <div className="space-y-0.5">
                                    <h4 className="font-bold text-gray-900 text-sm">{user.fullName}</h4>
                                    <p className="text-xs text-gray-500 font-mono tracking-tight">{user.msisdn}</p>
                                 </div>
                              </div>
                              <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                 isRepaid ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700'
                              }`}>
                                 {isRepaid ? 'Repaid' : 'Active'}
                              </div>
                           </div>

                           <div className="bg-gray-50/80 rounded-xl p-3 grid grid-cols-2 gap-2 text-xs">
                              <div>
                                 <p className="text-gray-500 mb-0.5 font-medium">Loan</p>
                                 <p className="font-bold text-gray-900">GHS {user.loanAmount}</p>
                              </div>
                              <div>
                                 <p className="text-gray-500 mb-0.5 font-medium">Activity</p>
                                 <p className="font-bold text-green-600">
                                    {isRepaid ? 'Slot Opened' : `${user.daysUntilRepayment || '?'} days left`}
                                 </p>
                              </div>
                           </div>
                        </div>
                     )
                  })
               )}
            </div>
         </div>

         {/* Share Action */}
         {personalNodeCode && (
            <div className="pt-4 pb-8">
               <div className="bg-gradient-to-br from-[#EC1B84] to-[#C1106A] rounded-[24px] p-6 text-center text-white shadow-xl shadow-pink-200">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                     <Zap className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">Share & Earn</h3>
                  <p className="text-pink-100 text-sm mb-6 leading-relaxed px-2">
                     Invite friends using your Node Code. Earn <strong className="text-white">GHS 5</strong> when they sign up and <strong className="text-white">GHS 10</strong> when they repay!
                  </p>
                  
                  <div className="bg-white/10 rounded-2xl p-4 flex items-center justify-between border border-white/20 backdrop-blur-md mb-4">
                     <div className="text-left font-mono tracking-[0.2em] font-bold text-xl ml-2 text-white">
                        {personalNodeCode}
                     </div>
                     <Button 
                        onClick={() => {
                           navigator.clipboard.writeText(personalNodeCode);
                           toast({ title: "Code Copied", description: "Node code copied to clipboard!" });
                        }}
                        variant="ghost" 
                        size="sm"
                        className="h-10 text-white hover:bg-white/20 rounded-xl px-4 font-bold"
                     >
                        <Copy className="w-4 h-4 mr-2" /> Copy
                     </Button>
                  </div>
                  
                  <Button 
                     onClick={handleShare}
                     className="w-full h-14 bg-white text-[#EC1B84] hover:bg-gray-50 font-bold rounded-2xl text-[15px] shadow-lg"
                  >
                     <Share2 className="w-5 h-5 mr-2" />
                     Share My Code
                  </Button>
               </div>
            </div>
         )}
      </main>
    </div>
  );
};
