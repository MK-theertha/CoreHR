import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AuthLayout } from '../components/layout/auth-layout';
import { Button } from '../components/ui/button';
import { ErrorBanner } from '../components/ui/error-banner';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';

type SignupPageProps = {
  onSignup: (name: string, email: string, password: string) => Promise<void>;
};

export default function SignupPage({ onSignup }: SignupPageProps) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await onSignup(name, email, password);
      navigate('/dashboard');
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : 'Unable to sign up. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Get started with your CoreHR workspace">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField label="Full name" htmlFor="name">
          <Input id="name" value={name} onChange={(event) => setName(event.target.value)} autoFocus />
        </FormField>

        <FormField label="Email" htmlFor="email">
          <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </FormField>

        <FormField label="Password" htmlFor="password" hint="Must be at least 8 characters.">
          <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </FormField>

        {error ? <ErrorBanner message={error} /> : null}

        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Sign up'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
