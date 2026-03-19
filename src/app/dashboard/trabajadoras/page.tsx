"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, UserCircle, Loader2 } from "lucide-react";
import { getEmpleados } from "@/lib/supabase-queries";

export default function TrabajadorasPage() {
  const [empleados, setEmpleados] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    getEmpleados()
      .then(setEmpleados)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtrados = empleados.filter((e) => {
    const texto = `${e.primer_nombre} ${e.apellido_paterno} ${e.rut} ${e.cargo}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase());
  });

  const fmt = (n: unknown) => {
    const num = Number(n);
    return isNaN(num) ? "—" : `$${num.toLocaleString("es-CL")}`;
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
          <h2 className="text-2xl font-bold text-zinc-900">Colaboradores</h2>
          <p className="text-sm text-zinc-500">{empleados.length} colaboradores activos</p>
        </div>
        <Link
          href="/dashboard/trabajadoras/nuevo"
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo Colaborador
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, RUT o cargo..."
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
              <th className="px-4 py-3 text-left font-medium text-zinc-600">RUT</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Cargo</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Contrato</th>
              <th className="px-4 py-3 text-right font-medium text-zinc-600">Sueldo Base</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">AFP</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Salud</th>
              <th className="px-4 py-3 text-center font-medium text-zinc-600">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((e) => (
              <tr key={String(e.id)} className="border-t border-zinc-100 hover:bg-zinc-50 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/trabajadoras/${e.id}`} className="flex items-center gap-3 group">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 group-hover:bg-zinc-200">
                      <UserCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900 group-hover:text-zinc-700">
                        {String(e.primer_nombre)} {String(e.apellido_paterno)} {String(e.apellido_materno ?? "")}
                      </p>
                      <p className="text-xs text-zinc-500">{String(e.email ?? "")}</p>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-zinc-600">{String(e.rut)}</td>
                <td className="px-4 py-3 text-zinc-700">{String(e.cargo ?? "—")}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    e.tipo_contrato === "indefinido"
                      ? "bg-green-50 text-green-700"
                      : "bg-amber-50 text-amber-700"
                  }`}>
                    {String(e.tipo_contrato ?? "—")}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium text-zinc-900">{fmt(e.sueldo_base)}</td>
                <td className="px-4 py-3 text-zinc-600">{String(e.afp_nombre ?? "—")}</td>
                <td className="px-4 py-3 text-zinc-600">{String(e.salud_nombre ?? "—")}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    e.estado === "activo" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                  }`}>
                    {String(e.estado ?? "—")}
                  </span>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-400">
                  {busqueda ? `Sin resultados para "${busqueda}"` : "Sin colaboradores registrados"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
