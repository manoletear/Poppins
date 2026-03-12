"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Liquidacion {
  trabajadora_nombre: string;
  periodo: string;
  sueldo_bruto: number;
  total_descuentos: number;
  sueldo_liquido: number;
  estado: string;
}

export default function LiquidacionesPage() {
  const [data, setData] = useState<Liquidacion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data: rows, error } = await supabase
        .from("v_liquidaciones_pendientes")
        .select("*");
      if (!error && rows) setData(rows as Liquidacion[]);
      setLoading(false);
    }
    fetch();
  }, []);

  if (loading) {
    return <p className="text-zinc-500">Cargando liquidaciones...</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-zinc-900">Liquidaciones Pendientes</h2>
      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Trabajadora</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Periodo</th>
              <th className="px-4 py-3 text-right font-medium text-zinc-600">Bruto</th>
              <th className="px-4 py-3 text-right font-medium text-zinc-600">Descuentos</th>
              <th className="px-4 py-3 text-right font-medium text-zinc-600">Liquido</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Estado</th>
            </tr>
          </thead>
          <tbody>
            {data.map((l, i) => (
              <tr key={i} className="border-t border-zinc-100">
                <td className="px-4 py-3 font-medium">{l.trabajadora_nombre}</td>
                <td className="px-4 py-3">{l.periodo}</td>
                <td className="px-4 py-3 text-right">
                  ${l.sueldo_bruto?.toLocaleString("es-CL") ?? "-"}
                </td>
                <td className="px-4 py-3 text-right">
                  ${l.total_descuentos?.toLocaleString("es-CL") ?? "-"}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  ${l.sueldo_liquido?.toLocaleString("es-CL") ?? "-"}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                    {l.estado || "Pendiente"}
                  </span>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                  Sin liquidaciones pendientes
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
