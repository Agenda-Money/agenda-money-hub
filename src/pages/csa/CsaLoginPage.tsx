import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, PhoneCall, CircleAlert, Landmark } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCsaAuth } from '@/contexts/CsaAuthContext';

export default function CsaLoginPage() {
  const { login } = useCsaAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await login(email, password);
    if (result.success) {
      navigate('/csa', { replace: true });
    } else {
      setError(result.message ?? 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-col justify-between bg-primary p-10 relative overflow-hidden">
        {/* Background shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/5 rounded-full" />
          <div className="absolute bottom-20 -right-10 w-64 h-64 bg-white/5 rounded-full" />
          <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-white/5 rounded-full" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Landmark className="h-5 w-5 text-white" />
            </div>
            <span className="text-white font-extrabold text-lg">Agenda Money</span>
          </div>
        </div>

        <div className="relative z-10 space-y-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
            <PhoneCall className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-white leading-tight">
            Collections<br />Portal
          </h2>
          <p className="text-white/70 text-sm leading-relaxed max-w-xs">
            Manage overdue loan recovery. View daily call lists, log contacts, send SMS — all in one place.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-6">
          {[
            { label: 'Buckets', desc: 'DD-3 to DD+8+' },
            { label: 'SMS', desc: 'Template-based' },
            { label: 'Tracking', desc: 'Call history' },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-white font-bold text-sm">{item.label}</p>
              <p className="text-white/60 text-[11px]">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-pink">
              <Landmark className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-extrabold text-foreground">Agenda Money</p>
              <p className="text-xs text-muted-foreground">Collections Portal</p>
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to access your collections dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive" className="rounded-xl">
                <CircleAlert className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Email</Label>
              <Input
                id="email" type="email" placeholder="you@agendamoney.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl" required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Password</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline font-semibold">Forgot?</Link>
              </div>
              <div className="relative">
                <Input
                  id="password" type={showPw ? 'text' : 'password'} placeholder="Enter your password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl pr-10" required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPw(!showPw)}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 rounded-xl font-bold text-base shadow-pink" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            Need access?{' '}
            <span className="text-foreground font-semibold">Contact your administrator</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
