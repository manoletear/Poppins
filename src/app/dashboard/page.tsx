"use client";

import { useEffect, useState } from "react";
import { Users, FileText, DollarSign, AlertTriangle, Clock, Receipt, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboard } from "@/lib/supabase-queries";

function getFormattedDate(): string {
  const now = new Date();
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  const dayName = days[now.getDay()];
  const day = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  return `${dayName} ${day} de ${month}, ${year}`;
}

export default function DashboardPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (v: unknown) => {
    const num = Number(v);
    if (isNaN(num) || num === 0) return "$0";
    return `$${num.toLocaleString("es-CL")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  const metrics = [
    { label: "Colaboradores Activos", value: String(data?.total_trabajadores ?? 0), icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Contratos Activos", value: String(data?.contratos_activos ?? 0), icon: FileText, color: "text-green-600 bg-green-50" },
    { label: "Total Sueldos Base", value: fmt(data?.total_sueldos_base), icon: DollarSign, color: "text-emerald-600 bg-emerald-50" },
    { label: "Líquido del Mes", value: fmt(data?.total_liquido_mes), icon: Receipt, color: "text-violet-600 bg-violet-50" },
  ];

  const alerts = [
    { label: "Contratos por vencer (30 días)", value: Number(data?.contratos_por_vencer ?? 0), icon: Clock, color: "text-amber-600" },
    { label: "Contratos sin registro MiDT", value: Number(data?.contratos_sin_midt ?? 0), icon: AlertTriangle, color: "text-red-600" },
    { label: "Liquidaciones pendientes", value: Number(data?.liquidaciones_pendientes ?? 0), icon: Receipt, color: "text-orange-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900">Dashboard</h2>
        <p className="text-sm text-zinc-500">{getFormattedDate()}</p>
        <p className="text-sm text-zinc-400 mt-0.5">Resumen ejecutivo del mes</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500">{m.label}</p>
                  <p className="text-2xl font-bold text-zinc-900 mt-1">{m.value}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${m.color}`}>
                  <m.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {alerts.some((a) => a.value > 0) && (
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Alertas de Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="space-y-3">
              {alerts.filter((a) => a.value > 0).map((a) => (
                <div key={a.label} className="flex items-center gap-3 rounded-lg border border-zinc-100 p-3">
                  <a.icon className={`h-5 w-5 shrink-0 ${a.color}`} />
                  <span className="text-sm text-zinc-700 flex-1">{a.label}</span>
                  <span className={`text-lg font-bold ${a.color}`}>{a.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
