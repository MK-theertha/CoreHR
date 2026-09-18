import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { AuthLayout } from '../components/layout/auth-layout';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { ErrorBanner } from '../components/ui/error-banner';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';

type LoginPageProps = {
  onLogin: (email: string, password: string, remember?: boolean) => Promise<void>;
};

const loginFormSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

const demoCredentials: Pick<LoginFormValues, 'email' | 'password'> = {
  email: 'admin@corehr.dev',
  password: 'Admin@123',
};

export default function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { ...demoCredentials, remember: true },
  });

  const remember = watch('remember');

  const onSubmit = async (values: LoginFormValues) => {
    setError('');
    setIsSubmitting(true);

    try {
      await onLogin(values.email, values.password, values.remember);
      navigate('/dashboard');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your CoreHR workspace">
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <FormField label="Email" htmlFor="email" error={errors.email}>
          <Input id="email" type="email" autoFocus {...register('email')} />
        </FormField>

        <FormField label="Password" htmlFor="password" error={errors.password}>
          <Input id="password" type="password" {...register('password')} />
        </FormField>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-muted-foreground">
            <Checkbox checked={remember} onCheckedChange={(checked) => setValue('remember', !!checked)} />
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
          onClick={() => reset({ ...demoCredentials, remember })}
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
