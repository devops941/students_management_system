import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GraduationCap, Loader2, Lock, Mail, ShieldCheck, Users, UserCog, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import api from '@/lib/api';

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@sams.edu', password: 'Admin@123', icon: ShieldCheck },
  { role: 'Faculty', email: 'anita.faculty@sams.edu', password: 'Faculty@123', icon: UserCog },
  { role: 'Student', email: 'diya.reddy1@student.sams.edu', password: 'Student@123', icon: Users },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const user = await login({ email: email.trim(), password });
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      const target = location.state?.from?.pathname;
      const home = { ADMIN: '/admin/dashboard', FACULTY: '/faculty/dashboard', STUDENT: '/student/attendance', PARENT: '/parent/dashboard' };
      navigate(target || home[user.role] || '/', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  const [forgotMode, setForgotMode] = useState(false);

  const submitForgot = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      toast.success('If the email exists, a reset link was sent.');
      if (res?.devToken) {
        toast.message('Dev reset token', { description: res.devToken, duration: 20000 });
      }
      setForgotMode(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-bold">SAMS</p>
            <p className="text-xs text-primary-foreground/80">Student Attendance Management System</p>
          </div>
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-bold leading-tight">
            Digital attendance, automatic percentages and early shortage alerts.
          </h1>
          <ul className="space-y-2 text-sm text-primary-foreground/90">
            <li>&bull; Mark a full period in a few clicks</li>
            <li>&bull; Subject-wise and overall percentage, calculated live</li>
            <li>&bull; Leave and on-duty approvals with auto-adjustment</li>
            <li>&bull; Defaulter lists and exportable reports</li>
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/70">
          Final Year Project &middot; React + Express + Prisma + MongoDB
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <p className="text-lg font-bold">SAMS</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{forgotMode ? 'Reset your password' : 'Sign in'}</CardTitle>
              <CardDescription>
                {forgotMode
                  ? 'Enter your registered email to receive a reset token.'
                  : 'Use your college account to continue.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={forgotMode ? submitForgot : submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@college.edu"
                      className="pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                {!forgotMode && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className="pl-9 pr-9"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {forgotMode ? 'Send reset token' : 'Sign in'}
                </Button>
              </form>

              <button
                type="button"
                onClick={() => { setForgotMode((f) => !f); setError(''); }}
                className="mt-3 w-full text-center text-xs text-primary hover:underline"
              >
                {forgotMode ? 'Back to sign in' : 'Forgot password?'}
              </button>
            </CardContent>
          </Card>

          {!forgotMode && (
            <div className="space-y-2">
              <p className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Demo accounts (click to fill)
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => fillDemo(acc)}
                    className="flex flex-col items-center gap-1 rounded-lg border bg-card p-3 text-xs transition-colors hover:border-primary hover:bg-accent"
                  >
                    <acc.icon className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{acc.role}</span>
                  </button>
                ))}
              </div>
              <p className="text-center text-[11px] text-muted-foreground">
                Parent portal: a guardian email such as <span className="font-mono">parent.diya.reddy1@sams.edu</span> / <span className="font-mono">Parent@123</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
