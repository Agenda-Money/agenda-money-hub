# Agenda Money — Product Brief

> Context document for design work. Gives Claude Design a complete picture of who we are, what we build, who uses it, and how it should feel.

---

## What Agenda Money Is

Agenda Money is a Ghanaian fintech platform that gives everyday people access to short-term mobile money loans — quickly, digitally, and without a bank account. Borrowers apply through a web app or USSD, get approved by an admin, and receive money directly to their MTN, Vodafone, or AirtelTigo MoMo wallet — usually within minutes.

The product sits at the intersection of micro-finance and mobile money infrastructure. It is not a bank. It does not require a bank account, a credit bureau file, or a salary slip. The only requirements are a Ghana Card, a working MoMo number, and a track record of paying back.

---

## The Problem We Solve

Millions of Ghanaians — traders, gig workers, students, small business owners — face cash-flow gaps they cannot bridge through formal banking. Banks are slow, require collateral, and serve a narrow population. Mobile money has solved payments for everyone, but it has not solved credit.

Agenda Money plugs that gap. A market trader who needs ₵200 to restock on a Thursday and can pay it back in 14 days has a real problem. Agenda Money solves it.

---

## Who Uses It

There are four distinct user types. Each has their own portal and experience.

### 1. Borrowers (End Customers)
Everyday Ghanaians — traders, students, gig workers, small business owners. They use the mobile web app to apply for loans, track their active loan, and view their loan history. Most are mobile-first and access the product via smartphone browsers. They speak a mix of English and Ghanaian languages. They want things fast, clear, and trustworthy — they are handing over their identity documents and phone numbers.

**Key concerns:** Is this safe? Will the money come? When do I pay back? How much exactly?

### 2. Field Agents
Individuals hired or partnered by Agenda Money to physically onboard customers in communities — markets, churches, schools. Agents carry tablets or phones and walk customers through identity capture (Ghana Card photos, selfie, liveness check). They earn commissions per successful signup and per repayment from customers they brought in.

**Key concerns:** How many customers have I onboarded today? Who in my portfolio has an overdue loan? When do I get paid?

### 3. Admins
Internal Agenda Money staff. They review loan applications, approve or reject disbursements, track repayments, manage users and agents, and monitor the overall health of the portfolio. They need information-dense dashboards, fast action flows (approve/reject), and clear alerts for anything that needs attention.

**Key concerns:** What needs my attention right now? Is this loan safe to approve? What is our portfolio overdue rate?

### 4. CSAs (Collection Service Agents)
A specialised agent role focused on following up on overdue loans. They call borrowers, log call outcomes, mark promises-to-pay, and escalate defaulted cases. They need a CRM-style view of their assigned borrowers and a clear record of every touchpoint.

**Key concerns:** Who do I call today? What did I say last time? Has this person paid yet?

---

## Core Product Features

### Loan Application Flow
Borrowers go through a multi-step application: verify their MoMo number, complete KYC (Ghana Card front + back + selfie + liveness), select loan amount and tenure, then submit. The app shows a clear breakdown of principal, interest, processing fee, disbursement amount, and total payable before they confirm.

### Tier / Ladder System
Every borrower starts at **L1** with a small loan limit. Each successful repayment moves them up the ladder. Higher tiers unlock larger amounts and longer repayment windows. This creates a natural incentive to repay — your limit grows as your track record grows. Tiers go from L1 to L20. From L7+, borrowers can choose 20-day tenures. From L10+, they can choose up to 30 days. Interest is capped at the 14-day rate regardless — the extra days are cost-free repayment headroom, a reward for being a trusted borrower.

### Social Traceability (Node System)
First-time borrowers are linked to a "node" — either an agent who onboarded them or a graduated user who referred them. The node owner is asked to endorse (vouch for) the first-time borrower before the loan is approved. Nodes who have repaid 5+ loans graduate to "Node Owners" and can endorse and refer others, earning commissions when their network repays.

### Agent Onboarding
Agents onboard customers face-to-face. The onboarding flow captures personal details, employment info, KYC documents (Ghana Card, selfie), a liveness check to confirm identity, and the initial loan request. All images are uploaded to Cloudflare R2 storage. The agent submits the full package and an admin reviews it.

### KYC & Liveness
Every borrower is identity-verified: Ghana Card (front and back), a selfie, and a real-time liveness check (following on-screen prompts). The selfie is matched to the Ghana Card photo to flag mismatches. MoMo account name is resolved and checked against the registered name. Any mismatch is flagged for admin review.

### Disbursement
Once approved, loans are disbursed via Paystack to the borrower's MoMo wallet. The system uses an atomic lock mechanism (`DISBURSING_INIT` → `DISBURSING` → `ACTIVE`) to prevent double disbursements. If Paystack times out, the loan moves to `DISBURSEMENT_REVIEW` — a manual check state — instead of being silently retried.

### Repayment
Borrowers repay via MoMo. Repayments are recorded by admins or CSAs and reflected in real time. Partial repayments are tracked. The system calculates balance remaining, days overdue, and penalty states.

### Agenda Score
A proprietary 23-variable credit score (0–100) built from repayment history, KYC completeness, behavioural signals, network quality, and socioeconomic data. Higher-scored borrowers may unlock faster approvals or better terms in future. Currently in rollout.

### Commission System
Agents earn commissions for signups and for repayments from their portfolio. Commissions accumulate and can be requested as payouts on a two-week rolling basis.

---

## Loan Details

| | |
|---|---|
| **Currency** | Ghana Cedis (₵ / GHS) |
| **Loan amounts** | ₵50 – ₵5,000+ (grows with tier) |
| **Tenures** | 1, 5, 10, 14 days (all tiers) · 20 days (L7+) · 30 days (L10+) |
| **Interest** | 0.5% per day, capped at 14 days max regardless of tenure |
| **Processing fee** | ₵15–₵30 (decreases with tier) |
| **Disbursement** | MoMo (MTN · Vodafone · AirtelTigo) |
| **Networks** | MTN · VODAFONE · ARTLTIGO |
| **Loan statuses** | PENDING · AWAITING\_ENDORSEMENT · DISBURSING\_INIT · DISBURSING · DISBURSEMENT\_REVIEW · ACTIVE · PARTIAL\_REPAID · OVERDUE · DEFAULTED · REPAID · REJECTED |

---

## Brand & Design Language

### Personality
**Trustworthy but not corporate. Accessible but not cheap. Fast but not reckless.** Agenda Money should feel like a smart, capable friend who lends you money — not a faceless institution. Warm, clear, confident.

### Primary Color
**Hot pink / rose** — `#E91E63` / `from-pink-600 to-rose-500`. This is the brand color. Used on primary CTAs, highlights, active states, gradients, and accents. It signals energy and modernity without being aggressive.

### Supporting Colors
- **Emerald / teal** — success states, repaid loans, verified KYC
- **Amber / orange** — warnings, partial states, overdue alerts
- **Red** — defaulted, blocked, errors, critical alerts
- **Blue / indigo** — active loans, processing, neutral info states
- **Slate / gray** — backgrounds, secondary text, inactive states

### Typography Feel
Heavy weights (`font-black`, `font-bold`) for key numbers and labels. Monospace (`font-mono`) for financial figures, loan references, phone numbers. Small uppercase tracking for section labels (`text-[10px] uppercase tracking-widest`).

### Shape Language
Rounded — `rounded-2xl`, `rounded-3xl` on cards; `rounded-full` on buttons and pills. Nothing hard-edged. Cards have soft shadows and subtle borders rather than strong outlines.

### Motion
Subtle. Fade-ins (`animate-fade-in`), gentle scale on hover (`hover:scale-[1.02]`), stagger children with Framer Motion on list items. Nothing that delays or distracts.

### Tone of Copy
Direct. No jargon. Amounts in cedis with the ₵ symbol (not "GHS"). Dates in day/month/year. Loan references in monospace. Status labels in plain English ("Overdue", not "OVERDUE_STATUS_FLAG").

---

## Information Architecture

### Borrower App
- Login / OTP
- Apply (multi-step: node code → KYC → loan details → liveness → summary → submit)
- Dashboard (active loan status, tier progress, eligibility info)
- History (past loans)
- Profile

### Agent App
- Dashboard (recent signups, pending endorsements, quick stats)
- Portfolio (paginated customer directory with loan status, search/filter)
- Endorsements (queue of first-time borrowers needing approval)
- Commissions (earnings history, payout request)

### Admin Dashboard
- Dashboard (KPIs: active loans, total disbursed, overdue rate, new signups)
- Loans (full table: pending, active, overdue, history; approve/reject; detail sheet)
- Users (search, KYC management, block/unblock, loan history per user)
- Agents (agent list, performance, onboarding review, commissions)
- Repayments (record and view)
- Analytics (cohort performance, channel breakdown, trends)
- CSA Portal (collection queues, call logs, team activity)
- Rewards / Notifications / Settings

---

## Key User Journeys

### Borrower applies for their first loan
1. Lands on app → enters their MoMo number
2. OTP verification
3. Enters node code (agent's or referrer's code)
4. KYC: Ghana Card front → Ghana Card back → selfie → liveness check
5. Selects loan amount (within tier limit) and tenure
6. Reviews breakdown (principal, interest, fee, disbursement, repayment)
7. Submits application
8. Receives SMS: "Your application is under review"
9. Admin approves → money hits MoMo wallet
10. Receives SMS: "₵X has been sent to your wallet. You owe ₵Y by [date]"

### Agent onboards a customer
1. Logs in to agent portal
2. Taps "Onboard New Customer"
3. Enters customer details (name, DOB, address, employment, income)
4. Captures Ghana Card front and back (uploads to R2)
5. Captures selfie (uploads to R2)
6. Runs liveness check
7. Customer selects loan amount and tenure
8. Agent submits
9. Awaiting admin approval

### Admin approves a loan
1. Sees new PENDING loan in queue
2. Opens loan detail: reviews KYC images, MoMo name match, liveness result
3. Clicks Approve → atomic lock acquired → Paystack transfer initiated
4. Loan moves to ACTIVE
5. Borrower gets MoMo notification

---

## Technical Context (For Design Awareness)

- **Frontend**: React + TypeScript, Tailwind CSS, shadcn/ui components, Framer Motion, TanStack Query
- **Backend**: Node.js / Express, MongoDB, BullMQ job queues, Paystack payments
- **Storage**: Cloudflare R2 (private, pre-signed URLs for images)
- **Auth**: JWT-based, role-aware (borrower / agent / admin / CSA)
- **Deployment**: Production (cloud) + local dev
- **Mobile-first**: Most borrowers and agents are on mobile. Admin is desktop-primary but must be responsive.
- **Real-time**: WebSocket signals for loan state changes (endorsement approved, disbursement complete)
- **Locale**: Ghana. Dates in DD/MM/YYYY. Currency in ₵. Phone numbers in 0XXXXXXXXX or +233XXXXXXXXX format.

---

## What Makes Agenda Money Different

1. **No bank account needed** — pure MoMo, Ghana's dominant payment rail
2. **Social trust layer** — the node/endorsement system replaces credit bureau files with community accountability
3. **Ladder incentives** — repaying grows your limit, creating a direct and visible reward for good behaviour
4. **Field agent network** — we go to customers, not the other way around; agents serve communities that are underbanked precisely because banks don't go there
5. **Speed** — approval to MoMo credit can be under 10 minutes for known borrowers

---

*Last updated: May 2026*
