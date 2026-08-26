'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PacientePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to pacientes list page
    router.push('/pacientes');
  }, [router]);

  return null;
}
