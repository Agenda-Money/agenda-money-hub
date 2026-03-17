import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, UserPlus, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import api from "@/lib/api";
import { tokenRefreshService } from "@/services/tokenRefreshService";
import { getFriendlyErrorMessage } from "@/lib/errorUtils";

const SignupPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing signup token. Please make sure you clicked the full link from your invitation email.");
      return;
    }

    const fetchSignupInfo = async () => {
      setIsFetchingInfo(true);
      try {
        const response = await api.get(`/api/admin/auth/signup-info?token=${encodeURIComponent(token)}`);
        if (response.data) {
          setFormData(prev => ({
            ...prev,
            email: response.data.email || "",
            fullName: response.data.fullName || ""
          }));
        }
      } catch (err: any) {
        setError(getFriendlyErrorMessage(err));
      } finally {
        setIsFetchingInfo(false);
      }
    };

    fetchSignupInfo();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match. Please make sure both password fields are identical.");
      return; 
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post("/api/admin/auth/signup", {
        token,
        password: formData.password,
        fullName: formData.fullName
      });

      const data = response.data;

      if (data.success) {
        // Automatically log them in by setting localStorage as if they logged in
        localStorage.setItem("accessToken", data.accessToken);
        if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
        
        let expiryMs = 86400 * 1000; // default 24h
        if (data.expiresIn) {
          if (typeof data.expiresIn === 'string') {
            if (data.expiresIn.endsWith('h')) {
              expiryMs = parseInt(data.expiresIn, 10) * 60 * 60 * 1000;
            } else if (data.expiresIn.endsWith('d')) {
              expiryMs = parseInt(data.expiresIn, 10) * 24 * 60 * 60 * 1000;
            } else if (data.expiresIn.endsWith('m')) {
              expiryMs = parseInt(data.expiresIn, 10) * 60 * 1000;
            } else {
              expiryMs = parseInt(data.expiresIn, 10) * 1000; // fallback to seconds
            }
          } else if (typeof data.expiresIn === 'number') {
            expiryMs = data.expiresIn * 1000;
          }
        }
        const expiresAt = data.expiresAt || new Date(Date.now() + expiryMs).toISOString();
        localStorage.setItem("expiresAt", expiresAt);
        localStorage.setItem("user", JSON.stringify(data.user || data.admin));
        
        tokenRefreshService.startRefreshTimer(expiresAt);

        toast.success("Account created successfully!");
        
        // Redirect based on role
        const role = data.user?.role || data.admin?.role;
        window.location.href = role === "agent" ? "/agent" : "/";
      } else {
        setError(data.message || "Signup failed");
      }
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Complete Your Signup</h1>
          <p className="text-muted-foreground">You've been invited. Create your password to gain access.</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Sign Up</CardTitle>
              <CardDescription>Fill in your details to finalize your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {error && (
                <Alert variant="destructive">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription className="text-sm">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {formData.email && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="bg-muted/50 font-medium text-muted-foreground"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <Input
                    id="fullName"
                    type="text"
                    placeholder={isFetchingInfo ? "Loading..." : "John Doe"}
                    value={formData.fullName}
                    onChange={(e) => updateField("fullName", e.target.value)}
                    required
                    disabled={isFetchingInfo || !!formData.fullName}
                    className="bg-muted/50 font-medium text-muted-foreground"
                  />
                  {isFetchingInfo && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    required
                    disabled={!token}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={!token}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => updateField("confirmPassword", e.target.value)}
                    required
                    disabled={!token}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={!token}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={formData.agreeTerms}
                  onCheckedChange={(checked) => updateField("agreeTerms", checked as boolean)}
                  className="mt-1"
                  disabled={!token}
                />
                <Label htmlFor="terms" className="text-sm font-normal cursor-pointer leading-relaxed">
                  I agree to the{" "}
                  <Link to="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </Label>
              </div>

            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || isFetchingInfo || !formData.agreeTerms || formData.password !== formData.confirmPassword || !token || !!error}
              >
                {isLoading ? "Creating Account..." : "Complete Signup"}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default SignupPage;
