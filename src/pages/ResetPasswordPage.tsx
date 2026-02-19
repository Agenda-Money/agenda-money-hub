import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Lock, CircleAlert, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [token, setToken] = useState<string | null>(null);
  
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      // 1. Check direct URL params (Query Strings)
      const queryToken = searchParams.get("token");
      if (queryToken) {
        setToken(queryToken);
        setError(null);
        return;
      }

      // 2. Check URL Hash (Supabase Magic Links/Recovery often use this)
      const hash = location.hash;
      if (hash) {
        const hashString = hash.startsWith('#') ? hash.substring(1) : hash;
        const params = new URLSearchParams(hashString);
        
        const accessToken = params.get("access_token");
        const errorDesc = params.get("error_description");
        const errCode = params.get("error");

        if (accessToken) {
          setToken(accessToken);
          setError(null);
          return;
        } else if (errorDesc) {
          setError(errorDesc.replace(/\+/g, " ")); // Manual decode if needed
          return;
        } else if (errCode) {
          setError(`Error: ${errCode}`);
          return;
        }
      }

      // 3. Check for active Supabase session (e.g. if auto-login happened)
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        // User is authenticated via the link
        setToken(data.session.access_token);
        setError(null);
      } else {
        // Only set error if we haven't found a token by other means
        // and we aren't already showing a specific error from the hash
        setToken(prev => {
            if (!prev) setError("Invalid or missing reset token. Session expired.");
            return prev;
        });
      }
    };

    checkSession();
  }, [searchParams, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError(null);
    
    const result = await resetPassword(token, password);
    if (result.success) {
      // Small delay to allow user to read the success toast
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } else {
      setError(result.message || "Failed to reset password");
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Set new password</h1>
          <p className="text-muted-foreground">Must be at least 6 characters.</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Reset Password</CardTitle>
              <CardDescription>Enter your new password below</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <CircleAlert className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={!token}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={loading || !token}>
                {loading ? "Resetting password..." : "Reset Password"}
              </Button>
              <Link to="/login" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to login
              </Link>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
