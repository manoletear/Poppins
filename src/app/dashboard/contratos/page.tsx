"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Contrato {
  trabajadora_nombre: string;
  cliente_nombre: string;
  fecha_inicio: string;
  fecha_termino: string;
  estado_midt: string;
  sueldo_base: number;
}

export default function ContratosPage() {
  const [data, setData] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data: rows, error } = await supabase
        .from("v_contratos_criticos")
        .select("*");
      if (!error && rows) setData(rows as Contrato[]);
      setLoading(false);
    }
    fetch();
  }, []);

  if (loading) {
    return <p className="text-zinc-500">Cargando contratos...</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-zinc-900">Contratos</h2>
      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Trabajadora</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Cliente</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Inicio</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Termino</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Estado MiDT</th>
              <th className="px-4 py-3 text-right font-medium text-zinc-600">Sueldo Base</th>
            </tr>
          </thead>
          <tbody>
            {data.map((c, i) => (
              <tr key={i} className="border-t border-zinc-100">
                <td className="px-4 py-3 font-medium">{c.trabajadora_nombre}</td>
                <td className="px-4 py-3">{c.cliente_nombre}</td>
                <td className="px-4 py-3">{c.fecha_inicio}</td>
                <td className="px-4 py-3">{c.fecha_termino || "-"}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                    {c.estado_midt || "Pendiente"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  ${c.sueldo_base?.toLocaleString("es-CL") ?? "-"}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                  Sin contratos criticos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
