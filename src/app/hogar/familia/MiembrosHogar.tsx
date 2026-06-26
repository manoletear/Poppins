'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  UserPlus, Trash2, Mail, Loader2, X, ChevronDown, ChevronUp, Check,
  Clock, Users,
} from 'lucide-react';
import { PERMISOS_DEFAULT_FAMILIAR, PERMISOS_LABELS } from '@/lib/payroll/types/miembros';
import type { MiembroHogar, Permisos, SeccionPermiso } from '@/lib/payroll/types/miembros';

const ETIQUETAS = ['Cónyuge', 'Hijo/a', 'Padre', 'Madre', 'Abuelo/a', 'Otro familiar'];

function PermisoToggle({
  seccion,
  value,
  onChange,
  disabled,
}: {
  seccion: SeccionPermiso;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
          value ? 'bg-zinc-900 border-zinc-900' : 'border-zinc-300 bg-white'
        }`}
      >
        {value && <Check className="h-3 w-3 text-white" />}
      </button>
      <span className="text-sm text-zinc-700">{PERMISOS_LABELS[seccion]}</span>
    </label>
  );
}

function MiembroCard({
  miembro,
  isOwner,
  onRemove,
  onSavePermisos,
}: {
  miembro: MiembroHogar;
  isOwner: boolean;
  onRemove: (id: string) => void;
  onSavePermisos: (id: string, etiqueta: string, permisos: Permisos) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [localPermisos, setLocalPermisos] = useState<Permisos>(miembro.permisos ?? PERMISOS_DEFAULT_FAMILIAR);
  const [localEtiqueta, setLocalEtiqueta] = useState(miembro.etiqueta ?? '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const nombre = miembro.apodo || miembro.nombre || miembro.invitacion_email || 'Invitado';
  const sub = miembro.estado === 'pendiente' ? 'Invitación pendiente' : (miembro.etiqueta ?? miembro.rol);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSavePermisos(miembro.auth_user_id, localEtiqueta, localPermisos);
      setExpanded(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="h-9 w-9 rounded-full bg-zinc-100 flex items-center justify-center shrink-0 text-sm font-semibold text-zinc-600">
          {nombre.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-900 truncate">{nombre}</p>
          <p className="text-xs text-zinc-500 flex items-center gap-1">
            {miembro.estado === 'pendiente' && <Clock className="h-3 w-3" />}
            {sub}
          </p>
        </div>
        {isOwner && miembro.rol !== 'owner' && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="rounded-lg border border-zinc-200 p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {confirmDelete ? (
              <>
                <button
                  onClick={() => onRemove(miembro.auth_user_id)}
                  className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50 transition-colors"
                >
                  No
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="rounded-lg border border-zinc-200 p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {expanded && isOwner && (
        <div className="border-t border-zinc-100 px-4 py-4 space-y-4 bg-zinc-50">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Etiqueta familiar
            </label>
            <div className="flex flex-wrap gap-2">
              {ETIQUETAS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setLocalEtiqueta(e)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    localEtiqueta === e
                      ? 'bg-zinc-900 text-white'
                      : 'bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-400'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Secciones habilitadas
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(PERMISOS_LABELS) as SeccionPermiso[]).map((sec) => (
                <PermisoToggle
                  key={sec}
                  seccion={sec}
                  value={localPermisos[sec] ?? false}
                  onChange={(v) => setLocalPermisos({ ...localPermisos, [sec]: v })}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setExpanded(false)}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MiembrosHogar({ isOwner }: { isOwner: boolean }) {
  const [miembros, setMiembros] = useState<MiembroHogar[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [invEmail, setInvEmail] = useState('');
  const [invEtiqueta, setInvEtiqueta] = useState(ETIQUETAS[0]);
  const [invPermisos, setInvPermisos] = useState<Permisos>(PERMISOS_DEFAULT_FAMILIAR);
  const [invLoading, setInvLoading] = useState(false);
  const [invError, setInvError] = useState<string | null>(null);
  const [invSuccess, setInvSuccess] = useState(false);

  const fetchMiembros = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hogar/miembros');
      if (res.ok) {
        const data = await res.json();
        setMiembros(
          (data.miembros ?? []).map((m: Record<string, unknown>) => ({
            ...m,
            nombre: (m.user_profiles as Record<string, unknown> | null)?.nombre ?? null,
            apellido: (m.user_profiles as Record<string, unknown> | null)?.apellido ?? null,
            email: (m.user_profiles as Record<string, unknown> | null)?.email ?? null,
            avatar_url: (m.user_profiles as Record<string, unknown> | null)?.avatar_url ?? null,
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMiembros(); }, [fetchMiembros]);

  const handleInvitar = async () => {
    if (!invEmail.trim()) return;
    setInvLoading(true);
    setInvError(null);
    try {
      const res = await fetch('/api/hogar/miembros/invitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: invEmail.trim(), etiqueta: invEtiqueta, permisos: invPermisos }),
      });
      const data = await res.json();
      if (!res.ok) { setInvError(data.error ?? 'Error al enviar'); return; }
      setInvSuccess(true);
      setInvEmail('');
      setInvPermisos(PERMISOS_DEFAULT_FAMILIAR);
      await fetchMiembros();
      setTimeout(() => { setInvSuccess(false); setShowInvite(false); }, 2000);
    } finally {
      setInvLoading(false);
    }
  };

  const handleRemove = async (authUserId: string) => {
    await fetch(`/api/hogar/miembros?auth_user_id=${authUserId}`, { method: 'DELETE' });
    await fetchMiembros();
  };

  const handleSavePermisos = async (authUserId: string, etiqueta: string, permisos: Permisos) => {
    await fetch('/api/hogar/miembros', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth_user_id: authUserId, etiqueta, permisos }),
    });
    await fetchMiembros();
  };

  return (
    <div className="rounded-xl border bg-white p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-50 p-2">
            <Users className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Acceso al Hogar</h2>
            <p className="text-xs text-zinc-500">Miembros con cuenta en Poppins</p>
          </div>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Invitar
          </button>
        )}
      </div>

      {/* Formulario de invitación */}
      {showInvite && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-900">Nueva invitación</p>
            <button onClick={() => setShowInvite(false)}>
              <X className="h-4 w-4 text-zinc-400" />
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="email"
                value={invEmail}
                onChange={(e) => setInvEmail(e.target.value)}
                placeholder="email@ejemplo.com"
                className="w-full rounded-lg border border-zinc-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-2">Etiqueta</label>
            <div className="flex flex-wrap gap-2">
              {ETIQUETAS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setInvEtiqueta(e)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    invEtiqueta === e
                      ? 'bg-zinc-900 text-white'
                      : 'bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-400'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-2">Secciones que puede ver</label>
            <div className="grid grid-cols-2 gap-2 bg-white rounded-lg border border-zinc-200 p-3">
              {(Object.keys(PERMISOS_LABELS) as SeccionPermiso[]).map((sec) => (
                <PermisoToggle
                  key={sec}
                  seccion={sec}
                  value={invPermisos[sec] ?? false}
                  onChange={(v) => setInvPermisos({ ...invPermisos, [sec]: v })}
                />
              ))}
            </div>
          </div>

          {invError && <p className="text-xs text-red-600">{invError}</p>}
          {invSuccess && <p className="text-xs text-green-600">¡Invitación enviada!</p>}

          <div className="flex justify-end">
            <button
              onClick={handleInvitar}
              disabled={invLoading || !invEmail.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {invLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Enviar invitación
            </button>
          </div>
        </div>
      )}

      {/* Lista de miembros */}
      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando miembros...
        </div>
      ) : miembros.length === 0 ? (
        <p className="text-sm text-zinc-400">No hay miembros con acceso todavía.</p>
      ) : (
        <div className="space-y-2">
          {miembros.map((m) => (
            <MiembroCard
              key={m.auth_user_id}
              miembro={m}
              isOwner={isOwner}
              onRemove={handleRemove}
              onSavePermisos={handleSavePermisos}
            />
          ))}
        </div>
      )}
    </div>
  );
}
