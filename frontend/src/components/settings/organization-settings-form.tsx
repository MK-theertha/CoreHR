import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useOrganization, useUpdateOrganization } from '../../hooks/useOrganization';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ErrorBanner } from '../ui/error-banner';
import { FormField } from '../ui/form-field';
import { Input } from '../ui/input';
import { Skeleton } from '../ui/skeleton';

const schema = z.object({
  name: z.string().min(2, 'Name is required').max(120),
});

type FormValues = z.infer<typeof schema>;

export function OrganizationSettingsForm() {
  const { data: organization, isLoading, isError, error } = useOrganization();
  const updateOrganization = useUpdateOrganization();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: { name: organization?.name ?? '' },
  });

  const onSubmit = (values: FormValues) => {
    updateOrganization
      .mutateAsync(values)
      .then(() => toast.success('Organization updated'))
      .catch((err: Error) => toast.error(err.message));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization profile</CardTitle>
        <CardDescription>This name appears across the app and in employee-facing communications.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-10 w-full max-w-sm" />
        ) : isError ? (
          <ErrorBanner message={(error as Error).message} />
        ) : (
          <form className="max-w-sm space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <FormField label="Organization name" htmlFor="orgName" error={errors.name}>
              <Input id="orgName" {...register('name')} />
            </FormField>

            {updateOrganization.isError ? <ErrorBanner message={(updateOrganization.error as Error).message} /> : null}

            <Button type="submit" disabled={updateOrganization.isPending}>
              {updateOrganization.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
