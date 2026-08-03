import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AuthLayout } from '../components/layout/auth-layout';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { ErrorBanner } from '../components/ui/error-banner';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';

type LoginPageProps = {
  onLogin: (email: string, password: string, remember?: boolean) => Promise<void>;
};

export default function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@corehr.dev');
  const [password, setPassword] = useState('Admin@123');
  const [remember, setRemember] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await onLogin(email, password, remember);
      navigate('/dashboard');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your CoreHR workspace">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField label="Email" htmlFor="email">
          <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoFocus />
        </FormField>

        <FormField label="Password" htmlFor="password">
          <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </FormField>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-muted-foreground">
            <Checkbox checked={remember} onCheckedChange={(checked) => setRemember(!!checked)} />
            Remember me
          </label>
          <button type="button" className="font-medium text-primary hover:underline">
            Forgot password?
          </button>
        </div>

        {error ? <ErrorBanner message={error} /> : null}

        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            setEmail('admin@corehr.dev');
            setPassword('Admin@123');
          }}
        >
          Use demo account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link to="/signup" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
