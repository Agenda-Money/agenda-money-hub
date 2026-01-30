import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  MapPin, 
  Home, 
  GraduationCap, 
  Briefcase, 
  Wallet, 
  Phone, 
  CreditCard,
  Clock,
  Target,
  FileText,
  CheckCircle2,
  XCircle
} from "lucide-react";

// Ghana Regions
const ghanaRegions = [
  "Greater Accra",
  "Ashanti",
  "Western",
  "Central",
  "Eastern",
  "Northern",
  "Volta",
  "Upper East",
  "Upper West",
  "Brong-Ahafo",
  "Bono East",
  "Ahafo",
  "Savannah",
  "North East",
  "Oti",
  "Western North",
];

// Form Schema
const agentFormSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  surname: z.string().min(2, "Surname is required"),
  gender: z.enum(["male", "female"], { required_error: "Please select your gender" }),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  region: z.string().min(1, "Please select your region"),
  address: z.string().min(5, "Address is required"),
  accommodationType: z.enum(["rented", "owned"], { required_error: "Please select accommodation type" }),
  yearsAtAddress: z.enum(["less_than_1", "up_to_3", "up_to_5", "over_5"], { required_error: "Please select years at address" }),
  educationLevel: z.enum(["basic", "secondary", "tertiary", "advanced"], { required_error: "Please select education level" }),
  employment: z.enum(["unemployed", "self_employed", "full_time", "part_time"], { required_error: "Please select employment status" }),
  monthlyIncome: z.enum(["500_1000", "1000_3000", "3000_5000", "above_5000"], { required_error: "Please select income range" }),
  phoneNumber: z.string().min(10, "Valid phone number required").max(15),
  nodeCode: z.string().min(1, "Node code or referrer code is required"),
  ghanaCardNumber: z.string().regex(/^GHA-\d{9}-\d$/, "Format: GHA-XXXXXXXXX-X"),
  loanAmount: z.enum(["50", "100", "150", "200", "250", "300"], { required_error: "Please select loan amount" }),
  loanTenor: z.enum(["1", "5", "10", "14"], { required_error: "Please select loan tenor" }),
  loanPurpose: z.enum(["business", "medical", "education", "home", "others"], { required_error: "Please select loan purpose" }),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "You must accept the terms and conditions" }) }),
});

type AgentFormData = z.infer<typeof agentFormSchema>;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export default function AgentRegistrationPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AgentFormData>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      firstName: "",
      surname: "",
      dateOfBirth: "",
      address: "",
      phoneNumber: "",
      nodeCode: "",
      ghanaCardNumber: "",
    },
  });

  const onSubmit = async (data: AgentFormData) => {
    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log("Form submitted:", data);
      toast({
        title: "Application Submitted!",
        description: "Your agent registration has been received. We'll contact you shortly.",
      });
      form.reset();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = () => {
    toast({
      variant: "destructive", 
      title: "Application Declined",
      description: "You have declined the terms and conditions.",
    });
    form.reset();
  };

  return (
    <DashboardLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto space-y-6"
      >
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Agent Registration</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Complete the form below to become an Agenda Money agent
          </p>
        </motion.div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Personal Information */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">First Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter first name" {...field} className="h-9 text-sm" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="surname"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Surname *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter surname" {...field} className="h-9 text-sm" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Gender *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="male" id="male" />
                              <Label htmlFor="male" className="text-xs font-normal cursor-pointer">Male</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="female" id="female" />
                              <Label htmlFor="female" className="text-xs font-normal cursor-pointer">Female</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Date of Birth (DD/MM/YYYY) *</FormLabel>
                        <FormControl>
                          <Input placeholder="DD/MM/YYYY" {...field} className="h-9 text-sm" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Location & Address */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Location & Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Region *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Select your region" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ghanaRegions.map((region) => (
                              <SelectItem key={region} value={region} className="text-sm">
                                {region}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Address *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your full address" {...field} className="h-9 text-sm" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Accommodation */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Home className="h-4 w-4 text-primary" />
                    Accommodation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="accommodationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Accommodation Type *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="rented" id="rented" />
                              <Label htmlFor="rented" className="text-xs font-normal cursor-pointer">Rented</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="owned" id="owned" />
                              <Label htmlFor="owned" className="text-xs font-normal cursor-pointer">Owned</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="yearsAtAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Number of years you've lived here *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="grid grid-cols-2 sm:grid-cols-4 gap-2"
                          >
                            {[
                              { value: "less_than_1", label: "Less than 1 year" },
                              { value: "up_to_3", label: "Up to 3 years" },
                              { value: "up_to_5", label: "Up to 5 years" },
                              { value: "over_5", label: "Over 5 years" },
                            ].map((option) => (
                              <div key={option.value} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50 transition-colors">
                                <RadioGroupItem value={option.value} id={option.value} />
                                <Label htmlFor={option.value} className="text-xs font-normal cursor-pointer">{option.label}</Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Education & Employment */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    Education & Employment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="educationLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Education Level *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="grid grid-cols-2 sm:grid-cols-4 gap-2"
                          >
                            {[
                              { value: "basic", label: "Basic" },
                              { value: "secondary", label: "Secondary" },
                              { value: "tertiary", label: "Tertiary" },
                              { value: "advanced", label: "Advanced" },
                            ].map((option) => (
                              <div key={option.value} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50 transition-colors">
                                <RadioGroupItem value={option.value} id={`edu_${option.value}`} />
                                <Label htmlFor={`edu_${option.value}`} className="text-xs font-normal cursor-pointer">{option.label}</Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="employment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Employment Status *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="grid grid-cols-2 gap-2"
                          >
                            {[
                              { value: "unemployed", label: "Unemployed" },
                              { value: "self_employed", label: "Self Employed" },
                              { value: "full_time", label: "Full-time Employee" },
                              { value: "part_time", label: "Part-time Employee" },
                            ].map((option) => (
                              <div key={option.value} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50 transition-colors">
                                <RadioGroupItem value={option.value} id={`emp_${option.value}`} />
                                <Label htmlFor={`emp_${option.value}`} className="text-xs font-normal cursor-pointer">{option.label}</Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Financial Information */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    Financial Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="monthlyIncome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Monthly Income *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="grid grid-cols-2 gap-2"
                          >
                            {[
                              { value: "500_1000", label: "GHS500 - GHS1,000" },
                              { value: "1000_3000", label: "GHS1,000 - GHS3,000" },
                              { value: "3000_5000", label: "GHS3,000 - GHS5,000" },
                              { value: "above_5000", label: "> GHS5,000" },
                            ].map((option) => (
                              <div key={option.value} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50 transition-colors">
                                <RadioGroupItem value={option.value} id={`income_${option.value}`} />
                                <Label htmlFor={`income_${option.value}`} className="text-xs font-normal cursor-pointer">{option.label}</Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact & Identity */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    Contact & Identity
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Phone Number (MoMo Number) *</FormLabel>
                        <FormControl>
                          <Input placeholder="0XXXXXXXXX" {...field} className="h-9 text-sm" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nodeCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Node Code (Referrer's Code) *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter node code" {...field} className="h-9 text-sm" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ghanaCardNumber"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel className="text-xs">Ghana Card Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="GHA-XXXXXXXXX-X" {...field} className="h-9 text-sm" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Loan Request */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Loan Request
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="loanAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">How much would you like to borrow (GHS)? *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="grid grid-cols-3 sm:grid-cols-6 gap-2"
                          >
                            {["50", "100", "150", "200", "250", "300"].map((amount) => (
                              <div key={amount} className="flex items-center justify-center p-2 border rounded-md hover:bg-muted/50 transition-colors">
                                <RadioGroupItem value={amount} id={`amount_${amount}`} className="sr-only" />
                                <Label 
                                  htmlFor={`amount_${amount}`} 
                                  className={`text-xs font-medium cursor-pointer w-full text-center ${field.value === amount ? 'text-primary' : ''}`}
                                >
                                  {amount}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="loanTenor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">How many days do you need the money for? *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="grid grid-cols-4 gap-2"
                          >
                            {[
                              { value: "1", label: "1 day" },
                              { value: "5", label: "5 days" },
                              { value: "10", label: "10 days" },
                              { value: "14", label: "14 days" },
                            ].map((option) => (
                              <div key={option.value} className="flex items-center justify-center p-2 border rounded-md hover:bg-muted/50 transition-colors">
                                <RadioGroupItem value={option.value} id={`tenor_${option.value}`} className="sr-only" />
                                <Label 
                                  htmlFor={`tenor_${option.value}`} 
                                  className={`text-xs font-medium cursor-pointer ${field.value === option.value ? 'text-primary' : ''}`}
                                >
                                  {option.label}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="loanPurpose"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">What is the purpose of the loan? *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="grid grid-cols-2 sm:grid-cols-5 gap-2"
                          >
                            {[
                              { value: "business", label: "Business" },
                              { value: "medical", label: "Medical" },
                              { value: "education", label: "Education" },
                              { value: "home", label: "Home" },
                              { value: "others", label: "Others" },
                            ].map((option) => (
                              <div key={option.value} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50 transition-colors">
                                <RadioGroupItem value={option.value} id={`purpose_${option.value}`} />
                                <Label htmlFor={`purpose_${option.value}`} className="text-xs font-normal cursor-pointer">{option.label}</Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Terms & Conditions */}
            <motion.div variants={itemVariants}>
              <Card className="border-primary/20 bg-muted/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Terms & Conditions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="text-xs text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      Interest rate = 0.5% a day (equivalent to 7% for 2 weeks)
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      Processing fee = GHS30 flat
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      The MoMo number provided should bear your name
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      You confirm that you're capable and willing to repay your loan
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      Failure to repay your loan on time will affect your credit score and that of your referrer
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      Late repayments attract a penal interest rate of 2%/day on the amount overdue
                    </li>
                  </ul>

                  <FormField
                    control={form.control}
                    name="acceptTerms"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 bg-background">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-xs font-medium">
                            I accept the Terms & Conditions *
                          </FormLabel>
                        </div>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* CTA Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 h-11 text-sm font-medium"
                    >
                      {isSubmitting ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full"
                        />
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Accept & Submit Application
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDecline}
                      className="flex-1 h-11 text-sm font-medium text-destructive border-destructive/50 hover:bg-destructive/10"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

          </form>
        </Form>
      </motion.div>
    </DashboardLayout>
  );
}
