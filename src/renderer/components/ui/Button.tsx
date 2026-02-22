import { forwardRef } from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'glass';
  /** Size of the button */
  size?: 'sm' | 'md' | 'lg';
  /** Whether the button is in a loading state */
  loading?: boolean;
  /** Icon to show before the label */
  icon?: React.ReactNode;
}

/**
 * Button component for Blueprint UI.
 * Supports multiple variants, sizes, and loading states.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'sm',
      loading = false,
      disabled,
      icon,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-deep disabled:pointer-events-none disabled:opacity-50';

    // Tokyo Night Storm color variants with violet glow on active states
    const variantStyles = {
      primary:
        'bg-blue-500 text-fg hover:bg-blue-400 active:bg-blue-600 focus-visible:ring-purple-400 active:shadow-[inset_0_0_0_1px_rgba(167,139,250,0.3),0_0_8px_rgba(167,139,250,0.12)]',
      secondary:
        'bg-surface-raised text-fg hover:bg-surface-hover active:bg-surface focus-visible:ring-purple-400 active:shadow-[inset_0_0_0_1px_rgba(167,139,250,0.3),0_0_8px_rgba(167,139,250,0.12)]',
      outline:
        'border border-border-default bg-transparent text-fg hover:bg-surface-hover active:bg-surface focus-visible:ring-purple-400 active:shadow-[inset_0_0_0_1px_rgba(167,139,250,0.3),0_0_8px_rgba(167,139,250,0.12)]',
      ghost:
        'bg-transparent text-fg hover:bg-surface-hover active:bg-surface-hover focus-visible:ring-purple-400 active:shadow-[inset_0_0_0_1px_rgba(167,139,250,0.3),0_0_8px_rgba(167,139,250,0.12)]',
      danger:
        'bg-red-500 text-white hover:bg-red-400 active:bg-red-600 focus-visible:ring-red-500 active:shadow-[inset_0_0_0_1px_rgba(248,113,113,0.3),0_0_8px_rgba(248,113,113,0.12)]',
      glass:
        'bg-surface-raised backdrop-blur-sm border border-border-default text-fg hover:bg-surface-hover active:bg-surface-hover focus-visible:ring-purple-400 active:shadow-[inset_0_0_0_1px_rgba(167,139,250,0.3),0_0_8px_rgba(167,139,250,0.12)]',
    };

    const sizeStyles = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          icon
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
