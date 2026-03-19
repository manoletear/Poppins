"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft, UserCircle, Save, Pencil, X,
  Briefcase, CreditCard, Shield, Users, MapPin, Phone, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEmpleadoById, updateTrabajador, getInstituciones } from "@/lib/supabase-queries";

function FieldRow({ label, value, editing, children }: {
  label: string; value: string | number | null | undefined; editing: boolean; children?: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-3 gap-4 py-2.5 border-b border-zinc-100 last:border-0">
      <dt className="text-sm font-medium text-zinc-500">{label}</dt>
      <dd className="col-span-2 text-sm text-zinc-900">
        {editing && children ? children : (value ?? "—")}
      </dd>
    </div>
  );
}

function Input({ value, onChange, type = "text" }: {
  value: string | number; onChange: (v: string) => void; type?: string;
}) {
  return (
    <input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400" />
  );
}

function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400">
      <option value="">Seleccionar...</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

type Tab = "personal" | "contrato" | "prevision" | "bancario" | "cargas";

const ESTADOS_CIVILES = ["Soltero", "Casado", "Divorciado", "Viudo", "Conviviente Civil"];
const REGIONES = ["Arica y Parinacota", "Tarapacá", "Antofagasta", "Atacama", "Coquimbo", "Valparaíso",
  "Región Metropolitana", "O'Higgins", "Maule", "Ñuble", "Biobío", "Araucanía", "Los Ríos", "Los Lagos", "Aysén", "Magallanes"];
const BANCOS = ["Banco de Chile", "BancoEstado", "Banco Santander", "Banco BCI", "Banco Itaú", "Scotiabank",
  "Banco Falabella", "Banco Security", "Banco BICE"];
const TIPOS_CUENTA = ["Corriente", "Vista", "Ahorro", "CuentaRUT"];

export default function FichaEmpleadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [emp, setEmp] = useState<Record<string, unknown> | null>(null);
  const [original, setOriginal] = useState<Record<string, unknown> | null>(null);
  const [instituciones, setInstituciones] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [tab, setTab] = useState<Tab>("personal");

  useEffect(() => {
    Promise.all([getEmpleadoById(id), getInstituciones()])
      .then(([e, inst]) => { setEmp(e); setOriginal(e); setInstituciones(inst); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-zinc-400" /></div>;
  if (!emp) return <div className="text-center py-20 text-zinc-400">Colaborador no encontrado<br /><Link href="/dashboard/trabajadoras" className="text-sm underline">Volver</Link></div>;

  const s = (key: string) => String(emp[key] ?? "");
  const n = (key: string) => Number(emp[key] ?? 0);
  const update = (key: string, val: unknown) => setEmp((prev) => prev ? { ...prev, [key]: val } : prev);
  const fmt = (v: unknown) => { const num = Number(v); return isNaN(num) ? "—" : `$${num.toLocaleString("es-CL")}`; };

  const afps = instituciones.filter((i) => i.tipo === "AFP");
  const saluds = instituciones.filter((i) => i.tipo === "ISAPRE" || i.tipo === "FONASA");

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTrabajador(id, {
        nombre: emp.primer_nombre, segundo_nombre: emp.segundo_nombre,
        apellido_paterno: emp.apellido_paterno, apellido_materno: emp.apellido_materno,
        fecha_nacimiento: emp.fecha_nacimiento, sexo: emp.sexo,
        estado_civil: emp.estado_civil, nacionalidad: emp.nacionalidad,
        email: emp.email, telefono: emp.telefono,
        direccion: emp.direccion, comuna: emp.comuna, ciudad: emp.ciudad, region: emp.region,
        banco: emp.banco, tipo_cuenta: emp.tipo_cuenta, numero_cuenta: emp.numero_cuenta,
        afp_id: emp.afp_id, salud_id: emp.salud_id, salud_tipo: emp.salud_tipo,
        plan_salud_uf: emp.plan_salud_uf,
        cargas_simples: emp.cargas_simples, cargas_maternales: emp.cargas_maternales, cargas_invalidez: emp.cargas_invalidez,
        cargo: emp.cargo, area: emp.area, centro_costo: emp.centro_costo,
        tipo_gratificacion: emp.tipo_gratificacion,
        es_pensionado: emp.es_pensionado, art22_excluido: emp.art22_excluido,
        discapacidad: emp.discapacidad, pueblo_originario: emp.pueblo_originario,
      });
      setOriginal(emp);
      setEditing(false);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => { setEmp(original); setEditing(false); };

  const antiguedad = () => {
    const inicio = new Date(s("fecha_inicio_contrato"));
    if (isNaN(inicio.getTime())) return "—";
    const diff = Date.now() - inicio.getTime();
    const anos = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
    const meses = Math.floor((diff % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
    return `${anos} años, ${meses} meses`;
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "personal", label: "Datos Personales", icon: UserCircle },
    { key: "contrato", label: "Contrato", icon: Briefcase },
    { key: "prevision", label: "Previsión", icon: Shield },
    { key: "bancario", label: "Datos Bancarios", icon: CreditCard },
    { key: "cargas", label: "Cargas Familiares", icon: Users },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/trabajadoras" className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 hover:bg-zinc-50">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-zinc-900">{s("primer_nombre")} {s("segundo_nombre")} {s("apellido_paterno")} {s("apellido_materno")}</h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-zinc-500 font-mono">{s("rut")}</span>
            <span className="text-zinc-300">|</span>
            <span className="text-sm text-zinc-500">{s("cargo") || "Sin cargo"}</span>
            <span className="text-zinc-300">|</span>
            <span className="text-sm text-zinc-500">{antiguedad()}</span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              emp.estado === "activo" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}>{s("estado")}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {guardado && <span className="text-sm text-emerald-600 font-medium">Guardado</span>}
          {editing ? (
            <>
              <button onClick={handleCancel} className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                <X className="h-4 w-4" />Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Guardar
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
              <Pencil className="h-4 w-4" />Editar
            </button>
          )}
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "Sueldo Base", value: fmt(emp.sueldo_base) },
          { label: "AFP", value: s("afp_nombre") },
          { label: "Salud", value: s("salud_nombre") },
          { label: "Contrato", value: s("tipo_contrato") },
          { label: "Cargas", value: String(n("total_cargas")) },
        ].map((c) => (
          <Card key={c.label}><CardContent className="p-4">
            <p className="text-xs text-zinc-500">{c.label}</p>
            <p className="text-lg font-bold text-zinc-900">{c.value || "—"}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200">
        <nav className="flex gap-0">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-700"
              }`}>
              <t.icon className="h-4 w-4" />{t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-2 gap-6">
        {tab === "personal" && (<>
          <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><UserCircle className="h-4 w-4" />Identificación</CardTitle></CardHeader>
            <CardContent><dl>
              <FieldRow label="RUT" value={s("rut")} editing={editing}><Input value={s("rut")} onChange={(v) => update("rut", v)} /></FieldRow>
              <FieldRow label="Primer Nombre" value={s("primer_nombre")} editing={editing}><Input value={s("primer_nombre")} onChange={(v) => update("primer_nombre", v)} /></FieldRow>
              <FieldRow label="Segundo Nombre" value={s("segundo_nombre")} editing={editing}><Input value={s("segundo_nombre")} onChange={(v) => update("segundo_nombre", v)} /></FieldRow>
              <FieldRow label="Apellido Paterno" value={s("apellido_paterno")} editing={editing}><Input value={s("apellido_paterno")} onChange={(v) => update("apellido_paterno", v)} /></FieldRow>
              <FieldRow label="Apellido Materno" value={s("apellido_materno")} editing={editing}><Input value={s("apellido_materno")} onChange={(v) => update("apellido_materno", v)} /></FieldRow>
              <FieldRow label="Fecha Nacimiento" value={s("fecha_nacimiento")} editing={editing}><Input type="date" value={s("fecha_nacimiento")} onChange={(v) => update("fecha_nacimiento", v)} /></FieldRow>
              <FieldRow label="Sexo" value={s("sexo") === "M" ? "Masculino" : s("sexo") === "F" ? "Femenino" : "—"} editing={editing}>
                <Select value={s("sexo")} onChange={(v) => update("sexo", v)} options={[{ value: "M", label: "Masculino" }, { value: "F", label: "Femenino" }]} />
              </FieldRow>
              <FieldRow label="Estado Civil" value={s("estado_civil")} editing={editing}>
                <Select value={s("estado_civil")} onChange={(v) => update("estado_civil", v)} options={ESTADOS_CIVILES.map((e) => ({ value: e, label: e }))} />
              </FieldRow>
              <FieldRow label="Nacionalidad" value={s("nacionalidad")} editing={editing}><Input value={s("nacionalidad")} onChange={(v) => update("nacionalidad", v)} /></FieldRow>
            </dl></CardContent>
          </Card>
          <div className="space-y-6">
            <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Phone className="h-4 w-4" />Contacto</CardTitle></CardHeader>
              <CardContent><dl>
                <FieldRow label="Email" value={s("email")} editing={editing}><Input type="email" value={s("email")} onChange={(v) => update("email", v)} /></FieldRow>
                <FieldRow label="Teléfono" value={s("telefono")} editing={editing}><Input value={s("telefono")} onChange={(v) => update("telefono", v)} /></FieldRow>
              </dl></CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" />Dirección</CardTitle></CardHeader>
              <CardContent><dl>
                <FieldRow label="Dirección" value={s("direccion")} editing={editing}><Input value={s("direccion")} onChange={(v) => update("direccion", v)} /></FieldRow>
                <FieldRow label="Comuna" value={s("comuna")} editing={editing}><Input value={s("comuna")} onChange={(v) => update("comuna", v)} /></FieldRow>
                <FieldRow label="Ciudad" value={s("ciudad")} editing={editing}><Input value={s("ciudad")} onChange={(v) => update("ciudad", v)} /></FieldRow>
                <FieldRow label="Región" value={s("region")} editing={editing}>
                  <Select value={s("region")} onChange={(v) => update("region", v)} options={REGIONES.map((r) => ({ value: r, label: r }))} />
                </FieldRow>
              </dl></CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="text-base">Flags Especiales</CardTitle></CardHeader>
              <CardContent><dl>
                <FieldRow label="Discapacidad" value={emp.discapacidad ? "Sí" : "No"} editing={false} />
                <FieldRow label="Pueblo Originario" value={emp.pueblo_originario ? "Sí" : "No"} editing={false} />
                <FieldRow label="Art. 22 inc. 2" value={emp.art22_excluido ? "Sí" : "No"} editing={false} />
                <FieldRow label="Pensionado" value={emp.es_pensionado ? "Sí" : "No"} editing={false} />
              </dl></CardContent>
            </Card>
          </div>
        </>)}

        {tab === "contrato" && (<>
          <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Briefcase className="h-4 w-4" />Contrato Vigente</CardTitle></CardHeader>
            <CardContent><dl>
              <FieldRow label="Tipo Contrato" value={s("tipo_contrato")} editing={false} />
              <FieldRow label="Fecha Inicio" value={s("fecha_inicio_contrato")} editing={false} />
              <FieldRow label="Fecha Término" value={s("fecha_termino_contrato")} editing={false} />
              <FieldRow label="Antigüedad" value={antiguedad()} editing={false} />
              <FieldRow label="Estado MiDT" value={s("estado_midt") || "No registrado"} editing={false} />
            </dl></CardContent>
          </Card>
          <Card><CardHeader><CardTitle className="text-base">Jornada y Remuneración</CardTitle></CardHeader>
            <CardContent><dl>
              <FieldRow label="Tipo Jornada" value={s("tipo_jornada")} editing={false} />
              <FieldRow label="Horas Semanales" value={`${n("horas_semanales")} hrs`} editing={false} />
              <FieldRow label="Sueldo Base" value={fmt(emp.sueldo_base)} editing={false} />
              <FieldRow label="Gratificación" value={s("tipo_gratificacion")} editing={editing}>
                <Select value={s("tipo_gratificacion")} onChange={(v) => update("tipo_gratificacion", v)}
                  options={[{ value: "art_50", label: "Art. 50 (Garantizada)" }, { value: "art_47", label: "Art. 47 (Proporcional)" }]} />
              </FieldRow>
            </dl></CardContent>
          </Card>
          <Card><CardHeader><CardTitle className="text-base">Organización</CardTitle></CardHeader>
            <CardContent><dl>
              <FieldRow label="Cargo" value={s("cargo")} editing={editing}><Input value={s("cargo")} onChange={(v) => update("cargo", v)} /></FieldRow>
              <FieldRow label="Área" value={s("area")} editing={editing}><Input value={s("area")} onChange={(v) => update("area", v)} /></FieldRow>
              <FieldRow label="Centro de Costo" value={s("centro_costo")} editing={editing}><Input value={s("centro_costo")} onChange={(v) => update("centro_costo", v)} /></FieldRow>
            </dl></CardContent>
          </Card>
        </>)}

        {tab === "prevision" && (<>
          <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" />AFP</CardTitle></CardHeader>
            <CardContent><dl>
              <FieldRow label="AFP" value={s("afp_nombre")} editing={editing}>
                <Select value={String(emp.afp_id ?? "")} onChange={(v) => update("afp_id", Number(v))}
                  options={afps.map((a) => ({ value: String(a.id), label: String(a.nombre) }))} />
              </FieldRow>
              <FieldRow label="Código PREVIRED" value={s("afp_codigo")} editing={false} />
              <FieldRow label="Tasa Cotización" value={emp.tasa_afp ? `${emp.tasa_afp}%` : "—"} editing={false} />
              <FieldRow label="Pensionado" value={emp.es_pensionado ? "Sí (no cotiza AFP)" : "No"} editing={false} />
            </dl></CardContent>
          </Card>
          <Card><CardHeader><CardTitle className="text-base">Salud</CardTitle></CardHeader>
            <CardContent><dl>
              <FieldRow label="Sistema" value={s("salud_tipo") === "fonasa" ? "FONASA" : "ISAPRE"} editing={editing}>
                <Select value={s("salud_tipo")} onChange={(v) => {
                  update("salud_tipo", v);
                  if (v === "fonasa") {
                    const fonasa = instituciones.find((i) => i.tipo === "FONASA");
                    if (fonasa) update("salud_id", fonasa.id);
                    update("plan_salud_uf", null);
                  }
                }} options={[{ value: "fonasa", label: "FONASA" }, { value: "isapre", label: "ISAPRE" }]} />
              </FieldRow>
              <FieldRow label="Institución" value={s("salud_nombre")} editing={editing && s("salud_tipo") === "isapre"}>
                <Select value={String(emp.salud_id ?? "")} onChange={(v) => update("salud_id", Number(v))}
                  options={saluds.filter((s) => s.tipo === "ISAPRE").map((s) => ({ value: String(s.id), label: String(s.nombre) }))} />
              </FieldRow>
              {s("salud_tipo") === "isapre" && (
                <FieldRow label="Plan (UF)" value={emp.plan_salud_uf ? `${emp.plan_salud_uf} UF` : "—"} editing={editing}>
                  <Input type="number" value={n("plan_salud_uf")} onChange={(v) => update("plan_salud_uf", Number(v) || null)} />
                </FieldRow>
              )}
              <FieldRow label="Cotización Legal" value="7%" editing={false} />
            </dl></CardContent>
          </Card>
        </>)}

        {tab === "bancario" && (
          <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" />Datos Bancarios</CardTitle></CardHeader>
            <CardContent><dl>
              <FieldRow label="Banco" value={s("banco")} editing={editing}>
                <Select value={s("banco")} onChange={(v) => update("banco", v)} options={BANCOS.map((b) => ({ value: b, label: b }))} />
              </FieldRow>
              <FieldRow label="Tipo Cuenta" value={s("tipo_cuenta")} editing={editing}>
                <Select value={s("tipo_cuenta")} onChange={(v) => update("tipo_cuenta", v)} options={TIPOS_CUENTA.map((t) => ({ value: t, label: t }))} />
              </FieldRow>
              <FieldRow label="Número Cuenta" value={s("numero_cuenta")} editing={editing}><Input value={s("numero_cuenta")} onChange={(v) => update("numero_cuenta", v)} /></FieldRow>
            </dl></CardContent>
          </Card>
        )}

        {tab === "cargas" && (<>
          <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" />Cargas Familiares</CardTitle></CardHeader>
            <CardContent><dl>
              <FieldRow label="Cargas Simples" value={n("cargas_simples")} editing={editing}><Input type="number" value={n("cargas_simples")} onChange={(v) => update("cargas_simples", Number(v))} /></FieldRow>
              <FieldRow label="Cargas Maternales" value={n("cargas_maternales")} editing={editing}><Input type="number" value={n("cargas_maternales")} onChange={(v) => update("cargas_maternales", Number(v))} /></FieldRow>
              <FieldRow label="Cargas Invalidez" value={n("cargas_invalidez")} editing={editing}><Input type="number" value={n("cargas_invalidez")} onChange={(v) => update("cargas_invalidez", Number(v))} /></FieldRow>
              <FieldRow label="Total Cargas" value={n("total_cargas")} editing={false} />
            </dl></CardContent>
          </Card>
          <Card><CardHeader><CardTitle className="text-base">Asignación Familiar Estimada</CardTitle></CardHeader>
            <CardContent><dl>
              {(() => {
                const totalCargas = n("cargas_simples") + n("cargas_maternales") + n("cargas_invalidez");
                const ingreso = n("sueldo_base");
                let tramo = "D", montoPorCarga = 0;
                if (ingreso <= 441115) { tramo = "A"; montoPorCarga = 16793; }
                else if (ingreso <= 644201) { tramo = "B"; montoPorCarga = 10302; }
                else if (ingreso <= 1004818) { tramo = "C"; montoPorCarga = 3255; }
                return (<>
                  <FieldRow label="Tramo" value={`Tramo ${tramo}`} editing={false} />
                  <FieldRow label="Monto por Carga" value={fmt(montoPorCarga)} editing={false} />
                  <FieldRow label="Total Mensual" value={fmt(montoPorCarga * totalCargas)} editing={false} />
                </>);
              })()}
            </dl></CardContent>
          </Card>
        </>)}
      </div>
    </div>
  );
}
