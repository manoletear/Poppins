"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, DollarSign, Building2, AlertTriangle } from "lucide-react";

interface DashboardMetrics {
  total_trabajadoras: number;
  total_contratos: number;
  mrr_total: number;
  costo_empresa_total: number;
  contratos_sin_midt: number;
}

interface ContratoCritico {
  trabajadora_nombre: string;
  cliente_nombre: string;
  fecha_inicio: string;
  estado_midt: string;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [contratos, setContratos] = useState<ContratoCritico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [metricsRes, contratosRes] = await Promise.all([
          supabase.from("v_dashboard_ejecutivo").select("*").single(),
          supabase.from("v_contratos_criticos").select("*"),
        ]);

        if (metricsRes.error) throw metricsRes.error;
        if (contratosRes.error) throw contratosRes.error;

        setMetrics(metricsRes.data);
        setContratos(contratosRes.data || []);
      } catch (err) {
        console.error("Error fetching dashboard:", err);
        setError(err instanceof Error ? err.message : "Error al cargar datos");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-zinc-500">Cargando dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-800 font-medium">Error: {error}</p>
        <p className="text-red-600 text-sm mt-1">Verifica la conexion a Supabase</p>
      </div>
    );
  }

  const cards = [
    {
      title: "Trabajadoras",
      value: metrics?.total_trabajadoras ?? 0,
      icon: Users,
      format: (v: number) => v.toString(),
    },
    {
      title: "Contratos Activos",
      value: metrics?.total_contratos ?? 0,
      icon: FileText,
      format: (v: number) => v.toString(),
    },
    {
      title: "MRR",
      value: metrics?.mrr_total ?? 0,
      icon: DollarSign,
      format: (v: number) =>
        `$${v.toLocaleString("es-CL")}`,
    },
    {
      title: "Costo Empresa",
      value: metrics?.costo_empresa_total ?? 0,
      icon: Building2,
      format: (v: number) =>
        `$${v.toLocaleString("es-CL")}`,
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-900">Dashboard Ejecutivo</h2>

      {/* Alerta compliance */}
      {metrics && metrics.contratos_sin_midt > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 p-4">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-800">Alerta de Compliance</p>
            <p className="text-sm text-red-700">
              {metrics.contratos_sin_midt} contrato(s) pendiente(s) de registro en MiDT.
              Riesgo de multa Inspeccion del Trabajo.
            </p>
          </div>
        </div>
      )}

      {/* Metricas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.format(card.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabla contratos criticos */}
      {contratos.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 mb-3">
            Contratos Criticos
          </h3>
          <div className="overflow-x-auto rounded-lg border border-zinc-200">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">
                    Trabajadora
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">
                    Fecha Inicio
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">
                    Estado MiDT
                  </th>
                </tr>
              </thead>
              <tbody>
                {contratos.map((c, i) => (
                  <tr key={i} className="border-t border-zinc-100">
                    <td className="px-4 py-3">{c.trabajadora_nombre}</td>
                    <td className="px-4 py-3">{c.cliente_nombre}</td>
                    <td className="px-4 py-3">{c.fecha_inicio}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                        {c.estado_midt || "Pendiente"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
