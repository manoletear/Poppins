export type SeccionPermiso =
  | 'inicio'
  | 'vivienda'
  | 'familia'
  | 'empleados'
  | 'contratos'
  | 'horarios'
  | 'pagar_mes'
  | 'liquidaciones'
  | 'remuneraciones'
  | 'solicitudes'
  | 'tareas'
  | 'compras'
  | 'recordatorios'
  | 'noticias';

export type Permisos = Record<SeccionPermiso, boolean>;

export const PERMISOS_DEFAULT_FAMILIAR: Permisos = {
  inicio: true,
  vivienda: true,
  familia: true,
  empleados: false,
  contratos: false,
  horarios: false,
  pagar_mes: false,
  liquidaciones: false,
  remuneraciones: false,
  solicitudes: false,
  tareas: true,
  compras: true,
  recordatorios: true,
  noticias: true,
};

export const PERMISOS_LABELS: Record<SeccionPermiso, string> = {
  inicio: 'Inicio',
  vivienda: 'Mi Vivienda',
  familia: 'Mi Familia',
  empleados: 'Empleados',
  contratos: 'Contratos',
  horarios: 'Horarios',
  pagar_mes: 'Pagar el mes',
  liquidaciones: 'Liquidaciones',
  remuneraciones: 'Modo experto',
  solicitudes: 'Solicitudes',
  tareas: 'Tareas del día',
  compras: 'Lista de compras',
  recordatorios: 'Recordatorios',
  noticias: 'Novedades legales',
};

export interface MiembroHogar {
  auth_user_id: string;
  empleador_id: string;
  rol: 'owner' | 'admin' | 'contador' | 'viewer';
  etiqueta: string | null;
  apodo: string | null;
  permisos: Permisos;
  estado: 'pendiente' | 'activo';
  invitacion_email: string | null;
  created_at: string;
  // joined from user_profiles
  nombre?: string | null;
  apellido?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}
