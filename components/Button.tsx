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
  const baseClasses = 'font-sans font-medium rounded-lg transition-all duration-200 ease-out inline-flex items-center justify-center gap-2 active:scale-95';

  const variantClasses = {
    primary: 'bg-sage-deep text-white shadow-sm hover:bg-opacity-90 hover:shadow-md hover:-translate-y-0.5',
    secondary:
      'border border-line text-ink-soft bg-transparent hover:bg-panel hover:border-sage hover:text-sage-deep hover:-translate-y-0.5 hover:shadow-sm',
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
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
