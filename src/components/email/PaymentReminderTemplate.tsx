import { Button } from "@/components/ui/button";

export function PaymentReminderTemplate() {
  return (
    <div className="max-w-2xl mx-auto bg-white">
      {/* Header */}
      <div 
        className="px-8 py-6 text-center"
        style={{
          background: 'linear-gradient(135deg, hsl(38, 92%, 50%) 0%, hsl(38, 92%, 45%) 100%)'
        }}
      >
        <h1 className="text-2xl font-bold text-white mb-2">
          ⏰ Payment Reminder
        </h1>
        <p className="text-warning-foreground/80 text-sm">
          Your loan payment is due soon
        </p>
      </div>

      {/* Content */}
      <div className="px-8 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-3">
            Payment Due in 3 Days
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            This is a friendly reminder that your loan payment is due soon. 
            Making timely payments helps maintain your good standing and builds your credit history.
          </p>
          <p className="text-slate-600 leading-relaxed mb-6">
            You can make your payment easily through your Agenda Money account or set up 
            automatic payments to never miss a due date.
          </p>
        </div>

        {/* Payment Details */}
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-6 mb-6">
          <h3 className="font-medium text-slate-800 mb-4">Payment Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500 mb-1">Due Date</p>
              <p className="font-semibold text-slate-800">March 15, 2024</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Amount Due</p>
              <p className="font-semibold text-slate-800">₵ 444.24</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Loan Balance</p>
              <p className="font-semibold text-slate-800">₵ 4,200.50</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Payment Method</p>
              <p className="font-semibold text-slate-800">Mobile Money</p>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <Button 
            className="flex-1 px-6 py-3 text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            style={{
              borderRadius: '40px'
            }}
          >
            Make Payment Now
          </Button>
          <Button 
            variant="outline"
            className="flex-1 px-6 py-3 text-base font-medium"
            style={{
              borderRadius: '40px',
              borderColor: '#EC1B84',
              color: '#EC1B84'
            }}
          >
            Set Up Auto-Pay
          </Button>
        </div>

        {/* Benefits of Timely Payment */}
        <div className="space-y-3 mb-8">
          <h3 className="font-medium text-slate-800 mb-3">Benefits of Timely Payments</h3>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
            <p className="text-sm text-slate-600">Build and improve your credit score</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
            <p className="text-sm text-slate-600">Avoid late fees and penalties</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
            <p className="text-sm text-slate-600">Qualify for better rates on future loans</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
            <p className="text-sm text-slate-600">Maintain access to higher loan amounts</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-6 bg-slate-50 text-center border-t">
        <p className="text-xs text-slate-500 mb-2">
          Need help with payments? Contact us at payments@agendamoney.com
        </p>
        <p className="text-xs text-slate-400">
          © 2024 Agenda Money. All rights reserved.
        </p>
      </div>
    </div>
  );
}