import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, useLocation } from "react-router-dom";

const CheckEmailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string })?.email || "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
              <Mail className="h-8 w-8 text-pink-600 dark:text-pink-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Check Your Email</h1>
          <p className="text-muted-foreground">
            {email ? `We've sent a confirmation link to ${email}` : "We've sent a confirmation link to your email"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Verify Your Email</CardTitle>
            <CardDescription>
              Click the link in your email to confirm your access request.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">What happens next?</p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex gap-2">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Click the confirmation link in your email</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Your account will be verified</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>You can then log in to your account</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Didn't receive the email? Check your spam folder or request a new confirmation link.
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate("/signup")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign Up
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Already confirmed?{" "}
          <button 
            onClick={() => navigate("/login")}
            className="text-primary hover:underline font-medium"
          >
            Go to login
          </button>
        </p>
      </div>
    </div>
  );
};

export default CheckEmailPage;
