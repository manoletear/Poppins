'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import {
  Loader2, Plus, Search, Filter, MoreHorizontal, User, Mail, Phone,
  Calendar, MessageSquare, ChevronDown, X, Users, TrendingUp, LayoutGrid,
  Table2, List, Building2, DollarSign, Award, Flame, Thermometer, Activity,
  PhoneCall, Send, Video, FileText, Clock, CheckCircle2, AlertCircle,
  Hash, Target, ArrowUpRight, Zap, BarChart3
} from 'lucide-react';

// ── Tipos ──
interface Lead {
  id: string;
  nombre: string | null;
  apellido: string | null;
  email: string;
  telefono: string | null;
  empresa: string | null;
  fuente: Fuente;
  estado: Estado;
  notas: string | null;
  next_action: string | null;
  valor_estimado: number | null;
  temperatura: Temperatura;
  score: number;
  cargo_interes: string | null;
  num_trabajadores: number;
  plan_interes: string | null;
  ultimo_contacto: string | null;
  created_at: string;
  updated_at: string;
}

interface Actividad {
  id: string;
  lead_id: string | null;
  deal_id: string | null;
  tipo: TipoActividad;
  descripcion: string | null;
  resultado: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  duracion_min: number | null;
  created_at: string;
}

interface Deal {
  id: string;
  titulo: string;
  lead_id: string | null;
  etapa_id: string;
  valor_mensual: number;
  plan_tipo: string | null;
  probabilidad: number;
  num_trabajadores: number;
  fecha_cierre_esperada: string | null;
  motivo_perdida: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
  etapa?: PipelineEtapa;
}

interface PipelineEtapa {
  id: string;
  nombre: string;
  orden: number;
  color: string;
  es_ganado: boolean;
  es_perdido: boolean;
}

type Estado = 'nuevo' | 'contactado' | 'demo_agendada' | 'propuesta_enviada' | 'cerrado_ganado' | 'cerrado_perdido';
type Fuente = 'formulario' | 'whatsapp' | 'email' | 'referido' | 'sitio_web' | 'instagram' | 'linkedin' | 'google_ads' | 'evento';
type Temperatura = 'frio' | 'tibio' | 'caliente';
type TipoActividad = 'llamada' | 'email' | 'whatsapp' | 'reunion' | 'demo' | 'nota' | 'seguimiento';
type ViewMode = 'kanban' | 'tabla' | 'lista';
type Tab = 'leads' | 'deals' | 'actividades';

// ── Constantes ──
const ESTADOS: { key: Estado; label: string; color: string; bg: string }[] = [
  { key: 'nuevo', label: 'Nuevo', color: 'bg-slate-500', bg: 'bg-slate-50' },
  { key: 'contactado', label: 'Contactado', color: 'bg-blue-500', bg: 'bg-blue-50' },
  { key: 'demo_agendada', label: 'Demo Agendada', color: 'bg-violet-500', bg: 'bg-violet-50' },
  { key: 'propuesta_enviada', label: 'Propuesta Enviada', color: 'bg-amber-500', bg: 'bg-amber-50' },
  { key: 'cerrado_ganado', label: 'Cerrado Ganado', color: 'bg-emerald-500', bg: 'bg-emerald-50' },
  { key: 'cerrado_perdido', label: 'Cerrado Perdido', color: 'bg-red-500', bg: 'bg-red-50' },
];

const FUENTES: { key: Fuente; label: string }[] = [
  { key: 'formulario', label: 'Formulario' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'email', label: 'Email' },
  { key: 'referido', label: 'Referido' },
  { key: 'sitio_web', label: 'Sitio Web' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'google_ads', label: 'Google Ads' },
  { key: 'evento', label: 'Evento' },
];

const TEMPERATURAS: { key: Temperatura; label: string; color: string; icon: typeof Flame }[] = [
  { key: 'frio', label: 'Frío', color: 'text-blue-500 bg-blue-50', icon: Thermometer },
  { key: 'tibio', label: 'Tibio', color: 'text-amber-500 bg-amber-50', icon: Thermometer },
  { key: 'caliente', label: 'Caliente', color: 'text-red-500 bg-red-50', icon: Flame },
];

const TIPOS_ACTIVIDAD: { key: TipoActividad; label: string; icon: typeof PhoneCall }[] = [
  { key: 'llamada', label: 'Llamada', icon: PhoneCall },
  { key: 'email', label: 'Email', icon: Send },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { key: 'reunion', label: 'Reunión', icon: Users },
  { key: 'demo', label: 'Demo', icon: Video },
  { key: 'nota', label: 'Nota', icon: FileText },
  { key: 'seguimiento', label: 'Seguimiento', icon: Clock },
];

const PLANES = [
  { key: 'free', label: 'Free', precio: 0 },
  { key: 'starter', label: 'Starter', precio: 19990 },
  { key: 'premium', label: 'Premium', precio: 39990 },
  { key: 'enterprise', label: 'Enterprise', precio: 79990 },
];

const RESULTADOS = ['conectado', 'no_contesta', 'interesado', 'rechazado', 'reagendar'];

// ── Scoring ──
function calcularScore(lead: Lead, actividades: Actividad[]): number {
  let score = 0;
  // Temperatura
  if (lead.temperatura === 'caliente') score += 35;
  else if (lead.temperatura === 'tibio') score += 20;
  else score += 5;
  // Completitud datos
  if (lead.email) score += 5;
  if (lead.telefono) score += 10;
  if (lead.empresa) score += 5;
  if (lead.cargo_interes) score += 5;
  // Plan interés (mayor plan = más valioso)
  if (lead.plan_interes === 'enterprise') score += 15;
  else if (lead.plan_interes === 'premium') score += 10;
  else if (lead.plan_interes === 'starter') score += 5;
  // Num trabajadores
  if (lead.num_trabajadores >= 3) score += 10;
  else if (lead.num_trabajadores >= 2) score += 5;
  // Actividad reciente
  const leadActs = actividades.filter(a => a.lead_id === lead.id);
  score += Math.min(leadActs.length * 3, 15);
  // Recencia
  const lastContact = lead.ultimo_contacto || lead.updated_at;
  const daysSince = (Date.now() - new Date(lastContact).getTime()) / 86400000;
  if (daysSince > 30) score -= 15;
  else if (daysSince > 14) score -= 5;
  return Math.max(0, Math.min(100, score));
}

function getScoreColor(score: number) {
  if (score >= 70) return 'text-emerald-600 bg-emerald-50';
  if (score >= 40) return 'text-amber-600 bg-amber-50';
  return 'text-zinc-500 bg-zinc-100';
}

// ── Helpers ──
const displayName = (l: Lead) => `${l.nombre || l.email.split('@')[0]} ${l.apellido || ''}`.trim();
const formatCLP = (v: number) => v.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });
const formatDate = (d: string) => new Date(d).toLocaleDateString('es-CL');
const formatDateTime = (d: string) => new Date(d).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });

export default function CRMPage() {
  const { profile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [etapas, setEtapas] = useState<PipelineEtapa[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('leads');
  const [search, setSearch] = useState('');
  const [filterFuente, setFilterFuente] = useState('');
  const [filterTemp, setFilterTemp] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [showAddActividad, setShowAddActividad] = useState(false);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'actividades' | 'deals'>('info');
  const [sortCol, setSortCol] = useState<string>('score');
  const [sortAsc, setSortAsc] = useState(false);

  // Form states - Lead
  const [formNombre, setFormNombre] = useState('');
  const [formApellido, setFormApellido] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formEmpresa, setFormEmpresa] = useState('');
  const [formFuente, setFormFuente] = useState<Fuente>('formulario');
  const [formNotas, setFormNotas] = useState('');
  const [formTemp, setFormTemp] = useState<Temperatura>('frio');
  const [formCargoInteres, setFormCargoInteres] = useState('');
  const [formNumTrab, setFormNumTrab] = useState('1');
  const [formPlanInteres, setFormPlanInteres] = useState('');

  // Form states - Actividad
  const [actTipo, setActTipo] = useState<TipoActividad>('llamada');
  const [actDescripcion, setActDescripcion] = useState('');
  const [actResultado, setActResultado] = useState('');
  const [actScheduled, setActScheduled] = useState('');
  const [actLeadId, setActLeadId] = useState('');

  // Form states - Deal
  const [dealTitulo, setDealTitulo] = useState('');
  const [dealLeadId, setDealLeadId] = useState('');
  const [dealEtapaId, setDealEtapaId] = useState('');
  const [dealPlan, setDealPlan] = useState('');
  const [dealNumTrab, setDealNumTrab] = useState('1');
  const [dealFechaCierre, setDealFechaCierre] = useState('');
  const [dealProb, setDealProb] = useState('50');

  // Detail modal states
  const [detailNota, setDetailNota] = useState('');
  const [detailNextAction, setDetailNextAction] = useState('');
  const [detailValor, setDetailValor] = useState('');

  // ── Data Loading ──
  useEffect(() => {
    if (profile?.rol !== 'admin') return;
    async function load() {
      const supabase = createClient();
      const [leadsRes, actRes, dealsRes, etapasRes] = await Promise.all([
        supabase.from('leads').select('*').order('created_at', { ascending: false }),
        supabase.from('crm_actividades').select('*').order('created_at', { ascending: false }),
        supabase.from('crm_deals').select('*, etapa:crm_pipeline_etapas(*)').order('created_at', { ascending: false }),
        supabase.from('crm_pipeline_etapas').select('*').order('orden', { ascending: true }),
      ]);
      setLeads(leadsRes.data || []);
      setActividades(actRes.data || []);
      setDeals((dealsRes.data || []).map((d: any) => ({ ...d, etapa: d.etapa })));
      setEtapas(etapasRes.data || []);
      setLoading(false);
    }
    load();
  }, [profile]);

  // ── CRUD ──
  const updateLead = useCallback(async (id: string, patch: Partial<Lead>) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...patch, updated_at: new Date().toISOString() } : l));
    if (detailLead?.id === id) {
      setDetailLead(prev => prev ? { ...prev, ...patch, updated_at: new Date().toISOString() } : prev);
    }
    const supabase = createClient();
    await supabase.from('leads').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
  }, [detailLead]);

  const handleAddLead = async () => {
    if (!formEmail) return;
    const supabase = createClient();
    const newLead = {
      email: formEmail,
      nombre: formNombre || null,
      apellido: formApellido || null,
      telefono: formTelefono || null,
      empresa: formEmpresa || null,
      fuente: formFuente,
      estado: 'nuevo' as Estado,
      temperatura: formTemp,
      cargo_interes: formCargoInteres || null,
      num_trabajadores: parseInt(formNumTrab) || 1,
      plan_interes: formPlanInteres || null,
      notas: formNotas ? `[${new Date().toLocaleString('es-CL')}] ${formNotas}` : null,
    };
    const { data } = await supabase.from('leads').insert(newLead).select('*').single();
    if (data) setLeads(prev => [data, ...prev]);
    setFormNombre(''); setFormApellido(''); setFormEmail(''); setFormTelefono('');
    setFormEmpresa(''); setFormFuente('formulario'); setFormNotas(''); setFormTemp('frio');
    setFormCargoInteres(''); setFormNumTrab('1'); setFormPlanInteres('');
    setShowAddForm(false);
  };

  const handleAddActividad = async () => {
    if (!actTipo) return;
    const leadId = actLeadId || detailLead?.id;
    const supabase = createClient();
    const newAct = {
      lead_id: leadId || null,
      tipo: actTipo,
      descripcion: actDescripcion || null,
      resultado: actResultado || null,
      scheduled_at: actScheduled || null,
      completed_at: actScheduled ? null : new Date().toISOString(),
    };
    const { data } = await supabase.from('crm_actividades').insert(newAct).select('*').single();
    if (data) {
      setActividades(prev => [data, ...prev]);
      // Actualizar ultimo_contacto del lead
      if (leadId) {
        await updateLead(leadId, { ultimo_contacto: new Date().toISOString() });
      }
    }
    setActTipo('llamada'); setActDescripcion(''); setActResultado(''); setActScheduled(''); setActLeadId('');
    setShowAddActividad(false);
  };

  const handleAddDeal = async () => {
    if (!dealTitulo || !dealEtapaId) return;
    const plan = PLANES.find(p => p.key === dealPlan);
    const supabase = createClient();
    const newDeal = {
      titulo: dealTitulo,
      lead_id: dealLeadId || null,
      etapa_id: dealEtapaId,
      plan_tipo: dealPlan || null,
      valor_mensual: plan?.precio || 0,
      num_trabajadores: parseInt(dealNumTrab) || 1,
      probabilidad: parseInt(dealProb) || 50,
      fecha_cierre_esperada: dealFechaCierre || null,
    };
    const { data } = await supabase.from('crm_deals').insert(newDeal).select('*, etapa:crm_pipeline_etapas(*)').single();
    if (data) setDeals(prev => [{ ...data, etapa: (data as any).etapa }, ...prev]);
    setDealTitulo(''); setDealLeadId(''); setDealEtapaId(''); setDealPlan('');
    setDealNumTrab('1'); setDealFechaCierre(''); setDealProb('50');
    setShowAddDeal(false);
  };

  const moveDeal = async (dealId: string, newEtapaId: string) => {
    const etapa = etapas.find(e => e.id === newEtapaId);
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, etapa_id: newEtapaId, etapa: etapa || d.etapa, updated_at: new Date().toISOString() } : d));
    const supabase = createClient();
    await supabase.from('crm_deals').update({ etapa_id: newEtapaId, updated_at: new Date().toISOString() }).eq('id', dealId);
  };

  const completeActividad = async (actId: string) => {
    setActividades(prev => prev.map(a => a.id === actId ? { ...a, completed_at: new Date().toISOString() } : a));
    const supabase = createClient();
    await supabase.from('crm_actividades').update({ completed_at: new Date().toISOString() }).eq('id', actId);
  };

  const appendNota = async (id: string) => {
    if (!detailNota.trim()) return;
    const lead = leads.find(l => l.id === id);
    if (!lead) return;
    const entry = `[${new Date().toLocaleString('es-CL')}] ${detailNota.trim()}`;
    const newNotas = lead.notas ? `${lead.notas}\n${entry}` : entry;
    await updateLead(id, { notas: newNotas });
    setDetailNota('');
  };

  const recalcularScores = async () => {
    const supabase = createClient();
    for (const lead of leads) {
      const newScore = calcularScore(lead, actividades);
      if (newScore !== lead.score) {
        await supabase.from('leads').update({ score: newScore }).eq('id', lead.id);
      }
    }
    setLeads(prev => prev.map(l => ({ ...l, score: calcularScore(l, actividades) })));
  };

  // ── Filtering & Sorting ──
  const filtered = useMemo(() => {
    return leads.filter(l => {
      const s = search.toLowerCase();
      const matchSearch = !search || (l.nombre?.toLowerCase().includes(s) ?? false) ||
        (l.apellido?.toLowerCase().includes(s) ?? false) || l.email.toLowerCase().includes(s) ||
        (l.empresa?.toLowerCase().includes(s) ?? false);
      const matchFuente = !filterFuente || l.fuente === filterFuente;
      const matchTemp = !filterTemp || l.temperatura === filterTemp;
      return matchSearch && matchFuente && matchTemp;
    });
  }, [leads, search, filterFuente, filterTemp]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortCol === 'score') return sortAsc ? a.score - b.score : b.score - a.score;
      if (sortCol === 'valor_estimado') return sortAsc ? (a.valor_estimado || 0) - (b.valor_estimado || 0) : (b.valor_estimado || 0) - (a.valor_estimado || 0);
      let va: string, vb: string;
      if (sortCol === 'nombre') { va = a.nombre || ''; vb = b.nombre || ''; }
      else if (sortCol === 'email') { va = a.email; vb = b.email; }
      else if (sortCol === 'estado') { va = a.estado; vb = b.estado; }
      else if (sortCol === 'temperatura') { va = a.temperatura; vb = b.temperatura; }
      else { va = a.created_at; vb = b.created_at; }
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }, [filtered, sortCol, sortAsc]);

  // ── Stats ──
  const stats = useMemo(() => {
    const total = leads.length;
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeek = leads.filter(l => new Date(l.created_at) >= weekAgo).length;
    const ganados = leads.filter(l => l.estado === 'cerrado_ganado').length;
    const rate = total > 0 ? ((ganados / total) * 100).toFixed(1) : '0';
    const calientes = leads.filter(l => l.temperatura === 'caliente').length;
    const valorTotal = leads.reduce((sum, l) => sum + (l.valor_estimado || 0), 0);
    const mrrDeals = deals.filter(d => d.etapa?.es_ganado).reduce((sum, d) => sum + d.valor_mensual, 0);
    const pendingFollowups = actividades.filter(a => a.scheduled_at && !a.completed_at && new Date(a.scheduled_at) <= new Date()).length;
    const avgScore = total > 0 ? Math.round(leads.reduce((s, l) => s + l.score, 0) / total) : 0;
    return { total, thisWeek, rate, ganados, calientes, valorTotal, mrrDeals, pendingFollowups, avgScore };
  }, [leads, deals, actividades]);

  // ── Guard ──
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
  const leadActividades = (leadId: string) => actividades.filter(a => a.lead_id === leadId);
  const leadDeals = (leadId: string) => deals.filter(d => d.lead_id === leadId);

  const TempBadge = ({ temp }: { temp: Temperatura }) => {
    const cfg = TEMPERATURAS.find(t => t.key === temp)!;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg.color}`}>
        <Icon className="w-3 h-3" />{cfg.label}
      </span>
    );
  };

  const ScoreBadge = ({ score }: { score: number }) => (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${getScoreColor(score)}`}>
      <Zap className="w-3 h-3" />{score}
    </span>
  );

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">CRM Poppins</h1>
            <p className="text-sm text-zinc-500">Pipeline de ventas, seguimiento y oportunidades</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={recalcularScores}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 transition"
              title="Recalcular scores">
              <Zap className="w-4 h-4" />Scoring
            </button>
            <button onClick={() => { setShowAddActividad(true); setActLeadId(''); }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 transition">
              <Activity className="w-4 h-4" />Actividad
            </button>
            <button onClick={() => setShowAddDeal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition">
              <Target className="w-4 h-4" />Deal
            </button>
            <button onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition">
              <Plus className="w-4 h-4" />Nuevo Lead
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          {[
            { label: 'Total Leads', value: stats.total, icon: <Users className="w-4 h-4" />, c: 'bg-violet-500' },
            { label: 'Esta semana', value: stats.thisWeek, icon: <Calendar className="w-4 h-4" />, c: 'bg-blue-500' },
            { label: 'Calientes', value: stats.calientes, icon: <Flame className="w-4 h-4" />, c: 'bg-red-500' },
            { label: 'Score prom.', value: stats.avgScore, icon: <Zap className="w-4 h-4" />, c: 'bg-amber-500' },
            { label: 'Conversión', value: `${stats.rate}%`, icon: <TrendingUp className="w-4 h-4" />, c: 'bg-emerald-500' },
            { label: 'Pipeline', value: formatCLP(stats.valorTotal), icon: <DollarSign className="w-4 h-4" />, c: 'bg-amber-600' },
            { label: 'MRR Ganado', value: formatCLP(stats.mrrDeals), icon: <Award className="w-4 h-4" />, c: 'bg-emerald-600' },
            { label: 'Seguimientos', value: stats.pendingFollowups, icon: <AlertCircle className="w-4 h-4" />, c: stats.pendingFollowups > 0 ? 'bg-red-500' : 'bg-zinc-400' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-zinc-200 bg-white p-3 flex items-center gap-3">
              <div className={`w-8 h-8 ${s.c} rounded-lg flex items-center justify-center text-white shrink-0`}>{s.icon}</div>
              <div className="min-w-0"><p className="text-sm font-bold text-zinc-900 truncate">{s.value}</p><p className="text-[10px] text-zinc-500 truncate">{s.label}</p></div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-4 border-b border-zinc-200">
          {([
            { key: 'leads' as Tab, label: 'Leads', icon: Users, count: leads.length },
            { key: 'deals' as Tab, label: 'Deals', icon: Target, count: deals.length },
            { key: 'actividades' as Tab, label: 'Actividades', icon: Activity, count: actividades.length },
          ]).map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
                activeTab === t.key ? 'border-violet-600 text-violet-600' : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}>
              <t.icon className="w-4 h-4" />{t.label}
              <span className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded-full">{t.count}</span>
            </button>
          ))}
        </div>

        {/* ══════════════ TAB: LEADS ══════════════ */}
        {activeTab === 'leads' && (
          <>
            {/* Filters + View Mode */}
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input type="text" placeholder="Buscar por nombre, email o empresa..." value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <select value={filterFuente} onChange={e => setFilterFuente(e.target.value)}
                className="px-3 py-2 text-sm rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="">Todas las fuentes</option>
                {FUENTES.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
              <select value={filterTemp} onChange={e => setFilterTemp(e.target.value)}
                className="px-3 py-2 text-sm rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="">Todas las temperaturas</option>
                {TEMPERATURAS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
              <div className="flex rounded-xl border border-zinc-200 bg-white overflow-hidden">
                {([['kanban', LayoutGrid], ['tabla', Table2], ['lista', List]] as [ViewMode, typeof LayoutGrid][]).map(([mode, Icon]) => (
                  <button key={mode} onClick={() => setViewMode(mode)}
                    className={`px-3 py-2 flex items-center gap-1.5 text-sm transition ${viewMode === mode ? 'bg-violet-600 text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}>
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>

            {/* KANBAN */}
            {viewMode === 'kanban' && (
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
                {ESTADOS.map(col => {
                  const colLeads = filtered.filter(l => l.estado === col.key);
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
                        ) : colLeads.map(lead => (
                          <div key={lead.id} onClick={() => { setDetailLead(lead); setDetailTab('info'); setDetailNextAction(lead.next_action || ''); setDetailValor(lead.valor_estimado?.toString() || ''); }}
                            className="rounded-xl border border-zinc-100 p-3 hover:border-violet-300 hover:shadow-sm transition cursor-pointer group">
                            <div className="flex items-start justify-between mb-1">
                              <p className="text-sm font-medium text-zinc-900 leading-tight">{displayName(lead)}</p>
                              <ScoreBadge score={lead.score} />
                            </div>
                            <p className="text-[11px] text-zinc-500 truncate">{lead.email}</p>
                            {lead.empresa && <p className="text-[10px] text-zinc-400 truncate">{lead.empresa}</p>}
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              <TempBadge temp={lead.temperatura} />
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600 capitalize">{FUENTES.find(f => f.key === lead.fuente)?.label || lead.fuente}</span>
                              {lead.plan_interes && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600">{lead.plan_interes}</span>}
                            </div>
                            {leadActividades(lead.id).length > 0 && (
                              <div className="flex items-center gap-1 mt-1.5 text-[10px] text-zinc-400">
                                <Activity className="w-3 h-3" />{leadActividades(lead.id).length} actividades
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TABLE */}
            {viewMode === 'tabla' && (
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-100">
                        {[['score', 'Score'], ['nombre', 'Nombre'], ['email', 'Email'], ['empresa', 'Empresa'], ['temperatura', 'Temp.'], ['fuente', 'Fuente'], ['estado', 'Estado'], ['created_at', 'Fecha']].map(([key, label]) => (
                          <th key={key} onClick={() => toggleSort(key)}
                            className="text-left px-3 py-3 font-medium text-zinc-600 cursor-pointer hover:text-zinc-900 select-none text-xs">
                            <span className="flex items-center gap-1">{label}
                              {sortCol === key && <ChevronDown className={`w-3 h-3 transition ${sortAsc ? 'rotate-180' : ''}`} />}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map(lead => {
                        const estadoCfg = ESTADOS.find(e => e.key === lead.estado)!;
                        return (
                          <tr key={lead.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition cursor-pointer"
                            onClick={() => { setDetailLead(lead); setDetailTab('info'); setDetailNextAction(lead.next_action || ''); setDetailValor(lead.valor_estimado?.toString() || ''); }}>
                            <td className="px-3 py-2.5"><ScoreBadge score={lead.score} /></td>
                            <td className="px-3 py-2.5 font-medium text-zinc-900">{displayName(lead)}</td>
                            <td className="px-3 py-2.5 text-zinc-600 truncate max-w-[160px]">{lead.email}</td>
                            <td className="px-3 py-2.5 text-zinc-600">{lead.empresa || '-'}</td>
                            <td className="px-3 py-2.5"><TempBadge temp={lead.temperatura} /></td>
                            <td className="px-3 py-2.5"><span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">{FUENTES.find(f => f.key === lead.fuente)?.label}</span></td>
                            <td className="px-3 py-2.5">
                              <select value={lead.estado} onClick={e => e.stopPropagation()}
                                onChange={e => { e.stopPropagation(); updateLead(lead.id, { estado: e.target.value as Estado }); }}
                                className={`text-xs px-2 py-1 rounded-full border-0 ${estadoCfg.bg} font-medium cursor-pointer focus:ring-2 focus:ring-violet-500`}>
                                {ESTADOS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-2.5 text-zinc-500 text-xs">{formatDate(lead.created_at)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* LIST */}
            {viewMode === 'lista' && (
              <div className="space-y-4">
                {ESTADOS.map(col => {
                  const colLeads = filtered.filter(l => l.estado === col.key);
                  if (colLeads.length === 0) return null;
                  return (
                    <div key={col.key} className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                      <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 ${col.color} rounded-full`} />
                        <span className="font-semibold text-sm text-zinc-900">{col.label}</span>
                        <span className="text-xs text-zinc-400 ml-1">({colLeads.length})</span>
                      </div>
                      <div className="divide-y divide-zinc-50">
                        {colLeads.map(lead => (
                          <div key={lead.id} onClick={() => { setDetailLead(lead); setDetailTab('info'); setDetailNextAction(lead.next_action || ''); setDetailValor(lead.valor_estimado?.toString() || ''); }}
                            className="px-4 py-2.5 flex items-center gap-3 hover:bg-zinc-50 transition cursor-pointer">
                            <ScoreBadge score={lead.score} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-zinc-900 truncate">{displayName(lead)}</p>
                              <p className="text-[11px] text-zinc-500">{lead.email}{lead.empresa ? ` - ${lead.empresa}` : ''}</p>
                            </div>
                            <TempBadge temp={lead.temperatura} />
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">{FUENTES.find(f => f.key === lead.fuente)?.label}</span>
                            {lead.plan_interes && <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-600">{lead.plan_interes}</span>}
                            <span className="text-xs text-zinc-400">{formatDate(lead.created_at)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ══════════════ TAB: DEALS ══════════════ */}
        {activeTab === 'deals' && (
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-7 gap-3">
            {etapas.map(etapa => {
              const etapaDeals = deals.filter(d => d.etapa_id === etapa.id);
              const etapaValor = etapaDeals.reduce((s, d) => s + d.valor_mensual, 0);
              return (
                <div key={etapa.id} className="rounded-xl border border-zinc-200 bg-white min-w-0">
                  <div className="p-3 border-b border-zinc-100">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: etapa.color }} />
                        <span className="font-semibold text-zinc-900 text-xs">{etapa.nombre}</span>
                      </div>
                      <span className="text-[10px] font-medium bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded-full">{etapaDeals.length}</span>
                    </div>
                    {etapaValor > 0 && <p className="text-[10px] text-zinc-500">{formatCLP(etapaValor)}/mes</p>}
                  </div>
                  <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto">
                    {etapaDeals.length === 0 ? (
                      <p className="text-[11px] text-zinc-400 text-center py-6">Sin deals</p>
                    ) : etapaDeals.map(deal => {
                      const leadInfo = leads.find(l => l.id === deal.lead_id);
                      return (
                        <div key={deal.id} className="rounded-xl border border-zinc-100 p-3 hover:border-violet-300 hover:shadow-sm transition">
                          <p className="text-sm font-medium text-zinc-900">{deal.titulo}</p>
                          {leadInfo && <p className="text-[11px] text-zinc-500 truncate">{displayName(leadInfo)}</p>}
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {deal.plan_tipo && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600">{deal.plan_tipo}</span>}
                            <span className="text-[10px] font-medium text-emerald-600">{formatCLP(deal.valor_mensual)}/mes</span>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] text-zinc-400">{deal.probabilidad}% prob.</span>
                            <select value={deal.etapa_id} onChange={e => moveDeal(deal.id, e.target.value)}
                              className="text-[10px] px-1 py-0.5 rounded border border-zinc-200 bg-white cursor-pointer">
                              {etapas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                            </select>
                          </div>
                          {deal.fecha_cierre_esperada && (
                            <p className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />Cierre: {formatDate(deal.fecha_cierre_esperada)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════════ TAB: ACTIVIDADES ══════════════ */}
        {activeTab === 'actividades' && (
          <div className="space-y-3">
            {/* Pending follow-ups alert */}
            {stats.pendingFollowups > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-700">Tienes {stats.pendingFollowups} seguimiento{stats.pendingFollowups > 1 ? 's' : ''} pendiente{stats.pendingFollowups > 1 ? 's' : ''}</p>
                  <p className="text-xs text-red-500">Actividades programadas que no se han completado</p>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-100">
                      <th className="text-left px-4 py-3 font-medium text-zinc-600 text-xs">Estado</th>
                      <th className="text-left px-4 py-3 font-medium text-zinc-600 text-xs">Tipo</th>
                      <th className="text-left px-4 py-3 font-medium text-zinc-600 text-xs">Descripción</th>
                      <th className="text-left px-4 py-3 font-medium text-zinc-600 text-xs">Lead</th>
                      <th className="text-left px-4 py-3 font-medium text-zinc-600 text-xs">Resultado</th>
                      <th className="text-left px-4 py-3 font-medium text-zinc-600 text-xs">Fecha</th>
                      <th className="text-left px-4 py-3 font-medium text-zinc-600 text-xs">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actividades.map(act => {
                      const tipoCfg = TIPOS_ACTIVIDAD.find(t => t.key === act.tipo)!;
                      const TipoIcon = tipoCfg.icon;
                      const leadInfo = leads.find(l => l.id === act.lead_id);
                      const isPending = act.scheduled_at && !act.completed_at;
                      const isOverdue = isPending && new Date(act.scheduled_at!) <= new Date();
                      return (
                        <tr key={act.id} className={`border-b border-zinc-50 hover:bg-zinc-50 transition ${isOverdue ? 'bg-red-50/50' : ''}`}>
                          <td className="px-4 py-2.5">
                            {act.completed_at ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : isOverdue ? (
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-500" />
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center gap-1 text-xs">
                              <TipoIcon className="w-3.5 h-3.5 text-zinc-500" />{tipoCfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-zinc-600 max-w-[250px] truncate">{act.descripcion || '-'}</td>
                          <td className="px-4 py-2.5 text-zinc-600">{leadInfo ? displayName(leadInfo) : '-'}</td>
                          <td className="px-4 py-2.5">
                            {act.resultado && <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 capitalize">{act.resultado.replace('_', ' ')}</span>}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-zinc-500">
                            {act.scheduled_at ? formatDateTime(act.scheduled_at) : formatDateTime(act.created_at)}
                          </td>
                          <td className="px-4 py-2.5">
                            {!act.completed_at && (
                              <button onClick={() => completeActividad(act.id)}
                                className="text-xs text-emerald-600 hover:text-emerald-800 font-medium">Completar</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {actividades.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-400 text-sm">No hay actividades registradas</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════ MODAL: NUEVO LEAD ══════════════ */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAddForm(false)}>
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-zinc-900">Nuevo Lead</h2>
              <button onClick={() => setShowAddForm(false)}><X className="w-5 h-5 text-zinc-400" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-600 mb-1 block">Nombre</label>
                  <input value={formNombre} onChange={e => setFormNombre(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="Nombre" />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600 mb-1 block">Apellido</label>
                  <input value={formApellido} onChange={e => setFormApellido(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="Apellido" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600 mb-1 block">Email *</label>
                <input value={formEmail} onChange={e => setFormEmail(e.target.value)} type="email"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="email@ejemplo.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-600 mb-1 block">Teléfono</label>
                  <input value={formTelefono} onChange={e => setFormTelefono(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="+56 9 1234 5678" />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600 mb-1 block">Empresa / Hogar</label>
                  <input value={formEmpresa} onChange={e => setFormEmpresa(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="Familia Pérez" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-600 mb-1 block">Fuente</label>
                  <select value={formFuente} onChange={e => setFormFuente(e.target.value as Fuente)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500">
                    {FUENTES.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600 mb-1 block">Temperatura</label>
                  <select value={formTemp} onChange={e => setFormTemp(e.target.value as Temperatura)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500">
                    {TEMPERATURAS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600 mb-1 block">Plan interés</label>
                  <select value={formPlanInteres} onChange={e => setFormPlanInteres(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <option value="">Sin definir</option>
                    {PLANES.map(p => <option key={p.key} value={p.key}>{p.label} - {formatCLP(p.precio)}/mes</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-600 mb-1 block">Cargo que busca</label>
                  <select value={formCargoInteres} onChange={e => setFormCargoInteres(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <option value="">Sin definir</option>
                    <option value="asesora_hogar">Asesora del Hogar</option>
                    <option value="jardinero">Jardinero</option>
                    <option value="piscinero">Piscinero</option>
                    <option value="multiple">Múltiples</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600 mb-1 block">N° Trabajadores</label>
                  <input type="number" min="1" value={formNumTrab} onChange={e => setFormNumTrab(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
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

      {/* ══════════════ MODAL: NUEVA ACTIVIDAD ══════════════ */}
      {showAddActividad && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAddActividad(false)}>
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-zinc-900">Nueva Actividad</h2>
              <button onClick={() => setShowAddActividad(false)}><X className="w-5 h-5 text-zinc-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-600 mb-1 block">Lead</label>
                <select value={actLeadId} onChange={e => setActLeadId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="">Sin lead asociado</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{displayName(l)} ({l.email})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-600 mb-1 block">Tipo</label>
                  <select value={actTipo} onChange={e => setActTipo(e.target.value as TipoActividad)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500">
                    {TIPOS_ACTIVIDAD.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600 mb-1 block">Resultado</label>
                  <select value={actResultado} onChange={e => setActResultado(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <option value="">Sin resultado</option>
                    {RESULTADOS.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600 mb-1 block">Descripción</label>
                <textarea value={actDescripcion} onChange={e => setActDescripcion(e.target.value)} rows={2}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" placeholder="Detalles de la interacción..." />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600 mb-1 block">Programar para (opcional)</label>
                <input type="datetime-local" value={actScheduled} onChange={e => setActScheduled(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                <p className="text-[10px] text-zinc-400 mt-1">Dejar vacío para registrar como completada ahora</p>
              </div>
            </div>
            <button onClick={handleAddActividad}
              className="mt-4 w-full py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition">
              {actScheduled ? 'Programar Actividad' : 'Registrar Actividad'}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL: NUEVO DEAL ══════════════ */}
      {showAddDeal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAddDeal(false)}>
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-zinc-900">Nuevo Deal</h2>
              <button onClick={() => setShowAddDeal(false)}><X className="w-5 h-5 text-zinc-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-600 mb-1 block">Título</label>
                <input value={dealTitulo} onChange={e => setDealTitulo(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="Suscripción Familia Pérez" />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600 mb-1 block">Lead asociado</label>
                <select value={dealLeadId} onChange={e => setDealLeadId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="">Sin lead</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{displayName(l)} ({l.email})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-600 mb-1 block">Plan</label>
                  <select value={dealPlan} onChange={e => setDealPlan(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <option value="">Sin definir</option>
                    {PLANES.map(p => <option key={p.key} value={p.key}>{p.label} - {formatCLP(p.precio)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600 mb-1 block">Etapa</label>
                  <select value={dealEtapaId} onChange={e => setDealEtapaId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <option value="">Seleccionar...</option>
                    {etapas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-600 mb-1 block">N° Trabajadores</label>
                  <input type="number" min="1" value={dealNumTrab} onChange={e => setDealNumTrab(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600 mb-1 block">Probabilidad %</label>
                  <input type="number" min="0" max="100" value={dealProb} onChange={e => setDealProb(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600 mb-1 block">Fecha cierre esperada</label>
                <input type="date" value={dealFechaCierre} onChange={e => setDealFechaCierre(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
            </div>
            <button onClick={handleAddDeal} disabled={!dealTitulo || !dealEtapaId}
              className="mt-4 w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
              Crear Deal
            </button>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL: DETALLE LEAD ══════════════ */}
      {detailLead && (() => {
        const estadoCfg = ESTADOS.find(e => e.key === detailLead.estado)!;
        const lActividades = leadActividades(detailLead.id);
        const lDeals = leadDeals(detailLead.id);
        return (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDetailLead(null)}>
            <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-bold text-zinc-900">{displayName(detailLead)}</h2>
                    <ScoreBadge score={detailLead.score} />
                    <TempBadge temp={detailLead.temperatura} />
                  </div>
                  <p className="text-sm text-zinc-500">{detailLead.email}</p>
                </div>
                <button onClick={() => setDetailLead(null)}><X className="w-5 h-5 text-zinc-400" /></button>
              </div>

              {/* Detail tabs */}
              <div className="flex items-center gap-1 mb-4 border-b border-zinc-200">
                {([
                  { key: 'info' as const, label: 'Información' },
                  { key: 'actividades' as const, label: `Actividades (${lActividades.length})` },
                  { key: 'deals' as const, label: `Deals (${lDeals.length})` },
                ]).map(t => (
                  <button key={t.key} onClick={() => setDetailTab(t.key)}
                    className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                      detailTab === t.key ? 'border-violet-600 text-violet-600' : 'border-transparent text-zinc-500 hover:text-zinc-700'
                    }`}>{t.label}</button>
                ))}
              </div>

              {/* TAB: Info */}
              {detailTab === 'info' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {detailLead.telefono && (
                      <div className="flex items-center gap-2 text-zinc-600"><Phone className="w-4 h-4" />{detailLead.telefono}
                        <a href={`https://wa.me/${detailLead.telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                          className="text-emerald-500 hover:text-emerald-700"><ArrowUpRight className="w-3.5 h-3.5" /></a>
                      </div>
                    )}
                    {detailLead.empresa && <div className="flex items-center gap-2 text-zinc-600"><Building2 className="w-4 h-4" />{detailLead.empresa}</div>}
                    <div className="flex items-center gap-2 text-zinc-600"><Calendar className="w-4 h-4" />{formatDateTime(detailLead.created_at)}</div>
                    {detailLead.cargo_interes && <div className="flex items-center gap-2 text-zinc-600"><User className="w-4 h-4" />Busca: {detailLead.cargo_interes.replace('_', ' ')}</div>}
                    <div className="flex items-center gap-2 text-zinc-600"><Hash className="w-4 h-4" />{detailLead.num_trabajadores} trabajador{detailLead.num_trabajadores > 1 ? 'es' : ''}</div>
                    {detailLead.plan_interes && <div className="flex items-center gap-2 text-zinc-600"><BarChart3 className="w-4 h-4" />Plan: {detailLead.plan_interes}</div>}
                  </div>

                  {/* Temperatura */}
                  <div>
                    <label className="text-xs font-medium text-zinc-600 mb-1.5 block">Temperatura</label>
                    <div className="flex gap-2">
                      {TEMPERATURAS.map(t => (
                        <button key={t.key} onClick={() => updateLead(detailLead.id, { temperatura: t.key })}
                          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition ${
                            detailLead.temperatura === t.key ? t.color + ' ring-2 ring-offset-1' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                          }`}>
                          <t.icon className="w-3.5 h-3.5" />{t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Estado */}
                  <div>
                    <label className="text-xs font-medium text-zinc-600 mb-1.5 block">Estado</label>
                    <div className="flex flex-wrap gap-1.5">
                      {ESTADOS.map(s => (
                        <button key={s.key} onClick={() => updateLead(detailLead.id, { estado: s.key })}
                          className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
                            detailLead.estado === s.key ? `${s.color} text-white` : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                          }`}>{s.label}</button>
                      ))}
                    </div>
                  </div>

                  {/* Fuente */}
                  <div>
                    <label className="text-xs font-medium text-zinc-600 mb-1 block">Fuente</label>
                    <select value={detailLead.fuente} onChange={e => updateLead(detailLead.id, { fuente: e.target.value as Fuente })}
                      className="text-sm px-3 py-2 rounded-xl border border-zinc-200 cursor-pointer focus:ring-2 focus:ring-violet-500">
                      {FUENTES.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </select>
                  </div>

                  {/* Valor estimado */}
                  <div>
                    <label className="text-xs font-medium text-zinc-600 mb-1 block">Valor estimado (CLP)</label>
                    <input type="number" value={detailValor} placeholder="0"
                      onChange={e => setDetailValor(e.target.value)}
                      onBlur={() => updateLead(detailLead.id, { valor_estimado: detailValor ? parseInt(detailValor, 10) : null })}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>

                  {/* Next action */}
                  <div>
                    <label className="text-xs font-medium text-zinc-600 mb-1 block">Próxima acción</label>
                    <input type="date" value={detailNextAction}
                      onChange={e => { setDetailNextAction(e.target.value); updateLead(detailLead.id, { next_action: e.target.value || null }); }}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>

                  {/* Notas */}
                  <div>
                    <label className="text-xs font-medium text-zinc-600 mb-1 block">Notas</label>
                    {detailLead.notas && (
                      <div className="bg-zinc-50 rounded-xl p-3 mb-2 max-h-40 overflow-y-auto">
                        {detailLead.notas.split('\n').map((line, i) => (
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

                  {/* Quick add activity */}
                  <div className="pt-3 border-t border-zinc-100">
                    <button onClick={() => { setShowAddActividad(true); setActLeadId(detailLead.id); }}
                      className="w-full py-2 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 text-sm font-medium hover:bg-violet-100 transition flex items-center justify-center gap-2">
                      <Activity className="w-4 h-4" />Registrar Actividad
                    </button>
                  </div>

                  {/* Convertir a Empleador */}
                  {detailLead.estado === 'cerrado_ganado' && (
                    <div className="pt-3 border-t border-zinc-100">
                      <button disabled
                        className="w-full py-2.5 rounded-xl bg-emerald-100 text-emerald-400 text-sm font-medium cursor-not-allowed flex items-center justify-center gap-2">
                        <Award className="w-4 h-4" />Convertir a Empleador (próximamente)
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: Actividades del lead */}
              {detailTab === 'actividades' && (
                <div className="space-y-3">
                  {lActividades.length === 0 ? (
                    <p className="text-sm text-zinc-400 text-center py-8">No hay actividades para este lead</p>
                  ) : lActividades.map(act => {
                    const tipoCfg = TIPOS_ACTIVIDAD.find(t => t.key === act.tipo)!;
                    const TipoIcon = tipoCfg.icon;
                    return (
                      <div key={act.id} className="flex items-start gap-3 p-3 rounded-xl border border-zinc-100 hover:bg-zinc-50 transition">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${act.completed_at ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                          <TipoIcon className={`w-4 h-4 ${act.completed_at ? 'text-emerald-600' : 'text-amber-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-zinc-900">{tipoCfg.label}</span>
                            {act.resultado && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600 capitalize">{act.resultado.replace('_', ' ')}</span>}
                          </div>
                          {act.descripcion && <p className="text-xs text-zinc-600 mt-0.5">{act.descripcion}</p>}
                          <p className="text-[10px] text-zinc-400 mt-1">{formatDateTime(act.scheduled_at || act.created_at)}</p>
                        </div>
                        {!act.completed_at && (
                          <button onClick={() => completeActividad(act.id)}
                            className="text-xs text-emerald-600 hover:text-emerald-800 font-medium shrink-0">Completar</button>
                        )}
                      </div>
                    );
                  })}
                  <button onClick={() => { setShowAddActividad(true); setActLeadId(detailLead.id); }}
                    className="w-full py-2 rounded-xl border border-dashed border-zinc-300 text-zinc-500 text-sm hover:bg-zinc-50 transition flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />Agregar actividad
                  </button>
                </div>
              )}

              {/* TAB: Deals del lead */}
              {detailTab === 'deals' && (
                <div className="space-y-3">
                  {lDeals.length === 0 ? (
                    <p className="text-sm text-zinc-400 text-center py-8">No hay deals para este lead</p>
                  ) : lDeals.map(deal => (
                    <div key={deal.id} className="p-3 rounded-xl border border-zinc-100 hover:bg-zinc-50 transition">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-zinc-900">{deal.titulo}</p>
                        <span className="text-xs font-medium text-emerald-600">{formatCLP(deal.valor_mensual)}/mes</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        {deal.etapa && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: deal.etapa.color }}>
                            {deal.etapa.nombre}
                          </span>
                        )}
                        {deal.plan_tipo && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600">{deal.plan_tipo}</span>}
                        <span className="text-[10px] text-zinc-400">{deal.probabilidad}% prob.</span>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => { setShowAddDeal(true); setDealLeadId(detailLead.id); }}
                    className="w-full py-2 rounded-xl border border-dashed border-zinc-300 text-zinc-500 text-sm hover:bg-zinc-50 transition flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />Crear deal
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
