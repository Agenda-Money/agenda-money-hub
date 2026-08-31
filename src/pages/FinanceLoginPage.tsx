import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Calculator, CircleAlert, Mail, Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AuthShell, AUTH_CARD_CLASS, AUTH_BUTTON_CLASS } from "@/components/auth/AuthShell";
import { AuthInput } from "@/components/auth/AuthInput";

export default function FinanceLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await login(email, password);
    if (result.success) {
      if (result.user?.role !== "admin" && result.user?.role !== "superadmin") {
        setError("This account doesn't have access to Finance.");
        setLoading(false);
        return;
      }
      globalThis.location.href = "/finance";
    } else {
      setError(result.message || "Authentication failed");
    }

    setLoading(false);
  };

  return (
    <AuthShell>
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <Calculator className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <h1 className="font-serif text-3xl tracking-tight">Agenda Money Finance</h1>
          <p className="text-muted-foreground">Cost of funds, P&amp;L, and the accounting ledger</p>
        </div>

        <Card className={AUTH_CARD_CLASS}>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Sign In</CardTitle>
              <CardDescription>Admin/superadmin access only</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <CircleAlert className="h-4 w-4" />
                  <AlertTitle>Login Failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
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
              />
              <AuthInput
                id="password"
                label="Password"
                icon={<Lock className="h-4 w-4" />}
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                trailing={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                }
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className={AUTH_BUTTON_CLASS} disabled={loading}>
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </CardFooter>
          </form>
        </Card>
    </AuthShell>
  );
}
