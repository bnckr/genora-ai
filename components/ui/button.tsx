import * as React from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/50',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-brand-600 hover:bg-brand-700 text-white': variant === 'primary',
            'bg-transparent hover:bg-white/5 text-white/70 hover:text-white': variant === 'ghost',
            'border border-white/10 hover:bg-white/5 text-white/80 hover:text-white bg-transparent': variant === 'outline',
          },
          {
            'text-xs px-3 h-8':  size === 'sm',
            'text-sm px-4 h-10': size === 'md',
            'text-base px-6 h-12': size === 'lg',
          },
          className,
        )}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            {children}
          </span>
        ) : children}
      </button>
    )
  },
)
Button.displayName = 'Button'

export { Button }
