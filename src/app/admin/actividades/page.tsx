'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirige a la página CRM con tab Actividades activo
export default function ActividadesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/leads?tab=actividades');
  }, [router]);
  return null;
}
