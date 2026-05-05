import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { useAuth } from "@/contexts/AuthContext"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
// FORCE RELOAD: Ensuring UserCheck is imported from lucide-react
import { 
  ChevronLeft, 
  User, 
  MapPin, 
  Briefcase, 
  Calendar, 
  Hash, 
  Shield, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  X,
  ShieldAlert,
  Phone,
  PhoneCall,
  UserCheck
} from "lucide-react"

// Force-reload comment to ensure Vite picks up the correct import and file version
import { Button } from "@/components/ui/button"
import { 
  getUserDetail, 
  getUserSessions, 
  addFlag, 
  deleteFlag, 
  blockUser, 
  unblockUser, 
  verifyUserKyc,
  softRejectUserKyc,
  failUserKyc,
  restoreUserKyc,
  editUser
} from "@/lib/api"
import { getFriendlyErrorMessage } from "@/lib/errorUtils"
import { EditUserSheet } from "@/components/user/EditUserSheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SecureKycImage } from "@/components/common/SecureKycImage"

// Helper to format dates to DD/MM/YYYY
const formatDate = (dateInput: any) => {
  if (!dateInput) return "N/A";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString('en-GB'); // Uses DD/MM/YYYY format
};

// ─── UI Components (Local) ──────────────────────────────────────────────────
const Pill = ({ color = 'gray', children, className = '' }: any) => {
  const colors: any = {
    teal:   'bg-teal-50 text-teal-800 border border-teal-100 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-800/30',
    amber:  'bg-amber-50 text-amber-800 border border-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/30',
    red:    'bg-red-50 text-red-800 border border-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/30',
    blue:   'bg-blue-50 text-blue-800 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30',
    gray:   'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
    purple: 'bg-purple-50 text-purple-800 border border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/30',
    brand:  'bg-pink-50 text-pink-700 border border-pink-100 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-800/30',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${colors[color]} ${className}`}>
      {children}
    </span>
  )
}

const SectionHeader = ({ children }: any) => (
  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-4 font-sans flex items-center gap-2">
    <span className="w-1 h-3 bg-pink-500 rounded-full" />
    {children}
  </p>
)

const Card = ({ children, className = '' }: any) => (
  <div className={`bg-white dark:bg-gray-900 border border-pink-100/50 dark:border-gray-800 rounded-3xl shadow-sm hover:shadow-pink/5 transition-all duration-300 ${className}`}>
    {children}
  </div>
)

const InnerCard = ({ children, className = '' }: any) => (
  <div className={`bg-pink-50/30 dark:bg-gray-800/50 border border-pink-100/50 dark:border-gray-700/50 rounded-2xl ${className}`}>
    {children}
  </div>
)

const MetricCard = ({ label, value, sub, valueColor = '' }: any) => (
  <div className="bg-white dark:bg-gray-800/50 border border-pink-100/40 dark:border-transparent rounded-2xl p-4 shadow-sm hover:shadow-pink/5 transition-all">
    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5 font-sans">{label}</p>
    <p className={`text-2xl font-black font-mono tracking-tight ${valueColor || 'text-gray-900 dark:text-gray-100'}`}>{value}</p>
    {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-medium font-sans">{sub}</p>}
  </div>
)

const DetailItem = ({ label, value, icon: Icon, onCall }: any) => (
  <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-gray-800/50 border border-pink-100/40 dark:border-transparent group/item">
    <div className="w-8 h-8 rounded-xl bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center text-pink-600 dark:text-pink-400">
      <Icon size={14} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-gray-900 dark:text-gray-100 break-words line-clamp-1">{value || 'N/A'}</p>
        {onCall && value && value !== 'N/A' && (
          <button 
            onClick={() => onCall(value)}
            className="p-1.5 rounded-lg bg-pink-50 text-pink-600 opacity-0 group-hover/item:opacity-100 transition-all hover:bg-pink-600 hover:text-white"
          >
            <Phone size={12} />
          </button>
        )}
      </div>
    </div>
  </div>
)

const KYCDoc = ({ label, type, imageUrl }: any) => {
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  
  return (
    <>
      <SecureKycImage 
        imageUrl={imageUrl}
        imageType={type}
        label={label}
        className="w-full h-full"
        onExpand={setZoomUrl}
      />

      <Dialog open={!!zoomUrl} onOpenChange={() => setZoomUrl(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] p-0 overflow-hidden bg-black/95 border-none rounded-[2rem]">
          <DialogHeader className="absolute top-4 right-4 z-50">
            <Button variant="outline" size="icon" className="rounded-full bg-white/10 border-white/10 hover:bg-white/20 text-white" onClick={() => setZoomUrl(null)}>
              <span className="text-lg">×</span>
            </Button>
          </DialogHeader>
          <div className="w-full h-full flex items-center justify-center p-4">
            {zoomUrl && (
              <img 
                src={zoomUrl} 
                alt={label} 
                className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" 
              />
            )}
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/10">
            <p className="text-white text-xs font-black uppercase tracking-[0.2em]">{label}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const FlagBanner = ({ flag, id, onDeleted }: any) => {
  if (!flag) return null
  const isHigh = flag.level === 'high'
  const formattedDate = flag.createdAt ? formatDate(flag.createdAt) : formatDate(new Date());

  return (
    <div className={`px-5 py-4 mb-6 rounded-2xl border flex items-start justify-between gap-4 font-sans animate-fade-in shadow-sm
      ${isHigh
        ? 'border-red-200 bg-red-50 text-red-900 dark:bg-red-900/10 dark:border-red-800'
        : 'border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-900/10 dark:border-amber-800'}`}>
      <div className="flex gap-3 items-start">
        <div className={`p-2 rounded-xl scale-90 ${isHigh ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
          <ShieldAlert size={20} />
        </div>
        <div>
          <p className={`text-[10px] font-black uppercase tracking-widest ${isHigh ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
            {flag.level.toUpperCase()} severity flag active · {formattedDate} {flag.adminName ? `· By ${flag.adminName}` : ''}
          </p>
          <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mt-1 max-w-xl leading-relaxed">
            {flag.reason}
          </p>
        </div>
      </div>
      <button onClick={() => onDeleted(flag._id)} className="p-2 hover:bg-black/5 rounded-lg transition-colors group">
         <X size={16} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
      </button>
    </div>
  )
}

// ─── Flag Modal Component ───────────────────────────────────────────────────
const FlagModal = ({ userId, onClose, onSaved }: any) => {
  const [level, setLevel] = useState('normal')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  
  const handleSave = async () => {
    if (!reason.trim()) return
    setSaving(true)
    try {
      const res = await addFlag(userId, level, reason)
      onSaved(res.flags)
      toast.success("Flag added successfully")
      onClose()
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Flag this user</DialogTitle>
          <DialogDescription>Add a moderation flag for other admins to see.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Severity Level</Label>
            <select
              value={level}
              onChange={e => setLevel(e.target.value)}
              className="w-full bg-muted rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="normal">Normal</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Input 
              value={reason} 
              onChange={e => setReason(e.target.value)} 
              placeholder="e.g. Unusual repayment patterns..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !reason.trim()}>
            {saving ? "Saving..." : "Add Flag"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page Components ────────────────────────────────────────────────────
const ProfileHeader = ({ user, onFlag, onBlock, onEdit, onRemoveFlag, onCall, canWrite }: any) => {
  const activeFlag = user.flags?.slice(-1)[0] || null
  return (
    <Card className="p-8">
      {activeFlag && <FlagBanner flag={activeFlag} id={user._id} onDeleted={onRemoveFlag} />}
      <div className="flex flex-col md:flex-row gap-8 items-center md:items-start justify-between">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="w-20 h-20 rounded-[2.5rem] flex items-center justify-center bg-gradient-to-br from-pink-500 to-rose-600 shadow-xl shadow-pink-200 dark:shadow-none ring-4 ring-white dark:ring-gray-800">
            <span className="text-white text-3xl font-black">{user.fullName?.[0] || 'U'}</span>
          </div>
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center gap-3 flex-wrap justify-center md:justify-start mb-2">
              <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tight">{user.fullName}</h1>
              <Pill color="blue">L{user.currentTier || 1}</Pill>
              {user.kycStatus === 'VERIFIED' && <Pill color="teal">Verified</Pill>}
              <Pill color="brand" className="font-mono">{user.personalNodeCode || user.nodeCode}</Pill>
            </div>
            <div className="flex gap-4 flex-wrap justify-center md:justify-start text-[13px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wide">
              <div className="flex items-center gap-3">
                <span className="font-mono tracking-normal text-gray-900 dark:text-gray-100">{user.msisdn}</span>
                <button 
                  onClick={() => onCall(user.msisdn)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500 text-white hover:bg-pink-600 transition-all shadow-lg shadow-pink-500/20 active:scale-95"
                >
                  <PhoneCall size={12} strokeWidth={3} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Call</span>
                </button>
              </div>
              <span className="hidden md:inline opacity-30">·</span>
              <span>Joined {formatDate(user.createdAt)}</span>
            </div>
             <div className="mt-2">
              {user.referredByNodeCode && (
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <span className="text-pink-600 dark:text-pink-400 font-black text-[10px] tracking-[0.2em] uppercase">Referred by:</span>
                  <span className="text-gray-900 dark:text-gray-100 font-black text-[11px] font-mono">{user.referredByNodeCode}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2.5 flex-wrap justify-center md:justify-end">
          <button onClick={onFlag} className="px-4 py-2 rounded-xl border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 text-xs font-black uppercase tracking-widest hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all">Flag</button>
          <button onClick={onBlock} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${user.isBlocked ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/20'}`}>
            {user.isBlocked ? 'Unblock' : 'Block'}
          </button>
          <button onClick={onEdit} className="px-4 py-2 rounded-xl border border-pink-100 dark:border-gray-700 text-pink-600 dark:text-pink-400 text-xs font-black uppercase tracking-widest hover:bg-pink-50 dark:hover:bg-gray-800 transition-all">Edit</button>
        </div>
      </div>
    </Card>
  )
}

export default function UserDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { canWrite } = useAuth()
  const queryClient = useQueryClient()
  
  const [activeTab, setActiveTab] = useState('Identity')
  const [flagModalOpen, setFlagModalOpen] = useState(false)
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false)
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false)
  const [blockReason, setBlockReason] = useState('')

  const handleCall = (number: string) => {
    window.location.href = `tel:${number}`
  }

  // 1) Primary Data Fetch
  const { data: detailRes, isLoading, error } = useQuery({
    queryKey: ['user-detail', id],
    queryFn: () => getUserDetail(id!),
    enabled: !!id
  })

  const payload = detailRes?.data || {}
  const { user, activeLoan, loanHistory, sessions, deviceConflicts, weeklyUsage, referrals, referralQuality } = payload

  // 2) Paginated Sessions (for Activity tab)
  const [sessionPage, setSessionPage] = useState(1)
  const { data: sessionsRes, isFetching: isFetchingSessions } = useQuery({
    queryKey: ['user-sessions', id, sessionPage],
    queryFn: () => getUserSessions(id!, sessionPage),
    enabled: activeTab === 'Activity' && !!id,
    placeholderData: (prev) => prev
  })

  // 3) Mutations
  const removeFlagMutation = useMutation({
    mutationFn: (flagId: string) => deleteFlag(id!, flagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-detail', id] })
      toast.success("Flag removed successfully")
    },
    onError: (err) => toast.error(getFriendlyErrorMessage(err))
  })

  const blockMutation = useMutation({
    mutationFn: (reason: string) => user.isBlocked ? unblockUser(user.msisdn, reason) : blockUser(user.msisdn, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-detail', id] })
      toast.success(user.isBlocked ? "User unblocked" : "User blocked")
      setIsBlockModalOpen(false)
    },
    onError: (err) => toast.error(getFriendlyErrorMessage(err))
  })

  if (isLoading) return (
    <DashboardLayout>
      <div className="flex h-[60vh] items-center justify-center">
        <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  )

  if (error || !user) return (
    <DashboardLayout>
       <div className="p-12 text-center">
         <h2 className="text-2xl font-bold">User Not Found</h2>
         <p className="text-muted-foreground mt-2">Error loading user details or user does not exist.</p>
         <Button className="mt-6" onClick={() => navigate('/users')}>Back to Users</Button>
       </div>
    </DashboardLayout>
  )

  // Robust Identity Resolution - SAFE HERE after data guards
  const resolvedIdentity = {
    momoName: user.kyc?.momoName || loanHistory?.find((l: any) => l.momoResolvedName)?.momoResolvedName || 'N/A',
    ghanaCardName: user.kyc?.ghanaCardName || user.fullName || 'N/A',
    ghanaCardNumber: user.kyc?.ghanaCardNumber || user.ghanaCardNumber || 'N/A'
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-12">
        
        {/* Top Navigation */}
        <div className="flex items-center justify-between py-2">
           <button onClick={() => navigate('/users')} className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-pink-600 transition-colors group">
             <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /> Back to members directory
           </button>
        </div>

        {/* 1. Header & Summary */}
        <ProfileHeader 
          user={user} 
          onFlag={() => setFlagModalOpen(true)}
          onBlock={() => setIsBlockModalOpen(true)}
          onEdit={() => setIsEditDrawerOpen(true)}
          onRemoveFlag={(flagId: string) => removeFlagMutation.mutate(flagId)}
          onCall={handleCall}
          canWrite={canWrite}
        />

        {/* 2. Main Stats Bar */}
        <Card className="p-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
           <MetricCard label="On-time Rate" value={`${payload.onTimeRateTrend?.[0]?.rate || 90}%`} sub="Historical average" valueColor="text-teal-600" />
           <MetricCard label="Credit Score" value={user.creditScore || 80} sub="Out of 100" />
           <MetricCard label="Repayment Ratio" value={payload.referralQuality?.positiveRate?.toFixed(1) || '1.0'} sub="Recovery performance" />
           <MetricCard 
             label="Total Borrowed" 
             value={`₵${loanHistory?.filter((l: any) => !['AWAITING_ENDORSEMENT', 'PENDING', 'REJECTED', 'CANCELLED'].includes(l.status?.toUpperCase())).reduce((s: any, l: any) => s + (l.principal || 0), 0).toLocaleString()}`} 
             sub="Sum of all loan principals" 
           />
           <MetricCard label="Nodes" value={referrals?.length || 0} sub="Direct Network" />
           <MetricCard label="Last Seen" value={payload.lastSeen?.at ? formatDate(payload.lastSeen.at) : 'N/A'} sub={payload.lastSeen?.channel || 'Unknown'} />
        </Card>

        {/* 3. Content Tabs */}
        <div className="grid lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 space-y-8">
              <div className="flex gap-1 p-1 bg-white dark:bg-gray-900 border border-pink-100/50 dark:border-gray-800 rounded-2xl w-full sm:w-fit shadow-sm overflow-x-auto no-scrollbar">
                {['Identity', 'Financials', 'Activity'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
                      activeTab === tab ? 'bg-pink-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === 'Identity' && (
                <div className="space-y-8 animate-fade-in">
                  <Card className="p-8">
                    <SectionHeader>Identity Verification Documents</SectionHeader>
                    <div className="grid sm:grid-cols-3 gap-6">
                      <KYCDoc label="Selfie ID" type="selfie" imageUrl={user.selfieUrl} />
                      <KYCDoc label="Card Front" type="front" imageUrl={user.ghanaCardFrontUrl} />
                      <KYCDoc label="Card Back" type="back" imageUrl={user.ghanaCardBackUrl} />
                    </div>
                    <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <InnerCard className="p-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Momo Name</p>
                        <p className="text-sm font-black text-gray-900 dark:text-gray-100 font-mono">{resolvedIdentity.momoName}</p>
                      </InnerCard>
                      <InnerCard className="p-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">ID Number</p>
                        <p className="text-sm font-black text-gray-900 dark:text-gray-100 font-mono">{resolvedIdentity.ghanaCardNumber}</p>
                      </InnerCard>
                      <InnerCard className="p-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Card Name</p>
                        <p className="text-sm font-black text-gray-900 dark:text-gray-100 truncate">{resolvedIdentity.ghanaCardName}</p>
                      </InnerCard>
                    </div>
                  </Card>

                  <Card className="p-8">
                     <SectionHeader>User Personal Metadata</SectionHeader>
                     <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <DetailItem label="Employment" value={user.metadata?.employmentStatus || user.employmentStatus} icon={Briefcase} />
                        <DetailItem label="Monthly Income" value={user.metadata?.monthlyIncome || user.monthlyIncome} icon={Hash} />
                        <DetailItem label="Location" value={user.metadata?.location || user.region} icon={MapPin} />
                        <DetailItem label="Address" value={user.metadata?.address || user.address} icon={MapPin} />
                        <DetailItem label="Gender" value={user.metadata?.gender || user.gender} icon={User} />
                        <DetailItem label="Birthday" value={(user.metadata?.dob || user.dob) ? formatDate(user.metadata?.dob || user.dob) : 'N/A'} icon={Calendar} />
                        <DetailItem label="Accomodation" value={user.metadata?.accommodationType || user.metadata?.accomodation || user.accommodationType} icon={MapPin} />
                        <DetailItem label="Alt Phone" value={user.metadata?.alternatePhone || user.alternatePhone || 'N/A'} icon={Phone} onCall={handleCall} />
                        <DetailItem label="Status" value={user.isBlocked ? 'Blocked' : 'Active'} icon={User} />
                        <DetailItem label="Assigned To" value={user.currentAssignedAgent?.name || 'Unassigned'} icon={UserCheck} />
                     </div>
                  </Card>
                </div>
              )}

              {activeTab === 'Financials' && (
                <div className="space-y-8 animate-fade-in">
                   <Card className="p-8">
                    <SectionHeader>Repayment Behavior</SectionHeader>
                    <div className="grid md:grid-cols-2 gap-12">
                       <div>
                          <p className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-2 font-mono">{payload.onTimeRateTrend?.[0]?.rate || 90}%</p>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 leading-relaxed">The user consistently pays back installments before the due date.</p>
                          <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                            <div className="bg-teal-500 h-full" style={{ width: `${payload.onTimeRateTrend?.[0]?.rate || 90}%` }} />
                            <div className="bg-amber-400 h-full" style={{ width: '4%' }} />
                            <div className="bg-red-500 h-full" style={{ width: '2%' }} />
                          </div>
                          <div className="flex justify-between mt-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                             <span className="text-teal-600 font-bold">On Time</span>
                             <span className="text-amber-600 font-bold">Late</span>
                             <span className="text-red-600 font-bold">Missed</span>
                          </div>
                       </div>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <MetricCard label="Average Days Saved" value="2.4" sub="Paid earlier than scheduled" />
                          <MetricCard label="Recovery Ratio" value="1.0" sub="All funds recovered" valueColor="text-teal-600" />
                       </div>
                    </div>
                   </Card>

                   <Card className="p-8">
                      <SectionHeader>Historical Records</SectionHeader>
                      <div className="space-y-4">
                        {loanHistory?.length > 0 ? loanHistory.map((loan: any) => (
                          <div key={loan._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl bg-pink-50/20 dark:bg-gray-800/50 border border-pink-100/30 hover:border-pink-300 transition-colors gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-900 flex items-center justify-center text-pink-600 shadow-sm border border-pink-100/30">
                                <Shield size={18} strokeWidth={2.5} />
                              </div>
                              <div>
                                 <p className="text-sm font-black text-gray-900 dark:text-gray-100 font-mono">{loan.loanReference || loan.loanRef}</p>
                                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{formatDate(loan.createdAt)}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-8 text-right sm:text-left">
                               <div className="hidden sm:block">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Principal</p>
                                  <p className="text-xs font-black text-gray-900 dark:text-gray-100 font-mono">₵{(loan.principal || 0).toLocaleString()}</p>
                               </div>
                               <div className="hidden sm:block">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Interest</p>
                                  <p className="text-xs font-black text-gray-600 dark:text-gray-400 font-mono">₵{(loan.interestAmount || 0).toLocaleString()}</p>
                               </div>
                               <div>
                                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Due Date</p>
                                  <p className="text-xs font-black text-gray-900 dark:text-gray-100 font-mono">{formatDate(loan.dueDate)}</p>
                               </div>
                               <div className="min-w-[80px] text-right">
                                  <p className="text-sm font-black text-pink-600 dark:text-pink-400 font-mono">₵{(loan.totalPayable || (loan.principal + loan.interestAmount) || 0).toLocaleString()}</p>
                                  <Pill color={loan.status === 'ACTIVE' ? 'blue' : 'teal'} className="mt-1 scale-90 origin-right">{(loan.status || 'CLOSED').toUpperCase()}</Pill>
                               </div>
                            </div>
                          </div>
                        )) : (
                          <div className="text-center py-12 text-gray-400 font-bold uppercase text-[10px] tracking-widest">No loan history found</div>
                        )}
                      </div>
                   </Card>
                </div>
              )}

              {activeTab === 'Activity' && (
                <div className="space-y-8 animate-fade-in">
                  {/* Device Conflicts Alert */}
                  {deviceConflicts?.length > 0 && deviceConflicts.map((c: any) => (
                    <div key={c.userId} className="p-4 rounded-2xl border-2 border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 flex items-start gap-3 shadow-sm">
                      <AlertCircle className="text-red-600 mt-0.5" size={18} strokeWidth={2.5} />
                      <p className="text-[11px] text-red-700 dark:text-red-400 font-bold leading-normal">
                        Security Alert: Device conflict detected with {c.isBlocked ? 'blocked user' : 'user'} <span className="font-black underline underline-offset-2">{c.userId}</span>. Possible multi-account fraud attempt.
                      </p>
                    </div>
                  ))}

                  <Card className="p-8">
                    <div className="flex items-center justify-between mb-6">
                      <SectionHeader>Member Activity History</SectionHeader>
                    </div>
                    <div className="space-y-1">
                      {sessionsRes?.sessions?.map((s: any, i: any) => {
                        if (s.type === 'CALL' || s.action === 'CALL') {
                          let badgeColor = 'bg-gray-100 text-gray-700 border-gray-200';
                          const outcomeStr = (s.outcome || '').toLowerCase();
                          if (outcomeStr.includes('promise')) badgeColor = 'bg-amber-100 text-amber-700 border-amber-200';
                          else if (outcomeStr.includes('paid') || outcomeStr.includes('answered')) badgeColor = 'bg-green-100 text-green-700 border-green-200';
                          else if (outcomeStr.includes('number off') || outcomeStr.includes('wrong number')) badgeColor = 'bg-red-100 text-red-700 border-red-200';
                          else if (outcomeStr.includes('other')) badgeColor = 'bg-blue-100 text-blue-700 border-blue-200';
                          else if (outcomeStr.includes('no answer') || outcomeStr.includes('unanswered')) badgeColor = 'bg-gray-100 text-gray-700 border-gray-200';
                          
                          return (
                            <div key={s._id || i} className="flex gap-4 py-4 items-start px-2 rounded-2xl border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                              <div className="w-8 h-8 rounded-full bg-pink-50 dark:bg-pink-900/20 text-pink-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <PhoneCall size={14} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                  <p className="text-sm font-black text-gray-900 dark:text-gray-200">
                                    {s.csaAgentName || 'Agent'} <span className="font-bold text-gray-400 text-[11px] ml-1 uppercase tracking-widest">logged a call</span>
                                  </p>
                                  <span className="text-[10px] text-gray-400 font-mono font-black shrink-0">
                                    {new Date(s.timestamp || s.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · {formatDate(s.timestamp || s.createdAt)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${badgeColor}`}>
                                    {s.outcome || 'Unknown'}
                                  </span>
                                  {s.callDuration && (
                                    <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-widest">
                                      <Clock size={12} /> {s.callDuration}
                                    </span>
                                  )}
                                </div>
                                {s.notes && (
                                  <div className="mt-3 bg-gray-50 dark:bg-gray-800/50 border-l-2 border-pink-400 p-3 rounded-r-xl">
                                    <p className="text-xs text-gray-600 dark:text-gray-300 italic">{s.notes}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={s._id || i} className={`flex gap-4 py-4 items-start px-2 rounded-2xl border-b border-gray-50 dark:border-gray-800/50 last:border-0`}>
                            <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 shadow-sm ${s.channel === 'app' ? 'bg-teal-500' : 'bg-purple-500'}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <p className="text-sm font-black text-gray-900 dark:text-gray-200 capitalize">
                                  {s.channel === 'app' ? 'App Session' : 'USSD Entry'} · {s.type || s.action?.replace(/_/g, ' ')}
                                </p>
                                <span className="text-[10px] text-gray-400 font-mono font-black">
                                  {new Date(s.timestamp || s.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · {formatDate(s.timestamp || s.createdAt)}
                                </span>
                              </div>
                                <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 mt-1">
                                  {s.channel === 'app'
                                    ? `${s.deviceMeta?.model || 'Unknown'} · ${s.deviceMeta?.os || 'Unknown'}`
                                    : 'Session originated via *415*102# · USSD Access'}
                                </p>
                            </div>
                          </div>
                        );
                      })}
                      
                      {sessionsRes?.total > sessionsRes?.sessions?.length && (
                        <button 
                          onClick={() => setSessionPage(p => p + 1)}
                          disabled={isFetchingSessions}
                          className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-pink-600 hover:text-pink-700 transition-colors"
                        >
                          {isFetchingSessions ? 'Loading...' : 'Load more activity'}
                        </button>
                      )}
                    </div>
                  </Card>
                </div>
              )}
           </div>

           {/* 4. Sidebar */}
           <div className="space-y-8">
              {activeLoan ? (
                <Card className="p-8 bg-gradient-to-br from-white to-pink-50/20 dark:from-gray-900 dark:to-pink-900/5 relative overflow-hidden">
                  <SectionHeader>Active Loan Focus</SectionHeader>
                  <div className="mt-6 p-6 rounded-[2rem] bg-white dark:bg-gray-800 shadow-xl border border-pink-100/30">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-600 mb-1">Total Payback</p>
                        <p className="text-4xl font-black text-gray-900 dark:text-gray-100 font-mono tracking-tighter">₵{activeLoan.totalPayable || activeLoan.amountBorrowed}</p>
                      </div>
                      <Pill color={activeLoan.daysOverdue > 0 ? 'red' : 'teal'}>{activeLoan.paymentStatus?.toUpperCase() || 'ACTIVE'}</Pill>
                    </div>
                    <div className="space-y-4 mb-4">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-gray-400">Principal</span>
                        <span className="text-gray-900 dark:text-gray-100 font-mono font-black">₵{activeLoan.principal || activeLoan.amountBorrowed}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-gray-400">Balance</span>
                        <span className="text-gray-900 dark:text-gray-100 font-mono font-black">₵{activeLoan.balanceRemaining}</span>
                      </div>
                    </div>
                    {activeLoan.daysOverdue > 0 && (
                      <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 text-[10px] font-black uppercase tracking-widest text-center">
                        {activeLoan.daysOverdue} Days Overdue
                      </div>
                    )}
                  </div>
                </Card>
              ) : (
                <Card className="p-8 bg-gradient-to-br from-white to-teal-50/10 dark:from-gray-900 dark:to-teal-900/5">
                  <SectionHeader>Account Health</SectionHeader>
                  <div className="mt-4 space-y-6">
                    <div className="p-4 rounded-2xl bg-teal-50/30 dark:bg-teal-900/10 border border-teal-100/30">
                       <p className="text-[10px] font-black uppercase tracking-widest text-teal-600 mb-1">Lifetime Reliability</p>
                       <p className="text-2xl font-black text-gray-900 dark:text-gray-100 font-mono">{payload.onTimeRateTrend?.[0]?.rate || 100}%</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800">
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Loans</p>
                          <p className="text-lg font-black text-gray-900 dark:text-gray-100">
                            {loanHistory?.filter((l: any) => !['AWAITING_ENDORSEMENT', 'PENDING', 'REJECTED', 'CANCELLED'].includes(l.status?.toUpperCase())).length || 0}
                          </p>
                       </div>
                       <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800">
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Nodes</p>
                          <p className="text-lg font-black text-gray-900 dark:text-gray-100">{referrals?.length || 0}</p>
                       </div>
                    </div>
                    <div className="pt-2">
                       <p className="text-[10px] text-gray-400 font-bold">No active liabilities found. This member is currently eligible for an advancement.</p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Weekly Intensity */}
              <Card className="p-8">
                <SectionHeader>App Session Intensity</SectionHeader>
                <div className="mt-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6">Weekly volume (last 4 periods)</p>
                  <div className="flex items-end gap-3 h-24 mb-4 bg-pink-50/20 dark:bg-gray-800/20 p-4 rounded-2xl">
                    {weeklyUsage?.map((w: any, i: any) => {
                      const maxCount = Math.max(...weeklyUsage.map((x: any) => x.count), 1)
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                          <div 
                            className={`w-full rounded-t-lg transition-all duration-500 bg-pink-200 dark:bg-gray-700 group-hover:bg-pink-500`}
                            style={{ height: `${(w.count / maxCount) * 100}%`, minHeight: '8px' }}
                          />
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">W{w.week}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </Card>

              {/* Referrals (Growth) */}
              <Card className="p-8">
                <SectionHeader>Network Growth</SectionHeader>
                <div className="mt-6 space-y-4">
                  {referrals?.slice(0, 3).map((ref: any) => (
                    <div key={ref._id} className="flex items-center justify-between p-4 rounded-2xl bg-pink-50/30 dark:bg-gray-800/50 border border-pink-100/20">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white dark:bg-gray-700 flex items-center justify-center text-xs font-black text-pink-600 shadow-sm">{ref.fullName?.[0]}</div>
                        <div>
                          <p className="text-xs font-black text-gray-900 dark:text-gray-100 tracking-tight">{ref.fullName}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">T{ref.currentTier}</p>
                        </div>
                      </div>
                      <Pill color="teal" className="scale-75 origin-right">Active</Pill>
                    </div>
                  ))}
                  {(!referrals || referrals.length === 0) && (
                    <p className="text-[10px] font-bold text-gray-400 text-center py-4">No referrals found</p>
                  )}
                </div>
              </Card>
           </div>
        </div>

        {/* Modals & Controls */}
        {flagModalOpen && <FlagModal userId={id} onClose={() => setFlagModalOpen(false)} onSaved={() => queryClient.invalidateQueries({ queryKey: ['user-detail', id] })} />}
        
        {isEditDrawerOpen && (
          <EditUserSheet 
            isOpen={isEditDrawerOpen} 
            setIsOpen={setIsEditDrawerOpen} 
            userPhone={user.msisdn} 
            userId={id!} 
            initialData={user} 
          />
        )}
      </div>
    </DashboardLayout>
  )
}
