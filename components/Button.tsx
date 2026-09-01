'use client';

import React from 'react';
import clsx from 'clsx';

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  isLoading = false,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}) {
  const baseClasses =
    'font-sans font-semibold rounded-xl transition-all duration-150 ease-out inline-flex items-center justify-center gap-2 active:scale-[0.97] select-none';

  const variantClasses = {
    primary:
      'bg-sage-deep text-white shadow-[0_2px_0_0_rgba(0,0,0,0.12),0_4px_10px_-2px_rgba(76,107,81,0.35)] hover:bg-opacity-90 hover:shadow-[0_2px_0_0_rgba(0,0,0,0.12),0_8px_16px_-4px_rgba(76,107,81,0.45)] hover:-translate-y-0.5 active:shadow-[0_0px_0_0_rgba(0,0,0,0.12)] active:translate-y-0',
    secondary:
      'border-2 border-line text-ink-soft bg-panel hover:bg-sage-pale/40 hover:border-sage hover:text-sage-deep hover:-translate-y-0.5 hover:shadow-md active:translate-y-0',
  };

  const sizeClasses = {
    sm: 'px-4 py-2.5 text-sm min-h-[40px]',
    md: 'px-7 py-3.5 text-base min-h-[48px]',
    lg: 'px-9 py-[18px] text-lg min-h-[56px]',
  };

  return (
    <button
      className={clsx(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="w-4 h-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}

export function BackButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'group inline-flex items-center gap-2 px-4 py-2 pr-4 border border-line text-ink-soft rounded-full text-sm font-sans hover:bg-panel hover:border-sage hover:text-sage-deep active:scale-95 transition-all duration-200 mb-4 animate-fade-in',
        className
      )}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-transform duration-200 group-hover:-translate-x-0.5"
      >
        <path
          d="M8 12L2 7L8 2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Atrás
    </button>
  );
}
