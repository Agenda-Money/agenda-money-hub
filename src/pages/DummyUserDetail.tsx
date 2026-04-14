// UserDetail.jsx — Admin User Detail Page (Registered at /dummy-user-detail/:id)
// Stack: React + Tailwind CSS

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

// ─── Pill components ────────────────────────────────────────────────────────
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

// ─── Section header ──────────────────────────────────────────────────────────
const SectionHeader = ({ children }: any) => (
  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-4 font-sans flex items-center gap-2">
    <span className="w-1 h-3 bg-pink-500 rounded-full" />
    {children}
  </p>
)

// ─── Card ────────────────────────────────────────────────────────────────────
const Card = ({ children, className = '' }: any) => (
  <div className={`bg-white dark:bg-gray-900 border border-pink-100/50 dark:border-gray-800 rounded-3xl shadow-sm hover:shadow-pink/5 transition-all duration-300 ${className}`}>
    {children}
  </div>
)

// ─── InnerCard ───────────────────────────────────────────────────────────────
const InnerCard = ({ children, className = '' }: any) => (
  <div className={`bg-pink-50/30 dark:bg-gray-800/50 border border-pink-100/50 dark:border-gray-700/50 rounded-2xl ${className}`}>
    {children}
  </div>
)

// ─── MetricCard ──────────────────────────────────────────────────────────────
const MetricCard = ({ label, value, sub, valueColor = '' }: any) => (
  <div className="bg-white dark:bg-gray-800/50 border border-pink-100/40 dark:border-transparent rounded-2xl p-4 shadow-sm hover:shadow-pink/5 transition-all">
    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5 font-sans">{label}</p>
    <p className={`text-2xl font-black font-mono tracking-tight ${valueColor || 'text-gray-900 dark:text-gray-100'}`}>{value}</p>
    {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-medium font-sans">{sub}</p>}
  </div>
)

const DetailItem = ({ label, value, icon: Icon }: any) => (
  <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-gray-800/50 border border-pink-100/40 dark:border-transparent">
    <div className="w-8 h-8 rounded-xl bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center text-pink-600 dark:text-pink-400">
      <Icon size={14} />
    </div>
    <div>
      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
      <p className="text-xs font-bold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  </div>
)

const KYCDoc = ({ label, url }: any) => (
  <div className="group relative aspect-[1.6/1] rounded-2xl overflow-hidden border-2 border-pink-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 cursor-zoom-in">
    {url ? (
      <img src={url} alt={label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
    ) : (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
        <span className="text-[10px] font-black uppercase tracking-widest text-center px-4">{label} Missing</span>
      </div>
    )}
    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
      <span className="text-white text-xs font-black uppercase tracking-widest">Click to enlarge</span>
    </div>
    <div className="absolute top-3 left-3 px-2 py-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur rounded-lg shadow-sm border border-white/20">
      <p className="text-[8px] font-black uppercase tracking-[0.15em] text-pink-600">{label}</p>
    </div>
  </div>
)

// ─── Flag Banner ─────────────────────────────────────────────────────────────
const FlagBanner = ({ flag }: any) => {
  if (!flag) return null
  const isHigh = flag.level === 'high'
  return (
    <div className={`px-5 py-4 mb-6 rounded-2xl border flex items-start justify-between gap-4 font-sans animate-fade-in shadow-sm
      ${isHigh
        ? 'border-red-200 bg-red-50 text-red-900 dark:bg-red-900/10 dark:border-red-800'
        : 'border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-900/10 dark:border-amber-800'}`}>
      <div className="flex gap-3 items-start">
        <div className={`p-2 rounded-xl scale-90 ${isHigh ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2.5 13.5V2.5H9.5M9.5 2.5L10 4.5H13.5V9.5H8.5L8 7.5H2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div>
          <p className={`text-[10px] font-black uppercase tracking-widest ${isHigh ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
            {flag.level.charAt(0).toUpperCase() + flag.level.slice(1)} severity flag
          </p>
          <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mt-1 max-w-xl leading-relaxed">
            {flag.reason}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 font-mono">
             By {flag.adminName} · {new Date(flag.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>
      <Pill color={isHigh ? 'red' : 'amber'} className="hover:scale-105 transition-transform">{flag.level.toUpperCase()}</Pill>
    </div>
  )
}

// ─── Flag Modal ───────────────────────────────────────────────────────────────
const FlagModal = ({ userId, onClose, onSaved }: any) => {
  const [level, setLevel] = useState('normal')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (!reason.trim()) return setError('Reason is required')
    setSaving(true)
    try {
      // For dummy demo purposes, we'll just mock the API call if it fails
      const res = await fetch(`/admin/users/${userId}/flag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify({ level, reason }),
      })
      const data = await res.json()
      if (res.ok) onSaved(data.flags)
      else setError(data.error)
    } catch { 
      // Mock success for visual demo
      console.log("Mocked flag save", {level, reason})
      onSaved([{ level, reason, adminName: "Demo Admin", createdAt: new Date().toISOString() }])
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans" onClick={e => (e.target as any) === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Flag this user</h3>
        <SectionHeader>Flag level</SectionHeader>
        <select
          value={level}
          onChange={e => setLevel(e.target.value)}
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 mb-4 focus:outline-none focus:border-pink-500"
        >
          <option value="normal">Normal — low concern, monitor</option>
          <option value="medium">Medium — review before approving</option>
          <option value="high">High — strong concern</option>
        </select>
        <SectionHeader>Reason <span className="normal-case tracking-normal text-gray-400">(required · admin-only)</span></SectionHeader>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Describe the concern in detail..."
          rows={3}
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-pink-500 resize-none"
        />
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-xl text-sm text-white font-medium bg-pink-600 hover:bg-pink-700 disabled:opacity-50 transition-colors shadow-lg shadow-pink-900/20">
            {saving ? 'Saving...' : 'Save flag'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DummyUserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [flagModalOpen, setFlagModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('Identity')
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [darkMode])

  useEffect(() => {
    // Attempting to fetch actual data, with a fallback for demonstration
    fetch(`/api/admin/users/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
    })
      .then(r => r.json())
      .then(json => {
        if (json.data) setData(json.data)
        else throw new Error("No data")
      })
      .catch(() => {
        // Mock data for demonstration
        setData({
          user: {
            name: "Kwame Asante",
            phone: "+233 24 123 4567",
            tier: "L1",
            creditScore: 82,
            onTimeRepaymentRate: 94,
            createdAt: "2023-10-12T10:00:00Z",
            referredBy: "agent_01",
            agentName: "Agent Alpha",
            nodeCode: "NDA-KWAM-001",
            loansCompletedAtTier: 3,
            kycStatus: "pending", // Set to pending to show the alert banner
            kycDocs: {
              selfie: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kwame",
              front: null,
              back: null,
              momoName: "KWAME KOFI ASANTE",
              nameOnCard: "KWAME ASANTE",
              idNumber: "GHA-712345678-9"
            },
            flags: [
              { level: 'normal', reason: 'High initial request for tier', adminName: 'Admin Alpha', createdAt: '2023-11-01T08:00:00Z' }
            ]
          },
          activeLoan: {
            loanRef: "LON-2023-0045",
            amount: 500,
            interestAmount: 25.50,
            dueDate: "2023-12-25T23:59:59Z",
            status: "active",
            installments: [
              { dueDate: "2023-12-11T00:00:00Z", amountDue: 250, amountPaid: 250, status: "paid" },
              { dueDate: "2023-12-25T00:00:00Z", amountDue: 275.50, amountPaid: 0, status: "" }
            ]
          },
          loanHistory: [
            { _id: "1", loanRef: "LON-2023-0012", amount: 200, status: "repaid", createdAt: "2023-10-15T00:00:00Z", installments: [{status:'paid'},{status:'paid'}] },
            { _id: "2", loanRef: "LON-2023-0028", amount: 350, status: "repaid", createdAt: "2023-11-10T00:00:00Z", installments: [{status:'paid'},{status:'paid'}] }
          ],
          sessions: [
            { _id: "s1", channel: "app", action: "LOAN_REQUEST", createdAt: new Date().toISOString(), deviceMeta: { model: "iPhone 13", os: "iOS 16.1" } },
            { _id: "s2", channel: "ussd", action: "BALANCE_CHECK", createdAt: new Date(Date.now() - 3600000).toISOString() }
          ],
          deviceConflicts: [],
          weeklyUsage: [
            { week: 1, count: 5 },
            { week: 2, count: 8 },
            { week: 3, count: 4 },
            { week: 4, count: 12 }
          ],
          referrals: [
            { id: "REF-001", name: "Kofi Owusu", kycStatus: "verified", createdAt: "2023-11-20T00:00:00Z" },
            { id: "REF-002", name: "Ama Serwaa", kycStatus: "verified", createdAt: "2023-11-22T00:00:00Z" }
          ],
          referralLoans: [
            { userId: "REF-001", status: "repaid" }
          ]
        })
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-[#fffafa] dark:bg-gray-950 flex items-center justify-center font-sans transition-colors duration-300">
      <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!data) return <div className="p-6 text-gray-500 font-sans">User not found</div>

  const { user, activeLoan, loanHistory, referrals } = data
  const activeFlag = user.flags?.slice(-1)[0] || null

  // Compute loan balance
  const totalPaid = activeLoan?.installments?.reduce((s: any, i: any) => s + i.amountPaid, 0) || 0
  const totalDue = activeLoan?.installments?.reduce((s: any, i: any) => s + i.amountDue, 0) || 0
  const balanceOwed = totalDue - totalPaid

  // Days overdue
  const daysOverdue = activeLoan?.dueDate
    ? Math.max(0, Math.floor((Date.now() - new Date(activeLoan.dueDate).getTime()) / 86400000))
    : 0

  return (
    <div className="min-h-screen bg-[#fffafa] dark:bg-gray-950 transition-colors duration-300 font-sans pb-12">

      {/* KYC Alert Banner - Only for pending KYC */}
      {user.kycStatus === 'pending' && (
        <div className="bg-pink-600 text-white px-6 py-4 flex items-center justify-between gap-6 overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(255,255,255,0.1),transparent)]" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-[0.15em]">Action Required: Identity Pending</p>
              <p className="text-[11px] opacity-80 font-medium">Verify documents to unlock L1 borrowing limits for this user.</p>
            </div>
          </div>
          <button className="bg-white text-pink-600 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-pink-50 transition-colors relative z-10 shadow-lg shadow-pink-900/20">
            Approve Identity
          </button>
        </div>
      )}

      {/* Top bar */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-pink-100/50 dark:border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/users')} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back to users
          </button>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-teal-600 bg-teal-50 px-2 py-1 rounded">Visual Mode</span>
            <button onClick={() => setDarkMode(!darkMode)} className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              {darkMode ? 'Light mode' : 'Dark mode'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* PROFILE HEADER */}
        <Card className="p-8">
          <FlagBanner flag={activeFlag} />

          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start justify-center md:justify-between text-center md:text-left">
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="w-20 h-20 rounded-[2.5rem] flex items-center justify-center flex-shrink-0 shadow-xl shadow-pink-200 dark:shadow-none bg-gradient-to-br from-pink-500 to-rose-600 ring-4 ring-white dark:ring-gray-800">
                <span className="text-white text-3xl font-black">{user.name?.[0] || 'U'}</span>
              </div>
              <div className="flex flex-col items-center md:items-start">
                <div className="flex items-center gap-3 flex-wrap justify-center md:justify-start mb-2">
                  <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tight italic">{user.name}</h1>
                  <Pill color="blue" className="px-4">{user.tier}</Pill>
                  {user.kycStatus === 'verified' && <Pill color="teal">KYC Verified</Pill>}
                  <Pill color="brand" className="font-mono">Node: {user.nodeCode}</Pill>
                </div>
                <div className="flex gap-4 flex-wrap justify-center md:justify-start text-[13px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wide">
                  <span className="font-mono tracking-normal text-gray-900 dark:text-gray-100">{user.phone}</span>
                  <span className="hidden md:inline opacity-30">·</span>
                  <span>Joined {new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                <div className="mt-4 md:mt-2">
                  {user.referredBy && (
                    <div className="flex items-center gap-2 justify-center md:justify-start">
                      <span className="text-pink-600 dark:text-pink-400 font-black text-[10px] tracking-[0.2em] uppercase">Referred by:</span>
                      <span className="text-gray-900 dark:text-gray-100 font-black text-[11px] font-mono">{user.agentName || user.referredBy}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 items-center md:items-end w-full md:w-auto">
              <div className="flex gap-2.5 flex-wrap justify-center md:justify-end w-full md:w-auto">
                <button onClick={() => setFlagModalOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-1.5 text-xs px-4 py-3 md:py-2 rounded-xl border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors font-black uppercase tracking-widest whitespace-nowrap">
                  Flag
                </button>
                <button className="flex-1 md:flex-none flex items-center justify-center gap-1.5 text-xs px-4 py-3 md:py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 font-black uppercase tracking-widest shadow-lg shadow-red-900/20 transition-all active:scale-95 whitespace-nowrap">
                  Block
                </button>
                <button className="flex-1 md:flex-none flex items-center justify-center gap-1.5 text-xs px-4 py-3 md:py-2 rounded-xl border border-pink-100 dark:border-gray-700 text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-gray-800 transition-colors font-black uppercase tracking-widest whitespace-nowrap">
                  Edit
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-pink-100/50 dark:border-gray-800 mt-8 pt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
            <MetricCard label="Credit score" value={`${user.creditScore}`} sub="Out of 100" valueColor="text-teal-600 dark:text-teal-400" />
            <MetricCard label="On-time rate" value={`${user.onTimeRepaymentRate}%`} sub="Repayment history" />
            <MetricCard label="Wallet balance" value="GHS 0" sub="Temporary wallet" />
            <MetricCard label="Total borrowed" value={`₵${totalDue}`} sub="Lifetime amount" />
            <MetricCard label="Interest paid" value={`₵${activeLoan?.interestAmount || 0}`} sub="Total fees" />
            <MetricCard label="Network Nodes" value={`${referrals.length}`} sub="Direct referrals" />
          </div>
        </Card>

        {/* MAIN GRID */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Tabs Navigation */}
            <div className="flex gap-1 p-1 bg-white dark:bg-gray-900 border border-pink-100/50 dark:border-gray-800 rounded-2xl w-full sm:w-fit shadow-sm overflow-x-auto no-scrollbar">
              {['Identity', 'Financials', 'Activity'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 sm:flex-none px-6 sm:px-8 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] transition-all duration-300 whitespace-nowrap ${
                    activeTab === tab 
                      ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/20' 
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'Identity' && (
              <div className="space-y-8 animate-fade-in">
                {/* KYC Documents Section */}
                <Card className="p-8">
                  <SectionHeader>Identity Verification Documents</SectionHeader>
                  <div className="grid sm:grid-cols-3 gap-6">
                    <KYCDoc label="Selfie ID" url={user.kycDocs.selfie} />
                    <KYCDoc label="Card Front" url={user.kycDocs.front} />
                    <KYCDoc label="Card Back" url={user.kycDocs.back} />
                  </div>
                  
                  <div className="mt-8 grid sm:grid-cols-2 gap-4">
                    <InnerCard className="p-5 flex items-center justify-between group">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Momo Registered Name</p>
                        <p className="text-sm font-black text-gray-900 dark:text-gray-100 font-mono">{user.kycDocs.momoName}</p>
                      </div>
                      <div className="text-teal-500 opacity-20 group-hover:opacity-100 transition-opacity">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                      </div>
                    </InnerCard>
                    <InnerCard className="p-5 flex items-center justify-between group">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Ghana Card Name</p>
                        <p className="text-sm font-black text-gray-900 dark:text-gray-100 italic">{user.name}</p>
                      </div>
                      <div className="text-teal-500 opacity-20 group-hover:opacity-100 transition-opacity">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                      </div>
                    </InnerCard>
                    <InnerCard className="p-5 flex items-center justify-between group">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Card ID Number</p>
                        <p className="text-sm font-black text-gray-900 dark:text-gray-100 font-mono">{user.kycDocs.idNumber}</p>
                      </div>
                      <div className="text-teal-500 opacity-20 group-hover:opacity-100 transition-opacity">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                      </div>
                    </InnerCard>
                    <InnerCard className="p-5 flex items-center justify-between group flex-wrap">
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">KYC Name</p>
                        <p className="text-sm font-black text-gray-900 dark:text-gray-100 truncate">{user.kycDocs.nameOnCard || user.name}</p>
                      </div>
                    </InnerCard>
                  </div>
                </Card>

                {/* Profile Detail Grid */}
                <Card className="p-8">
                  <SectionHeader>User Personal Metadata</SectionHeader>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <DetailItem label="Employment" value="Self Employed" icon={() => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>} />
                    <DetailItem label="Monthly Income" value="GHS 1,000 - 2,000" icon={() => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>} />
                    <DetailItem label="Location" value="Greater Accra, GH" icon={() => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>} />
                    <DetailItem label="Address" value="Lakeside Community 8" icon={() => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>} />
                    <DetailItem label="Gender" value="Male" icon={() => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="3"/><path d="M12 22V8M5 12l7-2 7 2"/></svg>} />
                    <DetailItem label="Birthday" value="5 Jul 2004" icon={() => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>} />
                    <DetailItem label="Joined" value="14 Apr 2026" icon={() => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} />
                    <DetailItem label="Accomodation" value="Rented Apartment" icon={() => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>} />
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
                        <p className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-2 font-mono italic">{user.onTimeRepaymentRate}%</p>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 leading-relaxed">The user consistently pays back installments before the due date.</p>
                        <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                          <div className="bg-teal-500 h-full" style={{ width: `${user.onTimeRepaymentRate}%` }} />
                          <div className="bg-amber-400 h-full" style={{ width: '4%' }} />
                          <div className="bg-red-500 h-full" style={{ width: '2%' }} />
                        </div>
                        <div className="flex justify-between mt-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                           <span className="text-teal-600">On Time</span>
                           <span className="text-amber-600">Late</span>
                           <span className="text-red-600">Missed</span>
                        </div>
                     </div>
                     <div className="space-y-4">
                        <MetricCard label="Average Days Saved" value="2.4" sub="Paid earlier than scheduled" />
                        <MetricCard label="Recovery Ratio" value="1.0" sub="All funds recovered" valueColor="text-teal-600" />
                     </div>
                  </div>
                 </Card>

                 <Card className="p-8">
                    <SectionHeader>Historical Records</SectionHeader>
                    <div className="space-y-4">
                      {loanHistory.map((loan: any) => (
                        <div key={loan._id} className="flex items-center justify-between p-5 rounded-2xl bg-pink-50/20 dark:bg-gray-800/50 border border-pink-100/30">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-900 flex items-center justify-center text-pink-600 shadow-sm border border-pink-100/30">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            </div>
                            <div>
                               <p className="text-sm font-black text-gray-900 dark:text-gray-100 font-mono italic">{loan.loanRef}</p>
                               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(loan.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="text-right">
                             <p className="text-sm font-black text-gray-900 dark:text-gray-100 font-mono">₵{loan.amount}</p>
                             <Pill color="teal" className="mt-1 scale-90 origin-right">REPAID</Pill>
                          </div>
                        </div>
                      ))}
                    </div>
                 </Card>
              </div>
            )}

            {activeTab === 'Activity' && (
              <div className="space-y-8 animate-fade-in">
                {/* Device Conflicts Alert */}
                {data.deviceConflicts?.length > 0 && data.deviceConflicts.map((c: any) => (
                  <div key={c.userId} className="p-4 rounded-2xl border-2 border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 flex items-start gap-3 shadow-sm">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-600 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <p className="text-[11px] text-red-700 dark:text-red-400 font-bold leading-normal">
                      Security Alert: Device conflict detected with {c.isBlocked ? 'blocked user' : 'user'} <span className="font-black underline underline-offset-2">{c.userId}</span>. Possible multi-account fraud attempt.
                    </p>
                  </div>
                ))}

                <Card className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <SectionHeader>Process Lifecycle</SectionHeader>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 font-mono bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-100 dark:border-gray-800">
                      System Logs
                    </span>
                  </div>
                  <div className="space-y-8 mt-6">
                    {[
                      { title: 'Identity Verified', meta: 'By Admin Alpha · 2h ago', status: 'success' },
                      { title: 'Loan Disbursement #LON-24-0012', meta: '₵500.00 Disbursed to Wallet · 12 Oct', status: 'success' },
                      { title: 'Node Network Consent', meta: 'Accepted by user UID:4452', status: 'success' },
                      { title: 'Account Onboarding', meta: 'Bio-data synced successfully', status: 'info' },
                    ].map((item, i) => (
                      <div key={i} className="flex gap-6 relative">
                        {i !== 3 && <div className="absolute left-[11px] top-6 bottom-[-32px] w-[2px] bg-pink-100 dark:bg-gray-800" />}
                        <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center relative z-10 p-1.5 ${
                          item.status === 'success' ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : 'bg-pink-500 text-white shadow-lg shadow-pink-500/20'
                        }`}>
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                        <div className="-mt-1">
                          <p className="text-base font-black text-gray-900 dark:text-gray-100 italic">{item.title}</p>
                          <p className="text-[11px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{item.meta}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Device & Sessions list */}
                <Card className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <SectionHeader>Device & Recent Sessions</SectionHeader>
                    <button className="text-[10px] font-black uppercase tracking-widest text-pink-600 hover:underline">View full history</button>
                  </div>
                  <div className="space-y-1">
                    {data.sessions?.slice(0, 5).map((s: any, i: any) => (
                      <div key={s._id} className={`flex gap-4 py-4 items-start px-2 rounded-2xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/70 group transition-all ${i < 4 ? 'border-b border-gray-50 dark:border-gray-800/50' : ''}`}>
                        <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 shadow-sm ${s.channel === 'app' ? 'bg-teal-500' : 'bg-purple-500'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <p className="text-sm font-black text-gray-900 dark:text-gray-200 capitalize group-hover:text-pink-600 transition-colors">
                              {s.channel === 'app' ? 'App Session' : 'USSD Entry'} · {s.action?.replace(/_/g, ' ')}
                            </p>
                            <span className="text-[10px] text-gray-400 font-mono font-black">
                              {new Date(s.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 mt-1">
                            {s.channel === 'app' && s.deviceMeta?.model
                              ? `${s.deviceMeta.model} · ${s.deviceMeta.os} · Node Authorized`
                              : 'Session originated via *713# · Direct Network Access'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* Restructured bottom cards for Desktop */}
            <div className="hidden lg:grid grid-cols-2 gap-8">
              {/* Network Nodes Card */}
              <Card className="p-8">
                <SectionHeader>Network Nodes</SectionHeader>
                <div className="mt-6 space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Recent Referrals</p>
                  {referrals.map((ref: any) => (
                    <div key={ref.id} className="flex items-center justify-between p-4 rounded-2xl bg-pink-50/30 dark:bg-gray-800/50 border border-pink-100/20 group hover:border-pink-300 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white dark:bg-gray-700 flex items-center justify-center text-xs font-black text-pink-600 shadow-sm">{ref.name[0]}</div>
                        <div>
                          <p className="text-xs font-black text-gray-900 dark:text-gray-100 tracking-tight">{ref.name}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{ref.id}</p>
                        </div>
                      </div>
                      <Pill color="teal" className="scale-90 origin-right">L1</Pill>
                    </div>
                  ))}
                  <button className="w-full text-center py-3 text-[10px] font-black uppercase tracking-[0.2em] text-pink-600 hover:text-pink-700 transition-colors bg-pink-50 dark:bg-transparent rounded-xl">
                    Expand Tree View
                  </button>
                </div>
              </Card>

              {/* Advancement Logic Card */}
              <Card className="p-8">
                 <SectionHeader>Advancement Logic</SectionHeader>
                 <div className="mt-6 flex flex-col h-full justify-between">
                    <div>
                      <div className="flex justify-between items-end mb-4">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-pink-600/60 mb-0.5">Eligibility Engine</p>
                          <p className="text-base font-black text-gray-900 dark:text-gray-100 italic">Tier L2 Unlock</p>
                        </div>
                        <span className="text-[13px] font-black text-pink-600 dark:text-pink-400 font-mono">3 / 5 <span className="text-[9px] opacity-40 uppercase font-sans">Loans</span></span>
                      </div>
                      <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden border border-pink-100/10 shadow-inner">
                        <div className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full" style={{ width: '60%' }} />
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 mt-4 leading-relaxed">The user needs <span className="text-gray-900 dark:text-gray-100 font-black">2 more repaid loans</span> with no defaults to qualify for the upgrade.</p>
                    </div>
                 </div>
              </Card>
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-8">
            
            {/* Active Loan Widget */}
            <Card className="p-8 bg-gradient-to-br from-white to-pink-50/20 dark:from-gray-900 dark:to-pink-900/5 relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-pink-500/5 rounded-full blur-3xl" />
              <SectionHeader>Active Loan Focus</SectionHeader>
              
              <div className="mt-6 p-6 rounded-[2rem] bg-white dark:bg-gray-800 shadow-xl shadow-pink-900/5 border border-pink-100/30 dark:border-gray-700">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-600 mb-1 leading-none">Total Payback</p>
                    <p className="text-4xl font-black text-gray-900 dark:text-gray-100 font-mono tracking-tighter">₵525.50</p>
                  </div>
                  <Pill color="red" className="animate-pulse shadow-md shadow-red-500/20 px-3">OVERDUE</Pill>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-xs font-bold italic">
                    <span className="text-gray-400">Principal</span>
                    <span className="text-gray-900 dark:text-gray-100 font-mono font-black">₵500.00</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold italic">
                    <span className="text-gray-400">Processing Fee</span>
                    <span className="text-gray-900 dark:text-gray-100 font-mono font-black">₵15.00</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold italic">
                    <span className="text-gray-400">Interest</span>
                    <span className="text-gray-900 dark:text-gray-100 font-mono font-black">₵10.50</span>
                  </div>
                  <div className="h-px bg-pink-100/50 dark:bg-gray-800" />
                  <div className="flex justify-between text-xs font-black">
                    <span className="text-red-600 uppercase tracking-widest">Penalty Rate (Daily)</span>
                    <span className="text-red-600 font-mono">+₵0.50</span>
                  </div>
                </div>

                <button className="w-full py-4 rounded-2xl bg-gray-900 dark:bg-pink-600 text-white text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-gray-900/20 dark:shadow-pink-900/30 hover:scale-[1.02] transition-transform active:scale-95">
                  Manual Collection
                </button>
              </div>

              <div className="mt-6 flex items-center gap-4 p-5 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                <div className="text-red-600 shrink-0">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <p className="text-[10px] font-black uppercase text-red-700 tracking-[0.1em] leading-relaxed">System Alert: Default Risk EXTREME. Account escalated to legal.</p>
              </div>
            </Card>

            {/* Usage Analysis */}
            <Card className="p-8">
              <SectionHeader>App Session Intensity</SectionHeader>
              <div className="mt-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6 italic">Events per week (last 4 weeks)</p>
                <div className="flex items-end gap-3 h-24 mb-4 bg-pink-50/20 dark:bg-gray-800/20 p-4 rounded-2xl">
                  {data.weeklyUsage?.map((w: any, i: any, arr: any) => {
                    const maxCount = Math.max(...arr.map((x: any) => x.count), 1)
                    const isLatest = i === arr.length - 1
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                        <div 
                          className={`w-full rounded-t-lg transition-all duration-500 ${isLatest ? 'bg-pink-600 animate-pulse' : 'bg-pink-200 dark:bg-gray-700'}`}
                          style={{ height: `${(w.count / maxCount) * 100}%`, minHeight: '8px' }}
                        />
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">W{w.week}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-pink-600">
                  <span>Usage Volume</span>
                  <span>+12% vs LY</span>
                </div>
              </div>
            </Card>

            {/* Referrals Widget (Mobile ONLY now) */}
            <div className="lg:hidden">
              <Card className="p-8">
                <SectionHeader>Network Nodes</SectionHeader>
                <div className="mt-6 space-y-6 text-center">
                   {/* Mobile version remains same but centered */}
                   <div className="pt-2 space-y-4">
                    {referrals.map((ref: any) => (
                      <div key={ref.id} className="flex items-center justify-between p-4 rounded-2xl bg-pink-50/30 dark:bg-gray-800/50 border border-pink-100/20 group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-white dark:bg-gray-700 flex items-center justify-center text-xs font-black text-pink-600 shadow-sm">{ref.name[0]}</div>
                          <div className="text-left">
                            <p className="text-xs font-black text-gray-900 dark:text-gray-100 tracking-tight">{ref.name}</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{ref.id}</p>
                          </div>
                        </div>
                        <Pill color="teal" className="scale-90 origin-right">L1</Pill>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* Advancement Logic (Mobile ONLY now) */}
            <div className="lg:hidden mt-8">
              <Card className="p-8 text-center">
                 <SectionHeader>Advancement Logic</SectionHeader>
                 <div className="mt-6">
                    <div className="flex justify-between items-end mb-4">
                      <div className="text-left">
                        <p className="text-[9px] font-black uppercase tracking-widest text-pink-600/60 mb-0.5 font-sans">Eligibility Engine</p>
                        <p className="text-base font-black text-gray-900 dark:text-gray-100 italic">Tier L2 Unlock</p>
                      </div>
                      <span className="text-[13px] font-black text-pink-600 dark:text-pink-400 font-mono">3 / 5 <span className="text-[9px] opacity-40 uppercase font-sans">Loans</span></span>
                    </div>
                    <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden border border-pink-100/10 shadow-inner">
                      <div className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full" style={{ width: '60%' }} />
                    </div>
                    <p className="text-[11px] font-bold text-gray-400 mt-4 leading-relaxed">2 more repaid loans to qualify for upgrade.</p>
                 </div>
              </Card>
            </div>

          </div>
        </div>
      </div>

      {flagModalOpen && <FlagModal userId={id} onClose={() => setFlagModalOpen(false)} onSaved={(newFlags: any) => { setData({...data, user: {...user, flags: newFlags}}); setFlagModalOpen(false) }} />}
    </div>
  )
}
