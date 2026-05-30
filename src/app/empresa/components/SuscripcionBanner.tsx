'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';

interface EstadoSus {
  estado: string;
  soloLectura: boolean;
  enTrial: boolean;
  diasRestantesTrial: number;
}

/** Banner de estado de suscripción: aviso de trial o modo solo-lectura. */
export default function SuscripcionBanner() {
  const [estado, setEstado] = useState<EstadoSus | null>(null);

  useEffect(() => {
    fetch('/api/suscripcion/estado')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setEstado(d))
      .catch(() => {});
  }, []);

  if (!estado) return null;

  if (estado.soloLectura) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          Tu prueba terminó. La cuenta está en <strong>solo lectura</strong>. Suscríbete a Pro o Pro+ para
          seguir gestionando tu hogar.
        </span>
      </div>
    );
  }

  if (estado.enTrial) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
        <Clock className="h-4 w-4 shrink-0" />
        <span>
          Estás en período de prueba — te {estado.diasRestantesTrial === 1 ? 'queda' : 'quedan'}{' '}
          <strong>{estado.diasRestantesTrial} {estado.diasRestantesTrial === 1 ? 'día' : 'días'}</strong>. Elegí Pro o Pro+ cuando quieras.
        </span>
      </div>
    );
  }

  return null;
}
