# Agent Payouts Documentation

## Overview
Agent payouts are processed through a 14-day rolling window to ensure security and allowing for fraud detection.

## Payout Logic
1.  **Eligibility:**
    *   Agents can only request a payout if their last payout request was more than 14 days ago.
    *   The "Request Payout" button is disabled if the agent is within the cooling-off period.
    *   A tooltip explains why the button is disabled and shows the next eligible date.

2.  **Balance Calculation:**
    *   `Available Now` = `Total Earned` - `Deductions` - `Pending Payouts`.
    *   Deductions include default penalties for late repayments and manual corrections.

3.  **Admin Process:**
    *   Admin reviews payout requests in the **Payout Management** page.
    *   Admin must provide a reason for approval/rejection.
    *   When marking as paid, the admin can provide an optional payment reference for tracking.

## Technical Details
*   **API Endpoint:** `POST /api/agents/rewards/payout`
*   **Error Handling:** A 400 error with `nextEligibleDate` in the message is parsed to show the specific date to the agent.
*   **Tracking:** `lastPayoutRequestedAt` is stored in the agent's profile.
