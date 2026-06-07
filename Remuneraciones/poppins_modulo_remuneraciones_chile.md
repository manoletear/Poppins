# Poppins | Módulo Nativo de Remuneraciones Chile

**Documento:** Especificación funcional y técnica para desarrollo  
**Producto:** Poppins  
**Módulo:** Poppins Payroll Chile  
**Versión:** 1.0  
**Enfoque:** Trabajadores dependientes del hogar en Chile  
**Audiencia:** CTO, equipo de desarrollo, arquitectura, QA, producto y legal-laboral  
**Uso esperado:** Documento base para implementación con Claude Code y planificación por sprints  

---

## 1. Resumen ejecutivo

Poppins debe incorporar un **nuevo módulo nativo de remuneraciones para Chile**, orientado a trabajadores dependientes del hogar. Este módulo debe cubrir el ciclo completo de remuneraciones: clasificación legal del vínculo, contrato, jornada, haberes, descuentos, cotizaciones, liquidaciones de sueldo, finiquitos, vacaciones, licencias, auditoría, generación documental y archivo compatible para carga en Previred.

El desarrollo no debe entenderse como una integración alternativa a BUK, sino como la construcción del futuro módulo nativo de remuneraciones de Poppins. BUK se mantiene temporalmente como fuente operacional actual hasta que el nuevo módulo esté desarrollado, probado, validado y pueda asumir el rol de fuente principal.

El módulo debe permitir gestionar correctamente distintos perfiles de trabajadores del hogar: trabajadora de casa particular, chofer, cuidador, jardinero, piscinero, cocinero, mayordomo, nochero, cuidador de parcela u otros trabajadores contratados por una persona natural o familia. El punto clave es que el sistema no debe clasificar la remuneración solo por el cargo, sino por el **tipo de vínculo legal**.

Un jardinero o piscinero puede ser liquidado por Poppins si existe relación laboral dependiente: continuidad, subordinación, horario, pago periódico y prestación personal de servicios al hogar. Si corresponde a un prestador externo que emite boleta o factura, debe registrarse como proveedor o servicio externo, pero no ingresar al motor de remuneraciones.

---

## 2. Estrategia de transición: BUK actual y nuevo módulo nativo Poppins

### 2.1 Situación actual

Poppins actualmente utiliza integración con BUK para visualizar y/o gestionar ciertos datos de RRHH asociados a trabajadores del hogar.

Esa integración debe mantenerse operativa durante el desarrollo del nuevo módulo. No se debe interrumpir la experiencia actual del usuario ni modificar prematuramente los flujos existentes.

### 2.2 Objetivo final

El nuevo módulo será una capacidad core de Poppins. Debe permitir que Poppins gestione internamente el ciclo completo de remuneraciones de trabajadores del hogar, sin depender funcionalmente de BUK para el cálculo, emisión, control y cumplimiento previsional.

### 2.3 Modelo de transición

Durante el desarrollo existirán dos capas:

1. **Capa actual BUK**
   - Mantiene la continuidad operacional actual.
   - Sigue alimentando las vistas y datos de RRHH que hoy se muestran en Poppins.
   - No se desactiva hasta que el nuevo módulo esté validado.

2. **Nuevo módulo nativo Poppins Payroll**
   - Se desarrolla en paralelo.
   - Tiene su propio modelo de datos.
   - Tiene su propio motor de cálculo.
   - Tiene sus propias APIs.
   - Genera liquidaciones, finiquitos, cálculos previsionales y archivo Previred.
   - Se prueba inicialmente en sandbox, piloto o modo paralelo.

### 2.4 Principio técnico de desacoplamiento

La UI y los servicios de Poppins no deben consumir directamente las APIs de BUK ni, posteriormente, las APIs internas del nuevo módulo. Debe existir una interfaz intermedia:

```text
HRPayrollProvider
```

Arquitectura conceptual:

```text
Poppins UI
   ↓
HRPayrollProvider
   ↓
BUKPayrollAdapter / PoppinsPayrollAdapter
```

Durante la etapa inicial:

```text
HRPayrollProvider = BUKPayrollAdapter
```

Después de desarrollar y validar el nuevo módulo:

```text
HRPayrollProvider = PoppinsPayrollAdapter
```

Con esto, el cambio futuro no exige reescribir pantallas, sino sustituir progresivamente el origen de datos.

### 2.5 Estados de transición

Se recomienda manejar estados por tenant, hogar o empleador:

```text
BUK_ACTIVE
POPPINS_PAYROLL_SANDBOX
POPPINS_PAYROLL_PARALLEL_RUN
POPPINS_PAYROLL_VALIDATED
POPPINS_PAYROLL_PRIMARY
BUK_DISABLED
```

Descripción:

| Estado | Descripción |
|---|---|
| `BUK_ACTIVE` | Poppins usa BUK como fuente principal. |
| `POPPINS_PAYROLL_SANDBOX` | El nuevo módulo existe solo para pruebas internas. |
| `POPPINS_PAYROLL_PARALLEL_RUN` | El nuevo módulo calcula en paralelo a BUK, sin impacto productivo. |
| `POPPINS_PAYROLL_VALIDATED` | Los resultados fueron comparados y aprobados. |
| `POPPINS_PAYROLL_PRIMARY` | El nuevo módulo pasa a ser la fuente principal. |
| `BUK_DISABLED` | La integración BUK queda desactivada para ese flujo o tenant. |

### 2.6 Corrida paralela obligatoria

Antes de reemplazar BUK, Poppins Payroll debe ejecutar una etapa de corrida paralela.

Para un mismo trabajador y período se debe comparar:

- Sueldo base.
- Días trabajados.
- Haberes imponibles.
- Haberes no imponibles.
- Base imponible.
- AFP.
- Salud.
- AFC.
- Cuenta de Ahorro de Indemnización.
- Mutual.
- Impuesto único.
- Neto a pagar.
- Costo empleador.
- Liquidación PDF.
- Archivo Previred.

Clasificación de diferencias:

```text
MATCH
MINOR_ROUNDING_DIFFERENCE
EXPECTED_DIFFERENCE
REQUIRES_REVIEW
BLOCKING_DIFFERENCE
```

El paso a producción solo se permite cuando no existan diferencias bloqueantes.

### 2.7 Componentes técnicos requeridos para transición

```text
HRPayrollProvider
BUKPayrollAdapter
PoppinsPayrollAdapter
PayrollProviderFactory
PayrollSourceConfig
PayrollMigrationComparator
ParallelRunService
```

Regla base:

```text
La UI consume capacidades de RRHH/remuneraciones.
No consume directamente BUK.
No consume directamente tablas internas.
Consume un provider desacoplado.
```

---

## 3. API de actualización mensual de indicadores y parámetros legales

### 3.1 Requisito crítico

El módulo debe contar con una **API propia de actualización de indicadores normativos y previsionales**, capaz de obtener, validar, versionar y congelar los parámetros necesarios para calcular liquidaciones, finiquitos y archivos Previred.

Este punto es crítico. En remuneraciones no se debe calcular usando valores escritos manualmente en código ni valores genéricos del día. El cálculo debe usar el conjunto de indicadores vigentes para el **período de remuneración** y debe conservar un snapshot inmutable de esos valores.

### 3.2 Principio de diseño

Poppins debe exponer una API interna:

```text
IndicatorsService
```

Esta API interna debe consumir fuentes públicas oficiales o fuentes públicas operacionales reconocidas. Cuando no exista API pública formal, debe existir un conector controlado de descarga, scraping o importación desde fuente oficial, con trazabilidad, validación y aprobación manual.

No se debe depender de sitios no oficiales como fuente primaria. Pueden usarse como fallback operativo o referencia, pero el snapshot legal debe privilegiar fuentes oficiales.

### 3.3 Fuentes sugeridas

| Parámetro | Fuente preferente | Tipo de acceso | Observación |
|---|---|---|---|
| UF diaria | CMF API | API con API Key, JSON/XML | Fuente pública institucional. Permite consultar UF diaria, mensual, anual y por período. |
| UTM | SII | Tabla pública / exportación | SII publica UTM/UTA por mes. Si no existe endpoint JSON formal, usar conector oficial HTML/Excel. |
| UTA | SII | Tabla pública / exportación | Usada para referencia tributaria. |
| IPC índice y variación | SII / INE | Tabla pública / datos oficiales | SII publica IPC junto a UTM/UTA; INE es fuente estadística original del IPC. |
| Impuesto Único 2ª Categoría | SII | Tabla pública mensual | Debe almacenarse como tabla por período. |
| Topes imponibles AFP/salud/mutual | Superintendencia de Pensiones | Publicación anual | Se expresan en UF y se convierten a CLP según regla del período. |
| Tope seguro cesantía | Superintendencia de Pensiones | Publicación anual | Se expresa en UF. |
| AFP y comisiones | Previred / AFP / SP | Publicación mensual | Requiere validación mensual. |
| SIS | Previred / SP | Publicación mensual | Cargo empleador, no aplica para ciertos pensionados. |
| AFC | AFC / Previred | Publicación / regla legal | Trabajador de casa particular: 3% empleador, todo tipo de contrato. |
| CAI 1,11% | AFP / Previred | Regla legal / publicación | Cuenta de Ahorro de Indemnización para trabajadores de casa particular. |
| APV topes | Previred / SII | Publicación mensual/anual | Topes en UF. |
| Asignación familiar tramos | IPS / SUSESO / Previred | Publicación | Debe versionarse por período. |
| Ingreso mínimo | Dirección del Trabajo / ley / Previred | Publicación | Usado para validaciones de renta mínima imponible. |
| Mutual / accidentes del trabajo | Mutual/ISL/contrato empleador | Configuración + tasa base | La tasa puede depender del organismo administrador y actividad. |
| CCAF | CCAF / Previred | Configuración | Afecta distribución Fonasa/CCAF cuando corresponde. |
| Formato Previred | Previred | PDF/documentación | Versionar formato y campos exigidos. |

### 3.4 Indicadores mínimos para liquidaciones

El snapshot mensual debe contener al menos:

```json
{
  "period": "2026-06",
  "country": "CL",
  "uf": {
    "period_end_value": 0,
    "source": "CMF",
    "source_date": null
  },
  "utm": {
    "value": 0,
    "source": "SII"
  },
  "uta": {
    "value": 0,
    "source": "SII"
  },
  "ipc": {
    "index_value": 0,
    "monthly_variation": 0,
    "accumulated_variation": 0,
    "last_12_months_variation": 0,
    "source": "SII/INE"
  },
  "tax": {
    "second_category_monthly_table": [],
    "source": "SII"
  },
  "caps": {
    "afp_health_mutual_cap_uf": 90.0,
    "unemployment_cap_uf": 135.2,
    "afp_health_mutual_cap_clp": 0,
    "unemployment_cap_clp": 0
  },
  "rates": {
    "health_legal_rate": 0.07,
    "afc_tcp_employer_rate": 0.03,
    "cai_tcp_rate": 0.0111,
    "sis_rate": 0,
    "social_security_life_expectancy_rate": 0,
    "social_security_protected_profitability_rate": 0
  },
  "afp": [
    {
      "code": "MODELO",
      "mandatory_rate": 0.10,
      "commission_rate": 0,
      "total_worker_rate": 0
    }
  ],
  "family_allowance": {
    "tranches": []
  },
  "minimum_income": {
    "general": 0,
    "household_worker": 0,
    "under_18_over_65": 0,
    "non_remunerational": 0
  },
  "previred": {
    "format_type": "LARGO_VARIABLE_SEPARADOR",
    "format_version": "82",
    "field_count": 105
  }
}
```

### 3.5 Regla sobre UF aplicable

No se debe usar automáticamente la UF del día de cálculo. Para remuneraciones, topes y archivo Previred, la UF debe determinarse según la regla aplicable al período de remuneración.

Regla recomendada para implementación:

```text
Para conversión de topes imponibles expresados en UF, usar la UF del último día del período de remuneración, salvo que una norma o fuente específica del proceso indique otro criterio.
```

Ejemplo:

```text
Período de remuneración: mayo 2026
UF usada para topes Previred: UF al 31 de mayo de 2026
```

Esto debe quedar como regla parametrizable:

```text
uf_policy = PERIOD_END_DATE
```

Otros valores posibles:

```text
PAYMENT_DATE
MONTHLY_REFERENCE_DATE
MANUAL_OVERRIDE_WITH_APPROVAL
```

### 3.6 API interna de indicadores

#### Crear sincronización mensual

```http
POST /api/v1/indicator-snapshots/sync
```

Request:

```json
{
  "country": "CL",
  "period": "2026-06",
  "sources": [
    "CMF_UF",
    "SII_UTM_IPC",
    "SII_TAX_SECOND_CATEGORY",
    "PREVIRED_INDICATORS",
    "SP_CAPS"
  ],
  "mode": "DRAFT"
}
```

Response:

```json
{
  "snapshot_id": "snap_cl_2026_06",
  "period": "2026-06",
  "status": "FETCHED_WITH_WARNINGS",
  "missing_values": [
    "family_allowance.tranches"
  ],
  "sources": [
    {
      "source": "CMF_UF",
      "status": "OK",
      "retrieved_at": "2026-06-01T03:00:00Z"
    },
    {
      "source": "SII_UTM_IPC",
      "status": "OK",
      "retrieved_at": "2026-06-01T03:00:02Z"
    }
  ]
}
```

#### Obtener snapshot

```http
GET /api/v1/indicator-snapshots/{snapshot_id}
```

#### Validar snapshot

```http
POST /api/v1/indicator-snapshots/{snapshot_id}/validate
```

#### Aprobar snapshot

```http
POST /api/v1/indicator-snapshots/{snapshot_id}/approve
```

#### Bloquear snapshot

```http
POST /api/v1/indicator-snapshots/{snapshot_id}/lock
```

#### Comparar snapshot con versión anterior

```http
GET /api/v1/indicator-snapshots/{snapshot_id}/diff?against=snap_cl_2026_05
```

#### Estado de fuentes

```http
GET /api/v1/indicator-sources/health
```

### 3.7 Estados del snapshot

```text
DRAFT
FETCHING
FETCHED
FETCHED_WITH_WARNINGS
VALIDATION_FAILED
VALIDATED
APPROVED
LOCKED
REPLACED
VOIDED
```

Reglas:

- Solo snapshots `APPROVED` o `LOCKED` pueden usarse para cerrar nómina.
- Una nómina en preview puede usar `VALIDATED`, pero debe advertir que aún no está aprobada.
- Una nómina cerrada debe guardar el `indicator_snapshot_id`.
- Un snapshot usado por una nómina cerrada no puede modificarse.
- Si hay error posterior, debe crearse un nuevo snapshot y reliquidar.

### 3.8 Tabla `indicator_snapshots`

```sql
indicator_snapshots
- id
- country
- period
- status
- uf_period_end_value
- uf_policy
- uf_source
- utm_value
- uta_value
- ipc_index_value
- ipc_monthly_variation
- ipc_accumulated_variation
- ipc_last_12_months_variation
- afp_health_mutual_cap_uf
- unemployment_cap_uf
- afp_health_mutual_cap_clp
- unemployment_cap_clp
- health_legal_rate
- afc_tcp_employer_rate
- cai_tcp_rate
- sis_rate
- social_security_life_expectancy_rate
- social_security_protected_profitability_rate
- minimum_income_general
- minimum_income_household_worker
- minimum_income_under_18_over_65
- minimum_income_non_remunerational
- previred_format_type
- previred_format_version
- previred_field_count
- source_payload_json
- validation_result_json
- approved_by
- approved_at
- locked_at
- created_at
- updated_at
```

### 3.9 Tablas hijas

```sql
indicator_afp_rates
- id
- indicator_snapshot_id
- afp_code
- afp_name
- mandatory_rate
- commission_rate
- total_worker_rate
- employer_rate
- source

indicator_tax_second_category_brackets
- id
- indicator_snapshot_id
- periodicity
- from_amount
- to_amount
- factor
- deduction_amount
- effective_max_rate

indicator_family_allowance_tranches
- id
- indicator_snapshot_id
- tranche_code
- amount
- income_from
- income_to

indicator_source_audit
- id
- indicator_snapshot_id
- source_code
- source_url
- retrieval_method
- retrieved_at
- http_status
- checksum
- raw_payload_location
- parser_version
- status
- error_message
```

### 3.10 Conectores sugeridos

```text
CMFUfConnector
SIIUtmIpcConnector
SIITaxSecondCategoryConnector
PreviredIndicatorsConnector
SuperintendenciaPensionesCapsConnector
AfcRulesConnector
ManualOverrideConnector
```

### 3.11 Interfaz común de conectores

```typescript
export interface IndicatorConnector<T> {
  sourceCode: string;
  fetch(period: string): Promise<RawIndicatorPayload>;
  parse(payload: RawIndicatorPayload): Promise<T>;
  validate(data: T): Promise<ValidationResult>;
}
```

### 3.12 Actualización programada

Se recomienda configurar scheduler:

```text
Día 1 de cada mes, 02:00: sincronización preliminar.
Días 1 al 10, 06:00: reintento si faltan valores.
Día 10, 08:00: validación reforzada.
Antes de cerrar nómina: validación obligatoria.
Enero/febrero: verificación especial de topes imponibles anuales.
Agosto 2026: verificación especial de reforma previsional y campos Previred 94/95.
```

### 3.13 Validaciones de indicadores

Validaciones mínimas:

- UF existe para el último día del período.
- UTM existe para el período.
- Tabla de impuesto único existe para el período.
- Tope AFP/salud/mutual en UF existe.
- Tope seguro cesantía en UF existe.
- Conversión UF a CLP fue calculada.
- AFP activas tienen tasa.
- SIS tiene tasa.
- Previred tiene versión de formato vigente.
- Renta mínima imponible existe.
- Tramos de asignación familiar existen, si se habilita carga familiar.
- Si falta un valor crítico, no se puede cerrar nómina.
- Si falta un valor no crítico, puede cerrarse solo con aprobación explícita y warning.

### 3.14 Valores críticos y no críticos

Críticos:

```text
UF período
UTM período
Tabla impuesto único
Tope AFP/salud/mutual
Tope seguro cesantía
AFP y comisiones
SIS
Salud 7%
AFC TCP 3%
CAI 1,11%
Previred format version
Previred field count
```

No críticos, según alcance MVP:

```text
Asignación familiar si no hay cargas registradas
APV si trabajador no tiene APV
CCAF si empleador no está afiliado
Mutual diferenciada si se usa tasa default configurada
IPC si no hay reajustes ni finiquitos con deuda/reajuste
```

### 3.15 Manual override controlado

Debe existir override manual solo para usuarios autorizados.

```http
POST /api/v1/indicator-snapshots/{snapshot_id}/manual-overrides
```

Request:

```json
{
  "field": "sis_rate",
  "old_value": 0.0162,
  "new_value": 0.0163,
  "reason": "Corrección publicada por fuente oficial",
  "evidence_file_id": "file_123"
}
```

Reglas:

- Requiere permiso `INDICATOR_OVERRIDE`.
- Requiere motivo.
- Requiere evidencia.
- Debe quedar auditado.
- No puede aplicarse sobre snapshot `LOCKED`.
- Si el snapshot ya fue usado en nómina cerrada, se debe crear nueva versión.

---

## 4. Objetivo funcional del módulo

El módulo debe permitir:

- Crear y mantener contratos laborales de trabajadores del hogar.
- Calcular remuneraciones mensuales.
- Emitir liquidaciones de sueldo.
- Calcular cotizaciones previsionales, salud, AFC, Cuenta de Ahorro de Indemnización, mutualidad, impuestos y descuentos.
- Administrar vacaciones, licencias médicas, permisos, ausencias, anticipos, bonos, horas extraordinarias y finiquitos.
- Generar archivo para carga masiva en Previred.
- Mantener trazabilidad legal, auditoría, versionamiento y reproducibilidad histórica.
- Operar con indicadores actualizados mensualmente desde fuentes públicas oficiales o públicas operacionales reconocidas.
- Migrar gradualmente desde BUK a Poppins Payroll.

---

## 5. Principios obligatorios de diseño

1. Primero se determina el perfil legal del trabajador; después se calcula.
2. Todo cálculo debe ser reproducible históricamente.
3. Las tasas, topes, tramos e indicadores no deben estar hardcodeados.
4. Toda liquidación cerrada debe quedar inmutable.
5. Toda corrección posterior debe generar reliquidación.
6. Previred debe ser un módulo separado del motor de cálculo.
7. La UI debe consumir un provider desacoplado, no tablas ni BUK directamente.
8. El usuario final no debe modificar tasas legales sin permiso experto.
9. La aplicación debe explicar el cálculo, no solo mostrar el resultado.
10. Debe existir auditoría completa.
11. Se debe soportar versionamiento legal y normativo.
12. El sistema debe estar preparado para cambios normativos futuros.
13. Los indicadores se deben sincronizar y congelar por período de remuneración.
14. La generación de archivo Previred debe validarse antes de permitir descarga oficial.

---

## 6. Tipos de trabajador soportados

Poppins debe soportar:

1. Trabajador/a de casa particular puertas afuera.
2. Trabajador/a de casa particular puertas adentro.
3. Chofer de casa particular.
4. Cuidador/a de niños, adultos mayores o personas dependientes.
5. Jardinero dependiente del hogar.
6. Piscinero dependiente del hogar.
7. Cocinero/a del hogar.
8. Mayordomo, nochero, cuidador de parcela o trabajador residencial.
9. Otro trabajador dependiente contratado por persona natural.
10. Prestador externo no laboral, solo para registro operativo, pero fuera de liquidaciones.

La diferencia crítica no es el cargo, sino si existe relación laboral dependiente.

---

## 7. Clasificación legal del vínculo

Campo obligatorio:

```text
legal_profile_type
```

Valores:

```text
TCP_PUERTAS_AFUERA
TCP_PUERTAS_ADENTRO
CHOFER_CASA_PARTICULAR
CUIDADOR_HOGAR
JARDINERO_DEPENDIENTE_HOGAR
PISCINERO_DEPENDIENTE_HOGAR
OTRO_DEPENDIENTE_HOGAR
PRESTADOR_EXTERNO_NO_NOMINA
REVISION_LEGAL_REQUERIDA
```

Campo obligatorio:

```text
employment_relationship_type
```

Valores:

```text
DEPENDIENTE_CON_CONTRATO
DEPENDIENTE_EN_REGULARIZACION
PRESTADOR_EXTERNO_BOLETA
PRESTADOR_EXTERNO_FACTURA
INFORMAL_PENDIENTE_REGULARIZACION
NO_CLASIFICADO
```

Regla:

```text
Solo DEPENDIENTE_CON_CONTRATO y DEPENDIENTE_EN_REGULARIZACION pueden ingresar al motor de remuneraciones.
```

---

## 8. Onboarding del trabajador

### 8.1 Paso 1: clasificación del vínculo

Preguntas obligatorias:

- ¿La persona presta servicios de forma continua?
- ¿Existe horario, instrucciones o supervisión del hogar?
- ¿El pago es periódico?
- ¿La labor se realiza para una familia o persona natural?
- ¿La labor es propia o inherente al hogar?
- ¿La persona emite boleta o factura?
- ¿Existe contrato firmado?
- ¿Trabaja puertas adentro o puertas afuera?
- ¿Presta servicios en más de un domicilio del mismo empleador?
- ¿Presta servicios para varios empleadores?

Salida esperada:

```json
{
  "classification_result": "DEPENDIENTE_CON_CONTRATO",
  "legal_profile_type": "JARDINERO_DEPENDIENTE_HOGAR",
  "requires_legal_review": false,
  "payroll_enabled": true
}
```

Salida con ambigüedad:

```json
{
  "classification_result": "REVISION_LEGAL_REQUERIDA",
  "reason": "El trabajador emite boleta, pero existe continuidad, horario y subordinación.",
  "payroll_enabled": false
}
```

### 8.2 Paso 2: datos personales

Campos mínimos:

- RUT.
- DV.
- Nombre completo.
- Nacionalidad.
- Fecha de nacimiento.
- Sexo.
- Estado civil.
- Domicilio.
- Comuna.
- Región.
- Teléfono.
- Email.
- Datos bancarios.
- Contacto de emergencia.
- Documento de identidad.
- Permiso de trabajo si es extranjero.

### 8.3 Paso 3: datos previsionales

Campos:

- AFP.
- Régimen previsional.
- Tipo de trabajador previsional.
- Fonasa o Isapre.
- Plan de salud.
- Valor pactado Isapre.
- APV.
- Cuenta 2.
- Pensionado.
- Pensionado que cotiza.
- Exento de cotización.
- Cargas familiares.
- Caja de compensación.
- Mutualidad u organismo administrador.

### 8.4 Paso 4: contrato

Campos:

- Fecha de firma.
- Fecha de inicio.
- Tipo de contrato.
- Cargo.
- Descripción de funciones.
- Domicilio de prestación.
- Modalidad puertas adentro / puertas afuera.
- Jornada semanal pactada.
- Distribución de jornada.
- Hora de entrada y salida.
- Colación.
- Sueldo base bruto.
- Forma de pago.
- Periodicidad de pago.
- Banco y cuenta.
- Beneficios.
- Asignaciones.
- Bonos pactados.
- Pacto de horas adicionales o bolsa semanal.
- Documento de contrato firmado.
- Estado de registro ante DT.

### 8.5 Paso 5: jornada y descansos

Para puertas afuera:

- Jornada semanal pactada.
- Distribución de días.
- Horario.
- Colación.
- Horas extraordinarias.
- Bolsa semanal si jornada parcial y existe pacto.

Para puertas adentro:

- Vive en el hogar.
- Descanso diario.
- Descanso semanal.
- Domingos/festivos.
- Días libres adicionales.
- Acumulación y compensación.

### 8.6 Paso 6: activación

Contrato puede quedar `ACTIVE` solo si tiene:

- Datos personales completos.
- Datos previsionales mínimos.
- Sueldo base.
- Jornada definida.
- Perfil legal.
- Documento contractual.
- Estado de registro DT.
- Validación de elegibilidad laboral.

Estados del contrato:

```text
DRAFT
PENDING_DOCUMENTS
PENDING_LEGAL_CLASSIFICATION
PENDING_DT_REGISTRATION
ACTIVE
SUSPENDED
TERMINATED
CANCELLED
```

---

## 9. Conceptos de remuneración

### 9.1 Haberes

```text
SUELDO_BASE
HORAS_EXTRA
BONO_IMPONIBLE
BONO_NO_IMPONIBLE
AGUINALDO
GRATIFICACION_CONTRACTUAL
ASIGNACION_MOVILIZACION
ASIGNACION_COLACION
ASIGNACION_PERDIDA_CAJA
VIATICO
REEMBOLSO_GASTOS
VACACIONES
LICENCIA_MEDICA
SUBSIDIO
DIFERENCIA_RETROACTIVA
PAGO_FERIADO
PAGO_DIA_LIBRE_PUERTAS_ADENTRO
```

Metadata por concepto:

```json
{
  "code": "SUELDO_BASE",
  "name": "Sueldo base",
  "is_taxable": true,
  "is_pension_contribution_base": true,
  "is_health_contribution_base": true,
  "is_afc_base": true,
  "is_mutual_base": true,
  "is_income_tax_base": true,
  "affects_vacation_base": true,
  "affects_termination_base": true,
  "visible_in_payslip": true,
  "requires_document": false,
  "valid_from": "2026-01-01",
  "valid_to": null
}
```

### 9.2 Descuentos

```text
AFP_10
AFP_COMISION
SALUD_7
ISAPRE_DIFERENCIA_PLAN
IMPUESTO_UNICO_SEGUNDA_CATEGORIA
ANTICIPO_SUELDO
PRESTAMO_EMPLEADOR
DESCUENTO_CONVENIDO
AUSENCIA_INJUSTIFICADA
PERMISO_SIN_GOCE
OTRO_DESCUENTO_LEGAL
OTRO_DESCUENTO_AUTORIZADO
```

### 9.3 Aportes del empleador

```text
SIS
AFC_EMPLEADOR_TCP_3
CAI_INDEMNIZACION_TODO_EVENTO_1_11
MUTUAL_ACCIDENTES_TRABAJO
SEGURO_SOCIAL_EXPECTATIVA_VIDA
SEGURO_SOCIAL_RENTABILIDAD_PROTEGIDA
```

---

## 10. Motor de cálculo

### 10.1 Servicio

```text
PayrollEngineService
```

Responsabilidades:

- Recibir contrato, período, indicadores, haberes, ausencias y reglas vigentes.
- Calcular liquidación.
- Generar trazabilidad de fórmula.
- Devolver resultado inmutable.
- No emitir PDF.
- No generar archivo Previred directamente.
- No modificar datos maestros.

### 10.2 Entrada

```json
{
  "payroll_period": "2026-06",
  "country": "CL",
  "contract": {
    "contract_id": "ctr_123",
    "worker_id": "wrk_123",
    "legal_profile_type": "TCP_PUERTAS_AFUERA",
    "start_date": "2026-01-01",
    "end_date": null,
    "base_salary": 600000,
    "weekly_hours": 42,
    "work_schedule_type": "PUERTAS_AFUERA",
    "part_time_bag_enabled": false
  },
  "worker": {
    "rut": "12345678-9",
    "afp_code": "MODELO",
    "health_type": "FONASA",
    "is_pensioner": false,
    "worker_type_previred": "0"
  },
  "period_events": {
    "worked_days": 30,
    "medical_leave_days": 0,
    "unpaid_leave_days": 0,
    "vacation_days": 0,
    "extra_hours": 0,
    "absences": []
  },
  "variable_items": [
    {
      "concept_code": "BONO_IMPONIBLE",
      "amount": 50000
    }
  ],
  "indicator_snapshot_id": "snap_cl_2026_06"
}
```

### 10.3 Salida

```json
{
  "payroll_run_item_id": "pri_123",
  "gross_income": 650000,
  "taxable_income": 650000,
  "pension_base": 650000,
  "health_base": 650000,
  "afc_base": 650000,
  "mutual_base": 650000,
  "income_tax_base": 650000,
  "employee_deductions": {
    "afp_10": 65000,
    "afp_commission": 0,
    "health_7": 45500,
    "income_tax": 0,
    "advances": 0,
    "other": 0
  },
  "employer_contributions": {
    "sis": 10530,
    "afc_employer": 19500,
    "cai_1_11": 7215,
    "mutual": 6175
  },
  "net_pay": 539500,
  "total_employer_cost": 693420,
  "warnings": [],
  "calculation_trace": []
}
```

### 10.4 Pipeline

1. Validar contrato activo.
2. Validar período.
3. Cargar snapshot de indicadores aprobado.
4. Determinar días trabajados.
5. Determinar licencias, permisos y ausencias.
6. Calcular sueldo base proporcional.
7. Calcular haberes variables.
8. Calcular horas extra.
9. Construir base imponible.
10. Aplicar topes imponibles.
11. Calcular AFP.
12. Calcular comisión AFP.
13. Calcular salud.
14. Calcular impuesto único.
15. Calcular descuentos.
16. Calcular aportes empleador.
17. Calcular neto.
18. Calcular costo total empleador.
19. Generar warnings.
20. Persistir resultado solo si el modo es `final`.

### 10.5 Fórmulas base

Valor día:

```text
valor_dia = sueldo_base_mensual / 30
```

Sueldo proporcional:

```text
sueldo_proporcional = valor_dia * dias_remunerados
```

Valor hora ordinaria:

```text
valor_hora = sueldo_base_mensual / 30 * 7 / horas_semanales_pactadas
```

Hora extraordinaria:

```text
valor_hora_extra = valor_hora * 1.5
```

Base imponible:

```text
base_imponible = suma(haberes con is_pension_contribution_base = true)
```

AFP 10%:

```text
afp_10 = min(base_imponible, tope_afp_salud_mutual_clp) * 10%
```

Salud legal:

```text
salud_7 = min(base_imponible, tope_afp_salud_mutual_clp) * 7%
```

AFC trabajador de casa particular:

```text
afc_empleador_tcp = min(base_imponible, tope_seguro_cesantia_clp) * 3%
```

Cuenta de Ahorro de Indemnización:

```text
cai_tcp = min(base_imponible, tope_afp_salud_mutual_clp) * 1.11%
```

Impuesto único:

```text
renta_liquida_imponible = base_tributable - cotizaciones_previsionales_trabajador
impuesto = tabla_sii(periodo).calculate(renta_liquida_imponible)
```

---

## 11. Reglas por tipo de trabajador

### 11.1 Puertas afuera

- Debe tener jornada semanal pactada.
- Debe permitir jornada parcial.
- Debe permitir horas extraordinarias.
- Si jornada semanal ≤ 30 horas, puede existir bolsa semanal de horas adicionales solo con pacto escrito.
- Si no existe pacto, cualquier exceso debe generar alerta y tratarse según regla de horas extraordinarias.

### 11.2 Puertas adentro

Debe administrar:

- Vive en el hogar.
- Descanso mínimo diario.
- Descanso semanal.
- Domingos y festivos.
- Días libres adicionales.
- Acumulación si existe acuerdo.
- Compensación al término si aplica.

Debe existir ledger separado para días libres puertas adentro. No se deben mezclar con vacaciones legales.

### 11.3 Chofer de casa particular

Debe ser perfil propio. No mezclar con chofer de empresa.

Debe soportar:

- Jornada.
- Sueldo.
- Horas extra.
- Cotizaciones.
- AFC TCP.
- CAI.
- Registro contractual.

### 11.4 Jardinero, piscinero y cuidador de parcela

Debe pasar por wizard de clasificación.

Si es dependiente:

- Se liquida sueldo.
- Se generan cotizaciones.
- Se genera archivo Previred.
- Se emite liquidación.
- Se administra contrato y finiquito.

Si es prestador externo:

- No se calcula liquidación.
- No se generan cotizaciones.
- No se exporta Previred.
- Puede registrarse como gasto del hogar o proveedor externo.

---

## 12. Licencias, permisos y ausencias

### 12.1 Tipos de eventos

```text
MEDICAL_LEAVE_FULL
MEDICAL_LEAVE_PARTIAL
UNPAID_LEAVE
PAID_PERMISSION
VACATION
WORK_ACCIDENT
MATERNITY_LEAVE
PATERNITY_LEAVE
UNJUSTIFIED_ABSENCE
TERMINATION
HIRING
SALARY_CHANGE
```

### 12.2 Licencia médica

Campos:

- Fecha inicio.
- Fecha término.
- Días licencia.
- Tipo.
- Número de licencia.
- Entidad pagadora.
- Estado.
- RIMA.
- Documento.
- Días trabajados.
- Días subsidiados.

### 12.3 Permiso sin goce

Debe descontar días, afectar base imponible y generar movimiento si corresponde.

### 12.4 Ausencia injustificada

Debe descontar sueldo proporcional, permitir evidencia y quedar visible en la liquidación.

---

## 13. Vacaciones y días libres

### 13.1 Vacaciones legales

Administrar:

- Fecha de ingreso.
- Días devengados.
- Días tomados.
- Días pendientes.
- Días proporcionales.
- Vacaciones progresivas si aplica.
- Vacaciones pendientes al finiquito.

### 13.2 Días libres puertas adentro

Tabla:

```sql
live_in_free_day_ledgers
- id
- contract_id
- period
- accrued_days
- used_days
- carried_days
- compensated_days
- agreement_document_id
- created_at
```

Regla:

```text
No mezclar días libres puertas adentro con vacaciones legales.
```

---

## 14. Finiquitos

### 14.1 Alcance

Debe generar:

- Cálculo de finiquito.
- Documento de finiquito.
- Días trabajados del mes.
- Vacaciones pendientes.
- Vacaciones proporcionales.
- Bonos pendientes.
- Descuentos autorizados.
- Anticipos pendientes.
- Cotizaciones del último mes.
- Archivo Previred del período.
- Reporte de CAI.

### 14.2 Causales

```text
RENUNCIA_VOLUNTARIA
MUTUO_ACUERDO
VENCIMIENTO_PLAZO
CONCLUSION_TRABAJO
DESAHUCIO_EMPLEADOR_CASA_PARTICULAR
INCUMPLIMIENTO_GRAVE
CASO_FORTUITO
FALLECIMIENTO_TRABAJADOR
FALLECIMIENTO_EMPLEADOR
REVISION_LEGAL_REQUERIDA
```

### 14.3 Flujo

```text
Simulación
→ Revisión
→ Aprobación
→ Emisión
→ Firma/ratificación
→ Cierre
```

El finiquito no debe ser un bono ni una línea más en liquidación mensual. Debe tener flujo propio.

---

## 15. Archivo Previred

### 15.1 Requisito funcional

Poppins debe generar archivo para carga masiva en Previred.

Formato MVP:

```text
Formato Estándar Largo Variable por Separador
Versión 82
Separador: punto y coma ;
Extensión: TXT o CSV
Campos: 105
```

### 15.2 Servicio

```text
PreviredExportService
```

Subcomponentes:

```text
PreviredMapper
PreviredValidator
PreviredSerializer
PreviredFileBuilder
PreviredCatalogService
PreviredExportAudit
```

Flujo:

```text
PayrollRun cerrado
→ Mapping interno a modelo Previred
→ Validación de datos obligatorios
→ Validación de reglas
→ Validación de catálogos
→ Serialización 105 campos
→ Generación TXT/CSV
→ Hash SHA-256
→ Resumen de totales
→ Archivo descargable
→ Estado exportado
```

### 15.3 Campos críticos

```text
1 RUT trabajador
2 DV trabajador
3 Apellido paterno
4 Apellido materno
5 Nombres
6 Sexo
7 Nacionalidad
8 Tipo de pago / nómina
9 Período desde
10 Período hasta
11 Régimen previsional
12 Tipo trabajador
13 Días trabajados
14 Tipo de línea
15 Código movimiento de personal
16 Fecha desde movimiento
17 Fecha hasta movimiento
18 Tramo asignación familiar
26 Código AFP
27 Renta imponible AFP
28 Cotización obligatoria AFP
29 SIS
62 Institución salud
63 Renta imponible salud
64 Cotización salud
83 CCAF
92 RIMA
93 Tipo jornada
94 Cotización expectativa de vida
95 Cotización rentabilidad protegida
96 Código mutual
97 Renta imponible mutual
98 Cotización accidentes del trabajo
100 Renta imponible seguro cesantía
101 Aporte trabajador seguro cesantía
102 Aporte empleador seguro cesantía
103 RUT pagadora subsidio
104 DV pagadora subsidio
105 Centro de costo
```

### 15.4 DTO interno

```typescript
type PreviredLine = {
  workerRut: string;
  workerDv: string;
  paternalSurname: string;
  maternalSurname: string;
  names: string;
  sexCode: string;
  nationalityCode: string;
  payrollTypeCode: string;
  periodFrom: string;
  periodTo: string;
  pensionRegimeCode: string;
  workerTypeCode: string;
  workedDays: number;
  lineTypeCode: string;
  movementCode: string;
  movementStartDate?: string;
  movementEndDate?: string;

  afpCode: string;
  afpTaxableIncome: number;
  afpMandatoryContribution: number;
  sisContribution: number;

  healthInstitutionCode: string;
  healthTaxableIncome: number;
  healthContribution: number;

  rima: number;
  workdayTypeCode: string;
  lifeExpectancyContribution: number;
  protectedProfitabilityContribution: number;

  mutualCode: string;
  mutualTaxableIncome: number;
  workAccidentContribution: number;

  unemploymentTaxableIncome: number;
  unemploymentWorkerContribution: number;
  unemploymentEmployerContribution: number;

  subsidyPayerRut?: string;
  subsidyPayerDv?: string;
  costCenter?: string;

  rawFields: string[];
};
```

### 15.5 Serialización

Reglas:

- Todos los registros deben tener 105 campos.
- Separador `;`.
- Campos numéricos enteros, sin decimales.
- Si no aplica campo numérico: `0`.
- Si no aplica campo alfanumérico: blanco.
- Cada trabajador debe tener línea principal `00`.
- Líneas especiales deben ir inmediatamente después de la línea principal.
- Debe guardarse hash SHA-256.

### 15.6 Validaciones

- RUT válido.
- DV válido.
- AFP o régimen previsional válido.
- Salud válida.
- Días trabajados entre 0 y 30.
- Si días trabajados = 0, debe existir movimiento compatible.
- Si hay licencia médica, debe existir RIMA cuando aplique.
- Si renta imponible AFP = 0, cotización AFP no puede ser > 0.
- Si hay seguro de cesantía, debe informarse renta imponible.
- Si no corresponde seguro de cesantía, campos deben ir en 0.
- Tipo de jornada obligatorio.
- Campo obligatorio vacío genera error.
- Línea con menos o más de 105 campos genera error.
- Línea especial fuera de orden genera error.

### 15.7 Estados

```text
DRAFT
VALIDATING
VALIDATED_WITHOUT_ERRORS
VALIDATED_WITH_WARNINGS
FAILED_VALIDATION
GENERATED
DOWNLOADED
SUBMITTED_MANUALLY_BY_USER
REJECTED_BY_PREVIRED
ACCEPTED_BY_PREVIRED
REPLACED
VOIDED
```

---

## 16. Modelo de datos principal

```sql
households
- id
- owner_user_id
- employer_rut
- employer_dv
- employer_name
- address
- commune
- region
- mutual_institution_id
- ccaf_id
- created_at
- updated_at

workers
- id
- rut
- dv
- first_name
- middle_name
- paternal_surname
- maternal_surname
- birth_date
- sex
- nationality
- email
- phone
- address
- commune
- region
- bank_id
- bank_account_type
- bank_account_number
- created_at
- updated_at

worker_previsional_profiles
- id
- worker_id
- afp_id
- pension_regime_code
- worker_type_previred_code
- health_type
- health_institution_id
- isapre_plan_amount
- is_pensioner
- pensioner_contributes
- apv_enabled
- valid_from
- valid_to
- created_at
- updated_at

contracts
- id
- household_id
- worker_id
- legal_profile_type
- employment_relationship_type
- role_name
- duties_description
- start_date
- end_date
- contract_type
- work_location_address
- live_in
- weekly_hours
- daily_schedule_json
- base_salary
- payment_frequency
- payment_method
- dt_registration_status
- dt_registration_date
- status
- created_at
- updated_at

payroll_periods
- id
- country
- period_year
- period_month
- status
- indicator_snapshot_id
- opened_at
- closed_at

payroll_runs
- id
- household_id
- payroll_period_id
- run_type
- status
- calculated_at
- approved_at
- closed_at
- approved_by
- created_at

payroll_run_items
- id
- payroll_run_id
- contract_id
- worker_id
- gross_income
- taxable_income
- pension_base
- health_base
- afc_base
- mutual_base
- income_tax_base
- employee_deductions_total
- employer_contributions_total
- net_pay
- total_employer_cost
- status
- calculation_trace_json
- created_at

payroll_concept_results
- id
- payroll_run_item_id
- concept_code
- concept_name
- concept_type
- amount
- base_amount
- rate
- taxable
- imponible
- legal
- visible_in_payslip
- calculation_order

attendance_events
- id
- contract_id
- event_date
- event_type
- hours
- source
- evidence_file_url
- created_at

leave_events
- id
- contract_id
- leave_type
- start_date
- end_date
- days
- status
- license_number
- rima_amount
- subsidy_payer_rut
- document_url
- created_at

vacation_ledgers
- id
- contract_id
- period
- accrued_days
- used_days
- adjusted_days
- balance_days
- created_at

termination_cases
- id
- contract_id
- termination_date
- termination_cause
- status
- calculated_amount
- document_url
- approved_by
- created_at

previred_exports
- id
- household_id
- payroll_period_id
- payroll_run_id
- format_type
- format_version
- status
- file_url
- file_hash
- total_lines
- total_workers
- validation_summary_json
- generated_by
- generated_at

previred_export_lines
- id
- previred_export_id
- worker_id
- contract_id
- line_number
- line_type
- field_count
- serialized_line
- validation_status
- validation_errors_json

audit_events
- id
- tenant_id
- entity_type
- entity_id
- action
- before_json
- after_json
- user_id
- ip_address
- created_at
```

---

## 17. APIs principales

### 17.1 Contratos

```http
POST /api/v1/contracts
GET /api/v1/contracts/{id}
PATCH /api/v1/contracts/{id}
```

### 17.2 Clasificación legal

```http
POST /api/v1/work-relationship/classify
```

### 17.3 Nómina

```http
POST /api/v1/payroll-runs
POST /api/v1/payroll-runs/{id}/calculate
POST /api/v1/payroll-runs/{id}/approve
POST /api/v1/payroll-runs/{id}/close
GET /api/v1/payroll-runs/{id}
GET /api/v1/payroll-run-items/{id}
```

### 17.4 Liquidación PDF

```http
GET /api/v1/payroll-run-items/{item_id}/payslip.pdf
```

### 17.5 Previred

```http
POST /api/v1/previred-exports
GET /api/v1/previred-exports/{id}
GET /api/v1/previred-exports/{id}/download
POST /api/v1/previred-exports/{id}/mark-submitted
POST /api/v1/previred-exports/{id}/mark-accepted
POST /api/v1/previred-exports/{id}/mark-rejected
```

### 17.6 Finiquitos

```http
POST /api/v1/terminations
POST /api/v1/terminations/{id}/calculate
POST /api/v1/terminations/{id}/approve
POST /api/v1/terminations/{id}/close
GET /api/v1/terminations/{id}/document.pdf
```

### 17.7 Indicadores

```http
POST /api/v1/indicator-snapshots/sync
GET /api/v1/indicator-snapshots/{id}
POST /api/v1/indicator-snapshots/{id}/validate
POST /api/v1/indicator-snapshots/{id}/approve
POST /api/v1/indicator-snapshots/{id}/lock
GET /api/v1/indicator-snapshots/{id}/diff
GET /api/v1/indicator-sources/health
```

---

## 18. Liquidación de sueldo

Debe incluir:

- Datos del empleador.
- Datos del trabajador.
- Cargo.
- Período.
- Fecha de ingreso.
- Tipo de contrato.
- AFP.
- Salud.
- Días trabajados.
- Días de licencia.
- Días de vacaciones.
- Haberes imponibles.
- Haberes no imponibles.
- Total haberes.
- Descuentos legales.
- Otros descuentos.
- Neto a pagar.
- Aportes empleador.
- Código de verificación.
- Hash del documento.
- Firma o aceptación digital.

---

## 19. Seguridad y auditoría

### 19.1 Roles

```text
HOUSEHOLD_OWNER
PAYROLL_ADMIN
PAYROLL_OPERATOR
ACCOUNTANT_ADVISOR
LEGAL_REVIEWER
WORKER_SELF_SERVICE
SUPPORT_READONLY
SYSTEM_ADMIN
```

### 19.2 Permisos

```text
CONTRACT_CREATE
CONTRACT_UPDATE
CONTRACT_LEGAL_CLASSIFY
PAYROLL_CALCULATE
PAYROLL_APPROVE
PAYROLL_CLOSE
PAYROLL_REVERSE
PREVIRED_EXPORT_GENERATE
PREVIRED_EXPORT_DOWNLOAD
TERMINATION_CALCULATE
TERMINATION_APPROVE
SENSITIVE_DOCUMENT_VIEW
INDICATOR_SNAPSHOT_SYNC
INDICATOR_SNAPSHOT_APPROVE
INDICATOR_SNAPSHOT_LOCK
INDICATOR_OVERRIDE
```

### 19.3 Eventos auditables

Auditar:

- Creación de trabajador.
- Cambio de datos previsionales.
- Cambio de sueldo.
- Cambio de jornada.
- Cambio de tipo legal.
- Carga de licencia médica.
- Cálculo de nómina.
- Aprobación.
- Cierre.
- Reversa.
- Generación de Previred.
- Descarga de Previred.
- Emisión de finiquito.
- Cambio de indicadores.
- Override de indicadores.
- Acceso a documentos sensibles.

---

## 20. Best practices técnicas

### 20.1 Reglas versionadas

No usar lógica hardcodeada dispersa.

Estructura sugerida:

```text
rules/payroll/cl/2026/worker_household.ts
rules/payroll/cl/2026/previred_v82.ts
rules/payroll/cl/2026/tax_second_category.ts
rules/payroll/cl/2026/social_security.ts
rules/indicators/cl/2026/sources.ts
```

### 20.2 Inmutabilidad

Prohibido modificar:

- Liquidación cerrada.
- Finiquito cerrado.
- Archivo Previred generado.
- Snapshot usado.

Corrección posterior:

```text
crear nueva corrida
crear reliquidación
generar nuevo archivo
marcar archivo anterior como reemplazado
```

### 20.3 Idempotencia

Usar `Idempotency-Key` en:

```text
POST /payroll-runs
POST /payroll-runs/{id}/calculate
POST /payroll-runs/{id}/approve
POST /previred-exports
POST /terminations
POST /indicator-snapshots/sync
```

### 20.4 Testing

Mínimo:

- Unit tests del motor.
- Golden tests de liquidaciones.
- Golden tests de archivo Previred.
- Contract tests de API.
- Integration tests de corrida completa.
- Snapshot tests de PDF.
- Regression tests por cambios legales.
- Tests de indicadores.
- Tests de conectores oficiales.
- Tests de fallback/manual override.
- Tests de inmutabilidad.
- Security tests de permisos.

---

## 21. Casos de prueba obligatorios

### 21.1 Casos normales

1. Trabajadora puertas afuera, sueldo fijo, 30 días.
2. Trabajadora puertas afuera, ingreso a mitad de mes.
3. Trabajadora puertas afuera, término a mitad de mes.
4. Jardinero dependiente, jornada parcial.
5. Piscinero dependiente, sueldo fijo mensual.
6. Chofer particular jornada completa.
7. Cuidadora puertas adentro.
8. Trabajador con Fonasa.
9. Trabajador con Isapre.
10. Trabajador con AFP distinta.

### 21.2 Jornada

1. Jornada parcial con bolsa pactada.
2. Jornada parcial sin bolsa y exceso de horas.
3. Jornada completa con horas extra.
4. Puertas adentro con días libres usados.
5. Puertas adentro con días libres pendientes al término.

### 21.3 Indicadores

1. Snapshot mensual con UF, UTM, impuesto y topes.
2. Snapshot sin UF debe fallar.
3. Snapshot sin tabla de impuesto debe bloquear cierre.
4. Snapshot con warning no crítico permite preview.
5. Snapshot aprobado permite cierre.
6. Snapshot bloqueado no puede modificarse.
7. Override requiere evidencia.
8. Cambio de fuente queda auditado.
9. Cálculo cerrado mantiene indicador histórico aunque cambie la fuente.
10. Reliquidación usa nuevo snapshot.

### 21.4 Previred

1. Archivo con 105 campos.
2. Archivo con campo faltante falla.
3. Días trabajados 0 sin movimiento falla.
4. Licencia médica con RIMA.
5. Licencia médica sin RIMA falla.
6. Línea principal tipo 00.
7. Línea anexa inmediata.
8. Campo numérico con decimal falla.
9. Campo obligatorio vacío falla.
10. Archivo con hash y totales.

### 21.5 Finiquitos

1. Renuncia voluntaria.
2. Desahucio.
3. Vencimiento plazo.
4. Vacaciones pendientes.
5. Vacaciones proporcionales.
6. Anticipo pendiente.
7. Bono posterior al finiquito.
8. Reliquidación posterior.

---

## 22. Sprints de implementación

### Sprint 0: Discovery técnico-legal y diseño base

Duración: 1 semana.

Entregables:

- Documento de perfiles legales.
- Mapa de conceptos.
- Matriz de reglas legales.
- Diseño de BD.
- Diseño de APIs.
- Diseño de arquitectura.
- Decisión formato Previred MVP.
- Backlog priorizado.
- Diseño de IndicatorsService.

Definition of Done:

- Backlog listo.
- Modelo aprobado.
- Reglas legales identificadas.
- Fuentes de indicadores definidas.
- MVP scope congelado.

### Sprint 1: Maestros, trabajador, contrato y clasificación legal

Duración: 2 semanas.

Incluye:

- Alta hogar.
- Alta trabajador.
- Perfil previsional.
- Wizard legal.
- Contrato.
- Documentos.
- Estados.

Definition of Done:

- No se activa contrato incompleto.
- Prestador externo no entra a nómina.
- Contrato queda auditable.

### Sprint 2: Indicadores, fuentes públicas y snapshots

Duración: 2 semanas.

Incluye:

- `IndicatorsService`.
- `CMFUfConnector`.
- `SIIUtmIpcConnector`.
- `SIITaxSecondCategoryConnector`.
- `PreviredIndicatorsConnector`.
- `SuperintendenciaPensionesCapsConnector`.
- Snapshots.
- Validación.
- Aprobación.
- Lock.
- Auditoría.

Definition of Done:

- Cada período puede generar snapshot.
- No hay tasas hardcodeadas.
- Cierre de nómina exige snapshot aprobado.
- Snapshot usado queda inmutable.
- Falla si falta UF, UTM, impuesto o topes.

### Sprint 3: Motor de cálculo MVP

Duración: 2 semanas.

Incluye:

- Sueldo base.
- Proporcionalidad.
- Haberes.
- AFP.
- Salud.
- AFC.
- CAI.
- Mutual.
- Impuesto.
- Neto.
- Costo empleador.
- Trazabilidad.

Definition of Done:

- Calcula puertas afuera.
- Calcula jardinero.
- Calcula chofer.
- Calcula cuidadora.
- Resultado trazable.

### Sprint 4: Jornada, ausencias y vacaciones

Duración: 2 semanas.

Incluye:

- Horas extra.
- Bolsa semanal.
- Jornada parcial.
- Ausencias.
- Permiso sin goce.
- Vacaciones.
- Días libres puertas adentro.

Definition of Done:

- Excesos generan alerta.
- Vacaciones afectan liquidación.
- Días libres puertas adentro se administran separado.

### Sprint 5: Liquidación PDF, aprobación y cierre

Duración: 1 a 2 semanas.

Incluye:

- Vista pre-nómina.
- Aprobación.
- Cierre.
- PDF.
- Hash.
- Historial.
- Portal trabajador básico.

Definition of Done:

- Corrida cerrada inmutable.
- PDF con código de verificación.
- Trabajador ve liquidación propia.

### Sprint 6: Exportador Previred v82

Duración: 2 a 3 semanas.

Incluye:

- DTO canónico.
- Mapper.
- Validator.
- Serializer.
- 105 campos.
- TXT/CSV.
- Hash.
- Totales.

Definition of Done:

- Archivo validado localmente.
- Campos obligatorios controlados.
- Golden tests aprobados.

### Sprint 7: Licencias médicas y casos complejos

Duración: 2 semanas.

Incluye:

- Licencia total.
- Licencia parcial.
- RIMA.
- Subsidio.
- Accidente del trabajo.
- Movimiento personal.

Definition of Done:

- Previred incluye RIMA cuando corresponde.
- No permite exportar sin datos obligatorios.

### Sprint 8: Finiquitos y reliquidaciones

Duración: 2 a 3 semanas.

Incluye:

- Causal.
- Cálculo.
- Documento.
- Vacaciones.
- Anticipos.
- Reliquidación.
- Previred con movimiento.

Definition of Done:

- Finiquito separado de liquidación.
- Reliquidación no modifica corrida anterior.

### Sprint 9: Transición BUK, corrida paralela y migración

Duración: 2 semanas.

Incluye:

- `HRPayrollProvider`.
- `BUKPayrollAdapter`.
- `PoppinsPayrollAdapter`.
- `ParallelRunService`.
- Comparador.
- Feature flags.
- Rollback.

Definition of Done:

- UI desacoplada.
- Comparación BUK vs Poppins.
- No hay diferencias bloqueantes.
- Activación por tenant.

### Sprint 10: Hardening, seguridad y piloto

Duración: 2 semanas.

Incluye:

- RBAC.
- Auditoría.
- Logs.
- Monitoreo.
- Pruebas de carga.
- Seguridad.
- Piloto real.
- Validación Previred.

Definition of Done:

- 100% eventos críticos auditados.
- Pruebas de regresión aprobadas.
- Piloto con casos reales.
- Checklist legal-operativo aprobado.

---

## 23. MVP recomendado

El MVP debe incluir:

- Alta hogar.
- Alta trabajador.
- Clasificación legal.
- Contrato.
- Perfil previsional.
- IndicatorsService.
- Snapshot mensual.
- Sueldo base.
- Bonos.
- Anticipos.
- Ausencias simples.
- Vacaciones simples.
- AFP/salud/AFC/CAI/mutual/impuesto.
- Liquidación PDF.
- Cierre.
- Archivo Previred v82.
- Auditoría mínima.
- Corrida paralela contra BUK.

Fase 2:

- Licencias avanzadas.
- Finiquitos avanzados.
- Reliquidaciones masivas.
- Portal trabajador completo.
- Firma electrónica avanzada.
- Integración automática DT si existe.
- Integración Previred vía API si existiera o se habilitara formalmente.
- Contabilidad del hogar.
- Pago bancario automático.

---

## 24. Instrucción operativa para Claude Code

```text
Necesito implementar en Poppins un módulo nativo de remuneraciones para Chile orientado a trabajadores dependientes del hogar.

No es una calculadora simple. Debe ser un motor de nómina versionado, auditable e inmutable.

Debe coexistir temporalmente con BUK. Actualmente Poppins usa BUK para ciertos datos de RRHH/remuneraciones. No se debe romper esa integración. Debe implementarse un HRPayrollProvider con BUKPayrollAdapter y PoppinsPayrollAdapter para que la UI consuma una interfaz desacoplada. El objetivo final es reemplazar gradualmente APIs de BUK por conectores internos de Poppins Payroll.

El módulo debe tener:
1. LegalClassification
2. PeopleAndContracts
3. IndicatorSnapshots
4. PayrollEngine
5. PayrollDocuments
6. PreviredExport
7. Terminations
8. AuditAndSecurity
9. PayrollProviderAbstraction
10. ParallelRunService

Debes implementar primero:
- Árbol de carpetas.
- Entidades.
- Enums.
- Migraciones.
- Servicios.
- Endpoints.
- Tests.
- Plan incremental.

Reglas obligatorias:
- No hardcodear tasas legales.
- No modificar liquidaciones cerradas.
- No calcular Previred desde la UI.
- No mezclar prestadores externos con trabajadores dependientes.
- No generar archivo Previred si faltan campos obligatorios.
- No cerrar nómina con errores críticos.
- Toda liquidación debe tener calculation_trace.
- Todo archivo Previred debe tener hash SHA-256.
- Todo cálculo debe reproducirse usando el mismo snapshot.
- Todo cierre de nómina debe usar snapshot de indicadores aprobado.
- No usar UF del día por defecto: usar política parametrizada, inicialmente PERIOD_END_DATE.
- Toda actualización de indicadores debe quedar auditada.
- Todo override manual debe requerir evidencia y permiso.

Implementa fase por fase y espera validación entre fases.
```

---

## 25. Fuentes normativas y técnicas de referencia

Estas fuentes deben usarse como referencia de diseño y validación. El equipo debe verificar vigencia antes de producción.

- Dirección del Trabajo: trabajadores de casa particular, contrato, jornada, liquidación y finiquito.
- Servicio de Impuestos Internos: UTM, UTA, IPC e Impuesto Único de Segunda Categoría.
- Comisión para el Mercado Financiero: API de UF.
- Instituto Nacional de Estadísticas: IPC.
- Superintendencia de Pensiones: topes imponibles, AFP, salud, accidentes del trabajo y seguro de cesantía.
- AFC Chile: seguro de cesantía y tratamiento de trabajadoras/es de casa particular.
- Previred: indicadores previsionales y formato de archivo largo variable por separador versión 82.
- Leyes laborales y previsionales chilenas vigentes.
- Validación legal-laboral externa antes de habilitación productiva.

---

## 26. Cierre

La arquitectura correcta para Poppins es construir este módulo como una capacidad nativa del producto, no como una pantalla aislada de liquidaciones.

El producto debe quedar estructurado en tres capas:

1. **Ciclo de vida laboral:** trabajador, contrato, jornada, documentos, vacaciones, ausencias y término.
2. **Motor de remuneraciones:** cálculo versionado, reproducible, auditable y parametrizado.
3. **Cumplimiento externo:** liquidación PDF, finiquito, Previred, auditoría, indicadores y reportes.

Con este enfoque, Poppins podrá operar con BUK durante la transición y, una vez validado el nuevo módulo, reemplazar progresivamente las APIs de BUK por conectores internos propios. El resultado será un módulo integral, escalable y legalmente controlado para trabajadores dependientes del hogar en Chile.
