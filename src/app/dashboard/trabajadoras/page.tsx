"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Trabajadora {
  id: number;
  nombre: string;
  rut: string;
  email: string;
  telefono: string;
  fecha_ingreso: string;
}

export default function TrabajadorasPage() {
  const [data, setData] = useState<Trabajadora[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data: rows, error } = await supabase
        .from("trabajadores")
        .select("*")
        .order("nombre");
      if (!error && rows) setData(rows as Trabajadora[]);
      setLoading(false);
    }
    fetch();
  }, []);

  if (loading) {
    return <p className="text-zinc-500">Cargando trabajadoras...</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-zinc-900">Trabajadoras</h2>
      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Nombre</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">RUT</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Email</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Telefono</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Ingreso</th>
            </tr>
          </thead>
          <tbody>
            {data.map((t) => (
              <tr key={t.id} className="border-t border-zinc-100">
                <td className="px-4 py-3 font-medium">{t.nombre}</td>
                <td className="px-4 py-3">{t.rut}</td>
                <td className="px-4 py-3">{t.email}</td>
                <td className="px-4 py-3">{t.telefono}</td>
                <td className="px-4 py-3">{t.fecha_ingreso}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                  Sin trabajadoras registradas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
