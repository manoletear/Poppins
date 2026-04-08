'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirige a la página CRM con tab Deals activo
export default function DealsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/leads?tab=deals');
  }, [router]);
  return null;
}
