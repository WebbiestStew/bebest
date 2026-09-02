'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import clsx from 'clsx';

export function Input({
  error,
  required,
  label,
  className,
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
          'px-4 py-3.5 text-base font-sans border-2 rounded-xl bg-white text-ink transition-all duration-150 min-h-[48px]',
          error
            ? 'border-red bg-red-pale'
            : 'border-line focus:outline-none focus:ring-4 focus:ring-sage/20 focus:border-sage',
          className
        )}
        {...props}
      />
      {error && <div className="text-xs text-red mt-1">{error}</div>}
    </div>
  );
}

// Custom dropdown — not a native <select>. A native select's closed state
// can be styled, but the open popup is drawn entirely by the OS/browser and
// can't be touched with CSS (that's the ugly grey overlay Diego flagged).
// This renders both the trigger and the option panel ourselves, but keeps
// the exact same public API as before (value/onChange with onChange reading
// e.target.value) so none of the 14 call sites across the app needed to
// change — onChange is called with a minimal synthetic event shaped like a
// real select's ChangeEvent.
export function Select({
  error,
  required,
  label,
  options,
  value,
  onChange,
  disabled,
  id,
  name,
  className,
  placeholder = 'Selecciona…',
}: {
  error?: string;
  required?: boolean;
  label?: string;
  options: Array<{ value: string; label: string }>;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
  placeholder?: string;
}) {
  const autoId = useId();
  const selectId = id || autoId;
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  // Long lists (e.g. 200+ patients) were unbrowsable without this — filter
  // by the typed query, case-insensitive substring match against the label.
  const filteredOptions = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Move focus into the search box the instant the panel opens, so typing
  // works immediately without an extra click.
  useEffect(() => {
    if (isOpen) searchRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || highlightedIndex < 0) return;
    const el = listRef.current?.children[highlightedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, isOpen]);

  const closeDropdown = (refocusTrigger = true) => {
    setIsOpen(false);
    setQuery('');
    if (refocusTrigger) buttonRef.current?.focus();
  };

  const commitValue = (val: string) => {
    // Clicking an <li> (not focusable) drops browser focus entirely, so a
    // keyboard user who reopens with Enter/Space right after a mouse pick
    // would otherwise find nothing focused. Keep focus on the trigger.
    closeDropdown(true);
    onChange?.({ target: { value: val, name } } as unknown as React.ChangeEvent<HTMLSelectElement>);
  };

  const openDropdown = () => {
    if (disabled) return;
    const idx = options.findIndex((o) => o.value === value);
    setHighlightedIndex(idx >= 0 ? idx : 0);
    setIsOpen(true);
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || isOpen) return;
    // Once open, focus moves to the search box below — its own handler takes
    // over from there.
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openDropdown();
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
        commitValue(filteredOptions[highlightedIndex].value);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeDropdown(true);
    } else if (e.key === 'Tab') {
      // Let Tab move focus on to wherever it naturally goes next — don't
      // steal it back to the trigger the way Escape does.
      closeDropdown(false);
    }
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setHighlightedIndex(0);
  };

  return (
    <div className="flex flex-col" ref={containerRef}>
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-ink-soft mb-2">
          {label}
          {required && <span className="text-clay ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          id={selectId}
          disabled={disabled}
          onClick={(e) => {
            // A native <button> fires its own synthetic click when Enter/Space
            // activates it (detail === 0, vs a real pointer click's detail >= 1)
            // — onKeyDown below already opens/commits for those keys, so
            // handling this click too would immediately re-toggle right after.
            if (e.detail === 0) return;
            isOpen ? closeDropdown(false) : openDropdown();
          }}
          onKeyDown={handleTriggerKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={clsx(
            'w-full flex items-center justify-between gap-2 px-4 py-3.5 text-base font-sans border-2 rounded-xl bg-white text-left transition-all duration-150 min-h-[48px]',
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            error
              ? 'border-red bg-red-pale'
              : clsx(
                  'focus:outline-none focus:ring-4 focus:ring-sage/20 focus:border-sage',
                  isOpen ? 'border-sage ring-4 ring-sage/20' : 'border-line'
                ),
            className
          )}
        >
          <span className={clsx('truncate', selectedOption ? 'text-ink' : 'text-ink-soft/60')}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <svg
            className={clsx(
              'w-4 h-4 shrink-0 text-ink-soft transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
            viewBox="0 0 16 16"
            fill="none"
          >
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-30 mt-2 w-full rounded-xl border-2 border-line bg-panel shadow-lg animate-scale-in origin-top overflow-hidden">
            <div className="p-2 border-b border-line">
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={handleQueryChange}
                onKeyDown={handleSearchKeyDown}
                placeholder="Buscar…"
                className="w-full px-3 py-2 text-sm font-sans rounded-lg border border-line bg-white text-ink focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
              />
            </div>
            <ul
              ref={listRef}
              role="listbox"
              tabIndex={-1}
              aria-labelledby={label ? selectId : undefined}
              className="max-h-56 overflow-auto py-1.5"
            >
              {filteredOptions.length === 0 ? (
                <li className="px-4 py-3 text-sm text-ink-soft">Sin resultados</li>
              ) : (
                filteredOptions.map((opt, i) => {
                  const isSelected = opt.value === value;
                  const isHighlighted = i === highlightedIndex;
                  return (
                    <li
                      key={opt.value}
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setHighlightedIndex(i)}
                      onClick={() => commitValue(opt.value)}
                      className={clsx(
                        'flex items-center justify-between gap-2 mx-1.5 px-3 py-3 rounded-lg text-base cursor-pointer transition-colors duration-100',
                        isSelected
                          ? 'bg-sage-deep text-white font-medium'
                          : isHighlighted
                          ? 'bg-sage-pale text-ink'
                          : 'text-ink'
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && (
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M3 8.5L6.2 11.5L13 4.5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>
      {error && <div className="text-xs text-red mt-1">{error}</div>}
    </div>
  );
}

export function Textarea({
  error,
  required,
  label,
  className,
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
          'px-4 py-3.5 text-base font-sans border-2 rounded-xl bg-white text-ink transition-all duration-150 resize-vertical min-h-28',
          error
            ? 'border-red bg-red-pale'
            : 'border-line focus:outline-none focus:ring-4 focus:ring-sage/20 focus:border-sage',
          className
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
  id,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  required?: boolean;
  label?: string;
  sublabel?: string;
}) {
  // Wrapping the whole row in a <label> (rather than just the tiny checkbox
  // square) means tapping anywhere on the label/sublabel toggles it too —
  // previously only the ~18px box itself was clickable, which is well under
  // any reasonable touch target size.
  const autoId = useId();
  const inputId = id || autoId;

  return (
    <label
      htmlFor={inputId}
      className={clsx(
        'flex items-start gap-3 p-3.5 rounded-lg border-b border-line last:border-b-0 transition-colors duration-150 hover:bg-sage-pale/30 cursor-pointer select-none',
        error && 'bg-red-pale rounded-lg',
        className
      )}
    >
      <span className="relative w-5 h-5 mt-0.5 shrink-0">
        {/* Real checkbox stays fully functional (keyboard, screen readers,
            form submission) but invisible — the box + checkmark drawn below
            are what animate, which a native checkbox's own glyph can't do.
            Both are kept as DIRECT siblings of the input (not nested inside
            each other) since peer-checked only matches same-parent siblings —
            a peer-checked class buried inside a nested child silently never
            applies. */}
        <input
          id={inputId}
          type="checkbox"
          className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          {...props}
        />
        <span
          className="pointer-events-none absolute inset-0 rounded-md border-2 border-line bg-white transition-colors duration-150
            peer-checked:border-sage-deep peer-checked:bg-sage-deep peer-checked:animate-check-pop
            peer-focus-visible:ring-4 peer-focus-visible:ring-sage/30"
        />
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className="pointer-events-none absolute inset-0 w-full h-full p-[3px] scale-50 opacity-0 transition-all duration-150 peer-checked:scale-100 peer-checked:opacity-100"
        >
          <path
            d="M3 8.5L6.2 11.5L13 4.5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <div className="flex-1">
        {label && (
          <span className="text-sm font-medium text-ink block">
            {label}
            {required && <span className="text-clay ml-1">*</span>}
          </span>
        )}
        {sublabel && <div className="text-xs text-ink-soft mt-1">{sublabel}</div>}
        {error && <div className="text-xs text-red mt-1">{error}</div>}
      </div>
    </label>
  );
}
