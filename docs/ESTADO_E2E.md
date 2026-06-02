# Estado E2E — auditoría de mockups vs funcional (2026-06-02)

Auditoría completa del front buscando "mockups" que debían ser E2E. **Conclusión: la app está
mucho más completa de lo que parecía** — varios supuestos "mockups" ya guardaban en Supabase con
datos correctos. Lo realmente pendiente son **integraciones externas que necesitan llaves**.

## ✅ Arreglado esta sesión (E2E real, deployado a Cloudflare)
- **Crear trabajador**: RLS arreglada (`get_my_empleador_id` + policy insert) + validación RUT/email + errores visibles (antes se tragaban).
- **Validadores** RUT (módulo 11), email y celular CL — en form de trabajador y de perfil.
- **Selector de mes** del dashboard: dinámico (antes hardcodeado "Marzo 2026").
- **Perfil**: nombre duplicado corregido + métrica "Cuentas Activas" (modelo viejo) removida.
- **Tareas**: vista **Kanban con drag&drop** entre estados.
- **Recordatorios**: selector de días de la semana (antes fijo L-V).
- **Vacaciones**: **feriado progresivo** (Art. 68 CdT) según antigüedad, no 15 fijo.
- **Días hábiles**: util compartido que excluye **feriados de Chile** (vacaciones y solicitudes).
- **Upload de comprobantes**: validación de tipo/tamaño + extensión correcta.
- **Compras**: rollback del optimistic update si falla.
- **Infra**: migración completa a **Cloudflare Workers** (OpenNext); DB sczxy con grants + esquema + buckets.

## ✅ Verificado FUNCIONAL (no eran mockup — falsos positivos del inventario)
- **Motor de liquidaciones (payroll)**: real (`src/lib/payroll/`: topes, gratificación Art.50, impuesto único, finiquito, tests).
- **Onboarding AFP/isapre**: los IDs hardcodeados **matchean exacto** `instituciones_previsionales` → guarda FK correcta.
- **Mayoría de páginas empresa** (empleados, contratos, familia, vivienda, horarios, compras, tareas, perfil): persisten en Supabase.
- **Beneficios legales** (portal): contenido legal estático correcto (no es bug que sea fijo).

## 🔑 Mockup REAL — bloqueado por llaves/credenciales (no se puede E2E swithout esto)
| Área | Estado | Qué lo desbloquea |
|---|---|---|
| **Flow (cobros)** | Modo simulado | `FLOW_API_KEY` + `FLOW_SECRET_KEY` + crear 4 planes en Flow |
| **BUK (nómina/empleados)** | Devuelve 530 | Subdominio BUK correcto (¿`tuempresa.buk.cl`?) + token válido |
| **Emails (Resend)** | No envía | `RESEND_API_KEY` (`wrangler secret put`) |
| **Direcciones/Comunas + Geo** | Dropdown manual | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (Places + Geocoding) |
| **Chat IA (asistentes)** | — | `ANTHROPIC_API_KEY` |

## 🟡 Mejoras pendientes (no bloqueantes, no necesitan llaves)
- **PDFs** (liquidación/contrato/certificado): hoy usan `window.print()`; mejorable a PDF descargable real (jsPDF). Requiere verificación visual.
- **UF en PDF/constantes**: valor manual; ideal un feed (mindicador.cl) vía API route.
- **Admin → Parámetros sistema**: UF/SMM/topes editables desde tabla (hoy en `constants.ts`, se actualizan ~anual por ley).
- **Sidebar.tsx**: componente huérfano (no se usa, linkea a `/dashboard/*` inexistente) → borrar.

## 👉 Para terminar el 100%
Pasá las llaves de la tabla 🔑 y se cierran las integraciones. El resto del producto ya es E2E.
