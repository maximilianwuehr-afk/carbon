import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Input component following Carbon design system.
 *
 * Design principles: Bauhaus + Dieter Rams
 * - Sharp corners, geometric
 * - Strong borders (2px)
 * - Clear focus states
 * - Functional, honest
 */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          `flex h-9 w-full border-2 border-input bg-background px-4 py-2
           text-sm file:border-0 file:bg-transparent file:text-sm file:font-semibold
           placeholder:text-muted-foreground
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
           focus-visible:ring-offset-0 focus-visible:border-primary
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
