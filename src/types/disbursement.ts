/**
 * Manual Disbursement Request Payload
 * POST /api/admin/loans/:id/manual-disbursement
 */
export interface ManualDisbursementRequest {
  /** Required: Unique reference for the manual transaction (e.g., MoMo Batch ID) */
  disbursementReference: string;
  
  /** Required: Normalised MSISDN (233...) where funds were sent */
  momoMsisdn: string;
  
  /** Optional: Network provider (MTN, Vodafone, AirtelTigo) */
  momoNetwork?: string;
  
  /** Optional: Exact amount sent (defaults to loan.disbursementAmount) */
  amount?: number;
  
  /** Optional: ISO timestamp of when the payout occurred (defaults to now) */
  disbursedAt?: string;
  
  /** Optional: Whether to trigger the system's disbursement alert SMS */
  sendSms?: boolean;
  
  /** Optional: Operations notes or reconciliation details */
  notes?: string;
  
  /** Optional: If true, allows marking an already-ACTIVE loan as disbursed */
  force?: boolean;
}

/**
 * Manual Disbursement Response
 */
export interface DisbursementResponse {
  status: number;
  message: string;
  data?: {
    loan: any; // Updated loan snapshot
    disbursement: {
      id: string;
      reference: string;
      amount: number;
      momoMsisdn: string;
      disbursedAt: string;
    };
  };
}

/**
 * Loan Search Result (Extended for pre-fill)
 */
export interface LoanSearchResult {
  _id: string;
  loanReference: string;
  userFullName: string;
  userMsisdn: string;
  principal: number;
  disbursementAmount: number;
  totalPayable: number;
  tenureDays: number;
  status: string;
  createdAt: string;
  network?: string;
  guarantorName?: string;
  guarantorMsisdn?: string;
}
