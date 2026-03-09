import { Button } from "@/components/ui/button";

export function WelcomeEmailTemplate() {
  return (
    <div className="max-w-2xl mx-auto bg-white">
      {/* Header */}
      <div 
        className="px-8 py-6 text-center"
        style={{
          background: 'linear-gradient(135deg, #EC1B84 0%, #C2185B 100%)'
        }}
      >
        <h1 className="text-2xl font-bold text-white mb-2">
          Welcome to Agenda Money! 💸
        </h1>
        <p className="text-pink-100 text-sm">
          Your journey to financial empowerment starts here
        </p>
      </div>

      {/* Content */}
      <div className="px-8 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-3">
            Hi there! 👋
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Welcome to Agenda Money, where we're revolutionizing access to financial services. 
            We're thrilled to have you join our community of forward-thinking individuals.
          </p>
          <p className="text-slate-600 leading-relaxed mb-6">
            Get ready to unlock new opportunities, build your credit profile, and access 
            fair lending solutions designed with you in mind.
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
            Get Started Now
          </Button>
        </div>

        {/* Features */}
        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-2.5 flex-shrink-0"></div>
            <div>
              <h3 className="font-medium text-slate-800 mb-1">Quick Loan Applications</h3>
              <p className="text-sm text-slate-600">Apply for loans in minutes with our streamlined process</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-2.5 flex-shrink-0"></div>
            <div>
              <h3 className="font-medium text-slate-800 mb-1">Credit Building</h3>
              <p className="text-sm text-slate-600">Build your credit history with every successful repayment</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-2.5 flex-shrink-0"></div>
            <div>
              <h3 className="font-medium text-slate-800 mb-1">Agent Network</h3>
              <p className="text-sm text-slate-600">Get personalized support from our trusted agent network</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-6 bg-slate-50 text-center border-t">
        <p className="text-xs text-slate-500 mb-2">
          Need help? Contact us at support@agendamoney.com
        </p>
        <p className="text-xs text-slate-400">
          © 2024 Agenda Money. All rights reserved.
        </p>
      </div>
    </div>
  );
}