'use client';

import React from 'react';
import clsx from 'clsx';

export function Input({
  error,
  required,
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  required?: boolean;
  label?: string;
}) {
  return (
    <div className="flex flex-col">
      {label && (
        <label className="text-sm font-medium text-ink-soft mb-2">
          {label}
          {required && <span className="text-clay ml-1">*</span>}
        </label>
      )}
      <input
        className={clsx(
          'px-3.5 py-3 text-base font-sans border rounded-lg bg-white text-ink transition-all duration-150',
          error ? 'border-red bg-red-pale' : 'border-line focus:outline-none focus:ring-2 focus:ring-sage/40 focus:border-sage'
        )}
        {...props}
      />
      {error && <div className="text-xs text-red mt-1">{error}</div>}
    </div>
  );
}

export function Select({
  error,
  required,
  label,
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  error?: string;
  required?: boolean;
  label?: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="flex flex-col">
      {label && (
        <label className="text-sm font-medium text-ink-soft mb-2">
          {label}
          {required && <span className="text-clay ml-1">*</span>}
        </label>
      )}
      <select
        className={clsx(
          'px-3.5 py-3 text-base font-sans border rounded-lg bg-white text-ink transition-all duration-150',
          error ? 'border-red bg-red-pale' : 'border-line focus:outline-none focus:ring-2 focus:ring-sage/40 focus:border-sage'
        )}
        {...props}
      >
        <option value="">Selecciona…</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <div className="text-xs text-red mt-1">{error}</div>}
    </div>
  );
}

export function Textarea({
  error,
  required,
  label,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: string;
  required?: boolean;
  label?: string;
}) {
  return (
    <div className="flex flex-col">
      {label && (
        <label className="text-sm font-medium text-ink-soft mb-2">
          {label}
          {required && <span className="text-clay ml-1">*</span>}
        </label>
      )}
      <textarea
        className={clsx(
          'px-3.5 py-3 text-base font-sans border rounded-lg bg-white text-ink transition-all duration-150 resize-vertical min-h-24',
          error ? 'border-red bg-red-pale' : 'border-line focus:outline-none focus:ring-2 focus:ring-sage/40 focus:border-sage'
        )}
        {...props}
      />
      {error && <div className="text-xs text-red mt-1">{error}</div>}
    </div>
  );
}

export function Checkbox({
  error,
  required,
  label,
  sublabel,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  required?: boolean;
  label?: string;
  sublabel?: string;
}) {
  return (
    <div
      className={clsx(
        'flex items-start gap-3 p-3 rounded-lg border-b border-line last:border-b-0 transition-colors duration-150 hover:bg-sage-pale/30',
        error && 'bg-red-pale rounded-lg'
      )}
    >
      <input
        type="checkbox"
        className="w-4.5 h-4.5 mt-0.5 accent-sage-deep transition-transform duration-150 hover:scale-110"
        {...props}
      />
      <div className="flex-1">
        {label && (
          <label className="text-sm font-medium text-ink block">
            {label}
            {required && <span className="text-clay ml-1">*</span>}
          </label>
        )}
        {sublabel && <div className="text-xs text-ink-soft mt-1">{sublabel}</div>}
        {error && <div className="text-xs text-red mt-1">{error}</div>}
      </div>
    </div>
  );
}
