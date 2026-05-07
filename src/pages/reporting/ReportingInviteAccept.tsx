import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, CheckCircle, CircleAlert, MailOpen } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { reportingAcceptInvite } from "@/lib/reportingApi";
import { useReportingAuthStore } from "@/store/reportingAuth.store";

const ReportingInviteAccept = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { login } = useReportingAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing invitation token. Please request a new invite.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await reportingAcceptInvite(token, password, displayName);
      login(result.token, result.displayName || result.user?.name || displayName || "Reporting Viewer");
      navigate("/reporting/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to accept invitation. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-slate-50 to-rose-50 dark:from-slate-950 dark:via-slate-900 dark:to-pink-950 p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-pink-500/10 blur-[100px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-rose-500/10 blur-[100px]" />
      </div>

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <MailOpen className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Accept Invitation</h1>
          <p className="text-slate-500 dark:text-slate-400">Setup your read-only Reporting Portal account</p>
        </div>

        <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-black/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
          {!token ? (
            <CardContent className="pt-6">
              <Alert variant="destructive">
                <CircleAlert className="h-4 w-4" />
                <AlertTitle>Invalid Invite</AlertTitle>
                <AlertDescription>
                  This invitation link is invalid or missing the token. Please contact your administrator to request a new invite.
                </AlertDescription>
              </Alert>
              <div className="mt-4 flex justify-center">
                <Link to="/reporting/login">
                  <Button variant="outline">Back to Login</Button>
                </Link>
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Create Account</CardTitle>
                <CardDescription>Enter your details to finalize your account setup</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {error && (
                  <Alert variant="destructive">
                    <CircleAlert className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="e.g. John Doe"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Create Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
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
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className={password && confirmPassword && password !== confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {password && confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4 pt-4">
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 h-11 text-base shadow-md shadow-primary/20" disabled={loading}>
                  {loading ? "Creating Account..." : "Accept & Login"}
                </Button>
                <p className="text-sm text-center text-muted-foreground">
                  Already have an account?{" "}
                  <Link to="/reporting/login" className="text-primary hover:underline font-medium">
                    Sign in
                  </Link>
                </p>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ReportingInviteAccept;
