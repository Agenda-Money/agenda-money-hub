import { EmailTemplateCard } from "@/components/email/EmailTemplateCard";
import { WelcomeEmailTemplate } from "@/components/email/WelcomeEmailTemplate";
import { LoanApprovalTemplate } from "@/components/email/LoanApprovalTemplate";
import { LoanDisbursementTemplate } from "@/components/email/LoanDisbursementTemplate";
import { PaymentReminderTemplate } from "@/components/email/PaymentReminderTemplate";
import { PaymentConfirmationTemplate } from "@/components/email/PaymentConfirmationTemplate";
import { PromotionalOfferTemplate } from "@/components/email/PromotionalOfferTemplate";
import { PasswordResetTemplate } from "@/components/email/PasswordResetTemplate";
import { KycVerificationTemplate } from "@/components/email/KycVerificationTemplate";
import { LoanRejectionTemplate } from "@/components/email/LoanRejectionTemplate";
import { MonthlyStatementTemplate } from "@/components/email/MonthlyStatementTemplate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function EmailTemplatesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center gap-4 mb-4">
              <Link to="/" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <ArrowLeft className="h-5 w-5 text-slate-600" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  Email Templates
                </h1>
                <p className="text-slate-600 mt-1">
                  Beautiful, responsive email templates for Agenda Money
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-600 to-blue-700"></div>
                <span>Fintech Branding</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>Mobile Optimized</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Production Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="welcome" className="space-y-8">
          <TabsList className="flex flex-wrap h-auto w-full justify-start gap-2 bg-transparent p-0">
            <TabsTrigger value="welcome" className="data-[state=active]:bg-white data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200 rounded-full px-4 py-2">Welcome</TabsTrigger>
            <TabsTrigger value="approval" className="data-[state=active]:bg-white data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200 rounded-full px-4 py-2">Loan Approval</TabsTrigger>
            <TabsTrigger value="disbursement" className="data-[state=active]:bg-white data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200 rounded-full px-4 py-2">Disbursement</TabsTrigger>
            <TabsTrigger value="reminder" className="data-[state=active]:bg-white data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200 rounded-full px-4 py-2">Payment Reminder</TabsTrigger>
            <TabsTrigger value="confirmation" className="data-[state=active]:bg-white data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200 rounded-full px-4 py-2">Payment Success</TabsTrigger>
            <TabsTrigger value="promotion" className="data-[state=active]:bg-white data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200 rounded-full px-4 py-2">Special Offer</TabsTrigger>
            <TabsTrigger value="reset" className="data-[state=active]:bg-white data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200 rounded-full px-4 py-2">Password Reset</TabsTrigger>
            <TabsTrigger value="kyc" className="data-[state=active]:bg-white data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200 rounded-full px-4 py-2">KYC Success</TabsTrigger>
          </TabsList>

          <TabsContent value="welcome" className="space-y-6">
            <EmailTemplateCard
              title="Welcome Email"
              description="Onboard new users with a warm welcome message"
              onPreview={() => window.open('#welcome-preview', '_blank')}
            >
              <WelcomeEmailTemplate />
            </EmailTemplateCard>
          </TabsContent>

          <TabsContent value="reset" className="space-y-6">
            <EmailTemplateCard
              title="Password Reset"
              description="Secure password reset instructions with clear CTAs"
              onPreview={() => window.open('#reset-preview', '_blank')}
            >
              <PasswordResetTemplate />
            </EmailTemplateCard>
          </TabsContent>

          <TabsContent value="approval" className="space-y-6">
            <EmailTemplateCard
              title="Loan Approval"
              description="Celebrate successful loan approvals with next steps"
              onPreview={() => window.open('#approval-preview', '_blank')}
            >
              <LoanApprovalTemplate />
            </EmailTemplateCard>
          </TabsContent>

          <TabsContent value="rejection" className="space-y-6">
            <EmailTemplateCard
              title="Loan Rejection"
              description="Empathetic and clear communication regarding declined applications"
              onPreview={() => window.open('#rejection-preview', '_blank')}
            >
              <LoanRejectionTemplate />
            </EmailTemplateCard>
          </TabsContent>

          <TabsContent value="reminder" className="space-y-6">
            <EmailTemplateCard
              title="Payment Reminder"
              description="Friendly payment reminders to maintain good standing"
              onPreview={() => window.open('#reminder-preview', '_blank')}
            >
              <PaymentReminderTemplate />
            </EmailTemplateCard>
          </TabsContent>

          <TabsContent value="kyc" className="space-y-6">
            <EmailTemplateCard
              title="KYC Verification Success"
              description="Confirm successful identity verification and account activation"
              onPreview={() => window.open('#kyc-preview', '_blank')}
            >
              <KycVerificationTemplate />
            </EmailTemplateCard>
          </TabsContent>

          <TabsContent value="statement" className="space-y-6">
            <EmailTemplateCard
              title="Monthly Statement"
              description="Deliver regular account summaries and statements"
              onPreview={() => window.open('#statement-preview', '_blank')}
            >
              <MonthlyStatementTemplate />
            </EmailTemplateCard>
          </TabsContent>
        </Tabs>

        {/* Color Palette Reference */}
        <div className="mt-12 bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Brand Color Palette</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-lg mx-auto mb-2" style={{ backgroundColor: '#EC1B84' }}></div>
              <p className="text-sm font-medium text-slate-700">Primary Pink</p>
              <p className="text-xs text-slate-500">#EC1B84</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-lg mx-auto mb-2" style={{ backgroundColor: '#C2185B' }}></div>
              <p className="text-sm font-medium text-slate-700">Deep Rose</p>
              <p className="text-xs text-slate-500">#C2185B</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-lg mx-auto mb-2 border" style={{ backgroundColor: '#F8FAFC' }}></div>
              <p className="text-sm font-medium text-slate-700">Ghost White</p>
              <p className="text-xs text-slate-500">#F8FAFC</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-lg mx-auto mb-2" style={{ backgroundColor: '#1E293B' }}></div>
              <p className="text-sm font-medium text-slate-700">Charcoal Slate</p>
              <p className="text-xs text-slate-500">#1E293B</p>
            </div>
          </div>
        </div>

        {/* Template Statistics */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6">
            <h4 className="font-semibold text-slate-900 mb-2">Mobile Optimized</h4>
            <p className="text-sm text-slate-600">
              All templates are fully responsive and tested across devices and email clients.
            </p>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6">
            <h4 className="font-semibold text-slate-900 mb-2">Brand Consistent</h4>
            <p className="text-sm text-slate-600">
              Uses your exact brand colors, fonts, and styling for consistent user experience.
            </p>
          </div>
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6">
            <h4 className="font-semibold text-slate-900 mb-2">Production Ready</h4>
            <p className="text-sm text-slate-600">
              Templates are coded with best practices and ready for immediate deployment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}