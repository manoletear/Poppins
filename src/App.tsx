import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Papa from "papaparse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Info, Plus, Trash2, Upload, Search, Sparkles, FileDown } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, Legend } from "recharts";

/**
 * Calculadora de Avalúos y Contribuciones 2025 - Versión Completa
 *
 * Características:
 * - Importación CSV del SII (ASN/ASNL/ASA/ASAL)
 * - Escenarios comparativos por calidad
 * - Animaciones con framer-motion
 * - Base de datos de comunas integrada
 * - Exportación y reportes
 */

type Clase = "A" | "B" | "C" | "D" | "GA" | "GB" | "GC" | "Otro";

interface ConstruccionItem {
  id: string;
  nombre: string;
  m2: number;
  clase: Clase;
  calidad: number;           // 1..5 (tradicional) o 1..3 (galpón)
  subterraneo: boolean;      // bajo cota 0
  antiguedad: number;        // años de antigüedad (0 = nuevo)
  vucOverride?: number;      // $/m² directo opcional
}

// Factores de depreciación por antigüedad
const FACTORES_DEPRECIACION: Record<number, { label: string; factor: number }> = {
  0: { label: "Nuevo (0 años)", factor: 1.0 },
  5: { label: "5 años", factor: 0.95 },
  10: { label: "10 años", factor: 0.90 },
  15: { label: "15 años", factor: 0.85 },
  20: { label: "20 años", factor: 0.80 },
  25: { label: "25 años", factor: 0.75 },
  30: { label: "30 años", factor: 0.70 },
  40: { label: "40+ años", factor: 0.65 },
};

// Configuración automática de parámetros regulatorios (readonly)
const PARAMETROS_REGULATORIOS = {
  tasaTramo1: 0.00893,        // 0,893%
  tasaTramo2: 0.01042,        // 1,042%
  umbralCambioTasaCLP: 7_785_000_000,
  aplica0025: true,
  tasa0025: 0.00025,          // 0,025%
  valorUTA_CLP: 800_000,
  tramo7bis_1_UTA: 827,
  tramo7bis_2_UTA: 1641,
  tramo7bis_3_UTA: 2454,
  tasa7bis1: 0.00075,         // 0.075%
  tasa7bis2: 0.0015,          // 0.15%
  tasa7bis3: 0.00425,         // 0.425%
};

interface Parametros {
  // Identificación del predio
  rol: string;                  // ROL de la propiedad (clave única)
  direccion: string;            // Dirección del inmueble
  comuna: string;
  // Terreno
  superficieTerrenoM2: number;
  vutCLP: number;               // $/m² de la AH
  coefAltura: number;           // CA (cargado por defecto, editable)
  coefGuia: number;             // CG (cargado por defecto, editable)
  coefSuperficieMultiple: number; // CMP (cargado por defecto, editable)
  // Parámetros regulatorios (automáticos - readonly)
  tasaTramo1: number;           // 0,893% -> 0.00893
  tasaTramo2: number;           // 1,042% -> 0.01042
  umbralCambioTasaCLP: number;
  aplica0025: boolean;
  tasa0025: number;             // 0.00025
  valorUTA_CLP: number;
  totalBRNA_RUT_CLP: number;    // avalúo acumulado del contribuyente
  tramo7bis_1_UTA: number;      // 827
  tramo7bis_2_UTA: number;      // 1641
  tramo7bis_3_UTA: number;      // 2454
  tasa7bis1: number;            // 0.00075
  tasa7bis2: number;            // 0.0015
  tasa7bis3: number;            // 0.00425
}

// Base de datos simulada de predios (por ROL)
const PREDIOS_DATABASE: Record<string, {
  direccion: string;
  comuna: string;
  superficieTerrenoM2: number;
  vutCLP: number;
  coefAltura: number;
  coefGuia: number;
  coefSuperficieMultiple: number;
}> = {
  "15103-0234-5": {
    direccion: "Av. Providencia 1234",
    comuna: "Providencia",
    superficieTerrenoM2: 2239,
    vutCLP: 1800000,
    coefAltura: 1.0,
    coefGuia: 1.0,
    coefSuperficieMultiple: 1.0,
  },
  "15108-5678-9": {
    direccion: "Av. Las Condes 5678",
    comuna: "Las Condes",
    superficieTerrenoM2: 1800,
    vutCLP: 2200000,
    coefAltura: 1.2,
    coefGuia: 1.0,
    coefSuperficieMultiple: 1.0,
  },
  "15132-9012-3": {
    direccion: "Camino La Reina 9012",
    comuna: "La Reina",
    superficieTerrenoM2: 3500,
    vutCLP: 1660000,
    coefAltura: 1.0,
    coefGuia: 1.0,
    coefSuperficieMultiple: 1.0,
  }
};

// Utilidades para cálculos automáticos
const calcularFactorSB = (subterraneo: boolean): number => {
  return subterraneo ? 0.7 : 1.0;
};

const calcularDepreciacion = (antiguedad: number): number => {
  // Buscar el factor más cercano
  const keys = Object.keys(FACTORES_DEPRECIACION).map(Number).sort((a, b) => a - b);
  for (let i = keys.length - 1; i >= 0; i--) {
    if (antiguedad >= keys[i]) {
      return FACTORES_DEPRECIACION[keys[i]].factor;
    }
  }
  return 1.0; // Por defecto, nuevo
};

const precargarDatosPorROL = (rol: string) => {
  return PREDIOS_DATABASE[rol] || null;
};

// Catálogo VUC expandido (conecta con Anexo 5 oficial)
const VUC_CATALOGO: Record<string, number> = {
  // Tradicional
  "A-1": 2180000, "A-2": 1520000, "A-3": 1120000, "A-4": 665000, "A-5": 489000,
  "B-1": 1452463, "B-2": 1027388, "B-3": 761529, "B-4": 451734, "B-5": 332325,
  "C-1": 985000, "C-2": 695000, "C-3": 515000, "C-4": 305000, "C-5": 225000,
  "D-1": 650000, "D-2": 460000, "D-3": 340000, "D-4": 202000, "D-5": 148000,
  // Galpones
  "GA-1": 1250000, "GA-2": 700000, "GA-3": 390000,
  "GB-1": 899340, "GB-2": 503931, "GB-3": 281631,
  "GC-1": 450000, "GC-2": 252000, "GC-3": 141000,
  // Especiales
  "PARK-B-4": 451734,
};

// Configuración por comuna (VUT y coeficientes típicos)
const COMMUNE_DEFAULTS: Record<string, { vut: number; ca: number; cg: number; cmp: number }> = {
  "Santiago": { vut: 1200000, ca: 1, cg: 1, cmp: 1 },
  "Providencia": { vut: 1800000, ca: 1, cg: 1, cmp: 1 },
  "Las Condes": { vut: 2200000, ca: 1, cg: 1, cmp: 1 },
  "La Reina": { vut: 1660000, ca: 1, cg: 1, cmp: 1 },
  "Ñuñoa": { vut: 950000, ca: 1, cg: 1, cmp: 1 },
  "Macul": { vut: 236000, ca: 1, cg: 1, cmp: 1 },
  "La Florida": { vut: 485000, ca: 1, cg: 1, cmp: 1 },
  "Maipú": { vut: 420000, ca: 1, cg: 1, cmp: 1 },
  "Viña del Mar": { vut: 1100000, ca: 1, cg: 1, cmp: 1 },
  "Valparaíso": { vut: 850000, ca: 1, cg: 1, cmp: 1 },
  "Concepción": { vut: 650000, ca: 1, cg: 1, cmp: 1 },
  "Temuco": { vut: 480000, ca: 1, cg: 1, cmp: 1 },
  "Antofagasta": { vut: 920000, ca: 1, cg: 1, cmp: 1 },
  "La Serena": { vut: 780000, ca: 1, cg: 1, cmp: 1 },
};

// Utilidades
const fmt = (n: number) => new Intl.NumberFormat("es-CL").format(Math.round(n));
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ---- Cálculos núcleo ----
function calcularAvaluoTerreno(p: Parametros): number {
  return p.vutCLP * p.superficieTerrenoM2 * (p.coefAltura * p.coefGuia * p.coefSuperficieMultiple);
}

function obtenerVUC(item: ConstruccionItem): number {
  if (item.vucOverride && item.vucOverride > 0) return item.vucOverride;
  return VUC_CATALOGO[`${item.clase}-${item.calidad}`] ?? 0;
}

function calcularAvaluoConstruccion(items: ConstruccionItem[]) {
  const detalle = items.map((it) => {
    const vuc = obtenerVUC(it);
    const factorSB = calcularFactorSB(it.subterraneo);
    const depreciacion = calcularDepreciacion(it.antiguedad);
    const subtotal = it.m2 * vuc * factorSB * depreciacion;
    return { ...it, vuc, factorSB, depreciacion, subtotal };
  });
  const total = detalle.reduce((a, d) => a + d.subtotal, 0);
  return { total, detalle };
}

function calcularContribucionBase(avaluoTotal: number, p: Parametros) {
  const base1 = Math.min(avaluoTotal, p.umbralCambioTasaCLP);
  const base2 = Math.max(avaluoTotal - p.umbralCambioTasaCLP, 0);
  return {
    base1, base2,
    imp1: base1 * p.tasaTramo1,
    imp2: base2 * p.tasaTramo2,
    total: base1 * p.tasaTramo1 + base2 * p.tasaTramo2
  };
}

function calc7bis(avaluoAcum: number, p: Parametros) {
  const t1 = p.tramo7bis_1_UTA * p.valorUTA_CLP;
  const t2 = p.tramo7bis_2_UTA * p.valorUTA_CLP;
  const t3 = p.tramo7bis_3_UTA * p.valorUTA_CLP;
  const base1 = Math.max(Math.min(avaluoAcum, t2) - t1, 0);
  const base2 = Math.max(Math.min(avaluoAcum, t3) - t2, 0);
  const base3 = Math.max(avaluoAcum - t3, 0);
  return {
    base1, base2, base3,
    imp1: base1 * p.tasa7bis1,
    imp2: base2 * p.tasa7bis2,
    imp3: base3 * p.tasa7bis3,
    total: base1 * p.tasa7bis1 + base2 * p.tasa7bis2 + base3 * p.tasa7bis3
  };
}

function calc0025(avaluoTotal: number, p: Parametros) {
  return p.aplica0025 ? avaluoTotal * p.tasa0025 : 0;
}

// ---- Componente principal ----
export default function QwenContribucionesApp() {
  // Estado base
  const [param, setParam] = useState<Parametros>({
    // Identificación del predio
    rol: "",
    direccion: "",
    comuna: "Providencia",
    // Terreno
    superficieTerrenoM2: 2239,
    vutCLP: COMMUNE_DEFAULTS["Providencia"].vut,
    coefAltura: COMMUNE_DEFAULTS["Providencia"].ca,
    coefGuia: COMMUNE_DEFAULTS["Providencia"].cg,
    coefSuperficieMultiple: COMMUNE_DEFAULTS["Providencia"].cmp,
    // Parámetros regulatorios (automáticos)
    ...PARAMETROS_REGULATORIOS,
    totalBRNA_RUT_CLP: 0, // Este puede ser editable para el 7 bis
  });

  const [construccion, setConstruccion] = useState<ConstruccionItem[]>([
    {
      id: crypto.randomUUID(),
      nombre: "Comercio sobre rasante",
      m2: 280,
      clase: "B",
      calidad: 2,
      subterraneo: false,
      antiguedad: 0,
    },
    {
      id: crypto.randomUUID(),
      nombre: "Almacenaje sobre rasante",
      m2: 3698,
      clase: "GB",
      calidad: 2,
      subterraneo: false,
      antiguedad: 0,
    },
    {
      id: crypto.randomUUID(),
      nombre: "Estacionamientos subterráneos",
      m2: 3870,
      clase: "B",
      calidad: 4,
      subterraneo: true,
      antiguedad: 0,
    },
    {
      id: crypto.randomUUID(),
      nombre: "Bodegas subterráneas",
      m2: 2236,
      clase: "GB",
      calidad: 2,
      subterraneo: true,
      antiguedad: 0,
    },
  ]);

  // Estados para CSV del SII
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [rolQuery, setRolQuery] = useState("");
  const [mapCols, setMapCols] = useState({
    rol: "",
    supTerreno: "",
    supCons: "",
    clase: "",
    calidad: ""
  });

  // Cálculos memoizados
  const avaluoTerreno = useMemo(() => calcularAvaluoTerreno(param), [param]);
  const { total: avaluoConstruccion, detalle } = useMemo(() => calcularAvaluoConstruccion(construccion), [construccion]);
  const avaluoTotal = avaluoTerreno + avaluoConstruccion;
  const base = useMemo(() => calcularContribucionBase(avaluoTotal, param), [avaluoTotal, param]);
  const totalRUT = param.totalBRNA_RUT_CLP > 0 ? param.totalBRNA_RUT_CLP : avaluoTotal;
  const sieteBis = useMemo(() => calc7bis(totalRUT, param), [totalRUT, param]);
  const s0025 = useMemo(() => calc0025(avaluoTotal, param), [avaluoTotal, param]);
  const totalAnual = base.total + s0025 + sieteBis.total;
  const cuota = totalAnual / 4;

  // Helpers UI
  const addItem = () => setConstruccion(p => ([
    ...p,
    {
      id: crypto.randomUUID(),
      nombre: "Nuevo componente",
      m2: 0,
      clase: "B",
      calidad: 2,
      subterraneo: false,
      antiguedad: 0,
    }
  ]));

  const delItem = (id: string) => setConstruccion(p => p.filter(x => x.id !== id));

  const onSelectComuna = (v: string) => {
    const cfg = COMMUNE_DEFAULTS[v];
    if (cfg) {
      setParam(prev => ({
        ...prev,
        comuna: v,
        vutCLP: cfg.vut,
        coefAltura: cfg.ca,
        coefGuia: cfg.cg,
        coefSuperficieMultiple: cfg.cmp,
      }));
    }
  };

  const onBuscarROL = (rol: string) => {
    const datos = precargarDatosPorROL(rol);
    if (datos) {
      setParam(prev => ({
        ...prev,
        rol: rol,
        direccion: datos.direccion,
        comuna: datos.comuna,
        superficieTerrenoM2: datos.superficieTerrenoM2,
        vutCLP: datos.vutCLP,
        coefAltura: datos.coefAltura,
        coefGuia: datos.coefGuia,
        coefSuperficieMultiple: datos.coefSuperficieMultiple,
      }));
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 py-8">
        <div className="mx-auto max-w-7xl px-4 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-blue-600"/>
              <h1 className="text-2xl font-bold tracking-tight">Calculadora de Avalúos 2025</h1>
              <Badge variant="secondary" className="rounded-full">Versión Completa</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {Object.keys(COMMUNE_DEFAULTS).length} comunas disponibles
            </div>
          </div>

          <Tabs defaultValue="predio" className="w-full">
            <TabsList className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-7 gap-2">
              <TabsTrigger value="predio">Predio</TabsTrigger>
              <TabsTrigger value="construccion">Construcción</TabsTrigger>
              <TabsTrigger value="parametros">Parámetros</TabsTrigger>
              <TabsTrigger value="datos">Datos SII</TabsTrigger>
              <TabsTrigger value="escenarios">Escenarios</TabsTrigger>
              <TabsTrigger value="resultado">Resultado</TabsTrigger>
              <TabsTrigger value="ayuda">Ayuda</TabsTrigger>
            </TabsList>

            {/* PREDIO */}
            <TabsContent value="predio">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="shadow-sm backdrop-blur bg-white/70 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Identificación del Predio
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Identificación básica */}
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium">ROL de la propiedad *</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            placeholder="15103-0234-5"
                            value={param.rol}
                            onChange={(e) => setParam({ ...param, rol: e.target.value })}
                          />
                          <Button
                            variant="outline"
                            onClick={() => param.rol && onBuscarROL(param.rol)}
                            disabled={!param.rol}
                          >
                            <Search className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Clave única en catastro SII</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Dirección del inmueble</Label>
                        <Input
                          placeholder="Av. Providencia 1234"
                          value={param.direccion}
                          onChange={(e) => setParam({ ...param, direccion: e.target.value })}
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Autocompletable con ROL, editable</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Comuna</Label>
                        <Select value={param.comuna} onValueChange={onSelectComuna}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Selecciona comuna"/>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(COMMUNE_DEFAULTS).map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Datos del terreno */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <h3 className="font-medium mb-4">Datos del Terreno</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Superficie de terreno (m²)</Label>
                          <Input
                            type="number"
                            value={param.superficieTerrenoM2}
                            onChange={(e) => setParam({ ...param, superficieTerrenoM2: Number(e.target.value) || 0 })}
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">M² útiles, libre de expropiación</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">VUT ($/m²) de la AH</Label>
                          <Input
                            type="number"
                            value={param.vutCLP}
                            onChange={(e) => setParam({ ...param, vutCLP: Number(e.target.value) || 0 })}
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Cargado por defecto, editable</p>
                        </div>
                      </div>
                    </div>

                    {/* Coeficientes de ajuste */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <h3 className="font-medium mb-4 text-blue-800 dark:text-blue-200">Coeficientes de Ajuste</h3>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Coeficiente de Altura (CA)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={param.coefAltura}
                            onChange={(e) => setParam({ ...param, coefAltura: Number(e.target.value) || 1 })}
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Cargado por defecto</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Coeficiente de Guía (CG)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={param.coefGuia}
                            onChange={(e) => setParam({ ...param, coefGuia: Number(e.target.value) || 1 })}
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Cargado por defecto</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Coeficiente Superficie Múltiple (CMP)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={param.coefSuperficieMultiple}
                            onChange={(e) => setParam({ ...param, coefSuperficieMultiple: Number(e.target.value) || 1 })}
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Cargado por defecto</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
                        <CardHeader>
                          <CardTitle className="text-base text-blue-800 dark:text-blue-200">Avalúo Terreno</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-semibold text-blue-900 dark:text-blue-100">${fmt(avaluoTerreno)}</div>
                          <div className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                            Fórmula: VUT × m² × (CA × CG × CMP)
                          </div>
                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            ROL: {param.rol || 'No ingresado'} • {param.comuna}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
                        <CardHeader>
                          <CardTitle className="text-base text-green-800 dark:text-green-200">Distribución del Avalúo</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={[
                              { name: "Terreno", CLP: avaluoTerreno },
                              { name: "Construcción", CLP: avaluoConstruccion }
                            ]}>
                              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                              <YAxis tickFormatter={(v) => `${fmt(v)}`} tick={{ fontSize: 12 }} />
                              <RTooltip formatter={(v: any) => [`${fmt(v as number)}`, 'Valor']} />
                              <Legend />
                              <Bar dataKey="CLP" name="CLP" fill="#3b82f6" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>

                    {param.rol && (
                      <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                        <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">✓ Datos cargados</h4>
                        <div className="text-sm text-green-700 dark:text-green-300">
                          <p><strong>ROL:</strong> {param.rol}</p>
                          <p><strong>Dirección:</strong> {param.direccion}</p>
                          <p><strong>Comuna:</strong> {param.comuna}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* CONSTRUCCIÓN */}
            <TabsContent value="construccion">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {construccion.map((it, index) => (
                  <motion.div
                    key={it.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="shadow-sm backdrop-blur bg-white/70 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800 hover:shadow-md transition-shadow">
                      <CardContent className="pt-6 grid md:grid-cols-6 gap-4 items-end">
                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium">Nombre</Label>
                          <Input
                            value={it.nombre}
                            onChange={(e) => {
                              const v = e.target.value;
                              setConstruccion(prev => prev.map(x => x.id===it.id?{...x, nombre:v}:x));
                            }}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">m²</Label>
                          <Input
                            type="number"
                            value={it.m2}
                            onChange={(e) => {
                              const v = Number(e.target.value)||0;
                              setConstruccion(prev => prev.map(x => x.id===it.id?{...x, m2:v}:x));
                            }}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Clase</Label>
                          <Select
                            value={it.clase}
                            onValueChange={(v: Clase) => setConstruccion(prev => prev.map(x => x.id===it.id?{...x, clase:v}:x))}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Clase" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="A">A (tradicional)</SelectItem>
                              <SelectItem value="B">B (tradicional)</SelectItem>
                              <SelectItem value="C">C (tradicional)</SelectItem>
                              <SelectItem value="D">D (tradicional)</SelectItem>
                              <SelectItem value="GA">GA (galpón A)</SelectItem>
                              <SelectItem value="GB">GB (galpón B)</SelectItem>
                              <SelectItem value="GC">GC (galpón C)</SelectItem>
                              <SelectItem value="Otro">Otro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Calidad</Label>
                          <Input
                            type="number"
                            min={1}
                            max={it.clase.startsWith("G") ? 3 : 5}
                            value={it.calidad}
                            onChange={(e) => {
                              const v = clamp(Number(e.target.value)||1, 1, it.clase.startsWith("G") ? 3 : 5);
                              setConstruccion(prev => prev.map(x => x.id===it.id?{...x, calidad:v}:x));
                            }}
                            className="mt-1"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <Label className="mb-2 text-sm font-medium">Subterráneo</Label>
                            <Switch
                              checked={it.subterraneo}
                              onCheckedChange={(v) => setConstruccion(prev => prev.map(x => x.id===it.id?{...x, subterraneo:v}:x))}
                            />
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium">VUC override ($/m²)</Label>
                          <Input
                            type="number"
                            value={it.vucOverride||0}
                            onChange={(e) => {
                              const v = Number(e.target.value)||0;
                              setConstruccion(prev => prev.map(x => x.id===it.id?{...x, vucOverride:v}:x));
                            }}
                            placeholder="Deja 0 para usar catálogo"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Antigüedad</Label>
                          <Select
                            value={String(it.antiguedad)}
                            onValueChange={(v) => {
                              const newAntiguedad = Number(v);
                              setConstruccion(prev => prev.map(x => x.id === it.id ? { ...x, antiguedad: newAntiguedad } : x));
                            }}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Antigüedad" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(FACTORES_DEPRECIACION).map(([years, { label }]) => (
                                <SelectItem key={years} value={years}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Button
                            variant="destructive"
                            onClick={() => delItem(it.id)}
                            className="hover:scale-105 transition-transform"
                          >
                            <Trash2 className="w-4 h-4 mr-2"/>
                            Eliminar
                          </Button>
                        </div>
                        <div className="md:col-span-6 border-t pt-4 bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                          <div className="text-sm text-muted-foreground flex justify-between items-center">
                            <span>
                              VUC usado: ${fmt(obtenerVUC(it))} • Factor aplicado: {calcularFactorSB(it.subterraneo)} × {calcularDepreciacion(it.antiguedad)}
                            </span>
                            <span className="font-medium">
                              Subtotal: ${fmt(it.m2 * obtenerVUC(it) * calcularFactorSB(it.subterraneo) * calcularDepreciacion(it.antiguedad))}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}

                <div className="flex justify-between items-center">
                  <Button
                    onClick={addItem}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                  >
                    <Plus className="w-4 h-4 mr-2"/>
                    Agregar componente
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Total construcción: <strong>${fmt(avaluoConstruccion)}</strong>
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            {/* PARÁMETROS */}
            <TabsContent value="parametros">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="shadow-sm backdrop-blur bg-white/70 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="w-5 h-5" />
                      Parámetros del cálculo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Tasas principales */}
                    <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-lg border">
                      <h3 className="font-medium text-purple-800 dark:text-purple-200 mb-4">Contribución Base</h3>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Tasa tramo 1 (%)</Label>
                          <Input
                            type="number"
                            step="0.00001"
                            value={param.tasaTramo1}
                            onChange={(e)=>setParam({...param, tasaTramo1: Number(e.target.value)||0})}
                            className="mt-1"
                          />
                          <div className="text-xs text-muted-foreground mt-1">
                            Actual: {(param.tasaTramo1 * 100).toFixed(3)}%
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Tasa tramo 2 (%)</Label>
                          <Input
                            type="number"
                            step="0.00001"
                            value={param.tasaTramo2}
                            onChange={(e)=>setParam({...param, tasaTramo2: Number(e.target.value)||0})}
                            className="mt-1"
                          />
                          <div className="text-xs text-muted-foreground mt-1">
                            Actual: {(param.tasaTramo2 * 100).toFixed(3)}%
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Umbral cambio tasa (CLP)</Label>
                          <Input
                            type="number"
                            value={param.umbralCambioTasaCLP}
                            onChange={(e)=>setParam({...param, umbralCambioTasaCLP: Number(e.target.value)||0})}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sobretasa 0.025% */}
                    <div className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 rounded-lg border">
                      <div className="grid md:grid-cols-4 gap-4 items-center">
                        <div className="col-span-2 flex items-center gap-3">
                          <Switch
                            checked={param.aplica0025}
                            onCheckedChange={(v)=>setParam({...param, aplica0025: v})}
                          />
                          <div>
                            <div className="font-medium text-amber-800 dark:text-amber-200">Aplicar sobretasa 0,025%</div>
                            <div className="text-sm text-amber-700 dark:text-amber-300">(financiamiento municipal adicional)</div>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Tasa 0,025%</Label>
                          <Input
                            type="number"
                            step="0.00001"
                            value={param.tasa0025}
                            onChange={(e)=>setParam({...param, tasa0025: Number(e.target.value)||0})}
                            className="mt-1"
                          />
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-amber-800 dark:text-amber-200">
                            {param.aplica0025 ? `$${fmt(s0025)}` : 'No aplica'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 7 bis parameters */}
                    <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg border">
                      <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-4">Parámetros Artículo 7° bis</h3>
                      <div className="grid md:grid-cols-6 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Valor UTA (CLP)</Label>
                          <Input
                            type="number"
                            value={param.valorUTA_CLP}
                            onChange={(e)=>setParam({...param, valorUTA_CLP: Number(e.target.value)||0})}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Acumulado BRNA RUT (CLP)</Label>
                          <Input
                            type="number"
                            value={param.totalBRNA_RUT_CLP}
                            onChange={(e)=>setParam({...param, totalBRNA_RUT_CLP: Number(e.target.value)||0})}
                            placeholder="0 = usar avalúo total"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Tramo 1 (UTA)</Label>
                          <Input
                            type="number"
                            value={param.tramo7bis_1_UTA}
                            onChange={(e)=>setParam({...param, tramo7bis_1_UTA: Number(e.target.value)||0})}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Tramo 2 (UTA)</Label>
                          <Input
                            type="number"
                            value={param.tramo7bis_2_UTA}
                            onChange={(e)=>setParam({...param, tramo7bis_2_UTA: Number(e.target.value)||0})}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Tramo 3 (UTA)</Label>
                          <Input
                            type="number"
                            value={param.tramo7bis_3_UTA}
                            onChange={(e)=>setParam({...param, tramo7bis_3_UTA: Number(e.target.value)||0})}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Tasas 7 bis</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              type="number"
                              step="0.00001"
                              value={param.tasa7bis1}
                              onChange={(e)=>setParam({...param, tasa7bis1: Number(e.target.value)||0})}
                              className="text-xs"
                              placeholder="0.075%"
                            />
                            <Input
                              type="number"
                              step="0.00001"
                              value={param.tasa7bis2}
                              onChange={(e)=>setParam({...param, tasa7bis2: Number(e.target.value)||0})}
                              className="text-xs"
                              placeholder="0.15%"
                            />
                            <Input
                              type="number"
                              step="0.00001"
                              value={param.tasa7bis3}
                              onChange={(e)=>setParam({...param, tasa7bis3: Number(e.target.value)||0})}
                              className="text-xs"
                              placeholder="0.425%"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <strong>Nota:</strong> Estos parámetros deben actualizarse anualmente según la normativa vigente.
                        Los valores mostrados corresponden al período 2025.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* DATOS SII (CSV) */}
            <TabsContent value="datos">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="shadow-sm backdrop-blur bg-white/70 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="w-5 h-5" />
                      Importar CSV del SII
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid md:grid-cols-3 gap-4 items-end">
                      <div className="md:col-span-2">
                        <Label className="text-sm font-medium">Archivo CSV (ASN/ASNL/ASA/ASAL)</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="file"
                            accept=".csv"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              Papa.parse(file, {
                                header: true,
                                skipEmptyLines: true,
                                complete: (res) => {
                                  const rows = (res.data as any[]).filter(Boolean);
                                  setCsvRows(rows);
                                  const headers = rows.length ? Object.keys(rows[0]) : [];
                                  setCsvHeaders(headers);

                                  // Auto-mapeo inteligente de columnas
                                  const lower = (s: string) => s.toLowerCase();
                                  const find = (kw: string[]) => headers.find(h =>
                                    kw.some(k => lower(h).includes(k))
                                  ) || "";

                                  setMapCols({
                                    rol: find(["rol", "folio", "identificador"]),
                                    supTerreno: find(["terreno", "sup_ter", "superficie_terreno", "m2_terreno"]),
                                    supCons: find(["constru", "sup_const", "superficie_constru"]),
                                    clase: find(["clase", "clase_constru"]),
                                    calidad: find(["calidad", "calidad_constru"]),
                                  });
                                }
                              });
                            }}
                          />
                          <Button variant="outline">
                            <Upload className="w-4 h-4 mr-2"/>
                            Cargar
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Archivos convertidos del sistema BRNA del SII (formatos ASN, ASNL, ASA, ASAL)
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">ROL a buscar</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            placeholder="15103-XXXX-XX"
                            value={rolQuery}
                            onChange={(e)=>setRolQuery(e.target.value)}
                          />
                          <Button
                            onClick={()=>{
                              if (!rolQuery || !csvRows.length || !mapCols.rol) return;

                              // Normalizar ROL para búsqueda
                              const norm = (s: any) => String(s ?? "").replace(/[^0-9A-Za-z-]/g, "").toUpperCase();
                              const row = csvRows.find(r => norm(r[mapCols.rol]) === norm(rolQuery));
                              if (!row) return;

                              // Parseo inteligente de números
                              const toNum = (v: any) => {
                                if (v==null) return 0;
                                const s = String(v).replace(/\./g,"").replace(/\s/g,"").replace(/,/g,".");
                                const n = parseFloat(s);
                                return isNaN(n) ? 0 : n;
                              };

                              const supTerreno = mapCols.supTerreno ? toNum(row[mapCols.supTerreno]) : param.superficieTerrenoM2;
                              const supCons = mapCols.supCons ? toNum(row[mapCols.supCons]) : 0;
                              const clase = (row[mapCols.clase] ?? "B").toString().toUpperCase() as Clase;
                              const calidad = clamp(parseInt(row[mapCols.calidad]) || 2, 1, clase.startsWith("G") ? 3 : 5);

                              // Actualizar datos
                              setParam(prev => ({ ...prev, superficieTerrenoM2: supTerreno }));
                              if (supCons > 0) {
                                setConstruccion([{
                                  id: crypto.randomUUID(),
                                  nombre: "Construcción (CSV)",
                                  m2: supCons,
                                  clase,
                                  calidad,
                                  subterraneo: false,
                                  factorSB: 1,
                                  depreciacion: 1
                                }]);
                              }
                            }}
                            variant="default"
                          >
                            <Search className="w-4 h-4 mr-2"/>
                            Autocompletar
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Mapeo de columnas */}
                    {csvHeaders.length > 0 && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <h4 className="font-medium mb-3">Mapeo de columnas</h4>
                        <div className="grid md:grid-cols-5 gap-4">
                          {(["rol","supTerreno","supCons","clase","calidad"] as const).map((k)=>(
                            <div key={k}>
                              <Label className="text-xs font-medium">
                                {{
                                  rol: "Columna ROL",
                                  supTerreno: "Sup. Terreno",
                                  supCons: "Sup. Construcción",
                                  clase: "Clase Construcción",
                                  calidad: "Calidad"
                                }[k]}
                              </Label>
                              <Select
                                value={(mapCols as any)[k]}
                                onValueChange={(v)=>setMapCols({...mapCols, [k]: v})}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Seleccionar"/>
                                </SelectTrigger>
                                <SelectContent>
                                  {csvHeaders.map(h=> (
                                    <SelectItem key={h} value={h}>{h}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Preview de datos */}
                    {csvRows.length > 0 && (
                      <div className="rounded-lg border p-4 bg-muted/30 text-xs overflow-auto">
                        <div className="flex justify-between items-center mb-3">
                          <div className="font-medium">Vista previa ({csvRows.length} registros)</div>
                          <Badge variant="secondary">Primeras 5 filas</Badge>
                        </div>
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b">
                              {csvHeaders.map(h => (
                                <th key={h} className="text-left pr-3 py-2 font-medium">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {csvRows.slice(0,5).map((r, i) => (
                              <tr key={i} className="border-b last:border-0">
                                {csvHeaders.map(h => (
                                  <td key={h} className="pr-3 py-2 whitespace-nowrap">
                                    {String(r[h] ?? "")}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* ESCENARIOS */}
            <TabsContent value="escenarios">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="shadow-sm backdrop-blur bg-white/70 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="w-5 h-5" />
                      Escenarios comparativos por calidad
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(() => {
                      // Generar escenarios automáticamente
                      const makeScenario = (label: string, mut: (x: ConstruccionItem) => ConstruccionItem) => {
                        const items = construccion.map(mut);
                        const con = calcularAvaluoConstruccion(items).total;
                        const tot = con + avaluoTerreno;
                        const baseX = calcularContribucionBase(tot, param);
                        const s25 = calc0025(tot, param);
                        const rtot = param.totalBRNA_RUT_CLP > 0 ? param.totalBRNA_RUT_CLP : tot;
                        const s7 = calc7bis(rtot, param);
                        return {
                          label,
                          avaluoTerreno,
                          avaluoConstruccion: con,
                          avaluoTotal: tot,
                          contrib: baseX.total + s25 + s7.total
                        };
                      };

                      const escenarios = [
                        makeScenario("Mejor Calidad (Calidad 1)", x => ({ ...x, calidad: 1 })),
                        makeScenario("Escenario Actual", x => ({ ...x })),
                        makeScenario("Calidad Reducida (+1)", x => ({
                          ...x,
                          calidad: clamp(x.calidad + 1, 1, x.clase.startsWith("G") ? 3 : 5)
                        })),
                      ];

                      return (
                        <>
                          <div className="grid md:grid-cols-3 gap-4">
                            {escenarios.map((s, idx) => (
                              <motion.div
                                key={s.label}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.1 }}
                              >
                                <Card className={`border-2 ${
                                  idx === 1 ? 'border-blue-300 bg-blue-50 dark:bg-blue-950' : 'bg-muted/20'
                                }`}>
                                  <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                      {s.label}
                                      {idx === 1 && <Badge variant="default" className="text-xs">Actual</Badge>}
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-2 text-sm">
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <div className="text-xs text-muted-foreground">Terreno</div>
                                        <div className="font-medium">${fmt(s.avaluoTerreno)}</div>
                                      </div>
                                      <div>
                                        <div className="text-xs text-muted-foreground">Construcción</div>
                                        <div className="font-medium">${fmt(s.avaluoConstruccion)}</div>
                                      </div>
                                    </div>
                                    <div className="pt-2 border-t">
                                      <div className="text-xs text-muted-foreground">Avalúo Total</div>
                                      <div className="font-bold text-lg">${fmt(s.avaluoTotal)}</div>
                                    </div>
                                    <div className="pt-2 border-t">
                                      <div className="text-xs text-muted-foreground">Contribuciones/año</div>
                                      <div className="font-bold text-green-700 dark:text-green-300 text-lg">
                                        ${fmt(s.contrib)}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            ))}
                          </div>

                          <Card className="bg-muted/10">
                            <CardHeader>
                              <CardTitle className="text-base">Comparación Visual</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={escenarios.map(s=>({
                                  name: s.label.replace(" (Calidad", "\n(Cal.").replace(")", ")"),
                                  Contribuciones: s.contrib
                                }))}>
                                  <XAxis
                                    dataKey="name"
                                    interval={0}
                                    angle={-10}
                                    textAnchor="end"
                                    height={60}
                                    tick={{ fontSize: 11 }}
                                  />
                                  <YAxis
                                    tickFormatter={(v) => `$${fmt(v)}`}
                                    tick={{ fontSize: 11 }}
                                  />
                                  <RTooltip formatter={(v: any) => [`$${fmt(v as number)}`, 'Contribución Anual']} />
                                  <Legend />
                                  <Bar
                                    dataKey="Contribuciones"
                                    fill="#3b82f6"
                                    radius={[4, 4, 0, 0]}
                                  />
                                </BarChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* RESULTADO */}
            <TabsContent value="resultado">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Columna principal */}
                  <Card className="lg:col-span-2 backdrop-blur bg-white/70 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileDown className="w-5 h-5" />
                        Resultado Final
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Resumen de avalúos */}
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                          <div className="text-sm text-blue-700 dark:text-blue-300">Avalúo Terreno</div>
                          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">${fmt(avaluoTerreno)}</div>
                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            {fmt(param.superficieTerrenoM2)} m² × ${fmt(param.vutCLP)}/m²
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-xl p-6 border border-green-200 dark:border-green-800">
                          <div className="text-sm text-green-700 dark:text-green-300">Avalúo Construcción</div>
                          <div className="text-2xl font-bold text-green-900 dark:text-green-100">${fmt(avaluoConstruccion)}</div>
                          <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                            {construccion.length} componente{construccion.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                          <div className="text-sm text-purple-700 dark:text-purple-300">Avalúo Total</div>
                          <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">${fmt(avaluoTotal)}</div>
                          <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                            Base tributaria
                          </div>
                        </div>
                      </div>

                      {/* Contribuciones detalladas */}
                      <div className="grid md:grid-cols-2 gap-6">
                        <Card className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              Contribución Base
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-4 h-4 text-muted-foreground"/>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  Cálculo por tramos según avalúo total: {(param.tasaTramo1*100).toFixed(3)}% hasta el umbral, {(param.tasaTramo2*100).toFixed(3)}% sobre el umbral.
                                </TooltipContent>
                              </Tooltip>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between items-center p-3 bg-white dark:bg-slate-700 rounded-lg">
                              <span>Tramo 1:</span>
                              <div className="text-right">
                                <div className="font-medium">${fmt(base.base1)}</div>
                                <div className="text-xs text-muted-foreground">
                                  × {(param.tasaTramo1*100).toFixed(3)}% = ${fmt(base.imp1)}
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-white dark:bg-slate-700 rounded-lg">
                              <span>Tramo 2:</span>
                              <div className="text-right">
                                <div className="font-medium">${fmt(base.base2)}</div>
                                <div className="text-xs text-muted-foreground">
                                  × {(param.tasaTramo2*100).toFixed(3)}% = ${fmt(base.imp2)}
                                </div>
                              </div>
                            </div>
                            <div className="pt-3 border-t border-slate-200 dark:border-slate-600">
                              <div className="flex justify-between items-center font-bold">
                                <span>Total base:</span>
                                <span>${fmt(base.total)}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                          <CardHeader>
                            <CardTitle className="text-base">Sobretasas</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3 text-sm">
                            <div className="p-3 bg-white dark:bg-slate-700 rounded-lg">
                              <div className="flex justify-between items-center">
                                <span>Sobretasa 0.025%:</span>
                                <span className={param.aplica0025 ? "font-medium text-green-700 dark:text-green-400" : "text-muted-foreground"}>
                                  {param.aplica0025 ? `$${fmt(s0025)}` : "No aplica"}
                                </span>
                              </div>
                            </div>

                            <div className="p-3 bg-white dark:bg-slate-700 rounded-lg">
                              <div className="font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                                <span>Artículo 7° bis:</span>
                                <span className="font-bold">${fmt(sieteBis.total)}</span>
                              </div>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span>Tramo 1:</span>
                                  <span>${fmt(sieteBis.base1)} × {(param.tasa7bis1*100).toFixed(3)}% = <b>${fmt(sieteBis.imp1)}</b></span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Tramo 2:</span>
                                  <span>${fmt(sieteBis.base2)} × {(param.tasa7bis2*100).toFixed(3)}% = <b>${fmt(sieteBis.imp2)}</b></span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Tramo 3:</span>
                                  <span>${fmt(sieteBis.base3)} × {(param.tasa7bis3*100).toFixed(3)}% = <b>${fmt(sieteBis.imp3)}</b></span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Totales finales */}
                      <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950 dark:to-blue-950 border-indigo-200 dark:border-indigo-800">
                        <CardContent className="p-6">
                          <div className="grid md:grid-cols-2 gap-6 text-center">
                            <div>
                              <div className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-1">Total Anual</div>
                              <div className="text-4xl font-bold text-indigo-900 dark:text-indigo-100">${fmt(totalAnual)}</div>
                              <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                                Base + Sobretasas
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Cuota Trimestral</div>
                              <div className="text-4xl font-bold text-blue-900 dark:text-blue-100">${fmt(cuota)}</div>
                              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                4 pagos al año
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Detalle construcción */}
                      {detalle.length > 0 && (
                        <Card className="bg-slate-50 dark:bg-slate-800">
                          <CardHeader>
                            <CardTitle className="text-base">Detalle por Componente de Construcción</CardTitle>
                          </CardHeader>
                          <CardContent className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr className="text-left border-b border-slate-200 dark:border-slate-700">
                                  <th className="py-3 pr-4 font-medium">Componente</th>
                                  <th className="py-3 pr-4 font-medium">m²</th>
                                  <th className="py-3 pr-4 font-medium">Clase/Cal.</th>
                                  <th className="py-3 pr-4 font-medium">VUC ($/m²)</th>
                                  <th className="py-3 pr-4 font-medium">Factor</th>
                                  <th className="py-3 pr-4 font-medium text-right">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detalle.map((d) => (
                                  <tr key={d.id} className="border-b border-slate-100 dark:border-slate-700 last:border-0">
                                    <td className="py-3 pr-4 font-medium">{d.nombre}</td>
                                    <td className="py-3 pr-4">{fmt(d.m2)}</td>
                                    <td className="py-3 pr-4">{d.clase}-{d.calidad}</td>
                                    <td className="py-3 pr-4">${fmt((d as any).vuc)}</td>
                                    <td className="py-3 pr-4">
                                      {(d.subterraneo ? d.factorSB : 1)} × {d.depreciacion}
                                    </td>
                                    <td className="py-3 pr-4 text-right font-medium">${fmt((d as any).subtotal)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="border-t-2 border-slate-300 dark:border-slate-600">
                                  <td colSpan={5} className="py-3 pr-4 text-right font-bold">Total Construcción:</td>
                                  <td className="py-3 pr-4 text-right font-bold">${fmt(avaluoConstruccion)}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </CardContent>
                        </Card>
                      )}
                    </CardContent>
                  </Card>

                  {/* Sidebar - Exportar y métricas */}
                  <div className="space-y-6">
                    <Card className="backdrop-blur bg-white/70 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-base">Exportar Resultados</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Genera reportes para stakeholders y documentación oficial.
                        </p>
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => window.print()}
                          >
                            <FileDown className="w-4 h-4 mr-2"/>
                            Imprimir / PDF
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="backdrop-blur bg-white/70 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-base">Métricas Clave</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="p-3 bg-muted/20 rounded-lg">
                          <div className="text-xs text-muted-foreground">Avalúo por m² terreno</div>
                          <div className="text-lg font-bold">
                            ${fmt(avaluoTotal / param.superficieTerrenoM2)}
                          </div>
                        </div>
                        <div className="p-3 bg-muted/20 rounded-lg">
                          <div className="text-xs text-muted-foreground">Tasa efectiva total</div>
                          <div className="text-lg font-bold">
                            {((totalAnual / avaluoTotal) * 100).toFixed(3)}%
                          </div>
                        </div>
                        <div className="p-3 bg-muted/20 rounded-lg">
                          <div className="text-xs text-muted-foreground">Distribución avalúo</div>
                          <div className="text-sm">
                            <div>Terreno: {((avaluoTerreno / avaluoTotal) * 100).toFixed(0)}%</div>
                            <div>Construcción: {((avaluoConstruccion / avaluoTotal) * 100).toFixed(0)}%</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            {/* AYUDA */}
            <TabsContent value="ayuda">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="grid lg:grid-cols-2 gap-6">
                  <Card className="shadow-sm backdrop-blur bg-white/70 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Info className="w-5 h-5" />
                        Guía de Uso
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3 text-sm leading-relaxed">
                        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">1. Configurar Predio</h4>
                          <p className="text-blue-700 dark:text-blue-300">
                            Selecciona la comuna, ingresa superficie de terreno, VUT de la Área Homogénea y ajusta coeficientes CA, CG, CMP.
                          </p>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                          <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">2. Definir Construcciones</h4>
                          <p className="text-green-700 dark:text-green-300">
                            Agrega componentes con clase (A/B/C/D/GA/GB/GC), calidad (1-5), superficie y características especiales.
                          </p>
                        </div>
                        <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                          <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">3. Ajustar Parámetros</h4>
                          <p className="text-purple-700 dark:text-purple-300">
                            Actualiza tasas de contribución, valores UTA y parámetros del artículo 7° bis según normativa vigente.
                          </p>
                        </div>
                        <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                          <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">4. Importar Datos SII</h4>
                          <p className="text-amber-700 dark:text-amber-300">
                            Sube archivos CSV del sistema BRNA, mapea columnas y autocompleta datos por ROL.
                          </p>
                        </div>
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-950 rounded-lg">
                          <h4 className="font-semibold text-indigo-800 dark:text-indigo-200 mb-2">5. Comparar Escenarios</h4>
                          <p className="text-indigo-700 dark:text-indigo-300">
                            Analiza diferentes niveles de calidad constructiva y su impacto en contribuciones.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm backdrop-blur bg-white/70 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        Conceptos Clave
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3 text-sm">
                        <div>
                          <h4 className="font-medium">VUT - Valor Unitario de Terreno</h4>
                          <p className="text-muted-foreground">
                            Valor por m² establecido para cada Área Homogénea según estudio de mercado del SII.
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium">VUC - Valor Unitario de Construcción</h4>
                          <p className="text-muted-foreground">
                            Valor por m² según tipo de construcción (clase) y nivel de terminaciones (calidad).
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium">Coeficientes de Ajuste</h4>
                          <p className="text-muted-foreground">
                            <strong>CA:</strong> Coeficiente de altura • <strong>CG:</strong> Coeficiente guía de plaza • <strong>CMP:</strong> Coeficiente superficie múltiple
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium">Factor Subterráneo (SB)</h4>
                          <p className="text-muted-foreground">
                            Reducción aplicada a construcciones bajo cota 0 (típicamente 0.7).
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium">Artículo 7° bis</h4>
                          <p className="text-muted-foreground">
                            Sobretasa progresiva sobre avalúo acumulado del contribuyente (BRNA).
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium">Archivos CSV del SII</h4>
                          <p className="text-muted-foreground">
                            ASN/ASNL (avalúo), ASA/ASAL (contribución) convertidos del sistema BRNA.
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                        <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">Importante</h4>
                        <p className="text-red-700 dark:text-red-300 text-sm">
                          Esta calculadora es para estimaciones. Los valores oficiales deben consultarse con profesionales competentes y entidades oficiales.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
}
