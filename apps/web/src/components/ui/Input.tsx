import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Input component following Carbon design system.
 *
 * Design principles:
 * - Clean, minimal styling
 * - Clear focus states with accent color ring
 * - Consistent with 4px grid spacing
 */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          `flex h-9 w-full rounded border border-input bg-background px-3 py-2
           text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium
           placeholder:text-muted-foreground
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
           focus-visible:ring-offset-2 focus-visible:border-transparent
           disabled:cursor-not-allowed disabled:opacity-50`,
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
