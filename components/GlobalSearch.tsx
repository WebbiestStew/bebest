'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface PatientResult {
  id: string;
  paciente: string;
  terapeuta?: string;
  telefono?: string;
  email?: string;
}

// Patients are fetched lazily (on first focus) rather than on every page
// load, since this sits in the Navigation sidebar rendered on every route —
// no reason to pay that request unless someone actually opens the search.
export function GlobalSearch() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [patients, setPatients] = useState<PatientResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadPatients = async () => {
    if (patients !== null || isLoading) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/patients');
      if (res.ok) {
        const data = await res.json();
        setPatients(data.patients || []);
      }
    } catch (error) {
      console.error('Error loading patients for search:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const term = query.trim().toLowerCase();
  const digitsOnly = term.replace(/\D/g, '');
  const results = (patients || [])
    .filter((p) => {
      if (!term) return false;
      return (
        (p.paciente || '').toLowerCase().includes(term) ||
        (p.email || '').toLowerCase().includes(term) ||
        (digitsOnly.length >= 4 && (p.telefono || '').replace(/\D/g, '').includes(digitsOnly))
      );
    })
    .slice(0, 8);

  const goToPatient = (id: string) => {
    setIsOpen(false);
    setQuery('');
    router.push(`/paciente/${id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      goToPatient(results[0].id);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative mb-4">
      <div className="relative">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        >
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={query}
          onFocus={() => {
            setIsOpen(true);
            loadPatients();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Buscar paciente…"
          className="w-full bg-white/10 focus:bg-white/15 text-white placeholder-gray-400 text-sm rounded-lg pl-9 pr-3 py-2 outline-none transition-colors duration-150 border border-transparent focus:border-white/20"
        />
      </div>

      {isOpen && term && (
        <div className="absolute left-0 right-0 mt-1.5 bg-panel border border-line rounded-lg shadow-xl overflow-hidden z-50 animate-scale-in">
          {isLoading ? (
            <div className="px-3 py-3 text-sm text-ink-soft">Cargando…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-3 text-sm text-ink-soft">Sin resultados para &ldquo;{query}&rdquo;.</div>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => goToPatient(p.id)}
                className="w-full text-left px-3 py-2.5 hover:bg-sage-pale/40 transition-colors duration-150 border-b border-line last:border-0"
              >
                <div className="text-sm font-medium text-ink">{p.paciente}</div>
                {p.terapeuta && <div className="text-xs text-ink-soft">{p.terapeuta}</div>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
