'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import {
  Loader2, Plus, Search, Filter, MoreHorizontal, User, Mail, Phone,
  Calendar, MessageSquare, ChevronDown, X, Users, TrendingUp, LayoutGrid,
  Table2, List, GripVertical
} from 'lucide-react';

interface Lead {
  id: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
  telefono?: string | null;
  rol: string;
  created_at: string;
}

type Estado = 'nuevo' | 'contactado' | 'demo_agendada' | 'propuesta_enviada' | 'cerrado_ganado' | 'cerrado_perdido';
type Fuente = 'formulario' | 'whatsapp' | 'email' | 'referido';
type ViewMode = 'kanban' | 'tabla' | 'lista';

interface LeadExtra {
  estado: Estado;
  fuente: Fuente;
  notas: string;
  next_action?: string;
}

const ESTADOS: { key: Estado; label: string; color: string; bg: string }[] = [
  { key: 'nuevo', label: 'Nuevo', color: 'bg-slate-500', bg: 'bg-slate-50' },
  { key: 'contactado', label: 'Contactado', color: 'bg-blue-500', bg: 'bg-blue-50' },
  { key: 'demo_agendada', label: 'Demo Agendada', color: 'bg-violet-500', bg: 'bg-violet-50' },
  { key: 'propuesta_enviada', label: 'Propuesta Enviada', color: 'bg-amber-500', bg: 'bg-amber-50' },
  { key: 'cerrado_ganado', label: 'Cerrado Ganado', color: 'bg-emerald-500', bg: 'bg-emerald-50' },
  { key: 'cerrado_perdido', label: 'Cerrado Perdido', color: 'bg-red-500', bg: 'bg-red-50' },
];

const FUENTES: Fuente[] = ['formulario', 'whatsapp', 'email', 'referido'];
const LS_KEY = 'poppins_leads_extra';

function loadExtras(): Record<string, LeadExtra> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
}
function saveExtras(data: Record<string, LeadExtra>) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

export default function LeadsPage() {
  const { profile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [extras, setExtras] = useState<Record<string, LeadExtra>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterFuente, setFilterFuente] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [showAddForm, setShowAddForm] = useState(false);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [sortCol, setSortCol] = useState<string>('created_at');
  const [sortAsc, setSortAsc] = useState(false);

  // New lead form
  const [formNombre, setFormNombre] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formFuente, setFormFuente] = useState<Fuente>('formulario');
  const [formNotas, setFormNotas] = useState('');

  // Detail modal
  const [detailNota, setDetailNota] = useState('');
  const [detailNextAction, setDetailNextAction] = useState('');

  useEffect(() => {
    if (profile?.rol !== 'admin') return;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from('user_profiles')
        .select('id, email, nombre, apellido, rol, created_at')
        .order('created_at', { ascending: false });
      setLeads(data || []);
      setExtras(loadExtras());
      setLoading(false);
    }
    load();
  }, [profile]);

  const getExtra = useCallback((id: string): LeadExtra => {
    return extras[id] || { estado: 'nuevo', fuente: 'formulario', notas: '', next_action: '' };
  }, [extras]);

  const updateExtra = useCallback((id: string, patch: Partial<LeadExtra>) => {
    setExtras(prev => {
      const current = prev[id] || { estado: 'nuevo' as Estado, fuente: 'formulario' as Fuente, notas: '', next_action: '' };
      const updated = { ...prev, [id]: { ...current, ...patch } };
      saveExtras(updated);
      return updated;
    });
  }, []);

  const filtered = useMemo(() => {
    return leads.filter(l => {
      const s = search.toLowerCase();
      const matchSearch = !search || (l.nombre?.toLowerCase().includes(s) ?? false) ||
        (l.apellido?.toLowerCase().includes(s) ?? false) || l.email.toLowerCase().includes(s);
      const extra = getExtra(l.id);
      const matchFuente = !filterFuente || extra.fuente === filterFuente;
      return matchSearch && matchFuente;
    });
  }, [leads, search, filterFuente, getExtra]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va: string, vb: string;
      if (sortCol === 'nombre') { va = a.nombre || ''; vb = b.nombre || ''; }
      else if (sortCol === 'email') { va = a.email; vb = b.email; }
      else if (sortCol === 'estado') { va = getExtra(a.id).estado; vb = getExtra(b.id).estado; }
      else if (sortCol === 'fuente') { va = getExtra(a.id).fuente; vb = getExtra(b.id).fuente; }
      else { va = a.created_at; vb = b.created_at; }
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }, [filtered, sortCol, sortAsc, getExtra]);

  const stats = useMemo(() => {
    const total = leads.length;
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeek = leads.filter(l => new Date(l.created_at) >= weekAgo).length;
    const ganados = leads.filter(l => getExtra(l.id).estado === 'cerrado_ganado').length;
    const rate = total > 0 ? ((ganados / total) * 100).toFixed(1) : '0';
    const bySource: Record<string, number> = {};
    leads.forEach(l => { const f = getExtra(l.id).fuente; bySource[f] = (bySource[f] || 0) + 1; });
    return { total, thisWeek, rate, ganados, bySource };
  }, [leads, getExtra]);

  const handleAddLead = async () => {
    if (!formEmail) return;
    const supabase = createClient();
    const { data } = await supabase.from('user_profiles')
      .insert({ email: formEmail, nombre: formNombre || null, rol: 'lead' })
      .select('id, email, nombre, apellido, rol, created_at').single();
    if (data) {
      setLeads(prev => [data, ...prev]);
      updateExtra(data.id, { estado: 'nuevo', fuente: formFuente, notas: formNotas ? `[${new Date().toLocaleString('es-CL')}] ${formNotas}` : '' });
    }
    setFormNombre(''); setFormEmail(''); setFormTelefono(''); setFormFuente('formulario'); setFormNotas('');
    setShowAddForm(false);
  };

  const appendNota = (id: string) => {
    if (!detailNota.trim()) return;
    const prev = getExtra(id).notas;
    const entry = `[${new Date().toLocaleString('es-CL')}] ${detailNota.trim()}`;
    updateExtra(id, { notas: prev ? `${prev}\n${entry}` : entry });
    setDetailNota('');
  };

  if (profile?.rol !== 'admin') {
    return (<div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <p className="text-zinc-500">Acceso restringido a administradores.</p>
    </div>);
  }
  if (loading) {
    return (<div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
    </div>);
  }

  const toggleSort = (col: string) => { setSortAsc(sortCol === col ? !sortAsc : true); setSortCol(col); };
  const displayName = (l: Lead) => `${l.nombre || l.email.split('@')[0]} ${l.apellido || ''}`.trim();

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">CRM Leads</h1>
            <p className="text-sm text-zinc-500">Pipeline de ventas y seguimiento</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-zinc-200 bg-white overflow-hidden">
              {([['kanban', LayoutGrid], ['tabla', Table2], ['lista', List]] as [ViewMode, typeof LayoutGrid][]).map(([mode, Icon]) => (
                <button key={mode} onClick={() => setViewMode(mode)}
                  className={`px-3 py-2 flex items-center gap-1.5 text-sm transition ${viewMode === mode ? 'bg-violet-600 text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}>
                  <Icon className="w-4 h-4" />{mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
            <button onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition">
              <Plus className="w-4 h-4" />Nuevo Lead
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total Leads', value: stats.total, icon: <Users className="w-4 h-4" />, c: 'bg-violet-500' },
            { label: 'Esta semana', value: stats.thisWeek, icon: <Calendar className="w-4 h-4" />, c: 'bg-blue-500' },
            { label: 'Conversión', value: `${stats.rate}%`, icon: <TrendingUp className="w-4 h-4" />, c: 'bg-emerald-500' },
            ...FUENTES.slice(0, 2).map(f => ({
              label: f.charAt(0).toUpperCase() + f.slice(1), value: stats.bySource[f] || 0,
              icon: f === 'formulario' ? <LayoutGrid className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />, c: 'bg-amber-500'
            }))
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-zinc-200 bg-white p-3 flex items-center gap-3">
              <div className={`w-8 h-8 ${s.c} rounded-lg flex items-center justify-center text-white`}>{s.icon}</div>
              <div><p className="text-lg font-bold text-zinc-900">{s.value}</p><p className="text-[11px] text-zinc-500">{s.label}</p></div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input type="text" placeholder="Buscar por nombre o email..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <select value={filterFuente} onChange={e => setFilterFuente(e.target.value)}
              className="pl-9 pr-8 py-2 text-sm rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 appearance-none">
              <option value="">Todas las fuentes</option>
              {FUENTES.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
            </select>
          </div>
        </div>

        {/* KANBAN VIEW */}
        {viewMode === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {ESTADOS.map(col => {
              const colLeads = filtered.filter(l => getExtra(l.id).estado === col.key);
              return (
                <div key={col.key} className="rounded-xl border border-zinc-200 bg-white min-w-0">
                  <div className="p-3 border-b border-zinc-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 ${col.color} rounded-full`} />
                      <span className="font-semibold text-zinc-900 text-xs">{col.label}</span>
                    </div>
                    <span className="text-[10px] font-medium bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded-full">{colLeads.length}</span>
                  </div>
                  <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto">
                    {colLeads.length === 0 ? (
                      <p className="text-[11px] text-zinc-400 text-center py-6">Sin leads</p>
                    ) : colLeads.map(lead => {
                      const extra = getExtra(lead.id);
                      return (
                        <div key={lead.id} onClick={() => { setDetailLead(lead); setDetailNextAction(extra.next_action || ''); }}
                          className="rounded-xl border border-zinc-100 p-3 hover:border-violet-300 hover:shadow-sm transition cursor-pointer group">
                          <div className="flex items-start justify-between">
                            <p className="text-sm font-medium text-zinc-900 leading-tight">{displayName(lead)}</p>
                            <div className="relative">
                              <select value={extra.estado} onClick={e => e.stopPropagation()}
                                onChange={e => { e.stopPropagation(); updateExtra(lead.id, { estado: e.target.value as Estado }); }}
                                className="opacity-0 group-hover:opacity-100 absolute right-0 top-0 w-5 h-5 cursor-pointer text-[10px] appearance-none">
                                {ESTADOS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                              </select>
                              <MoreHorizontal className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500" />
                            </div>
                          </div>
                          <p className="text-[11px] text-zinc-500 truncate mt-0.5">{lead.email}</p>
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600 capitalize">{extra.fuente}</span>
                            <span className="text-[10px] text-zinc-400">{new Date(lead.created_at).toLocaleDateString('es-CL')}</span>
                          </div>
                          {extra.notas && <p className="text-[10px] text-zinc-400 mt-1.5 line-clamp-2">{extra.notas.split('\n').pop()}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TABLE VIEW */}
        {viewMode === 'tabla' && (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100">
                    {[['nombre', 'Nombre'], ['email', 'Email'], ['fuente', 'Fuente'], ['estado', 'Estado'], ['created_at', 'Fecha']].map(([key, label]) => (
                      <th key={key} onClick={() => toggleSort(key)}
                        className="text-left px-4 py-3 font-medium text-zinc-600 cursor-pointer hover:text-zinc-900 select-none">
                        <span className="flex items-center gap-1">{label}
                          {sortCol === key && <ChevronDown className={`w-3 h-3 transition ${sortAsc ? 'rotate-180' : ''}`} />}
                        </span>
                      </th>
                    ))}
                    <th className="text-left px-4 py-3 font-medium text-zinc-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(lead => {
                    const extra = getExtra(lead.id);
                    const estadoCfg = ESTADOS.find(e => e.key === extra.estado)!;
                    return (
                      <tr key={lead.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition">
                        <td className="px-4 py-3 font-medium text-zinc-900">{displayName(lead)}</td>
                        <td className="px-4 py-3 text-zinc-600">{lead.email}</td>
                        <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 capitalize">{extra.fuente}</span></td>
                        <td className="px-4 py-3">
                          <select value={extra.estado} onChange={e => updateExtra(lead.id, { estado: e.target.value as Estado })}
                            className={`text-xs px-2 py-1 rounded-full border-0 ${estadoCfg.bg} font-medium cursor-pointer focus:ring-2 focus:ring-violet-500`}>
                            {ESTADOS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-zinc-500">{new Date(lead.created_at).toLocaleDateString('es-CL')}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => { setDetailLead(lead); setDetailNextAction(extra.next_action || ''); }}
                            className="text-violet-600 hover:text-violet-800 text-xs font-medium">Ver detalle</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* LIST VIEW */}
        {viewMode === 'lista' && (
          <div className="space-y-4">
            {ESTADOS.map(col => {
              const colLeads = filtered.filter(l => getExtra(l.id).estado === col.key);
              if (colLeads.length === 0) return null;
              return (
                <div key={col.key} className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 ${col.color} rounded-full`} />
                    <span className="font-semibold text-sm text-zinc-900">{col.label}</span>
                    <span className="text-xs text-zinc-400 ml-1">({colLeads.length})</span>
                  </div>
                  <div className="divide-y divide-zinc-50">
                    {colLeads.map(lead => {
                      const extra = getExtra(lead.id);
                      return (
                        <div key={lead.id} onClick={() => { setDetailLead(lead); setDetailNextAction(extra.next_action || ''); }}
                          className="px-4 py-2.5 flex items-center gap-4 hover:bg-zinc-50 transition cursor-pointer">
                          <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                            <User className="w-4 h-4 text-violet-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-900 truncate">{displayName(lead)}</p>
                            <p className="text-[11px] text-zinc-500">{lead.email}</p>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 capitalize">{extra.fuente}</span>
                          <span className="text-xs text-zinc-400">{new Date(lead.created_at).toLocaleDateString('es-CL')}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ADD LEAD MODAL */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAddForm(false)}>
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-zinc-900">Nuevo Lead</h2>
              <button onClick={() => setShowAddForm(false)}><X className="w-5 h-5 text-zinc-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-600 mb-1 block">Nombre</label>
                <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input value={formNombre} onChange={e => setFormNombre(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="Nombre completo" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600 mb-1 block">Email *</label>
                <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input value={formEmail} onChange={e => setFormEmail(e.target.value)} type="email"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="email@ejemplo.com" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600 mb-1 block">Teléfono</label>
                <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input value={formTelefono} onChange={e => setFormTelefono(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="+56 9 1234 5678" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600 mb-1 block">Fuente</label>
                <select value={formFuente} onChange={e => setFormFuente(e.target.value as Fuente)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500">
                  {FUENTES.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600 mb-1 block">Notas</label>
                <textarea value={formNotas} onChange={e => setFormNotas(e.target.value)} rows={2}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" placeholder="Notas iniciales..." />
              </div>
            </div>
            <button onClick={handleAddLead}
              className="mt-4 w-full py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition">
              Agregar Lead
            </button>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {detailLead && (() => {
        const extra = getExtra(detailLead.id);
        const estadoCfg = ESTADOS.find(e => e.key === extra.estado)!;
        return (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDetailLead(null)}>
            <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-zinc-900">{displayName(detailLead)}</h2>
                <button onClick={() => setDetailLead(null)}><X className="w-5 h-5 text-zinc-400" /></button>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-zinc-600"><Mail className="w-4 h-4" />{detailLead.email}</div>
                <div className="flex items-center gap-2 text-sm text-zinc-600"><Calendar className="w-4 h-4" />{new Date(detailLead.created_at).toLocaleString('es-CL')}</div>
                <div className="flex items-center gap-2 text-sm text-zinc-600"><MessageSquare className="w-4 h-4" />Fuente:
                  <select value={extra.fuente} onChange={e => updateExtra(detailLead.id, { fuente: e.target.value as Fuente })}
                    className="text-xs px-2 py-1 rounded-lg border border-zinc-200 capitalize cursor-pointer">
                    {FUENTES.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              {/* Estado */}
              <div className="mb-4">
                <label className="text-xs font-medium text-zinc-600 mb-1.5 block">Estado</label>
                <div className="flex flex-wrap gap-1.5">
                  {ESTADOS.map(s => (
                    <button key={s.key} onClick={() => updateExtra(detailLead.id, { estado: s.key })}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${extra.estado === s.key ? `${s.color} text-white` : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Next action */}
              <div className="mb-4">
                <label className="text-xs font-medium text-zinc-600 mb-1 block">Próxima acción</label>
                <input type="date" value={detailNextAction} onChange={e => { setDetailNextAction(e.target.value); updateExtra(detailLead.id, { next_action: e.target.value }); }}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>

              {/* Notas */}
              <div>
                <label className="text-xs font-medium text-zinc-600 mb-1 block">Notas</label>
                {extra.notas && (
                  <div className="bg-zinc-50 rounded-xl p-3 mb-2 max-h-40 overflow-y-auto">
                    {extra.notas.split('\n').map((line, i) => (
                      <p key={i} className="text-xs text-zinc-600 mb-1">{line}</p>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <textarea value={detailNota} onChange={e => setDetailNota(e.target.value)} rows={2}
                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" placeholder="Agregar nota..." />
                  <button onClick={() => appendNota(detailLead.id)}
                    className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition self-end">
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
