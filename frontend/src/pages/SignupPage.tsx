import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { AuthLayout } from '../components/layout/auth-layout';
import { Button } from '../components/ui/button';
import { ErrorBanner } from '../components/ui/error-banner';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';

type SignupPageProps = {
  onSignup: (name: string, email: string, password: string) => Promise<void>;
};

const signupFormSchema = z.object({
  name: z.string().min(2, 'Name is required').max(120),
  email: z.email('Enter a valid email'),
  password: z.string().min(8, 'Must be at least 8 characters').max(128),
});

type SignupFormValues = z.infer<typeof signupFormSchema>;

export default function SignupPage({ onSignup }: SignupPageProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = async (values: SignupFormValues) => {
    setError('');
    setIsSubmitting(true);

    try {
      await onSignup(values.name, values.email, values.password);
      navigate('/dashboard');
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : 'Unable to sign up. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Get started with your CoreHR workspace">
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <FormField label="Full name" htmlFor="name" error={errors.name}>
          <Input id="name" autoFocus {...register('name')} />
        </FormField>

        <FormField label="Email" htmlFor="email" error={errors.email}>
          <Input id="email" type="email" {...register('email')} />
        </FormField>

        <FormField label="Password" htmlFor="password" error={errors.password} hint="Must be at least 8 characters.">
          <Input id="password" type="password" {...register('password')} />
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
