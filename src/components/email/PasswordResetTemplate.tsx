import { Button } from "@/components/ui/button";

export function PasswordResetTemplate() {
  return (
    <div className="max-w-2xl mx-auto bg-white">
      {/* Header */}
      <div 
        className="px-8 py-6 text-center"
        style={{
          background: 'linear-gradient(135deg, #1E293B 0%, #475569 100%)'
        }}
      >
        <h1 className="text-2xl font-bold text-white mb-2">
          🔐 Password Reset Request
        </h1>
        <p className="text-slate-300 text-sm">
          Secure your Agenda Money account
        </p>
      </div>

      {/* Content */}
      <div className="px-8 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-3">
            Reset Your Password
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            We received a request to reset the password for your Agenda Money account. 
            If you didn't make this request, you can safely ignore this email.
          </p>
          <p className="text-slate-600 leading-relaxed mb-6">
            To reset your password, click the button below. This link will expire in 24 hours 
            for your security.
          </p>
        </div>

        {/* CTA Button */}
        <div className="text-center mb-8">
          <Button 
            className="px-8 py-3 text-base font-medium"
            style={{
              background: 'linear-gradient(135deg, #EC1B84 0%, #C2185B 100%)',
              color: 'white',
              borderRadius: '40px'
            }}
          >
            Reset My Password
          </Button>
        </div>

        {/* Security Info */}
        <div className="bg-slate-50 rounded-lg p-6 mb-6">
          <h3 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
            🛡️ Security Notice
          </h3>
          <div className="space-y-2 text-sm text-slate-600">
            <p>• This link expires in 24 hours</p>
            <p>• Only use this link from a secure device</p>
            <p>• Choose a strong, unique password</p>
            <p>• Never share your password with anyone</p>
          </div>
        </div>

        {/* Alternative Method */}
        <div className="text-center">
          <p className="text-sm text-slate-500 mb-2">
            If the button doesn't work, copy and paste this link:
          </p>
          <p className="text-xs text-primary bg-primary/5 px-3 py-2 rounded font-mono break-all">
            https://agendamoney.com/reset-password?token=abc123xyz789
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-6 bg-slate-50 text-center border-t">
        <p className="text-xs text-slate-500 mb-2">
          Having trouble? Contact us at security@agendamoney.com
        </p>
        <p className="text-xs text-slate-400">
          © 2024 Agenda Money. All rights reserved.
        </p>
      </div>
    </div>
  );
}