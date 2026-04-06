'use client';

import { useEffect, useState, useCallback } from 'react';
import { Pencil, Home, TreePine, Waves, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';

interface Vivienda {
  id: string;
  empleador_id: string;
  tipo: 'casa' | 'departamento' | 'parcela';
  direccion: string;
  comuna: string;
  metros_construidos: number | null;
  metros_terreno: number | null;
  pisos: number | null;
  dormitorios: number | null;
  banos: number | null;
  tiene_piscina: boolean;
  tiene_jardin: boolean;
  metros_jardin: number | null;
  tiene_terraza: boolean;
  tiene_quincho: boolean;
  tiene_patio_interior: boolean;
  metros_patio: number | null;
  estacionamientos: number | null;
  notas: string | null;
}

const tipoLabels: Record<string, string> = {
  casa: 'Casa',
  departamento: 'Departamento',
  parcela: 'Parcela',
};

export default function ViviendaPage() {
  const { profile, loading: authLoading } = useAuth();
  const empleadorId = profile?.empleador_id || '';
  const [vivienda, setVivienda] = useState<Vivienda | null>(null);
  const [empleadosPorCargo, setEmpleadosPorCargo] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Vivienda>>({});

  const fetchVivienda = useCallback(async () => {
    if (!empleadorId) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('viviendas_empleador')
        .select('*')
        .eq('empleador_id', empleadorId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setVivienda(data as Vivienda | null);

      // Cargar empleados por cargo para tooltips
      const { data: contratos } = await supabase.from('contratos')
        .select('cargo, trabajadores(nombre, apellido_paterno)')
        .eq('empleador_id', empleadorId).eq('estado', 'activo');
      const porCargo: Record<string, string[]> = {};
      (contratos || []).forEach((c: any) => {
        const cargo = (c.cargo || '').toLowerCase();
        const nombre = c.trabajadores ? `${c.trabajadores.nombre} ${c.trabajadores.apellido_paterno || ''}`.trim() : '';
        if (!nombre) return;
        const keys = cargo.includes('jardin') ? ['jardinero'] : cargo.includes('piscin') ? ['piscinero'] : ['empleada', 'asesora'];
        keys.forEach(k => { if (!porCargo[k]) porCargo[k] = []; porCargo[k].push(nombre); });
      });
      setEmpleadosPorCargo(porCargo);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar datos de vivienda';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [empleadorId]);

  useEffect(() => {
    if (authLoading) return;
    if (!empleadorId) { setLoading(false); return; }
    fetchVivienda();
  }, [fetchVivienda, authLoading, empleadorId]);

  const openModal = () => {
    if (vivienda) {
      setForm({ ...vivienda });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm({});
  };

  const handleSave = async () => {
    if (!vivienda) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { id, empleador_id, ...updateData } = form as Vivienda;
      const { error: updateError } = await supabase
        .from('viviendas_empleador')
        .update(updateData)
        .eq('id', vivienda.id);

      if (updateError) throw updateError;
      closeModal();
      await fetchVivienda();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar';
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  const updateForm = (field: keyof Vivienda, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          <p className="text-sm text-zinc-500">Cargando datos de vivienda...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !vivienda) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-red-400" />
          <p className="text-sm text-zinc-700">{error || 'No se encontraron datos de vivienda'}</p>
          <button
            onClick={fetchVivienda}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Superficie construida', value: vivienda.metros_construidos ? `${vivienda.metros_construidos} m²` : '—' },
    { label: 'Terreno total', value: vivienda.metros_terreno ? `${vivienda.metros_terreno} m²` : '—' },
    { label: 'Pisos', value: vivienda.pisos?.toString() ?? '—' },
    { label: 'Dormitorios', value: vivienda.dormitorios?.toString() ?? '—' },
    { label: 'Baños', value: vivienda.banos?.toString() ?? '—' },
    { label: 'Estacionamientos', value: vivienda.estacionamientos?.toString() ?? '—' },
  ];

  const features = [
    { name: 'Piscina', has: vivienda.tiene_piscina },
    {
      name: vivienda.tiene_jardin && vivienda.metros_jardin
        ? `Jardín (${vivienda.metros_jardin} m²)`
        : 'Jardín',
      has: vivienda.tiene_jardin,
    },
    { name: 'Terraza', has: vivienda.tiene_terraza },
    { name: 'Quincho', has: vivienda.tiene_quincho },
    {
      name: vivienda.tiene_patio_interior && vivienda.metros_patio
        ? `Patio Interior (${vivienda.metros_patio} m²)`
        : 'Patio Interior',
      has: vivienda.tiene_patio_interior,
    },
  ];

  const services: {
    title: string;
    icon: typeof Home;
    color: string;
    bgColor: string;
    lines: string[];
    cargoKey: string;
  }[] = [
    {
      title: 'Empleada Doméstica',
      icon: Home,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      lines: [
        vivienda.metros_construidos ? `${vivienda.metros_construidos}m² requieren limpieza diaria` : 'Limpieza diaria',
        `${vivienda.dormitorios ?? 0} dormitorios, ${vivienda.banos ?? 0} baños`,
        'Recomendado: Jornada completa',
      ],
      cargoKey: 'asesora',
    },
  ];

  if (vivienda.tiene_jardin) {
    const jardinArea = vivienda.metros_jardin ? `${vivienda.metros_jardin}m² de jardín` : 'Jardín';
    const patioExtra = vivienda.tiene_patio_interior && vivienda.metros_patio ? ` + ${vivienda.metros_patio}m² patio` : '';
    services.push({
      title: 'Jardinero',
      icon: TreePine,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      lines: [
        `${jardinArea}${patioExtra}`,
        'Mantención semanal recomendada',
        'Incluye poda y riego',
      ],
      cargoKey: 'jardinero',
    });
  }

  if (vivienda.tiene_piscina) {
    services.push({
      title: 'Piscinero',
      icon: Waves,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      lines: [
        'Piscina activa',
        'Mantención 2 veces por semana',
        'Control pH, cloro, limpieza filtros',
      ],
      cargoKey: 'piscinero',
    });
  }

  const tipoLabel = tipoLabels[vivienda.tipo] || vivienda.tipo;
  const heading = `${tipoLabel} en ${vivienda.comuna}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Mi Vivienda</h1>
          <p className="text-sm text-zinc-500">Detalles de tu propiedad</p>
        </div>
        <button
          onClick={openModal}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          <Pencil className="h-4 w-4" />
          Editar
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Info Card */}
        <div className="lg:col-span-2 rounded-xl border bg-white p-6">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-lg font-semibold text-zinc-900">{heading}</h2>
            <span className="rounded-full bg-blue-100 px-3 py-0.5 text-xs font-medium text-blue-700">
              {tipoLabel}
            </span>
          </div>
          <p className="text-sm text-zinc-500">{vivienda.direccion}, {vivienda.comuna}</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-lg bg-zinc-50 p-4 text-center">
                <p className="text-xs text-zinc-500">{stat.label}</p>
                <p className="mt-1 text-lg font-semibold text-zinc-900">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Features Card */}
        <div className="rounded-xl border bg-white p-6">
          <h3 className="text-base font-semibold text-zinc-900 mb-4">Características</h3>
          <div className="space-y-0">
            {features.map((feature) => (
              <div
                key={feature.name}
                className="flex items-center gap-3 py-2.5 border-b border-zinc-50"
              >
                {feature.has ? (
                  <Check className="h-5 w-5 text-emerald-500 shrink-0" />
                ) : (
                  <X className="h-5 w-5 text-zinc-300 shrink-0" />
                )}
                <span className={`text-sm ${feature.has ? 'text-zinc-700' : 'text-zinc-400'}`}>
                  {feature.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Service Implications Card */}
        <div className="lg:col-span-3 rounded-xl border bg-white p-6">
          <h3 className="text-base font-semibold text-zinc-900 mb-4">
            Servicios Requeridos según Vivienda
          </h3>
          <div className={`grid grid-cols-1 sm:grid-cols-${services.length} gap-4`}>
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.title}
                  className="rounded-xl border border-dashed p-4 relative group cursor-pointer hover:border-zinc-400 transition"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`rounded-lg ${service.bgColor} p-2`}>
                      <Icon className={`h-5 w-5 ${service.color}`} />
                    </div>
                    <h4 className="text-sm font-semibold text-zinc-900">{service.title}</h4>
                  </div>
                  <ul className="space-y-1.5">
                    {service.lines.map((line) => (
                      <li key={line} className="text-xs text-zinc-500">
                        {line}
                      </li>
                    ))}
                  </ul>
                  {/* Tooltip con empleados asignados */}
                  {empleadosPorCargo[service.cargoKey] && empleadosPorCargo[service.cargoKey].length > 0 && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                      <div className="bg-zinc-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                        {empleadosPorCargo[service.cargoKey].map((n, i) => (
                          <div key={i}>{n}</div>
                        ))}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 rotate-45 -mt-1" />
                      </div>
                    </div>
                  )}
                  {empleadosPorCargo[service.cargoKey] && (
                    <p className="text-[10px] text-violet-600 mt-2 font-medium">{empleadosPorCargo[service.cargoKey].length} asignado{empleadosPorCargo[service.cargoKey].length > 1 ? 's' : ''}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
            <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-xl">
              <h2 className="text-lg font-semibold text-zinc-900">Editar Vivienda</h2>
            </div>

            <div className="px-6 py-4 space-y-5">
              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Tipo</label>
                <select
                  value={(form.tipo as string) || ''}
                  onChange={(e) => updateForm('tipo', e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                >
                  <option value="casa">Casa</option>
                  <option value="departamento">Departamento</option>
                  <option value="parcela">Parcela</option>
                </select>
              </div>

              {/* Dirección */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Dirección</label>
                <input
                  type="text"
                  value={(form.direccion as string) || ''}
                  onChange={(e) => updateForm('direccion', e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                />
              </div>

              {/* Comuna */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Comuna</label>
                <input
                  type="text"
                  value={(form.comuna as string) || ''}
                  onChange={(e) => updateForm('comuna', e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                />
              </div>

              {/* Number fields grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Metros construidos</label>
                  <input
                    type="number"
                    value={form.metros_construidos ?? ''}
                    onChange={(e) => updateForm('metros_construidos', e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Metros terreno</label>
                  <input
                    type="number"
                    value={form.metros_terreno ?? ''}
                    onChange={(e) => updateForm('metros_terreno', e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Pisos</label>
                  <input
                    type="number"
                    value={form.pisos ?? ''}
                    onChange={(e) => updateForm('pisos', e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Dormitorios</label>
                  <input
                    type="number"
                    value={form.dormitorios ?? ''}
                    onChange={(e) => updateForm('dormitorios', e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Baños</label>
                  <input
                    type="number"
                    value={form.banos ?? ''}
                    onChange={(e) => updateForm('banos', e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Estacionamientos</label>
                  <input
                    type="number"
                    value={form.estacionamientos ?? ''}
                    onChange={(e) => updateForm('estacionamientos', e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Características</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={!!form.tiene_piscina}
                      onChange={(e) => updateForm('tiene_piscina', e.target.checked)}
                      className="rounded border-zinc-300"
                    />
                    Piscina
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={!!form.tiene_jardin}
                      onChange={(e) => updateForm('tiene_jardin', e.target.checked)}
                      className="rounded border-zinc-300"
                    />
                    Jardín
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={!!form.tiene_terraza}
                      onChange={(e) => updateForm('tiene_terraza', e.target.checked)}
                      className="rounded border-zinc-300"
                    />
                    Terraza
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={!!form.tiene_quincho}
                      onChange={(e) => updateForm('tiene_quincho', e.target.checked)}
                      className="rounded border-zinc-300"
                    />
                    Quincho
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={!!form.tiene_patio_interior}
                      onChange={(e) => updateForm('tiene_patio_interior', e.target.checked)}
                      className="rounded border-zinc-300"
                    />
                    Patio Interior
                  </label>
                </div>
              </div>

              {/* Conditional: Metros jardín */}
              {form.tiene_jardin && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Metros jardín</label>
                  <input
                    type="number"
                    value={form.metros_jardin ?? ''}
                    onChange={(e) => updateForm('metros_jardin', e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  />
                </div>
              )}

              {/* Conditional: Metros patio */}
              {form.tiene_patio_interior && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Metros patio</label>
                  <input
                    type="number"
                    value={form.metros_patio ?? ''}
                    onChange={(e) => updateForm('metros_patio', e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  />
                </div>
              )}

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Notas</label>
                <textarea
                  value={(form.notas as string) || ''}
                  onChange={(e) => updateForm('notas', e.target.value || null)}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 rounded-b-xl flex justify-end gap-3">
              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
