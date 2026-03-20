'use client';

import Link from 'next/link';
import { Users, DollarSign, Clock, Calendar, UserPlus, LogOut, Clock3 } from 'lucide-react';
import { useEmployees, usePayroll, useAbsences } from '@/hooks/useBuk';

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  bgColor: string;
}

function KpiCard({ label, value, sub, icon, bgColor }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bgColor}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

function StatusBadge({ estado }: { estado: string }) {
  const colors: Record<string, string> = {
    activo: 'bg-emerald-100 text-emerald-700',
    inactivo: 'bg-gray-100 text-gray-500',
    licencia: 'bg-amber-100 text-amber-700',
    pendiente: 'bg-yellow-100 text-yellow-700',
    aprobada: 'bg-emerald-100 text-emerald-700',
    rechazada: 'bg-red-100 text-red-600',
  };
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${colors[estado] || 'bg-gray-100 text-gray-500'}`}>
      {estado}
    </span>
  );
}

function CostDistributionBar({ payroll }: { payroll: any[] }) {
  const totalHaberes = payroll.reduce((sum, p) => sum + (p.haberes || 0), 0);
  const totalDescuentos = payroll.reduce((sum, p) => sum + (p.descuentos || 0), 0);
  const totalLiquido = payroll.reduce((sum, p) => sum + (p.liquido || 0), 0);

  const total = totalHaberes + totalDescuentos;
  const pctHaberes = total > 0 ? (totalHaberes / total * 100) : 0;
  const pctDescuentos = total > 0 ? (totalDescuentos / total * 100) : 0;

  const fmt = (n: number) => '$' + n.toLocaleString('es-CL');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 h-6 rounded-full overflow-hidden bg-gray-100">
        <div className="h-full bg-emerald-500" style={{ width: `${pctHaberes}%` }}></div>
        <div className="h-full bg-red-500" style={{ width: `${pctDescuentos}%` }}></div>
      </div>
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="font-medium text-gray-600">Haberes</span>
          </div>
          <div className="font-bold text-gray-900">{fmt(totalHaberes)}</div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="font-medium text-gray-600">Descuentos</span>
          </div>
          <div className="font-bold text-gray-900">{fmt(totalDescuentos)}</div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="font-medium text-gray-600">Líquido</span>
          </div>
          <div className="font-bold text-gray-900">{fmt(totalLiquido)}</div>
        </div>
      </div>
    </div>
  );
}

function EmployeeStatusBreakdown({ employees }: { employees: any[] }) {
  const activos = employees.filter(e => e.estado === 'activo').length;
  const inactivos = employees.filter(e => e.estado === 'inactivo').length;
  const licencia = employees.filter(e => e.estado === 'licencia').length;
  const total = employees.length;

  const statuses = [
    { label: 'Activos', count: activos, color: 'bg-emerald-500', textColor: 'text-emerald-600' },
    { label: 'Inactivos', count: inactivos, color: 'bg-gray-400', textColor: 'text-gray-600' },
    { label: 'En Licencia', count: licencia, color: 'bg-amber-500', textColor: 'text-amber-600' },
  ];

  return (
    <div className="flex items-center justify-center gap-8">
      {statuses.map(status => (
        <div key={status.label} className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-2">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#f3f4f6" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={`${(status.count / total) * 282.7} 282.7`}
                className={status.textColor}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-bold text-lg text-gray-900">{status.count}</span>
            </div>
          </div>
          <span className="text-xs font-medium text-gray-600">{status.label}</span>
        </div>
      ))}
    </div>
  );
}

function QuickActionCard({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-3 p-4 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-[#F0197A]/30 transition-all group"
    >
      <div className="w-10 h-10 rounded-lg bg-[#F0197A]/10 flex items-center justify-center group-hover:bg-[#F0197A]/20 transition-colors">
        <Icon className="w-5 h-5 text-[#F0197A]" />
      </div>
      <span className="text-sm font-medium text-gray-700 text-center">{label}</span>
    </Link>
  );
}

export default function DashboardPage() {
  const { data: employees, loading: loadingEmp } = useEmployees();
  const { data: payroll, loading: loadingPay } = usePayroll();
  const { data: absences, loading: loadingAbs } = useAbsences();

  const activos = employees.filter(e => e.estado === 'activo').length;
  const costoMensual = payroll.reduce((sum, l) => sum + l.liquido, 0);
  const solicitudesPendientes = absences.filter(a => a.estado === 'pendiente').length;

  const fmt = (n: number) => '$' + n.toLocaleString('es-CL');
  const now = new Date();
  const lastUpdate = now.toLocaleString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="space-y-6 pb-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Users className="w-5 h-5 text-white" />}
          label="Colaboradoras"
          value={loadingEmp ? '...' : employees.length}
          sub={`${activos} activas`}
          bgColor="bg-emerald-500"
        />
        <KpiCard
          icon={<DollarSign className="w-5 h-5 text-white" />}
          label="Costo Mensual"
          value={loadingPay ? '...' : fmt(costoMensual)}
          sub="Líquido total"
          bgColor="bg-blue-500"
        />
        <KpiCard
          icon={<Clock className="w-5 h-5 text-white" />}
          label="Solicitudes Pendientes"
          value={loadingAbs ? '...' : solicitudesPendientes}
          bgColor="bg-amber-500"
        />
        <KpiCard
          icon={<Calendar className="w-5 h-5 text-white" />}
          label="Período"
          value="Mar 2026"
          sub="En curso"
          bgColor="bg-[#1B1564]"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <QuickActionCard href="/dashboard/colaboradoras/nuevo" icon={UserPlus} label="Nueva Colaboradora" />
          <QuickActionCard href="/dashboard/vacaciones/nueva" icon={LogOut} label="Solicitar Vacaciones" />
          <QuickActionCard href="/dashboard/horas-extra" icon={Clock3} label="Registrar Horas Extra" />
        </div>
      </div>

      {/* Cost Distribution and Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Cost Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Distribución de Costos</h2>
          {loadingPay ? (
            <div className="text-sm text-gray-400">Cargando...</div>
          ) : (
            <CostDistributionBar payroll={payroll} />
          )}
        </div>

        {/* Employee Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Estado de Colaboradoras</h2>
          {loadingEmp ? (
            <div className="text-sm text-gray-400">Cargando...</div>
          ) : (
            <EmployeeStatusBreakdown employees={employees} />
          )}
        </div>
      </div>

      {/* Quick tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Employees summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">Colaboradoras</span>
            <a href="/dashboard/colaboradoras" className="text-xs text-[#F0197A] font-medium hover:underline">Ver todas →</a>
          </div>
          {loadingEmp ? (
            <div className="p-5 text-sm text-gray-400">Cargando...</div>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {employees.slice(0, 5).map(emp => (
                  <tr key={emp.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: emp.color }}>
                          {emp.iniciales}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">{emp.nombreCompleto}</div>
                          <div className="text-xs text-gray-400">{emp.cargo}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <StatusBadge estado={emp.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent absences */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">Solicitudes Recientes</span>
            <a href="/dashboard/vacaciones" className="text-xs text-[#F0197A] font-medium hover:underline">Ver todas →</a>
          </div>
          {loadingAbs ? (
            <div className="p-5 text-sm text-gray-400">Cargando...</div>
          ) : absences.length === 0 ? (
            <div className="p-5 text-sm text-gray-400">Sin solicitudes</div>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {absences.slice(0, 5).map(abs => (
                  <tr key={abs.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-5 py-2.5">
                      <div className="font-medium text-gray-800">{abs.tipo}</div>
                      <div className="text-xs text-gray-400">{abs.inicio} → {abs.fin} · {abs.dias}d</div>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <StatusBadge estado={abs.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Last Update */}
      <div className="text-right">
        <p className="text-xs text-gray-400">Última actualización: {lastUpdate}</p>
      </div>
    </div>
  );
}
