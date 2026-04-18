import React, { useState } from "react";
import { EligibilityBlockScreen } from "@/components/eligibility/EligibilityBlockScreen";
import { DecisionError } from "@/lib/api";

const MOCK_DECISIONS: Record<string, DecisionError> = {
  COOLING_OFF_HIGHER: {
    uiState: 'soft_block',
    reasonCode: 'COOLING_OFF_HIGHER',
    message: "Based on our last assessment, you are not eligible for a higher amount right now. You can apply for a capped amount.",
    isDecision: true,
    capAmount: 1500
  },
  ROLLING_WINDOW_LIMIT: {
    uiState: 'hard_block',
    reasonCode: 'ROLLING_WINDOW_LIMIT',
    message: "You have reached your loan limit for this period. Try again on the specified date.",
    isDecision: true,
    displayDate: "25 Oct 2023"
  },
  SHORT_TENOR_COOLDOWN: {
    uiState: 'hard_block_date',
    reasonCode: 'SHORT_TENOR_COOLDOWN',
    message: "Since your last loan was for a short duration, you are subject to a cooldown period.",
    isDecision: true,
    displayDate: "10 Nov 2023"
  },
  TIER_CAPPED: {
    uiState: 'cap_state',
    reasonCode: 'TIER_CAPPED',
    message: "You can borrow up to GHS 2,000 right now based on your current tier.",
    isDecision: true,
    capAmount: 2000
  },
  BLACKLISTED_PERMANENT: {
    uiState: 'blacklisted',
    reasonCode: 'BLACKLISTED_PERMANENT',
    message: "Your account has been permanently restricted due to policy violations.",
    isDecision: true
  }
};

export const DevEligibilitySandbox = () => {
  const [activeDecision, setActiveDecision] = useState<DecisionError | null>(null);

  if (activeDecision) {
    return (
      <EligibilityBlockScreen 
        decision={activeDecision}
        onHome={() => setActiveDecision(null)}
        onBack={() => setActiveDecision(null)}
      />
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Eligibility Sandbox</h1>
      <p className="text-gray-500">Test the various eligibility UX states by clicking the buttons below.</p>
      
      <div className="flex flex-col gap-4 mt-8">
        {Object.entries(MOCK_DECISIONS).map(([key, decision]) => (
          <button
            key={key}
            onClick={() => setActiveDecision(decision)}
            className="p-4 bg-white border border-gray-200 rounded-2xl hover:border-[#EC1B84] hover:shadow-md transition-all text-left flex justify-between items-center group"
          >
            <div>
               <h3 className="font-bold text-gray-900">{key}</h3>
               <p className="text-sm text-gray-500">State: <span className="font-mono text-[#EC1B84]">{decision.uiState}</span></p>
            </div>
            <span className="text-[#EC1B84] font-bold group-hover:translate-x-1 transition-transform">Preview &rarr;</span>
          </button>
        ))}
      </div>
    </div>
  );
};
