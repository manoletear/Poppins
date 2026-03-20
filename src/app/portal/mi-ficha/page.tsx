'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, Briefcase, Shield, Mail, Phone, MapPin, Calendar, Clock, Send, FileText, Building2 } from 'lucide-react';
// Using any for trabajadores since DB schema has apellido_paterno but types have apellido
type Trabajador = Record<string, any>;

const WORKER_ID = 'c711d829-4a6d-4496-a93b-221b81eb1258';

interface ContratoEmpleador {
  numero_contrato: string;
  empleador_nombre: string;
  empleador_rut: string;
  lugar_trabajo: string;
  tipo_vivienda: string;
  [key: string]: unknown;
}

type TabId = 'resumen' | 'contrato' | 'prevision';

function calcAntiguedad(fechaIngreso: string): string {
  const ingreso = new Date(fechaIngreso);
  const hoy = new Date();
  const diffMs = hoy.getTime() - ingreso.getTime();
  const years = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
  const months = Math.floor((diffMs % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
  if (years > 0) return `${years} año${years > 1 ? 's' : ''} y ${months} mes${months !== 1 ? 'es' : ''}`;
  return `${months} mes${months !== 1 ? 'es' : ''}`;
}

export default function MiFichaPage() {
  const [employee, setEmployee] = useState<Trabajador | null>(null);
  const [contratoInfo, setContratoInfo] = useState<ContratoEmpleador | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('resumen');
  const [showSolicitud, setShowSolicitud] = useState(false);
  const [solicitudMsg, setSolicitudMsg] = useState('');
  const [solicitudSent, setSolicitudSent] = useState(false);

  const fmt = (n: number) => '$' + n.toLocaleString('es-CL');

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const [empResult, contratoResult] = await Promise.all([
        supabase.from('trabajadores').select('*').eq('id', WORKER_ID).single(),
        supabase.from('v_mi_empleador').select('*').eq('trabajador_id', WORKER_ID).single(),
      ]);
      setEmployee(empResult.data);
      setContratoInfo(contratoResult.data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="p-6 text-gray-400">Cargando ficha...</div>;
  }

  if (!employee) {
    return <div className="p-6 text-red-500">No se encontró la ficha del empleado.</div>;
  }

  const initials = `${employee.nombre.charAt(0)}${employee.apellido_paterno.charAt(0)}`.toUpperCase();
  const nombreCompleto = `${employee.nombre} ${employee.apellido_paterno}`;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'contrato', label: 'Contrato' },
    { id: 'prevision', label: 'Prevision' },
  ];

  const handleSolicitud = () => {
    setSolicitudSent(true);
    setTimeout(() => {
      setShowSolicitud(false);
      setSolicitudSent(false);
      setSolicitudMsg('');
    }, 2000);
  };

  const handleDescargarContrato = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head><title>Contrato - ${nombreCompleto}</title>
        <style>body{font-family:Arial,sans-serif;padding:40px;color:#333}h1{font-size:20px;margin-bottom:4px}h2{font-size:16px;color:#666;margin-bottom:24px}.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee}.label{color:#888;font-size:14px}.value{font-weight:600;font-size:14px}</style>
        </head>
        <body>
          <h1>Contrato de Trabajo</h1>
          ${contratoInfo?.numero_contrato ? `<h2 style="color:#059669;font-size:14px;margin-bottom:4px">Ref: ${contratoInfo.numero_contrato}</h2>` : ''}
          <h2>${nombreCompleto}</h2>
          <div class="row"><span class="label">Tipo de Contrato</span><span class="value">${employee.tipo_contrato}</span></div>
          <div class="row"><span class="label">Cargo</span><span class="value">${employee.cargo}</span></div>
          <div class="row"><span class="label">Fecha de Ingreso</span><span class="value">${employee.fecha_ingreso}</span></div>
          <div class="row"><span class="label">Fecha de Termino</span><span class="value">${employee.fecha_termino || 'Indefinido'}</span></div>
          <div class="row"><span class="label">Sueldo Base</span><span class="value">${fmt(employee.sueldo_base)}</span></div>
          <div class="row"><span class="label">Jornada Semanal</span><span class="value">${employee.horario_semanal} hrs</span></div>
          <div class="row"><span class="label">Puertas Adentro</span><span class="value">${employee.puertas_adentro ? 'Si' : 'No'}</span></div>
          <div class="row"><span class="label">AFP</span><span class="value">${employee.afp || '-'}</span></div>
          <div class="row"><span class="label">Salud</span><span class="value">${employee.salud || '-'}</span></div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <h1 className="text-xl font-bold text-gray-900">Mi Ficha</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Panel - Profile Card */}
        <div className="lg:w-80 shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 flex flex-col items-center text-white">
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold mb-3">
                {initials}
              </div>
              <div className="text-xl font-bold">{nombreCompleto}</div>
              <div className="text-emerald-100 text-sm mt-1">{employee.cargo}</div>
              <span className="mt-3 text-[11px] font-semibold px-3 py-1 rounded-full bg-emerald-400/30 text-white">
                {employee.estado === 'activo' ? 'Activa' : employee.estado}
              </span>
              {contratoInfo?.numero_contrato && (
                <span className="mt-2 text-[11px] font-semibold px-3 py-1 rounded-full bg-white/20 text-white flex items-center gap-1.5">
                  <FileText size={12} />
                  Contrato: {contratoInfo.numero_contrato}
                </span>
              )}
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <User size={16} className="text-gray-400 shrink-0" />
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">RUT</div>
                  <div className="font-medium text-gray-800">{employee.rut}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail size={16} className="text-gray-400 shrink-0" />
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Email</div>
                  <div className="font-medium text-gray-800">{employee.email || '-'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone size={16} className="text-gray-400 shrink-0" />
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Telefono</div>
                  <div className="font-medium text-gray-800">{employee.telefono || '-'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin size={16} className="text-gray-400 shrink-0" />
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Direccion</div>
                  <div className="font-medium text-gray-800">{employee.direccion || '-'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar size={16} className="text-gray-400 shrink-0" />
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Fecha Ingreso</div>
                  <div className="font-medium text-gray-800">{employee.fecha_ingreso}</div>
                </div>
              </div>

              <button
                onClick={() => setShowSolicitud(true)}
                className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition"
              >
                <Send size={14} />
                Solicitar Actualizacion
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Tabs */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100">
              <div className="flex gap-1 p-1">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                      activeTab === tab.id
                        ? 'bg-emerald-500 text-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              {/* Resumen Tab */}
              {activeTab === 'resumen' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Briefcase size={18} className="text-emerald-500" />
                    <h3 className="text-lg font-semibold text-gray-900">Resumen Laboral</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Cargo</div>
                      <div className="text-sm font-medium text-gray-900">{employee.cargo}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Tipo Contrato</div>
                      <div className="text-sm font-medium text-gray-900">{employee.tipo_contrato}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Jornada Semanal</div>
                      <div className="text-sm font-medium text-gray-900">{employee.horario_semanal} horas</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Sueldo Base</div>
                      <div className="text-sm font-bold text-emerald-600">{fmt(employee.sueldo_base)}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Fecha Ingreso</div>
                      <div className="text-sm font-medium text-gray-900">{employee.fecha_ingreso}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Antiguedad</div>
                      <div className="text-sm font-medium text-gray-900">{calcAntiguedad(employee.fecha_ingreso)}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Vacaciones Disponibles</div>
                      <div className="text-sm font-medium text-gray-900">{employee.dias_vacaciones_base} dias</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Puertas Adentro</div>
                      <div className="text-sm font-medium text-gray-900">{employee.puertas_adentro ? 'Si' : 'No'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Contrato Tab */}
              {activeTab === 'contrato' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Briefcase size={18} className="text-emerald-500" />
                      <h3 className="text-lg font-semibold text-gray-900">Detalle del Contrato</h3>
                    </div>
                    <button
                      onClick={handleDescargarContrato}
                      className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition"
                    >
                      Descargar Contrato PDF
                    </button>
                  </div>

                  {/* Contract KEY ID */}
                  {contratoInfo?.numero_contrato && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
                      <FileText size={20} className="text-emerald-600 shrink-0" />
                      <div>
                        <div className="text-xs text-emerald-600 font-semibold uppercase">N° Contrato</div>
                        <div className="text-lg font-bold text-emerald-800">{contratoInfo.numero_contrato}</div>
                      </div>
                    </div>
                  )}

                  {/* Employer info from view */}
                  {contratoInfo && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Building2 size={16} className="text-blue-600" />
                        <div className="text-xs text-blue-600 font-semibold uppercase">Informacion del Empleador</div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {contratoInfo.empleador_nombre && (
                          <div>
                            <div className="text-xs text-blue-500">Empleador</div>
                            <div className="text-sm font-medium text-blue-900">{contratoInfo.empleador_nombre}</div>
                          </div>
                        )}
                        {contratoInfo.lugar_trabajo && (
                          <div>
                            <div className="text-xs text-blue-500">Lugar de Trabajo</div>
                            <div className="text-sm font-medium text-blue-900">{contratoInfo.lugar_trabajo}</div>
                          </div>
                        )}
                        {contratoInfo.tipo_vivienda && (
                          <div>
                            <div className="text-xs text-blue-500">Tipo de Vivienda</div>
                            <div className="text-sm font-medium text-blue-900">{contratoInfo.tipo_vivienda}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {[
                      { label: 'Tipo de Contrato', value: employee.tipo_contrato },
                      { label: 'Cargo', value: employee.cargo },
                      { label: 'Fecha de Ingreso', value: employee.fecha_ingreso },
                      { label: 'Fecha de Termino', value: employee.fecha_termino || 'Indefinido' },
                      { label: 'Sueldo Base', value: fmt(employee.sueldo_base) },
                      { label: 'Jornada Semanal', value: `${employee.horario_semanal} horas` },
                      { label: 'Puertas Adentro', value: employee.puertas_adentro ? 'Si' : 'No' },
                      { label: 'Estado', value: employee.estado },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                        <span className="text-sm text-gray-500">{row.label}</span>
                        <span className="text-sm font-medium text-gray-900">{row.value}</span>
                      </div>
                    ))}
                  </div>

                  {employee.notas && (
                    <div className="mt-4 bg-amber-50 rounded-lg p-4">
                      <div className="text-xs text-amber-600 font-semibold uppercase mb-1">Notas</div>
                      <div className="text-sm text-amber-800">{employee.notas}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Prevision Tab */}
              {activeTab === 'prevision' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield size={18} className="text-emerald-500" />
                    <h3 className="text-lg font-semibold text-gray-900">Informacion Previsional</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 font-semibold uppercase mb-1">AFP</div>
                      <div className="text-sm font-medium text-gray-900">{employee.afp || 'No registrada'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Sistema de Salud</div>
                      <div className="text-sm font-medium text-gray-900">{employee.salud || 'No registrada'}</div>
                    </div>
                    {employee.plan_salud_uf && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Plan Salud (UF)</div>
                        <div className="text-sm font-medium text-gray-900">{employee.plan_salud_uf} UF</div>
                      </div>
                    )}
                    {employee.mutual && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Mutual</div>
                        <div className="text-sm font-medium text-gray-900">{employee.mutual}</div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 bg-blue-50 rounded-lg p-4">
                    <div className="text-xs text-blue-600 font-semibold uppercase mb-1">Nota</div>
                    <div className="text-sm text-blue-800">
                      Si necesita actualizar su informacion previsional, por favor utilice el boton &quot;Solicitar Actualizacion&quot; en su perfil.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Solicitar Actualizacion Modal */}
      {showSolicitud && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowSolicitud(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-5 text-white">
              <div className="text-lg font-bold">Solicitar Actualizacion de Datos</div>
              <div className="text-emerald-100 text-sm">Envie una solicitud a su empleador</div>
            </div>
            <div className="p-5 space-y-4">
              {solicitudSent ? (
                <div className="text-center py-4">
                  <div className="text-emerald-500 text-4xl mb-2">&#10003;</div>
                  <div className="font-semibold text-gray-900">Solicitud enviada</div>
                  <div className="text-sm text-gray-500 mt-1">Su empleador recibira la notificacion.</div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Describa los datos que desea actualizar
                    </label>
                    <textarea
                      value={solicitudMsg}
                      onChange={e => setSolicitudMsg(e.target.value)}
                      rows={4}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                      placeholder="Ej: Solicito actualizar mi direccion a..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowSolicitud(false)}
                      className="flex-1 py-2 rounded-lg bg-gray-100 text-sm font-medium text-gray-600 hover:bg-gray-200 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSolicitud}
                      disabled={!solicitudMsg.trim()}
                      className="flex-1 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Enviar Solicitud
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
