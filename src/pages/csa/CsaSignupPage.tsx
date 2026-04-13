import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Sparkles, CircleAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import csaApi from '@/lib/csaApi';
import { useCsaAuth } from '@/contexts/CsaAuthContext';

export default function CsaSignupPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useCsaAuth();
  const token = params.get('token') ?? '';

  const [prefill, setPrefill] = useState({ email: '', fullName: '' });
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    csaApi.get(`/api/csa/auth/signup-info?token=${token}`)
      .then((r) => {
        setPrefill(r.data);
        if (r.data.fullName) setFullName(r.data.fullName);
      })
      .catch(() => setError('Invalid or expired invite link.'));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    setError(null);
    try {
      await csaApi.post('/api/csa/auth/signup', { token, password, fullName, phoneNumber });
      const result = await login(prefill.email, password);
      if (result.success) navigate('/csa', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Signup failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-pink">
              <Sparkles className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">Set up your account</h1>
          {prefill.email && (
            <p className="text-sm text-muted-foreground">
              Signing up as <span className="font-semibold text-foreground">{prefill.email}</span>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <CircleAlert className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {[
            { id: 'fullName', label: 'Full Name', type: 'text', value: fullName, onChange: setFullName, placeholder: 'First and last name' },
            { id: 'phoneNumber', label: 'Phone Number', type: 'tel', value: phoneNumber, onChange: setPhoneNumber, placeholder: '024 000 0000' },
          ].map(({ id, label, type, value, onChange, placeholder }) => (
            <div key={id} className="space-y-2">
              <Label htmlFor={id} className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</Label>
              <Input id={id} type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="h-11 rounded-xl" required />
            </div>
          ))}

          {(['password', 'confirm'] as const).map((field) => (
            <div key={field} className="space-y-2">
              <Label htmlFor={field} className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {field === 'password' ? 'Password' : 'Confirm Password'}
              </Label>
              <div className="relative">
                <Input
                  id={field}
                  type={showPw ? 'text' : 'password'}
                  placeholder={field === 'password' ? 'Min 8 chars, upper, lower, number, symbol' : 'Repeat password'}
                  value={field === 'password' ? password : confirm}
                  onChange={(e) => field === 'password' ? setPassword(e.target.value) : setConfirm(e.target.value)}
                  className="h-11 rounded-xl pr-10" required
                />
                {field === 'confirm' && (
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPw(!showPw)}>
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}

          <Button type="submit" className="w-full h-11 rounded-xl font-bold shadow-pink mt-2" disabled={loading || !token}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating account...
              </span>
            ) : 'Create Account'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
