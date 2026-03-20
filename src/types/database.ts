// ============================================
// Tipos generados desde el esquema Supabase
// poppins-erp (sczxyejqooqthxcxksah)
// ============================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      employers: {
        Row: {
          id: string;
          auth_user_id: string | null;
          rut: string;
          nombre: string;
          email: string | null;
          telefono: string | null;
          direccion: string | null;
          comuna: string | null;
          region: string | null;
          plan: 'free' | 'premium' | 'enterprise';
          buk_company_id: string | null;
          buk_api_token_encrypted: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          rut: string;
          nombre: string;
          email?: string | null;
          telefono?: string | null;
          direccion?: string | null;
          comuna?: string | null;
          region?: string | null;
          plan?: 'free' | 'premium' | 'enterprise';
          buk_company_id?: string | null;
          buk_api_token_encrypted?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['employers']['Insert']>;
      };
      employees: {
        Row: {
          id: string;
          employer_id: string;
          buk_id: number | null;
          rut: string;
          nombre: string;
          apellido: string;
          email: string | null;
          telefono: string | null;
          direccion: string | null;
          cargo: string;
          tipo_contrato: 'Indefinido' | 'Plazo fijo' | 'Por obra';
          fecha_ingreso: string;
          fecha_termino: string | null;
          estado: 'activo' | 'inactivo' | 'licencia' | 'vacaciones' | 'despido';
          sueldo_base: number;
          afp: string | null;
          salud: string | null;
          plan_salud_uf: number | null;
          mutual: string | null;
          horario_semanal: number;
          dias_vacaciones_base: number;
          puertas_adentro: boolean;
          foto_url: string | null;
          notas: string | null;
          buk_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employer_id: string;
          buk_id?: number | null;
          rut: string;
          nombre: string;
          apellido: string;
          email?: string | null;
          telefono?: string | null;
          direccion?: string | null;
          cargo?: string;
          tipo_contrato?: 'Indefinido' | 'Plazo fijo' | 'Por obra';
          fecha_ingreso: string;
          fecha_termino?: string | null;
          estado?: 'activo' | 'inactivo' | 'licencia' | 'vacaciones' | 'despido';
          sueldo_base: number;
          afp?: string | null;
          salud?: string | null;
          plan_salud_uf?: number | null;
          mutual?: string | null;
          horario_semanal?: number;
          dias_vacaciones_base?: number;
          puertas_adentro?: boolean;
          foto_url?: string | null;
          notas?: string | null;
          buk_synced_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['employees']['Insert']>;
      };
      payroll: {
        Row: {
          id: string;
          employee_id: string;
          buk_id: number | null;
          periodo: string;
          dias_trabajados: number;
          sueldo_base: number;
          horas_extra: number;
          monto_horas_extra: number;
          bonos: number;
          gratificacion: number;
          colacion: number;
          movilizacion: number;
          otros_haberes: number;
          total_haberes: number;
          desc_afp: number;
          desc_salud: number;
          desc_cesantia: number;
          impuesto_unico: number;
          otros_descuentos: number;
          total_descuentos: number;
          sueldo_liquido: number;
          estado: 'borrador' | 'calculado' | 'aprobado' | 'pagado';
          fecha_pago: string | null;
          pdf_url: string | null;
          buk_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          buk_id?: number | null;
          periodo: string;
          dias_trabajados?: number;
          sueldo_base: number;
          horas_extra?: number;
          monto_horas_extra?: number;
          bonos?: number;
          gratificacion?: number;
          colacion?: number;
          movilizacion?: number;
          otros_haberes?: number;
          total_haberes: number;
          desc_afp?: number;
          desc_salud?: number;
          desc_cesantia?: number;
          impuesto_unico?: number;
          otros_descuentos?: number;
          total_descuentos: number;
          sueldo_liquido: number;
          estado?: 'borrador' | 'calculado' | 'aprobado' | 'pagado';
          fecha_pago?: string | null;
          pdf_url?: string | null;
        };
        Update: Partial<Database['public']['Tables']['payroll']['Insert']>;
      };
      absences: {
        Row: {
          id: string;
          employee_id: string;
          buk_id: number | null;
          tipo: string;
          fecha_inicio: string;
          fecha_fin: string;
          dias: number;
          estado: 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada';
          aprobado_por: string | null;
          fecha_aprobacion: string | null;
          observaciones: string | null;
          documento_url: string | null;
          buk_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          buk_id?: number | null;
          tipo: string;
          fecha_inicio: string;
          fecha_fin: string;
          dias: number;
          estado?: 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada';
          aprobado_por?: string | null;
          observaciones?: string | null;
          documento_url?: string | null;
        };
        Update: Partial<Database['public']['Tables']['absences']['Insert']>;
      };
      benefits: {
        Row: {
          id: string;
          employer_id: string;
          nombre: string;
          descripcion: string | null;
          monto: number;
          tipo: 'mensual' | 'anual' | 'unico';
          activo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          employer_id: string;
          nombre: string;
          descripcion?: string | null;
          monto?: number;
          tipo?: 'mensual' | 'anual' | 'unico';
          activo?: boolean;
        };
        Update: Partial<Database['public']['Tables']['benefits']['Insert']>;
      };
      employee_benefits: {
        Row: {
          id: string;
          employee_id: string;
          benefit_id: string;
          fecha_inicio: string;
          fecha_fin: string | null;
          activo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          benefit_id: string;
          fecha_inicio?: string;
          fecha_fin?: string | null;
          activo?: boolean;
        };
        Update: Partial<Database['public']['Tables']['employee_benefits']['Insert']>;
      };
      documents: {
        Row: {
          id: string;
          employee_id: string;
          tipo: string;
          nombre: string;
          file_url: string;
          file_size: number | null;
          periodo: string | null;
          firmado: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          tipo: string;
          nombre: string;
          file_url: string;
          file_size?: number | null;
          periodo?: string | null;
          firmado?: boolean;
        };
        Update: Partial<Database['public']['Tables']['documents']['Insert']>;
      };
      buk_sync_log: {
        Row: {
          id: string;
          employer_id: string;
          endpoint: string;
          direction: 'pull' | 'push';
          records_synced: number;
          status: 'success' | 'partial' | 'error';
          error_message: string | null;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          employer_id: string;
          endpoint: string;
          direction: 'pull' | 'push';
          records_synced?: number;
          status: 'success' | 'partial' | 'error';
          error_message?: string | null;
          completed_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['buk_sync_log']['Insert']>;
      };
      audit_log: {
        Row: {
          id: string;
          user_id: string | null;
          tabla: string;
          registro_id: string;
          accion: 'create' | 'update' | 'delete';
          cambios: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          tabla: string;
          registro_id: string;
          accion: 'create' | 'update' | 'delete';
          cambios?: Json | null;
          ip_address?: string | null;
        };
        Update: Partial<Database['public']['Tables']['audit_log']['Insert']>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// ── Shortcuts ──
export type Employer = Database['public']['Tables']['employers']['Row'];
export type Employee = Database['public']['Tables']['employees']['Row'];
export type Payroll = Database['public']['Tables']['payroll']['Row'];
export type Absence = Database['public']['Tables']['absences']['Row'];
export type Benefit = Database['public']['Tables']['benefits']['Row'];
export type EmployeeBenefit = Database['public']['Tables']['employee_benefits']['Row'];
export type Document = Database['public']['Tables']['documents']['Row'];
export type BukSyncLog = Database['public']['Tables']['buk_sync_log']['Row'];
export type AuditLog = Database['public']['Tables']['audit_log']['Row'];
