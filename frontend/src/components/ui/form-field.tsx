import type { ReactNode } from 'react';
import type { FieldError } from 'react-hook-form';

import { cn } from '../../lib/cn';
import { Label } from './label';

type FormFieldProps = {
  label: string;
  htmlFor: string;
  error?: FieldError | string;
  hint?: string;
  className?: string;
  children: ReactNode;
};

export function FormField({ label, htmlFor, error, hint, className, children }: FormFieldProps) {
  const errorMessage = typeof error === 'string' ? error : error?.message;

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {errorMessage ? (
        <p className="text-xs font-medium text-destructive">{errorMessage}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
