// ============================================
// Tipos generados desde el esquema Supabase
// poppins-erp (sczxyejqooqthxcxksah)
// Actualizado: 2026-04-02
// ============================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      // ── 1. Empleadores ──
      empleadores: {
        Row: {
          id: string;
          auth_user_id: string | null;
          cliente_id: string | null;
          rut: string;
          nombre: string;
          email: string | null;
          telefono: string | null;
          direccion: string | null;
          comuna: string | null;
          region: string | null;
          plan_tipo: 'free' | 'premium' | 'enterprise';
          estado: string;
          fecha_nacimiento: string | null;
          genero: string | null;
          foto_url: string | null;
          preferencias: Json | null;
          onboarding_completado: boolean;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          cliente_id?: string | null;
          rut: string;
          nombre: string;
          email?: string | null;
          telefono?: string | null;
          direccion?: string | null;
          comuna?: string | null;
          region?: string | null;
          plan_tipo?: 'free' | 'premium' | 'enterprise';
          estado?: string;
          fecha_nacimiento?: string | null;
          genero?: string | null;
          foto_url?: string | null;
          preferencias?: Json | null;
          onboarding_completado?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['empleadores']['Insert']>;
      };

      // ── 2. Trabajadores ──
      trabajadores: {
        Row: {
          id: string;
          cliente_id: string | null;
          rut: string;
          nombre: string;
          apellido_paterno: string;
          apellido_materno: string | null;
          fecha_nacimiento: string | null;
          genero: string | null;
          estado_civil: string | null;
          nacionalidad: string | null;
          email: string | null;
          telefono: string | null;
          direccion: string | null;
          comuna: string | null;
          region: string | null;
          cargo: string | null;
          estado: 'activo' | 'inactivo' | 'licencia' | 'vacaciones' | 'despido' | 'finiquitado';
          sueldo_base: number;
          afp_id: string | null;
          salud_id: string | null;
          plan_salud_uf: number | null;
          pactado_salud: number | null;
          cargas_familiares: number;
          horario_semanal: number;
          dias_vacaciones_base: number;
          dias_vacaciones_acumulados: number;
          puertas_adentro: boolean;
          fecha_ingreso: string | null;
          tipo_contrato: string | null;
          nivel_educacion: string | null;
          banco: string | null;
          tipo_cuenta: string | null;
          numero_cuenta: string | null;
          foto_url: string | null;
          notas: string | null;
          auth_user_id: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cliente_id?: string | null;
          rut: string;
          nombre: string;
          apellido_paterno: string;
          apellido_materno?: string | null;
          fecha_nacimiento?: string | null;
          genero?: string | null;
          estado_civil?: string | null;
          nacionalidad?: string | null;
          email?: string | null;
          telefono?: string | null;
          direccion?: string | null;
          comuna?: string | null;
          region?: string | null;
          cargo?: string | null;
          estado?: 'activo' | 'inactivo' | 'licencia' | 'vacaciones' | 'despido' | 'finiquitado';
          sueldo_base: number;
          afp_id?: string | null;
          salud_id?: string | null;
          plan_salud_uf?: number | null;
          pactado_salud?: number | null;
          cargas_familiares?: number;
          horario_semanal?: number;
          dias_vacaciones_base?: number;
          dias_vacaciones_acumulados?: number;
          puertas_adentro?: boolean;
          fecha_ingreso?: string | null;
          tipo_contrato?: string | null;
          nivel_educacion?: string | null;
          banco?: string | null;
          tipo_cuenta?: string | null;
          numero_cuenta?: string | null;
          foto_url?: string | null;
          notas?: string | null;
          auth_user_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['trabajadores']['Insert']>;
      };

      // ── 3. Contratos ──
      contratos: {
        Row: {
          id: string;
          empleador_id: string;
          trabajador_id: string;
          cliente_id: string | null;
          numero_contrato: string | null;
          tipo_contrato: 'Indefinido' | 'Plazo fijo' | 'Por obra' | 'Temporada';
          puertas_adentro: boolean;
          sueldo_base: number;
          fecha_inicio: string;
          fecha_termino: string | null;
          jornada: string | null;
          horas_semanales: number | null;
          dias_vacaciones: number | null;
          colacion: number;
          movilizacion: number;
          otros_haberes: number;
          gratificacion_tipo: string | null;
          estado: 'activo' | 'terminado' | 'por_vencer' | 'borrador';
          motivo_termino: string | null;
          fecha_termino_real: string | null;
          observaciones: string | null;
          documento_url: string | null;
          firmado: boolean;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          empleador_id: string;
          trabajador_id: string;
          cliente_id?: string | null;
          numero_contrato?: string | null;
          tipo_contrato?: 'Indefinido' | 'Plazo fijo' | 'Por obra' | 'Temporada';
          puertas_adentro?: boolean;
          sueldo_base: number;
          fecha_inicio: string;
          fecha_termino?: string | null;
          jornada?: string | null;
          horas_semanales?: number | null;
          dias_vacaciones?: number | null;
          colacion?: number;
          movilizacion?: number;
          otros_haberes?: number;
          gratificacion_tipo?: string | null;
          estado?: 'activo' | 'terminado' | 'por_vencer' | 'borrador';
          motivo_termino?: string | null;
          fecha_termino_real?: string | null;
          observaciones?: string | null;
          documento_url?: string | null;
          firmado?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['contratos']['Insert']>;
      };

      // ── 4. Liquidaciones ──
      liquidaciones: {
        Row: {
          id: string;
          trabajador_id: string;
          contrato_id: string | null;
          periodo: string;
          anio: number | null;
          mes: number | null;
          dias_trabajados: number;
          sueldo_base: number;
          gratificacion: number;
          colacion: number;
          movilizacion: number;
          horas_extra: number;
          monto_horas_extra: number;
          bonos: number;
          asignacion_familiar: number;
          otros_haberes: number;
          total_haberes: number;
          desc_afp: number;
          desc_salud: number;
          desc_adicional_salud: number;
          desc_cesantia_trabajador: number;
          desc_cesantia_empleador: number;
          impuesto_unico: number;
          otros_descuentos: number;
          total_descuentos: number;
          sueldo_liquido: number;
          liquido_pagar: number;
          renta_imponible: number;
          renta_tributable: number;
          costo_empresa: number;
          afp_nombre: string | null;
          salud_nombre: string | null;
          estado: 'borrador' | 'calculado' | 'aprobado' | 'pagado' | 'anulado';
          fecha_pago: string | null;
          pdf_url: string | null;
          observaciones: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trabajador_id: string;
          contrato_id?: string | null;
          periodo: string;
          anio?: number | null;
          mes?: number | null;
          dias_trabajados?: number;
          sueldo_base: number;
          gratificacion?: number;
          colacion?: number;
          movilizacion?: number;
          horas_extra?: number;
          monto_horas_extra?: number;
          bonos?: number;
          asignacion_familiar?: number;
          otros_haberes?: number;
          total_haberes: number;
          desc_afp?: number;
          desc_salud?: number;
          desc_adicional_salud?: number;
          desc_cesantia_trabajador?: number;
          desc_cesantia_empleador?: number;
          impuesto_unico?: number;
          otros_descuentos?: number;
          total_descuentos: number;
          sueldo_liquido: number;
          liquido_pagar?: number;
          renta_imponible?: number;
          renta_tributable?: number;
          costo_empresa?: number;
          afp_nombre?: string | null;
          salud_nombre?: string | null;
          estado?: 'borrador' | 'calculado' | 'aprobado' | 'pagado' | 'anulado';
          fecha_pago?: string | null;
          pdf_url?: string | null;
          observaciones?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['liquidaciones']['Insert']>;
      };

      // ── 5. Pagos Empleador ──
      pagos_empleador: {
        Row: {
          id: string;
          empleador_id: string;
          trabajador_id: string | null;
          liquidacion_id: string | null;
          tipo: string | null;
          monto: number;
          moneda: string;
          estado: 'pendiente' | 'procesando' | 'pagado' | 'fallido' | 'reembolsado';
          metodo_pago: string | null;
          flow_token: string | null;
          flow_order_id: string | null;
          flow_payment_status: string | null;
          referencia: string | null;
          fecha_pago: string | null;
          comprobante_url: string | null;
          puntos_acumulados: number;
          tarjeta_id: string | null;
          descripcion: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          empleador_id: string;
          trabajador_id?: string | null;
          liquidacion_id?: string | null;
          tipo?: string | null;
          monto: number;
          moneda?: string;
          estado?: 'pendiente' | 'procesando' | 'pagado' | 'fallido' | 'reembolsado';
          metodo_pago?: string | null;
          flow_token?: string | null;
          flow_order_id?: string | null;
          flow_payment_status?: string | null;
          referencia?: string | null;
          fecha_pago?: string | null;
          comprobante_url?: string | null;
          puntos_acumulados?: number;
          tarjeta_id?: string | null;
          descripcion?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['pagos_empleador']['Insert']>;
      };

      // ── 6. Cuentas de Pago ──
      cuentas_pago: {
        Row: {
          id: string;
          empleador_id: string | null;
          trabajador_id: string | null;
          banco: string;
          tipo_cuenta: string;
          numero_cuenta: string;
          rut: string;
          nombre_titular: string;
          email_titular: string | null;
          activa: boolean;
          principal: boolean;
          verificada: boolean;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          empleador_id?: string | null;
          trabajador_id?: string | null;
          banco: string;
          tipo_cuenta: string;
          numero_cuenta: string;
          rut: string;
          nombre_titular: string;
          email_titular?: string | null;
          activa?: boolean;
          principal?: boolean;
          verificada?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['cuentas_pago']['Insert']>;
      };

      // ── 7. Tareas ──
      tareas: {
        Row: {
          id: string;
          empleador_id: string;
          trabajador_id: string | null;
          titulo: string;
          descripcion: string | null;
          categoria: string | null;
          prioridad: 'baja' | 'media' | 'alta' | 'urgente';
          estado: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada';
          fecha: string;
          hora_inicio: string | null;
          hora_fin: string | null;
          hora: string | null;
          recurrente: boolean;
          patron_recurrencia: Json | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          empleador_id: string;
          trabajador_id?: string | null;
          titulo: string;
          descripcion?: string | null;
          categoria?: string | null;
          prioridad?: 'baja' | 'media' | 'alta' | 'urgente';
          estado?: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada';
          fecha: string;
          hora_inicio?: string | null;
          hora_fin?: string | null;
          hora?: string | null;
          recurrente?: boolean;
          patron_recurrencia?: Json | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tareas']['Insert']>;
      };

      // ── 8. Solicitudes Empleado ──
      solicitudes_empleado: {
        Row: {
          id: string;
          empleador_id: string;
          trabajador_id: string;
          tipo: 'vacaciones' | 'permiso' | 'licencia' | 'adelanto' | 'otro';
          estado: 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada';
          fecha_inicio: string | null;
          fecha_fin: string | null;
          dias: number | null;
          motivo: string | null;
          descripcion: string | null;
          fecha_respuesta: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          empleador_id: string;
          trabajador_id: string;
          tipo: 'vacaciones' | 'permiso' | 'licencia' | 'adelanto' | 'otro';
          estado?: 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada';
          fecha_inicio?: string | null;
          fecha_fin?: string | null;
          dias?: number | null;
          motivo?: string | null;
          descripcion?: string | null;
          fecha_respuesta?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['solicitudes_empleado']['Insert']>;
      };

      // ── 9. Marcajes Horario ──
      marcajes_horario: {
        Row: {
          id: string;
          empleador_id: string;
          trabajador_id: string;
          fecha: string;
          hora_entrada: string | null;
          hora_salida: string | null;
          horas_trabajadas: number | null;
          tipo: string | null;
          ubicacion: string | null;
          notas: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          empleador_id: string;
          trabajador_id: string;
          fecha: string;
          hora_entrada?: string | null;
          hora_salida?: string | null;
          horas_trabajadas?: number | null;
          tipo?: string | null;
          ubicacion?: string | null;
          notas?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['marcajes_horario']['Insert']>;
      };

      // ── 10. Listas de Compras ──
      listas_compras: {
        Row: {
          id: string;
          empleador_id: string;
          titulo: string;
          descripcion: string | null;
          estado: 'activa' | 'completada' | 'archivada';
          fecha_limite: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          empleador_id: string;
          titulo: string;
          descripcion?: string | null;
          estado?: 'activa' | 'completada' | 'archivada';
          fecha_limite?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['listas_compras']['Insert']>;
      };

      // ── 11. Items Lista Compras ──
      items_lista_compras: {
        Row: {
          id: string;
          lista_id: string;
          nombre: string;
          cantidad: number;
          unidad: string | null;
          categoria: string | null;
          comprado: boolean;
          precio_estimado: number | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lista_id: string;
          nombre: string;
          cantidad?: number;
          unidad?: string | null;
          categoria?: string | null;
          comprado?: boolean;
          precio_estimado?: number | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['items_lista_compras']['Insert']>;
      };

      // ── 12. Recordatorios ──
      recordatorios: {
        Row: {
          id: string;
          empleador_id: string;
          trabajador_id: string | null;
          titulo: string;
          descripcion: string | null;
          hora: string;
          dias_semana: number[] | null;
          tipo: string | null;
          activo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          empleador_id: string;
          trabajador_id?: string | null;
          titulo: string;
          descripcion?: string | null;
          hora: string;
          dias_semana?: number[] | null;
          tipo?: string | null;
          activo?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['recordatorios']['Insert']>;
      };

      // ── 13. Noticias Legales ──
      noticias_legales: {
        Row: {
          id: string;
          titulo: string;
          categoria: string | null;
          resumen: string | null;
          contenido: string | null;
          fuente: string | null;
          url_fuente: string | null;
          fecha_publicacion: string;
          activa: boolean;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          titulo: string;
          categoria?: string | null;
          resumen?: string | null;
          contenido?: string | null;
          fuente?: string | null;
          url_fuente?: string | null;
          fecha_publicacion?: string;
          activa?: boolean;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['noticias_legales']['Insert']>;
      };

      // ── 14. User Profiles ──
      user_profiles: {
        Row: {
          id: string;
          auth_user_id: string;
          email: string;
          nombre: string | null;
          apellido: string | null;
          rol: 'empleador' | 'trabajador' | 'admin' | 'contador';
          empleador_id: string | null;
          trabajador_id: string | null;
          onboarding_completado: boolean;
          avatar_url: string | null;
          telefono: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          email: string;
          nombre?: string | null;
          apellido?: string | null;
          rol?: 'empleador' | 'trabajador' | 'admin' | 'contador';
          empleador_id?: string | null;
          trabajador_id?: string | null;
          onboarding_completado?: boolean;
          avatar_url?: string | null;
          telefono?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>;
      };

      // ── 15. Tarjetas Cliente ──
      tarjetas_cliente: {
        Row: {
          id: string;
          empleador_id: string;
          bin: string | null;
          ultimos_4: string;
          banco: string;
          tipo_tarjeta: 'credito' | 'debito';
          categoria: string | null;
          marca: string | null;
          programa_puntos: string | null;
          tasa_puntos: number | null;
          activa: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          empleador_id: string;
          bin?: string | null;
          ultimos_4: string;
          banco: string;
          tipo_tarjeta: 'credito' | 'debito';
          categoria?: string | null;
          marca?: string | null;
          programa_puntos?: string | null;
          tasa_puntos?: number | null;
          activa?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tarjetas_cliente']['Insert']>;
      };

      // ── 16. Instituciones Previsionales ──
      instituciones_previsionales: {
        Row: {
          id: string;
          tipo: 'AFP' | 'Salud' | 'Mutual' | 'CCAF';
          codigo: string | null;
          nombre: string;
          tasa_afp: number | null;
          tasa_sis: number | null;
          activo: boolean;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tipo: 'AFP' | 'Salud' | 'Mutual' | 'CCAF';
          codigo?: string | null;
          nombre: string;
          tasa_afp?: number | null;
          tasa_sis?: number | null;
          activo?: boolean;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['instituciones_previsionales']['Insert']>;
      };

      // ── 17. Clientes ──
      clientes: {
        Row: {
          id: string;
          rut: string;
          nombre: string;
          email: string | null;
          telefono: string | null;
          direccion: string | null;
          estado: 'activo' | 'inactivo';
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          rut: string;
          nombre: string;
          email?: string | null;
          telefono?: string | null;
          direccion?: string | null;
          estado?: 'activo' | 'inactivo';
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['clientes']['Insert']>;
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

// ── Shortcuts de tabla ──
export type Empleador       = Database['public']['Tables']['empleadores']['Row'];
export type Trabajador      = Database['public']['Tables']['trabajadores']['Row'];
export type Contrato        = Database['public']['Tables']['contratos']['Row'];
export type Liquidacion     = Database['public']['Tables']['liquidaciones']['Row'];
export type PagoEmpleador   = Database['public']['Tables']['pagos_empleador']['Row'];
export type CuentaPago      = Database['public']['Tables']['cuentas_pago']['Row'];
export type Tarea           = Database['public']['Tables']['tareas']['Row'];
export type SolicitudEmpleado = Database['public']['Tables']['solicitudes_empleado']['Row'];
export type MarcajeHorario  = Database['public']['Tables']['marcajes_horario']['Row'];
export type ListaCompras    = Database['public']['Tables']['listas_compras']['Row'];
export type ItemListaCompras = Database['public']['Tables']['items_lista_compras']['Row'];
export type Recordatorio    = Database['public']['Tables']['recordatorios']['Row'];
export type NoticiaLegal    = Database['public']['Tables']['noticias_legales']['Row'];
export type UserProfile     = Database['public']['Tables']['user_profiles']['Row'];
export type TarjetaCliente  = Database['public']['Tables']['tarjetas_cliente']['Row'];
export type InstitucionPrevisional = Database['public']['Tables']['instituciones_previsionales']['Row'];
export type Cliente         = Database['public']['Tables']['clientes']['Row'];

// ── Insert helpers ──
export type EmpleadorInsert   = Database['public']['Tables']['empleadores']['Insert'];
export type TrabajadorInsert  = Database['public']['Tables']['trabajadores']['Insert'];
export type ContratoInsert    = Database['public']['Tables']['contratos']['Insert'];
export type LiquidacionInsert = Database['public']['Tables']['liquidaciones']['Insert'];
export type TareaInsert       = Database['public']['Tables']['tareas']['Insert'];
export type SolicitudEmpleadoInsert = Database['public']['Tables']['solicitudes_empleado']['Insert'];
export type MarcajeHorarioInsert = Database['public']['Tables']['marcajes_horario']['Insert'];
