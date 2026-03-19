# Poppins ERP - Análisis Completo de Plataforma Buk y Requisitos Legales Chile

## 1. Estructura de la Plataforma Buk (Extraída por Scraping)

### 1.1 Datos de la Empresa Scrapeada
- **Empresa**: Rene Alejandro Aravena Riffo
- **Tenant**: renearavena.starter.buk.cl
- **Cluster**: starter-chile (shard4)
- **País**: Chile
- **Empleados activos**: 5
- **Rol usuario**: Administrador (Gerente General)

### 1.2 Organigrama (JSON real desde `/static_pages/orgchart.json`)
```
Rene Alejandro Aravena - Gerente General
├── Ivan Martin Gonzalez - Bodeguero(a) / Almacenista
├── Fernando Guillermo Astete - Operario(a) de Producción
├── Ismael Humberto Liempi - Operario(a) de Producción
└── Bernardo Eugenio Toro - Operario(a) de Producción
```

### 1.3 Módulos Activos vs Bloqueados

#### Módulos ACTIVOS (disponibles)
| Módulo | Ruta |
|--------|------|
| Portal/Dashboard | `/static_pages/portal` |
| Mi Ficha | `/my_profile` |
| Mi Equipo | `/employees/my_team` |
| Directorio | `/employees/directorio` |
| Organigrama | `/static_pages/orgchart` |
| Panel de Control | `/static_pages/dashboard` |
| Crear Colaborador | `/employees/new` |
| Colaboradores Vigentes | `/employees/actives` |
| Grupos | `/filter_queries` |
| Cargos | `/roles` |
| Puestos de Trabajo | `/area_roles` |
| Bandas Salariales | `/salary_ranges` |
| Plantillas Workflow | `/workflow/config` |
| Plantillas Documentos | `/document_templates` |
| Anotaciones | `/logbooks` |
| Procesos | `/processes/buk_processes` |
| Archivos y Pagos | `/nomina/output/dashboard` |
| Tablas de Parámetros | `/admin/parameter_tables` |
| Configuraciones Remuneración | `/admin/generals?modulo=remuneracion` |
| Beneficios Config | `/available_benefits/administration#beneficios` |
| Integraciones | `/marketplace/integrations` |
| Liquidaciones | `/liquidacions/:id` |
| Variables Mensuales | `/monthly_variables` |
| Mis Beneficios | `/benefits` |
| Vacaciones | `/employees/:id/vacacions/new` |
| Ficha Empleado | `/employees/:id` |
| Clonar Empleado | `/employees/:id/clonar` |
| Editar Info Personal | `/employees/:id/edit_personal_info_modal` |
| Planes/Contratos | `/employees/:id/plans/:id/edit` |
| Cargas Familiares | `/cargas/:id/edit` |
| Terminar Contrato | `/jobs/:id/terminar` |
| Finiquito | `/jobs/:id/finiquitos/new` |
| Cambiar Contrato | `/jobs/:id/cambiar` |
| Generar Documento | `/employees/:id/employee_files/generate_from_template_modal` |
| Solicitudes Modificación | `/employees/:id/profile_modifier_requests/profile_fields` |
| Capacitaciones (BukAcademy) | `/capacitaciones/dashboard` |

#### Módulos BLOQUEADOS (requieren upgrade)
| Módulo | Landing |
|--------|---------|
| Control de Asistencia | `/marketplace/solutions/landing/control_de_asistencia` |
| Capacitaciones | `/marketplace/solutions/landing/capacitaciones` |
| Gestión de Vacaciones | `/marketplace/solutions/landing/gestion_de_vacaciones` |
| Licencias Médicas Electrónicas | `/marketplace/solutions/landing/licencias_medicas_electronicas` |
| Onboarding | `/marketplace/solutions/landing/onboarding` |
| Tratos | `/marketplace/solutions/landing/tratos` |
| Gestión del Desempeño | `/marketplace/solutions/landing/gestion_del_desempeno` |
| Selección/Reclutamiento | `/marketplace/solutions/landing/seleccion` |
| Comunicaciones y Reconocimiento | `/marketplace/solutions/landing/comunicaciones_y_reconocimiento` |
| Encuestas | `/marketplace/solutions/landing/encuestas` |
| Canal de Denuncias | `/marketplace/solutions/landing/canal_de_denuncias` |
| Beneficios Buk | `/marketplace/solutions/landing/planes_beneficios` |
| Seguros | `/marketplace/solutions/landing/seguros` |
| Adelantos de Sueldo | `/marketplace/solutions/landing/adelantos_de_sueldos` |
| Registros DT | `/marketplace/solutions/landing/registros_dt` |
| Workflow Avanzado | `/marketplace/solutions/landing/workflow` |
| Áreas (avanzado) | `/marketplace/solutions/bundle` |
| Recintos | `/marketplace/solutions/bundle` |
| Gestión de Ausencia | `/marketplace/solutions/bundle` |
| Documentos Avanzados | `/marketplace/solutions/bundle` |
| Firma Digital | `/marketplace/solutions/bundle` |
| Grupo Familiar Avanzado | `/marketplace/solutions/bundle` |
| Calendario | `/marketplace/solutions/bundle` |

### 1.4 Endpoints Internos Buk (del scraping)
```
GET  /async_layouts/open_variables          # Variables del período
GET  /static_pages/shortcuts_async          # Accesos rápidos
GET  /static_pages/orgchart.json            # Organigrama JSON
GET  /worker_status                         # Estado de workers
GET  /employees/my_team                     # Equipo
GET  /employees/my_team?metric_card_id=total_employees
GET  /employees/my_team?metric_card_id=monthly_birthdays
GET  /employees/my_team?metric_card_id=monthly_anniversaries
GET  /employees/actives                     # Lista empleados activos
GET  /employees/:id                         # Detalle empleado
GET  /employees/directorio                  # Directorio
GET  /employees/my_team.xls                 # Export Excel
GET  /variables/:id                         # Variables del mes
GET  /liquidacions/:id                      # Liquidación específica
GET  /profile/employees/:id/liquidaciones   # Historial liquidaciones
GET  /monthly_variables                     # Variables mensuales
GET  /nomina/output/dashboard               # Dashboard nómina
GET  /admin/parameter_tables                # Tablas parámetros
GET  /admin/generals?modulo=remuneracion    # Config remuneraciones
GET  /roles                                 # Cargos
GET  /roles/:id                             # Detalle cargo
GET  /area_roles                            # Puestos de trabajo
GET  /salary_ranges                         # Bandas salariales
GET  /filter_queries                        # Grupos/filtros
GET  /document_templates                    # Plantillas documentos
GET  /logbooks                              # Anotaciones
GET  /processes/buk_processes               # Procesos
GET  /workflow/config                       # Config workflow
GET  /benefits                              # Beneficios
GET  /support_accesses/new                  # Acceso soporte
POST /users/login                           # Login (form action)
```

### 1.5 Campos de Empleado (extraídos del formulario)
```
person.full_name                    # Nombre completo
person.rut                          # Número de Documento (RUT)
person.email                        # Email
person.date_of_birth                # Fecha de Nacimiento
person.celular                      # Teléfono Particular
person.office_phone                 # Teléfono Oficina
today_job_or_last_job.role.name     # Cargo
today_job_or_last_job.sueldo_base   # Sueldo Base
today_job_or_last_job.obra          # Obra
ingreso_compania                    # Fecha Ingreso Compañía
jornada_laboral                     # Jornada Laboral
liquidacion_until_today_or_last.liquido  # Sueldo Líquido
last_wage_modification_date         # Última Modificación Salarial
```

---

## 2. Estructura de Datos para ERP Chile (Modelo Completo)

### 2.1 Entidad: Empresa
```typescript
interface Empresa {
  id: number;
  rut: string;                    // RUT empresa (ej: 76.123.456-7)
  razon_social: string;           // Razón social
  nombre_fantasia: string;        // Nombre fantasía
  giro: string;                   // Giro comercial
  direccion: string;
  comuna: string;
  ciudad: string;
  region: string;
  telefono: string;
  email: string;
  representante_legal: string;
  rut_representante: string;

  // Configuración previsional
  mutual_id: number;              // ACHS, IST, Mutual, ISL
  tasa_mutual: number;            // Tasa ATEP (ej: 0.93%)
  ccaf_id: number;                // Caja de compensación

  // SII
  codigo_actividad_sii: string;
  oficina_sii: string;

  // DT
  codigo_empresa_dt: string;

  created_at: Date;
  updated_at: Date;
}
```

### 2.2 Entidad: Empleado (Persona)
```typescript
interface Empleado {
  id: number;

  // === DATOS PERSONALES ===
  rut: string;                     // RUN/RUT (ej: 12.345.678-9)
  primer_nombre: string;
  segundo_nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_nacimiento: Date;
  sexo: 'M' | 'F';
  estado_civil: 'soltero' | 'casado' | 'divorciado' | 'viudo' | 'conviviente_civil';
  nacionalidad: string;

  // Contacto
  email_personal: string;
  email_corporativo: string;
  telefono_personal: string;
  telefono_oficina: string;

  // Dirección
  direccion: string;
  numero: string;
  depto: string;
  comuna: string;
  ciudad: string;
  region: string;

  // Datos bancarios
  banco_id: number;
  tipo_cuenta: 'corriente' | 'vista' | 'ahorro' | 'chequera_electronica';
  numero_cuenta: string;

  // Previsión
  afp_id: number;
  salud_id: number;               // FONASA o ISAPRE
  tipo_salud: 'fonasa' | 'isapre';
  plan_salud_uf: number;          // Monto plan en UF (si ISAPRE)
  tiene_fun: boolean;             // Formulario Único de Notificación

  // Datos adicionales
  nivel_educacional: string;
  discapacidad: boolean;
  pueblo_originario: boolean;

  // Estado
  activo: boolean;
  fecha_ingreso_empresa: Date;
  fecha_desvinculacion: Date | null;

  // Foto
  foto_url: string;

  created_at: Date;
  updated_at: Date;
}
```

### 2.3 Entidad: Contrato (Job/Plan)
```typescript
interface Contrato {
  id: number;
  empleado_id: number;
  empresa_id: number;

  // Tipo de contrato
  tipo_contrato: 'indefinido' | 'plazo_fijo' | 'obra_o_faena' | 'honorarios' | 'aprendizaje';
  fecha_inicio: Date;
  fecha_termino: Date | null;     // null si indefinido

  // Jornada
  tipo_jornada: 'completa' | 'parcial' | 'art_22' | 'especial';
  horas_semanales: number;         // 45 hrs normal, parcial puede ser menos
  dias_semana: number;             // 5 o 6

  // Remuneración
  sueldo_base: number;             // Sueldo base mensual
  tipo_gratificacion: 'art_47' | 'art_50';  // Garantizada vs proporcional

  // Estructura organizacional
  cargo_id: number;
  area_id: number;
  centro_costo_id: number;
  sucursal_id: string;

  // Datos DT
  codigo_actividad: string;

  // Estado
  estado: 'vigente' | 'terminado';
  causal_termino: string | null;   // Art 159, 160, 161

  created_at: Date;
  updated_at: Date;
}
```

### 2.4 Entidad: Cargo
```typescript
interface Cargo {
  id: number;
  nombre: string;                  // Ej: "Gerente General", "Operario de Producción"
  descripcion: string;
  nivel: number;                   // Nivel jerárquico
  banda_salarial_min: number;
  banda_salarial_max: number;
  activo: boolean;
}
```

### 2.5 Entidad: Area / Centro de Costo
```typescript
interface Area {
  id: number;
  nombre: string;
  codigo: string;
  area_padre_id: number | null;
  responsable_id: number | null;   // empleado_id del jefe
  activo: boolean;
}

interface CentroCosto {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
}
```

### 2.6 Entidad: Carga Familiar
```typescript
interface CargaFamiliar {
  id: number;
  empleado_id: number;
  rut: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: Date;
  parentesco: 'hijo' | 'conyuge' | 'conviviente_civil' | 'madre' | 'padre' | 'nieto' | 'bisnieto' | 'menor_a_cargo';
  sexo: 'M' | 'F';

  // Para asignación familiar
  es_carga_simple: boolean;
  es_carga_invalida: boolean;      // Carga con invalidez
  es_carga_maternal: boolean;

  vigente: boolean;
  fecha_inicio: Date;
  fecha_termino: Date | null;
}
```

### 2.7 Entidad: Liquidación de Sueldo
```typescript
interface Liquidacion {
  id: number;
  empleado_id: number;
  contrato_id: number;
  periodo: string;                 // "2026-03"
  fecha_emision: Date;

  // === HABERES ===
  sueldo_base: number;
  gratificacion_legal: number;     // Art 47 o 50
  colacion: number;                // No imponible
  movilizacion: number;            // No imponible
  viatico: number;                 // No imponible
  horas_extra_50: number;          // Recargo 50%
  horas_extra_100: number;         // Recargo 100% (domingos/festivos)
  monto_horas_extra: number;
  comisiones: number;
  bonos_imponibles: number;
  bonos_no_imponibles: number;
  asignacion_familiar: number;     // No imponible

  // Otros haberes
  haberes_adicionales: HaberDescuento[];

  // === TOTALES HABERES ===
  total_haberes_imponibles: number;
  total_haberes_no_imponibles: number;
  total_haberes: number;

  // === DESCUENTOS LEGALES ===
  // Previsión
  afp_nombre: string;
  afp_tasa: number;                // Tasa cotización (ej: 11.44%)
  afp_monto: number;

  salud_nombre: string;
  salud_tipo: 'fonasa' | 'isapre';
  salud_tasa: number;              // 7% legal
  salud_monto_legal: number;       // 7% del imponible
  salud_monto_adicional: number;   // Diferencia si ISAPRE > 7%
  salud_monto_total: number;

  seguro_cesantia_trabajador: number;  // 0.6% (indefinido) o 0% (plazo fijo)
  seguro_cesantia_empleador: number;   // 2.4% (indefinido) o 3% (plazo fijo)

  sis: number;                     // Seguro Invalidez y Sobrevivencia (empleador)

  impuesto_unico: number;          // Impuesto Único de Segunda Categoría

  // Otros descuentos
  descuentos_adicionales: HaberDescuento[];
  apv: number;                     // Ahorro Previsional Voluntario
  credito_social_ccaf: number;     // Crédito Caja de Compensación
  cuota_sindical: number;

  // === TOTALES ===
  total_descuentos_legales: number;
  total_descuentos_voluntarios: number;
  total_descuentos: number;

  // === LÍQUIDO ===
  liquido_a_pagar: number;

  // === COSTOS EMPLEADOR ===
  costo_empresa_mutual: number;    // ATEP
  costo_empresa_sis: number;       // SIS
  costo_empresa_cesantia: number;  // AFC empleador
  costo_total_empresa: number;

  // === TOPES ===
  tope_imponible_afp: number;      // En pesos (81.6 UF)
  tope_imponible_ips: number;      // En pesos (60 UF - salud/cesantía)
  base_imponible_afp: number;
  base_imponible_salud: number;

  // Metadata
  estado: 'borrador' | 'calculada' | 'aprobada' | 'pagada';
  created_at: Date;
  updated_at: Date;
}

interface HaberDescuento {
  id: number;
  liquidacion_id: number;
  concepto_id: number;
  nombre: string;
  tipo: 'haber_imponible' | 'haber_no_imponible' | 'descuento_legal' | 'descuento_voluntario';
  monto: number;
  cantidad: number | null;         // Para horas extra, días, etc.
  tributable: boolean;
  imponible: boolean;
}
```

### 2.8 Entidad: Asistencia
```typescript
interface RegistroAsistencia {
  id: number;
  empleado_id: number;
  fecha: Date;
  hora_entrada: string;            // "08:30"
  hora_salida: string;             // "17:30"
  hora_colacion_inicio: string;
  hora_colacion_fin: string;
  horas_trabajadas: number;
  horas_extra: number;
  tipo_dia: 'normal' | 'feriado' | 'descanso' | 'licencia' | 'vacaciones' | 'permiso';
  observacion: string;
  fuente: 'manual' | 'reloj' | 'app' | 'importacion';
}
```

### 2.9 Entidad: Ausencias / Licencias
```typescript
interface Ausencia {
  id: number;
  empleado_id: number;
  tipo: 'vacaciones' | 'licencia_medica' | 'permiso_sin_goce' | 'permiso_con_goce' | 'permiso_legal' | 'licencia_maternal' | 'licencia_paternal' | 'dia_administrativo';
  fecha_inicio: Date;
  fecha_fin: Date;
  dias_habiles: number;
  dias_corridos: number;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  aprobador_id: number;

  // Específico licencias médicas
  tipo_licencia: number | null;    // 1: Enfermedad, 2: Maternal, 3: Enfermedad hijo <1, 4: Accidente, 5: Patología embarazo, 6: Medicina preventiva
  folio_licencia: string | null;

  observacion: string;
}

interface SaldoVacaciones {
  empleado_id: number;
  dias_legales: number;            // 15 hábiles base
  dias_progresivos: number;        // Días adicionales por antigüedad
  dias_tomados: number;
  dias_pendientes: number;
  fecha_calculo: Date;
}
```

### 2.10 Entidad: Finiquito
```typescript
interface Finiquito {
  id: number;
  empleado_id: number;
  contrato_id: number;

  fecha_termino: Date;
  causal_termino: string;          // Artículo del Código del Trabajo
  /*
    Art 159 N°1: Mutuo acuerdo
    Art 159 N°2: Renuncia del trabajador
    Art 159 N°3: Muerte del trabajador
    Art 159 N°4: Vencimiento del plazo
    Art 159 N°5: Conclusión del trabajo o servicio
    Art 159 N°6: Caso fortuito o fuerza mayor
    Art 160 N°1-7: Causales disciplinarias (sin indemnización)
    Art 161 inc 1: Necesidades de la empresa
    Art 161 inc 2: Desahucio
  */

  // Montos
  dias_vacaciones_proporcionales: number;
  monto_vacaciones_proporcionales: number;
  meses_indemnizacion_aviso_previo: number;   // 1 mes si corresponde
  monto_aviso_previo: number;
  meses_indemnizacion_anos_servicio: number;  // 1 mes por año, tope 11
  monto_indemnizacion_anos_servicio: number;
  remuneracion_pendiente: number;
  gratificacion_proporcional: number;
  feriado_proporcional: number;
  otros_montos: number;

  total_bruto: number;
  total_descuentos: number;
  total_liquido: number;

  // Estado
  estado: 'borrador' | 'firmado' | 'ratificado';
  fecha_firma: Date | null;
  ministro_fe: string;             // Notaría, Inspector del Trabajo, etc.

  created_at: Date;
  updated_at: Date;
}
```

---

## 3. Requisitos Legales Chile

### 3.1 Dirección del Trabajo (DT)

#### Libro de Remuneraciones Electrónico (LRE)
Obligatorio desde 2021 para empresas con 5+ trabajadores.
- Se envía mensualmente a la DT
- Formato XML definido por la DT
- Incluye todos los haberes y descuentos del período

#### Campos obligatorios LRE:
| Campo | Descripción |
|-------|-------------|
| RUT Empresa | RUT empleador |
| RUT Trabajador | RUN trabajador |
| Período | Mes/año |
| Tipo Contrato | Indefinido, plazo fijo, etc. |
| Fecha Inicio Contrato | - |
| Jornada | Completa, parcial, art. 22 |
| Sueldo Base | Monto |
| Gratificación | Monto |
| Cada concepto de haber | Código + monto |
| Cada concepto de descuento | Código + monto |
| Total Haberes Imponibles | - |
| Total Haberes No Imponibles | - |
| Total Descuentos | - |
| Líquido | - |
| Días trabajados | - |
| Días no trabajados | Con causal |

#### Contratos Electrónicos
- La DT permite registrar contratos electrónicamente
- Firma electrónica avanzada del empleador
- Firma simple del trabajador (puede ser SMS/email)

### 3.2 PREVIRED - Planilla de Cotizaciones

#### Estructura del archivo PREVIRED
| # | Campo | Largo | Tipo | Descripción |
|---|-------|-------|------|-------------|
| 1 | RUT Empleador | 11 | AN | Con dígito verificador |
| 2 | Período | 6 | N | AAAAMM |
| 3 | RUT Trabajador | 11 | AN | Con dígito verificador |
| 4 | Nombre | 30 | AN | - |
| 5 | Apellido Paterno | 30 | AN | - |
| 6 | Apellido Materno | 30 | AN | - |
| 7 | Sexo | 1 | AN | M/F |
| 8 | Fecha Nacimiento | 8 | N | DDMMAAAA |
| 9 | Nacionalidad | 2 | N | 0=Chilena, 1=Extranjera |
| 10 | Tipo Pago | 1 | N | 1=Efectivo, 2=Cheque, 3=Vale vista |
| 11 | Movimiento Personal | 2 | N | Ver tabla |
| 12 | Fecha Inicio Contrato | 8 | N | DDMMAAAA |
| 13 | Fecha Término Contrato | 8 | N | DDMMAAAA |
| 14 | Causal Término | 2 | N | Código causal |
| 15 | Región | 2 | N | Código región |
| 16 | Comuna | 3 | N | Código comuna |
| 17 | Código AFP | 2 | N | Ver tabla |
| 18 | Renta Imponible AFP | 9 | N | - |
| 19 | Cotización AFP | 9 | N | - |
| 20 | SIS | 9 | N | - |
| 21 | Cuenta APV AFP | 9 | N | - |
| 22 | Código ISAPRE/FONASA | 2 | N | Ver tabla |
| 23 | Renta Imponible Salud | 9 | N | - |
| 24 | Cotización Salud 7% | 9 | N | - |
| 25 | Cotización Adicional Salud | 9 | N | - |
| 26 | Código AFC | 1 | N | 1=Sí |
| 27 | Renta Imponible AFC | 9 | N | - |
| 28 | Cotización AFC Trabajador | 9 | N | - |
| 29 | Cotización AFC Empleador | 9 | N | - |
| 30 | Código Mutual | 2 | N | Ver tabla |
| 31 | Renta Imponible Mutual | 9 | N | - |
| 32 | Cotización Mutual Básica | 9 | N | 0.93% |
| 33 | Cotización Mutual Adicional | 9 | N | Tasa adicional |
| 34 | Código CCAF | 2 | N | Ver tabla |
| 35 | Nro Cargas Simples | 2 | N | - |
| 36 | Nro Cargas Maternales | 2 | N | - |
| 37 | Nro Cargas Invalidez | 2 | N | - |
| 38 | Asignación Familiar Total | 9 | N | - |
| 39 | Renta Imponible IPS | 9 | N | - |
| 40 | Cotización IPS | 9 | N | Si ex INP |
| 41 | Renta Imponible Desahucio | 9 | N | - |

#### Códigos AFP
| Código | AFP | Tasa Cotización Obligatoria (2025) |
|--------|-----|-----|
| 01 | Capital | 11.44% |
| 02 | Cuprum | 11.44% |
| 03 | Habitat | 11.27% |
| 04 | PlanVital | 11.16% |
| 05 | ProVida | 11.45% |
| 06 | Modelo | 10.58% |
| 07 | Uno | 10.69% |

> Nota: Incluye comisión. Tasa de cotización obligatoria es 10% + comisión AFP.

#### Códigos Salud
| Código | Institución |
|--------|-------------|
| 01 | FONASA |
| 02 | Banmédica |
| 03 | Consalud |
| 04 | Vida Tres |
| 05 | Colmena |
| 07 | Cruz Blanca |
| 08 | Nueva Masvida |
| 10 | Esencial |

#### Códigos Mutual
| Código | Mutual |
|--------|--------|
| 00 | ISL (Instituto de Seguridad Laboral) |
| 01 | ACHS (Asociación Chilena de Seguridad) |
| 02 | Mutual de Seguridad CChC |
| 03 | IST (Instituto de Seguridad del Trabajo) |

#### Códigos CCAF
| Código | CCAF |
|--------|------|
| 01 | Los Andes |
| 02 | La Araucana |
| 03 | Los Héroes |
| 04 | 18 de Septiembre |
| 05 | Gabriela Mistral |

#### Tasas de Cotización (2025)
| Concepto | Tasa Trabajador | Tasa Empleador | Tope |
|----------|----------------|----------------|------|
| AFP | 10% + comisión | - | 81.6 UF |
| Salud | 7% | - | 81.6 UF |
| SIS | - | 1.85% | 81.6 UF |
| Seguro Cesantía (indefinido) | 0.6% | 2.4% | 126.6 UF |
| Seguro Cesantía (plazo fijo) | 0% | 3% | 126.6 UF |
| Mutual (base ATEP) | - | 0.93% | 81.6 UF |
| Mutual (adicional) | - | Variable | 81.6 UF |

#### Topes Imponibles (mensualizados en UF)
| Tope | Monto UF |
|------|----------|
| AFP / Salud / SIS / Mutual | 81.6 UF |
| Seguro de Cesantía (AFC) | 126.6 UF |
| APV Régimen A | 50 UF mensual / 600 UF anual |
| APV Régimen B | 50 UF mensual / 600 UF anual |

### 3.3 SII - Impuesto Único de Segunda Categoría

#### Tabla Impuesto Único (Tramos en UTM, actualización mensual)
| Desde (UTM) | Hasta (UTM) | Factor | Rebaja (UTM) |
|-------------|-------------|--------|--------------|
| 0 | 13.5 | 0% | 0 |
| 13.5 | 30 | 4% | 0.54 |
| 30 | 50 | 8% | 1.74 |
| 50 | 70 | 13.5% | 4.49 |
| 70 | 90 | 23% | 11.14 |
| 90 | 120 | 30.4% | 17.8 |
| 120 | 310 | 35% | 23.32 |
| 310 | ∞ | 40% | 38.82 |

#### Cálculo:
1. Base tributable = Total imponible - AFP - Salud (7%) - Seguro Cesantía trabajador
2. Convertir a UTM: base / valor_UTM_mes
3. Aplicar tabla de tramos
4. Resultado en UTM * valor_UTM = impuesto en pesos

#### DJ 1887 - Declaración Jurada Anual
Se presenta al SII en marzo de cada año. Contiene:
- RUT empleador
- RUT trabajador
- Total rentas pagadas en el año
- Total impuesto retenido
- Total cotizaciones previsionales
- Monto exento (APV, etc.)

### 3.4 Gratificación Legal

#### Art. 47 (Garantizada)
- Pago mensual de 25% sobre lo devengado por el trabajador
- Con tope de 4.75 Ingresos Mínimos Mensuales / 12 meses
- Fórmula: min(sueldo_base * 0.25, 4.75 * IMM / 12)
- Más común en la práctica

#### Art. 50 (Proporcional)
- 30% de las utilidades de la empresa
- Se reparte proporcionalmente entre los trabajadores
- Solo si la empresa tiene utilidades

### 3.5 Asignación Familiar

#### Tramos (se actualizan semestralmente)
| Tramo | Ingreso mensual | Monto por carga |
|-------|----------------|-----------------|
| A | Hasta $441.115 | $16.793 |
| B | $441.116 - $644.201 | $10.302 |
| C | $644.202 - $1.004.818 | $3.255 |
| D | Sobre $1.004.818 | $0 |

> Valores referenciales 2024. Se actualizan semestralmente.

### 3.6 Ingreso Mínimo Mensual (IMM)
- **2025**: $510.000 (referencial, se ajusta por ley)
- Se usa para: gratificación legal, horas extra mínimas, indemnizaciones

---

## 4. Tablas de Base de Datos Sugeridas

### 4.1 Schema Principal
```sql
-- Empresa
CREATE TABLE empresas (
  id SERIAL PRIMARY KEY,
  rut VARCHAR(12) UNIQUE NOT NULL,
  razon_social VARCHAR(200) NOT NULL,
  nombre_fantasia VARCHAR(200),
  giro VARCHAR(200),
  direccion TEXT,
  comuna VARCHAR(100),
  ciudad VARCHAR(100),
  region VARCHAR(100),
  telefono VARCHAR(20),
  email VARCHAR(200),
  representante_legal VARCHAR(200),
  rut_representante VARCHAR(12),
  mutual_id INTEGER REFERENCES mutuales(id),
  tasa_mutual DECIMAL(5,2),
  ccaf_id INTEGER REFERENCES ccafs(id),
  codigo_actividad_sii VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Empleados
CREATE TABLE empleados (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id),
  rut VARCHAR(12) UNIQUE NOT NULL,
  primer_nombre VARCHAR(100) NOT NULL,
  segundo_nombre VARCHAR(100),
  apellido_paterno VARCHAR(100) NOT NULL,
  apellido_materno VARCHAR(100),
  fecha_nacimiento DATE NOT NULL,
  sexo CHAR(1) NOT NULL CHECK (sexo IN ('M', 'F')),
  estado_civil VARCHAR(20),
  nacionalidad VARCHAR(50) DEFAULT 'Chilena',
  email_personal VARCHAR(200),
  email_corporativo VARCHAR(200),
  telefono_personal VARCHAR(20),
  telefono_oficina VARCHAR(20),
  direccion TEXT,
  comuna VARCHAR(100),
  ciudad VARCHAR(100),
  region VARCHAR(100),
  banco_id INTEGER REFERENCES bancos(id),
  tipo_cuenta VARCHAR(30),
  numero_cuenta VARCHAR(30),
  afp_id INTEGER REFERENCES afps(id),
  salud_id INTEGER REFERENCES instituciones_salud(id),
  tipo_salud VARCHAR(10) CHECK (tipo_salud IN ('fonasa', 'isapre')),
  plan_salud_uf DECIMAL(8,4),
  nivel_educacional VARCHAR(50),
  discapacidad BOOLEAN DEFAULT FALSE,
  pueblo_originario BOOLEAN DEFAULT FALSE,
  activo BOOLEAN DEFAULT TRUE,
  foto_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Contratos
CREATE TABLE contratos (
  id SERIAL PRIMARY KEY,
  empleado_id INTEGER REFERENCES empleados(id),
  empresa_id INTEGER REFERENCES empresas(id),
  tipo_contrato VARCHAR(20) NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_termino DATE,
  tipo_jornada VARCHAR(20) NOT NULL,
  horas_semanales DECIMAL(4,1) DEFAULT 45,
  dias_semana INTEGER DEFAULT 5,
  sueldo_base DECIMAL(12,0) NOT NULL,
  tipo_gratificacion VARCHAR(10) DEFAULT 'art_47',
  cargo_id INTEGER REFERENCES cargos(id),
  area_id INTEGER REFERENCES areas(id),
  centro_costo_id INTEGER REFERENCES centros_costo(id),
  estado VARCHAR(15) DEFAULT 'vigente',
  causal_termino VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Cargos
CREATE TABLE cargos (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id),
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  nivel INTEGER,
  banda_min DECIMAL(12,0),
  banda_max DECIMAL(12,0),
  activo BOOLEAN DEFAULT TRUE
);

-- Áreas
CREATE TABLE areas (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id),
  nombre VARCHAR(200) NOT NULL,
  codigo VARCHAR(20),
  area_padre_id INTEGER REFERENCES areas(id),
  responsable_id INTEGER REFERENCES empleados(id),
  activo BOOLEAN DEFAULT TRUE
);

-- Centros de Costo
CREATE TABLE centros_costo (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id),
  codigo VARCHAR(20) NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  activo BOOLEAN DEFAULT TRUE
);

-- Cargas Familiares
CREATE TABLE cargas_familiares (
  id SERIAL PRIMARY KEY,
  empleado_id INTEGER REFERENCES empleados(id),
  rut VARCHAR(12),
  nombres VARCHAR(200),
  apellidos VARCHAR(200),
  fecha_nacimiento DATE,
  parentesco VARCHAR(30),
  sexo CHAR(1),
  es_carga_simple BOOLEAN DEFAULT TRUE,
  es_carga_invalida BOOLEAN DEFAULT FALSE,
  es_carga_maternal BOOLEAN DEFAULT FALSE,
  vigente BOOLEAN DEFAULT TRUE,
  fecha_inicio DATE,
  fecha_termino DATE
);

-- Liquidaciones
CREATE TABLE liquidaciones (
  id SERIAL PRIMARY KEY,
  empleado_id INTEGER REFERENCES empleados(id),
  contrato_id INTEGER REFERENCES contratos(id),
  periodo VARCHAR(7) NOT NULL,  -- '2026-03'
  fecha_emision DATE,
  dias_trabajados INTEGER,
  dias_no_trabajados INTEGER,

  -- Haberes
  sueldo_base DECIMAL(12,0),
  gratificacion_legal DECIMAL(12,0),
  colacion DECIMAL(12,0) DEFAULT 0,
  movilizacion DECIMAL(12,0) DEFAULT 0,
  viatico DECIMAL(12,0) DEFAULT 0,
  horas_extra_cantidad DECIMAL(6,2) DEFAULT 0,
  horas_extra_monto DECIMAL(12,0) DEFAULT 0,
  comisiones DECIMAL(12,0) DEFAULT 0,
  bonos_imponibles DECIMAL(12,0) DEFAULT 0,
  bonos_no_imponibles DECIMAL(12,0) DEFAULT 0,
  asignacion_familiar DECIMAL(12,0) DEFAULT 0,
  total_haberes_imponibles DECIMAL(12,0),
  total_haberes_no_imponibles DECIMAL(12,0),
  total_haberes DECIMAL(12,0),

  -- Descuentos
  afp_monto DECIMAL(12,0),
  salud_monto_legal DECIMAL(12,0),
  salud_monto_adicional DECIMAL(12,0),
  seguro_cesantia_trabajador DECIMAL(12,0),
  impuesto_unico DECIMAL(12,0),
  apv DECIMAL(12,0) DEFAULT 0,
  credito_social_ccaf DECIMAL(12,0) DEFAULT 0,
  cuota_sindical DECIMAL(12,0) DEFAULT 0,
  total_descuentos DECIMAL(12,0),

  -- Líquido
  liquido_a_pagar DECIMAL(12,0),

  -- Costos empleador
  seguro_cesantia_empleador DECIMAL(12,0),
  sis_monto DECIMAL(12,0),
  mutual_monto DECIMAL(12,0),
  costo_total_empresa DECIMAL(12,0),

  -- Bases
  base_imponible_afp DECIMAL(12,0),
  base_imponible_salud DECIMAL(12,0),
  base_tributable DECIMAL(12,0),

  estado VARCHAR(15) DEFAULT 'borrador',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Conceptos adicionales en liquidación
CREATE TABLE liquidacion_conceptos (
  id SERIAL PRIMARY KEY,
  liquidacion_id INTEGER REFERENCES liquidaciones(id),
  concepto_id INTEGER REFERENCES conceptos_remuneracion(id),
  nombre VARCHAR(200),
  tipo VARCHAR(30), -- haber_imponible, haber_no_imponible, descuento_legal, descuento_voluntario
  monto DECIMAL(12,0),
  cantidad DECIMAL(8,2),
  imponible BOOLEAN,
  tributable BOOLEAN
);

-- Catálogo de conceptos de remuneración
CREATE TABLE conceptos_remuneracion (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id),
  codigo VARCHAR(20),
  nombre VARCHAR(200) NOT NULL,
  tipo VARCHAR(30) NOT NULL,
  imponible BOOLEAN DEFAULT TRUE,
  tributable BOOLEAN DEFAULT TRUE,
  activo BOOLEAN DEFAULT TRUE
);

-- Asistencia
CREATE TABLE registros_asistencia (
  id SERIAL PRIMARY KEY,
  empleado_id INTEGER REFERENCES empleados(id),
  fecha DATE NOT NULL,
  hora_entrada TIME,
  hora_salida TIME,
  hora_colacion_inicio TIME,
  hora_colacion_fin TIME,
  horas_trabajadas DECIMAL(5,2),
  horas_extra DECIMAL(5,2) DEFAULT 0,
  tipo_dia VARCHAR(20),
  observacion TEXT,
  fuente VARCHAR(20)
);

-- Ausencias
CREATE TABLE ausencias (
  id SERIAL PRIMARY KEY,
  empleado_id INTEGER REFERENCES empleados(id),
  tipo VARCHAR(30) NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  dias_habiles INTEGER,
  dias_corridos INTEGER,
  estado VARCHAR(15) DEFAULT 'pendiente',
  aprobador_id INTEGER REFERENCES empleados(id),
  tipo_licencia INTEGER,
  folio_licencia VARCHAR(30),
  observacion TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Vacaciones saldo
CREATE TABLE saldos_vacaciones (
  id SERIAL PRIMARY KEY,
  empleado_id INTEGER REFERENCES empleados(id),
  dias_legales DECIMAL(5,1) DEFAULT 15,
  dias_progresivos DECIMAL(5,1) DEFAULT 0,
  dias_tomados DECIMAL(5,1) DEFAULT 0,
  dias_pendientes DECIMAL(5,1),
  fecha_calculo DATE
);

-- Finiquitos
CREATE TABLE finiquitos (
  id SERIAL PRIMARY KEY,
  empleado_id INTEGER REFERENCES empleados(id),
  contrato_id INTEGER REFERENCES contratos(id),
  fecha_termino DATE NOT NULL,
  causal_termino VARCHAR(30) NOT NULL,
  vacaciones_proporcionales DECIMAL(12,0) DEFAULT 0,
  aviso_previo DECIMAL(12,0) DEFAULT 0,
  indemnizacion_anos_servicio DECIMAL(12,0) DEFAULT 0,
  meses_indemnizacion DECIMAL(4,1) DEFAULT 0,
  remuneracion_pendiente DECIMAL(12,0) DEFAULT 0,
  gratificacion_proporcional DECIMAL(12,0) DEFAULT 0,
  otros_montos DECIMAL(12,0) DEFAULT 0,
  total_bruto DECIMAL(12,0),
  total_descuentos DECIMAL(12,0),
  total_liquido DECIMAL(12,0),
  estado VARCHAR(15) DEFAULT 'borrador',
  fecha_firma DATE,
  ministro_fe VARCHAR(200),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Documentos de empleado
CREATE TABLE documentos_empleado (
  id SERIAL PRIMARY KEY,
  empleado_id INTEGER REFERENCES empleados(id),
  tipo VARCHAR(50), -- contrato, anexo, certificado, liquidacion, finiquito, otro
  nombre VARCHAR(200),
  archivo_url TEXT,
  firmado BOOLEAN DEFAULT FALSE,
  fecha_firma DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Anotaciones (logbook de Buk)
CREATE TABLE anotaciones (
  id SERIAL PRIMARY KEY,
  empleado_id INTEGER REFERENCES empleados(id),
  tipo VARCHAR(20), -- positiva, negativa, observacion
  titulo VARCHAR(200),
  descripcion TEXT,
  fecha DATE,
  registrado_por INTEGER REFERENCES empleados(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- === TABLAS DE REFERENCIA ===

CREATE TABLE afps (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(5) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  tasa_dependiente DECIMAL(5,2),
  tasa_independiente DECIMAL(5,2),
  activa BOOLEAN DEFAULT TRUE
);

CREATE TABLE instituciones_salud (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(5) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  tipo VARCHAR(10) CHECK (tipo IN ('fonasa', 'isapre')),
  activa BOOLEAN DEFAULT TRUE
);

CREATE TABLE mutuales (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(5) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  tasa_base DECIMAL(5,2),
  activa BOOLEAN DEFAULT TRUE
);

CREATE TABLE ccafs (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(5) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  activa BOOLEAN DEFAULT TRUE
);

CREATE TABLE bancos (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(5),
  nombre VARCHAR(100) NOT NULL,
  activo BOOLEAN DEFAULT TRUE
);

-- Indicadores económicos (UF, UTM, UTA, IMM)
CREATE TABLE indicadores_economicos (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(10) NOT NULL,  -- UF, UTM, UTA, IMM, DOLAR
  fecha DATE NOT NULL,
  valor DECIMAL(15,4) NOT NULL,
  UNIQUE(tipo, fecha)
);

-- Tabla de tramos impuesto único
CREATE TABLE tramos_impuesto (
  id SERIAL PRIMARY KEY,
  vigencia_desde DATE NOT NULL,
  tramo INTEGER NOT NULL,
  desde_utm DECIMAL(8,2),
  hasta_utm DECIMAL(8,2),
  factor DECIMAL(5,4),
  rebaja_utm DECIMAL(8,4)
);

-- Asignación familiar tramos
CREATE TABLE tramos_asignacion_familiar (
  id SERIAL PRIMARY KEY,
  vigencia_desde DATE NOT NULL,
  tramo CHAR(1) NOT NULL,  -- A, B, C, D
  ingreso_desde DECIMAL(12,0),
  ingreso_hasta DECIMAL(12,0),
  monto_por_carga DECIMAL(12,0)
);

-- Periodos de nómina
CREATE TABLE periodos (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id),
  periodo VARCHAR(7) NOT NULL,  -- '2026-03'
  fecha_inicio DATE,
  fecha_cierre DATE,
  estado VARCHAR(15) DEFAULT 'abierto', -- abierto, cerrado, procesado
  uf_valor DECIMAL(10,4),
  utm_valor DECIMAL(10,0),
  imm_valor DECIMAL(10,0),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4.2 Relaciones Principales
```
empresas 1──N empleados
empresas 1──N cargos
empresas 1──N areas
empresas 1──N centros_costo
empresas 1──N periodos
empresas N──1 mutuales
empresas N──1 ccafs

empleados 1──N contratos
empleados 1──N cargas_familiares
empleados 1──N liquidaciones
empleados 1──N registros_asistencia
empleados 1──N ausencias
empleados 1──1 saldos_vacaciones
empleados 1──N finiquitos
empleados 1──N documentos_empleado
empleados 1──N anotaciones
empleados N──1 afps
empleados N──1 instituciones_salud
empleados N──1 bancos

contratos N──1 cargos
contratos N──1 areas
contratos N──1 centros_costo

liquidaciones N──1 contratos
liquidaciones 1──N liquidacion_conceptos
liquidacion_conceptos N──1 conceptos_remuneracion

finiquitos N──1 contratos
```

---

## 5. Dashboards Necesarios

### 5.1 Dashboard Principal (como Buk `/static_pages/dashboard`)
- Total empleados activos
- Ingresos/Egresos del mes
- Cumpleaños del mes
- Aniversarios del mes
- Costo total nómina
- Estado del proceso de nómina

### 5.2 Dashboard Nómina (como Buk `/nomina/output/dashboard`)
- Estado de liquidaciones del período
- Total haberes / descuentos / líquido
- Comparativo mes anterior
- Empleados pendientes de cálculo
- Archivos de pago generados

### 5.3 Dashboard Personas
- Headcount por área
- Distribución por cargo
- Antigüedad promedio
- Rotación mensual/anual
- Distribución por tipo contrato

---

## 6. Integraciones Requeridas

### 6.1 PREVIRED
- Generación automática de planilla de cotizaciones
- Exportación en formato estándar PREVIRED
- Validación de RUTs y montos

### 6.2 SII
- Cálculo automático de impuesto único
- Generación de DJ 1887
- Consulta/actualización de indicadores (UF, UTM)

### 6.3 DT
- Generación de LRE (Libro de Remuneraciones Electrónico)
- Registro electrónico de contratos
- Registro de asistencia

### 6.4 Bancos
- Generación de archivos de pago (nómina bancaria)
- Formatos: BancoEstado, BCI, Santander, Chile, Scotiabank, etc.

### 6.5 Indicadores Económicos
- API CMF/SII para obtener UF, UTM, UTA diariamente
- Almacenar histórico para cálculos retroactivos

---

## 7. Screenshots Capturados
Los screenshots de cada sección de Buk están en:
`scripts/buk-scraper/output/screenshots/`

## 8. Archivos de Datos Crudos
- `scripts/buk-scraper/output/buk-structure.json` - Estructura completa (100 rutas, 311 endpoints)
- `scripts/buk-scraper/output/api-responses.json` - Respuestas API capturadas
- `scripts/buk-scraper/output/employee-structure.json` - Campos de empleado
- `scripts/buk-scraper/output/employee-api-calls.json` - API calls de empleados
