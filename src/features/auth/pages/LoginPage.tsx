import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/forms/FormField';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { ShieldCheck, ArrowRight, Lock, User as UserIcon, Eye, EyeOff, AlertCircle, Sparkles } from 'lucide-react';
import { useToast } from '@/components/feedback/Toast';

export const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [identifier, setIdentifier] = useState('velmurugan');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!identifier.trim()) {
      setErrorMessage('Please enter your username or email.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    try {
      const loggedUser = await login(identifier.trim(), password);
      success('Logged In Successfully', `Welcome back, ${loggedUser.name}!`);

      if (rememberMe) {
        localStorage.setItem('getup_remember_identifier', identifier.trim());
      } else {
        localStorage.removeItem('getup_remember_identifier');
      }

      // Role-based destination
      if (loggedUser.role === 'super_admin') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/tasks', { replace: true });
      }
    } catch (err: any) {
      const msg = err.message || 'Invalid username/email or password.';
      setErrorMessage(msg);
      toastError('Login Failed', msg);
    }
  };

  const handleSelectDemo = (username: string) => {
    setIdentifier(username);
    setPassword('password123');
    setErrorMessage('');
  };

  return (
    <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-14 h-14 bg-primary-600 rounded-card flex items-center justify-center shadow-soft mb-3">
          <img src="/logo.svg" alt="Getup Management" className="w-9 h-9" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-text">Getup Management</h1>
        <p className="text-xs text-text-muted mt-1">Agency Control Panel for Clients, Deliverables & Finance</p>
      </div>

      <Card className="shadow-soft border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold">Sign In to Workspace</CardTitle>
          <CardDescription>Enter your username or email and password to access your agency workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <div className="mb-4 p-3 rounded-control bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Username or Email" htmlFor="identifier" required>
              <Input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="velmurugan or vel@getup.agency"
                leftIcon={<UserIcon className="w-4 h-4 text-text-muted" />}
                required
              />
            </FormField>

            <FormField label="Password" htmlFor="password" required>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  leftIcon={<Lock className="w-4 h-4 text-text-muted" />}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text focus:outline-none"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </FormField>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-text-muted hover:text-text select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-border text-primary-600 focus:ring-primary-500 w-3.5 h-3.5"
                />
                <span>Remember me</span>
              </label>
              <span className="text-[11px] text-text-subtle">Default: password123</span>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full font-semibold"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In
            </Button>
          </form>

          {/* Quick login picker */}
          <div className="mt-6 pt-5 border-t border-border">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>Quick Test Logins:</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSelectDemo('velmurugan')}
                className={`p-2.5 rounded-control border text-left text-xs transition-colors ${
                  identifier === 'velmurugan'
                    ? 'border-primary-600 bg-primary-50/70 text-text font-semibold'
                    : 'border-border hover:bg-surface-subtle text-text-muted'
                }`}
              >
                <div className="font-bold text-text truncate">Velmurugan</div>
                <div className="text-[10px] text-primary-700 font-semibold uppercase">Super Admin</div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectDemo('rahul')}
                className={`p-2.5 rounded-control border text-left text-xs transition-colors ${
                  identifier === 'rahul'
                    ? 'border-primary-600 bg-primary-50/70 text-text font-semibold'
                    : 'border-border hover:bg-surface-subtle text-text-muted'
                }`}
              >
                <div className="font-bold text-text truncate">Rahul Sharma</div>
                <div className="text-[10px] text-emerald-700 font-semibold uppercase">Worker (Tasks only)</div>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 text-center">
        <p className="text-[11px] text-text-subtle flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-primary-600" />
          Enforced with role-based UI and Row Level Security
        </p>
      </div>
    </div>
  );
};
