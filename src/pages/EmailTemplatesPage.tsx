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
              description="Onboard new users with financial empowerment messaging and next steps"
              onPreview={() => window.open('#welcome-preview', '_blank')}
            >
              <WelcomeEmailTemplate />
            </EmailTemplateCard>
          </TabsContent>

          <TabsContent value="approval" className="space-y-6">
            <EmailTemplateCard
              title="Loan Approval"
              description="Celebrate successful loan approvals with clear loan summary and next steps"
              onPreview={() => window.open('#approval-preview', '_blank')}
            >
              <LoanApprovalTemplate />
            </EmailTemplateCard>
          </TabsContent>

          <TabsContent value="disbursement" className="space-y-6">
            <EmailTemplateCard
              title="Loan Disbursement"
              description="Confirm funds transfer with transaction details and payment setup"
              onPreview={() => window.open('#disbursement-preview', '_blank')}
            >
              <LoanDisbursementTemplate />
            </EmailTemplateCard>
          </TabsContent>

          <TabsContent value="reminder" className="space-y-6">
            <EmailTemplateCard
              title="Payment Reminder"
              description="Friendly reminders with payment benefits and auto-pay options"
              onPreview={() => window.open('#reminder-preview', '_blank')}
            >
              <PaymentReminderTemplate />
            </EmailTemplateCard>
          </TabsContent>

          <TabsContent value="confirmation" className="space-y-6">
            <EmailTemplateCard
              title="Payment Confirmation"
              description="Confirm successful payments with credit building encouragement"
              onPreview={() => window.open('#confirmation-preview', '_blank')}
            >
              <PaymentConfirmationTemplate />
            </EmailTemplateCard>
          </TabsContent>

          <TabsContent value="promotion" className="space-y-6">
            <EmailTemplateCard
              title="Promotional Offer"
              description="Exclusive loan offers with urgency and social proof elements"
              onPreview={() => window.open('#promotion-preview', '_blank')}
            >
              <PromotionalOfferTemplate />
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

          <TabsContent value="kyc" className="space-y-6">
            <EmailTemplateCard
              title="KYC Verification Success"
              description="Confirm successful identity verification and account activation"
              onPreview={() => window.open('#kyc-preview', '_blank')}
            >
              <KycVerificationTemplate />
            </EmailTemplateCard>
          </TabsContent>
        </Tabs>

        {/* Color Palette Reference */}
        <div className="mt-12 bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Fintech Brand Colors</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-lg mx-auto mb-2" style={{ backgroundColor: '#2563EB' }}></div>
              <p className="text-sm font-medium text-slate-700">Primary Blue</p>
              <p className="text-xs text-slate-500">#2563EB</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-lg mx-auto mb-2" style={{ backgroundColor: '#EAB308' }}></div>
              <p className="text-sm font-medium text-slate-700">Accent Yellow</p>
              <p className="text-xs text-slate-500">#EAB308</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-lg mx-auto mb-2" style={{ backgroundColor: '#059669' }}></div>
              <p className="text-sm font-medium text-slate-700">Success Green</p>
              <p className="text-xs text-slate-500">#059669</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-lg mx-auto mb-2 border" style={{ backgroundColor: '#F8FAFC' }}></div>
              <p className="text-sm font-medium text-slate-700">Clean White</p>
              <p className="text-xs text-slate-500">#F8FAFC</p>
            </div>
          </div>
        </div>

        {/* Template Statistics */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
            <h4 className="font-semibold text-slate-900 mb-2">Fintech Optimized</h4>
            <p className="text-sm text-slate-600">
              Designed specifically for financial services with trust-building elements and clear CTAs.
            </p>
          </div>
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-6 border border-yellow-200">
            <h4 className="font-semibold text-slate-900 mb-2">Mobile First</h4>
            <p className="text-sm text-slate-600">
              Fully responsive design tested across all major email clients and devices.
            </p>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
            <h4 className="font-semibold text-slate-900 mb-2">Conversion Focused</h4>
            <p className="text-sm text-slate-600">
              Built with behavioral psychology and financial best practices to drive engagement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}