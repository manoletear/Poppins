// =============================================================================
// Employer (Empleador) Module Types
// Poppins - Home Services Management Platform
// =============================================================================

// Employer profile - lives in Supabase, linked to employees via contract number
export interface EmpleadorProfile {
  id: string;
  auth_user_id: string;
  rut: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  fecha_nacimiento: string;
  direccion: string;
  comuna: string;
  ciudad: string;
  plan: 'free' | 'premium' | 'enterprise';
  max_cuentas: number; // 2 free accounts
  plan_tipo: 'starter' | 'casa' | 'hogar';
  plan_inicio: string | null;
  plan_renovacion: string | null;
  onboarding_pagos_completado: boolean;
  created_at: string;
  updated_at: string;
}

// Family members (spouse, children)
export interface FamiliarEmpleador {
  id: string;
  empleador_id: string;
  tipo: 'conyuge' | 'hijo' | 'otro';
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  edad: number;
  alergias: string | null;
  condiciones_medicas: string | null;
  notas: string | null;
}

// Pets
export interface MascotaEmpleador {
  id: string;
  empleador_id: string;
  nombre: string;
  tipo: 'perro' | 'gato' | 'ave' | 'pez' | 'otro';
  raza: string | null;
  edad: number | null;
  notas: string | null; // needs walking, special diet, etc.
}

// Home details - critical for determining services needed
export interface ViviendaEmpleador {
  id: string;
  empleador_id: string;
  tipo: 'casa' | 'departamento' | 'parcela';
  direccion: string;
  comuna: string;
  metros_construidos: number; // m2
  metros_terreno: number; // m2 total
  pisos: number;
  dormitorios: number;
  banos: number;
  tiene_piscina: boolean;
  tiene_jardin: boolean;
  metros_jardin: number | null;
  tiene_terraza: boolean;
  tiene_quincho: boolean;
  tiene_patio_interior: boolean;
  metros_patio: number | null;
  estacionamientos: number;
  notas: string | null;
}

// Work preferences - employer priorities for domestic worker
export interface PreferenciasTrabajo {
  id: string;
  empleador_id: string;
  prioridades: PrioridadLaboral[]; // ordered by priority
  notas_generales: string | null;
  updated_at: string;
}

export interface PrioridadLaboral {
  categoria:
    | 'aseo'
    | 'cocina'
    | 'cuidado_ninos'
    | 'lavado_planchado'
    | 'compras'
    | 'cuidado_mascotas'
    | 'jardineria'
    | 'piscina'
    | 'orden_general'
    | 'otro';
  prioridad: number; // 1 = highest
  notas: string | null;
}

// Tasks assigned by employer to employees
export interface TareaEmpleado {
  id: string;
  empleador_id: string;
  empleado_id: string;
  titulo: string;
  descripcion: string | null;
  categoria:
    | 'aseo'
    | 'cocina'
    | 'compras'
    | 'cuidado_ninos'
    | 'jardineria'
    | 'piscina'
    | 'mascotas'
    | 'otro';
  prioridad: 'alta' | 'media' | 'baja';
  estado: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada';
  fecha_asignacion: string;
  fecha_limite: string | null;
  fecha_completada: string | null;
  recurrente: boolean;
  frecuencia_recurrencia: 'diaria' | 'semanal' | 'mensual' | null;
  created_at: string;
}

// Reminders (medicine, walk dog, check supplies, etc.)
export interface Recordatorio {
  id: string;
  empleador_id: string;
  empleado_id: string | null; // null = employer's own reminder
  titulo: string;
  descripcion: string | null;
  hora: string; // HH:mm
  dias_semana: number[]; // 0=Sun, 1=Mon... 6=Sat
  activo: boolean;
  tipo: 'medicamento' | 'mascota' | 'compras' | 'tarea' | 'otro';
  created_at: string;
}

// Shopping lists
export interface ListaCompras {
  id: string;
  empleador_id: string;
  nombre: string;
  tipo: 'personalizada' | 'predefinida';
  plantilla: string | null; // 'asado' | 'cumpleanos' | 'semanal' | etc.
  estado: 'abierta' | 'cerrada' | 'en_compras' | 'completada';
  creada_por: string; // user id (employer or employee)
  cerrada_por: string | null;
  fecha_cierre: string | null;
  created_at: string;
}

export interface ItemListaCompras {
  id: string;
  lista_id: string;
  nombre: string;
  cantidad: number;
  unidad: string; // 'kg' | 'lt' | 'un' | 'paquete'
  categoria:
    | 'carnes'
    | 'verduras'
    | 'frutas'
    | 'lacteos'
    | 'bebidas'
    | 'limpieza'
    | 'otros';
  comprado: boolean;
  agregado_por: string; // user id
  notas: string | null;
}

// Shopping list templates
export interface PlantillaListaCompras {
  id: string;
  nombre: string; // 'Asado', 'Cumpleaños', 'Semanal básica'
  items: {
    nombre: string;
    cantidad: number;
    unidad: string;
    categoria: string;
  }[];
  es_global: boolean; // true = Poppins template, false = employer custom
  empleador_id: string | null;
}

// Employee contracts (links employer <-> employee, KEY relationship)
export interface ContratoEmpleado {
  id: string;
  numero_contrato: string; // KEY ID linking employer and employee
  empleador_id: string;
  empleado_id: string;
  tipo_empleo: 'puertas_adentro' | 'puertas_afuera';
  labor:
    | 'empleada_domestica'
    | 'jardinero'
    | 'piscinero'
    | 'nana'
    | 'cocinera'
    | 'chofer'
    | 'otro';
  descripcion_labor: string | null;
  fecha_inicio: string;
  fecha_termino: string | null;
  sueldo_mensual: number;
  horario_entrada: string; // HH:mm
  horario_salida: string; // HH:mm
  dias_trabajo: number[]; // 1=Mon...5=Fri
  estado: 'activo' | 'suspendido' | 'terminado';
  created_at: string;
}

// Time tracking (digital check-in/out)
export interface MarcajeHorario {
  id: string;
  contrato_id: string;
  empleado_id: string;
  fecha: string;
  hora_entrada: string | null;
  hora_salida: string | null;
  horas_trabajadas: number | null;
  tipo: 'normal' | 'extra' | 'feriado';
  notas: string | null;
}

// Payments (rent, common expenses, salaries via credit card)
export interface PagoEmpleador {
  id: string;
  empleador_id: string;
  tipo:
    | 'arriendo'
    | 'gastos_comunes'
    | 'sueldo_empleado'
    | 'leyes_sociales'
    | 'otro';
  monto: number;
  metodo_pago: 'tarjeta_credito' | 'transferencia' | 'efectivo';
  puntos_acumulados: number;
  referencia_empleado_id: string | null; // for salary payments
  periodo: string; // YYYY-MM
  estado: 'pendiente' | 'procesado' | 'pagado' | 'rechazado';
  fecha_pago: string | null;
  comision_porcentaje: number | null;
  comision_monto: number | null;
  tarjeta_id: string | null;
  puntos_banco_estimados: number | null;
  created_at: string;
}

// Pending requests from employees
export interface SolicitudEmpleado {
  id: string;
  contrato_id: string;
  empleado_id: string;
  empleador_id: string;
  tipo:
    | 'permiso_medico'
    | 'vacaciones'
    | 'dia_administrativo'
    | 'antiguedad'
    | 'otro';
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  dias: number;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  respondida_por: string | null;
  fecha_respuesta: string | null;
  created_at: string;
}

// Legal news
export interface NoticiaLegal {
  id: string;
  titulo: string;
  resumen: string;
  contenido: string;
  categoria: 'laboral' | 'impuestos' | 'prevision' | 'salud' | 'otro';
  fecha_publicacion: string;
  fuente: string;
  url_fuente: string | null;
  relevante_para: 'empleador' | 'empleado' | 'ambos';
}

// Dashboard summary type
export interface DashboardEmpleador {
  empleador: EmpleadorProfile;
  vivienda: ViviendaEmpleador | null;
  familiares: FamiliarEmpleador[];
  mascotas: MascotaEmpleador[];
  contratos_activos: ContratoEmpleado[];
  solicitudes_pendientes: SolicitudEmpleado[];
  tareas_hoy: TareaEmpleado[];
  recordatorios_hoy: Recordatorio[];
  listas_compras_abiertas: ListaCompras[];
  marcajes_hoy: MarcajeHorario[];
  pagos_pendientes: PagoEmpleador[];
  noticias_recientes: NoticiaLegal[];
  puntos_acumulados: number;
}

// Credit card registered by employer
export interface TarjetaCliente {
  id: string;
  empleador_id: string;
  bin: string;
  ultimos_4: string;
  banco: string;
  tipo_tarjeta: 'visa' | 'mastercard' | 'amex' | 'diners' | 'otra';
  categoria: string;
  programa_puntos: string;
  tasa_puntos: number;
  activa: boolean;
  es_principal: boolean;
  created_at: string;
}
