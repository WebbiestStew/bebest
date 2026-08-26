import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Consulta — Gestión de Pacientes',
  description: 'Sistema de gestión de pacientes para consultorios de psicología',
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <div id="toast-container" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50" />
      </body>
    </html>
  );
}
