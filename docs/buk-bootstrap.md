# Buk como bootstrap one-shot

A partir de la implementación del plan remuneraciones 2026, **Buk dejó de ser
dependencia operativa** de Poppins. El motor de cálculo, las liquidaciones,
los archivos legales (Previred, LRE, CCAF) y la persistencia (`payroll_results`)
son completamente autónomos.

## ¿Para qué sigue existiendo Buk?

**Único caso de uso vigente:** importación inicial de clientes nuevos que ya
tienen sus datos en Buk. Se usa una sola vez para hidratar:

- Tabla `trabajadores` (datos personales, AFP, Isapre, plan UF)
- Tabla `contratos` (sueldo base, fechas, horas)
- Tabla `payroll_novedades` (haberes variables del último mes)

Después de esa importación inicial, **toda la operación se hace dentro de Poppins**.

## Endpoints Buk (marcados `[BOOTSTRAP ONLY]`)

| Endpoint | Uso |
|----------|-----|
| `POST /api/buk/import` | **Bootstrap.** Botón "Sincronizar empleados" en `/empresa/empleados` |
| `GET /api/buk/by-rut` | Bootstrap. Panel "Datos sincronizados" en perfil del empleado |
| `GET /api/buk/liquidaciones` | Solo histórico de referencia en `/empresa/horarios` (fallback opcional) |
| `GET /api/buk/vacaciones` | Solo histórico de referencia en `/empresa/horarios` (fallback opcional) |
| `GET /api/buk/previred` | **Deprecado.** Reemplazado por `/api/payroll/previred` |

## Operación 100% Poppins (sin Buk)

1. **Alta de trabajador**: form en `/empresa/empleados` → escribe directo en `trabajadores` + `contratos`
2. **Edición de previsión**: `PATCH /api/payroll/trabajadores/prevision`
3. **Novedades del mes**: `POST/DELETE /api/payroll/novedades` (UI en `NovedadesModal`)
4. **Cálculo + cierre del período**: `POST /api/payroll/procesar-mes`
5. **Descargas legales**: `/api/payroll/liquidacion-pdf`, `/libro-remuneraciones`, `/previred`, `/ccaf`

## Para deshabilitar Buk completamente

Si en algún momento se quiere remover Buk del todo:

1. Borrar la variable `BUK_API_TOKEN` del entorno
2. Quitar el botón "Sincronizar empleados" en `src/app/empresa/empleados/page.tsx:296`
3. Borrar `src/app/api/buk/**`
4. Borrar `src/lib/buk/**` y `src/lib/buk-sdk/**`

Los datos ya importados quedan intactos.
