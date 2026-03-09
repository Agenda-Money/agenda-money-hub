import { Button } from "@/components/ui/button";

export function PasswordResetTemplate() {
  return (
    <div className="max-w-lg mx-auto bg-white font-sans">
      {/* Header */}
      <div className="px-8 pt-12 pb-8 text-center">
        <div className="w-12 h-12 bg-slate-900 rounded-full mx-auto mb-6 flex items-center justify-center">
          <span className="text-white font-bold text-lg">🔒</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          Reset Your Password
        </h1>
        <p className="text-slate-500 text-sm">
          We received a password reset request
        </p>
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        <div className="mb-8">
          <p className="text-slate-600 leading-relaxed mb-6">
            Click the button below to reset your password. This link will expire in 24 hours. 
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>

        {/* CTA Button */}
        <div className="text-center mb-8">
          <a 
            href="#" 
            className="inline-block bg-slate-900 text-white px-8 py-3 rounded-full font-medium hover:bg-slate-800 transition-colors"
          >
            Reset Password
          </a>
        </div>

        {/* Security Notice */}
        <div className="bg-slate-50 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs">🛡️</span>
            </div>
            <div>
              <h3 className="font-medium text-slate-800 text-sm mb-1">Security Notice</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                This link expires in 24 hours. Only use from a secure device and choose a strong password.
              </p>
            </div>
          </div>
        </div>

        {/* Fallback Link */}
        <div className="text-center">
          <p className="text-xs text-slate-400 mb-2">
            Having trouble? Copy this link:
          </p>
          <p className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded font-mono break-all">
            agendamoney.com/reset?t=abc123
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-6 bg-slate-50 border-t text-center">
        <p className="text-xs text-slate-500 mb-1">
          Questions? Reply to this email or contact support
        </p>
        <p className="text-xs text-slate-400">
          © 2024 Agenda Money
        </p>
      </div>
    </div>
  );
}