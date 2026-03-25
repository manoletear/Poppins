// src/lib/pagos/types.ts

// ── Card & Bank ──────────────────────────────────────────────────────
export interface TarjetaCliente {
  id: string;
  empleador_id: string;
  bin: string;              // first 6-8 digits
  ultimos_4: string;        // last 4 digits (display)
  banco: string;            // "Santander", "BCI", "Banco Estado", etc.
  tipo_tarjeta: 'visa' | 'mastercard' | 'amex' | 'diners' | 'otra';
  categoria: 'classic' | 'gold' | 'platinum' | 'signature' | 'infinite' | 'black' | 'otra';
  programa_puntos: string;  // "Latam Pass", "Dollar", "CMR Puntos", etc.
  tasa_puntos: number;      // puntos por cada CLP $1.000 transado
  activa: boolean;
  es_principal: boolean;
  created_at: string;
}

export interface BeneficioBanco {
  id: string;
  banco: string;
  tipo_tarjeta: string;
  categoria: string;
  programa_puntos: string;
  tasa_base: number;        // puntos por $1.000
  tasa_promocional: number | null;
  promo_descripcion: string | null;
  promo_vigente_hasta: string | null;
  categorias_bonus: string[];  // ["viajes", "servicios"]
  valor_punto_clp: number;     // valor aprox en CLP de 1 punto
  created_at: string;
  updated_at: string;
}

export interface BinLookupResult {
  banco: string;
  tipo_tarjeta: 'visa' | 'mastercard' | 'amex' | 'diners' | 'otra';
  categoria: string;
  programa_puntos: string;
  tasa_puntos: number;
  logo_url?: string;
}

// ── Plans ────────────────────────────────────────────────────────────
export type PlanTipo = 'starter' | 'casa' | 'hogar';

export interface PlanSuscripcion {
  tipo: PlanTipo;
  nombre: string;
  precio_mensual: number;    // CLP, 0 for free
  max_cuentas: number;       // 2, 5, unlimited (-1)
  comision_porcentaje: number; // 3.5, 2.5, 1.8
  beneficios: string[];
}

// ── Account Discovery ────────────────────────────────────────────────
export type DiscoveryMethod = 'direccion' | 'rut' | 'rol_propiedad' | 'empresa' | 'servicios';

export interface CuentaDiscoveryResult {
  tipo: string;
  proveedor: string;
  numero_cliente: string | null;
  monto_estimado: number | null;
  fuente: 'api' | 'manual';
  ya_agregada: boolean;
}

// ── Points Projection ────────────────────────────────────────────────
export interface ProyeccionPuntos {
  puntos_mes_actual: number;
  puntos_acumulados: number;
  valor_estimado_clp: number;
  meta_pasaje: MetaPasaje | null;
  porcentaje_meta: number;
  meses_restantes: number;
}

export interface MetaPasaje {
  destino: string;
  millas_necesarias: number;
  millas_actuales: number;
}

// ── Onboarding State ─────────────────────────────────────────────────
export interface OnboardingState {
  tarjeta_registrada: boolean;
  primera_cuenta_agregada: boolean;
  primer_pago_realizado: boolean;
  plan_seleccionado: boolean;
}
