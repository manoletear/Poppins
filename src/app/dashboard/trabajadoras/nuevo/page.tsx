"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createTrabajador, createContrato, getInstituciones } from "@/lib/supabase-queries";
import { createClient } from "@/lib/supabase/client";

const ESTADOS_CIVILES = ["Soltero", "Casado", "Divorciado", "Viudo", "Conviviente Civil"];
const REGIONES = ["Arica y Parinacota", "Tarapacá", "Antofagasta", "Atacama", "Coquimbo", "Valparaíso",
  "Región Metropolitana", "O'Higgins", "Maule", "Ñuble", "Biobío", "Araucanía", "Los Ríos", "Los Lagos", "Aysén", "Magallanes"];
const BANCOS = ["Banco de Chile", "BancoEstado", "Banco Santander", "Banco BCI", "Banco Itaú", "Scotiabank",
  "Banco Falabella", "Banco Security", "Banco BICE"];
const TIPOS_CUENTA = ["Corriente", "Vista", "Ahorro", "CuentaRUT"];

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-zinc-700">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, type = "text", placeholder, required }: {
  value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean;
}) {
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
    className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400" />;
}

function SelectStr({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400">
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function SelectObj({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400">
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export default function NuevoColaboradorPage() {
  const router = useRouter();
  const supabase = createClient();
  const [instituciones, setInstituciones] = useState<Record<string, unknown>[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    rut: "", nombre: "", segundo_nombre: "", apellido_paterno: "", apellido_materno: "",
    fecha_nacimiento: "", sexo: "M", estado_civil: "Soltero", nacionalidad: "Chilena",
    email: "", telefono: "",
    direccion: "", comuna: "", ciudad: "", region: "Región Metropolitana",
    banco: "BancoEstado", tipo_cuenta: "CuentaRUT", numero_cuenta: "",
    afp_id: "", salud_id: "", salud_tipo: "fonasa", plan_salud_uf: "",
    cargo: "", area: "", centro_costo: "", tipo_gratificacion: "art_50",
    // Contrato
    tipo_contrato: "indefinido", tipo_jornada: "completa", horas_semanales: "45",
    sueldo_base: "500000", fecha_inicio: new Date().toISOString().split("T")[0], fecha_termino: "",
  });

  useEffect(() => {
    getInstituciones().then((inst) => {
      setInstituciones(inst);
      const defaultAfp = inst.find((i: any) => i.tipo === "AFP");
      const defaultSalud = inst.find((i: any) => i.tipo === "FONASA");
      if (defaultAfp) setForm((f) => ({ ...f, afp_id: String(defaultAfp.id) }));
      if (defaultSalud) setForm((f) => ({ ...f, salud_id: String(defaultSalud.id) }));
    });
  }, []);

  const update = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const afps = instituciones.filter((i) => i.tipo === "AFP");
  const saluds = instituciones.filter((i) => i.tipo === "ISAPRE" || i.tipo === "FONASA");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      // Obtener cliente_id
      const { data: cliente } = await supabase.from("clientes").select("id").limit(1).single();

      const trabajador = await createTrabajador({
        rut: form.rut,
        nombre: form.nombre,
        segundo_nombre: form.segundo_nombre || null,
        apellido_paterno: form.apellido_paterno,
        apellido_materno: form.apellido_materno || null,
        fecha_nacimiento: form.fecha_nacimiento || null,
        sexo: form.sexo,
        estado_civil: form.estado_civil,
        nacionalidad: form.nacionalidad,
        email: form.email || null,
        telefono: form.telefono || null,
        direccion: form.direccion || null,
        comuna: form.comuna || null,
        ciudad: form.ciudad || null,
        region: form.region || null,
        banco: form.banco || null,
        tipo_cuenta: form.tipo_cuenta || null,
        numero_cuenta: form.numero_cuenta || null,
        afp_id: form.afp_id ? Number(form.afp_id) : null,
        salud_id: form.salud_id ? Number(form.salud_id) : null,
        salud_tipo: form.salud_tipo,
        plan_salud_uf: form.plan_salud_uf ? Number(form.plan_salud_uf) : null,
        cargo: form.cargo || null,
        area: form.area || null,
        centro_costo: form.centro_costo || null,
        tipo_gratificacion: form.tipo_gratificacion,
        cliente_id: cliente?.id ?? null,
        estado: "activo",
      });

      await createContrato({
        trabajador_id: trabajador.id,
        cliente_id: cliente?.id ?? null,
        sueldo_base: Number(form.sueldo_base),
        fecha_inicio: form.fecha_inicio,
        fecha_termino: form.fecha_termino || null,
        tipo_contrato: form.tipo_contrato,
        tipo_jornada: form.tipo_jornada,
        horas_semanales: Number(form.horas_semanales),
        tipo_gratificacion: form.tipo_gratificacion,
        cargo: form.cargo || null,
        area: form.area || null,
        centro_costo: form.centro_costo || null,
        estado: "activo",
      });

      router.push(`/dashboard/trabajadoras/${trabajador.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al crear colaborador";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/trabajadoras" className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 hover:bg-zinc-50">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-zinc-900">Nuevo Colaborador</h2>
          <p className="text-sm text-zinc-500">Completa los datos del nuevo colaborador</p>
        </div>
        <button type="submit" disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Crear Colaborador
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle className="text-base">Datos Personales</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="RUT" required><Input value={form.rut} onChange={(v) => update("rut", v)} placeholder="12.345.678-9" required /></Field>
            <Field label="Sexo" required><SelectStr value={form.sexo} onChange={(v) => update("sexo", v)} options={["M", "F"]} /></Field>
            <Field label="Primer Nombre" required><Input value={form.nombre} onChange={(v) => update("nombre", v)} required /></Field>
            <Field label="Segundo Nombre"><Input value={form.segundo_nombre} onChange={(v) => update("segundo_nombre", v)} /></Field>
            <Field label="Apellido Paterno" required><Input value={form.apellido_paterno} onChange={(v) => update("apellido_paterno", v)} required /></Field>
            <Field label="Apellido Materno"><Input value={form.apellido_materno} onChange={(v) => update("apellido_materno", v)} /></Field>
            <Field label="Fecha Nacimiento"><Input type="date" value={form.fecha_nacimiento} onChange={(v) => update("fecha_nacimiento", v)} /></Field>
            <Field label="Estado Civil"><SelectStr value={form.estado_civil} onChange={(v) => update("estado_civil", v)} options={ESTADOS_CIVILES} /></Field>
          </CardContent>
        </Card>

        <Card><CardHeader><CardTitle className="text-base">Contacto y Dirección</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="Email"><Input type="email" value={form.email} onChange={(v) => update("email", v)} /></Field>
            <Field label="Teléfono"><Input value={form.telefono} onChange={(v) => update("telefono", v)} placeholder="+56 9 1234 5678" /></Field>
            <div className="col-span-2"><Field label="Dirección"><Input value={form.direccion} onChange={(v) => update("direccion", v)} /></Field></div>
            <Field label="Comuna"><Input value={form.comuna} onChange={(v) => update("comuna", v)} /></Field>
            <Field label="Ciudad"><Input value={form.ciudad} onChange={(v) => update("ciudad", v)} /></Field>
            <div className="col-span-2"><Field label="Región"><SelectStr value={form.region} onChange={(v) => update("region", v)} options={REGIONES} /></Field></div>
          </CardContent>
        </Card>

        <Card><CardHeader><CardTitle className="text-base">Contrato</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="Tipo Contrato" required><SelectStr value={form.tipo_contrato} onChange={(v) => update("tipo_contrato", v)} options={["indefinido", "plazo_fijo", "obra_faena"]} /></Field>
            <Field label="Tipo Jornada" required><SelectStr value={form.tipo_jornada} onChange={(v) => update("tipo_jornada", v)} options={["completa", "parcial", "art_22"]} /></Field>
            <Field label="Fecha Inicio" required><Input type="date" value={form.fecha_inicio} onChange={(v) => update("fecha_inicio", v)} required /></Field>
            <Field label="Fecha Término"><Input type="date" value={form.fecha_termino} onChange={(v) => update("fecha_termino", v)} /></Field>
            <Field label="Cargo" required><Input value={form.cargo} onChange={(v) => update("cargo", v)} required /></Field>
            <Field label="Área"><Input value={form.area} onChange={(v) => update("area", v)} /></Field>
            <Field label="Sueldo Base" required><Input type="number" value={form.sueldo_base} onChange={(v) => update("sueldo_base", v)} required /></Field>
            <Field label="Horas Semanales"><Input type="number" value={form.horas_semanales} onChange={(v) => update("horas_semanales", v)} /></Field>
            <Field label="Gratificación"><SelectStr value={form.tipo_gratificacion} onChange={(v) => update("tipo_gratificacion", v)} options={["art_50", "art_47"]} /></Field>
            <Field label="Centro de Costo"><Input value={form.centro_costo} onChange={(v) => update("centro_costo", v)} /></Field>
          </CardContent>
        </Card>

        <Card><CardHeader><CardTitle className="text-base">Previsión y Banco</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="AFP" required>
              <SelectObj value={form.afp_id} onChange={(v) => update("afp_id", v)}
                options={afps.map((a) => ({ value: String(a.id), label: String(a.nombre) }))} placeholder="Seleccionar AFP" />
            </Field>
            <Field label="Sistema de Salud" required>
              <SelectStr value={form.salud_tipo} onChange={(v) => {
                update("salud_tipo", v);
                if (v === "fonasa") {
                  const fonasa = instituciones.find((i) => i.tipo === "FONASA");
                  if (fonasa) update("salud_id", String(fonasa.id));
                }
              }} options={["fonasa", "isapre"]} />
            </Field>
            {form.salud_tipo === "isapre" && (<>
              <Field label="ISAPRE">
                <SelectObj value={form.salud_id} onChange={(v) => update("salud_id", v)}
                  options={saluds.filter((s) => s.tipo === "ISAPRE").map((s) => ({ value: String(s.id), label: String(s.nombre) }))} placeholder="Seleccionar ISAPRE" />
              </Field>
              <Field label="Plan (UF)"><Input type="number" value={form.plan_salud_uf} onChange={(v) => update("plan_salud_uf", v)} /></Field>
            </>)}
            <Field label="Banco"><SelectStr value={form.banco} onChange={(v) => update("banco", v)} options={BANCOS} /></Field>
            <Field label="Tipo Cuenta"><SelectStr value={form.tipo_cuenta} onChange={(v) => update("tipo_cuenta", v)} options={TIPOS_CUENTA} /></Field>
            <div className="col-span-2"><Field label="Número Cuenta"><Input value={form.numero_cuenta} onChange={(v) => update("numero_cuenta", v)} /></Field></div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
