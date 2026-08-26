'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#F6F3EC' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: 420 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <h1 style={{ fontSize: 28, fontWeight: 600, color: '#24312B', marginBottom: 12 }}>
              La aplicación tuvo un error
            </h1>
            <p style={{ color: '#5B6B62', lineHeight: 1.6, marginBottom: 24 }}>
              Algo salió mal al cargar Consulta. Tus datos guardados no se pierden. Intenta recargar la página.
            </p>
            <button
              onClick={() => reset()}
              style={{
                background: '#4C6B51',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '12px 24px',
                fontSize: 15,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Reintentar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
