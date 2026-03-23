# Agenda Money Hub Codebase Documentation

This document provides a comprehensive overview of the Agenda Money Hub frontend application.

## 🚀 Technical Stack
- **Framework**: [React](https://reactjs.org/) (Version 18)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/), [FlyonUI](https://flyonui.com/)
- **State Management**: [React Query](https://tanstack.com/query/latest) (TanStack Query) & React Context API
- **Routing**: [React Router DOM](https://reactrouter.com/) (Version 6)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Form Handling**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **Real-time**: [Socket.io-client](https://socket.io/docs/v4/client-api/)
- **API Requests**: [Axios](https://axios-http.com/)
- **Utilities**: [Date-fns](https://date-fns.org/), [browser-image-compression](https://www.npmjs.com/package/browser-image-compression)
- **Deployment**: Configured for [Vercel](https://vercel.com/)

---

## 🏗️ Architecture & Routing

The application uses a **subdomain-based routing** strategy to separate the different areas of the platform. The current subdomain is detected in `src/lib/domain.ts`.

### 1. `apply` Subdomain (Consumer Portal)
The entry point for customers applying for loans. 
- **Route**: `path="/"` (and all catch-all routes)
- **Primary Page**: `ApplyPage.tsx`
- **Features**:
  - Landing splash screen with key benefits.
  - Phone number authentication (OTP-based).
  - Multi-step onboarding flow (Bio-data, Work/Income, Identity Verification).
  - Loan request selection (Amount, Tenure, Purpose).
  - Terms & Conditions acceptance.
  - Real-time application status tracking.

### 2. `agent` Subdomain (Agent Portal)
The portal for agents to manage their portfolio, onboard new customers, and track earnings.
- **Protected Routes**: Under `/agent` via `RequireAgent` wrapper.
- **Key Pages**:
  - `AgentDashboard.tsx`: Overview of performance, pending endorsements, and recent activity.
  - `AgentOnboarding.tsx`: Multi-step form for agents to onboard new customers manually.
  - `AgentPortfolio.tsx`: List of onboarded customers and their loan statuses.
  - `AgentEndorsementsPage.tsx`: Interface for agents to approve/endorse customer loan requests.
  - `AgentCommissionsPage.tsx`: Detailed breakdown of earnings, payouts, and commission summary.
  - `AgentProfile.tsx`: Personal settings and network stats.

### 3. `admin` Subdomain (Admin Portal)
The internal management system for platform administrators.
- **Protected Routes**: Under `/admin` via `RequireAuth` and `AdminRoute` wrappers.
- **Key Pages**:
  - `Index.tsx`: Admin dashboard with performance analytics and system overview.
  - `UsersPage.tsx` & `UserDetailsPage.tsx`: Full user management and detailed profiles.
  - `LoansPage.tsx`: Management of all loan states (Pending, Active, Closed, Overdue).
  - `PendingKycPage.tsx`: Review and approval of customer identity documents.
  - `AdminPayoutsPage.tsx`: Processing of agent and user reward/commission payout requests.
  - `AnalyticsPage.tsx`: Detailed system performance and financial reports.
  - `SettingsPage.tsx`: System configuration.

---

## 🧩 Core Components & Logic

### Authentication (`src/contexts/AuthContext.tsx`)
Manages JWT-based authentication for admins and agents. It handles login, logout, and identifies the user's role. It uses `localStorage` for session persistence.

### API Layer (`src/lib/api.ts`)
A centralized Axios instance with pre-configured interceptors:
- **Request Interceptor**: Automatically attaches the correct Bearer token (`accessToken` for admins/agents or `agenda_token` for applicants).
- **Response Interceptor**: Handles 401 errors by attempting a token refresh via `tokenRefreshService`.

### Applicant Context (`src/contexts/ApplicantContext.tsx`)
Specifically manages the state for loan applicants during the `apply` flow, including their profile data and application progress.

### Socket Context (`src/contexts/SocketContext.tsx`)
Sets up real-time event listeners for critical events like:
- `KYC_VERIFIED_SUCCESS`
- `LOAN_ENDORSED`
- `COMMISSION_PAYOUT_APPROVED`
- `repayment_processed`

---

## 📁 Directory Structure Overview
- `src/components`: UI components organized by feature (auth, layout, dashboard, etc.) and `src/components/ui` for high-level Shadcn-inspired foundation.
- `src/lib`: Core utilities (API config, constants, domain detection, Supabase helpers).
- `src/hooks`: Custom React hooks like `useRecentAgentPages`.
- `src/pages`: The route-level page components.
- `src/services`: Background tasks like `tokenRefreshService`.

---

## 🛠️ Key Features Summary
1.  **Automated Onboarding**: Seamless 100% digital KYC and application process.
2.  **Agent Network**: Performance-based commission system with real-time tracking.
3.  **Real-Time Processing**: Instant notifications on KYC results and loan endorsements.
4.  **Admin Oversights**: Granular control over loan approvals, payouts, and user verification.
5.  **Multi-Tiered Loans**: Logic to handle different loan limits based on user tier.
