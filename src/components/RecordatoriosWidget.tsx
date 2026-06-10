'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, Calendar, FileText, User, Umbrella,
  AlertCircle, ChevronRight, Bell, Loader2, CheckCircle2,
} from 'lucide-react';

type Severity = 'urgent' | 'warning' | 'info';
interface Recordatorio {
  id: string;
  severity: Severity;
  titulo: string;
  detalle: string;
  cta?: { label: string; href: string };
  icon: 'calendar' | 'file' | 'user' | 'umbrella' | 'alert';
}

const ICONS = {
  calendar: Calendar, file: FileText, user: User, umbrella: Umbrella, alert: AlertCircle,
};

const SEVERITY_STYLES: Record<Severity, { bg: string; border: string; iconColor: string; badge: string }> = {
  urgent:  { bg: 'bg-red-50',    border: 'border-red-200',    iconColor: 'text-red-600',    badge: 'bg-red-600 text-white' },
  warning: { bg: 'bg-amber-50',  border: 'border-amber-200',  iconColor: 'text-amber-600',  badge: 'bg-amber-500 text-white' },
  info:    { bg: 'bg-blue-50',   border: 'border-blue-200',   iconColor: 'text-blue-600',   badge: 'bg-blue-500 text-white' },
};

export default function RecordatoriosWidget() {
  const [items, setItems] = useState<Recordatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch('/api/empresa/recordatorios')
      .then(r => r.json())
      .then(d => { if (d.ok) setItems(d.data ?? []); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 flex items-center gap-2 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Revisando recordatorios…</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
        <div>
          <div className="text-sm font-semibold text-emerald-900">Todo al día</div>
          <div className="text-xs text-emerald-700">No hay recordatorios pendientes — buen trabajo.</div>
        </div>
      </div>
    );
  }

  const urgentes = items.filter(i => i.severity === 'urgent').length;
  const total = items.length;
  const visibles = expanded ? items : items.slice(0, 3);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 bg-gradient-to-r from-zinc-50 to-white">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-zinc-600" />
          <h2 className="text-sm font-semibold text-zinc-900">Recordatorios</h2>
          {urgentes > 0 && (
            <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
              {urgentes} urgente{urgentes === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <div className="text-xs text-zinc-400">{total} pendiente{total === 1 ? '' : 's'}</div>
      </div>

      <div className="divide-y divide-zinc-100">
        {visibles.map((r) => {
          const Icon = ICONS[r.icon] ?? AlertCircle;
          const styles = SEVERITY_STYLES[r.severity];
          return (
            <div key={r.id} className={`px-5 py-3 flex items-start gap-3 ${styles.bg}`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${styles.iconColor} bg-white border ${styles.border} shrink-0`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-zinc-900">{r.titulo}</div>
                <div className="text-xs text-zinc-600 mt-0.5">{r.detalle}</div>
              </div>
              {r.cta && (
                <Link
                  href={r.cta.href}
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition shrink-0 ${styles.badge} hover:opacity-90`}
                >
                  {r.cta.label}
                  <ChevronRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {total > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-5 py-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition border-t border-zinc-100"
        >
          {expanded ? 'Mostrar menos' : `Ver ${total - 3} más`}
        </button>
      )}
    </div>
  );
}
