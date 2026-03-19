"use client";

import { useEffect, useState } from "react";
import { Search, Loader2, FileText } from "lucide-react";
import { getContratos } from "@/lib/supabase-queries";

export default function ContratosPage() {
  const [contratos, setContratos] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    getContratos()
      .then(setContratos)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtrados = contratos.filter((c) => {
    const trab = c.trabajadores as Record<string, unknown> | null;
    const texto = `${trab?.nombre ?? ""} ${trab?.apellido_paterno ?? ""} ${trab?.rut ?? ""}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase());
  });

  const fmt = (n: unknown) => {
    const num = Number(n);
    return isNaN(num) ? "—" : `$${num.toLocaleString("es-CL")}`;
  };

  const fmtFecha = (f: unknown) => {
    if (!f) return "—";
    const d = new Date(String(f));
    return isNaN(d.getTime()) ? String(f) : d.toLocaleDateString("es-CL");
  };

  const isExpiringSoon = (fechaTermino: unknown) => {
    if (!fechaTermino) return false;
    const termino = new Date(String(fechaTermino));
    if (isNaN(termino.getTime())) return false;
    const hoy = new Date();
    const diff = (termino.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Contratos</h2>
          <p className="text-sm text-zinc-500">{contratos.length} contratos registrados</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o RUT..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Colaborador</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Cargo</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Tipo Contrato</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Jornada</th>
              <th className="px-4 py-3 text-right font-medium text-zinc-600">Horas</th>
              <th className="px-4 py-3 text-right font-medium text-zinc-600">Sueldo Base</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Fecha Inicio</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Fecha Termino</th>
              <th className="px-4 py-3 text-center font-medium text-zinc-600">Estado MiDT</th>
              <th className="px-4 py-3 text-center font-medium text-zinc-600">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((c) => {
              const trab = c.trabajadores as Record<string, unknown> | null;
              const expiring = isExpiringSoon(c.fecha_termino);

              return (
                <tr
                  key={String(c.id)}
                  className={`border-t border-zinc-100 transition-colors ${
                    expiring ? "bg-amber-50 hover:bg-amber-100" : "hover:bg-zinc-50"
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900">
                          {String(trab?.nombre ?? "")} {String(trab?.apellido_paterno ?? "")}
                        </p>
                        <p className="text-xs font-mono text-zinc-500">{String(trab?.rut ?? "")}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{String(c.cargo ?? "—")}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.tipo_contrato === "indefinido"
                          ? "bg-green-50 text-green-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {String(c.tipo_contrato ?? "—")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{String(c.jornada ?? "—")}</td>
                  <td className="px-4 py-3 text-right text-zinc-700">{c.horas_semanales != null ? String(c.horas_semanales) : "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-zinc-900">{fmt(c.sueldo_base)}</td>
                  <td className="px-4 py-3 text-zinc-700">{fmtFecha(c.fecha_inicio)}</td>
                  <td className="px-4 py-3 text-zinc-700">{fmtFecha(c.fecha_termino)}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.estado_midt === "registrado"
                          ? "bg-emerald-50 text-emerald-700"
                          : c.estado_midt === "pendiente"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {String(c.estado_midt ?? "pendiente")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.estado === "activo"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {String(c.estado ?? "—")}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-zinc-400">
                  {busqueda ? `Sin resultados para "${busqueda}"` : "Sin contratos registrados"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
