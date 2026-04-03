# Admin Commission & Deduction Management

## Overview
The Admin Deductions page allows administrative staff to manage agent penalties and fraud revocations.

## Deduction Types
1.  **Default Penalty (`DEFAULT_PENALTY`):**
    *   Automatically triggered by system when a referred loan default occurs.
    *   Requires admin "Confirmation" to apply the balance impact.
2.  **Fraud Revocation (`FRAUD_REVOCATION`):**
    *   Triggered manually from a Borrower's Profile when fraud is identified.
    *   Revokes all associated commissions for that specific borrower.
3.  **Manual Correction (`MANUAL_CORRECTION`):**
    *   Used for accounting corrections or custom penalties.
    *   Created via the "Manual Deduction" slide-over.

## Workflow
1.  **Creation:** Deductions are created as `PENDING_CONFIRMATION`.
2.  **Review:** Admin reviews pending deductions in the "Pending Confirmation" tab.
3.  **Action:**
    *   **Confirm:** Applies the negative balance to the agent's commission account.
    *   **Reverse:** Cancels the deduction without any balance impact.

## Fraud Revocation Flow
1.  Navigate to a Borrower's Profile (`/admin/users/:id`).
2.  In the KYC section, click **Revoke Fraud**.
3.  Confirm the impact (shows referring agent and estimated deduction).
4.  This creates a pending `FRAUD_REVOCATION` deduction.
