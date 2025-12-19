import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Button component following Carbon design system.
 *
 * Design principles: Bauhaus + Dieter Rams
 * - "Less but better" - functional, honest
 * - Sharp corners, geometric shapes
 * - Strong borders, clear states
 * - Immediate interactions (no transitions)
 */
const buttonVariants = cva(
  `inline-flex items-center justify-center whitespace-nowrap font-semibold
   focus-visible:outline-none focus-visible:ring-2
   focus-visible:ring-ring focus-visible:ring-offset-0
   disabled:pointer-events-none disabled:opacity-50`,
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground border-2 border-primary hover:bg-primary/95 active:bg-primary/90',
        secondary:
          'bg-secondary text-secondary-foreground border-2 border-border hover:bg-secondary/90 active:bg-secondary/85',
        ghost: 'border-2 border-transparent hover:bg-secondary hover:border-border',
        destructive:
          'bg-destructive text-destructive-foreground border-2 border-destructive hover:bg-destructive/95 active:bg-destructive/90',
        outline:
          'border-2 border-input bg-background hover:bg-secondary hover:border-border',
        link: 'text-primary underline-offset-1 underline decoration-2 hover:text-primary/90',
      },
      size: {
        default: 'h-9 px-4 py-2 text-sm',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-11 px-6 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
