'use client';

import { useState } from 'react';
import {
  MapPin, User, Building2, Zap, Search, Plus, X,
  Home, Droplets, Flame, Wifi, Shield, Loader2, CheckCircle2,
} from 'lucide-react';

type DiscoveryTab = 'direccion' | 'rut' | 'rol' | 'servicios';

interface DiscoveredAccount {
  tipo: string;
  proveedor: string;
  numero_cliente: string;
  monto_estimado: number | null;
  fuente: 'api' | 'manual';
}

interface Props {
  direccion: string | null;
  rut: string | null;
  onAddAccount: (account: DiscoveredAccount) => Promise<void>;
  onClose: () => void;
  existingTypes: string[];
}

const TABS: { key: DiscoveryTab; label: string; icon: typeof MapPin }[] = [
  { key: 'direccion', label: 'Direccion', icon: MapPin },
  { key: 'rut', label: 'RUT / Cliente', icon: User },
  { key: 'rol', label: 'Rol Propiedad', icon: Building2 },
  { key: 'servicios', label: 'Servicios', icon: Zap },
];

const SERVICIOS_DISPONIBLES = [
  { tipo: 'arriendo', label: 'Arriendo', icon: Home, color: 'text-blue-500 bg-blue-50' },
  { tipo: 'gastos_comunes', label: 'Gastos Comunes', icon: Building2, color: 'text-zinc-500 bg-zinc-100' },
  { tipo: 'agua', label: 'Agua', icon: Droplets, color: 'text-cyan-500 bg-cyan-50' },
  { tipo: 'luz', label: 'Electricidad', icon: Zap, color: 'text-yellow-500 bg-yellow-50' },
  { tipo: 'gas', label: 'Gas', icon: Flame, color: 'text-orange-500 bg-orange-50' },
  { tipo: 'internet', label: 'Internet / TV', icon: Wifi, color: 'text-indigo-500 bg-indigo-50' },
  { tipo: 'sueldo_empleado', label: 'Sueldo Empleado', icon: User, color: 'text-rose-500 bg-rose-50' },
  { tipo: 'leyes_sociales', label: 'Leyes Sociales', icon: Shield, color: 'text-violet-500 bg-violet-50' },
];

export default function AccountDiscovery({ direccion, rut, onAddAccount, onClose, existingTypes }: Props) {
  const [activeTab, setActiveTab] = useState<DiscoveryTab>('servicios');
  const [searchQuery, setSearchQuery] = useState('');
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set(existingTypes));

  const handleQuickAdd = async (tipo: string) => {
    const servicio = SERVICIOS_DISPONIBLES.find(s => s.tipo === tipo);
    if (!servicio) return;

    setAdding(tipo);
    try {
      await onAddAccount({
        tipo,
        proveedor: '',
        numero_cliente: '',
        monto_estimado: null,
        fuente: 'manual',
      });
      setAdded(prev => new Set([...prev, tipo]));
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h3 className="text-lg font-semibold text-zinc-900">Agregar Cuentas de Pago</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-zinc-100 transition-colors">
            <X className="h-5 w-5 text-zinc-400" />
          </button>
        </div>

        <div className="flex border-b border-zinc-200 px-6">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === tab.key
                    ? 'border-violet-600 text-violet-600'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="px-6 py-5">
          {activeTab === 'servicios' && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-500">
                Selecciona los servicios que deseas pagar con Poppins.
                Luego podras configurar el detalle de cada uno.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {SERVICIOS_DISPONIBLES.map(servicio => {
                  const Icon = servicio.icon;
                  const isAdded = added.has(servicio.tipo);
                  const isAdding = adding === servicio.tipo;

                  return (
                    <button
                      key={servicio.tipo}
                      onClick={() => !isAdded && handleQuickAdd(servicio.tipo)}
                      disabled={isAdded || isAdding}
                      className={`rounded-xl border-2 p-4 text-left transition-all ${
                        isAdded
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-zinc-200 hover:border-violet-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${servicio.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        {isAdded ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : isAdding ? (
                          <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
                        ) : (
                          <Plus className="h-5 w-5 text-zinc-400" />
                        )}
                      </div>
                      <p className="text-sm font-medium text-zinc-900 mt-3">{servicio.label}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {isAdded ? 'Agregado' : 'Toca para agregar'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'direccion' && (
            <div className="space-y-4">
              <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-4">
                <p className="text-sm font-medium text-zinc-900 mb-1">Tu direccion registrada</p>
                <p className="text-sm text-zinc-600">{direccion || 'No has registrado tu direccion aun'}</p>
              </div>
              <p className="text-sm text-zinc-500">
                Buscar cuentas asociadas a tu direccion estara disponible pronto.
                Por ahora, agrega tus cuentas desde la pestana Servicios.
              </p>
            </div>
          )}

          {activeTab === 'rut' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  RUT o numero de cliente
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={rut || 'Ingresa un RUT o numero de cliente'}
                    className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <button className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors flex items-center gap-1">
                    <Search className="h-4 w-4" />
                    Buscar
                  </button>
                </div>
              </div>
              <p className="text-sm text-zinc-500">
                La busqueda por RUT/cliente estara disponible cuando se integren proveedores con API.
              </p>
            </div>
          )}

          {activeTab === 'rol' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Rol de la propiedad (SII)
                </label>
                <input
                  type="text"
                  placeholder="Ej: 1234-56"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <p className="text-sm text-zinc-500">
                Con el rol de la propiedad podemos buscar contribuciones, deudas municipales y servicios asociados.
                Esta funcion estara disponible pronto.
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-zinc-100">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
          >
            {added.size > existingTypes.length ? `Listo (${added.size - existingTypes.length} agregadas)` : 'Cerrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
