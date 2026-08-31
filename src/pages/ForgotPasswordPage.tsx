import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, KeyRound, CircleAlert, Mail } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getFriendlyErrorMessage } from "@/lib/errorUtils";
import { AuthShell, AUTH_CARD_CLASS, AUTH_BUTTON_CLASS } from "@/components/auth/AuthShell";
import { AuthInput } from "@/components/auth/AuthInput";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const { forgotPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const result = await forgotPassword(email);

      if (!result.success) {
        throw new Error(result.message || "Failed to send reset link");
      }
      
      setSuccess(true);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <KeyRound className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <h1 className="font-serif text-3xl tracking-tight">Forgot password?</h1>
          <p className="text-muted-foreground">No worries, we'll send you reset instructions.</p>
        </div>

        <Card className={AUTH_CARD_CLASS}>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Reset Password</CardTitle>
              <CardDescription>Enter your email to receive a reset link</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <CircleAlert className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert className="border-green-500 text-green-600 bg-green-50">
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>
                    If an account exists for {email}, we have sent a password reset link to it.
                    Please check your spam folder if you don't see it.
                  </AlertDescription>
                </Alert>
              )}
              <AuthInput
                id="email"
                label="Email"
                icon={<Mail className="h-4 w-4" />}
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || success}
              />
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className={AUTH_BUTTON_CLASS} disabled={loading || success}>
                {loading ? "Sending link..." : "Send Reset Link"}
              </Button>
              <Link to="/login" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to login
              </Link>
            </CardFooter>
          </form>
        </Card>
    </AuthShell>
  );
};

export default ForgotPasswordPage;
