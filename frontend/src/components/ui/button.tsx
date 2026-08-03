import { Slot } from '@radix-ui/react-slot';
import { type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '../../lib/cn';
import { buttonVariants } from './button-variants';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
  },
);
Button.displayName = 'Button';
