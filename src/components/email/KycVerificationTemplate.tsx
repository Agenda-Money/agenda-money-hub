import { Button } from "@/components/ui/button";

export function KycVerificationTemplate() {
  return (
    <div className="max-w-lg mx-auto bg-white font-sans">
      {/* Header */}
      <div className="px-8 pt-12 pb-8 text-center">
        <div className="w-12 h-12 bg-blue-600 rounded-full mx-auto mb-6 flex items-center justify-center">
          <span className="text-white font-bold text-lg">🛡️</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          Identity Verified
        </h1>
        <p className="text-slate-500 text-sm">
          Your account is now fully active
        </p>
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        <div className="mb-8">
          <p className="text-slate-600 leading-relaxed mb-6">
            Great news! We have successfully reviewed and verified your identity documents. 
            Your Agenda Money account is now fully activated with increased limits and features.
          </p>
        </div>

        {/* Status Details */}
        <div className="bg-slate-50 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-slate-900 mb-4">Verification Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Government ID</span>
              <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span> Verified
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Proof of Address</span>
              <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span> Verified
              </span>
            </div>
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Account Tier</span>
                <span className="font-bold text-slate-900">Tier 2 (Premium)</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center mb-8">
          <a 
            href="#" 
            className="inline-block bg-primary text-white px-8 py-3 rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            Explore Premium Features
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-6 bg-slate-50 border-t text-center">
        <p className="text-xs text-slate-500 mb-1">
          Questions? Contact your agent or reply to this email
        </p>
        <p className="text-xs text-slate-400">
          © 2024 Agenda Money
        </p>
      </div>
    </div>
  );
}