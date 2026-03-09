import { Button } from "@/components/ui/button";

export function WelcomeEmailTemplate() {
  return (
    <div className="max-w-lg mx-auto bg-white font-sans">
      {/* Logo Header */}
      <div className="px-8 pt-12 pb-8 text-center">
        <div className="w-12 h-12 bg-primary rounded-full mx-auto mb-6 flex items-center justify-center">
          <span className="text-white font-bold text-lg">A</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          Welcome to Agenda Money
        </h1>
        <p className="text-slate-500 text-sm">
          Your financial journey starts here
        </p>
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        <div className="mb-8">
          <p className="text-slate-600 leading-relaxed mb-6">
            Hi there! We're excited to have you join Agenda Money. You now have access to 
            quick loans, credit building tools, and our trusted agent network.
          </p>
        </div>

        {/* CTA Button */}
        <div className="text-center mb-8">
          <a 
            href="#" 
            className="inline-block bg-primary text-white px-8 py-3 rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            Complete Your Profile
          </a>
        </div>

        {/* Simple Features */}
        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0"></div>
            <span className="text-sm text-slate-700">Quick loan applications</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0"></div>
            <span className="text-sm text-slate-700">Build your credit score</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0"></div>
            <span className="text-sm text-slate-700">Expert agent support</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-6 bg-slate-50 border-t text-center">
        <p className="text-xs text-slate-500 mb-1">
          Questions? Reply to this email or visit our help center
        </p>
        <p className="text-xs text-slate-400">
          © 2024 Agenda Money
        </p>
      </div>
    </div>
  );
}