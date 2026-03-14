import { parsePhoneNumberFromString } from "libphonenumber-js";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Camera, CheckCircle2, Loader2, Upload, User, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const GHANA_REGIONS = [
  "Greater Accra", "Ashanti", "Central", "Eastern", "Northern",
  "Western", "Volta", "Upper East", "Upper West", "Bono",
  "Bono East", "Ahafo", "Western North", "Savannah", "North East", "Oti"
];
const ACCOMMODATION_TYPES = ["Own House", "Rented", "Family House", "Company Quarters"];
const EDUCATION_LEVELS = ["Basic", "Secondary", "Tertiary", "Advanced"];
const EMPLOYMENT_STATUS = ["Employed", "Self-Employed", "Contract"];
const INCOME_BRACKETS = ["Below GHS 500", "GHS 500-1000", "GHS 1000-2000", "GHS 2000-5000", "Above GHS 5000"];

interface FormData {
  fullName: string;
  surname: string;
  msisdn: string;
  dob: string;
  gender: string;
  region: string;
  address: string;
  accommodationType: string;
  yearsAtAddress: string;
  educationLevel: string;
  employmentStatus: string;
  monthlyIncome: string;
  ghanaCardNumber: string;
  ghanaCardFrontUrl: string;
  ghanaCardBackUrl: string;
  selfieUrl: string;
  loanAmount: string;
  loanTenure: string;
  loanPurpose: string;
}

interface StepProps {
  formData: FormData;
  updateField: (field: keyof FormData, value: string) => void;
}

interface DocumentStepProps extends StepProps {
  uploadProgress: Record<string, boolean>;
  handleGhanaCardChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCaptureFront: () => void;
  onUploadFront: () => void;
  onCaptureBack: () => void;
  onUploadBack: () => void;
  onCaptureSelfie: () => void;
}

const fieldClass = "h-11 bg-muted/50 border border-border/50 rounded-xl focus-visible:ring-primary placeholder:text-muted-foreground/40";

function UploadZone({
  isUploading,
  hasUrl,
  label,
  icon: Icon,
  onCapture,
  onUpload,
}: {
  isUploading: boolean;
  hasUrl: string;
  label: string;
  icon: React.ElementType;
  onCapture: () => void;
  onUpload?: () => void;
}) {
  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-xl p-4 text-center transition-all",
        hasUrl
          ? "border-emerald-500/50 bg-emerald-500/5"
          : "border-border hover:border-primary/50 hover:bg-primary/5"
      )}
    >
      {isUploading ? (
        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
      ) : hasUrl ? (
        <div className="flex items-center justify-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">{label} ✓</span>
        </div>
      ) : (
        <div className="space-y-2">
          <Icon className="h-6 w-6 text-muted-foreground mx-auto" />
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <div className="flex gap-2 justify-center">
            <Button type="button" size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onCapture(); }} className="h-8 text-xs rounded-lg">
              <Camera className="h-3 w-3 mr-1" /> Capture
            </Button>
            {onUpload && (
              <Button type="button" size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onUpload(); }} className="h-8 text-xs rounded-lg">
                <Upload className="h-3 w-3 mr-1" /> Upload
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function BioDataStep({ formData, updateField }: StepProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">First Name *</Label>
          <Input value={formData.fullName} onChange={(e) => updateField("fullName", e.target.value)} placeholder="Kwame" className={fieldClass} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Surname *</Label>
          <Input value={formData.surname} onChange={(e) => updateField("surname", e.target.value)} placeholder="Mensah" className={fieldClass} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Phone Number (MoMo) *</Label>
        <Input
          value={formData.msisdn}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "");
            if (val.length <= 10) updateField("msisdn", val);
          }}
          placeholder="0244123456"
          maxLength={10}
          className={cn(fieldClass, "font-mono",
            formData.msisdn.length >= 9 && !parsePhoneNumberFromString(formData.msisdn, "GH")?.isValid() && "border-destructive"
          )}
        />
        {formData.msisdn && formData.msisdn.length >= 9 && !parsePhoneNumberFromString(formData.msisdn, "GH")?.isValid() && (
          <p className="text-[11px] text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Must be a valid Ghanaian number
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Date of Birth *</Label>
          <Input type="date" value={formData.dob} onChange={(e) => updateField("dob", e.target.value)} max={new Date().toISOString().split("T")[0]} className={fieldClass} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Gender *</Label>
          <Select value={formData.gender} onValueChange={(val) => updateField("gender", val)}>
            <SelectTrigger className={fieldClass}><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export function DetailsStep({ formData, updateField }: StepProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Region *</Label>
        <Select value={formData.region} onValueChange={(val) => updateField("region", val)}>
          <SelectTrigger className={fieldClass}><SelectValue placeholder="Select region" /></SelectTrigger>
          <SelectContent>
            {GHANA_REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Address *</Label>
        <Textarea
          value={formData.address}
          onChange={(e) => updateField("address", e.target.value)}
          placeholder="House No. 12, Dzorwulu Street"
          rows={2}
          className="resize-none bg-muted/50 border border-border/50 rounded-xl focus-visible:ring-primary placeholder:text-muted-foreground/40"
        />
        {formData.address.length > 0 && formData.address.trim().split(/\s+/).length < 3 && (
          <p className="text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Enter a detailed address</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Accommodation *</Label>
          <Select value={formData.accommodationType} onValueChange={(val) => updateField("accommodationType", val)}>
            <SelectTrigger className={fieldClass}><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              {ACCOMMODATION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Years at Address *</Label>
          <Input
            type="number" min="0" max="10"
            value={formData.yearsAtAddress}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (Number.isNaN(val)) updateField("yearsAtAddress", "");
              else if (val >= 0 && val <= 10) updateField("yearsAtAddress", String(val));
              else if (val > 10) updateField("yearsAtAddress", "10");
            }}
            placeholder="0-10"
            className={fieldClass}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Education Level *</Label>
        <Select value={formData.educationLevel} onValueChange={(val) => updateField("educationLevel", val)}>
          <SelectTrigger className={fieldClass}><SelectValue placeholder="Select level" /></SelectTrigger>
          <SelectContent>
            {EDUCATION_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Employment *</Label>
          <Select value={formData.employmentStatus} onValueChange={(val) => updateField("employmentStatus", val)}>
            <SelectTrigger className={fieldClass}><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              {EMPLOYMENT_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Monthly Income *</Label>
          <Select value={formData.monthlyIncome} onValueChange={(val) => updateField("monthlyIncome", val)}>
            <SelectTrigger className={fieldClass}><SelectValue placeholder="Range" /></SelectTrigger>
            <SelectContent>
              {INCOME_BRACKETS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export function DocumentsStep({ formData, updateField, uploadProgress, handleGhanaCardChange, onCaptureFront, onUploadFront, onCaptureBack, onUploadBack, onCaptureSelfie }: DocumentStepProps) {
  return (
    <div className="space-y-4">
      <Alert className="bg-primary/5 border-primary/20 py-2.5">
        <Camera className="h-4 w-4 text-primary" />
        <AlertDescription className="text-xs text-foreground/80">
          Ensure photos are clear and well-lit.
        </AlertDescription>
      </Alert>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Ghana Card Number *</Label>
        <Input
          value={formData.ghanaCardNumber || "GHA-"}
          onChange={handleGhanaCardChange}
          placeholder="GHA-123456789-0"
          maxLength={16}
          className={cn(fieldClass, "font-mono")}
        />
      </div>

      <div className="grid gap-3">
        <UploadZone isUploading={uploadProgress.front} hasUrl={formData.ghanaCardFrontUrl} label="Ghana Card (Front)" icon={Camera} onCapture={onCaptureFront} onUpload={onUploadFront} />
        <UploadZone isUploading={uploadProgress.back} hasUrl={formData.ghanaCardBackUrl} label="Ghana Card (Back)" icon={Camera} onCapture={onCaptureBack} onUpload={onUploadBack} />
        <UploadZone isUploading={uploadProgress.selfie} hasUrl={formData.selfieUrl} label="Customer Selfie" icon={User} onCapture={onCaptureSelfie} />
      </div>
    </div>
  );
}

export function LoanRequestStep({ formData, updateField }: StepProps) {
  return (
    <div className="space-y-4">
      <Alert className="bg-emerald-500/5 border-emerald-500/20 py-2.5">
        <TrendingUp className="h-4 w-4 text-emerald-600" />
        <AlertDescription className="text-xs text-foreground/80">
          <strong>Tier 1:</strong> GHS 50 – 300 | Max 14 days
        </AlertDescription>
      </Alert>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Loan Amount (GHS) *</Label>
        <Select value={formData.loanAmount} onValueChange={(v) => updateField("loanAmount", v)}>
          <SelectTrigger className={fieldClass}><SelectValue placeholder="Select amount" /></SelectTrigger>
          <SelectContent>
            {["50", "100", "150", "200", "250", "300"].map((v) => (
              <SelectItem key={v} value={v}>GHS {v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Tenure (Days) *</Label>
        <Select value={formData.loanTenure} onValueChange={(v) => updateField("loanTenure", v)}>
          <SelectTrigger className={fieldClass}><SelectValue placeholder="Select tenure" /></SelectTrigger>
          <SelectContent>
            {[{ v: "1", l: "1 Day" }, { v: "5", l: "5 Days" }, { v: "10", l: "10 Days" }, { v: "14", l: "14 Days" }].map(({ v, l }) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Purpose *</Label>
        <Select value={formData.loanPurpose} onValueChange={(v) => updateField("loanPurpose", v)}>
          <SelectTrigger className={fieldClass}><SelectValue placeholder="Select purpose" /></SelectTrigger>
          <SelectContent>
            {["Business", "Education", "Medical", "Home", "Travel", "Other"].map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
