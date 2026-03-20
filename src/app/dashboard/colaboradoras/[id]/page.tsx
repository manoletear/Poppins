'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { User, Briefcase, Shield, ArrowLeft } from 'lucide-react';
import type { PoppinsEmployee, PoppinsLiquidacion, PoppinsVacacion } from '@/types/buk';

function StatusBadge({ estado }: { estado: string }) {
  const colors: Record<string, string> = {
    activo: 'bg-emerald-100 text-emerald-700',
    inactivo: 'bg-gray-100 text-gray-500',
    licencia: 'bg-amber-100 text-amber-700',
    pendiente: 'bg-yellow-100 text-yellow-700',
    aprobada: 'bg-emerald-100 text-emerald-700',
    rechazada: 'bg-red-100 text-red-600',
    Pagado: 'bg-emerald-100 text-emerald-700',
    Pendiente: 'bg-yellow-100 text-yellow-700',
  };
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${colors[estado] || 'bg-gray-100 text-gray-500'}`}>
      {estado}
    </span>
  );
}

function LiquidacionDetail({ liq, empName, onClose }: { liq: PoppinsLiquidacion; empName: string; onClose: () => void }) {
  const fmt = (n: number) => '$' + n.toLocaleString('es-CL');
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-[#1B1564] to-[#3730A3] p-5 text-white">
          <div className="text-lg font-bold">{empName}</div>
          <div className="text-white/60 text-sm">Liquidación {liq.periodo}</div>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Haberes</div>
          <div className="space-y-1">
            <div className="flex justify-between"><span className="text-gray-500">Sueldo Base</span><span className="font-medium">{fmt(liq.sueldoBase)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Horas Extra</span><span className="font-medium">{fmt(liq.horasExtra)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Bonos</span><span className="font-medium">{fmt(liq.bonos)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Gratificación</span><span className="font-medium">{fmt(liq.gratificacion)}</span></div>
            <div className="flex justify-between border-t border-gray-100 pt-1 font-semibold"><span>Total Haberes</span><span>{fmt(liq.totalHaberes)}</span></div>
          </div>

          <div className="font-semibold text-gray-700 text-xs uppercase tracking-wide mt-3">Descuentos</div>
          <div className="space-y-1">
            <div className="flex justify-between"><span className="text-gray-500">Salud</span><span className="font-medium text-red-500">-{fmt(liq.descSalud)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">AFP</span><span className="font-medium text-red-500">-{fmt(liq.descAfp)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Cesantía</span><span className="font-medium text-red-500">-{fmt(liq.descCesantia)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Impuesto Único</span><span className="font-medium text-red-500">-{fmt(liq.impuestoUnico)}</span></div>
            <div className="flex justify-between border-t border-gray-100 pt-1 font-semibold"><span>Total Descuentos</span><span className="text-red-500">-{fmt(liq.totalDescuentos)}</span></div>
          </div>

          <div className="flex justify-between border-t-2 border-gray-200 pt-2 text-base font-bold">
            <span>Líquido a Pagar</span>
            <span className="text-emerald-600">{fmt(liq.liquido)}</span>
          </div>

          <button onClick={onClose} className="w-full mt-2 py-2 rounded-lg bg-gray-100 text-sm font-medium text-gray-600 hover:bg-gray-200 transition">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [employee, setEmployee] = useState<PoppinsEmployee | null>(null);
  const [payroll, setPayroll] = useState<PoppinsLiquidacion[]>([]);
  const [absences, setAbsences] = useState<PoppinsVacacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [selectedPayroll, setSelectedPayroll] = useState<PoppinsLiquidacion | null>(null);

  const fmt = (n: number) => '$' + n.toLocaleString('es-CL');

  useEffect(() => {
    if (!id) return;

    // Fetch employee data
    Promise.all([
      fetch(`/api/buk/employees/${id}`)
        .then(r => r.json())
        .then(json => setEmployee(json.data || null))
        .catch(() => {}),

      fetch(`/api/buk/payroll?employeeId=${id}`)
        .then(r => r.json())
        .then(json => setPayroll(json.data || []))
        .catch(() => {}),

      fetch(`/api/buk/absences?employeeId=${id}`)
        .then(r => r.json())
        .then(json => setAbsences(json.data || []))
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="text-gray-400">Cargando...</div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-5">
        <div className="text-red-500">Empleada no encontrada</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1B1564] to-[#3730A3] rounded-xl p-6 text-white">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Volver</span>
        </button>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold" style={{ background: employee.color }}>
            {employee.iniciales}
          </div>
          <div>
            <div className="text-2xl font-bold">{employee.nombreCompleto}</div>
            <div className="text-white/60">{employee.cargo}</div>
            <div className="mt-2">
              <StatusBadge estado={employee.estado} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100">
          <div className="flex gap-1 p-1">
            {[
              { id: 'info', label: 'Información' },
              { id: 'payroll', label: 'Liquidaciones' },
              { id: 'absences', label: 'Vacaciones' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  activeTab === tab.id
                    ? 'bg-[#F0197A] text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Información Tab */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Datos Personales */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <User size={18} className="text-[#F0197A]" />
                  <h3 className="text-lg font-semibold text-gray-900">Datos Personales</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs text-gray-500 font-semibold uppercase mb-1">RUT</div>
                    <div className="text-sm font-medium text-gray-900">{employee.rut}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Email</div>
                    <div className="text-sm font-medium text-gray-900">{employee.email || '—'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Teléfono</div>
                    <div className="text-sm font-medium text-gray-900">{employee.telefono || '—'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Dirección</div>
                    <div className="text-sm font-medium text-gray-900">{employee.direccion || '—'}</div>
                  </div>
                </div>
              </div>

              {/* Datos Laborales */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase size={18} className="text-[#F0197A]" />
                  <h3 className="text-lg font-semibold text-gray-900">Datos Laborales</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Cargo</div>
                    <div className="text-sm font-medium text-gray-900">{employee.cargo}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Contrato</div>
                    <div className="text-sm font-medium text-gray-900">{employee.tipoContrato}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Fecha de Ingreso</div>
                    <div className="text-sm font-medium text-gray-900">{employee.fechaIngreso}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Sueldo Base</div>
                    <div className="text-sm font-bold text-emerald-600">{fmt(employee.sueldoBase)}</div>
                  </div>
                </div>
              </div>

              {/* Previsión */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Shield size={18} className="text-[#F0197A]" />
                  <h3 className="text-lg font-semibold text-gray-900">Previsión</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs text-gray-500 font-semibold uppercase mb-1">AFP</div>
                    <div className="text-sm font-medium text-gray-900">{employee.afp || '—'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Salud</div>
                    <div className="text-sm font-medium text-gray-900">{employee.salud || '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Liquidaciones Tab */}
          {activeTab === 'payroll' && (
            <div>
              {payroll.length === 0 ? (
                <div className="text-center py-8 text-gray-400">Sin liquidaciones</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        <th className="px-4 py-3">Período</th>
                        <th className="px-4 py-3 text-right">Bruto</th>
                        <th className="px-4 py-3 text-right">Descuentos</th>
                        <th className="px-4 py-3 text-right">Líquido</th>
                        <th className="px-4 py-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payroll.map(liq => (
                        <tr
                          key={liq.id}
                          className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition"
                          onClick={() => setSelectedPayroll(liq)}
                        >
                          <td className="px-4 py-3 font-medium">{liq.periodo}</td>
                          <td className="px-4 py-3 text-right">{fmt(liq.sueldoBruto)}</td>
                          <td className="px-4 py-3 text-right text-red-500">-{fmt(liq.totalDescuentos)}</td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600">{fmt(liq.liquido)}</td>
                          <td className="px-4 py-3">
                            <StatusBadge estado={liq.estado} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Vacaciones Tab */}
          {activeTab === 'absences' && (
            <div>
              <div className="flex justify-end mb-4">
                <button className="px-4 py-2 bg-[#F0197A] text-white text-sm font-medium rounded-lg hover:bg-[#d4166c] transition">
                  + Nueva Solicitud
                </button>
              </div>

              {absences.length === 0 ? (
                <div className="text-center py-8 text-gray-400">Sin solicitudes</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3">Inicio</th>
                        <th className="px-4 py-3">Fin</th>
                        <th className="px-4 py-3">Días</th>
                        <th className="px-4 py-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {absences.map(abs => (
                        <tr key={abs.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                          <td className="px-4 py-3 font-medium">{abs.tipo}</td>
                          <td className="px-4 py-3">{abs.inicio}</td>
                          <td className="px-4 py-3">{abs.fin}</td>
                          <td className="px-4 py-3 font-medium">{abs.dias}</td>
                          <td className="px-4 py-3">
                            <StatusBadge estado={abs.estado} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedPayroll && (
        <LiquidacionDetail
          liq={selectedPayroll}
          empName={employee.nombreCompleto}
          onClose={() => setSelectedPayroll(null)}
        />
      )}
    </div>
  );
}
